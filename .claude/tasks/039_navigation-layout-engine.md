# Task 039 — Navigation & Layout Engine (measured chrome, real transitions)

**Status: Planned, not started.** Scope is deliberately phased so each phase is
independently shippable and independently revertible. Execution happens on a
throwaway branch off `staging` (`feat/nav-engine`) — if the result doesn't feel
right on real devices, the branch gets dropped and nothing is lost.

**Revised after review.** The first draft proposed measuring the fixed header
and footer with a `ResizeObserver` and publishing their heights as CSS
variables. That was solving a self-inflicted problem: the chrome is only
unmeasurable because it opted out of the layout with `position: fixed`. Putting
it back into the flex flow deletes the same constants with less code and no
runtime machinery. See "The core fix" in Design. The review also added content
modes (`scroll` / `fill`, item 8) and corrected an unverified claim about
Indonesian string lengths in item 1.

**Second review pass** added, against the stated goal of "readable,
maintainable, performant, built to last, and not invented here": a "Prior art"
section marking which phases implement a known-standard pattern and which are
near the edge of what the web does well; a "Maintainability lives in the route
table" section with measured redundancies across all 33 routes; Phase 1c to act
on them; and the decision to use `document.startViewTransition()` rather than
an animation library in Phase 4, with the React-version constraint that rules
out the framework-level integration.

## The ask

> "make it actually good, like a prod app — like Grab, like Twitter. The PWA
> should be as mobile-like as possible so it looks good on as many devices as
> possible."

That's two separate goals that happen to live in the same file, and they should
not be conflated:

1. **Correctness across devices** — the shell should *measure* what it's laying
   out instead of guessing. This is where the current bugs are.
2. **Feel** — navigation should read as native (no content blanking, no
   skeleton flash, preserved scroll, a back gesture). This is where the
   "doesn't feel like Grab" gap is.

Goal 1 is small and high-confidence — smaller than it first appeared, see the
Design section. Goal 2 is the bigger, more subjective piece. Doing 1 first is
not just sequencing: goal 2 needs a content region whose bounds are actually
correct before animating or preserving scroll within it means anything.

---

## What's actually broken today

All line refs are `apps/seller/app/[tenantSlug]/mobile/`.

### 1. The chrome is out of flow, so all spacing is a guess

`components/MobileLayoutClient.tsx:169` renders the shell as
`h-dvh flex flex-col` — which reads as if the header, content, and footer are
flex children sharing the height. They aren't. Both chrome pieces are
`position: fixed`:

- `components/MobileHeader.tsx:37` — `fixed top-0 left-0 right-0 z-40`
- `components/MobileFooterNav.tsx:27` — `fixed bottom-0 left-0 right-0`

So the `flex-1` content region (`:184`) actually spans the **entire** viewport,
and the chrome floats over it. Every bit of spacing after that is manual
re-clearing:

```ts
// MobileLayoutClient.tsx:152-158
const scrollPaddingTop = hasHeaderAction
    ? "pt-30"
    : isInlineHeader
      ? "pt-16"
      : currentIsSubPage
        ? "pt-27"
        : "pt-19";
```

Four hand-tuned constants encoding "how tall is the header in this route
variant." Nothing verifies them against the header's actual height. They are
load-bearing in **four** places — the scroll container (`:187`), the transition
skeleton (`:193`), the overlay slot (`:206`), and implicitly the footer CTA.

**The header's height is genuinely variable, so these constants are a standing
bug waiting for the right content.** Two independent sources of variability:

- **Unbounded user data in the header.** On root tabs the header renders the
  title *and* the selected store name inline on one line
  (`MobileHeader.tsx:122-141`) — `<h1>` at `text-3xl font-extrabold` plus the
  store name at `text-[22px] font-semibold`, in a `flex items-baseline gap-2`.
  Store names are user-entered and have no length limit. A long store name
  wraps the header to two lines, and `pt-19` does not know.
- **i18n, to a lesser degree.** Checked against the actual translation files
  rather than assumed: Indonesian nav titles are *not* systematically longer —
  `nav.newLocationFeedback` is `"Feedback Baru"` (13) vs `"New Location
  Feedback"` (21), and `nav.editPersonalDetails` is `"Ubah Data Pribadi"` (17)
  vs `"Edit Personal Details"` (21), both *shorter*. The longest id titles are
  `nav.daySummaryDetails` = `"Detail Ringkasan Hari"` (21) and
  `nav.editPayrollInfo` = `"Ubah Info Penggajian"` (20). So i18n is a real but
  modest contributor; the store name is the one that can blow the header up
  arbitrarily.

Either way the top of the page content silently slides under the header, and
nothing in the code can detect it.

### 2. Footer height is UA-sniffed

```ts
// MobileLayoutClient.tsx:170
style={{ '--mobile-footer-h': isIPhonePWA ? '97px' : '65px' }}
```

`useIsIPhonePWA()` (`apps/seller/lib/usePWA.ts`) is:

```ts
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = (navigator as ...).standalone === true;
```

Two magic pixel values selected by user-agent string. `navigator.standalone` is
a non-standard iOS-only property, so this is `false` on **Android installed
PWAs** — which do have a gesture-nav inset that needs clearing. It's also wrong
on iPad, wrong in landscape, and wrong on any future device whose home
indicator differs. The `97 - 65 = 32px` difference is just `pb-8`, applied
separately inside `MobileFooterNav.tsx:24`:

```ts
const wrapperClass = `flex p-1 ${isIPhonePWA ? "pb-8" : ""}`;
```

So the same guess is encoded twice, in two files, and they must be kept in
sync by hand.

### 3. No safe-area handling exists at all

