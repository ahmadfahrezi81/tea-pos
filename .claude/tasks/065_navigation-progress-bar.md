# Task 065 — The navigation progress bar

**Status: steps 1–5 shipped to staging 2026-09-15 and checked by the owner; PR #110
open against master. Step 6 appended and built the same day, not yet committed.
Step 7 appended, not built.** Scope is
the shell (`packages/shell`), so seller and backoffice both get every change. The
boot loader bar in `MobileLayoutClient.tsx` and `launch.html` are out of scope.

## What the owner asked for

| # | Owner's note | Decision | Step |
| --- | --- | --- | --- |
| 1 | Pull to refetch — not a hard reload — and it shows the load animation | Root tabs and read-only pages only; never add, edit, open, close or confirm | 5 |
| 2 | Slow Android: the bar freezes during a navigation | The bar must keep moving on a slow device. The missing skeleton on that phone is parked — see the end | 2 |
| 3 | Going back should show the loading animation too, like a browser | Every navigation shows the bar, back included | 2, 3 |
| 4 | Keep going, or split in two like Slack — fetch, then land — until fully mounted | Crawl while fetching, a sheen while landing, then fill, one pulse of ~0.5s, and fade | 2, 4 |
| 5 | "Refresh Now" on the 20-minute idle sheet should show the loading bar too | Yes — the sheet closes on tap and the bar carries the refresh | 6 |
| 6 | A fresh open of the app should show the loading bar while the first screen loads | Yes — the bar runs from boot until the first screen has its data | 6 |
| 7 | Pull to refresh should feel native — like YouTube: a space opens under the header while it loads, then closes | The content slides down to open a gap with a spinner, holds while loading, and closes when done. iOS bounce off on refreshable screens | 7 |

Plus three small fixes found along the way, approved: text selectable only in
inputs, no iOS long-press menu or Android tap flash (step 1); a long store name
must not wrap the header (step 1); a second tap during a slow navigation must not
count twice (step 2).

**The constraint over everything, in the owner's words:** light, fast and
performant, so a user on a slow device still sees the animation — or at the very
least, the bar.

## Rules for every step

The bar is needed exactly when the main thread is busiest — evaluating the new
route's JS, committing the tree. So:

1. **Motion is CSS on `transform` and `opacity` only.** Those run on the compositor
   and keep moving while JavaScript blocks. No `setInterval` trickle, no rAF loop,
   no animation library.
2. **JavaScript writes one attribute, only when the state changes.** No React state
   for the bar, so no shell re-render.
3. **The bar starts before the work** — in the tap handler, before `router.push`.
4. **No layout reads on the bar's path** (`getComputedStyle`, `offsetWidth`,
   `getBoundingClientRect`). Read before write wherever a read already exists.
5. **Readiness is counted, not polled.** No `MutationObserver`, no timers guessing.
6. **Every wait has a cap,** and reduced motion is honoured.

