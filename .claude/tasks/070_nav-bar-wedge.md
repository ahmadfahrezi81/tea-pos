# Task 070 — The loading bar on a slow Android

**Status: shipped to staging 2026-09-20. Confirmed by the owner on a Samsung M11
and an iPhone. The `NavDebug` recorder that found all of this was deleted before
commit — rebuild it from this file if the bar regresses.**
Ticket: https://app.notion.com/p/3e095a7154058179be8afdd9b54d3c3a — `Bug`, `Medium`.

Scope: `packages/shell` — `navProgress.ts`, `nav-progress.css`, `MobileShell.tsx`.
Both apps get it.

## Symptom

On the M11 (Android 10, 3 GB), going back from a child page: the bar ran to
~20%, froze, then the page jump-cut in — no fill, no pulse. Device back showed
no bar at all. Forward navigation and fast phones were fine.

## What the device traces showed

Found with `NavDebug`'s recorder, not by reading code. Four wrong theories came
first — compositor layer at rest, redundant attribute writes, portal out of
`<main>`, the RSC round trip (`staleTimes`). All tried, none helped, all removed.

1. **The crawl was re-created on every navigation** (`data-run` swap). A new
   animation reaches the compositor at the next frame; on the M11 the navigation
   took the main thread 5ms later, so the crawl ran on the main thread and froze.
2. **Every navigation has a ~1s dead zone after the commit** — no frames, no long
   task. That's the browser rendering the new page. Root → root has it too.
3. **The bar finished on "data arrived"**, not "page on screen". Forward into an
   uncached page held it in `landing` across the dead zone by luck. Back into a
   cached page didn't, so fill and pulse played unseen inside the dead zone.
4. **Device back gave the bar no frame at all**: Next's popstate listener starts
   rendering in the same task.

## Fixes

| | |
| --- | --- |
| Animations exist from mount, declared paused | Nothing is created mid-navigation |
| JS is the only controller (`play`/`pause`/`currentTime`) | Mixing CSS play-state with JS rewinds made WebKit replay finished animations — double fire on iPhone |
| `settleWhenQuiet` | Finish only after 200ms of unbroken frames, so the ending lands after the dead zone |
| `startThen` for header back | Paint the bar before `router.back()` |
| Device back, **Android only**: hold Next's popstate one painted frame, re-dispatch | Same, for the phone's back. iOS excluded — its swipe has its own animation, and a build that held it there broke the swipe |
| Sheen runs in `loading` too, and parks at rest | A live signal after the crawl slows; parked so the app draws nothing when idle |

Also fixed: the 15s watchdog was reset by every navigation (a stuck bar could
never free itself); a new run inherited the old run's landing/done timer.

**Stale bundles:** every local build reports the same version, so the update
check can't see a new one and the service worker keeps serving old JS. Test in a
private/incognito tab, or results describe a build that no longer exists.

## Not done — follow-ups need their own tickets

- **The dead zone itself.** ~1s of rendering per navigation on the M11. The bar
  now tells the truth about it; only a cheaper screen (`loading.tsx`, lighter root
  tabs) removes it.
- **Navigation timing to PostHog**, so this class of bug shows up without a
  borrowed phone.