- `apps/seller/app/layout.tsx:10-15` — the `Viewport` export sets only
  `themeColor`. No `viewport-fit: "cover"`.
- `apps/seller/app/globals.css` — grepped for `env(` / `safe-area`: **zero
  matches**. The only related line is `overscroll-behavior-y: contain` at
  `:211` (Android pull-to-refresh guard).

The notch and home indicator are approximated entirely by the `pb-8` in item 2.
A prior attempt at doing this properly (`viewport-fit=cover` +
`env(safe-area-inset-*)`) was **fully reverted the same day** because content
clipped at the top in iOS Safari. That revert is the direct reason this task
exists: the constants in item 1 cannot track a header whose height has become
variable, so adding safe-area insets to a guessed-height header can only break
it. **Measurement has to land first, then safe areas become trivial** — because
`offsetHeight` already includes padding and safe-area insets automatically.

### 4. `h-dvh` is unstable in mobile browsers

`dvh` tracks the *dynamic* viewport, which changes continuously as mobile
Safari/Chrome collapse and expand the URL bar during scroll. The shell height
therefore animates while the user scrolls, and the fixed chrome shifts with it.
In an installed PWA there's no URL bar so this is invisible — which is likely
why it hasn't been noticed. It's visible in browser tabs.

### 5. Scroll restoration is dead code — both halves of it

This one is worth calling out because it's a feature that was built, never
wired up, and has been silently doing nothing since.

- `components/MobileScrollContext.tsx` (14 lines) exports
  `MobileScrollContext` + `useMobileScroll()`.
- `analytics/MobileAnalytics.tsx:112` consumes it:
  `const { scrollRef } = useMobileScroll();`
- `analytics/MobileAnalytics.tsx:138` guards on it:
  ```ts
  if (summariesData && !scrollRestored.current && scrollRef.current) {
      // ... restore scrollTop from sessionStorage
  }
  ```
- **`MobileScrollContext.Provider` appears nowhere in either app** (grepped
  `apps/seller/app` and `apps/backoffice/app` — zero hits). The context falls
  through to its default value, `{ scrollRef: { current: null } }`.

So `scrollRef.current` is permanently `null`, the guard at `:138` never
passes, and the analytics scroll position is never restored. Its companion
route flag `preserveScroll: true` (`config/navigation.ts:25, :103`) is
likewise never read by `MobileLayoutClient` — declared in the `RouteConfig`
type, set on `/mobile/analytics`, consumed by nothing.

Meanwhile a *different*, working, ad-hoc scroll save/restore does exist for the
store picker only, inline in the layout (`MobileLayoutClient.tsx:102-113`),
using `el.dataset.scrollY`.

Net: one working single-purpose hack, one fully dead general mechanism, and
zero scroll preservation on tab switches — which is exactly the thing that
makes Twitter/Grab feel native and the current app feel like a website.

### 6. Every navigation unmounts the page and flashes a skeleton

```ts
// MobileLayoutClient.tsx:189
{shellReady && !isTransitioning && children}
```

`handleNavClick` (`:63-71`) sets `isTransitioning = true` and pushes. Until the
new pathname matches, `children` is **not rendered at all** — replaced by a
generic four-block pulse skeleton (`:191-203`) that looks nothing like any
actual page.

This is the single biggest "doesn't feel like a prod app" item. Native apps
keep the current screen on-screen until the next one is ready. This blanks it
every time, including for tab routes that were explicitly prefetched moments
earlier (`:92-100`, `:134-136`) and therefore need no loading state at all. It
also destroys all component state on every tab switch, which is what forces
things like the analytics sessionStorage workaround in item 5.

### 7. No back gesture, and no back affordance in standalone PWA

An installed iOS PWA in standalone mode has **no browser chrome** — no back
button, no swipe-from-edge. The only way back is the header's `ArrowLeft`
(`MobileHeader.tsx:44-49`). There's no `popstate` handling, so Android's
hardware/gesture back just walks raw history, which after a few tab switches
does not correspond to the app's own `parent` hierarchy.

The route table already knows the hierarchy — every route declares
`parent` (`config/navigation.ts:19`), including the `"lastRootTab"` sentinel.
The data for a correct back stack exists; nothing consumes it for gestures.

### 8. Pages that want to *fill* the screen are fighting the shell

The shell gives every route the same treatment: one scroll container with
`p-4` plus the padding constants (`:187`). But routes don't all want that. Some
want the exact available box, filled, never scrolling as a whole — with their
own internal scroll region.

Five components already build that by hand *inside* the shell's scroll
container:

- `more/map/_components/FeedbackHistory.tsx:293`
- `home/layout.tsx`
- `home/_components/StoreGate.tsx`
- `home/manage/_components/shared/PhotoPicker.tsx`
- `account/_components/AccountProfile.tsx`

`FeedbackHistory` is the clearest case:

```tsx
// FeedbackHistory.tsx:293-333
<div className="flex flex-col h-full gap-3">
    {/* Map — fixed, doesn't scroll */}
    <div className="shrink-0 h-[220px] w-full rounded-2xl overflow-hidden">…</div>
    {/* Search + Filter */}
    <div className="shrink-0 flex gap-2">…</div>
    {/* List — only this scrolls */}
    <div className="flex-1 overflow-y-auto">…</div>
</div>
```

A `h-full` flex column with a pinned map, a pinned search bar, and one
`flex-1 overflow-y-auto` list — **nested inside the shell's own
`overflow-y-auto`**. Two scroll containers stacked, which is the classic recipe
for scroll that feels wrong: the inner list reaches its end and the outer
container then starts moving. This is also exactly why that route carries
`scrollPaddingBottom: "pb-0"` (`config/navigation.ts:147`) — the override
exists to stop the outer container contributing slack the page never wanted.

