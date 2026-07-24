# Task 037 — Seller App Active CPU Reduction (Vercel Hobby cap)

**Status: Confirmed urgent, scope locked, not yet implementing.** Vercel
dashboard data confirms the account is at/over the Hobby Active CPU cap
*right now*. Full investigation produced a ranked list of 8 candidate
fixes (see below); **scope for this task is locked to the top 3** —
middleware, `/api/orders` + `MobileOrders.tsx`, and `/api/sessions/gate`.
Items 4-8 are documented but explicitly parked, not in scope for this
round.

(Renamed from `037_middleware-auth-cpu-optimization.md` — original name
undersold the scope once the orders and gate work were folded in.)

## Confirmed via Vercel dashboard (real data, 2026-07-05)

Pulled directly from Vercel's Observability/Usage pages (Hobby plan, no
custom date ranges or per-route duration breakdown available — locked
behind Pro).

- **Total Fluid Active CPU this billing cycle: 4h 0m 52s / 4h cap.** At/over
  the limit right now, not approaching it. This is the headline: the
  problem is confirmed real, not hypothetical.
- **By project:** `tea-pos` (seller app) = 3h 52m (**96.7%** of total
  usage). `tea-pos-backoffice` = 7m 53s (3.3%). Cross-checks against the
  by-type split (function 2h23m + middleware 1h28m = 3h51m) — consistent,
  same underlying data. **Backoffice is not part of this problem at all**
  — everything worth fixing is in the seller app.
- **Middleware invocations, last 12h: 5.1K total, 4.4K from `tea-pos`.**
  Extrapolated monthly: ~264,000 middleware runs/month for the seller app
  alone. Cross-referencing against the 30-day middleware Active CPU total
  (1h28m = 5,280s): **~20ms average Active CPU per middleware run.**
- **Full 12h per-route table matches the earlier sample almost exactly**
  (gate 553/27s, orders 489/19s, mobile/orders 610/14s, home/pos 626/10s,
  day-activity 186/9s, mobile/analytics 497/6s, summaries 95/6s, flags
  172/6s, stores 112/6s, mobile/more 476/6s, mobile/chats 436/5s,
  summaries/[id]/users 212/4.66s, `/_not-found` 189/4.63s, products
  85/3.91s, `/` 43/3.3s) — confirms the original 12h sample wasn't a fluke.
- **Cold start: 1.4%.** Not a cost driver, ruled out.
- **CPU Throttle P75: 12.9%.** A meaningful chunk of requests are hitting
  Fluid's CPU throttling at the 75th percentile — worth knowing, not yet
  investigated further.
- **Error rate: <0.1%, one brief spike (~4%) near the end of the 12h
  window.** Likely a deploy blip, not urgent.

## Priority ranking — full list, most urgent to most optional

Ranked by monthly Active CPU at stake and whether the win is "cheap call,
hammered a lot" (fix by reducing volume/per-call cost uniformly) vs
"expensive call, moderate volume" (fix by redesigning what the call does).

| # | Item | Monthly cost | Shape of the problem | In scope? |
|---|---|---|---|---|
| 1 | Middleware (`proxy.ts`) | ~88 min (38.1%) | Cheap per call (~20ms), hammered ~264K times/month. Highest-leverage single fix — one file affects all of it. | **Yes** |
| 2 | `/api/orders` + `/mobile/orders` | ~33 min combined | Normal call volume, each call doing too much work (unbounded multi-join fetch + redundant client-side aggregation). Also a correctness risk: Supabase's 1000-row cap. | **Yes** |
| 3 | `/api/sessions/gate` | ~27 min | Highest single function-route cost, unexamined since task 036's avatar fix. High volume (576 calls/12h) but unknown whether remaining ~47ms/call is inherent or fixable. | **Yes** |
| 4 | `/api/flags` | ~6 min ceiling | Suspiciously expensive (~36ms/call) for what should be a trivial flag read — likely an easy, high-confidence win despite low ceiling. | Parked |
| 5 | `/api/activity-logs/day-activity` | ~9 min ceiling | Known per-photo `signUrl()` loop (`Promise.all`-wrapped, N+1-shaped not a true stall). Batchable. | Parked |
| 6 | `/api/stores` | ~6 min | Already fixed once in task 036 (tenant-filter bug); current cost is post-fix. Only worth revisiting if still disproportionate later. | Parked |
| 7 | `/_not-found` | ~5 min | Not a perf task — 189 hits/12h to a missing route is a "why" question (dead link / stale PWA cache), not a CPU-tuning target. | Parked |
| 8 | Light cluster (`mobile/analytics`, `mobile/more`, `mobile/chats`, `summaries/[id]/users`) | 5-6 min each | Already cheap (6-12ms/call) at moderate volume. Lowest priority, likely diminishing returns. | Parked |