**One version bump for the whole task** — seller 5.4.17, backoffice 1.0.18, made in
step 1 (owner's call: no bump per step). Each later step edits that version's
patch notes instead, keeping at most five lines. **Do not push until the last step
is committed:** a reader who has already dismissed 5.4.17 never sees notes added to
it afterwards.

---

## Step 1 — Native feel and header truncation — **built**

Seller 5.4.17, backoffice 1.0.18. Uncommitted as of 2026-09-15.

### Text selectable only in inputs; no long-press menu; no tap flash

`select-none` sat only on `MobileShell`'s root div, so it missed everything
rendered outside that div: every drawer, sheet and dialog (they portal to
`<body>`), the shell's `overlay`, and login and `unauthorized`. Neither app set
`-webkit-touch-callout` or `-webkit-tap-highlight-color` anywhere.

Done: a base-layer rule in both apps' `globals.css` — `user-select: none`,
`-webkit-touch-callout: none` and `-webkit-tap-highlight-color: transparent` on
`html`, with selection and the callout restored explicitly on `input`, `textarea`
and `[contenteditable="true"]` (older iOS Safari blocks pasting into a field under
a `user-select: none` ancestor). Removed the now-redundant `select-none` from
`MobileShell.tsx`, `POS.tsx` (plus its inline tap-highlight style) and both
`AuthForm.tsx` cards. The ones in `packages/ui/components` stay.

Copying a value stays a copy button's job (`CopyableValue`, `FieldRow copyable`).

### A long store name must not wrap the header

Done: `min-w-0` down the flex chain in `MobileHeader.tsx` (root and subpage
variants), `shrink-0` on the title when an accessory sits beside it and on the
account button, and `truncate` / `shrink-0` on the name and chevron in both apps'
`MobileLayoutClient.tsx` accessories.

### Verify

- Long-press text on a page, in the cart drawer, in a sheet, and on login:
  nothing highlights.
- iOS: long-press the avatar or a product photo — no preview, no Save Image.
  Long-press inside a text field — Paste still appears.
- Android: tapping shows no grey box. Selecting text in a field still works.
- Tap through both apps. Anything that now gives no press feedback gets an
  `active:` style; the tap highlight does not come back.
- Maps still pan and pinch.
- Longest real store name on a 360px phone, on a root tab and on `orders/chart`:
  one line, ellipsis, chevron visible, nothing moves.

---

## Step 2 — The new bar

Gives: a bar on every shell navigation with no delay, motion that survives a busy
main thread, and the finish. Includes the double-tap fix, because it edits the same
guard.

### What it replaces

Today (`MobileShell.tsx`): a 2px `bg-brand` line at the top of `<main>`, animating
`left` (a layout property, so it freezes when the main thread blocks); mounted by a
`setTimeout` 200ms after `isPending` turns true (`:225-233`); unmounted mid-slide
when the route commits (`:334-338`). Its `showPendingBar` state re-renders the shell
twice per slow navigation.

**Removing the 200ms delay reverses task 039 on purpose.** The delay existed
because a bar that appears and vanishes reads as a flash. A bar that finishes reads
as an answer to the tap, which is how Chrome treats a fast page.

### States

```
idle ──start──▶ loading ──route commits──▶ landing ──count reaches 0──▶ done ──fade ends──▶ idle
                   ▲                                                     │
                   └────────────── start (a new navigation) ─────────────┘
```

- **loading** — tap until commit. The bar crawls.
- **landing** — commit until the page's first-load requests settle (step 4; until
  then the count is always 0, so landing ends one frame after commit). A sheen
  travels along the bar.
- **done** — the bar fills, pulses once, fades. About 0.8s.
- `start` during loading or landing keeps crawling. `start` during done restarts
  from zero.
- **Caps:** loading 15s → done, with a dev-only `console.warn`. Landing 4s → done.
  Done 1.5s → idle — required, because under reduced motion there is no
  `animationend` to end it.

### CSS — `packages/shell/nav-progress.css`

Imported by both apps' `globals.css`, replacing the two hand-copied
`.nav-pending-bar` blocks. A dropped hand-written class fails silently (task 039),
so check the **built** CSS in both Turbopack dev and `pnpm build`.

A sketch — tune the timings on the slow Android:

```css
.nav-progress {
    position: absolute; inset-inline: 0; top: 0; z-index: 10;
    height: 2px; overflow: hidden; pointer-events: none;
    opacity: 0;
}
.nav-progress > span {
    position: absolute; inset: 0;
    background: var(--accent-primary);
    transform: translateX(-100%);
    will-change: transform;
}
/* Clips the sheen to the coloured part, or it streaks past the bar's end. */
.nav-progress > .crawl { overflow: hidden; }
.nav-progress:is([data-state="loading"], [data-state="landing"], [data-state="done"]) { opacity: 1; }

/* Crawl: answers the tap fast, slows, never reaches the end on its own. */
.nav-progress:not([data-state="idle"]) > .crawl { animation: nav-crawl-a 12s forwards; }
.nav-progress[data-run="b"]:not([data-state="idle"]) > .crawl { animation-name: nav-crawl-b; }
@keyframes nav-crawl-a {
    0%   { transform: translateX(-100%); animation-timing-function: ease-out; }
    2%   { transform: translateX(-75%);  animation-timing-function: ease-out; } /* ~250ms */
    20%  { transform: translateX(-35%);  animation-timing-function: ease-out; } /* ~2.4s  */
    100% { transform: translateX(-10%); }
}
/* nav-crawl-b: identical. Swapping names restarts the animation without a reflow. */

.nav-progress[data-state="landing"] > .crawl::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.6), transparent);
    animation: nav-sheen 900ms ease-in-out infinite;
}
@keyframes nav-sheen { from { transform: translateX(-100%); } to { transform: translateX(100%); } }

/* Done: a second layer overtakes the crawl, so the finish never reads where the
   crawl had got to. Then one pulse, then gone. */
.nav-progress[data-state="done"] > .fill { animation: nav-fill 180ms ease-out forwards; }
.nav-progress[data-state="done"] { animation: nav-settle 650ms 180ms forwards; }
@keyframes nav-fill { to { transform: translateX(0); } }
@keyframes nav-settle {
    0%   { opacity: 1; }
    35%  { opacity: 0.45; }
    70%  { opacity: 1; }
    100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
    .nav-progress, .nav-progress *, .nav-progress *::after { animation: none !important; }
    .nav-progress:is([data-state="loading"], [data-state="landing"]) > .crawl { transform: translateX(-50%); }
    .nav-progress[data-state="done"] > .fill { transform: none; }
    .nav-progress[data-state="done"] { opacity: 0; transition: opacity 300ms; }
}
```

