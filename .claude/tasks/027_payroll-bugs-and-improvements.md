# Task 027 — Payroll Bugs & Improvements

## Context

Lands on top of task 026 (schema rename + payout_id FK). Fixes confirmed bugs
and adds small features to the payroll system.

---

## CRITICAL — Security

### Bug: Seller `PATCH /api/payroll/commissions/[id]` missing ADMIN guard

`apps/seller/app/api/payroll/commissions/[id]/route.ts` has no role check.
Any authenticated seller can call it and approve or reject their own commission.
The backoffice version of the same route correctly has
`if (user.role !== "ADMIN") return forbidden()`.

**Fix:** Add the same ADMIN guard to the seller route.

---

## HIGH — Logic bugs

### Bug 1 — Payout totals not updating on close day

`upsertPayout()` (`packages/services/payroll.ts`) aggregates commissions and
claims with `.eq("status", "approved")`. But `createPayrollCommissions()` inserts
new commissions without an explicit status, which defaults to `'pending'` in the
DB. So when `upsertPayout` runs immediately after close-day, it sees zero approved
commissions and stores `commissions_total = 0`, `total_cups = 0`, `total_pay = 0`.

**Fix:** Change both aggregation queries in `upsertPayout` from:
```ts
.eq("status", "approved")
```
to:
```ts
.neq("status", "rejected")
```
Pending + approved rows count toward displayed totals. Rejected are excluded.
The `updatePayoutStatus` guard that blocks payment while pending items remain is
unaffected.

### Bug 2 — Payout totals never refresh when a commission or claim is reviewed

`updatePayrollCommission` and `updatePayrollClaimStatus` only write the status
column. Neither calls `upsertPayout`. So after an admin approves a commission,
`payroll_payouts.commissions_total` stays stale. The backoffice pay-detail page
calls `upsertPayout` on mount as a workaround, but that is a side-effect and not
guaranteed for all code paths.

**Fix:** After the status `.update()` succeeds, re-aggregate the payout.

For `updatePayrollCommission`: the commission fetch currently selects
`"date, user_id, store_id"`. Add `payout_id` to that select. Then:
1. If `payout_id` is set, call `getPayout(supabase, { id: payout_id, tenantId })`
   to get `startDate`/`endDate`, then call `upsertPayout`.
2. If null (edge case — pre-026 row), fall back to the `assertPayoutNotPaid`
   date-range query. Extend `assertPayoutNotPaid` to return the full payout row
   (it already queries it — just change `select("status")` to
   `select("id, status, start_date, end_date")`) so the result can feed
   directly into `upsertPayout` without an extra round-trip.

For `updatePayrollClaimStatus`: same pattern — the claim fetch already returns
`date` and `user_id`, so fall back to the `assertPayoutNotPaid` approach (extended
to return start/end dates) and call `upsertPayout` with those values.

### Bug 3 — `getPayslip` commissionsTotal vs claimsTotal computed inconsistently

In `payroll.ts`:
```ts
const commissionsTotal = commissions.reduce(...)            // ALL statuses (includes rejected)
const claimsTotal = claims.filter(c => c.status === "approved").reduce(...) // only approved
```
Commissions should apply the same filter as claims. A rejected commission is not
earned pay and should not appear in the total.

**Fix:** Filter commissions to `status !== "rejected"` before the reduce.

---

## MEDIUM — Missed items from task 026

### `getPayslip` and `updatePayoutStatus` still use date-range instead of `payout_id`

Task 026 added `payout_id` to commissions and claims and backfilled existing rows
so that lookups could switch from date-range scans to `WHERE payout_id = X`.
Neither function was updated:

- `getPayslip` (`payroll.ts:402–411`): extracts `startDate`/`endDate` from the
  payout row, then fetches commissions and claims with
  `.gte("date", startDate).lte("date", endDate)` despite already knowing `payoutId`.
- `updatePayoutStatus` (`payroll.ts:329–346`): pending-count queries also still
  use date-range.

**Fix:** Switch both to `.eq("payout_id", payoutId)` and drop the
`startDate`/`endDate` derivation in `getPayslip`. Safe since all rows have
`payout_id` stamped after 026's backfill migration.

---

## MEDIUM — Missing duplicate handling

### Bug: `createPayrollClaim` has no friendly error for a daily constraint violation

For `frequency = "daily"`, the `payroll_claims_daily_unique` index fires a `23505`
if a user submits a second claim on the same day. The service has no 23505 handler
— the raw Supabase error propagates. `createAutoClaimsForDailySummary` correctly
silences 23505 with `continue`, but the manual-submit path does not.

**Fix:** After the insert in `createPayrollClaim`, catch error code `"23505"` and
throw a user-facing message such as `"You have already submitted this claim today"`.

---

## MEDIUM — `getClaimableTypes` missing daily frequency case

`getClaimableTypes()` (`packages/services/payroll-claims.ts:409`, frequency
checks at line 453) handles `weekly`, `monthly`, and `one_time` but has no
`daily` branch. It falls through to `claimable = true`, so the entitlements card
always shows daily claims as available even after they have been submitted today.

The `existingClaims` query at line 437 already fetches all non-rejected claims
with no date filter, so the data is available — it just needs a branch.

**Fix:** Add a `daily` branch after the `one_time` check. Must use the server-side
TZ offset (`process.env.TIMEZONE_OFFSET`) to compute today's local date, matching
how the rest of the service handles dates:
```ts
} else if (config.frequency === "daily") {
    const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
    const today = new Date(Date.now() + tzOffset * 3_600_000).toISOString().slice(0, 10);
    claimable = !claims.some(
        (c) => c.claim_config_id === config.id && c.date === today,
    );
}
```
Using raw `new Date().toISOString()` (UTC) would give the wrong date for users
past midnight local time.

