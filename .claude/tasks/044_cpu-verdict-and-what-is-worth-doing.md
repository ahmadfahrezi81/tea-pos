# Task 044 — The CPU verdict, and what is actually worth doing

**Status, 2026-08-09.** All three items written. Nothing on production yet.

| Item | Staging | Production |
|---|---|---|
| **1** · `daily_summary_id` on logs | ✅ migrated, deployed, timeline verified | ❌ nothing pushed |
| **2** · `store_orders` index | ✅ migrated, verified | ❌ not pushed |
| **3** · `/api/products` 6h cache | ✅ deployed, cache confirmed | ❌ not deployed |

Item 1 in detail — steps 1–4 done, step 5 (lazy photo signing) skipped as
optional and not in the way. Shipped as `e43f94b`…`7d5ab92` on `staging`.

**How Item 3 was verified**, since it is the one that is invisible from
outside: `unstable_cache` sits between the route and Supabase, so a hit and a
miss return byte-identical responses and `x-vercel-cache` reports only the CDN.
The signal is query count on the Postgres side —
`select calls from pg_stat_statements where query ilike '%tenant_products%'`,
then hammer the endpoint and re-read. Six requests moved it **28 → 28**. Zero
Postgres queries, cache already warm.

**Everything remaining is the production rollout**, and it has an ordering
requirement: `0db6630` reads `daily_summary_id`, so deploying the app before
pushing the migration empties the day-activity timeline for every historical
day. See *Deploying Item 1 to production*. **The staging numbers do not
transfer** — different database, ~11× the history.

Verified on staging: 0 typecheck errors both apps, lint at baseline (seller 23 /
backoffice 5, checked against a stashed HEAD), `pnpm build` green.

Successor to 041. Decides what happens to 043 — short version, most of it does
not happen.

**041 worked, for a reason none of its phases predicted.** The phases that
removed a database round-trip moved the number. The phases that reshaped a
payload moved nothing at all. Everything below follows from that.

---

## Do this

| # | Item | Why | Size |
|---|---|---|---|
| 1 | `daily_summary_id` on `tenant_activity_logs` | Removes 7 of `getDayActivity`'s 10 queries, deletes a URL-length ceiling, kills a dead code path | migration + backfill + service |
| 2 | Index on `store_orders (store_id, created_at)` | There is **no `store_id` index at all** — five call sites sequential-scan the table. Postgres budget, not Vercel | one SQL statement |
| 3 | Cache `/api/products`, 6h TTL | 72ms × 69 on a menu that changes twice a year | a few lines |

Item 1 is the only one with a real diff. Items 2 and 3 are close to free.

**Do not** touch `/api/orders` — see *Not doing*.

---

## Why — the measurement

041's baseline was a 12h window on 2026-08-04. The new reading is 2026-08-09,
**window length unrecorded**, with invocations up ~41%. So compare `ms/inv`
only; that is window-independent. Absolute CPU totals across the two readings
are not comparable and nothing here rests on them.

| Route | Aug 4 | Aug 9 | Δ | What 041 did to it |
|---|---|---|---|---|
| `/api/stores` | 140ms | **60ms** | −57% | Phase 5 — deleted a whole query |
| `/api/sessions/gate` | 57ms | **41ms** | −28% | Phase 4 — 3 round-trips → 2 |
| `/api/activity-logs/day-activity` | 95ms | 66ms | −31% | **nothing** |
| `/api/flags` | 75ms | 61ms | −19% | Phase 1 — singleton clients |
| `/api/orders` | 54ms | 49ms | −9% | Phase 3 — 90 rows → 25, dropped a join |
| `/api/products` | 72ms | **72ms** | **0%** | Phase 2 — narrowed select |
| `/api/summaries` | 51ms | **57ms** | **+12%** | Phase 2 — narrowed select |
| `/api/summaries/[id]/users` | 35ms | 44ms | +26% | descoped |

### The rule

**Query count is the lever. Payload shape is not.**

The two phases that deleted round-trips took 57% and 28% off. The two that
moved less data and walked it fewer times returned **0% and −12%**. Phase 3
capped 90 rows to 25 and bought 9%, against a predicted 75%.