No animated `box-shadow` or `filter`; they repaint on the main thread every frame.

### Controller — `packages/shell/navProgress.ts`

Plain module, no React, about 60 lines:

- `attach(node)` — ref callback. One `animationend` listener: `nav-settle` → idle.
- `start()` — loading; flips `data-run` only when coming from done or idle; bumps a
  generation number; starts the loading cap; sets `aria-busy` on `<main>`.
- `committed()` — loading → landing. If the count is 0, confirm in one rAF, then
  done. The same rAF confirmation runs whenever the count returns to 0.
- `track(promise)` — added in step 4.
- `run(promise)` — loading until the promise settles, then done. Used from step 5.

### Shell wiring — `MobileShell.tsx`

- Render `<div ref={navProgress.attach} className="nav-progress" data-state="idle"><span className="crawl"/><span className="fill"/></div>`
  in place of the conditional bar.
- `navigate`, `replaceWith`, `goBackTo`: call `navProgress.start()` after the
  same-path guard and after `saveScroll()`, which reads `scrollTop` — read before
  write.
- The `popstate` listener (`:196-202`): call `start()` **only if
  `location.pathname !== pathname`**, so a popstate that does not change the path
  cannot start a bar no commit will end. Nothing in either app calls
  `history.pushState` or `replaceState` today; this is a guard.
- The `pathname` effect (`:218-220`): call `committed()`.
- Delete `showPendingBar`, its effect, and `PENDING_BAR_DELAY_MS`.
- Drop the `startTransition` around `router.back()` in `goBackTo` (`:183`).
  `router.back()` is `history.back()` and returns at once, so the transition was
  always empty.
- Keep `isPending`: `useScrollRestoration` reads it (`:124`).

Commit is detected two ways: `pathname` changing (the only signal a back
navigation gives), and `isPending` falling back to false (so a push or replace that
changes only the query string still finishes instead of crawling to the cap).
`committed()` acts only in `loading`, so the two firing in one commit is harmless.

### Double tap counts twice

`navigate` (`:131`) returns early only when `path === pathname` — the **committed**
route — so a second tap on a tab still loading runs everything again. Next 16.2.4
skips the duplicate history entry (`next/dist/client/components/app-router.js:59-66`),
but `pushDepthRef` goes up twice and stays one too high for the session, so the
header back button walks out of the app's history instead of to the parent. It may
also send a second RSC request (not verified). With prefetching off, impatient
second taps are likely.

Fix: guard on `pendingPath ?? pathname`, read through a ref so `navigate` keeps its
identity. Same guard in `replaceWith`.

### Verify

- On the slow Android: tab → tab, first visit and revisit — the bar crawls, fills,
  pulses, fades, and never freezes.
- Header back and the Android back button both show the bar, including a back
  served from cache.
- Tapping a new tab during a finish restarts the crawl from zero.
- Reduced motion: no sweeping motion; start and finish still visible.
- React DevTools "highlight updates": the shell does not re-render for the bar.
- Built CSS in both apps contains `nav-crawl-a` and `nav-settle`.
- Double-tap a slow tab: one RSC request. Header back from the first page reached
  goes to the parent.

