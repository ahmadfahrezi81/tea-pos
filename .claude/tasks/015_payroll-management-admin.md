# Task 015 — Pay & Reimbursements Revamp

## Overview

Full revamp of the payroll + reimbursements system. Two perspectives:

- **Staff (My Pay):** Weekly receipt-style payslip showing cups earned + reimbursements + total payout. Bank account stored on profile for transparency. Lives in `apps/seller`.
- **Admin (Pay Management):** Review entries, approve reimbursements, upload transfer screenshot, mark as paid per user per week. Lives in `apps/backoffice` — a new PWA app, same skeleton as `apps/seller`.

---

## ✅ Migrations — DONE

All 4 migrations have been pushed to the remote database. `pnpm types:db` has been run — `packages/db/types.ts` is up to date.

1. ✅ `commission_configs_per_user` — `tenant_commission_configs` now has `user_id` instead of `role`
2. ✅ `add_bank_info_to_users` — `users` table has `bank_name`, `bank_account_number`, `bank_account_holder`
3. ✅ `add_payroll_payouts` — `payroll_payouts` table created with RLS; `payroll_periods.status` widened to `pending/approved/on_hold/paid`
4. ✅ `fix_reimbursements_rls` — `payroll_reimbursements` now has `own_read` policy (staff see only their own)

---

## Status models

### Payout (per user per week — `payroll_payouts`)
```
Pending → Approved → Paid
              ↓
           On Hold
```
- **Pending** — auto-created when admin opens the user's period view, not reviewed yet
- **Approved** — admin verified numbers, ready to pay
- **On Hold** — something looks off. Staff sees "Being reviewed." Admin fixes data, then flips back to Approved.
- **Paid** — transfer done, screenshot uploaded, bank + amount recorded

### Reimbursements
```
Pending → Approved → Paid (auto when payout is marked Paid)
              ↓
           Rejected
```

---

## `apps/backoffice` — new app

Clone `apps/seller` as the skeleton:
- Next.js 15 App Router, same file structure
- Mobile PWA (same `next-pwa` config)
- Same auth pattern (Supabase, middleware, tenant routing)
- Same layered architecture: service → api route → api client → hook → component
- Shares all packages: `packages/services`, `packages/features`, `packages/db`, `packages/ui`, `packages/utils`
- Its own `middleware.ts`, `layout.tsx`, footer nav, and pages

### Routing structure

```
apps/backoffice/app/
  [tenantSlug]/
    mobile/
      layout.tsx             — shell (header + footer nav)
      pay/                   — Pay Management tab
        page.tsx             — overview: this week summary + menu
        periods/
          page.tsx           — all pay periods list
          [periodId]/
            page.tsx         — staff list for this period
            [userId]/
              page.tsx       — per-user receipt + actions + pay flow
        rates/
          page.tsx           — commission rates per staff
        reimbursements/
          page.tsx           — all claims, tabbed by status
```

Footer tabs (backoffice):
- **Pay** — payroll overview
- (extend later with more admin sections)

No feature flag needed — the entire backoffice app is admin-only by definition. Auth middleware enforces ADMIN role.

---

## `apps/seller` changes (Staff UI only)

### Service layer

**`packages/services/commission-configs.ts`**
- `getCommissionRate({ tenantId, userId })` — per-user lookup (was per-role)
- `upsertCommissionConfig({ tenantId, userId, ratePerCup, effectiveDate })`

**`packages/services/payroll.ts`**
- Fix week calc: use `date-fns` `startOfISOWeek`/`endOfISOWeek` (was timezone-unsafe)
- `createPayrollEntries`: per-user rate lookup
- New: `getPayslip({ tenantId, userId, periodId })` — period + payout + entries + reimbursements + totals
- New: `upsertPayout({ tenantId, periodId, userId })` — create/return payout row with computed totals
- New: `updatePayoutStatus({ id, tenantId, actorId, status, paymentProofUrl? })` — sets paid_at/paid_by on paid, marks reimbursements paid
- New: `bundleReimbursementsIntoPeriod({ tenantId, periodId, userId })` — sets payroll_period_id on approved claims in date range
- New: `listPayouts({ tenantId, periodId?, userId? })`

**`packages/services/reimbursements.ts`**
- New: `updateReimbursementStatus({ id, tenantId, actorId, status })` — approved/rejected
- New: `listAllReimbursements({ tenantId, status? })` — admin view

**`packages/services/users.ts`**
- New: `listTenantUsers({ tenantId })`
- New: `updateUser({ userId, fullName?, phoneNumber?, bankName?, bankAccountNumber?, bankAccountHolder? })`

### Schema updates

**`packages/features/commission-configs/schema.ts`**
- `GetCommissionRateQuery`: `userId` instead of `role`
- `UpsertCommissionConfigInput`: `userId` instead of `role`

**`packages/features/payroll/schema.ts`**
- Status values: `pending/approved/on_hold/paid`
- New: `PayoutResponse`, `PayoutListResponse`
- New: `PayslipResponse` — period + payout + entries + reimbursements + computed totals

**`packages/features/users/schema.ts`**
- `UserResponse`: add `bankName`, `bankAccountNumber`, `bankAccountHolder`
- `UpdateUserInput`: add bank fields

**`packages/features/reimbursements/schema.ts`**
- New: `UpdateReimbursementStatusInput`
- New: `ListAllReimbursementsQuery`

### API routes (seller)