---

## LOW — Dead code

### `packages/services/reimbursements.ts` references a dropped table

`payroll_reimbursements` was renamed to `payroll_claims` in migration
`20260609044829`. The seller and backoffice apps already use `payroll-claims.ts`
for the reimbursements UI. The old `reimbursements.ts` service is orphaned and
would throw at runtime if ever called.

**Fix:** Delete `packages/services/reimbursements.ts`.

---

## Schema change 1 — Add status CHECK constraints

No CHECK constraints exist on status columns. Bundle into the migration:

```sql
ALTER TABLE payroll_commissions
    ADD CONSTRAINT payroll_commissions_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE payroll_claims
    ADD CONSTRAINT payroll_claims_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE payroll_payouts
    ADD CONSTRAINT payroll_payouts_status_check
    CHECK (status IN ('pending', 'paid'));
```

---

## Schema change 2 — Add `total_orders` to commissions and payouts

`total_cups` counts item quantity (sum of order item quantities). Add
`total_orders` to count distinct orders per session window as a separate metric.

```sql
ALTER TABLE payroll_commissions
    ADD COLUMN total_orders integer NOT NULL DEFAULT 0;

ALTER TABLE payroll_payouts
    ADD COLUMN total_orders integer NOT NULL DEFAULT 0;
```

### Service changes

- `createPayrollCommissions()`: count `orders.length` per session, sum into
  `totalOrders`; include `total_orders` in insert payload and activity-log metadata.
- `upsertPayout()`: aggregate `total_orders` from `payroll_commissions` (same
  filter as `total_cups`); include in upsert payload.
- `getPayslip()`: expose `totalOrders` per commission row and as payout-level total.

### Types + schema

After migration: `pnpm types:db`.

Update `PayrollCommissionResponse` and `PayoutResponse` in
`packages/features/payroll/schema.ts` to include `totalOrders`.

---

## UI change 1 — "Waiting" → "Pending" in pay details

`earnings.statusWaiting` is "Waiting" (EN) / "Menunggu" (ID). Change the value
to "Pending" to match the status name.

Affected:
- `apps/seller/.../more/earnings/page.tsx`
- `apps/seller/.../more/earnings/[payoutId]/page.tsx`
- `packages/utils/translations/en.ts` and `id.ts`

Simplest fix: update the `earnings.statusWaiting` translation value directly, or
reuse the existing `claims.statusPending` key.

---

## UI change 2 — Status badge on each commission/claim row in pay detail

In `apps/seller/.../earnings/[payoutId]/page.tsx`, the per-day commission cards
show store name and amount but no status badge. Claims show only colored text.

Add a small status pill to each commission row, and make the claim status display
a consistent badge (`pending` / `approved` / `rejected`).

---

## Migration order

One migration:

```
supabase migration new payroll_bugs_and_total_orders
```

Inside:
1. Add CHECK constraints on `payroll_commissions.status`, `payroll_claims.status`,
   `payroll_payouts.status`
2. Add `total_orders` to `payroll_commissions`
3. Add `total_orders` to `payroll_payouts`

After migration: `pnpm types:db`

---

## Full code impact

| File | Change |
|---|---|
| `apps/seller/app/api/payroll/commissions/[id]/route.ts` | Add ADMIN guard |
| `packages/services/payroll.ts` | `upsertPayout`: `.neq("status", "rejected")` for both aggregations; add `total_orders` |
| `packages/services/payroll.ts` | `updatePayrollCommission`: also select `payout_id`; call `upsertPayout` after status write |
| `packages/services/payroll.ts` | `assertPayoutNotPaid`: change select to `id, status, start_date, end_date` so callers can re-aggregate without extra query |
| `packages/services/payroll.ts` | `updatePayoutStatus`: switch pending-count queries to `eq("payout_id", id)` |
| `packages/services/payroll.ts` | `getPayslip`: switch commission+claim queries to `eq("payout_id", payoutId)`; fix `commissionsTotal` filter; expose `totalOrders` |
| `packages/services/payroll.ts` | `createPayrollCommissions`: count `orders.length`, insert `total_orders` |
| `packages/services/payroll-claims.ts` | `updatePayrollClaimStatus`: call `upsertPayout` after status write (use extended `assertPayoutNotPaid` result for start/end dates) |
| `packages/services/payroll-claims.ts` | `getClaimableTypes`: add `daily` branch |
| `packages/services/payroll-claims.ts` | `createPayrollClaim`: catch 23505 for daily, throw friendly error |
| `packages/services/reimbursements.ts` | **Delete** (dead code, table dropped) |
| `packages/features/payroll/schema.ts` | Add `totalOrders` to `PayrollCommissionResponse` + `PayoutResponse` |
| `packages/utils/translations/en.ts` + `id.ts` | Update `earnings.statusWaiting` value |
| `apps/seller/.../earnings/page.tsx` | "Waiting" → "Pending" label |
| `apps/seller/.../earnings/[payoutId]/page.tsx` | "Waiting" → "Pending"; status badges on commission + claim rows |

---

## What's NOT in scope

- Changing the commission approval flow (commissions remain `pending` until backoffice reviews)
- Removing `total_cups` (kept alongside `total_orders`)
- Renaming the backoffice `[periodId]` route segment (cosmetic, low risk)
- Any other backoffice UI changes