That kills 041's Finding 2 — "every list endpoint walks its payload four
times", the intellectual centre of that task. `/api/products` is the proof: its
select was aliased, `toCamelKeys` deleted, a dead join removed, and it costs
exactly what it cost before.

**The two halves are not equally supported.** "Payload shape doesn't matter"
has two independent negative results. "Query count is the lever" has **one**
clean point — Phase 4 — because Phase 5 deleted a round-trip *and* a
tenant-sized payload in the same change and cannot separate them. Act on the
negative half with confidence. The positive half is the best available
hypothesis, and Item 1 is its test.

### What it means for 043

**Nothing in 043 helps this number.** Not one of its items removes a
round-trip. Item A is an index — real cost, but Supabase-side and invisible on
this dashboard. Item F rewrites date arithmetic. Items C and E are features.
043 was split out of a CPU task and kept the label; it never deserved it.

So 043 is misfiled rather than useless — and judged on its own terms, most of
it still doesn't earn a slot now. This task takes **Item A only**, for the
Postgres budget. The rest is in *Not doing*.

---

## Confidence

**Read from source, 2026-08-09** — every file, line number and code claim here:
`orders.ts`, `activity-logs.ts`, `products.ts`, `summaries.ts`, the seller
`orders` / `products` / `activity-logs` routes, `useStoreOrders`,
`useCreateOrder`, `useProducts`, `useStoreActivityLogs`, `packages/db/types.ts`,
the migrations listing. Item 1's dead-code claim was traced through all four
layers.

**Not measured, and the weakest links first:**

- **The rule's positive half** — one clean data point. See above.
- **Attribution of any delta to any phase.** Different days, different traffic,
  a CPU column rounded to whole seconds. And `day-activity` moved **31% with
  nobody touching it**, which is the one number here arguing against the
  document's own conclusion. Everything in that table is directional.
- **The ~16KB URL ceiling** (Item 1b). That PostgREST puts `.in()` in the query
  string is behaviour; 16KB is a general proxy figure, not measured against this
  deployment. The argument holds either way — the list grows with orders per day
  and has *some* ceiling — but don't quote 400 orders as the breaking point.
- **Item 3's ~4s saving** assumes a near-total cache hit rate.
- **The backfill SQL has never been executed.** Its *inputs* are measured — the
  pre-flight table in Item 1 is real production data, and the `ref_table` values
  were cross-checked against all 26 `refTable:` literals in `packages/services`
  — but there is no local database, so the statement itself has not been run.
  Review it before pasting.

**One inherited error, corrected:** 041 says `getDayActivity` is "nine queries
→ two". It is **ten**, and the floor is **three** — there is a user-name lookup
neither 041 nor the first draft of this document counted, and it survives the
change. Direction unaffected; any estimate built on "→ two" is not.

---

## Item 1 — `daily_summary_id` on `tenant_activity_logs`

041's Phase 6. The only remaining phase this task's data endorses.

### What it buys

**a. Ten queries → three.** `getDayActivity` (`activity-logs.ts:62-168`)
fetches the summary, fires **seven parallel queries whose only purpose is
collecting child row IDs**, queries the logs with `.in("ref_id", allRefIds)`,
then resolves user names.

Five of those seven preamble queries are literally
`.eq("daily_summary_id", summaryId)` against tables that already carry the
column. `tenant_activity_logs` is the one child table that doesn't — so the
summary→events link is rebuilt from scratch on every request.

Seven go away. Summary, events and the user lookup remain, plus a
`createSignedUrl()` per photo event (step 6, separate concern).

66ms × 136 invocations = 9s, third-largest line in the table.

**b. It deletes a latent hard failure.** That `.in("ref_id", …)` list holds
every order ID for the day, and PostgREST sends it in the **query string** —
~37 chars per UUID, so ~3.3KB at 90 orders and ~15KB at 400. Proxy limits sit
around 16KB. The endpoint has a ceiling that grows with orders per day. Keying
on `daily_summary_id` removes it.

**c. It exposes dead code worth deleting.** `listStoreActivityLogs`
(`activity-logs.ts:17-40`) filters by `store_id` + a `created_at` day range —
the approach 041 rejected for `getDayActivity`, because a store closing
22:00–01:00 logs `store_closed` after midnight UTC+7 and a time range drops it.