---

## Step 3 — Route the remaining navigations through the shell

These navigate without passing the shell, so they show no bar:

| Where | Today | Change |
| --- | --- | --- |
| `PillSwitcher.tsx:25` (POS ↔ Manage) | `<Link>` | A button calling `navigation.push` |
| `home/manage/layout.tsx:27` | `router.push` | `navigation.push` or `replace` — read its intent first |
| Form pages after save — 7 in seller, 5 in backoffice | `router.back()` | A new `navigation.back()` that reaches the shell's `goBackTo` |

### Verify

- POS ↔ Manage and save-then-back on a form both show the bar.

---

## Step 4 — Landing: keep going until the page has its data

### How readiness is counted

An SWR middleware in each app wraps the fetcher. A request for a key with **no
cached data** increments a counter when it starts and decrements it when it
settles. The bar stays in landing until the count is 0.

Why this costs nothing measurable — verified against SWR 2.4.1:

- A hook with no cached data calls its fetcher synchronously in its mount layout
  effect (`swr/dist/index/index.mjs:575-577`, fetcher at `:397`). Child layout
  effects run before the shell's `pathname` effect, so every first-load request is
  counted before `committed()` checks.
- A hook with cached data revalidates later via rAF (`:581`), and the wrapper skips
  it, so revalidating a cached screen never holds the bar. This matches `isLoading`
  (`:379`), so the bar and the skeletons agree.
- SWR updates its fetcher ref in a layout effect (`:524`) before the mount fetch,
  so a new wrapper each render causes no refetch.
- Cost: one closure per hook render, plus one cache lookup and one integer change
  per request actually made.

**Waterfalls.** Some screens start a request only after another answers —
`useSummaryUsers(shouldFetch ? summaryId : null)` in `MobileAnalytics.tsx:61`. The
dependent fetch starts before the next frame, which is why reaching 0 is confirmed
one rAF later (step 2).

**Generations.** `track` stamps each request with the current generation, so a
request from an earlier navigation cannot decrement this one's count. It returns
`promise.finally(...)`, the chain SWR awaits, so a rejection still reaches SWR's
error handling.

### Wiring

**Not the root `SWRConfig`.** Both root layouts are Server Components, and a
middleware is a function, which cannot cross into a Client Component. Instead each
app's `MobileLayoutClient` wraps page content — the `children` it hands the shell —
in `<SWRConfig value={TRACK_PAGE_LOADS}>`, a module-level constant so the config
keeps its identity across renders. Nested `SWRConfig`s concatenate `use` arrays
(`swr/dist/_internal/config-context-*.mjs:510-518`), so this adds to the parent
config rather than replacing it.

Scoping to page content is deliberate: the boot providers and the shell's own
extras (the store picker) are not page data and are never counted.

The middleware lives in each app at `lib/utils/trackFirstLoad.ts`; `navProgress`
is exported from the shell package as `@tea-pos/shell/navProgress`.

```ts
// Simplified. The real one names its inner function useTrackFirstLoad for the
// rules of hooks, and casts config to reach cache, which the public type omits.
export const trackFirstLoad: Middleware = (useSWRNext) => (key, fetcher, config) => {
    const tracked = fetcher && ((...args) => {
        const firstLoad = config.cache.get(unstable_serialize(key))?.data === undefined;
        const result = fetcher(...args);
        return firstLoad ? navProgress.track(Promise.resolve(result)) : result;
    });
    return useSWRNext(key, tracked, config);
};
```

A screen whose readiness is not an SWR request would need a `hold()` on the
controller. Not built: no screen needs one yet. In landing, the bar and a skeleton can be on screen together: the skeleton
shows where content will appear, the bar shows the app is still working.

### Verify

- A screen with a skeleton: the bar stays in landing until the data renders.
- Seller `analytics`: the bar does not finish between the two chained requests.
- Background polling on an idle screen never starts the bar.

---

## Step 5 — Pull to refetch

Android Chrome's native pull-to-refresh is off on purpose
(`overscroll-behavior-y: contain` — seller `globals.css:263-267`, backoffice
`:20-24`), and an installed iOS app has none. Built once, in the shell.

