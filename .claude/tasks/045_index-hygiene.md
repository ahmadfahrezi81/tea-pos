# Task 045 — Index hygiene

**Status: planning only. Nothing written, nothing pushed. Owner scheduled this
for a weekend, not now.**

Opened 2026-08-09 after the `product-sales` outage. **Rewritten the same day**
once production statistics came back — the first draft's entire work list was
wrong, and the corrections are recorded below rather than quietly deleted.

---

## What already happened — this task is the follow-up, not the fix

`/api/analytics/product-sales` and `/api/analytics/day-of-week-sales` were
returning 500. Root cause was `store_order_items.order_id`: the referencing side
of `order_items_order_id_fkey`, which Postgres does **not** index automatically.
Every join from an order to its items scanned the whole table, so the
month-spanning query grew more expensive each day until it hit `57014 canceling
statement due to statement timeout`.

Shipped 2026-08-09:

| Commit | What |
|---|---|
| `01275a0` | Rewrote both endpoints, and made `handleError` log the raw throwable |
| `9966c67` | `CREATE INDEX store_order_items_order_id_idx ON store_order_items (order_id)` |

**The rewrite alone did not fix it.** Reversing the join direction still
traverses `order_id`; the index was load-bearing. PR #97 merged 14:58Z,
product-sales still timed out at 15:03Z with that build live, and the index took
effect at push time with no deploy.

### The damage, quantified

From `pg_stat_user_tables` on production, 2026-08-09:

| Table | Rows | seq_scan | seq_tup_read |
|---|---|---|---|
| `store_order_items` | 39,070 | 57,675,994 | **547,222,216,723** |
| `store_orders` | 30,636 | 163,076 | 1,863,024,763 |
| `tenant_products` | 14 | 70,162,794 | 898,684,547 |

547 **billion** tuples read from a 39,000-row table. That is the outage with a
number on it. `store_order_items_order_id_idx` was already at 21,760 scans hours
after creation, so the fix is live and used.

---

## Read this before acting on any number here

**`pg_stat_*` counters are cumulative since the last reset, and the reset date is
unknown.** Every large figure above accumulated over months during which the
relevant index did **not** exist:

- `store_order_items (order_id)` — created 2026-08-09. All 547B predates it.
- `store_orders (store_id, created_at)` — created 2026-07-05, **dropped the same
  day** (037 fallout), re-created 2026-08-08 in `938855b`. So most of the 1.86B
  accumulated across a month with no such index.
- `tenant_products` — the six-hour product-list cache landed 2026-08-08 in
  `a992a93`. The 70M scans are largely pre-cache.

**These numbers describe a database that no longer exists.** They confirm the
diagnosis was right; they do not establish that anything is still wrong.

### So the first action is measurement, not a migration

```sql
SELECT pg_stat_reset();
```

Safe — it clears statistics counters only, touches no data, and cannot be undone
(the counters simply restart). Then leave it a week of normal trading and re-run
the scans in the appendix. Anything still showing a large `seq_tup_read` on a
large table after that is real and current.

Doing this first is what stops the next round of guessing. The first draft of
this document ranked four items off query shapes alone; three turned out to be
junk, and the fourth was already solved.

---

## Corrections to the first draft — all four items are dead

Kept so they are not re-proposed.

**`tenant_activity_logs (daily_summary_id, created_at)` — already covered.**
Called "the only urgent one". It is not:

```
tenant_activity_logs_tenant_summary_idx
  ON tenant_activity_logs USING btree (tenant_id, daily_summary_id)
```

`activity-logs.ts:60-65` filters `tenant_id` and `daily_summary_id` with
equality, so this composite serves it. It shows 176 scans.

**Why the scan missed it.** The FK query in the appendix tests
`i.indkey[0] = k.attnum` — only indexes where the column is *leading*. Here
`daily_summary_id` is the second column, so it was correctly reported as "no
index leads with this" and wrongly read as "no index helps this query." Anyone
running that scan must check composite coverage before concluding anything.

**`store_requests (store_id)` and `store_reports (store_id)` — empty tables.**
Both are 0 rows with `seq_tup_read` of 0. An index would be pure write cost.

**`store_expenses (daily_summary_id)` — too small to matter.** 49,242 seq scans
is real, but the table is 676 rows. Postgres will often keep choosing a seq scan
at that size and be right to. Revisit if it is still prominent after a stats
reset.