So it carries that bug — **but nothing calls it.** `useStoreActivityLogs`
(`lib/hooks/activity-logs/useStoreActivityLogs.ts:8`) is imported by no
component: `AtAGlance.tsx:6` takes `useDayActivityBigEvents`, the events page
takes `useDayActivity`, both hitting `day-activity`. The whole chain — hook →
`activityLogsApi.list` → `GET /api/activity-logs` → service, plus the
`TIMELINE_EVENT_TYPES` const only it uses — is dead end to end.

Corroborated by the route table: `day-activity` shows 136 invocations,
`/api/activity-logs` **doesn't appear at all**.

**This is a deletion, not a fix** — and not a reason to add the column, just
something worth doing while in the file.

**d. It models the relationship that exists.** Every other child of a daily
summary carries `daily_summary_id`. The log table is the exception because it
was written first.

### Pre-flight — measured on **production**, 2026-08-09

The backfill is written to this data rather than to a guess. **Staging is a
different database with roughly a tenth the history** (942 log rows vs 10,453),
so every count here applies to production only — see *Deploying Item 1 to
production*.

| Question | Answer | Consequence |
|---|---|---|
| Rows in `tenant_activity_logs` | **10,453** | Tiny. Backfill runs in ms, no batching |
| `ref_table` values | 14 type/table pairs, **zero nulls** (they sum to 10,453 exactly) | No null-`ref_table` branch needed |
| Orders with null `daily_summary_id` | 361 | All historical — newest is 2026-05-12 |
| …of those, reachable via `(created_at + 7h)::date` | **0** | The date fallback rescues nothing. Statement dropped |
| …of those, that have an `order_created` log | **0** | Logging postdates them. **Every `order_created` log links cleanly** |
| Indexes on `store_orders` | PK + `daily_summary_id` only | See Item 2 — worse than assumed |

**Both traps this document previously warned about are empty.** Orders with no
summary predate activity logging entirely, so no log row depends on them. The
only unrecoverable rows are the two `summary_photo_deleted` events below.

### The one remaining edge — deleted children

`deleteExpense` (`expenses.ts:186`) and `deleteSummaryPhoto`
(`summaries.ts:686`) delete the row and *then* log with `refId` pointing at it,
so no join can recover a summary. In practice: **`expense_deleted` has zero
rows** and `summary_photo_deleted` has **two**.

Not a regression — `getDayActivity` builds `allRefIds` from *live* child rows,
so these events are already filtered out today despite being in
`DAY_ACTIVITY_EVENT_TYPES`. The migration preserves that. Fix later, if ever, by
writing the summary id into `metadata` before the delete.

### Expected result

**422 rows stay null**, all legitimately:

| | Rows | Why |
|---|---|---|
| Payroll events | 409 | No summary by design |
| `customer_feedback_submitted` | 11 | No summary by design |
| `summary_photo_deleted` | 2 | Child row gone |

Everything else — 10,031 rows — links. **Any other type showing a non-zero null
count means something is wrong.**

> `payroll_entry_updated` (39 rows) points at `payroll_entries`, a table that no
> longer exists. Harmless here since payroll events get null anyway, but worth
> knowing it's in there.

### Plan

1. **Column and index.**

   ```sql
   alter table tenant_activity_logs
       add column daily_summary_id uuid references store_daily_summaries(id);

   create index if not exists tenant_activity_logs_tenant_summary_idx
       on tenant_activity_logs (tenant_id, daily_summary_id);
   ```

   Nullable — payroll and customer-feedback events genuinely have no summary.

