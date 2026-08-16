# Task 048 — Make the update prompt appear immediately

**Status: all four phases applied 2026-08-16. All decisions closed. Nothing
deployed yet — verifications 3 to 6 need two consecutive deploys and are the
only thing left.**

Opened 2026-08-16. Follow-up to task 042 Phase 2, whose verification 6 said the
prompt "cannot be tested yet, by construction" and needed a second deploy to
exercise. That deploy has happened in production. Verification 6 is closed
here: the prompt does fire, it just fires far too late.

---

## The complaint

Owner, from production:

> i already see the update, then the pop up show up telling me to restart
> again. [...] it took like 10 second after clear update.. and user already see
> and interact with the update for it to pop up.. it just too slow.

That is the whole complaint. **Timing, not design.**

The bottom sheet stays exactly as it is — no banner, no toast, no redesign, no
auto-reload:

> i never once complain about the UI. [...] they will hit the refresh now 100%,
> and it's a nice big warning.

The only UI change anywhere in this task is a second CTA label. See Case A.

---

## What good looks like

| Situation | What should happen |
|---|---|
| Deploy lands, the app loads fresh (cold start, or a hard navigation) | Sheet appears **with** the new UI, not seconds behind it. CTA is **Close**. |
| Deploy lands, till parked on the POS screen, nobody navigates | Nothing until the user picks the phone up. On foreground, sheet within ~1s. CTA is **Refresh Now**. |
| User closes or refreshes | Sheet does not return for that build. A further deploy brings it back. |
| 20 minutes untouched, no deploy | Existing inactivity sheet. One tap dismisses it. |
| Offline, or the check fails | Nothing. Silence is not evidence of an update. |
| First ever install | Nothing. |

The two update rows are mutually exclusive. A page that just loaded the new
build is already current, so the second row cannot also be true.

---

## Why it takes 10 seconds today

`packages/shell/useServiceWorkerUpdate.ts` waits on the service worker:

```
fetch /sw.js  →  install  →  activate  →  clientsClaim  →  controllerchange
```

Only the last step sets the flag. That chain is seconds long, runs at the
browser's pace, and starts on the page load that **already** delivered the new
UI — so it always finishes after the user has seen and used the update.

The wait is the cost, and it is not tunable. `controllerchange` also answers
the wrong question: *"did the worker swap?"*, not *"is my JavaScript old?"*
Those agree most of the time and disagree in exactly this case.

---

## The design — two cases, one sheet

Both cases compare build identities. Neither involves the service worker.

### Case A — the page already updated (the 10-second complaint)

The document loaded fresh and the new UI is on screen. We want the sheet at
that same moment.

**Deliberately agnostic about *why* it loaded fresh.** For an installed PWA the
likeliest path is a cold start — the app was closed or the OS reclaimed it, and
opening it fetched the new HTML. Next's own build-skew hard navigation is
another, and `reloadOnOnline: true` (set in both configs) is a third. None of
these was verified against the owner's report, and none needs to be: a
localStorage comparison at mount catches every one of them identically. Do not
let a later reader "simplify" this by tying it to a specific mechanism.

On mount, before any network:

```ts
const stored = localStorage.getItem("tea-pos:build-id");
const current = process.env.NEXT_PUBLIC_BUILD_ID;

if (stored && stored !== current) {
    // this page load moved us onto a new build
}
localStorage.setItem("tea-pos:build-id", current);
```

One synchronous read. No network, no server, no timer. The sheet renders as the
new page hydrates, arriving with the new UI instead of ten seconds behind it.

- **CTA is Close**, not Refresh — there is nothing to refresh. Owner agreed:
  > if you don't want to reload it.. that's fine as well.. just make the CTA
  > close button.
- The id is written on **every** mount, sheet or no sheet. That is what makes
  the next update detectable.
- First ever install: `stored` is `null`, no sheet. This replaces the fiddly
  `hasController` guard with something obviously correct.
- Closing the sheet only needs to hide it for this mount — the id was already
  written, so a later mount matches and shows nothing.
- The key is namespaced in case the two apps ever share an origin.

**Timing caveat.** `localStorage` does not exist during server render, so the
read lives in a `useEffect` and runs one frame after hydration — not in the
same paint as the server HTML. Imperceptible, and it lands the moment the app
becomes interactive.