- **`GET /api/payroll/entries`** — security fix: non-admin cannot query other users
- **`GET /api/payroll/payslip`** — new route, returns `PayslipResponse` for calling user
- **`GET/POST /api/payroll/payouts`** — list + upsert payout rows
- **`PATCH /api/payroll/payouts/[id]`** — approve / on_hold / pay (admin only)
- **`PATCH /api/payroll/periods/[id]`** — admin guard + new status enum
- **`PATCH /api/reimbursements/[id]`** — approve/reject (admin only)
- **`GET /api/reimbursements`** — add `?all=true` for admin
- **`GET/PATCH /api/users`** — add `?all=true` listing + bank field updates
- **`POST /api/upload`** — add `payroll-proofs` bucket

### Hooks + API clients (seller)

- `useCommissionConfig(userId)` — SWR key `commission-config-${userId}`
- `usePayslip(periodId)` — new
- `usePayouts(params?)` — new
- `useTenantUsers()` — new
- `useReimbursements({ all?: boolean })` — extended
- `payrollApi.getPayslip`, `getPayouts`, `upsertPayout`, `updatePayout` — new methods
- `reimbursementsApi.listAll`, `updateStatus` — new methods
- `usersApi.listAll`, `update` — new methods

### Staff UI (seller)

**Personal Details — bank account fields**
`apps/seller/app/[tenantSlug]/mobile/account/details/_components/MobilePersonalDetails.tsx`
- Add editable section: Bank Name, Account Number, Account Holder
- Calls `PATCH /api/users`

**My Pay list — `account/earnings/page.tsx`**
- Each week is a receipt stub card with payout status
- Status labels: pending→Waiting, approved→Ready, on_hold→Being reviewed, paid→Paid ✓ · date

**Payslip detail — `account/earnings/[periodId]/page.tsx`**
- Receipt layout: monospace, dashed dividers, day-by-day table, claims section, total
- Payment section: proof screenshot + bank details when paid

---

## Admin UI (`apps/backoffice`)

All admin pages live here. No feature flag — middleware enforces ADMIN role.

### Pay overview — `/[tenantSlug]/mobile/pay`
Summary card: this week total due, how many periods pending. Menu rows: Staff Pay Periods, Commission Rates, Reimbursements.

### Staff Pay Periods — `/[tenantSlug]/mobile/pay/periods`
List all periods newest first. Tap → staff list for that period.

### Period staff — `/[tenantSlug]/mobile/pay/periods/[periodId]`
All staff with payout status + total. Tap → per-user receipt.

### Per-user pay view — `/[tenantSlug]/mobile/pay/periods/[periodId]/[userId]`
- Bank account info (copyable)
- Receipt layout (same as staff payslip)
- Footer actions by status:
  - `pending` → Approve + Put On Hold
  - `approved` → Mark On Hold + Pay
  - `on_hold` → Approve
  - `paid` → disabled, shows paid date + screenshot
- Pay flow: sheet with amount + bank details + screenshot upload → Confirm Payment

### Commission Rates — `/[tenantSlug]/mobile/pay/rates`
All staff with current rate per cup. Tap → set new rate + effective date.

### Reimbursements — `/[tenantSlug]/mobile/pay/reimbursements`
Tabbed: Pending / Approved / Paid / Rejected. Approve / Reject actions on pending claims.

---

## Implementation order

1. **Scaffold `apps/backoffice`** — clone seller skeleton, set up middleware, layout, footer nav
2. **Service layer** — all new/updated functions in `packages/services/`
3. **Schema updates** — `packages/features/`
4. **API routes** — all new/updated routes in `apps/seller/app/api/`
5. **Staff UI** — bank fields in Personal Details, My Pay list + receipt detail
6. **Admin UI** — all pages in `apps/backoffice`

---

## Session booster — read these before starting

```
packages/db/types.ts                                          — verify payroll_payouts, users bank fields, commission_configs user_id
packages/services/payroll.ts                                  — current service, understand createPayrollEntries + getOrCreatePayrollPeriod
packages/services/reimbursements.ts                           — current service
packages/services/commission-configs.ts                       — getCommissionRate current signature
packages/features/payroll/schema.ts                           — current Zod schemas
packages/features/commission-configs/schema.ts                — spot the role vs userId mismatch
packages/features/reimbursements/schema.ts                    — current schema
packages/features/users/schema.ts                             — UserResponse shape, confirm bank fields exist
apps/seller/app/api/payroll/entries/route.ts                  — spot the security hole
apps/seller/app/api/payroll/periods/[id]/route.ts             — current PATCH handler
apps/seller/app/api/reimbursements/route.ts                   — current GET + POST
apps/seller/app/api/users/route.ts                            — does it support PATCH? what fields?
apps/seller/app/api/upload/route.ts                           — bucket validation before adding payroll-proofs
apps/seller/app/[tenantSlug]/mobile/account/earnings/page.tsx — existing My Earnings UI to revamp
apps/seller/app/[tenantSlug]/mobile/account/earnings/[periodId]/page.tsx — existing period detail to revamp
apps/seller/app/[tenantSlug]/mobile/account/details/_components/MobilePersonalDetails.tsx — needs bank fields
apps/seller/app/[tenantSlug]/mobile/config/navigation.ts      — understand resolveRoute before touching navigation
apps/seller/middleware.ts                                      — copy auth pattern for backoffice middleware
apps/seller/app/[tenantSlug]/mobile/layout.tsx                — copy shell pattern for backoffice layout
```