2. **Backfill, same migration.** One statement.

   Every log row reaches its summary the same way — match `ref_table` + `ref_id`
   against the table it names, and take that row's `daily_summary_id`. For
   `store_daily_summaries` itself the `ref_id` *is* the summary, so it joins to
   its own id. No `is null` guard: the column was created two statements ago and
   is empty by construction.

   ```sql
   update tenant_activity_logs l
   set daily_summary_id = c.summary_id
   from (
       select id, id              as summary_id, 'store_daily_summaries'      as tbl from store_daily_summaries
       union all select id, daily_summary_id, 'store_daily_summary_photos' from store_daily_summary_photos
       union all select id, daily_summary_id, 'store_expenses'             from store_expenses
       union all select id, daily_summary_id, 'store_sessions'             from store_sessions
       union all select id, daily_summary_id, 'store_requests'             from store_requests
       union all select id, daily_summary_id, 'store_reports'              from store_reports
       union all select id, daily_summary_id, 'store_orders'               from store_orders
   ) c
   where l.ref_table  = c.tbl
     and l.ref_id     = c.id
     and c.summary_id is not null;
   ```

   `store_requests` and `store_reports` have **zero** log rows today. The
   branches stay because the services write those types
   (`requests.ts:38`, `reports.ts:38`) and they will appear.

   **Then verify, before step 4 ships:**

   ```sql
   select type,
          count(*) filter (where daily_summary_id is null) as unlinked,
          count(*) as total
   from tenant_activity_logs
   group by type
   order by unlinked desc;
   ```

   Expect **422 unlinked** — payroll 409, customer feedback 11,
   `summary_photo_deleted` 2 — and zero everywhere else. A non-zero count on any
   other type is an event that will vanish from the timeline at step 4.

3. **`createLogger` / `LogContext` gain an optional `dailySummaryId`**, set once
   per calling service exactly as `storeId` is today. Most call sites in
   `sessions.ts`, `summaries.ts`, `expenses.ts`, `orders.ts` already have it in
   scope.

4. **`getDayActivity` becomes three queries** — summary, events, user lookup.
   The seven ID-collecting queries go.

5. **Delete the dead path** (see *c*): the service function,
   `TIMELINE_EVENT_TYPES`, `GET /api/activity-logs`, `activityLogsApi.list`,
   `useStoreActivityLogs`. Separate commit. Re-run the grep at the time rather
   than trusting this note.

6. **Sign photo URLs lazily** on expand, via a small endpoint. Today it is a
   `createSignedUrl()` per photo event whose results usually go unviewed behind
   a collapsed section. Optional — take it only if step 4 leaves it obviously in
   the way.

**Ordering hazard.** Steps 1–3 are additive and safe to push ahead of any app
deploy. **Step 4 must not ship before the backfill has run**, or the timeline
goes silently empty for every historical day.

### Deploying Item 1 to production

Staging proved the code works. It proves nothing about production's data, which
is ~11× larger and has a different history. Run the same gate there:

1. **Push the migration**, then `pnpm types:db`.
2. **Run the post-backfill check** (the query above). Expect **422 unlinked** on
   production — payroll 409, customer feedback 11, `summary_photo_deleted` 2 —
   and zero on everything else.
3. **If any other type is non-zero**, classify it before deploying the app:

   ```sql
   select l.type, l.ref_table,
          case when c.id is null then 'child row missing'
               else 'child exists, its summary is null' end as reason,
          count(*)
   from tenant_activity_logs l
   left join (
       select id, id              as summary_id, 'store_daily_summaries'      as tbl from store_daily_summaries
       union all select id, daily_summary_id, 'store_daily_summary_photos' from store_daily_summary_photos
       union all select id, daily_summary_id, 'store_expenses'             from store_expenses
       union all select id, daily_summary_id, 'store_sessions'             from store_sessions
       union all select id, daily_summary_id, 'store_requests'             from store_requests
       union all select id, daily_summary_id, 'store_reports'              from store_reports
       union all select id, daily_summary_id, 'store_orders'               from store_orders
   ) c on c.tbl = l.ref_table and c.id = l.ref_id
   where l.daily_summary_id is null
   group by 1, 2, 3
   order by 4 desc;
   ```

   **"child row missing" is safe** — `getDayActivity` builds its id list from
   live rows, so those events are already invisible today and nothing is lost.
   **"child exists, its summary is null" is not** — those are on screen now and
   would disappear when the app deploys.

4. **Only then deploy the app.**

> **What staging actually showed**, recorded because it is the shape to expect
> rather than an anomaly: 190 unlinked of 942. 136 legitimate by design, 46
> orphaned by rows deleted during testing, and 8 `order_created` whose orders
> sit on dates with no summary at all (2026-05-13 to 05-15). All already
> invisible; nothing was lost. Production's equivalent 361 summary-less orders
> stop at 2026-05-12 and **none of them have a log row**, so they cost nothing
> there either. Both databases stop in mid-May — whatever made summary creation
> reliable landed then.

---

## Item 2 — the missing index on `store_orders`