### Case B — the page did not update (the parked till)

Nobody navigated, so Next never hard-reloaded and the tab is still running
yesterday's JavaScript. This is what the Refresh button exists for, and the
original reason task 042 Phase 2 was written.

On `visibilitychange` to visible, throttled to at most once per 60 seconds:

```ts
const { buildId } = await fetch("/api/version", { cache: "no-store" }).then((r) => r.json());
const dismissed = localStorage.getItem("tea-pos:dismissed-build-id");

if (buildId !== process.env.NEXT_PUBLIC_BUILD_ID && buildId !== dismissed) {
    // this tab is behind the deployment, and the user has not already declined it
}
```

- CTA is **Refresh Now**, the existing behaviour.
- Foreground is the right and only trigger. Nobody reads a sheet on a sleeping
  screen, and it is exactly when a human is about to look. No polling.
- A failed fetch shows nothing. Offline is not staleness.
- **Dismissal is per build.** Closing writes the *server's* build id to
  `dismissed-build-id`, so the sheet stays quiet for the build the user
  declined but speaks up again on the next deploy. Without this the sheet
  returns on every single foreground, since the tab stays stale until it
  reloads — a till that never reloads would be nagged all shift.
- **Refreshing must also write `build-id`, not just reload.** Otherwise the two
  cases collide: tapping Refresh Now reloads onto the new build, the Case A
  comparison at mount sees `stored !== current`, and a second sheet appears
  immediately on top of the refresh the user just asked for. Writing the
  server's build id to `tea-pos:build-id` *before* `window.location.reload()`
  makes the next mount match and stay silent. One line, easy to lose, and the
  bug it prevents looks exactly like the one this task is fixing.

### Why the comparison works, and what to compare

`env` in `next.config.ts` is a **build-time string substitution**, not a
runtime lookup — the literal is baked into the compiled output. The bundle in
the open tab came from the old deployment and carries the old literal; the
`/api/version` route handler is code belonging to the new deployment and
returns the new one. Different strings prove the tab predates the deployment.

Task 042 Phase 2 step 5 banned keying off `/api/version`, because it returns
`NEXT_PUBLIC_APP_VERSION || packageJson.version` — "one release-level number,
bumped by hand, not per deploy". That objection is about **which string**, not
about the approach:

| App | `package.json` version | Bumped per release? | `/api/version` exists? |
|---|---|---|---|
| seller | `5.4.1` | yes, `chore(seller): x -> y` commits | yes |
| backoffice | `1.0.0` | never | **no** |

A version-based check would silently never fire in backoffice. So use a
per-deploy build id:

```ts
// next.config.ts, both apps
const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || version;

env: {
    NEXT_PUBLIC_APP_VERSION: version,  // unchanged — Account badge, cache names
    NEXT_PUBLIC_BUILD_ID: buildId,     // new — staleness only
}
```

`NEXT_PUBLIC_APP_VERSION` keeps its current meaning: the human-facing release
number rendered by `packages/ui/custom/VersionInfo.tsx` and stamped into the
workbox cache names. The build id is separate and machine-facing.

### The caching hazard, already safe

A staleness check served from cache is worse than no check. The service worker
cannot serve one here — the built worker was inspected:

```
$ rg -o 'cacheName:"[^"]+"' apps/seller/public/sw.js | sort -u
cacheName:"next-data-5.4.1"
cacheName:"product-images-5.4.1"
cacheName:"start-url"
cacheName:"supabase-api-5.4.1"
```

Supplying `workboxOptions.runtimeCaching` replaces next-pwa's defaults rather
than extending them (build log: `Custom runtimeCaching array found, using it
instead of the default one`, recorded in task 042). `/api/version` matches none
of those patterns. The HTTP cache is handled by `cache: "no-store"`.

### What stays

`registration.update()` on `visibilitychange` stays — the worker still needs to
refresh what it caches for the next cold start. It just stops deciding whether
a sheet appears.

The hook keeps returning a flag rather than reloading by itself. A reload
mid-order drops the cart; that reasoning from task 042 is untouched.

---

## The second sheet hiding behind the first

Separate bug in `packages/shell/InactivityRefreshPopup.tsx`, found while
diagnosing the above. Independent of everything else here.

### The sequence