### Which routes

A new `RouteConfig` capability, `refreshable?: boolean`, **opt-in**: a forgotten
flag means no gesture, not a lost form.

**Seller**
- Root tabs: `home/pos`, `home/manage`, `orders`, `analytics`, `more`.
- Read-only: `manage/expense`, `manage/request`, `manage/report`, `orders/chart`,
  `analytics/chart`, `analytics/daily/*`, `…/events`, `…/sessions`, `more/stores`,
  `more/earnings`, `more/earnings/*`, `more/reimbursements`, `account/details`,
  `account/payroll-info`.
- Not: `chats`, every `/add` and `/edit`, `manage/open`, `manage/close`,
  `analytics/daily/open`, `account/language`, `more/map`, `patch-notes`, `account`.

**Backoffice**
- Root tabs: `home`, `pay`, `more`.
- Read-only: `pay/payouts`, `pay/payouts/*`, `pay/claims`, `pay/staff`,
  `pay/claim-types`, `pay/commission-types`, `pay/staff-commissions`.
- Not: `supply`, `chats`, `/add`, `/edit`, `pay/payouts/*/pay`, `more/map`, and —
  owner's call, 2026-09-15, to be safe — `pay/pay-schedule`, `pay/staff/*`,
  `pay/staff-commissions/*`.

Backoffice's dynamic routes return inline objects from `resolveRoute`; the flag
goes on those.

### The gesture

- Passive `touchstart` / `touchmove` / `touchend` on the scroll container, attached
  once.
- Armed only if, at `touchstart`, the route is refreshable (read from a ref),
  `scrollTop <= 0`, and no navigation is in flight (`navProgress.isBusy()`; a
  finishing bar does not block a pull).
- The first move decides the axis; horizontal disarms, so horizontal scrollers
  keep working.
- An indicator follows the finger through `transform`, written at most once per
  frame. No React state during the gesture.
- Resistance 0.5, threshold 64px. Released past it:
  `navProgress.run(onRefresh())`. The indicator is a small circle that comes down
  over the content — the content itself does not move — and `<main>` clips it so
  it emerges from under the header.

This costs main-thread work per frame, which is acceptable because a pull happens on
a screen at rest. If it lags on the slow Android, the fallback is a `scroll-snap`
sentinel — compositor-speed, but it shifts scroll top for `useScrollRestoration` and
tap-to-top.

### What it refetches

The app passes `onRefresh`. Like the idle sheet's soft refresh, but **only
`mutate(() => true)`**, without `router.refresh()`:

- `mutate(() => true)` refetches only keys with a mounted hook
  (`swr/dist/_internal/config-context-*.mjs:262-275`), so a pull costs what is on
  screen.
- `router.refresh()` costs a proxy run and a layout run for reads behind 60s and
  300s caches — usually nothing new. The idle sheet keeps it.

The POS cart lives in memory and a soft refresh keeps it.

### Verify

- Pull on POS with items in the cart: data refreshes, the cart survives, the bar
  runs, no reload, no RSC request.
- Pull on an add or edit page: nothing happens.
- Reduced motion: navigate twice, then pull on a root tab — it still works.

---

## Step 6 — The idle refresh and the first open

Appended 2026-09-15, after steps 1–5 reached staging. **No version bump and no
patch note** — owner's call. Both parts reuse the controller as it is; no new state.

### "Refresh Now" on the idle sheet

`InactivityRefreshPopup` (`packages/shell`) handles two reasons. **Update** is a
hard reload and stays one — a new document brings its own boot loader. **Inactivity**
is a soft refresh (`:129-148`): it awaits `onSoftRefresh()` (`mutate(() => true)`),
calls `router.refresh()`, and only then closes, showing a spinner in the button
meanwhile. No loading bar.

Change the inactivity path only:

- On tap, close the sheet at once and hand the work to the bar:
  `navProgress.run(refresh)`, where `refresh` is the same `onSoftRefresh()` →
  `router.refresh()` sequence. The popup is in the shell package, so it imports
  `navProgress` directly.
- The bar settles when `onSoftRefresh()` does. `router.refresh()` returns nothing
  to await, so it finishes in the background, as it does today.
