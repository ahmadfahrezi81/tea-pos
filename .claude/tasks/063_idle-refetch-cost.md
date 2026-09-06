# Task 063 — What idle tabs cost, and the four hooks that cause it

**Status: items 1 and 4 already shipped; items 2 and 3 done here 2026-09-05.**
Successor to 060, and the first task in this series that is explicitly *not*
about latency.

| Item | Hook | Apps | State |
|---|---|---|---|
| 1 — gate poll runs unconditionally | `useSession` | seller | **Shipped** in task 062, on `staging`, unmerged |
| 2 — weather refetches on every focus | `useWeather` | **both** | **Done here** |
| 3 — feedback refetches on every focus | `useCustomerFeedbacks` | **both** | **Done here** |
| 4 — store list refetched after being seeded | `useStores` | seller | **Already shipped.** 060 records it as unbuilt; the file disagrees |

**Items 2 and 3 exist twice.** `useWeather` and `useCustomerFeedbacks` are
duplicated verbatim in `apps/backoffice/lib/hooks/`, with the same settings and
the same consumers (`MoreMenu`, `FeedbackHistory`). Both copies are fixed. The
first pass of this task changed only seller and had to be caught in review —
worth remembering that CLAUDE.md's "update both apps" rule covers hooks, not
just `proxy.ts`.

`useStores` is **not** duplicated in the same sense and needs no change in
backoffice: that app has no `fallback` on its `SWRConfig` (`app/layout.tsx:77`),
so nothing seeds the cache and `revalidateIfStale` never fires a second fetch.
Its 300s dedupe is already the right answer there.

---

## What this task is

A cost cleanup. It buys headroom under a small free-tier cap. **It is not
performance work and it will not make the app feel faster**, and the reason to
write that down is that this series has spent three tasks (037, 044, 060) on a
metric that reads like a speed metric and is not one.

**Fluid Active CPU excludes time spent waiting on I/O.** So the proxy's
`auth.getUser()` round trip, its live `users` read, and the layout's two
`unstable_cache` reads are all close to free on the metric while being most of
what a user actually waits for. The inverse also holds, and it is what this task
is about: a background refetch on a phone in someone's apron pocket costs real
CPU and costs the user nothing.

Everything below is in the second category. None of it is on an interaction
path.

## Why it was worth doing anyway

Measured 2026-09-05 from the Vercel usage chart, Aug 5 – Sep 5:

- 2h14m of a 4h monthly allowance, with ~5 internal users.
- Spike days (8m50s) correlate with **commit count**, not deploys — Aug 27 shipped
  a release and produced no spike at all. The spikes are hands-on testing days.
- The **Type** tab splits it `function` 68.8% / `middleware` 31.2%. A third of
  the bill is `proxy.ts`, which neither 044 nor 060 ever tabulated.
- The middleware band visibly thins after 2026-08-25 — `a12afae`, the commit that
  disabled prefetching. That remains the largest CPU win in the series.

Modelled cost of one active seller-day, from 060's `ms/inv` table and a 10-hour
shift:

```
gate poll, every 30s, all shift   1200 × 43ms = 51.6s   ← 65%
page navigations, ~200 taps        200 × ~93ms = 18.6s
orders, ~60                         60 × 52ms  =  3.1s
cold opens, ~5                       5 × 480ms =  2.4s
summaries / analytics views        ~40 × 60ms  =  2.4s
                                                ≈ 78s
```

Observed quiet-day bars are ~2m30s–3m30s for five users, so the model runs about
2× high — phones lock, the PWA suspends background timers, tabs close. **Call it
~35s per active seller-day, of which the gate poll is roughly two thirds.**

After item 1, that should fall to **~12–15s.**

### The scaling question this answers, so it stops being re-asked

At ~15s/seller-day the cost per seller per month is **$0.46 at 100 sellers,
$0.23 at 500, $0.26 at 5,000** — it falls with scale. The architecture is
cost-efficient well past any near-term number and nothing here is a scaling
risk.