1. The update sheet is showing. It is a full-screen modal.
2. The phone sits on the counter for more than twenty minutes. No
   `pointerdown`, no `mousemove`, no `keydown`.
3. The one-second interval sets `showInactivityPrompt = true`. Nothing visible
   happens — `reason` prefers the update when both are true.
4. The user returns and taps the backdrop. `reason` is the update, so
   `handleDismiss` runs `setUpdateDismissed(true)`.
5. `reason` recomputes. The update is latched off but `showInactivityPrompt`
   is still `true`, so the sheet does not close — it swaps its copy to
   "Refresh Required".

One tap dismissed nothing. A second tap is needed.

### Root cause

The interval only ever raises the flag, never lowers it:

```ts
setInterval(() => {
    if (Date.now() - lastActivityRef.current > INACTIVITY_LIMIT) {
        setShowInactivityPrompt(true);
    }
}, 1000);
```

Activity refreshes `lastActivityRef`, but nothing clears
`showInactivityPrompt` except an explicit dismiss of the inactivity prompt
itself.

The existing comment above `handleDismiss` reasons about this and is right as
far as it goes — the dismissing tap does count as activity, so the interval
does not re-raise the flag. That covers the direct path, where one handler both
clears the flag and refreshes the ref. It does not cover a flag raised while a
*different* sheet was on top. Correct that comment when fixing this.

**Related, and intended:** a long spell in the background raises the flag too,
because a backgrounded tab fires no pointer events. Returning after three hours
shows the inactivity sheet immediately. That stays — three hours backgrounded
means the data really is stale.

### Three ways to fix it

**Option 1 — let the interval lower the flag as well.**

```ts
setShowInactivityPrompt(Date.now() - lastActivityRef.current > INACTIVITY_LIMIT);
```

Smallest change. Cost: any tap, including on the sheet's own card, closes it
within a second, which reads as the sheet vanishing on its own.

**Option 2 — freeze the idle clock while any sheet is showing.** The flag can
never be raised behind another sheet. Clean, but couples the timer to render
state.

**Option 3 — dismiss clears every reason. Chosen by the owner.**

```ts
const handleDismiss = () => {
    if (reason === "update" || reason === "updated") setUpdateDismissed(true);
    setShowInactivityPrompt(false);
    lastActivityRef.current = Date.now();
};
```

One tap always closes whatever is on screen. The idle clock restarts from the
tap, so the inactivity sheet can legitimately return twenty minutes later, and
the timer stays independent of what is rendered.

**Why the update latch is guarded.** Clearing the inactivity flag is
unconditional — that is the bug fix. Latching the update is not, even though
today it could be: an update outranks inactivity, so a *visible* inactivity
sheet already proves no update is pending, and there would be nothing to
silence. That safety comes entirely from the priority order. Add a reason or
reorder them later and an unconditional latch would quietly discard an update
the user never saw. The guard costs nothing and does not depend on the
ordering.

### Priority between the reasons

An update outranks inactivity and keeps doing so. Owner's reasoning, and it is
the right one:

> by interacting with the update sheet they are also no longer inactive

Case A (`"updated"`) and Case B (`"update"`) are mutually exclusive by
construction, so their order relative to each other never comes up.

**One accepted rough edge.** If the inactivity sheet is already on screen when
a foreground version check resolves, the sheet's copy swaps from "Refresh
Required" to "Update Available" in place rather than closing and reopening.
Usually invisible — the check resolves in about 100ms, so it reads as having
rendered that way. On a slow connection it is a visible text change. Both
messages say the same thing, so this is accepted rather than engineered around.
Moving the interval from 1s to 10s makes it rarer still, because after a long
background the update check now usually wins the race to set its flag first.

---

## Efficiency

Owner asked directly whether this can be fast without burning fluid CPU. It
comes out cheaper than today.

| | Today | After |
|---|---|---|
| `controllerchange` plumbing | yes | **removed** |
| `registration.update()` on foreground | yes — `/sw.js` is a static asset, no function invocation | unchanged |
| Case A check | — | one `localStorage` read per mount, no network |
| Case B check | — | one constant-returning route hit, capped at 1 per 60s |
| Continuous client timer | 1s | 10s |

Case A, the actual complaint, costs nothing. The ten seconds today is not
computation, it is waiting, and the wait is what gets deleted.

