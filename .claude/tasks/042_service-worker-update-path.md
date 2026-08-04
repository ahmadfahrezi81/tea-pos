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
`withPWA` in `apps/seller/next.config.ts:109` wraps the config exactly as
before and then no-ops. No error, no warning, no `sw.js`. The
`sw.js` / `workbox-*.js` / `swe-worker-*.js` files still sitting in
`apps/seller/public/` are leftovers from a pre-upgrade webpack build (all
gitignored — `.gitignore:50-55`).

**Backoffice has the identical bug.** `apps/backoffice` also depends on
`@ducanh2912/next-pwa@^10.2.9`, wraps its config the same way
(`next.config.ts:77`), and builds with plain `next build` — so it is also
Turbopack, also no-ops, and its `public/` likewise contains no `sw.js`. Both
apps need the fix. How exposed backoffice is to the *frozen device* half
depends on whether it was ever deployed with a working worker before the Next
16 upgrade; check its logs for `/sw.js` 404s the same way seller's were found.

## Why it matters — and what it doesn't

**The real problem is the update path.** Neither app registers a service
worker itself (`grep` for `serviceWorker` across `app/`, `lib/` and
`components/` in both returns only an unrelated `navigation.register`) —
next-pwa injected that registration at build time. So the 404s are devices
still holding a registration from a **pre-upgrade build**. That worker polls
`/sw.js`, gets a 404, and keeps serving its cached bundle.

**Only devices that already had a worker are affected.** A device that never
registered one, or has since cleared it, fetches fresh code on any reload and
is fine. The stuck population is whoever installed before the Next 16 upgrade,
and for them a reload does not help — the old worker intercepts it. Sizing
that group is worth doing before choosing an option; the `/sw.js` 404 rate in
the logs is a proxy for it.

Consequences for that group:

- **A client-side fix cannot reach them.** Force-quitting is the only path
  today, which is exactly what cost task 040 a staging cycle.
- **They are frozen indefinitely**, not until some expiry. A stuck worker
  stays stuck until something valid is served at `/sw.js`.
- Every update poll also renders `/_not-found` as a function — the minor CPU
  cost that surfaced this, now the least interesting part.

**Offline support is *not* the regression.** Owner confirmed the app has no
working offline behaviour today and none is expected. The `runtimeCaching`
rules in `next.config.ts:15-51` were written but the app was never built to
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

**C is tempting and probably wrong, but the reason needs checking.** A
kill-switch worker (`self.registration.unregister()` + clear caches) frees
every stuck device and means the browser always fetches fresh — genuinely the
simplest way to guarantee an update path.

> ⚠️ **Unverified, and it is what rules C out.** Chrome has historically
> required a service worker with a fetch handler before offering the Android
> install prompt (iOS standalone does not — it keys off the manifest and Apple
> web-app metadata). Whether that requirement still holds in current Chrome is
> **not confirmed here** — the criteria have been relaxed more than once.
> Check it against current Chrome installability docs before rejecting C on
> those grounds. The app ships `display: "standalone"`, so this only matters
> at all if sellers actually install on Android — worth answering first, since
> a "no" makes C viable and much simpler than A or B.

**Recommendation: A now, B when there's room.** A is one word, restores the
worker in both apps immediately, and is verifiable in a single `curl`. B
removes the dependency on a bundler Next is moving away from. Serwist is by
the same author as `@ducanh2912/next-pwa`, but do not read that as a drop-in:
serwist expects you to author your own service-worker entry (`sw.ts`) rather
than generating one from a `workboxOptions` block, so the `runtimeCaching`
rules would be ported by hand. It is a real migration, which is why it should
not block the fix.

## Plan

### Phase 1 — Restore the service worker

1. `"build": "next build --webpack"` in **both** `apps/seller/package.json`
   and `apps/backoffice/package.json`.
2. Rebuild and confirm `public/sw.js`, `workbox-*.js` and the register script
   are emitted again in each app.
3. Leave `dev` on `--turbopack`. `next-pwa` disables itself in development
   (`next.config.ts:7`), so there is nothing to generate there — but confirm
   the config loads cleanly under both bundlers rather than assuming.
4. Watch the build time. Webpack is slower; if it is bad enough to hurt, that
   is an argument for doing B sooner rather than a reason to skip the fix.

### Phase 2 — Add the update prompt

Task 040 flagged this as a follow-up and it was never done. **A working
service worker alone does not solve the update path.** `next-pwa` defaults
both `skipWaiting` and `clientsClaim` to `true` (verified in the plugin
source, `dist/index.js:965` — neither app overrides them), so a new worker
takes control as soon as it installs. That governs the *next* load; a page
already open keeps running the JS it booted with, and a POS stays open all
shift.

1. Listen for `controllerchange` on `navigator.serviceWorker`.
2. Prompt through the existing `ToastContext` rather than auto-reloading — a
   reload mid-order drops the cart.
3. Guard the first install: no prompt when `navigator.serviceWorker.controller`
   was null to begin with.
4. Call `registration.update()` on `visibilitychange` so an app that has been
   open for days actually checks.
5. Do **not** key this off `/api/version`. Checked: it returns
   `NEXT_PUBLIC_APP_VERSION || packageJson.version` for both fields, and
   `next.config.ts` sets that env var from the same `package.json` — so it is
   one release-level number, bumped by hand, not per deploy.

> **There is already a refresh prompt — extend it, don't add a second.**
> `components/shared/InactivityRefreshPopup.tsx` prompts a reload after 20
> minutes of inactivity and is mounted in the mobile layout
> (`app/[tenantSlug]/mobile/layout.tsx`). Two independent reload prompts
> racing each other is a worse experience than either alone, and this one
> already solves the hard part — deciding when a reload is safe to suggest.
> Phase 2 should feed the `controllerchange` signal into that component as a
> second trigger, not build a parallel one.
>
> Worth knowing it does **not** currently rescue a stuck device: its reload
> still goes through the old service worker, which serves the same cached
> bundle back.

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

## Open questions to settle before starting

1. **Do sellers install on Android?** If not, option C becomes viable and is
   far simpler than A or B.
2. **Does Chrome still require a service worker for the install prompt?** The
   claim that rules out C is unverified here — see the warning above.
3. **Was backoffice ever deployed with a working worker?** Decides whether it
   has frozen devices or merely a missing feature.

## Rollout

One PR for Phase 1 covering both apps — it is a build-config change, so verify
on a preview deploy before promoting. Phase 2 is a separate PR; it touches the
shell and wants its own device pass. Phase 3 is verification, not code, unless
it turns up a device that won't recover.