`h-full` here resolves against the shell's scroll container, so it happens to
approximate the right height today. It's coincidence, not design, and it breaks
the moment the padding constants are wrong.

So the shell has two content modes in practice — **scroll** and **fill** — but
only one is expressed in code. The other is emergent from padding hacks and
`h-full` guesses in five separate components.

### 9. Minor, but worth fixing while in here

- `select-none` on the whole shell (`:169`) blocks text selection app-wide,
  including order totals and IDs a user might legitimately want to copy. Native
  apps disable selection on *chrome*, not on *content*.
- `packages/utils/navigation.ts` is a module-level mutable singleton
  (`let _navigate`), registered into on mount by whichever layout renders last.
  It works today because only one shell mounts at a time, but it's a hidden
  global with no ownership story.

### 10. Seller and backoffice have already drifted (relevant to Phase 6 only)

| | seller | backoffice |
|---|---|---|
| `MobileLayoutClient` | 333 lines | 261 lines |
| `MobileHeader` | 174 lines | 78 lines |
| `config/navigation.ts` | 402 lines | 199 lines |
| `hasHeaderAction` | `!!currentRoute?.headerAction` (`:142`) | `=== "add"` (`:106`) |
| Route flags | `isChart`, `hideStorePicker`, `footerCtaKey`, `scrollPaddingBottom`, `preserveScroll`, `titleKey` | none of these |
| Tab `variant` (POS↔Manage swap) | yes (`:117-132`) | no (`:87-96`) |
| i18n | `useT()` | none |

The `hasHeaderAction` row is a live latent bug: seller grew a `"edit"` header
action (`config/navigation.ts:173, :302`), backoffice's check only matches
`"add"`, so an `"edit"` route in backoffice would silently get `pt-19` instead
of `pt-30` and clip its content. `MobileOverlayContext.tsx` and
`MobileFooterSlotContext.tsx` are byte-identical across both apps (14 lines
each).

---

## Design

### The core fix: put the chrome back in the flow

**This supersedes an earlier draft of this plan that proposed measuring the
fixed chrome with a `ResizeObserver` and publishing `--app-header-h` /
`--app-footer-h` as CSS variables.** That would have worked, but it solves the
wrong problem: it builds machinery to re-derive a number the layout engine
already knows. The browser is perfectly capable of laying out a header, a
footer, and a content region that takes the remainder — that's what flexbox is.
The only reason it can't today is that the chrome opts out with
`position: fixed`.

Take the chrome out of `fixed` and make it a real flex child:

```tsx
<div className="h-[100svh] flex flex-col overflow-hidden">
    <header className="shrink-0">…</header>
    <main className="flex-1 min-h-0 relative">…</main>
    <footer className="shrink-0">…</footer>
</div>
```

That's it. The content region is *exactly* the leftover space, computed by the
browser, correct on every device, correct at every header height, correct when
a store name wraps, correct in landscape, correct on a device that ships an
inset nobody has seen yet.

What this deletes outright:

- all four `pt-*` constants (`MobileLayoutClient.tsx:152-158`)
- `--mobile-footer-h` and its `97px` / `65px` UA guess (`:170`)
- the duplicate `pb-8` in `MobileFooterNav.tsx:24`
- `useIsIPhonePWA` from every sizing decision
- the `bottom: var(--mobile-footer-h)` on the skeleton (`:194`) and overlay
  (`:207`) slots — both become plain `inset-0` of `<main>`
- the `ResizeObserver`, the CSS variables, and the whole `useMeasuredChrome`
  hook the earlier draft called for

**`min-h-0` on `<main>` is the one non-obvious part** and the reason this is
sometimes believed not to work. A flex child defaults to `min-height: auto`,
which refuses to shrink below its content's intrinsic height — so without it a
tall page pushes the footer off-screen instead of scrolling internally. With
it, the content region clamps to the leftover space and its inner
`overflow-y-auto` takes over. This single property is what makes the whole
approach behave.

**Is anything lost by giving up `fixed`?** Checked, and no:

- The header is opaque (`bg-slate-100`, `MobileHeader.tsx:37`), so nothing
  currently scrolls under it — no visual effect depends on the overlap.
- `fixed` chrome is actively *worse* on iOS when the soft keyboard opens: iOS
  doesn't resize the layout viewport, so fixed elements detach and jitter.
  In-flow chrome inside a `100svh` shell doesn't have that failure mode.
- The `StorePickerDrawer` (vaul) and the loader/maintenance/auth overlays keep
  their own `fixed` positioning and are unaffected — they're viewport-level,
  which is what `fixed` is actually for.

Measurement isn't banned — it's just demoted to a fallback for a case that
doesn't currently exist (e.g. if a translucent collapsing large-title header is
ever wanted). Don't build it preemptively.

### Content modes: `scroll` vs `fill`

Item 8 showed five components hand-rolling a fill layout inside a scroll
container. Once the chrome is in flow, `<main>` is a known-good box and the
mode becomes a one-line route declaration instead of an emergent property of
padding values:

```ts
// RouteConfig
content?: "scroll" | "fill";   // default "scroll"
```

- **`scroll`** (default) — `<main>` renders
  `<div className="absolute inset-0 overflow-y-auto p-4">`. Today's behavior
  for almost every route.
- **`fill`** — `<div className="absolute inset-0 overflow-hidden">`, no
  padding. The page owns the box and does its own internal layout. The child's
  `h-full` now resolves against a genuinely correct height instead of
  approximating one.

This is, as noted in discussion, the same distinction Android draws with
`match_parent` + a weighted child versus a `ScrollView`. Naming it explicitly
is the point — the shell should be *told* which one a route is, not left to
infer it from a `pb-0`.