Case B hits a route with no database call, no auth and no PostHog evaluation —
it returns a constant object, the cheapest invocation shape there is, already
far below what `/api/flags` costs per session. Foreground only, throttled,
never on a timer.

**Free win while in there.** The one-second interval ticks forever on every
screen — the only continuous cost in this feature — guarding a twenty-minute
threshold. Ten seconds is 90% fewer wakeups and behaviourally
indistinguishable.

---

## Plan

Four phases, each shipping and verifying on its own. Phase 1 is the owner's
actual complaint and needs no backend change.

**Ordering matters in one place:** Phase 1 leaves `controllerchange` in place
alongside Case A. Removing it before Case B exists would strip the parked till
of its only signal. Phase 3 is what retires it.

### Phase 1 — Case A, the instant sheet

1. Add `NEXT_PUBLIC_BUILD_ID` to `env` in **both** `apps/seller/next.config.ts`
   and `apps/backoffice/next.config.ts`, from `VERCEL_GIT_COMMIT_SHA` with the
   package version as fallback.
2. In `packages/shell/useServiceWorkerUpdate.ts`, add the mount-time
   localStorage comparison and always write the current id back. The hook now
   returns a reason rather than a boolean: `"updated"` (Case A) or `"update"`
   (the existing `controllerchange` path, still in place).
3. Add an `"updated"` entry to `InactivityRefreshPopup`'s `COPY` map with a
   **Close** CTA instead of Refresh. Same sheet, same layout.

No endpoint, no server change, no service worker involvement.

> **Applied 2026-08-16, together with Phase 4.** They could not be separated:
> the old `handleDismiss` read
> `if (reason === "update") … else setShowInactivityPrompt(false)`, so a new
> `"updated"` reason would have fallen into the `else` branch, never latched,
> and the sheet would have been impossible to close. Phase 4 was already marked
> as safe to go first, so it went here.
>
> `useServiceWorkerUpdate` now returns `UpdateReason` (`"updated"` |
> `"update"` | `null`) instead of a boolean, with `"updated"` winning when both
> are set — a fresh load onto a new build sets both, since the worker swaps
> moments after the page it already updated, and that overlap is exactly the
> reported bug. `controllerchange` stays for now as the only cover for the
> parked till; Phase 3 retires it.
>
> The localStorage read is wrapped in `try/catch` — private mode and blocked
> cookies both throw, and no stored id means nothing to compare, so it says
> nothing.
>
> Verified the substitution actually happened rather than trusting the config.
> In the built client bundles:
> `let e,t="5.4.1";if(t){try{e=localStorage.getItem(d)` (seller) and the same
> with `"1.0.0"` (backoffice). Those are the local fallbacks — there is no
> `VERCEL_GIT_COMMIT_SHA` outside a Vercel build — which confirms the inlining
> works and that the fallback path is live.
>
> **Consequence for local testing:** backoffice's fallback is `1.0.0` and never
> moves, so Case A cannot be exercised there locally except by hand-editing
> `tea-pos:build-id` in localStorage. On Vercel both apps get a per-deploy sha.
>
> Typecheck clean in both apps. Lint unchanged from baseline, confirmed against
> a stash rather than assumed: seller 4 errors / 7 warnings, backoffice 2 / 3.
> `pnpm build` green, service worker still emitted (18.0KB).

### Phase 2 — the version endpoint

1. Add `buildId` to `apps/seller/app/api/version/route.ts`. Keep
   `frontendVersion` and `backendVersion` — the Account screen badge reads
   them.
2. Create `apps/backoffice/app/api/version/route.ts`. It does not exist today.

Changes no behaviour. It only publishes the value, so it can go out ahead of
Phase 3 and be checked with a `curl` before anything depends on it.

> **Applied 2026-08-16.** Both routes return
> `{ buildId, frontendVersion, backendVersion }`. Backoffice's is new and
> mirrors seller's, including staying unauthenticated and doing no I/O — the
> client hits it on every foreground, so a check costing a database round trip
> would be worse than the staleness it detects.
>
> Backoffice's runtime caches are `bo-next-data-1.0.0`, `bo-supabase-api-1.0.0`
> and `start-url`; `/api/version` matches none, so the same reasoning verified
> for seller holds there.

### Phase 3 — Case B, retire the service worker signal

