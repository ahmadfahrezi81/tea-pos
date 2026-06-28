# Task 026 — Payroll Schema Rename + payout_id FK

## Context

Lands on top of task 025 (status simplification) and the
`20260621145309_refactor_payroll_drop_periods.sql` migration (drop
`payroll_periods`, payouts own `start_date`/`end_date`).

Two goals:
1. **Rename tables and columns** for clarity and consistency.
2. **Stamp `payout_id`** directly on commissions and claims so lookups
   become `WHERE payout_id = X` instead of a date-range scan.

---

## Part 1 — Table and column renames

### Tables

| Old | New |
|---|---|
| `payroll_commission_types` | `payroll_commission_configs` |
| `payroll_claim_types` | `payroll_claim_configs` |
| `payroll_claim_eligibility` | `payroll_user_claim_assignments` |

### Columns — `payroll_commissions`

| Old | New | Notes |
|---|---|---|
| `commission_type_id` | `commission_config_id` | FK auto-updates on column rename |
| `gross_pay` | `total_commission` | clearer name |
| `rate_per_cup` | **keep** | historical snapshot — do not derive from config |

### Columns — `payroll_claims`

| Old | New | Notes |
|---|---|---|
| `claim_type_id` | `claim_config_id` | FK + partial index predicates auto-update on rename |
| `frequency` | **keep** | `payroll_claims_daily_unique` and `payroll_claims_monthly_unique` have `WHERE frequency = 'daily/monthly'` predicates — dropping the column drops both indexes |
| `amount` | **keep** | historical snapshot — amount can change on the config |

### Columns — `payroll_user_claim_assignments` (was `payroll_claim_eligibility`)

| Old | New | Notes |
|---|---|---|
| `claim_type_id` | `claim_config_id` | |
| `removed_at` | **drop** | no longer used — service already does hard delete |

### Columns — `payroll_user_info`

| Old | New |
|---|---|
| `commission_type_id` | `commission_config_id` |

### `payroll_claim_configs.frequency` CHECK constraint

The original migration only allows `('weekly', 'monthly', 'one_time')`.
`'daily'` was never added to the constraint despite the auto_claims
migration adding a `payroll_claims_daily_unique` index. Must fix here:
drop old check, add new one with all four values.

### No changes to `payroll_payouts`

---

## Part 2 — Rebuild broken weekly unique index

`payroll_claims_weekly_unique` was **auto-dropped** by the drop-periods
migration because it referenced `payroll_period_id` in its index columns.
Rebuild using ISO week Monday (an immutable date expression) instead:

```sql
CREATE UNIQUE INDEX payroll_claims_weekly_unique
  ON payroll_claims (tenant_id, user_id, claim_config_id,
                     (date - (extract(isodow from date)::int - 1)))
  WHERE status != 'rejected' AND frequency = 'weekly';
```

The existing `payroll_claims_daily_unique` and `payroll_claims_monthly_unique`
indexes survive — PostgreSQL auto-updates their column references when
`claim_type_id` is renamed to `claim_config_id`.

---

## Part 3 — RLS policy fix

The policy "users can read eligible claim types" on `payroll_claim_types`
(USING clause references `payroll_claim_eligibility.claim_type_id` and
`removed_at`) becomes invalid after our renames. Must be dropped before
renaming and recreated after with updated names:

```sql
-- After renames, recreate:
CREATE POLICY "users can read eligible claim configs"
  ON payroll_claim_configs FOR SELECT
  USING (
    tenant_id = ANY(user_tenant_ids())
    AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
      OR EXISTS (
        SELECT 1 FROM payroll_user_claim_assignments puca
        WHERE puca.claim_config_id = payroll_claim_configs.id
          AND puca.user_id = auth.uid()
      )
    )
  );
```

The policies ON `payroll_user_claim_assignments` itself follow the rename
automatically — no action needed on those.

---

## Part 4 — Add `payout_id` FK to commissions and claims

### Why

`upsertPayout` currently re-aggregates via `date >= start AND date <= end`.
With a direct FK, it becomes `WHERE payout_id = X` — one indexed lookup.
`getPayslip` and `updatePayoutStatus` pending-count queries benefit the same way.

### Schema

```sql
ALTER TABLE payroll_commissions
  ADD COLUMN payout_id uuid REFERENCES payroll_payouts(id) ON DELETE SET NULL;
CREATE INDEX payroll_commissions_payout_id_idx ON payroll_commissions(payout_id)
  WHERE payout_id IS NOT NULL;

ALTER TABLE payroll_claims
  ADD COLUMN payout_id uuid REFERENCES payroll_payouts(id) ON DELETE SET NULL;
CREATE INDEX payroll_claims_payout_id_idx ON payroll_claims(payout_id)
  WHERE payout_id IS NOT NULL;
```

### Backfill

```sql
UPDATE payroll_commissions c
SET payout_id = p.id
FROM payroll_payouts p
WHERE c.payout_id IS NULL
  AND c.tenant_id = p.tenant_id AND c.user_id = p.user_id
  AND c.date >= p.start_date AND c.date <= p.end_date;

UPDATE payroll_claims cl
SET payout_id = p.id
FROM payroll_payouts p
WHERE cl.payout_id IS NULL
  AND cl.tenant_id = p.tenant_id AND cl.user_id = p.user_id
  AND cl.date >= p.start_date AND cl.date <= p.end_date;
```

### Stamping logic (service layer)

After this migration, stamp `payout_id` immediately on every new row:

1. **`upsertPayout()`** — after the upsert resolves, run the backfill UPDATEs above (for any rows created between migration and this code deploy, if any)
2. **`createPayrollCommissions()`** — after payout upserted, update the newly inserted commission row: `.update({ payout_id: payoutId }).eq("id", commission.id)`
3. **`createPayrollClaim()` + `createAutoClaimsForDailySummary()`** — resolve payout first, set `payout_id` on insert

