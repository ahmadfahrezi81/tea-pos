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
`public/sw.js`, run `pnpm build`, nothing regenerates.

**Root cause — a silent build regression.** The build banner reads:

```
▲ Next.js 16.2.4 (Turbopack)
```

Next 16 builds with Turbopack by default. `@ducanh2912/next-pwa@10.2.9` is a
**webpack** plugin — it hooks `config.webpack`, which Turbopack never calls.
`withPWA` (`apps/seller/next.config.ts:109`) wraps the config exactly as
before and then no-ops. No error, no warning, no `sw.js`. The
`sw.js` / `workbox-*.js` / `swe-worker-*.js` files still sitting in
`apps/seller/public/` are leftovers from a pre-upgrade webpack build (all
gitignored — `.gitignore:50-55`).

**Backoffice has the identical bug** — same dependency, same wrapper
(`next.config.ts:77`), same plain `next build`, same empty `public/`. Both
apps need the fix.

## Why it matters — and what it doesn't

Neither app registers a service worker itself (`grep` for `serviceWorker`
across `app/`, `lib/`, `components/` in both returns only an unrelated
`navigation.register`) — next-pwa injected that registration at build time. So
the 404s are devices still holding a registration from a **pre-upgrade build**.
That worker polls `/sw.js`, gets a 404, and keeps serving its cached bundle.

**Only devices that already had a worker are affected.** One that never
registered one, or has since cleared it, fetches fresh code on any reload and
is fine. For the stuck group a reload does *not* help — the old worker
intercepts it. Consequences for them:

- **A client-side fix cannot reach them.** Force-quitting is the only path
  today, which is exactly what cost task 040 a staging cycle.
- **They are frozen indefinitely**, not until some expiry. A stuck worker
  stays stuck until something valid is served at `/sw.js`.
- Every update poll also renders `/_not-found` as a function — the minor CPU
  cost that surfaced this, and the least interesting part.

**Offline support is *not* the regression.** Owner confirmed the app has no
working offline behaviour today and none is expected. The `runtimeCaching`
rules in `next.config.ts:15-51` were written but the app was never built to
function offline — task 040 established the same from the other side when it
deleted the offline mutation queue as structurally incapable of capturing an
offline write. Treat restored read-caching as a **side effect** of fixing the
update path, not the goal. (040's closing argument assumed the service worker
was already handling read caching; true when written, not now.)

## Settle these first — they decide which option to take

1. **How many devices are actually stuck?** The `/sw.js` 404 rate in the
   Vercel logs is a direct proxy. A handful and this is cosmetic; a real
   population and it is urgent.
2. **Do sellers install on Android?** If not, option C below becomes viable
   and is far simpler than A or B.
3. **Does Chrome still require a service worker for the install prompt?**
   Historically yes, with a fetch handler; iOS standalone never did (it keys
   off the manifest and Apple web-app metadata). **Not verified here** — those
   criteria have been relaxed more than once, and this single fact is what
   rules out option C. Check it against current Chrome installability docs
   before discarding C.
4. **Was backoffice ever deployed with a working worker?** Decides whether it
   has frozen devices or merely a missing feature. Same log check as #1.

## Options

| # | Approach | Update path | Installability | Effort | Shelf life |
|---|---|---|---|---|---|
| A | `next build --webpack` | restored | kept | one word | until Next drops webpack |
| B | Migrate to `@serwist/next` | restored | kept | a real migration | Turbopack-native |
| C | Ship a self-unregistering `sw.js` | restored by removal | at risk — see Q3 | small | permanent |

Doing nothing is the fourth option and the only unacceptable one: the stuck
devices never recover on their own.

**C is the interesting one.** A kill-switch worker
(`self.registration.unregister()` + clear caches) frees every stuck device and
means the browser always fetches fresh — the simplest possible guarantee of an
update path, with nothing to maintain afterwards. It is ruled out only by Q3,
which is unverified. If the answer to Q2 is "nobody installs on Android",
take C and close this task.

**Otherwise: A now, B when there's room.** A is one word, restores the worker
in both apps immediately, and is verifiable with a single `curl`. B removes
the dependency on a bundler Next is moving away from — but Serwist is not a
drop-in despite sharing an author with next-pwa: it expects you to author your
own `sw.ts` rather than generating one from `workboxOptions`, so the
`runtimeCaching` rules get ported by hand.

## Plan

### Phase 1 — Restore the service worker