In the same hook:

1. On `visibilitychange` to visible, throttled to once per 60s, fetch
   `/api/version` with `cache: "no-store"` and compare `buildId`, honouring
   `dismissed-build-id`.
2. Keep `registration.update()` on the same event, for the worker's own cache.
3. Drop `controllerchange` and the first-install guard with it — the guard
   exists only to protect that event.
4. Fail silent on a failed fetch.
5. Rename the hook; it no longer concerns service workers.
   `useAppUpdateAvailable` or similar. Only consumer is
   `InactivityRefreshPopup`, imported by both apps from `@tea-pos/shell`.

> **Applied 2026-08-16.** `useServiceWorkerUpdate.ts` → `useAppUpdate.ts`, with
> the export map in `packages/shell/package.json` updated. It now returns
> `{ reason, markReloading, markDeclined }` rather than a bare reason, because
> two of the storage writes belong to user actions rather than to detection:
>
> - `markReloading` runs before `window.location.reload()` and records the
>   build being reloaded into. Without it the two cases collide — the fresh
>   page would find its remembered id stale and open a second sheet on top of
>   the refresh the user just asked for. A no-op for the inactivity reason,
>   which reloads into the same build.
> - `dismiss` writes `tea-pos:declined-build-id` and clears the pending state.
>   Declining does not make the tab any less stale, so the foreground check
>   would otherwise re-offer the same build on every resume, and a till that
>   never reloads would be asked all shift.
>
> **Dismissal had to move into the hook**, found in a review pass before
> pushing. The first cut left a `updateDismissed` boolean in the popup and
> ordered `"updated"` above `"update"`, which stranded a page in two ways at
> once: `justUpdated` never clears on its own, so a page that announced one
> update and then sat open across the next could never surface the real one;
> and one boolean meant closing the purely informational sheet silenced every
> future update on that page too. Both are the parked-till population this
> whole task exists for.
>
> The fix is to let the served id outrank — the two can never both be fresh,
> since `servedBuildId` is only set when the server reports something this page
> is *not* running — and to give the hook the dismissal, because clearing it
> correctly needs the build ids that only the hook holds.
>
> The check also runs once at mount, not only on `visibilitychange`. A document
> served from the worker's cache is the one way a page can boot already behind,
> and the throttle stops that doubling with a resume moments later.
>
> Verified in the shipped bundles rather than assumed: the popup's chunk in
> both apps contains `/api/version` and `declined-build-id`, and zero
> occurrences of `controllerchange`. The hits that remain in `main-*.js` and
> `536-*.js` are workbox's own registration listener, which task 042
> verification 4 already recorded as living there.
>
> Typecheck clean, lint at baseline (seller 4/7, backoffice 2/3), `pnpm build`
> green with both workers emitted (seller 18.0KB, backoffice 11.9KB).

### Phase 4 — the second sheet, and the timer

1. Apply option 3 with the guarded update latch, and correct the comment on
   `handleDismiss`.
2. Interval 1s → 10s.

Independent of Phases 1–3; can go first if convenient.

> **Applied 2026-08-16, with Phase 1** — see the note there for why they had to
> ship together. `IDLE_CHECK_MS` is now a named constant at 10s.

---

## Verification

Phases 1 and 4 test locally. Phases 2 and 3 need two consecutive deploys — a
staleness check needs an old build and a new one by definition.

1. **Phase 1.** Build, load, then hand-edit `tea-pos:build-id` in localStorage
   to a different value and reload. The sheet must appear with the page, not
   seconds later, CTA reading Close. Close it, reload again, nothing.
2. **Phase 1, first install.** Clear site data, load. No sheet.
3. **Phase 2.** `curl /api/version` on both apps; confirm `buildId` is present
   and is the deployed commit sha. Deploy again with no other change and
   confirm it moved.
4. **Phase 3 — the parked till.** Leave an installed app open on the POS screen
   without navigating. Deploy. Background, then foreground. Sheet within about
   a second, CTA Refresh Now. Tapping it reloads onto the new build.
5. **Phase 3 — no nagging.** Repeat step 4 but close the sheet instead of
   refreshing. Background and foreground several more times: no further sheets.
   Then deploy again — the sheet must come back.
