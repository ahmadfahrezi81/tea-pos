# Task 057 — Living without prefetch

**Status: running from 2026-08-25. This task carries a revert obligation —
`PREFETCH_DISABLED` in `packages/shell/MobileShell.tsx` must be removed one way
or the other.** Leaving a trial switch in place is how an experiment becomes the
accidental permanent behaviour.

Came out of task 056's boot budget, which was the first time anyone counted what
an open actually costs.

---

## Why it was worth trying

The budget put a seller open at **7 proxy runs**: one navigation and six
prefetches, each re-running the proxy's auth round trip and its live `users`
read. `MobileShell` already keeps them off the critical path — gated on `ready`,
scheduled in an idle callback — but off the critical path is not free.

Against that cost, the benefit looked thinner the closer it was read:

- **Every root tab in both apps is a client component behind a thin RSC shell.**
  `home/pos`, `orders`, `analytics`, `more` in seller are five-line files that
  import a `"use client"` component. The prefetched RSC payload is nearly empty;
  what actually helps is the route's JS chunk, and that is cached by the browser
  and the service worker anyway.
- **Neither app sets `experimental.staleTimes`.** On the default a prefetched
  *dynamic* route is stale on arrival, so the tap refetches regardless — which
  would make the RSC half of the trade worth precisely nothing.

That last point is a claim, not a measurement, and it is the main thing this
experiment settles.

## What was changed

- `PREFETCH_DISABLED = true` in `packages/shell/MobileShell.tsx`, one guard at
  the top of the prefetch effect. Both apps, one line to flip back.
- **The current route is now skipped** when prefetching is on. Every open landed
  on a route that then prefetched itself — the single most expensive entry in
  both tables, bought for nothing. This is a keeper regardless of how the
  experiment ends.
- **`prefetch: true` removed from the three `ComingSoon` placeholders**: seller
  `chats`, backoffice `supply` and `chats`. Warming a placeholder costs a full
  proxy run to render nothing. Also a keeper.

Declared prefetch routes: seller 6 → 5, backoffice 5 → 3. With the
current-route skip, that is 4 and 2 actual — so 5 and 3 proxy runs per open when
prefetching returns, against 7 and 6 before.

## What to feel for

A tab switch is now one round trip rather than instant. It should not blank:
navigation runs in a transition, so the previous screen stays up and the tab
lights immediately, with the pending bar appearing after 200ms.

The question is whether that reads as *responsive* or as *laggy*. If it is
indistinguishable, prefetching was paying six proxy runs for nothing and should
stay off.

## How it ends

One of two ways, and the switch is deleted either way:

- **Keep it off** — delete `PREFETCH_DISABLED` and the `prefetchPaths` plumbing,
  and drop `prefetch` from `RouteConfig` in `packages/shell/routes.ts` and both
  route tables.
- **Turn it back on** — delete the constant and its guard, keep the current-route
  skip and the placeholder removals, and update the boot budget in `CLAUDE.md`
  to 5 and 3.

If the answer is "sometimes", the honest fix is `experimental.staleTimes`, not a
longer prefetch list: a prefetch the router throws away before you tap is not a
prefetch.