---

## Worth doing — confirmed by index definitions

### 1. Drop the redundant unique index on `store_daily_summaries`

Both of these exist:

```
daily_summaries_store_id_date_key   UNIQUE (store_id, date)
unique_daily_summary_store_date     UNIQUE (store_id, date, tenant_id)
```

The three-column one is redundant. `(store_id, date)` is already unique, so
appending `tenant_id` cannot constrain anything further — and a store belongs to
exactly one tenant, making `tenant_id` functionally dependent on `store_id`
anyway. Any query the wide index serves, the narrow one serves too.

Drop `unique_daily_summary_store_date`. The remaining constraint is strictly
**stronger**, so nothing is weakened.

> **Task 043 cites `unique_daily_summary_store_date`** as the guarantee behind
> its summary-lookup reasoning (its Item B, "latent fragility"). That reasoning
> survives — `daily_summaries_store_id_date_key` enforces the same uniqueness on
> fewer columns. Update 043's quote if this ships, so the next reader does not
> chase a dropped index.

### 2. Drop indexes that have never been used

`idx_scan = 0` across the whole recorded history:

| Index | Table |
|---|---|
| `idx_profiles_status` | `users` |
| `activity_logs_tenant_id_created_at_idx` | `tenant_activity_logs` |
| `activity_logs_user_id_created_at_idx` | `tenant_activity_logs` |
| `idx_products_status` | `tenant_products` |
| `idx_products_category_id` | `tenant_products` |
| `idx_product_categories_tenant_id` | `tenant_product_categories` |
| `customer_feedbacks_tenant_id_idx` | `tenant_customer_feedbacks` |
| `idx_tenants_slug` | `tenants` — duplicates `tenants_slug_key` |

Also near-dead: `idx_products_tenant_popularity` (2 scans) and
`idx_daily_summary_photos_expense_id` (2).

**Do not drop anything named `_key` or `_unique` regardless of scan count.**
Those enforce constraints, not speed — `payroll_claims_*_unique`,
`user_store_assignments_*`, `tenants_slug_key`, `payments_xendit_reference_id_key`
all sit at 0 and all must stay.

**Best done after the stats reset**, so "never used" means "not used in a full
week of trading" rather than "not used since an unknown date."

### 3. Investigate `store_orders` — measure, do not index

1.86B tuples read across 163,076 seq scans, averaging ~11,400 rows per scan
against a 30,636-row table. Its indexes are:

```
orders_pkey                            (id)
store_orders_daily_summary_id_idx      (daily_summary_id)
store_orders_store_id_created_at_idx   (store_id, created_at DESC)
```

Most of that total almost certainly predates `938855b` (2026-08-08), when the
composite came back after being dropped on 2026-07-05. **Confirm with a reset
before touching anything.** If it persists, find the query — these stats cannot
identify it, so enable `pg_stat_statements` rather than guessing:

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT calls, mean_exec_time, rows, query
FROM   pg_stat_statements
WHERE  query ILIKE '%store_orders%'
ORDER  BY total_exec_time DESC
LIMIT  20;
```

Candidates, if it is current: a filter on `tenant_id` alone (unindexed), or
`daily_summary_id IS NULL` — see task 043 Item B, which expects such rows to
exist from the QRIS webhook.

### 4. Note only — `tenant_products` call volume

70,162,794 seq scans, the most of any table. Harmless per-scan at 14 rows, but
that is a lot of round trips for a list the six-hour cache in `a992a93` was meant
to absorb. Worth re-checking after the reset: if it is still climbing fast, the
cache is not being hit and that is an application bug, not an index problem.

---

## Explicitly rejected — do not re-propose without evidence

A blanket index over every unindexed FK is wrong. Each costs write throughput
forever, and most of those columns never *narrow* a query.

| Column(s) | Why not |
|---|---|
| `store_orders.tenant_id`, `.user_id` | Queries pair `store_id` + `created_at`, covered by the composite |
| `store_order_items.product_id`, `.tenant_id` | Items are reached via `order_id` (indexed). The `tenant_products(name)` embed resolves against a primary key |
| `store_daily_summaries.tenant_id`, `.opened_by`, `.closed_by` | `store_id` already indexed; user columns only resolve embeds against `users.id` |
| `stores.tenant_id`, `user_store_assignments.store_id`, `user_tenant_assignments.user_id` | Hit constantly, but tens of rows — a seq scan of 40 rows beats an index lookup |
| `payroll_*` | One row per user per day. Revisit when a payroll screen feels slow |
| `auth.*`, `storage.*` | **Supabase-managed. Leave alone** — risks conflicting with their migrations |

---

## Migration

Nothing to write until after the reset and a week of trading. When it happens it
is drops, not creates — created with `supabase migration new`, verified with
`supabase migration list`, **pushed manually by the owner**.

```sql
-- Redundant: daily_summaries_store_id_date_key enforces strictly more.
DROP INDEX IF EXISTS unique_daily_summary_store_date;

