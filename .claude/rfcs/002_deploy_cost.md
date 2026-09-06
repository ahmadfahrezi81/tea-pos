# RFC 002 — What a deploy costs, once there are users

| | |
|---|---|
| **Status** | Draft. Not accepted. Nothing built |
| **Date** | 2026-09-05 |
| **Follows** | Task 063 — idle refetch cost |
| **Affects** | `apps/seller/next.config.ts`, `apps/backoffice/next.config.ts`, `packages/shell/useAppUpdate.ts` |
| **Spawns** | Tasks, once the user count makes it worth one. This file is not one |

---

## 1. Summary

Every deploy makes every installed device re-boot: new service worker, dropped
caches, an update prompt, a `location.reload()`, and an app that comes back with
an empty SWR cache and refetches its whole screen. **That costs about 1.5s of
Vercel Active CPU per device, per deploy.**

At 5 users it is 7.5 seconds and invisible. At 5,000 it is **~2 CPU-hours per
deploy** and the largest single line in the system.

Nothing here is worth building today. It is written down because two of the
three fixes are one-word changes now and awkward once anyone depends on the
behaviour.

## 2. Context — and what this RFC is *not* saying

This came out of a 2026-09-05 investigation into why Fluid Active CPU spikes on
deploy days: 8m50s against a ~3m baseline, with five internal users.

**The update path was investigated as the cause and ruled out.** Recording that
plainly, because the intuition is a good one and will come back:

| Step in the update path | Function invocations |
|---|---|
| New `sw.js` served | 0 — static, CDN |
| SW precaches JS/CSS/fonts, `launch.html`, icon | 0 — static, CDN |
| `${version}`-keyed runtime caches dropped and refilled | 0 |
| `useAppUpdate` polls `/api/version` | 1 |
| User accepts → `location.reload()` | 1 document render + 1 proxy run |
| Boot with an empty SWR cache, refetching the screen | ~10–15 |
| `__START_URL_CACHE__` → `fetch("/")` | 1 |
| `cacheOnFrontEndNav` → each path as a full document | 1 per path visited |
| | **≈ 15–20, ≈1.5s CPU** |

```
5 devices × 1.5s = 7.5s, against a ~350s spike  →  ~2%
```

**The Vercel build is not on that chart at all** — build minutes are a separate
billing line; the chart measures functions running on Fluid.

The rule that falls out of this, and the reason the intuition misfires:

> **Per-device costs multiply by the user count. Per-deploy costs multiply by the
> deploy count.** At 5 users and 7 deploys a day, a 1.5s per-device cost cannot
> compete with anything that costs tens of seconds per deploy.

The leading candidate for today's spike is **cold starts** — a deploy destroys
the warm Fluid pool across ~137 route entry points, and rebuilding it is pure
init CPU. Unproven at time of writing; the check is Vercel's cold-start
dimension on a spike day versus a flat one. **That is task 063's problem, not
this file's.** This RFC is only about the term that grows.

## 3. When this matters

At 1.5s per device per deploy:

| Devices | Per deploy | At 2 deploys/week |
|---|---|---|
| 5 | 7.5s | ~1m/month |
| 100 | 2.5m | ~20m/month |
| 1,000 | 25m | ~3.5 CPU-hours/month |
| 5,000 | **~2 CPU-hours** | **~16 CPU-hours/month** |

The 4-hour monthly allowance is gone to deploys alone somewhere around **1,500
devices**, before anyone sells a cup.

**Trigger to act: ~500 active devices, or the first month deploy tax exceeds an
hour.** Below that this file stays a draft.

## 4. The three things to fix, cheapest first

### 4.1 `cacheOnFrontEndNav: true` — delete it

`apps/seller/next.config.ts:17`. The generated `public/sw.js` registers no
`pages` route, because a custom `workboxOptions.runtimeCaching` array replaces
next-pwa's defaults. So `swe-worker`'s `__FRONTEND_NAV_CACHE__` fetches every
newly navigated path **as a full document** into a cache **nothing ever reads**.

A full-document render is the most expensive invocation shape in the app —
`home/pos` measured 63ms/inv against `home/manage` at 14ms (task 060). This
buys nothing at any scale.

First flagged in 060's *Watch, don't act*. Still one word. Both apps.

### 4.2 `__START_URL_CACHE__` — a cache that can never fill

`cacheStartUrl: true` makes the worker `fetch("/")`, and `/` is a server
redirect to `/login`. The worker then tests `if (!res.redirected)` before
storing, which is never true, so the response is discarded and the fetch repeats
on every trigger. A permanently-failing cache doing a permanently-repeating
function call.

`/` drew 24 invocations at 116ms in 060's window — a curiosity at 5 users, a
per-device-per-deploy tax at 5,000.

**Do not fix this by setting `dynamicStartUrl: false`.** The comment at
`next.config.ts:22` explains why and it is load-bearing: next-pwa's start-URL
handling targets `/` rather than the manifest's `start_url`, so turning it off
precaches whichever redirect the worker happened to fetch and serves it to
everyone, which presents as sessions not persisting. The splash does not depend
on it either — `launch.html` is precached by name in `additionalManifestEntries`.

The fix is to stop caching the start URL, not to change how it is cached.

### 4.3 The reload itself — the part that actually costs

`location.reload()` in `InactivityRefreshPopup.tsx:112` throws away a warm client
and rebuilds it from nothing: a full document render, a proxy run, and ~10–15 API
calls to refill an SWR cache that was correct a second earlier.

This is **~80% of the 1.5s** and it is the one that needs a decision rather than
a deletion. A reload is the only honest way to run new JavaScript, and the
comment above that line says so.

Options, none costed:

- **Keep it.** Correct, simple, and the cost is a per-device constant.
- **Seed the new page's SWR cache from the old one** before reloading, via
  `sessionStorage`. Removes most of the ~15 refetches; adds a staleness question
  on every seeded key, and the gate must not be one of them (task 062: a stale
  gate means cups that pay nobody).
- **Only prompt when the new build actually changes client code.** `/api/version`
  already returns `buildId` from the commit sha, which changes on every deploy
  including docs-only ones. A content hash of the client bundle would not.

The third is the most promising and the least understood.

## 5. Open questions

1. **Does the update prompt fire for every device on every deploy, or only when
   the worker actually takes over?** Task 042 Phase 2 shipped a first-install
   guard and, at the time of writing, had never been exercised by a second
   deploy. If a docs-only deploy prompts everyone, 4.3's third option is worth
   much more than it looks.
2. **How many devices are there?** Task 042's open question #1, still open, and
   this RFC cannot be sized without it. The `/sw.js` request rate in the Vercel
   logs is a direct proxy.
3. **Does `revalidateOnReconnect` compound this?** A reload on a phone with
   marginal signal may fire twice.

## 6. What this RFC is worth

Sections 4.1 and 4.2 are pure deletions with no behaviour to preserve — worth
taking on the next occasion someone opens `next.config.ts`, not as a task of
their own.

Section 4.3 is a real design question and should not be started before question
1 is answered.