6. **Phase 3 — no double sheet.** Repeat step 4 and tap Refresh Now. The page
   reloads onto the new build and shows **nothing**. A Case A sheet here means
   the pre-reload write was missed.
7. **Phase 4.** Force the update reason on, wait past the threshold (or shorten
   `INACTIVITY_LIMIT` temporarily), then tap the backdrop once. The sheet must
   close, not change its title.

---

## Open questions

1. ~~Which fix for the second sheet?~~ **Closed — option 3**, with the guarded
   update latch described above.
2. ~~Is `VERCEL_GIT_COMMIT_SHA` populated for these deploys?~~ **Closed.**
   Owner deploys through the Vercel Git integration, which sets it at build
   time. The repo also already shipped this exact pattern —
   `packages/features/shared/version.ts:28` reads
   `process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local"`, and the
   archived admin app still calls it from `/api/version` and `/api/docs`.
   Seller and backoffice lost it during the monorepo migration rather than
   abandoning it deliberately. Phase 1 matches the existing 7-character slice
   for consistency.

   > Worth knowing but out of scope: `version.ts` is now dead code for every
   > active app. If admin is ever deleted, it goes with it.
3. ~~Should backoffice start bumping its `package.json` version?~~ **Started.**
   Moved off `1.0.0` for the first time since the app was created, alongside
   seller `5.4.1 → 5.4.2`. Not needed by the build id, but the Account badge
   meant nothing there before.

---

## Deploying this — two Vercel traps, both hit on the first attempt

Recorded because neither is in the code and both cost time.

**1. A push to `staging` can produce no deployment at all.** `2f9c181` reached
GitHub — `refs/heads/staging` matched local exactly — and Vercel never reacted:
no deployment record, no commit status, for either project. This is an open
Vercel bug where the GitHub webhook stops firing for **non-production
branches** while production keeps working
([vercel/vercel#14939](https://github.com/vercel/vercel/issues/14939)). The tell
is `gh api repos/<owner>/<repo>/deployments` showing nothing for the sha, which
distinguishes it from a slow or queued build.

**2. An empty commit deploys seller but never backoffice.** The retrigger
commit `614d320` built seller and came back on backoffice as
`inactive — "Skipped - Not affected"`. That is Vercel's
[automatic monorepo build skipping](https://vercel.com/changelog/automatically-skip-unnecessary-deployments-in-monorepos),
which diffs the commit against `VERCEL_GIT_PREVIOUS_SHA`; an empty commit
changes no files, so the skip is correct. The two projects behave differently
because the feature became
[the default only for newer projects](https://vercel.com/changelog/new-monorepo-projects-now-skip-builds-with-unchanged-code-by-default),
and backoffice is the newer one.

**So never retrigger this repo with an empty commit** — it dodges trap 1 and
walks into trap 2. Push a real change, or turn the skip off under the
backoffice project's Settings → Build and Deployment → *Skip unaffected
projects*.

**And do not use the Redeploy dialog to recover.** It rebuilds "the same source
code as your current one", which is the last *successfully deployed* commit —
the old one — not the branch head you are trying to ship.
4. ~~How noisy is Case A at your deploy rate?~~ **Closed by the owner.**
   Staging takes the frequent deploys and only the owner uses it; production is
   an MR bundling a week's work, roughly once a week. So Case A fires about
   once a week per seller, which is exactly the "there was an update" note it
   is meant to be. Both cases stay on the per-deploy build id.

---

## Rejected — do not re-propose

| Idea | Why not |
|---|---|
| Replace the sheet with a banner or toast | Owner likes the sheet and never complained about it: "a nice big warning". |
| Auto-reload instead of prompting | A reload mid-order drops the cart. Task 042 established this. |
| Cookie instead of localStorage for Case A | Would let the server render the sheet into the HTML, winning one frame nobody can perceive, at the cost of a cookie write per load and server-side branching. |
| Static `public/build-id.json` for Case B | Zero invocations, but the service worker would precache it and serve it stale. Needs an exclude rule. Revisit only if Case B shows up in the cost breakdown. |
| Keep `controllerchange` and just make it faster | The wait is the browser's install/activate/claim chain. Not tunable, and it answers the wrong question. |
| Key Case A off the release version instead of the build id | Was proposed to cut sheet noise at a high deploy rate. There is no high deploy rate — production ships about weekly. Two ids where one works. |