1. `"build": "next build --webpack"` in **both** `apps/seller/package.json`
   and `apps/backoffice/package.json`.
2. Rebuild each; confirm `public/sw.js`, `workbox-*.js` and the register
   script are emitted again.
3. Leave `dev` on `--turbopack` — next-pwa disables itself in development
   (`next.config.ts:7`), so there is nothing to generate there. Confirm the
   config still loads cleanly under both bundlers rather than assuming.
4. Watch the build time. Webpack is slower; if it hurts, that is an argument
   for doing B sooner, not for skipping the fix.

> **Applied 2026-08-04.** Both build scripts switched. Banner now reads
> `▲ Next.js 16.2.4 (webpack)` and the plugin runs — `○ (pwa) Service worker:
> …/public/sw.js`, `Custom runtimeCaching array found, using it instead of the
> default one`. Both apps exit 0 with TypeScript still running in-build.
>
> Verified beyond the file existing: seller's `sw.js` is ~18KB and contains
> `skipWaiting`, `clientsClaim` and the Supabase runtime-caching rule, and
> `serviceWorker.register` is present in the client bundle
> (`.next/static/chunks/main-*.js`) — so registration is injected again, which
> is what actually unsticks a device.
>
> Build-time cost: seller compile 10.7s → 18.5s (38s wall), backoffice 9.5s
> (25s wall). Slower but not painful — not yet an argument for B.
>
> **Still unverified: production.** Local emission is necessary, not
> sufficient — verification 1 and 3 below are the real tests and need a
> deploy.

### Phase 2 — Make an open app notice the update

**A working service worker alone does not solve this.** `next-pwa` defaults
`skipWaiting` and `clientsClaim` to `true` (verified in the plugin source,
`dist/index.js:965`; neither app overrides them), so a new worker takes
control as soon as it installs — but that governs the *next* load. A page
already open keeps running the JS it booted with, and a POS stays open all
shift. Task 040 flagged this and it was never done.

> **Extend the existing prompt, don't add a second.**
> `components/shared/InactivityRefreshPopup.tsx` already prompts a reload
> after 20 minutes idle and is mounted in the mobile layout
> (`app/[tenantSlug]/mobile/layout.tsx:29`). It already solves the hard part —
> deciding when a reload is safe to suggest — and two reload prompts racing
> each other is worse than either alone. Feed the new signal into it.
>
> Note it does **not** rescue a stuck device today: its reload still goes
> through the old worker, which serves the same cached bundle back.

1. Listen for `controllerchange` on `navigator.serviceWorker`; use it as a
   second trigger on the existing popup.
2. Guard the first install — no prompt when `navigator.serviceWorker.controller`
   was null to begin with.
3. Call `registration.update()` on `visibilitychange`, so an app open for days
   actually checks.
4. Prompt, never auto-reload — a reload mid-order drops the cart.
5. Do **not** key this off `/api/version`. Checked: it returns
   `NEXT_PUBLIC_APP_VERSION || packageJson.version` for both fields, and
   `next.config.ts` sets that env var from the same `package.json` — one
   release-level number, bumped by hand, not per deploy.

### Parked — actual offline support

Not in scope. If it is ever wanted it is a product question before an
engineering one: what happens to an order taken offline, how do daily-summary
totals reconcile, what does the seller see. Task 040's finding stands —
session ownership must never be replayed from a stale client — and that is the
reason to design it deliberately rather than bolt it on. Restored read-caching
(menu, shell, images) arrives free with Phase 1 and is worth measuring before
deciding whether more is needed.

## Verification

**Phase 1**

1. `curl -I https://<deploy>/sw.js` → **200**, `content-type: application/javascript`.
   That is the whole test.
2. DevTools → Application → Service Workers shows an activated worker.
3. On a device that is currently stuck, confirm it picks up the new worker
   without a force-quit. **This is the actual goal of the task** — everything
   else is a proxy for it. If a device won't recover on its own, that is the
   case for shipping a kill-switch worker for one release before the real one.

**Phase 2**

4. Deploy twice with a visible change; confirm an already-open installed app
   surfaces the prompt rather than silently serving stale JS.

**Either**

5. `/_not-found` invocations drop further in the route table once `/sw.js`
   stops 404ing (task 041 Phase 0 removed the other source).

## Rollout

One PR for Phase 1 covering both apps — a build-config change, so verify on a
preview deploy before promoting. Phase 2 is a separate PR; it touches the
shell and wants its own device pass.