```sql
CREATE INDEX IF NOT EXISTS store_orders_store_id_created_at_idx
    ON store_orders (store_id, created_at DESC);
```

**Confirmed against production, 2026-08-09.** `store_orders` has exactly two
indexes:

```
orders_pkey                        btree (id)
store_orders_daily_summary_id_idx  btree (daily_summary_id)
```

**There is no index on `store_id` at all** — not composite, none. `20260705161933`
created one and `20260705171042` dropped it, both reached remote; that pair is
037 fallout.

So every query filtering `tenant_id` + `store_id` + a `created_at` range
**sequential-scans the whole table**, filters, sorts, then applies the limit. The
25-row cap currently saves the serialization of ~65 rows and nothing else —
Postgres still reads and sorts everything first.

**Five call sites use that exact shape:**

| Site | Function |
|---|---|
| `orders.ts:88-94` | `listOrders` |
| `analytics.ts:150-154` | `getHourlySales` |
| `summaries.ts:53-59` | `fetchOrdersForDate` → `seedTotalsFromOrders` |
| `summaries.ts:320-325` | `createSummary` seed |
| `activity-logs.ts:96` | `getDayActivity`'s order query — deleted by Item 1 |

The close recompute and the other summary reads go through `daily_summary_id`,
which *is* indexed. Clean split: summary-keyed reads are covered, date-range
reads are covered by nothing.

Supabase budget, not Vercel — but on this evidence it is the best value in the
task, not a nice-to-have.

Details worth not re-deriving:

- **Name it explicitly.** The July 5 create used a bare `CREATE INDEX ON` and
  let Postgres auto-name it, which is what forced its companion `DROP` to guess.
- **`store_id` leads, not `tenant_id`.** A store belongs to exactly one tenant,
  so `store_id` is already maximally selective; a leading `tenant_id` only adds
  width.
- **`DESC` is cosmetic.** Postgres scans a btree backwards efficiently. It is
  written this way to match the query's intent.
- **Check what exists first:** `SELECT indexname, indexdef FROM pg_indexes WHERE
  tablename = 'store_orders';`
- **`CREATE INDEX CONCURRENTLY`** if a brief write lock during the push matters.
  It cannot run inside a transaction block, so check whether the Supabase
  migration runner wraps statements before relying on it.

Nothing else is added to this table — void columns and `order_number` were both
cut. See *Not doing*.

---

## Item 3 — cache `/api/products`

72ms × 69 invocations = 5s. Unmoved by 041's Phase 2, most expensive non-cron
route on the board, and the menu has not changed in ~6 months.

**Cache the response with a 6h TTL. No purge endpoint.**

The reasoning, because it looks like a gap: **nothing in either active app
writes `tenant_products`.** No POST, PUT or PATCH route exists in seller or
backoffice; `apps/seller/app/api/products/route.ts` is GET-only. Products are
edited directly in the Supabase dashboard, so **no application code runs on an
edit** — there is nothing for `revalidateTag` to fire from.

That looks like an argument for building a purge endpoint. It isn't. One
editor, prices change twice a year, edits happen outside trading hours, and any
TTL that clears overnight means an evening change is live before the first order
of the morning. Building an endpoint to shorten a window nobody is standing in
is work for its own sake.

Two things to know:

- **Compound staleness.** `useProducts` already sets
  `dedupingInterval: 300_000`, so a mounted client holds products 5 minutes
  regardless. Worst case is TTL + 5 min, only for an app left open across the
  boundary. Irrelevant at this change rate.
- **This saves ~4s of a ~98s bill.** Cleanest available win, and small. Take it
  because it is a few lines, not because it matters.

**If products ever gain an edit UI, add `revalidateTag` then.** The TTL is
correct *because* editing is out-of-band; the day that changes, this decision
changes with it.

---

## Not doing

Recorded so they are not re-proposed.

**`/api/orders`, in any form.** The 25-row cap stays exactly as shipped —
reverting working code on a money path is churn with no upside, and the cap
bounds the tail for the one festival day at 400 orders. `Order #N` keeps its
client-side derivation. Phase 3 bought 9%; there is nothing left in that
direction. **Orders is done.**