Confirmed `fill` candidate: `/mobile/more/map` (`FeedbackHistory.tsx`, item 8)
— and converting it deletes the `scrollPaddingBottom: "pb-0"` override and the
nested double-scroll at the same time. The other four `h-full` components
(`home/layout.tsx`, `StoreGate.tsx`, `PhotoPicker.tsx`, `AccountProfile.tsx`)
need reading individually before classifying — `PhotoPicker` is a child
component rather than a route root, so it may not be a route-mode question at
all. Do not bulk-convert.

With `fill` expressed properly, `scrollPaddingBottom` disappears as a concept:
the map's `pb-0` becomes `content: "fill"`, and account's `pb-8`
(`config/navigation.ts:164`) becomes ordinary content padding that means what
it says, because there's no longer a footer to clear.

### The footer becomes a region, not an overlay

Today the footer nav is `fixed` while the footer CTA is a separate
`absolute bottom-0 z-20` element rendered *inside* the content area
(`:212-225`), and subpages swap between them by hiding one (`:228`). Two
different mechanisms for the same screen position.

In-flow, `<footer>` is one region that renders whichever bottom chrome the
route calls for — tab nav, CTA button, custom `footerSlot`, or nothing. The
content region shrinks to accommodate it automatically. This also removes the
"measure whichever bottom chrome is present" problem the earlier draft had to
call out as a gotcha.

### Prior art — and where it runs out

Stated goal for this work: readable, maintainable, performant, built to last,
and *not invented here* — this is a solved problem and the solution should look
like the known one. That's true for most of this task, but not uniformly, and
the difference matters for how much confidence to place on each phase.

**Solved, standard, boring — will still be correct in ten years:**

- The in-flow app shell (fixed-height header, weighted content, fixed-height
  footer) is the same structure as Android's `LinearLayout` with
  `layout_weight="1"` on the content, iOS's `UINavigationController` +
  safe-area layout guides, and the flexbox "holy grail" layout. Three
  independent platforms converged on it. This is the piece to be most
  confident about.