- The button's spinner stays for the update reason only, which still reloads with
  the sheet up. Reset the activity stamp on tap, as now.
- A navigation started during the refresh takes the bar over (`run` is
  generation-stamped), and the refresh then settles without touching it.

### The bar on a fresh open

Today the boot loader covers the shell until `ready`, then disappears onto a screen
whose data is still loading — skeletons with no bar. The bar should already be
running when the loader lifts and finish when the first screen has its data, like
any other navigation.

The ordering is the whole problem. When `ready` flips, the first screen mounts and
its SWR hooks start their fetches in their own layout effects — **before** any
effect in the shell runs. `track` only counts while the bar is in `loading` or
`landing`, so starting the bar in an effect on `ready` would miss every one of them.

So start it earlier and let `ready` play the part of a commit:

- **On shell mount** (while `ready` is still false, under the boot loader): call
  `navProgress.start()`. The bar crawls invisibly beneath the loader, at compositor
  cost only.
- **When `ready` turns true:** the first screen mounts and its first-load requests
  are counted, because the bar is already in `loading`. Then the shell's effect on
  `ready` calls `committed()` → landing → done once the count reaches 0.
- **Declare the mount effect after** the existing `pathname` and `isPending`
  effects. Both call `committed()` on mount; effects run in declaration order, so
  if `start()` ran first they would move the bar to landing before the first screen
  had even mounted.
- If `ready` is already true on mount, both calls land in the same effect and the
  bar finishes a frame later — harmless.
- The loading cap (15s) covers a boot that never becomes ready. Its dev warning says
  "no commit"; give `start` an optional reason, or accept the wording.

Both apps get it from the shell with no app changes: the seller and backoffice
loaders both flip `ready` through `MobileShell`.

### Verify

- Idle 20 minutes, tap Refresh Now: the sheet closes at once, the bar runs and
  finishes, the POS cart survives, no reload.
- The update reason still hard-reloads.
- Fresh open of both apps: when the boot loader lifts, the bar is already moving,
  and it finishes when the first screen's skeletons are replaced.
- The store list is seeded into the cache by `BootFallback`, so it is never counted
  and never holds the bar; only the first screen's own requests do.

---

## Step 7 — Pull to refresh, the YouTube way

Appended 2026-09-15 after step 5 reached staging. Replaces step 5's *indicator*,
not its routes, gesture rules or refetch. **No version bump and no patch-note
change** — "You can now pull down on a screen to refresh it" still describes it.

### What the owner wants

Step 5 drops a white circle over the content and, on release, springs it back and
hands the refresh to the 2px bar. The owner's reference is YouTube: pulling slides
the page down and opens a space **just under the header**; letting go holds that
space open with a spinner in it while it loads; when it is done the space closes
and the page slides back up.

### Decisions (owner, 2026-09-15)

- **Open the gap by moving the content, never by growing a spacer.** Animating a
  spacer's height re-lays-out the whole page every frame. The scroll container gets
  `transform: translate3d(0, y, 0)` and the spinner sits in the space it vacates.
  The header is outside `<main>`, so the gap opens directly beneath it.
- **One indicator.** A pull shows the spinner in the gap and **not** the top bar.
  The bar stays for navigation, the first open and the idle refresh (step 6).
- **iOS bounce off on refreshable screens.** The scroll container gets
  `overscroll-behavior-y: none` (Tailwind `overscroll-y-none`) when the route is
  `refreshable`, so the page does not move twice on iOS and both platforms feel the
  same. Those screens lose the native bounce at the bottom too; accepted. Other
  screens keep it.
- **The `position: fixed` catch is accepted.** A transform makes the scroll
  container the containing block for any fixed element inside it. At rest the
  transform is cleared to `none` — not `translate3d(0, 0, 0)` — so nothing changes
  normally. Only while pulling or refreshing do inline fixed elements move with the
  page. Checked: every drawer, sheet and popup that matters portals to `<body>`;
  the two refreshable screens with an inline fixed element are backoffice
  `pay/payouts` and `pay/payouts/[payoutId]`, and a shift of about a second there
  is accepted.
- **Gap height while loading: 56px** — the spinner and some room. Tune on device.

### Motion

