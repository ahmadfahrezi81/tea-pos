# Task 042 — No service worker in production (installed apps can't update)

**Status: diagnosed, not implemented.** Split out of task 041's Phase 0,
which found it while chasing `/_not-found` invocations. It is not a CPU
problem and does not belong in that task.

## The problem

```
$ curl -I https://tea-pos.vercel.app/sw.js
HTTP/2 404
x-matched-path: /_not-found
```

There is no service worker in production. Reproduced locally: delete
`public/sw.js` and run `pnpm build` and nothing regenerates.

**Root cause — a silent build regression.** The build banner reads:

```
▲ Next.js 16.2.4 (Turbopack)
```

Next 16 builds with Turbopack by default. `@ducanh2912/next-pwa@10.2.9` is a
**webpack** plugin — it hooks `config.webpack`, which Turbopack never calls.
`withPWA` in `apps/seller/next.config.ts:107` wraps the config exactly as
before and then no-ops. No error, no warning, no `sw.js`. The
`sw.js` / `workbox-*.js` / `swe-worker-*.js` files still sitting in
`apps/seller/public/` are leftovers from a pre-upgrade webpack build (all
gitignored — `.gitignore:50-55`).

## Why it matters — and what it doesn't

**The real problem is the update path.** Nothing in the app registers a
service worker itself (`grep` for `serviceWorker` across `app/`, `lib/` and
`components/` returns only an unrelated `navigation.register`) — next-pwa
injected that registration at build time. So the 404s are devices still
holding a registration from a **pre-upgrade build**. That worker polls
`/sw.js`, gets a 404, and keeps serving its cached bundle. It cannot update
and it cannot be replaced.

Consequences:

- **A client-side fix cannot reach an installed app.** Force-quitting is the
  only path today, which is exactly what cost task 040 a staging cycle.
- **Those devices are frozen indefinitely**, not until some expiry. A stuck
  worker stays stuck until something valid is served at `/sw.js`.
- Every update poll also renders `/_not-found` as a function — the minor CPU
  cost that surfaced this, now the least interesting part.

**Offline support is *not* the regression.** Owner confirmed the app has no
working offline behaviour today and none is expected. The `runtimeCaching`
rules in `next.config.ts:15-45` were written but the app was never built to
function offline — task 040 established the same thing from the other side
when it deleted the offline mutation queue as structurally incapable of
capturing an offline write. Treat restored read-caching as a **side effect**
of fixing the update path, not as the goal.

> Note for whoever reads 040 next: its closing argument assumed "caching reads
> is already handled by the service worker". That was true when written and is
> not true now.

## Options

| # | Approach | Update path | Installability | Effort | Shelf life |
|---|---|---|---|---|---|
| A | `next build --webpack` | restored | kept | one word | until webpack is removed from Next |
| B | Migrate to `@serwist/next` | restored | kept | a real migration | Turbopack-native |
| C | Ship a self-unregistering `sw.js` | restored by removal | **at risk on Android** | small | permanent |
| D | Do nothing | none | — | — | devices stay frozen forever |

**C is the tempting one and probably wrong.** A kill-switch worker
(`self.registration.unregister()` + clear caches) frees every stuck device and
means the browser always fetches fresh — genuinely the simplest way to
guarantee an update path. But Chrome requires a service worker with a fetch
handler for the Android install prompt; iOS standalone doesn't. The app ships
`display: "standalone"` and Apple web-app metadata, so if any seller installs
on Android, C degrades that. Worth considering only if the PWA install is
confirmed unused on Android.

**Recommendation: A now, B when there's room.** A is one word, restores the
worker immediately, and is verifiable in a single `curl`. B removes the
dependency on a bundler Next is moving away from — the same author lineage as
next-pwa, so the config shape is close, but it is a migration and shouldn't
block the fix.

## Plan

### Phase 1 — Restore the service worker

1. `apps/seller/package.json` — `"build": "next build --webpack"`.
2. Rebuild and confirm `public/sw.js`, `workbox-*.js` and the register script
   are emitted again.
3. Check whether `dev` should follow. It runs `--turbopack` today and
   `next-pwa` is disabled in development anyway
   (`next.config.ts:7`), so dev can stay on Turbopack — but confirm the config
   loads cleanly under both bundlers rather than assuming.
4. Watch the build time. Webpack is slower; if it is bad enough to hurt, that
   is an argument for doing B sooner rather than a reason to skip the fix.

### Phase 2 — Add the update prompt

Task 040 flagged this as a follow-up and it was never done. **A working
service worker alone does not solve the update path**: `skipWaiting` +
`clientsClaim` mean a new worker takes control immediately, but a page already
open keeps running the JS it booted with — and a POS stays open all shift.

1. Listen for `controllerchange` on `navigator.serviceWorker`.
2. Prompt through the existing `ToastContext` rather than auto-reloading — a
   reload mid-order drops the cart.
3. Guard the first install: no prompt when `navigator.serviceWorker.controller`
   was null to begin with.
4. Call `registration.update()` on `visibilitychange` so an app that has been
   open for days actually checks.
5. Do **not** key this off `/api/version` — that compares `packageJson.version`,
   which is bumped per release, not per deploy.

### Phase 3 — Unstick the existing devices

Devices holding the dead worker need one successful `/sw.js` fetch to recover.
Once Phase 1 ships, the next poll returns a real worker and they self-heal —
**but confirm it** rather than assuming, on a device that is currently stuck.
If any won't recover, that is the case for a one-release kill-switch worker
before the real one.

### Parked — actual offline support

Not in scope. If it is ever wanted, it is a product question before an
engineering one: what happens to an order taken offline, how do daily-summary
totals reconcile, what does the seller see. Task 040's finding stands — session
ownership must never be replayed from a stale client — and it is the reason to
design this deliberately rather than bolt it on. Restored read-caching (menu,
shell, images) arrives free with Phase 1 and is worth measuring before deciding
whether more is needed.

## Verification

1. `curl -I https://<deploy>/sw.js` → **200**, `content-type: application/javascript`.
   This is the whole test for Phase 1.
2. DevTools → Application → Service Workers shows an activated worker on the
   deployed origin.
3. Deploy twice in a row with a visible change; confirm an already-open
   installed app surfaces the update prompt rather than silently serving stale
   JS.
4. On a device that is currently stuck, confirm it picks up the new worker
   without a force-quit — that is the actual goal of this task.
5. `/_not-found` invocations should drop further in the route table once
   `/sw.js` stops 404ing (task 041 Phase 0 removed the other source).

## Rollout

One PR for Phase 1 — it is a build-config change, so verify on a preview
deploy before promoting. Phase 2 is a separate PR; it touches the shell and
wants its own device pass. Phase 3 is verification, not code, unless it turns
up a device that won't recover.