Once all rows are stamped, switch `upsertPayout`, `getPayslip`, and the pending-count queries in `updatePayoutStatus` from date-range to `WHERE payout_id = X`.

---

## Migration order (all in one migration)

```
supabase migration new payroll_schema_rename_and_payout_fk
```

Inside the transaction:
1. Drop the broken RLS policy on `payroll_claim_types` (BEFORE any renames)
2. Rename `payroll_commission_types` → `payroll_commission_configs`
3. Rename `payroll_claim_types` → `payroll_claim_configs`
4. Rename `payroll_claim_eligibility` → `payroll_user_claim_assignments`
5. Drop `removed_at` from `payroll_user_claim_assignments`
6. Rename columns (`commission_type_id`, `gross_pay`, `claim_type_id`)
7. Fix `payroll_claim_configs.frequency` CHECK (drop old, add new with 'daily')
8. Recreate the RLS policy with updated table/column names
9. Rebuild `payroll_claims_weekly_unique`
10. Add `payout_id` FK + index on commissions and claims
11. Backfill `payout_id` on existing rows

After migration: `pnpm types:db`

---

## Code impact (after migration + types regenerated)

### `packages/services/payroll.ts`
- `upsertPayout`: switch commission/claim aggregation queries from date-range to `eq("payout_id", payoutId)` (once backfill runs). Add backfill UPDATE after upsert.
- `getPayslip`: `.select("*, payroll_claim_types!left(...)")` → `payroll_claim_configs!left(...)`; switch queries from date-range to `payout_id`
- `updatePayoutStatus`: pending-count queries switch from date-range to `payout_id`
- `createPayrollCommissions`: stamp `payout_id` on newly inserted commission row; `gross_pay` → `total_commission` in insert + log metadata; `commission_type_id` → `commission_config_id`
- `getPayslip`: `grossPay` → `totalCommission` in the reduce

### `packages/services/payroll-claims.ts`
- `.from("payroll_claim_types")` → `payroll_claim_configs` (4 places)
- `.from("payroll_claim_eligibility")` → `payroll_user_claim_assignments` (3 places)
- `claim_type_id` → `claim_config_id` in all selects/inserts/filters
- `createPayrollClaim()`: stamp `payout_id` on insert
- `createAutoClaimsForDailySummary()`: stamp `payout_id` on insert; join filter `.eq("payroll_claim_types.claim_source", ...)` → `payroll_claim_configs.claim_source`
- `getClaimableTypes()`: both table references

### `packages/services/payroll-claim-types.ts`
- `.from("payroll_claim_types")` → `payroll_claim_configs` (3 places)
- `.from("payroll_claim_eligibility")` → `payroll_user_claim_assignments` (2 places)
- `claim_type_id` → `claim_config_id` in `listUserClaimEligibility` join + `setUserClaimEligibility` insert

### `packages/services/payroll-user-info.ts`
- `.from("payroll_commission_types")` → `payroll_commission_configs` in join
- `commission_type_id` → `commission_config_id` in upsert payload

### `packages/features/payroll/schema.ts`
- `PayrollCommissionResponse`: `commissionTypeId` → `commissionConfigId`, `grossPay` → `totalCommission`

### `packages/features/payroll-claims/schema.ts`
- `CreatePayrollClaimInput`: `claimTypeId` → `claimConfigId`
- `PayrollClaimResponse`: `claimTypeId` → `claimConfigId` (keep `frequency` — it's still on the table)

### `packages/features/payroll-user-info/schema.ts`
- `AdminUpdatePayrollUserInfoInput`: `commissionTypeId` → `commissionConfigId`
- `PayrollUserInfoResponse`: `commissionTypeId` → `commissionConfigId`, `commissionTypeName` → `commissionConfigName`

### Seller app API routes + hooks + UI
- `lib/api/payroll.ts`, `lib/hooks/payroll/usePayroll.ts`, `usePayouts.ts`, `usePayslip.ts`
- `lib/hooks/payroll-claims/usePayrollClaims.ts`
- `app/.../more/earnings/[payoutId]/page.tsx` — `grossPay` → `totalCommission`, `claimTypeId` → `claimConfigId`
- `app/.../more/reimbursements/page.tsx` — `claimTypeName`/`claimTypeId` fallback display
- `app/.../more/reimbursements/add/page.tsx` — `claimTypeId` in create call
- `app/.../more/earnings/_components/PayConfigCard.tsx` — `commissionTypeName` → `commissionConfigName`

### Backoffice app API routes + hooks + UI
- `lib/api/payroll.ts`, `lib/hooks/payroll/usePayroll.ts`
- `lib/hooks/payroll-claims/usePayrollClaims.ts`
- `lib/hooks/payroll-claim-types/usePayrollClaimTypes.ts` — `claimTypeId` → `claimConfigId`
- `app/.../pay/periods/[periodId]/[userId]/page.tsx` — `grossPay` → `totalCommission`
- `app/.../pay/periods/[periodId]/[userId]/day/[date]/page.tsx` — `grossPay`, `claimTypeId`/`claimTypeName`
- `app/.../pay/staff/[userId]/page.tsx` — `commissionTypeId`
- `app/.../pay/staff/page.tsx` — `commissionTypeId`
- `app/.../pay/claim-types/[id]/edit/page.tsx` — `claimTypeIds` in eligibility payload

---

## What's NOT in scope

- Removing `rate_per_cup` from commissions (historical snapshot)
- Removing `amount` from claims (historical snapshot)
- Removing `frequency` from claims (partial indexes depend on it)
- Any UI feature work