**Decision: doing #1, #2, #3 only.** Everything else stays documented here
for later, not touched in this pass.

---

## #1 — Middleware (`apps/seller/proxy.ts`)

Matcher: `["/:tenantSlug/mobile/:path*", "/:tenantSlug/mobile", "/login"]` —
confirmed API routes are **not** in the matcher, so this cost is 100% page
navigations, separate from `/api/*` function CPU.

Per request, current code does:
1. `supabase.auth.getUser()` — network round-trip to Supabase Auth server to
   check the session hasn't been revoked. Runs unconditionally.
2. Tenant slug → tenant ID lookup (`tenants` table), in parallel with #1.
3. If a user is resolved: role lookup (`users` table) — unconditional, every
   request.
4. Tenant membership check (`user_tenant_assignments`) — **only** on
   tenant-access-cookie miss (`x-tenant-access`, 1h TTL). Already cached
   correctly.

**1a. Tenant slug→id lookup — DONE.**
Implemented in `proxy.ts`: `x-tenant-id` cookie now stores `slug:id`
(mirroring the `x-tenant-access` key shape). On each request, if the
cookie's slug matches the current `tenantSlug`, the `tenants` query is
skipped entirely and the id is read straight from the cookie; the cookie
is still re-set on a cache hit for a rolling 24h TTL (same pattern as
`x-tenant-access`). Query only runs on cache miss (first visit, expired
cookie, or a different tenant slug). `tsc --noEmit` clean.

Bonus correctness fix as a side effect: the old fallback
(`tenantResult.data?.id ?? cookie value ?? null`) could serve a stale
tenant id from a *different* tenant if the query failed while a cookie
from a previously-visited slug was still present — no slug check existed.
Now a mismatched/failed lookup correctly resolves to `null` (→
`tenant-not-found`) instead of silently reusing the wrong tenant's id.

**1b. `auth.getUser()` vs `getClaims()` — RESOLVED, not viable, skipping.**
`proxy.ts:109`. `getUser()` makes a live network call to Supabase's Auth
server on every request specifically to confirm the token hasn't been
revoked. `@supabase/supabase-js` is on `^2.99.2`, which supports
`getClaims()` — in theory, verifies the JWT signature locally (via cached
JWKS), no network round-trip.

**Killed by a hard SDK constraint, not a judgment call.** Confirmed via the
installed SDK's own type definitions (`@supabase/auth-js@2.99.2`,
`GoTrueClient.d.ts`): *"If the project is not using an asymmetric JWT
signing key (like ECC or RSA) it always sends a request to the Auth server
(similar to `getUser()`) to verify the JWT."* User confirmed this project
is on **legacy JWT signing** (shared secret / HS256), not asymmetric keys —
so `getClaims()` would silently fall back to the exact same network call as
`getUser()`. Zero CPU benefit, so the security tradeoff (delayed revocation
— see below) isn't even worth accepting. Not implementing.

Only worth revisiting if the Supabase project ever migrates to asymmetric
signing keys — a separate, bigger project-level decision (affects all
existing sessions and anything else trusting these tokens), not a quick
follow-up. Full writeup saved by the user to Notion as a fire-starter for
that scenario.

**Recalibrated by real data before the above was discovered, kept for
context:** derived average Active CPU per middleware run is only ~20ms —
cheaper per-call than originally assumed. This isn't one expensive
operation happening a moderate number of times; it's a modest cost
happening at enormous volume (~264K calls/month). Moot now since this
lever isn't available, but relevant if the asymmetric-key migration ever
happens and this gets revisited.