-- Never used. Re-confirm against a post-reset week before running.
DROP INDEX IF EXISTS idx_profiles_status;
DROP INDEX IF EXISTS activity_logs_tenant_id_created_at_idx;
DROP INDEX IF EXISTS activity_logs_user_id_created_at_idx;
DROP INDEX IF EXISTS idx_products_status;
DROP INDEX IF EXISTS idx_products_category_id;
DROP INDEX IF EXISTS idx_product_categories_tenant_id;
DROP INDEX IF EXISTS customer_feedbacks_tenant_id_idx;
DROP INDEX IF EXISTS idx_tenants_slug;
```

`DROP INDEX` takes a brief exclusive lock on the table; all of these are small.
Reversible — every one can be recreated from the definitions captured in the
appendix, so **save that output before dropping anything.**

No app code changes, no `pnpm types:db` diff, nothing to redeploy.

---

## Verification

1. Re-run the FK scan and the index-usage scan; confirm the dropped indexes are
   gone and nothing else moved to `idx_scan = 0`.
2. Exercise the seller app across its main screens and confirm no query got
   slower — particularly the product picker and the day-activity timeline, whose
   tables lose indexes here.
3. `EXPLAIN (ANALYZE, BUFFERS)` the summary lookup in `createOrder`
   (`orders.ts:194-201`) before and after dropping
   `unique_daily_summary_store_date`, confirming it moves cleanly to
   `daily_summaries_store_id_date_key`. That query is on the till's write path.

---

## Appendix — the scans

**Unindexed foreign keys.** Reports only columns with no index *leading* on
them; a composite covering the column in a later position will still serve an
equality filter. Check `pg_indexes` before concluding anything is uncovered.

```sql
SELECT c.conrelid::regclass AS table_name,
       a.attname            AS column_name
FROM   pg_constraint c
JOIN   unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
JOIN   pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
WHERE  c.contype = 'f'
AND    NOT EXISTS (
         SELECT 1 FROM pg_index i
         WHERE i.indrelid = c.conrelid AND i.indkey[0] = k.attnum
       )
ORDER  BY 1, 2;
```

**Size and scan behaviour.**

```sql
SELECT relname AS table_name, n_live_tup AS approx_rows,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       seq_scan, seq_tup_read, idx_scan
FROM   pg_stat_user_tables
WHERE  schemaname = 'public'
ORDER  BY pg_total_relation_size(relid) DESC;
```

**Index usage.**

```sql
SELECT relname AS table_name, indexrelname AS index_name, idx_scan
FROM   pg_stat_user_indexes
WHERE  schemaname = 'public'
ORDER  BY idx_scan DESC;
```

**Index definitions — capture before dropping anything.**

```sql
SELECT tablename, indexname, indexdef
FROM   pg_indexes
WHERE  schemaname = 'public'
ORDER  BY tablename, indexname;
```

---

## Logged, not actioned

**`toApiError` still cannot preserve a non-`Error` throwable.** `handleError`
logs the raw cause now, which is enough to diagnose, but the ApiError carries the
generic message and a stack from its own construction site. Teaching
`toApiError` to read `message`/`code` off a plain object would make every 5xx
legible without the extra field — but Postgres detail must stay log-only, never
in a response body.

**Nothing prunes `tenant_activity_logs`.** 10,711 rows and only ever growing,
holding rows nobody reads once a day closes. Not urgent — the composite index
keeps the query fast regardless — but it eventually wants a retention policy.
