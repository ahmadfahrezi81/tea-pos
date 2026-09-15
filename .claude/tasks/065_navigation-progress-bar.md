# Task 065 — The navigation progress bar

**Status: written and revised 2026-09-15. Steps 1–3 committed, step 4 built; none
pushed.** Scope is
the shell (`packages/shell`), so seller and backoffice both get every change. The
boot loader bar in `MobileLayoutClient.tsx` and `launch.html` are out of scope.

## What the owner asked for

| # | Owner's note | Decision | Step |
| --- | --- | --- | --- |
| 1 | Pull to refetch — not a hard reload — and it shows the load animation | Root tabs and read-only pages only; never add, edit, open, close or confirm | 5 |
| 2 | Slow Android: the bar freezes during a navigation | The bar must keep moving on a slow device. The missing skeleton on that phone is parked — see the end | 2 |
| 3 | Going back should show the loading animation too, like a browser | Every navigation shows the bar, back included | 2, 3 |
| 4 | Keep going, or split in two like Slack — fetch, then land — until fully mounted | Crawl while fetching, a sheen while landing, then fill, one pulse of ~0.5s, and fade | 2, 4 |

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
  `animationend` to end it, and step 5's pull only arms when the bar is idle.

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
  `scrollTop <= 0`, and the bar is idle.
- The first move decides the axis; horizontal disarms, so horizontal scrollers
  keep working.
- An indicator follows the finger through `transform`, written at most once per
  frame. No React state during the gesture.
- Resistance 0.5, threshold 64px. Released past it:
  `navProgress.run(onSoftRefresh())`.

This costs main-thread work per frame, which is acceptable because a pull happens on
a screen at rest. If it lags on the slow Android, the fallback is a `scroll-snap`
sentinel — compositor-speed, but it shifts scroll top for `useScrollRestoration` and
tap-to-top.

### What it refetches

The app passes `onSoftRefresh`, as for the idle sheet. For the pull, **only
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