**Void — the whole thing, columns included.** Planning had it down to
schema-only additions; cut as out of scope. Void is its own project and should
bring its own migration. Adding columns ahead of it buys nothing, and the shape
they force — `voided_at` + `voided_by` + `void_reason`, or a `status` column
that extends toward the approval flow — is better decided by whoever builds the
flow. 043's Item E holds the analysis, including the eight money queries that
must start excluding voided rows and the `store_orders_active` view proposed to
make that durable.

**`order_number`.** Belongs with void, because void is the only thing that
breaks the current derivation. `totals.totalOrders - index`
(`MobileOrders.tsx:84`) is **correct today and stays correct** as long as
nothing removes an order from a day; when one is voided both inputs move and
every number below it silently decrements. Storing the number needs an
atomically incremented counter, which needs an RPC on the order path — for no
user-visible change while the derivation is still right.

Two things the void project inherits: a second counter (`orders_issued`) that
void does **not** decrement, and an `updateSummary` close recompute
(`summaries.ts:414-451`) that **excludes** it, or the generator resets mid-life.
Prefer a numbering-only RPC over 043's whole-create RPC — the latter puts a
single Postgres function between a seller and a sale.

**043 Item F — day boundaries.** Five implementations of "a day", one losing
rows in a one-second window. Real, roughly one store-day in a thousand, no CPU
value, and it touches every order-reading path. If ever taken, take it for
correctness on a quiet week, not as part of a perf batch. (An `appDay` module
was drafted in this session and discarded.)

**041 Phase 7 — page navigations.** Page renders are now 15–26ms, *cheaper per
call than every API route*. It is an invocation-count play with genuine auth and
i18n first-paint risk. The upside is real — it also cuts proxy runs — but it is
the highest-risk item on any board here, and the measurement no longer makes it
urgent.

**More select-narrowing, anywhere.** Returned 0%. The pattern is disproven.

**Anything QRIS.** 043 built several arguments on the QRIS webhook's missing
`daily_summary_id`. The feature is behind `feature-qris`, enabled for QA only,
and has never carried real traffic — no live bug, no history to repair, none of
its couplings apply.

---

## Verification

1. **Build.** `pnpm lint && pnpm build` clean on **both** apps.
   `packages/services` is shared — grep backoffice consumers before changing any
   signature.
2. **Item 1.** Run the post-backfill check and confirm **422 unlinked, nothing
   unexpected** — that is the gate on step 4. Then pick a real close-day that ran
   past midnight and confirm its timeline still shows `store_closed` and the
   closing photos, which is exactly what a naive time-range approach breaks.
3. **Item 2.** `EXPLAIN (ANALYZE, BUFFERS)` before and after on a store with
   real history. The evidence is the plan **losing its sort node**, not a
   wall-clock improvement — at ~90 rows a day the timing difference is noise.
4. **Item 3.** Confirm the cache is *working* first — repeat calls, one Supabase
   query — then trust the TTL rather than waiting 6h. Separately, edit a product
   in the dashboard and confirm it appears within TTL + one dedupe window.
5. **Orders regression.** This task must not touch that screen. Confirm 041
   Phase 3 still holds: newest 25 shown, `Show all` extends without duplicates
   or scroll loss, summary card matches the daily summary row rather than the
   loaded list length, `Order #N` numbers against the day.
6. **Scoreboard.** Re-read the route table after a full window. `day-activity`
   is the only route expected to move — 25–40ms if the rule holds. **Record the
   window length this time**, and remember it already drifted 31% untouched, so
   a small move proves little either way.

---

## What would make me stop and re-plan

- **The post-backfill check returning anything other than 422 unlinked**, or a
  non-zero count on a type other than payroll, customer feedback, or
  `summary_photo_deleted`. That is an event type about to vanish from the
  timeline, and it must be understood before step 4 ships.
- **The ms/inv table moving with no deploy between readings.** `day-activity`
  already did. If more routes drift on their own, the dashboard is too noisy to
  plan against and the rule is not established. Two readings a week apart with
  no deploy between them would settle it — worth doing *before* Item 1's
  migration.
- **Item 1 measuring flat.** It is the only item predicted to move the number,
  and that prediction rests on one clean data point. If removing seven of ten
  queries buys nothing, the rule is wrong — and the remaining levers are cold
  starts and invocation count, which no task on the board addresses.