| Phase | Content | Spinner |
| --- | --- | --- |
| Pulling | Follows the finger with **growing resistance** — easy at first, stiffer the further it goes (e.g. `max × (1 − e^(−dy / k))`), capped around 120px | An arc fills with pull progress. At the threshold the arc completes, the spinner pops slightly in scale, and Android gives a 10ms `navigator.vibrate` — once per crossing |
| Released below threshold | Transitions back to 0, then transform cleared to `none` | Fades out |
| Released past threshold | Springs to **56px** with a slight overshoot (CSS transition, overshooting cubic-bezier) | Switches to an indeterminate spin (CSS keyframes on `transform: rotate`) |
| Refresh settled | Held for at least **400ms** from release, so a fast refresh never just blinks; then transitions to 0 and the transform is cleared | Scales down and fades |

### Keeping it light

Same rules as every step:

- **Only the finger-following write is JavaScript** — at most one `transform` per
  frame, on a screen at rest. Hold, spring, collapse and spin are CSS transitions
  and keyframes, run by the compositor.
- **No React state.** The container, spinner and arc are written directly, as in
  step 5. The arc's `stroke-dashoffset` is a paint, but of a ~24px SVG at most once
  a frame.
- **Listeners stay passive.** With bounce off, pulling at the top has no native
  motion to compete with, so nothing needs `preventDefault`.
- **Clear on rest.** `transform: none` and no `will-change` when idle, so the scroll
  container is an ordinary element between pulls.

### Wiring changes from step 5

- **Remove** the `.pull-indicator` circle, its `RefreshCw` icon and the
  `navProgress.run()` call from the gesture. `run()` itself stays — step 6's idle
  refresh uses it.
- **Transform the scroll container itself**, not a new wrapper around `children`. A
  wrapper would change what pages sit inside — anything sized with `h-full` against
  the scroller would break — and `useScrollRestoration` observes the scroller's
  first child.
- **The spinner** lives in `<main>`, above the scroll container, at the top of the
  gap. `<main>` already clips (step 5), so the pushed-down bottom of the content is
  hidden under the footer while the gap is open.
- **Arming** stays as step 5 has it, plus: not while a pull refresh is already
  running.
- **A navigation during a pull refresh** closes the gap at once, without the
  transition, when the route commits — the content it was holding open is gone.
  The refresh's later settle is then ignored.

### Verify

On the slow Android and on the iPhone, installed:

- Pull slowly on POS: the page slides down under the header, the arc fills, and the
  threshold is felt (Android vibrates).
- Let go past it: the gap springs to its height and the spinner spins; the page
  slides back when the data is in, and never blinks shut on a fast refresh.
- Let go before it: the page slides back and nothing refetches.
- The top bar does **not** run for a pull.
- iOS: no double movement at the top of a refreshable screen; non-refreshable
  screens still bounce.
- Tap a tab mid-refresh: the gap closes at once and the new screen loads normally.
- At rest, after a pull: a drawer or sheet opened from the page is positioned
  correctly (transform cleared).
- Backoffice `pay/payouts`: the fixed element shifts only while the gap is open.
- The POS cart survives, and horizontal scrollers still swipe.

---

## Parked — one Android shows skeletons only on the first page

Dropped from this task by the owner on 2026-09-15, to revisit later. Recorded so
the next attempt does not repeat what is already known:

- **The observation.** On one specific Android phone, skeletons appear on the first
  page the app lands on, and on no screen after that. It is not specific to Orders.
  The owner's iPhone shows skeletons everywhere.
- **Not CPU speed alone.** Desktop Chrome with CPU throttled 20× still shows the
  skeletons.
- **Not the code choosing to skip them.** Skeleton gates read SWR's `isLoading`, and
  `Skeleton` has no show delay, so a first visit renders one. On that phone it is
  replaced before it is painted.

The next step, when picked up, is a Performance recording on that phone over
`chrome://inspect`. Step 2's bar keeps moving there either way.

## Not in scope

- The boot loader bar and `launch.html`.
- Re-enabling prefetch — task 057 decides that. This task makes a slow tab switch
  read better; it does not make it faster.
- A determinate progress bar, and a stop button.
- A bigger header back button (about 38×38px, no `aria-label`). Declined: users go
  back with the phone's back button.