The one lumpy thing in the whole stack is **Supabase Pro → Team, $25 → $599**,
triggered by realtime concurrent connections somewhere around 500. That is a
plan limit, not an architectural one, and the cheapest dodge is to stop holding a
channel for every idle seller — connect while the POS screen is open, drop it
otherwise. Worth building into `SupabaseRealtimeAdapter` while task 062 is fresh.

Self-hosting does not become cheaper until roughly **25,000–40,000 sellers**,
once the person who runs Postgres is counted. Below that it raises cost per user.

## Do this

### Item 1 — the gate poll (shipped in 062, unmerged)

`refreshInterval: isConnected ? Infinity : 30000` polled unconditionally,
because `isConnected` was hardwired false by the adapter bug, and `Infinity` is
not SWR's off switch anyway. Fixed to `isConnected ? 0 : 30000` alongside the
adapter rewrite.

**This is the only item that also improves UX** — realtime pushes replace a
delay of up to 30s. Every other item is invisible to the user by design.

`revalidateOnFocus` stays on. 060 and 062 both argued it: nothing server-side
rejects an order from a seller whose session has moved on, and payroll attributes
orders inside session windows, so a stale gate means cups that pay nobody.

### Item 2 — `useWeather` refetched on every focus

`revalidateOnFocus: true` *and* `refreshInterval: 20 * 60 * 1000`. The interval
is the right mechanism; the focus revalidation is duplicate work on the hottest
screen in the app — `WeatherDrawer` sits on `home/pos`, the boot landing, and
`Manage.tsx` reads it too. Every wake of every phone fired it.

Removed. `revalidateOnReconnect` stays: coming back from no signal is a real
reason to refetch, and it is rare.

**Costs nothing.** `weather_hourly` is a cached forecast table with hourly
granularity; 20 minutes of staleness is not observable.

### Item 3 — `useCustomerFeedbacks` refetched on every focus

`revalidateOnFocus: true, dedupingInterval: 10_000` on a history list.

Dropped the focus revalidation, raised the dedupe to 60s.

**Small win, honestly.** Its only consumer is `FeedbackHistory` on
`more/map` — a buried screen, and the hook never appeared in 060's top sixteen.
Taken because it is the same mistake as item 2 and costs one line, not because
the number matters.

### Item 4 — `useStores` (already shipped)

060 Item 1 lists this as unbuilt. It is built: `useStores` already carries
`revalidateIfStale: false` with a doc comment explaining that `BootFallback`
seeds the cache and SWR's initial-fetch decision is
`isUndefined(data) || revalidateIfStale`. Nothing to do. **Correct 060 rather
than re-implementing it.**

## Verification

1. Open the app, background it, foreground it. `/api/weather` and
   `/api/customer-feedbacks` must **not** fire. `/api/sessions/gate` must, and
   that is deliberate.
2. Leave a tab open for ten minutes with realtime connected. `/api/sessions/gate`
   must fire **zero** times, not twenty. This is item 1's real test and it needs
   the adapter fix deployed.
3. Weather still refreshes: wait past 20 minutes, or toggle airplane mode to
   trigger `revalidateOnReconnect`.
4. **Read the scoreboard after a full window and record the window length.**
   Three readings have now failed to do this. Expect `/api/sessions/gate` to fall
   sharply and weather to leave the board; expect nothing else to move.

## What would make me stop

- **`/api/sessions/gate` invocations unchanged after item 1 deploys.** Then
  realtime is not connecting in production even with the adapter fixed, and the
  polling was load-bearing rather than accidental. Find out why before removing
  any other fallback.
- **The bill not moving at all.** Then idle refetching was never the cost, the
  spike days really are just hands-on testing, and the remaining 31% middleware
  plus the 63ms `home/pos` document render are the whole story — which is task
  061, not this file.

## Not in scope, deliberately

- **`revalidateOnFocus` on `useSession`.** Bought and paid for; see item 1.
- **Anything in `proxy.ts`.** It is 31% of the bill and its expensive parts are
  network waits that this metric does not bill. Fewer proxy invocations is the
  only lever, and prefetch-off already took the big cut — see task 057.
- **Task 061.** The one change that makes the app faster *and* cheaper, because
  it removes server renders rather than shaving them. Still gated on reading
  `[render-metrics]`, which has now been shipped and unread since 5.4.14.