**Side finding kept for the record:** `supabase.auth.signOut()` in
`apps/seller/app/api/auth/signout/route.ts` is called with no scope option
— Supabase's default scope is `global`, meaning "sign out" already logs out
*every* device for that user today, not just the current one. Relevant
context if `getClaims()` is ever revisited: it would delay (not eliminate)
that all-devices-drop behavior for every device except the one that
clicked "sign out," bounded by the access token's TTL instead of instant.

**1c. Role lookup — confirmed off-limits, do not cache.**
`proxy.ts:140-148`, comment: "Always fetch fresh from DB — role changes must
take effect immediately." Checked git history: commit `635bdce` ("fix tenant
blocking logic", 2026-05-13) *removed* a cached-role-from-cookie shortcut on
purpose, because it let a demoted/blocked user keep their stale role until
the cookie naturally expired. Caching this again reopens that exact bug.
Leave as-is.

---

## #2 — `/api/orders` + `MobileOrders.tsx`

Root cause is architectural, not a one-line fix — one query is being asked
to serve three different needs, and it's shaped for the most expensive one.

**`listOrders()` (`packages/services/orders.ts:29-56`)** has no pagination
at all — no `.limit()`, no `.range()`. For the selected date it fetches
*every* order for the store/tenant, each one deep-joined:
`*, stores(name), users(full_name), store_order_items(*, tenant_products(name))`.
Unbounded, and it's the exact shape that would eventually hit Supabase's
1000-row cap on a busy day.

**`MobileOrders.tsx` (`apps/seller/app/[tenantSlug]/mobile/orders/_components/MobileOrders.tsx`)**
takes that single fetch and uses it for three different things:
1. Renders **every** order as an always-expanded card (full detail + item
   list, not click-to-expand) — DOM size scales with order count, not with
   what's actually visible (`:214-338`).
2. `summaryStats` (`:94-110`) — re-sums total orders/sales/cups by iterating
   the entire order list client-side.
3. `hourlySales` (`:61-83`) — re-buckets every order's items by hour,
   client-side, to feed the mini chart.

**The bigger win: `store_daily_summaries` already has the summary numbers.**
Confirmed in `packages/services/summaries.ts` and `orders.ts:159-169` —
`total_sales`, `total_orders`, `total_cups` are maintained as running totals
on that table, updated incrementally on every `createOrder()` call. Item #2
above is re-deriving, by fetching and summing every order of the day, a
number that already exists as a single row read. This isn't "fetch less,"
it's "stop fetching a whole table's worth of joined data for 3 numbers that
are already computed."

**The three-way split (decided in discussion, not yet implemented):**

