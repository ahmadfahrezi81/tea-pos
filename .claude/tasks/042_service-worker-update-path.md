# Task 042 — No service worker in production (installed apps can't update)

**Status: Phase 1 shipped and verified on staging. Phase 2 shipped but cannot
be exercised until a second deploy.** Split out of task 041's Phase 0, which
found it while chasing `/_not-found` invocations. It is not a CPU problem and
does not belong in that task.

**What is left**, in the order it can be done:

1. **Deploy again.** Phase 2's prompt only fires when a *replacement* worker
   takes over. This deploy installed the first one, which the first-install
   guard correctly keeps silent — so the prompt is untested by construction,
   not by oversight.
2. **Check a stuck device** (verification 3). Needs a phone that had the app
   installed before the Next 16 upgrade. This is the check that decides
   whether the task worked; everything verified so far is a proxy for it.
3. **Option B**, the serwist migration. `--webpack` is a stopgap with a shelf
   life.

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

## Open questions

> **Two of these are now moot.** Option A was taken without waiting on them,
> on the grounds that it is correct whatever the answers — it restores the
> worker and preserves installability either way. Q2 and Q3 only mattered for
> choosing option C, so they are closed unanswered. Recorded rather than
> deleted: if the webpack stopgap is ever revisited, C comes back with them.

1. **How many devices are actually stuck?** *(still open, still matters)* The
   `/sw.js` 404 rate in the Vercel logs is a direct proxy. A handful and this
   was cosmetic; a real population and Phase 1 is urgent to deploy. It also
   sizes how hard to chase verification 3.
2. ~~Do sellers install on Android?~~ Moot — A preserves installability.
3. ~~Does Chrome still require a service worker for the install prompt?~~
   Moot — only gated option C. Still unverified; do not treat the claim
   elsewhere in this file as established if C is ever reconsidered.
4. **Was backoffice ever deployed with a working worker?** *(still open)*
   Decides whether it has frozen devices or merely a missing feature. Same log
   check as #1.

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
> Step 3 confirmed rather than assumed: `pnpm dev` still boots clean under
> Turbopack (`▲ Next.js 16.2.4 (Turbopack)`, ready in 374ms). next-pwa takes
> the non-`withPWA` branch in development, so the dev bundler never meets the
> plugin.
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

> **Applied 2026-08-04.** `useServiceWorkerUpdate` added to `packages/shell`,
> alongside the browser-machinery hooks already there
> (`useScrollRestoration`, `useStandaloneViewportHeight`) — **both** apps have
> their own copy of the popup and both needed the trigger, so the logic is
> shared and the markup is not.
>
> Each popup now derives a `reason` (`"update"` | `"inactivity"` | none) and
> swaps title/body from a `COPY` map; an update outranks inactivity when both
> are true. Dismissal differs by reason on purpose: the inactivity prompt
> self-resets because the dismissing tap bubbles to the window `pointerdown`
> listener and counts as activity, whereas an update stays pending forever and
> has to be latched off explicitly.
>
> Two subtleties in the hook worth not "simplifying" away later: the
> first-install guard is a mutable local rather than a value read once at
> mount, because a page that loads *before* the very first worker installs
> would otherwise treat every later update as a first install and never prompt;
> and it returns a flag instead of reloading, because a reload mid-order drops
> the cart.
>
> Typecheck clean on both apps, lint unchanged from baseline (seller 23,
> backoffice 5), `pnpm build` green with both service workers emitted.
> **Untested against a real deploy** — see verification 4.

### Parked — actual offline support

Not in scope. If it is ever wanted it is a product question before an
engineering one: what happens to an order taken offline, how do daily-summary
totals reconcile, what does the seller see. Task 040's finding stands —
session ownership must never be replayed from a stale client — and that is the
reason to design it deliberately rather than bolt it on. Restored read-caching
(menu, shell, images) arrives free with Phase 1 and is worth measuring before
deciding whether more is needed.

## Verification

**Phase 1 — verified on staging 2026-08-04** (`tea-pos-staging.vercel.app`)

1. ✅ `curl -I /sw.js` → **200**, `content-type: application/javascript`,
   18,136 bytes. Was `404` + `x-matched-path: /_not-found`.
2. ✅ It is a real worker, not an HTML body under a JS content-type:
   `skipWaiting`, `clientsClaim`, `importScripts`, `precache` all present, and
   the `workbox-9568f90e.js` it depends on also serves 200.
3. ✅ The `runtimeCaching` array survived the bundler swap, version-stamped as
   designed: `next-data-5.1.2`, `product-images-5.1.2`, `supabase-api-5.1.2`.
   `/api/version` confirms `5.1.2` is deployed.
4. ✅ **The load-bearing one — registration is in the served bundle.** A worker
   nothing registers fixes nothing. `_next/static/chunks/536-f3a8b08df1cf48ca.js`
   contains `window.workbox = new f(window.location.origin + "/sw.js", {scope: "/"})`
   plus workbox's own `controllerchange` listener. Same chunk hash as the local
   build, so what was tested is what shipped.

> **Grep trap, recorded because it produced a false alarm.** The caching rules
> looked absent on first check: `grep "supabase\.co"` finds nothing, because a
> serialized regex contains `supabase\.co` — a literal backslash before the
> dot. Grep for the bare word.

**Phase 1 — still outstanding**

5. On a device that is currently stuck, confirm it picks up the new worker
   without a force-quit. **This is the actual goal of the task** — everything
   above is a proxy for it. Read the version badge on the Account screen:
   `5.1.1` means still stuck, `5.1.2` means recovered. If a device won't
   recover on its own, that is the case for shipping a kill-switch worker for
   one release before the real one.

**Phase 2 — cannot be tested yet, by construction**

6. The prompt fires on `controllerchange` only when a worker is *replaced*.
   The staging deploy installed the first one, and the first-install guard
   deliberately stays silent for that — so a silent first deploy is the
   correct behaviour, not a failure. It needs a **second** deploy on top to
   exercise: ship a visible change, then confirm an already-open installed app
   surfaces the prompt rather than quietly serving stale JS.

**Both sources of `/_not-found` are now closed**

7. Task 041 Phase 0 removed the dead `/mobile/notifications` prefetch — owner
   confirmed it is gone from the production logs. This task stopped `/sw.js`
   from 404ing, which takes effect for every device immediately rather than
   waiting on anyone adopting the new worker. `/_not-found` should therefore
   fall out of the route table on the next window; that is the observable
   confirmation both fixes landed.

## Rollout

One PR for Phase 1 covering both apps — a build-config change, so verify on a
preview deploy before promoting. Phase 2 is a separate PR; it touches the
shell and wants its own device pass.