- Route metadata in a declarative table, consumed by a generic shell, is how
  every router worth copying works (React Navigation's screen options, Flutter's
  route settings, Android's navigation graph).
- `env(safe-area-inset-*)` + `viewport-fit=cover` is *the* answer for notches.
  There is no competing approach.

**Not solved — the web genuinely lags native here:**

- Native-feeling page transitions. Until recently the only option was
  animating React state with a library, which janks because it runs on the main
  thread. The platform answer now exists (`document.startViewTransition`, see
  Phase 4) but is newer than the rest of this list.
- Back gesture in a standalone iOS PWA. The Navigation API is Chromium-only;
  Safari has nothing equivalent. Anyone doing this is hand-rolling touch
  handling. There is no canonical implementation to copy.

**Therefore Phases 1–3 and Phases 4–5 deserve different confidence.** 1–3 are
implementations of well-known patterns and should be expected to work.
4–5 are closer to the edge of what the web does well; they're worth attempting,
but "we tried it and it didn't feel right, so we dropped it" is a legitimate
outcome for them in a way it isn't for 1–3.

### Maintainability lives in the route table, not the shell

The shell is 333 lines and will stay roughly that size. `config/navigation.ts`
is 402 lines across 33 routes and grows with every screen the product adds. So
the long-run maintenance cost is dominated by one question: **what does it cost
to add a route?**

Today it costs a seven-line ritual, most of it noise. Measured across the
actual 33 routes:

| Field | Declared on | Actually meaningful on |
|---|---|---|
| `subPage` | 33 | — **100% redundant**, see below |
| `isChart` | 33 | 2 |
| `inlineHeader` | 33 | 8 |
| `titleKey` | 33 | 33 (fine) |

Three specific problems, all verified against the file rather than assumed:

1. **`subPage` is fully derivable from `parent`.** Checked all 33 routes:
   `subPage === true` iff `parent !== null`, with **zero** disagreements. Two
   fields encoding one fact, nothing enforcing agreement, and
   `rootTabSuffixes` (`:314-316`) already filters on *both* as if they could
   differ. Derive it; delete the field.
2. **Required booleans that are almost always `false`.** `isChart: false` is
   typed out on 31 routes so that 2 can say `true`. Make every field optional
   with a default and a route declaration drops from ~7 lines to ~2.
3. **`footerCta` and `footerCtaKey` are two fields for one label** — leftover
   from the i18n migration, where `footerCta` is the pre-translation fallback
   (`MobileLayoutClient.tsx:143` prefers the key, falls back to the string).
   Now that i18n has landed, one field.

**The rule worth adopting, because it's what stops this rotting:** every
`RouteConfig` field must describe a *layout capability*, never *a specific
screen*. The test is whether a second, unrelated route could plausibly want it.

- `content: "scroll" | "fill"` — passes. Any route might want either.
- `headerAction: "add" | "edit"` — passes. A capability with variants.
- `isChart` — **fails.** It doesn't describe a layout; it names two screens
  that happen to look alike. What it actually controls is a header variant
  (back arrow above a title with an inline store picker). Model it as that.
- `hideStorePicker` — **fails.** Inverted: the store picker is a header slot,
  and the routes that "hide" it simply don't fill it. Expressing an absence as
  a negative boolean is what produces `hideX`/`showY` flag soup over time.

Enforcing this is the difference between a shell that absorbs the next twenty
screens and one that accumulates an `if` per screen until nobody dares touch
it. It costs nothing to adopt now and is expensive to retrofit later.

### Naming and placement

New package `packages/shell` — **not** `packages/ui`. `packages/ui` is a
component library (Radix primitives, `ErrorSheet`); this is an application
shell with routing behavior, state, and platform quirks. Mixing them means
every `packages/ui` consumer pulls in `next/navigation`.

Whichever package it lands in, both apps' `globals.css` need a matching
`@source` glob or Tailwind will tree-shake the shell's classes away.

### Principle: let the browser compute geometry

The current code asks "what device is this?" (`useIsIPhonePWA`) and then
applies a number. It shouldn't ask at all. Layout geometry comes from one of
two places, never from a constant and never from a UA string:

1. **Flex flow** — the browser computes the content box from the chrome's
   natural height.
2. **Values the browser hands us** — `env(safe-area-inset-*)`, `svh`.

Device detection stays available for *behavior* (e.g. whether to offer an
install prompt), never for geometry.

A useful side effect of dropping the measurement approach: there is no
observer, no CSS variable, no React state tracking heights, and therefore no
question about re-render cost during mobile Safari's URL-bar collapse. The
cheapest code is the code that isn't there.

Also note this makes the first paint correct with no hydration caveat. The
measurement approach needed SSR fallback values
(`var(--app-header-h, 4.75rem)`) because the real height isn't known until the
observer runs on the client. Flex layout is correct in the server-rendered
HTML, before any JS executes.

---

## Phases

Each phase is a separate commit on `feat/nav-engine` and is independently
revertible. **Phases 1–2 are the correctness work; 1c is the maintainability
work; 3–5 are the feel work; 6 is consolidation.** Stop after any phase if the
result isn't worth it.

Confidence, per "Prior art" in Design — these are not all equally sound and
shouldn't be treated as one commitment:

| Phase | Confidence | Why |
|---|---|---|
| 1, 1b, 2 | High | Standard app-shell layout; three platforms converged on it |
| 1c | High | Mechanical, no behavior change, verified redundancies |
| 3 | High | Ordinary state management; the hard part is just wiring what exists |
| 4 | Medium | Platform primitive exists and is well-supported, but tuning "feels right" is subjective |
| 5 | Low | No canonical implementation on iOS; genuinely bespoke |
| 6 | High, but only after 1–5 settle | Pure refactor of proven code |

### Phase 1 — Chrome back in flow (seller only, no extraction)

**SHIPPED** as `d0c3bfb`, merged with Phase 2 in one commit per the
recommendation below. `tsc` clean, `eslint` clean (2 pre-existing warnings on
unrelated prefetch effects), `next build` clean. **Not yet device-tested — the
matrix in Verification is still outstanding.**

Two things came up during implementation that this plan had not accounted for:

1. **A third copy of the footer-height guess**, in `MobilePOS.tsx:150` — the
   sticky cart bar was `fixed bottom-[98px]` / `bottom-[66px]`, another
   `useIsIPhonePWA` branch. With `viewport-fit=cover` the footer grows by the
   bottom inset, so on iPhone *Safari* (where `navigator.standalone` is false,
   giving `bottom-[66px]`) the bar would have overlapped the tab nav by ~33px.
   Fixed by moving the bar into the footer slot, where it needs no offset at
   all; `MobilePOS`'s `pb-24` clearance went with it. This is the highest-stakes
   screen in the app, so it's the first thing to check on device.
2. **Tailwind arbitrary values silently drop invalid CSS.**
   `pt-[calc(0.75rem+env(safe-area-inset-top))]` compiles, but CSS `calc`
   requires whitespace around `+`, so the declaration is dropped and the header
   loses its top inset with no error anywhere. Tailwind maps `_` to a space, so
   it must be written `calc(0.75rem_+_env(safe-area-inset-top))`. Verified by
   grepping the built CSS for `padding-top:calc(.75rem + env(...))` rather than
   trusting the build's exit code — worth repeating for any future `env()` work.

Deviations from the plan as written, both deliberate:

- **`select-none` was left on the shell root** rather than scoped to the chrome
  (item 9). It's a behavior change, not a layout one, and bundling it would
  have added a second variable to an already device-test-heavy commit. Also
  genuinely uncertain: this is a touch POS, and allowing long-press selection
  over tappable product cards may be worse than not being able to copy an order
  total. Decide it on its own.
- **`viewportFit: "cover"` was added to seller only, not "both apps."** The
  plan said both; that would be actively wrong, because backoffice still has
  `fixed` chrome and no safe-area handling, so `cover` there would push its tab
  bar under the home indicator. Backoffice gets it in Phase 6, together with
  the in-flow shell.

Found but not acted on: `setOverlay` / `MobileOverlayContext` has **zero
consumers** in seller (grepped `app/**/*.tsx`) — a second dead mechanism
alongside `MobileScrollContext` from item 5. Fold into Phase 3, which is
already touching that area.

- `MobileHeader.tsx:37` — drop `fixed top-0 left-0 right-0 z-40`, add
  `shrink-0`.
- `MobileFooterNav.tsx:27` — drop `fixed bottom-0 left-0 right-0`, add
  `shrink-0`.
- `MobileLayoutClient.tsx:184` — content region becomes
  `flex-1 min-h-0 relative`. The `min-h-0` is mandatory, see Design.
- Delete all four `pt-*` constants (`:152-158`) and every use of them (`:187`,
  `:193`, `:206`).
- Delete `--mobile-footer-h` (`:170`) and the `bottom: var(--mobile-footer-h)`
  on the skeleton (`:194`) and overlay (`:207`) — both become `inset-0`.
- Delete the `isIPhonePWA` branch in `MobileFooterNav.tsx:24`.
- Move the footer CTA / `footerSlot` (`:212-225`) out of the content region and
  into the `<footer>` region alongside the tab nav, per Design. One region,
  one occupant, chosen by route.
- `useIsIPhonePWA` no longer participates in any sizing decision.

Deletes 4 constants + 2 magic pixel values + 1 UA branch + 1 CSS variable, and
adds no machinery in exchange. Fixes the variable-header-height bug in item 1
structurally rather than by tracking it.

**Deliberately deferred to Phase 2, not done here:** the `pb-8` in
`MobileFooterNav.tsx:24` is currently standing in for the iOS home indicator.
Deleting it in Phase 1 without adding `env(safe-area-inset-bottom)` in the same
commit would leave the tab bar under the home indicator on iPhone. Either keep
`pb-8` as a temporary literal through Phase 1 and replace it in Phase 2, or
merge Phases 1 and 2 into one commit. **Recommend merging them** — they're both
small now that measurement is gone, and splitting them creates a commit that is
knowingly broken on the primary target device.

### Phase 1b — Content modes

Small enough to fold into Phase 1, listed separately because it touches the
route table rather than the shell.

- Add `content?: "scroll" | "fill"` to `RouteConfig`
  (`config/navigation.ts:13-26`).
- `<main>` branches on it per Design.
- Convert `/mobile/more/map` to `content: "fill"` and delete its
  `scrollPaddingBottom: "pb-0"` (`:147`). Verify the nested
  `flex-1 overflow-y-auto` in `FeedbackHistory.tsx:332` is now the *only*
  scroll container on that screen.
- Re-evaluate account's `scrollPaddingBottom: "pb-8"` (`:164`) — with the
  footer in flow it's probably just unnecessary. Delete it if so rather than
  translating it.
- Leave the other four `h-full` components alone until each is read
  individually (item 8).

### Phase 1c — `RouteConfig` schema cleanup

Mechanical, no behavior change, but it's the phase that decides whether this
engine is pleasant to extend in a year. Per "Maintainability lives in the route
table" in Design.

- Make every field optional with a default. `isChart`, `inlineHeader`,
  `subPage` stop being typed out on all 33 routes.
- Derive `subPage` from `parent !== null` and delete the field (verified
  redundant across all 33 routes — zero disagreements). Update
  `rootTabSuffixes` (`:314-316`), which currently filters on both.
- Collapse `footerCta` + `footerCtaKey` into one translated key.
- Replace `isChart` with the header variant it actually selects.
- Replace `hideStorePicker` with the absence of a header slot.
- Target shape — a typical route becomes:
  ```ts
  "/mobile/orders/chart": { titleKey: "nav.dailyChart", parent: "/mobile/orders" },
  ```
  from today's six lines.

Do this **after** Phases 1/1b are working, not before — it touches all 33
route entries, and mixing a mechanical 33-route edit into a structural layout
change makes both harder to review and harder to revert independently.

### Phase 2 — Safe areas + stable viewport

**SHIPPED** in the same commit as Phase 1 (`d0c3bfb`).

Only safe once Phase 1 lands, per the earlier revert. **Strongly consider
shipping this as one commit with Phase 1** — see the note at the end of Phase 1.

- Add `viewportFit: "cover"` to the `Viewport` export in `app/layout.tsx`
  (both apps).
- Header gets `padding-top: env(safe-area-inset-top)`, footer gets
  `padding-bottom: env(safe-area-inset-bottom)`. Because the chrome is now
  in-flow, the flex layout absorbs both automatically — the content region
  shrinks by exactly the inset, with no constant to update. This is what
  replaces the deleted `pb-8`.
- Replace `h-dvh` (`:169`) with `100svh`. `svh` is the *smallest* viewport
  height, so it doesn't track the URL bar and the chrome stops shifting during
  scroll. Tradeoff, stated plainly: in a browser tab with the URL bar hidden
  you lose that strip of height rather than reclaiming it. In an installed PWA
  `svh == lvh == dvh`, so there's no cost at all — and the PWA is the primary
  target.
- Add `interactiveWidget: "resizes-content"` to the viewport so the Android
  soft keyboard resizes the layout instead of overlaying the footer CTA.
  Confirmed supported by this project's Next version — `next@16.2.4` types it
  as `'resizes-visual' | 'resizes-content' | 'overlays-content'`
  (`next/dist/lib/metadata/types/extra-types.d.ts:53`). Worth verifying against
  the report/request/expense add forms, which are the keyboard-heavy screens.
- **iOS keyboard is a separate problem** and is not solved by
  `interactiveWidget`, which Safari ignores. iOS doesn't resize the layout
  viewport at all when the keyboard opens, so a footer CTA sits *behind* the
  keyboard. If that turns out to matter on the add-forms, the fix is the
  `visualViewport` API, and it should be its own scoped piece of work — don't
  let it expand Phase 2.

### Phase 3 — Scroll ownership

**SHIPPED** as `579a88f` (scroll memory) and `f87f3ff` (dead overlay slot).
`tsc`, `eslint` and `next build` clean. **Not yet device-tested.**

What shipped, and where it departed from the plan:

- **New `components/useScrollRestoration.ts`** (81 lines) owns the
  `Map<string, number>`, keyed on the real pathname and gated on the
  previously-dead `preserveScroll` flag. Only `/mobile/analytics` opts in
  today, so POS still opens at the top.
- **Saving is explicit, not effect cleanup.** The plan said "saved on
  navigate-away," which is only achievable synchronously: the shell reuses one
  scroll container, so the moment the page unmounts the container collapses and
  the browser clamps `scrollTop` to 0. Any cleanup runs after that and reads 0.
  `handleNavClick` now saves before pushing, while the outgoing page is still
  mounted.
- **Restoring retries; `requestAnimationFrame` alone is not enough.** A page's
  data arrives after its route does, so on the first frame the content is short
  and the saved offset clamps — which is exactly what the old per-page code was
  working around by keying its restore off `summariesData`. The hook re-applies
  on a `ResizeObserver` as content grows, stopping as soon as the offset sticks
  (so it never fights the user mid-scroll) or after 1.2s.
- **`MobileScrollContext` was deleted, not provided.** The plan said to provide
  it, on the assumption its `MobileAnalytics` consumer would stay. Since the
  engine subsumes that consumer and the shell reaches its own container
  directly, providing it would have left a context with zero consumers — the
  same dead surface this phase removes.
- **The store-picker `dataset.scrollY` hack was left alone**, contrary to the
  plan's "fold it in." It works, and it triggers on drawer state rather than
  navigation; merging them means the navigation recorder and the picker
  overwriting each other's saved offset. Revisit only if it actually breaks.
- **Also removed the dead overlay slot** (`f87f3ff`) — `setOverlay` had zero
  consumers, so `overlay` was permanently null and its render branch
  unreachable.

The dead-code finding in item 5 turned out to be worse than recorded: the
restore was dead **three** ways over, not two. Besides the missing provider and
the unread `preserveScroll` flag, `MobileAnalytics.tsx:139` read
`sessionStorage["scroll:<path>"]` — a key **nothing in the codebase ever
wrote** (grepped: two `sessionStorage` references in the whole seller app, both
in that one block, one `getItem` and one `removeItem`). Even with a working
provider it could never have restored anything.

Still not covered: browser/system back does not route through `handleNavClick`
and so saves nothing. Deliberately left to Phase 5 with the rest of history
handling.

### Phase 4 — Real transitions (the actual "feels like Grab" phase)

The highest-value and highest-risk phase.

- Stop unmounting: remove the `!isTransitioning &&` gate at `:189`.
- Wrap navigation in React's `useTransition` — `startTransition(() =>
  router.push(path))` keeps the current screen interactive and on-screen until
  the next one is ready, which is precisely the native behavior. `isPending`
  drives a subtle indicator (a thin top bar), not a full-page skeleton.
- Tab routes are all prefetched already (`:92-100`, `:134-136`), so a tab
  switch should show **no** loading state whatsoever.
- Keep the pulse skeleton only for genuinely-cold subpage loads.
- Optional, evaluate on-device before committing to it: directional slide for
  subpage push/pop. The route table's `parent` chain already tells us whether a
  navigation is a push (deeper) or a pop (to parent), so direction is derivable
  with no new data. This is the detail that most makes it read as native — but
  it's also the easiest thing to make feel cheap and janky.

**Use `document.startViewTransition()`, not an animation library.** This is the
performance answer and it's the reason the slide is worth attempting at all:

- View transitions are driven by the **compositor**, not the main thread. A
  library animating React state re-renders per frame and competes with data
  fetching and hydration — which is exactly how transitions end up janky on a
  mid-range Android. This is the difference between "looks native" and "looks
  like a website pretending."
- No new dependency. Confirmed neither `framer-motion` nor `motion` is in
  `apps/seller/package.json` today; the library route would add one.
- Support is adequate for the target devices — Chrome/Edge/Android Chrome
  111+, Safari/iOS 18+. Feature-detect and fall back to an instant swap:
  ```ts
  if (!document.startViewTransition) { navigate(); return; }
  document.startViewTransition(() => navigate());
  ```
  The fallback is today's behavior minus the skeleton, so unsupported browsers
  are no worse off than now.

**Version constraint, checked — don't reach for the React/Next integration.**
Next 16.2.4 does expose `experimental.viewTransition?: boolean`
(`next/dist/server/config-shared.d.ts:687`), but React's `<ViewTransition>`
component ships only on React's experimental channel. This project is on stable
`react@19.2.5`, whose exports contain no `ViewTransition`
(verified — only `unstable_useCacheRefresh` matches). So the framework-level
integration is **not available without moving to an experimental React build**,
which is not worth doing for this.

Call the browser API directly instead. It's a smaller surface, has no framework
coupling, and won't need rewriting when the React integration eventually
stabilises — at which point switching is opt-in rather than forced.

### Phase 5 — Back gesture and history

Most speculative phase; treat as exploratory.

- Edge-swipe-from-left → navigate to `parent` on subpages. Fills the real gap
  from item 7: standalone iOS PWA users have no back affordance except the
  header button.
- `popstate` handling so Android's system back follows the app's `parent`
  hierarchy rather than raw history order.
- **No prior art to copy here, unlike everywhere else in this task.** The
  Navigation API (`navigation.addEventListener("navigate")`) is the clean
  solution and is Chromium-only — Safari has no equivalent, and Safari is the
  engine for the iOS PWA that actually needs this. So iOS means hand-rolled
  `touchstart`/`touchmove` edge detection, which is bespoke code with real
  failure modes (conflicting with horizontally-scrollable content, with the
  map's pan gesture on `/mobile/more/map`, and with drawer dismissal). Budget
  for it being fiddly, and treat abandoning it as an acceptable outcome.
- Decide whether `packages/utils/navigation.ts`'s global singleton becomes a
  proper context here, or stays as-is. It works; changing it is not required
  for anything above.

### Phase 6 — Extract `packages/shell` (only after 1–5 are proven in seller)

Do **not** start this until the earlier phases have been on a real device.
Extracting first would mean building the abstraction around the magic-number
version and then refactoring it twice.

Per the seam agreed previously:

- **Data stays per app.** Route tables are app-specific and correctly so.
  Share only the `RouteConfig` type and `resolveRoute`.
- **Machinery is shared** — the flex shell and its content modes, scroll
  region and scroll memory, safe-area handling, overlay + footer regions,
  transition state, back handling.
- **Chrome via slots** (`headerSlot={<StorePicker/>}`), never app-identity
  conditionals inside the engine.
- **Take `t` as a prop**, don't import `useT` — backoffice has no i18n.
- Reconcile the `hasHeaderAction` divergence (item 10) in backoffice's favour
  of seller's `!!headerAction`. Note this bug **disappears on its own** once
  backoffice moves to the in-flow shell — there's no `pt-30`/`pt-19` choice
  left to get wrong. Worth flagging as a case where the structural fix retires
  a class of bug rather than a single instance.
- Add the `@source` glob to both apps' `globals.css`.

`MobileOverlayContext` / `MobileFooterSlotContext` are byte-identical and move
across unchanged — free wins.

### Not in scope

- `select-none` scoping (item 9) — one-line fix, fold into whichever phase
  touches the shell div, don't make it its own thing.
- Rebuilding `MobileHeader`'s five-way layout branch
  (`MobileHeader.tsx:40-142`). It's ugly, but it's *presentational* ugly, and
  once the header sizes itself its ugliness no longer causes bugs. Separate
  task if it's ever worth it.
- iOS `visualViewport` keyboard handling (see Phase 2) — only if the add-forms
  actually prove problematic.
- Backoffice gets nothing until Phase 6.

---

## Verification

Device matrix — the previous safe-area attempt was reverted precisely because
one configuration wasn't checked, so this is not optional:

| Config | Why it's in the list |
|---|---|
| iPhone Safari (browser tab) | URL-bar collapse — the `svh` change and the exact case that caused the revert |
| iPhone installed PWA | standalone, no browser chrome; `navigator.standalone === true` path |
| Android Chrome (browser tab) | `overscroll-behavior` + pull-to-refresh interaction |
| Android installed PWA | The case `useIsIPhonePWA` currently gets **wrong** — gesture-nav inset with `standalone === false` |
| Small phone (SE-class) | Tightest vertical budget; where clipping shows first |
| Landscape | Safe-area insets move to left/right; header height changes |

Per phase:

- **Phase 1** — walk every route variant the deleted constants covered:
  a `headerAction` route (`pt-30`, e.g. `/mobile/home/manage/expense`), an
  `inlineHeader` route (`pt-16`, e.g. `/mobile/account`), a plain subpage
  (`pt-27`, e.g. `/mobile/home/manage/open`), and a root tab (`pt-19`, e.g.
  `/mobile/orders`). Confirm the first content card sits correctly under the
  header in each — this is the direct regression surface.
  Then the variability cases from item 1: select a store with a deliberately
  long name and confirm the wrapped header pushes content down instead of
  overlapping it, and check the longest id titles
  (`/mobile/analytics/daily/<id>` → "Detail Ringkasan Hari",
  `/mobile/account/payroll-info/edit` → "Ubah Info Penggajian") at `id` locale
  on a narrow device.
- **Phase 1b** — on `/mobile/more/map`, confirm there is exactly **one**
  scroll container: the feedback list scrolls, the map and search bar stay
  pinned, and the page as a whole does not scroll. Confirm the map still sizes
  to `h-[220px]` and doesn't collapse to zero height (the classic flex-child
  failure when a parent loses its definite height).
- **Phase 1c** — no behavior change, so the check is that nothing moved:
  visit one route of each variant and confirm the header and footer are
  pixel-identical to before the schema change. `tsc --noEmit` carries most of
  the weight here since `mobileRoutes` is `satisfies Record<string,
  RouteConfig>` — a mistyped or dropped field fails the build rather than
  shipping.
- **Phase 2** — the exact scenario that triggered the revert: iOS Safari,
  scroll down so the URL bar collapses, confirm no clipping at the top and no
  chrome jitter. Then the same in the installed PWA. Then the Android forms
  with the keyboard open.
- **Phase 3** — scroll analytics down, switch tabs, come back: position
  restored. Open and close the store picker: position restored (existing
  behavior must not regress). Open POS fresh: **not** restored.
- **Phase 4** — switch between prefetched tabs: no skeleton, no white flash,
  no content blanking. Cold-load a deep subpage: skeleton still appears.
  Throttle to Slow 3G and confirm the transition degrades gracefully rather
  than appearing frozen.
- **Phase 5** — standalone iOS PWA: edge-swipe on a subpage goes to `parent`.
  Android: system back follows the app hierarchy, not raw history, after
  several tab switches.
- **Phase 6** — both apps build; visual diff of both shells against their
  pre-extraction state; the backoffice `"edit"` header action now gets correct
  spacing.

Throughout: `pnpm lint` and `tsc --noEmit` clean for both apps.

---

## Branch strategy

```bash
git checkout -b feat/nav-engine   # off staging
```

Per the explicit ask: this extends `staging` on a disposable branch so a bad
outcome costs nothing. `origin/staging` is in sync with local `staging` at
`1f469ac` (verified — the earlier 4-commit gap was pushed), so the branch point
is a published commit and abandoning the branch strands nothing.

One commit per phase, each with its own device check, so a phase that doesn't
feel right can be dropped with `git revert` without unwinding the ones that do.

---

## Guiding principle

The shell should never ask *what device is this* in order to decide *how tall
something is*. Every layout decision comes either from the browser's own
layout of real elements, or from a value the browser hands us
(`env(safe-area-inset-*)`, `svh`). Device detection stays for behavior, never
for geometry — that's the rule that makes "works on as many devices as
possible" a property of the design rather than a list of special cases to keep
extending.

The corollary, learned while revising this plan: when the fix looks like
"build machinery to track a number," check first whether the number can be
made not to exist. Measuring the fixed chrome would have worked; not needing
to measure it is better.