| Piece | Today | Fix |
|---|---|---|
| Summary stats | Sums all orders client-side | Read the `store_daily_summaries` row for that store+date directly — no order fetch needed at all |
| Hourly chart | Iterates full joined order list | Still needs every order of the day (can't paginate a full-day chart), but only needs `created_at` + item quantities — drop the `stores`/`users`/`tenant_products` joins for this query |
| Order detail list | Renders every order, always-expanded, single unbounded fetch | Cursor pagination, since this is the only piece that actually needs the full join and only the top N are usually viewed |

**Offset vs. cursor — decided: cursor (keyset) pagination.**
Reasoning:
- The default view is *today*, which is being actively written to — new
  orders land at the top (`ORDER BY created_at DESC`) while the page is
  open. Offset pagination breaks under concurrent inserts: rows shift by
  however many new orders landed between page fetches, causing skipped or
  duplicated rows. Keyset pagination (`WHERE created_at < cursor ORDER BY
  created_at DESC LIMIT N`) doesn't have this problem — it always walks
  backward from a fixed point regardless of what's inserted above it.
- UX is "scroll for more" (infinite scroll / load-more), not "jump to page
  5" — cursor is the natural fit for the former, offset for the latter,
  and the latter isn't a requirement here.
- Cursor must be a **composite** of `(created_at, id)`, not `created_at`
  alone — two orders in the same store could theoretically land in the same
  instant, and a bare-timestamp cursor would risk a skipped/duplicated row
  at the page boundary. Cheap to add, shouldn't be skipped.

**Missing index, found while checking this.** Grepped
`supabase/migrations/*.sql` for indexes on `store_orders` — only one exists,
on `daily_summary_id`. Nothing on `(store_id, created_at)`, which is exactly
this query's access pattern (`WHERE store_id = ? ORDER BY created_at DESC`).
Worth its own migration regardless of the pagination work, since every
existing call to `listOrders()` is already paying for this sort without an
index backing it.

**IMPLEMENTED, then REVERTED (2026-07-06).** User judged the three-way split
+ cursor pagination too complicated relative to its benefit. All of it was
rolled back:
- `packages/services/orders.ts` `listOrders()` restored to the original
  unbounded, single-query shape (no `cursor`/`limit`, no `nextCursor`).
- `packages/features/orders/schema.ts` — `cursor`/`limit`/`nextCursor`
  additions reverted.
- `apps/seller/app/api/orders/route.ts` reverted to `{ orders: data }`.
- `apps/seller/lib/hooks/orders/useOrdersList.ts` deleted;
  `apps/seller/lib/hooks/orders/useStoreOrders.ts` restored.
- `packages/services/summaries.ts` `getSummaryTotals()` removed;
  `packages/features/summaries/schema.ts`
  (`GetSummaryTotalsQuery`/`SummaryTotalsResponse`) reverted;
  `apps/seller/app/api/summaries/totals/route.ts` and
  `apps/seller/lib/hooks/summaries/useSummaryTotals.ts` deleted;
  `apps/seller/lib/api/summaries.ts` `getTotals()` removed.
- `apps/seller/app/[tenantSlug]/mobile/orders/_components/MobileOrders.tsx`
  restored to its original single-fetch version (`summaryStats`/`hourlySales`
  re-derived client-side again, always-expanded order cards, no
  load-more/infinite-scroll).
- DB index migration `20260705161933_add_store_orders_store_date_index.sql`
  had already been pushed to the remote by the user, so instead of deleting
  it, a new forward migration
  `20260705171042_drop_store_orders_store_date_index.sql` was added
  (`DROP INDEX IF EXISTS store_orders_store_id_created_at_idx`) — not yet
  pushed, developer pushes manually per `CLAUDE.md`.
- `tsc --noEmit` clean after clearing a stale `.next` type cache that still
  referenced the deleted `summaries/totals` route.

**Original implementation notes kept below for context/future reference —
none of this reflects the current code.**

**IMPLEMENTED.** `tsc --noEmit` clean (both apps) and `next build` clean.

**Bonus discovery that simplified the chart piece:** a proper lightweight
hourly-sales aggregation already existed and was already shipped —
`getHourlySales()` (`packages/services/analytics.ts:111-131`), backing
`/api/analytics/hourly-sales` → `analyticsApi.getHourlySales()` →
`useHourlySales()`, used by the full chart page
(`orders/chart/_components/MobileHourlySales.tsx`). It already selects only
`id, created_at, store_order_items(quantity)` — no `stores`/`users`/
`tenant_products` joins — and does the same day-bucketing
`MobileOrders.tsx` was reimplementing client-side from the heavy fetch. No
need to write a new chart query at all — just wire the mini chart to reuse
this existing hook instead of recomputing from `orders`.

**What actually shipped:**
- Migration `20260705161933_add_store_orders_store_date_index.sql` —
  `CREATE INDEX ON store_orders (store_id, created_at)`. Not yet pushed
  (developer pushes manually per `CLAUDE.md`).
- `packages/services/summaries.ts` — new `getSummaryTotals()`: plain
  `store_daily_summaries` row read (`total_sales, total_orders,
  total_cups`) by store+date, `maybeSingle()`, defaults to zeros when no
  summary exists yet for that date.
- `packages/features/summaries/schema.ts` — new `GetSummaryTotalsQuery` /
  `SummaryTotalsResponse`.
- New route `apps/seller/app/api/summaries/totals/route.ts`.
- `apps/seller/lib/api/summaries.ts` — new `summariesApi.getTotals()`.
- New hook `apps/seller/lib/hooks/summaries/useSummaryTotals.ts`.
- `packages/services/orders.ts` — `listOrders()` rewritten: takes optional
  `cursor` + `limit` (default 15), orders by `created_at desc, id desc`,
  applies a composite keyset filter via `.or("created_at.lt.X,and(created_at.eq.X,id.lt.Y)")`
  when a cursor is present, returns `{ orders, nextCursor }` (`nextCursor`
  null once a page comes back short of the limit).
- `packages/features/orders/schema.ts` — `ListOrdersQuery` gained
  `cursor`/`limit`; `OrderListResponse` gained `nextCursor`.
- `apps/seller/app/api/orders/route.ts` — passes the new response shape
  straight through (`buildParams`/`apiFetch` in the api client already
  handled the new query params generically, no changes needed there).
- New hook `apps/seller/lib/hooks/orders/useOrdersList.ts` — wraps
  `swr/infinite`. Had to explicitly reset `size` back to 1 on a
  `storeId`/`date` change via a ref + effect — `useSWRInfinite`'s page
  count is local hook state, not tied to the query identity, so without
  this, switching the date picker would keep re-fetching however many
  pages were loaded for the *previous* date.
- Deleted `useStoreOrders.ts` (sole caller was `MobileOrders.tsx`, fully
  replaced by the three hooks below).
- `MobileOrders.tsx` — now three independent data sources: summary card →
  `useSummaryTotals`, mini chart → `useHourlySales` (reused, see above),
  order list → `useOrdersList` with a "load more" button. Order numbering
  (`Order #N`) now derived from `summaryTotals.totalOrders - index` instead
  of `orders.length - index`, since the loaded list is now a subset, not
  the whole day.
- Added `orders.loadMore` / `orders.loadingMore` i18n keys (en + id).

**Not verified — needs a live smoke test.** Same limitation as task 036:
this is behind Google OAuth login, not drivable in this environment. The
composite-cursor `.or()` filter syntax is standard PostgREST keyset
pagination and typechecks/builds clean, but hasn't been run against live
data. After deploy, please check: orders tab loads today's orders, "load
more" fetches older orders without duplicates/gaps, order numbers are
sequential and match the summary's total, switching the date picker
resets the list (not stuck mid-pagination from the previous date), and the
mini chart still renders correctly.

**Found, not fixed — separate dead code, out of scope:**
`apps/seller/app/api/orders/list/route.ts` (`GET /api/orders/list`) has no
callers anywhere in the seller app (no api client, no hook, no component —
confirmed by grep, only appears in Next.js's auto-generated `.next/types`
files). It's an even heavier, unbounded, multi-store query than the old
`listOrders()`. Zero Active CPU cost today since it's never invoked
(matches the 12h route table — it doesn't appear at all), so not touched
here per the "1, 2, 3 only" scope — but worth a cleanup pass later,
similar to task 035's dead-code find.

---

## #3 — `/api/sessions/gate`

**Re-checked against current code — corrects an earlier guess.**
`GET /api/sessions/gate` (`apps/seller/app/api/sessions/gate/route.ts`) is a
thin wrapper: `getCurrentTenantId()` (cookie read only, no DB/network —
confirmed in `packages/utils/server-config/tenant.ts`, cheap) + a Zod parse
+ one call to `getStoreGateState()`. All the cost lives in that one
function.

**`getStoreGateState()` (`packages/services/sessions.ts:18-53`) does three
sequential DB round trips, not two:**
1. `store_daily_summaries` — `id, closed_at` by store+tenant+date.
2. `store_sessions` — **full row (`select("*")`)**, by store+tenant+status.
   Only reached if a summary exists and isn't closed.
3. `users` — `full_name, avatar_url`, by the session's `user_id`. Only
   reached if an active session exists.

Task 036 only touched query #3 (replacing `auth.admin.getUserById()` with
this plain column read). Query #1 was never mentioned in that doc or the
original task-037 writeup — it's a genuine third round trip that's been
there all along, undocumented until now.

**Why they're sequential, and what's actually fixable:**
The early-return gate logic (`no_summary` → stop, `closed` → stop,
`no_session` → stop) means #2 depends on knowing #1 succeeded, and #3
depends on #2 returning a session. Fully parallelizing all three isn't free
— it would mean firing #2 and #3 speculatively before knowing they're
needed, which trades a small amount of wasted query volume for lower
wall-clock latency. Since Active CPU is billed on CPU-seconds actually
spent, not wall-clock wait, this reordering mostly buys latency, not CPU —
worth doing for UX but shouldn't be oversold as a CPU fix.
Two things that *are* real CPU-relevant trims:
- Query #2 selects `*` (full `store_sessions` row) when the route only
  reads a handful of fields downstream — scope the select.
- Confirm whether all three queries are truly necessary per call, or
  whether #1 (`store_daily_summaries` lookup) could piggyback on data the
  caller already has in some call paths (not yet checked).

**Related precedent, useful for item #2:** `packages/services/summaries.ts`
has `seedTotalsFromOrders()` / `fetchOrdersForDate()`, which already fetches
`store_orders` with a deliberately light select — `id, total_amount,
created_at, store_order_items(quantity, total_price,
tenant_products(name))`, no `stores`/`users` joins. It's only called from
`sessions.ts:144` (a session-resume edge case, not the hot gate path, so it
isn't part of this route's cost) — but it's a working, already-shipped
example of exactly the "drop the joins you don't need" pattern proposed for
item #2's chart query. Worth copying its shape rather than inventing a new
one.

**Still to do when this item is picked up:**
- Decide whether query #1's early-return logic is worth restructuring for
  latency (not CPU) — likely low priority given the CPU-vs-wall-clock
  distinction above.
- Trim query #2's `select("*")` to only the fields `getStoreGateState()`'s
  return shape actually uses.
- Check `useSession()` (`apps/seller/lib/hooks/sessions/useSession.ts`) —
  confirmed `revalidateOnFocus: true`, `refreshInterval: 30000` and
  `dedupingInterval: 10000` only when realtime is disconnected (`Infinity`,
  i.e. no polling, when connected). Worth confirming how often realtime is
  actually disconnected in practice — if it's frequently down, the 30s
  polling fallback could be a meaningful chunk of the 576 calls/12h,
  independent of what each call costs.

---

## Parked (documented, not in scope for this pass)

**`/api/flags`** (168-172 calls/12h, ~6s, ~36ms/call) — surprisingly
expensive for what should be a simple flag read. Not inspected yet.

**`/api/activity-logs/day-activity`** (183-186 calls/12h, ~8-9s) — already
flagged in task 036 as doing a per-photo `signUrl()` loop
(`Promise.all`-wrapped, N+1-*shaped* rather than a true serial stall).
Batching candidate.

**`/api/stores`** (108-112 calls/12h, ~5-6s) — tenant-filter bug already
fixed in task 036; this is the post-fix cost. Only worth a second look if
still disproportionate after #1-#3 land.

**`/_not-found`** (189 calls/12h, ~4.6s) — not a CPU-tuning target, a "why
are we getting this many 404s" question. Possible dead link or stale
PWA-cached route. Cheap to check whenever someone has a spare 10 minutes.

**Light cluster** — `mobile/analytics`, `mobile/more`, `mobile/chats`,
`/api/summaries/[summaryId]/users` (5-6 min/month each, already
6-12ms/call) — already cheap at moderate volume. Lowest priority.

## Next steps

1. ~~Implement 1a (tenant-slug caching)~~ — **DONE**, `tsc --noEmit` clean.
2. ~~Decide on 1b (`getClaims()` vs `getUser()`)~~ — **RESOLVED, not
   viable** (legacy JWT signing on this project, no CPU benefit available).
   **Item #1 (middleware) is now closed out** — 1a shipped, 1b ruled out,
   1c confirmed off-limits. Nothing further to do here unless the project
   migrates to asymmetric JWT signing keys someday.
3. ~~Implement the `/api/orders` three-way split + cursor pagination +
   missing index~~ — implemented, then **REVERTED (2026-07-06)** as too
   complicated for the benefit. Code is back to the original single unbounded
   query; a follow-up migration drops the index (not yet pushed). Item #2 is
   back to "not started" if revisited later — see revert note above for what
   was tried and undone.
4. Investigate `/api/sessions/gate` (item #3) fresh, post task-036 fix —
   already have a head start (see the three-sequential-queries finding
   above). **Up next.**
5. Parked items stay documented above; revisit only after #3 ships and a
   fresh measurement window shows what's left.

## Guiding principle for this task

This task isn't just chasing individual slow routes — it's about fetching
and rendering being **cleaner and more thought-out** by design: fetch only
the shape of data a given piece of UI actually needs (not the maximal shape
because it's convenient to share one query), prefer reading a value that's
already computed over re-deriving it, and paginate anything whose UI only
ever shows a bounded window regardless of how much data exists.
