# Task 016 — Summary Totals: Replace Write-on-Read with Incremental Updates

## Problem

`store_daily_summaries` stores denormalized aggregates (`total_sales`, `total_orders`,
`total_cups`, `total_expenses`, `expected_cash`). These are currently kept in sync via
two different compensating patterns — both wrong:

### Gap 1 — `createOrder` never touches the summary
`packages/services/orders.ts` inserts the order and items but does **zero** update to
`store_daily_summaries`. The summary totals stay stale until the next GET.

### Gap 2 — `listSummaries` compensates with a write-on-read
Because `createOrder` doesn't update the summary, `listSummaries` in
`packages/services/summaries.ts` compensates on every GET by:
1. Fetching **all orders for today** from `store_orders`
2. Recalculating totals
3. Potentially **writing back** to `store_daily_summaries`

This fires on every `GET /api/summaries` call — which `useDailySummaries` triggers on
every page mount. It's a read endpoint secretly doing writes.

### Gap 3 — `recalcSummary` in expenses is also a full recalculation
`packages/services/expenses.ts` has a `recalcSummary` helper called on every
create/update/delete. It:
1. Reads **all expenses** for the summary to sum them
2. Reads the summary for `opening_balance + total_sales`
3. Writes back `total_expenses` and `expected_cash`

This is 2 extra DB reads on every expense mutation when atomic increments would need 0.

---

## Solution

Update aggregates **at mutation time** using atomic Postgres increments. No recalculation.
`listSummaries` becomes a pure read.

---

## Changes Required

### 1. `packages/services/orders.ts` — `createOrder`

After inserting order + items, atomically increment the active summary.
`createOrder` already computes `totalAmount` and `totalCups` — use them directly.

```ts
// After items insert, before activity log:
const TZ = Number(process.env.TIMEZONE_OFFSET ?? 7);
const todayStr = new Date(new Date().getTime() + TZ * 3600000)
    .toISOString().split("T")[0];

await supabase
    .from("store_daily_summaries")
    .update({
        total_sales:   supabase.rpc("increment", { x: totalAmount }),   // or raw SQL via .rpc
        total_orders:  supabase.rpc("increment", { x: 1 }),
        total_cups:    supabase.rpc("increment", { x: totalCups }),
        expected_cash: supabase.rpc("increment", { x: totalAmount }),
    })
    .eq("store_id", storeId)
    .eq("tenant_id", tenantId)
    .eq("date", todayStr)
    .is("closed_at", null);
```

> **Note on Supabase atomic increments**: Supabase JS client doesn't have a native
> `col + X` syntax. Use a raw Postgres expression via `.rpc()` or restructure as:
> first SELECT the current values, then UPDATE. Alternatively use a Postgres function
> `increment(bigint, bigint)`. The simplest approach without a migration is to read
> first, then write — but investigate whether Supabase `update` with a custom RPC
> is feasible to avoid the read entirely.
>
> If a clean atomic path isn't available without a migration, acceptable fallback:
> read the active summary once (already needed to verify it exists), then write
> `total_sales = current + totalAmount` etc.

### 2. `packages/services/expenses.ts` — replace `recalcSummary` with incremental

**`createExpense`**: after insert, no reads needed:
```ts
await supabase
    .from("store_daily_summaries")
    .update({
        total_expenses: current_total_expenses + amount,   // atomic
        expected_cash:  current_expected_cash - amount,    // atomic
    })
    .eq("id", dailySummaryId)
    .eq("tenant_id", tenantId);
```

**`deleteExpense`**: old amount already fetched before delete — use it:
```ts
// after delete:
await supabase
    .from("store_daily_summaries")
    .update({
        total_expenses: current - expense.amount,
        expected_cash:  current + expense.amount,
    })
    .eq("id", expense.daily_summary_id)
    .eq("tenant_id", tenantId);
```

**`updateExpense`**: old expense already fetched — compute delta:
```ts
const delta = (newAmount ?? oldExpense.amount) - oldExpense.amount;
// then: total_expenses += delta, expected_cash -= delta
```

Remove the `recalcSummary` helper entirely once all 3 are migrated.

### 3. `packages/services/summaries.ts` — remove write-on-read block

Delete the entire block (approx lines 152–185):
```ts
// DELETE THIS:
const todaySummary = summaryList.find((s) => s.date === todayStr && !s.closed_at);
if (todaySummary) {
    const todayOrders = await fetchOrdersForDate(...);
    ...
    if (changed) { await supabase.from("store_daily_summaries").update(...) }
}
```

`listSummaries` becomes a pure read. The `fetchOrdersForDate` and `aggregateOrders`
helpers can be removed from this file if no longer used elsewhere.

### 4. `packages/services/summaries.ts` — demote `seedTotalsFromOrders`

Keep the function. It's legitimately used in `sessions.ts` → `openStore` to seed
totals when a new daily summary is created (handles the case where orders existed
before the summary was opened). This is correct behaviour — it runs once on store
open, not on every read.

No change needed here.

---

## Affected Files

| File | Change |
|---|---|
| `packages/services/orders.ts` | Add summary increment after `createOrder` |
| `packages/services/expenses.ts` | Replace `recalcSummary` with atomic deltas in create/update/delete |
| `packages/services/summaries.ts` | Remove write-on-read block from `listSummaries` |

No schema changes. No API route changes. No hook changes. No frontend changes.

---

## What Is NOT Changing

- `seedTotalsFromOrders` — stays, called on store open in `sessions.ts`
- `store_orders` schema — no `daily_summary_id` column needed; we query by `store_id + date`
- All API routes, API clients, hooks, components — untouched

---

## Risks & Edge Cases

**Race condition on concurrent orders?**
Postgres `UPDATE col = col + X` is atomic at the row level. Two sellers submitting
orders simultaneously will each increment correctly without overwriting each other.
This is the main reason to use increments over read-then-write.

**What if an order is created but the summary update fails?**
The summary totals would be temporarily stale. `seedTotalsFromOrders` can be called
as a repair. Long-term: wrap both in a Postgres transaction via `.rpc()`.

**Orders created outside the service layer?**
Currently all order creation goes through `createOrder`. If anything bypasses it
(admin scripts, direct DB inserts), totals won't update. Acceptable for now.

**Day boundary (midnight rollover)?**
`createOrder` derives `todayStr` using `TIMEZONE_OFFSET`. Must match the same TZ
logic used in `listSummaries` and `openStore`. Use the shared `getTodayStr` helper
from summaries (or extract to utils).

---

## Testing Checklist

- [ ] Create an order → verify `total_sales`, `total_orders`, `total_cups` on summary update instantly
- [ ] Create expense → verify `total_expenses` and `expected_cash` update correctly
- [ ] Update expense amount → verify delta applied correctly
- [ ] Delete expense → verify totals decrease correctly
- [ ] Open analytics page → no DB write occurs (check Supabase logs)
- [ ] Multiple concurrent orders (manual test with 2 devices) → totals correct
- [ ] Close day → payroll entries still correct (they read from summary totals at close time)
