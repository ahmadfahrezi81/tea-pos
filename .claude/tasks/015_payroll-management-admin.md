# Task 015 — Pay & Reimbursements Revamp

## Overview

Full revamp of the payroll + reimbursements system. Two perspectives:

- **Staff (My Pay):** Weekly receipt-style payslip showing cups earned + reimbursements + total payout. Bank account stored on profile for transparency.
- **Admin (Pay Management, feature-flagged):** Review entries, approve reimbursements, upload transfer screenshot, mark as paid per user per week.

---

## What's wrong with the current implementation

1. **Rate is per-role (tenant-wide)** — needs to be per-user.
2. **No bank account info on users** — can't record where to send payment.
3. **Reimbursements disconnected from payslip** — should be bundled into weekly total.
4. **Week calculation is fragile** — `new Date(date).getDay()` + `toISOString()` is timezone-unsafe. Fix with `date-fns` `startOfISOWeek`/`endOfISOWeek`.
5. **No receipt concept** — staff have no clear view of what they're getting.
6. **Payroll period status is wrong** — current `open/processing/paid` is unclear and missing the audit step.
7. **Security hole** — sellers can query other users' payroll entries via arbitrary `userId`.
8. **Reimbursements RLS too broad** — all tenant members can read each other's claims.

---

## Status models

### Payroll period (per user per week)
```
Pending → Approved → Paid
              ↓
           On Hold
```
- **Pending** — auto-created when day is closed, not reviewed yet
- **Approved** — admin verified numbers, ready to pay
- **On Hold** — something looks off, being audited. Staff sees "Being reviewed." Admin goes upstream to fix the data, then flips back to Approved.
- **Paid** — transfer done, screenshot uploaded, bank + amount recorded

On Hold can come from Pending or Approved (catch mistakes before paying). Once Paid, status is final.

### Reimbursements
```
Pending → Approved → Paid (auto when period is paid)
              ↓
           Rejected
```
- **Pending** — submitted by staff, awaiting review
- **Approved** — admin confirmed it's valid, will be bundled into the week's payout
- **Rejected** — wrong amount, invalid claim, etc. Staff can resubmit.
- **Paid** — automatically set when the period it's bundled into is marked Paid

---

## Database migrations

### Migration 1 — Rate per user

Replace `role` column on `tenant_commission_configs` with `user_id`:

```sql
-- supabase migration new commission_configs_per_user

ALTER TABLE tenant_commission_configs
  ADD COLUMN user_id UUID REFERENCES users(id);

ALTER TABLE tenant_commission_configs
  DROP CONSTRAINT IF EXISTS commission_configs_tenant_role_date_unique;

ALTER TABLE tenant_commission_configs
  ADD CONSTRAINT commission_configs_user_date_unique
  UNIQUE (tenant_id, user_id, effective_date);

ALTER TABLE tenant_commission_configs DROP COLUMN IF EXISTS role;
```

Rate lookup: most recent row where `user_id = userId AND effective_date <= today`. Defaults to 0 if no row exists.

### Migration 2 — Bank account info on users

```sql
-- supabase migration new add_bank_info_to_users

ALTER TABLE users
  ADD COLUMN bank_name TEXT,
  ADD COLUMN bank_account_number TEXT,
  ADD COLUMN bank_account_holder TEXT;
```

### Migration 3 — Payroll payouts table (per-user per-period)

**Critical architectural note:** `payroll_periods` is tenant-wide — one row per week shared across all users. We cannot put payment proof or per-user status on it. Instead, add a `payroll_payouts` table: one row per user per period, tracking that user's approval status and payment proof.

```sql
-- supabase migration new add_payroll_payouts

CREATE TABLE payroll_payouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  payroll_period_id   UUID NOT NULL REFERENCES payroll_periods(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'on_hold', 'paid')),
  cups_pay_total      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- cups × rate
  reimbursements_total NUMERIC(12,2) NOT NULL DEFAULT 0, -- sum of approved claims
  total_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,  -- cups_pay_total + reimbursements_total (transfer amount)
  payment_proof_url   TEXT,
  paid_at             TIMESTAMPTZ,
  paid_by             UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payroll_period_id, user_id)
);

ALTER TABLE payroll_payouts ENABLE ROW LEVEL SECURITY;

-- Staff can only read their own payout rows.
-- Admin writes go through the service client (bypasses RLS) — no role check needed here.
CREATE POLICY "own_read" ON payroll_payouts
  FOR SELECT USING (user_id = auth.uid());
```

A payout row is created (or upserted) when the admin first opens the user's period view. Status starts `pending`. Totals are computed from entries + approved reimbursements at the time of approval.

Also update `payroll_periods` status to support the new values:
```sql
-- Migrate existing 'open' rows to 'pending'
UPDATE payroll_periods SET status = 'pending' WHERE status = 'open';
```

### Migration 4 — Fix reimbursements RLS

```sql
-- supabase migration new fix_reimbursements_rls

DROP POLICY IF EXISTS "tenant_read" ON payroll_reimbursements;

-- Staff can only read their own claims.
-- Admin reads go through the service client (bypasses RLS).
CREATE POLICY "own_read" ON payroll_reimbursements
  FOR SELECT USING (user_id = auth.uid());
```

After all migrations: `pnpm types:db`.

---

## Service changes

### `packages/services/commission-configs.ts`

Update `getCommissionRate` to accept `userId`:

```ts
export async function getCommissionRate(
  supabase: SupabaseClient,
  { tenantId, userId }: { tenantId: string; userId: string }
): Promise<{ rate: number; effectiveDate: string | null }>
```

### `packages/services/payroll.ts`

**Fix week calculation:**
```ts
import { parseISO, startOfISOWeek, endOfISOWeek, format } from "date-fns";

const d = parseISO(date);
const startDate = format(startOfISOWeek(d), "yyyy-MM-dd");
const endDate = format(endOfISOWeek(d), "yyyy-MM-dd");
```

**Fix `createPayrollEntries`:** rate lookup per-user:
```ts
const { rate } = await getCommissionRate(supabase, { tenantId, userId });
```

**New: `getPayslip`** — one call returns everything for a user+period:
```ts
export async function getPayslip(supabase, { tenantId, userId, periodId })
// Returns: { period, payout, entry, reimbursements, cupsPayTotal, reimbursementsTotal, totalPay, ratePerCup }
// payout = payroll_payouts row (null if not yet created)
// entry = null if no payroll entry exists yet for this user+period
// reimbursements = approved claims where payroll_period_id = periodId
```

**New: `bundleReimbursementsIntoPeriod`:**
```ts
// Sets payroll_period_id on approved reimbursements for this user+period
// Called when admin marks period as approved
```

**New: `upsertPayout`:**
```ts
export async function upsertPayout(supabase, { tenantId, periodId, userId })
// Creates or returns existing payroll_payouts row for this user+period
// Computes cupsPayTotal from payroll_entries, reimbursementsTotal from approved reimbursements
// in date range period.start_date..period.end_date
// totalPay = cupsPayTotal + reimbursementsTotal
```

**New: `updatePayoutStatus`:**
```ts
export async function updatePayoutStatus(supabase, { id, tenantId, status, paymentProofUrl?, paidBy? })
// status: 'approved' | 'on_hold' | 'paid'
// When status = 'paid': sets paid_at = now(), payment_proof_url, paid_by
// Also sets status = 'paid' on all reimbursements bundled into this payout
```

### `packages/services/reimbursements.ts`

**New: `updateReimbursementStatus`:**
```ts
export async function updateReimbursementStatus(supabase, { id, tenantId, status })
// Admin only. status: 'approved' | 'rejected'
```

**New: `listAllReimbursements`:**
```ts
// Admin view — all tenant claims, filterable by status
export async function listAllReimbursements(supabase, { tenantId, status? })
```

---

## API changes

### Security fix — `GET /api/payroll/entries`
Non-admin must only see own entries:
```ts
if (user.role !== "ADMIN" && params.userId && params.userId !== user.id) {
  return forbidden();
}
```

### New — `GET /api/payroll/payslip`
`?periodId=X` — returns `PayslipResponse` for the calling user.

### New — `PATCH /api/payroll/periods/[id]`
Admin only. Body: `{ status: "approved" | "on_hold" | "paid", paymentProofUrl?: string }`.

### New — `PATCH /api/reimbursements/[id]`
Admin only. Body: `{ status: "approved" | "rejected" }`.

### Update — `GET /api/reimbursements`
Add `?all=true` param — honoured for `ADMIN` role only. Returns all tenant claims.

### Update — `GET /api/commission-configs`
Switch from `?role=X` to `?userId=X`.

---

## Personal Details — bank account fields

**`apps/seller/app/[tenantSlug]/mobile/account/details/_components/MobilePersonalDetails.tsx`**

Add three new editable fields:
- **Bank Name** (e.g. BCA, BRI, Mandiri)
- **Account Number** (numeric)
- **Account Holder Name** (defaults to full name)

---

## Staff UI — "My Pay"

Rename "My Earnings" → **"My Pay"** everywhere.

### Pay list — `account/earnings/page.tsx`

Each week is a receipt stub card:

```
Week 20 · May 12–18          [Waiting]
Rp 62,500 expected
75 cups + Rp 25,000 claims      ›
```

Status language:
| DB status   | Staff sees         | Color |
|-------------|--------------------|-------|
| `pending`   | Waiting            | Gray  |
| `approved`  | Ready              | Blue  |
| `on_hold`   | Being reviewed     | Amber |
| `paid`      | Paid ✓ · 30 May   | Green |

Rate card at top: "Your rate: Rp X / cup".

### Payslip detail — `account/earnings/[periodId]/page.tsx`

Receipt-style layout — monospace feel, dashed dividers, center-aligned header:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         MY PAY
      Week 20, 2026
     May 12 – May 18
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mon 12 May   Store Kota   25 cups
Tue 13 May   Store Kota   30 cups
Wed 14 May        —
Thu 15 May   Store Kota   20 cups
Fri 16 May        —
Sat 17 May        —
Sun 18 May        —
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
75 cups × Rp 500
Cups Pay Total        Rp 37,500
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLAIMS
Mobile Data            Rp 15,000
Lunch                  Rp 10,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL                  Rp 62,500
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [ WAITING FOR PAYMENT ]

  — if paid —

  ✓ PAID · 30 May 2026
  BCA · 1234567890
  [transfer screenshot thumbnail]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- Uses `PayslipResponse` — single API call
- Bottom section changes based on status
- Transfer screenshot is viewable (tap to enlarge) — uploaded by admin as proof
- Soft callout if no bank account set: "Add your bank details in Personal Details"

---

## Admin UI — Pay Management (feature-flagged)

Feature flag: `feature-payroll`. Visible only to `ADMIN` role + flag enabled.

Entry in Account settings: **"Pay Management"** → `/mobile/account/payroll`

### Overview page — `/mobile/account/payroll`

Summary card: this week's total due across all staff, how many periods pending review.

Menu rows:
- Staff Pay Periods →
- Commission Rates →
- Reimbursements →

### Staff Pay Periods — `/mobile/account/payroll/periods`

List of all periods newest first. Each row:
```
Week 20 · May 12–18     [Pending]
4 staff · Rp 250,000 total    ›
```

Tap → list of staff in that period.

### Per-user period view — `/mobile/account/payroll/periods/[periodId]/[userId]`

Top: bank account info for this user (name, account number, holder — all copyable).
Below: same receipt layout as staff payslip view, but with admin actions.

Approved reimbursements shown bundled in. Total to transfer highlighted.

Footer actions change by status:
- `pending` → **"Approve"** (green) + **"Put On Hold"** (amber)
- `approved` → **"Mark On Hold"** (amber) + **"Pay"** (green) 
- `on_hold` → **"Approve"** (green)
- `paid` → disabled, shows paid date + screenshot

**"Pay" flow:**
1. Tap "Pay"
2. Sheet opens: shows amount + bank details again
3. Upload transfer screenshot (camera/library)
4. Tap "Confirm Payment"
5. Status → `paid`, screenshot stored, staff payslip updates

### Commission Rates — `/mobile/account/payroll/rates`

List of all staff with their current rate per cup + effective date.
Tap a user → set new rate + effective date → creates new `commission_configs` row.

### Reimbursements — `/mobile/account/payroll/reimbursements`

All tenant claims grouped by status: Pending first, then Approved, then Paid/Rejected.

Each pending claim shows: user name, type, amount, date, notes, photo thumbnail.
Actions: **Approve** / **Reject**.

Approved claims show which period they're bundled into (if any).

---

## Navigation config additions

```ts
"/mobile/account/payroll": { title: "Pay Management", subPage: true, inlineHeader: false, parent: "/mobile/account" },
"/mobile/account/payroll/periods": { title: "Staff Pay Periods", subPage: true, parent: "/mobile/account/payroll" },
"/mobile/account/payroll/rates": { title: "Commission Rates", subPage: true, parent: "/mobile/account/payroll" },
"/mobile/account/payroll/reimbursements": { title: "Reimbursements", subPage: true, parent: "/mobile/account/payroll" },
```

---

## Known issues to fix before building

These were caught during review — fix before writing any new code:

1. **`useCommissionConfig` takes `role`, not `userId`** — the hook, api client, and API route all use `role`. After the migration to per-user rates, all three need to change to accept `userId`. Hook SWR key changes from `commission-config-${role}` → `commission-config-${userId}`.

2. **`feature-payroll` flag was removed** in commit `8bf9f6a` — need to re-add it. The flag system uses PostHog (not `NEXT_PUBLIC_FEATURES`). Add `isPayrollEnabled` to the `Flags` type in `apps/seller/lib/api/flags.ts` and handle it in `apps/seller/app/api/flags/route.ts`. Set to `false` by default.

3. **`MobilePersonalDetails` is read-only** — currently only displays data via `FieldRow`. Adding bank account fields requires making it editable. Check `apps/seller/app/api/users/route.ts` — does it support PATCH? What fields does it allow updating? Bank fields need to be added to the update schema in `packages/features/users/schema.ts`.

4. **`PayslipResponse` cross-package import** — `packages/features/payroll/schema.ts` will need to import `ReimbursementResponse` from `packages/features/reimbursements/schema.ts`. Verify this doesn't create a circular dependency. Alternative: inline a minimal reimbursement shape in the payslip response.

5. **Navigation wildcard for nested admin route** — `/mobile/account/payroll/periods/[periodId]/[userId]` is a doubly-dynamic path. The `resolveRoute` function in `navigation.ts` needs a wildcard pattern and handler for this, similar to how `/mobile/analytics/daily/*/events` is handled.

6. **Storage bucket for payment proof screenshots** — task 014 separated uploads into tenant-scoped buckets. Need a `payroll-proofs` bucket (or similar) for the admin transfer screenshots. Check `apps/seller/app/api/upload/route.ts` to see how bucket names are validated.

---

## Open questions

1. **What date range determines which reimbursements get bundled?** The assumption is: all approved reimbursements for this user where `date BETWEEN period.start_date AND period.end_date`. Confirm this is correct — or should it be all approved claims with no period assigned yet, regardless of date?

2. **Who can see the payment proof screenshot?** The staff member whose payslip it is, and admins. Currently the design assumes yes. Confirm.

3. **Can a rejected reimbursement be resubmitted?** The current design allows it (staff submits a new claim). Is that correct, or should rejected claims be editable?

4. **What happens to existing `payroll_periods` rows with `status = 'open'`?** The migration migrates them to `pending`. But the existing UI already filters/displays by status — verify nothing breaks after the rename.

5. **Commission rate for new users with no config row** — defaults to 0. Should it surface an explicit warning somewhere (e.g. admin sees "No rate set" in the commission rates page) so they don't accidentally process a zero-pay week?

---

## Implementation order

1. **Migrations** — all 4, then `pnpm types:db`
2. **Service layer** — fix `getCommissionRate` (per-user), fix week calc, add `getPayslip`, `upsertPayout`, `updatePayoutStatus`, `updateReimbursementStatus`
3. **Schema updates** — commission-configs, payroll (new statuses + PayslipResponse), users (bank fields)
4. **API routes** — security fix on entries, payslip route, period PATCH, reimbursement PATCH
5. **Personal details** — bank account fields
6. **Staff UI** — "My Pay" list + receipt payslip detail
7. **Feature flag** — add `feature-payroll`
8. **Admin UI** — overview → periods → per-user pay view (with payment flow) → rates → reimbursements

---

## Files to create/modify

**New migrations:**
- `supabase/migrations/*_commission_configs_per_user.sql`
- `supabase/migrations/*_add_bank_info_to_users.sql`
- `supabase/migrations/*_add_payroll_payouts.sql`
- `supabase/migrations/*_fix_reimbursements_rls.sql`

**New pages:**
- `apps/seller/app/[tenantSlug]/mobile/account/payroll/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/payroll/periods/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/payroll/periods/[periodId]/[userId]/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/payroll/rates/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/payroll/reimbursements/page.tsx`

**New API routes:**
- `apps/seller/app/api/payroll/payslip/route.ts`
- `apps/seller/app/api/reimbursements/[id]/route.ts`

**Modified:**
- `packages/services/commission-configs.ts`
- `packages/services/payroll.ts`
- `packages/services/reimbursements.ts`
- `packages/features/commission-configs/schema.ts`
- `packages/features/payroll/schema.ts`
- `packages/features/users/schema.ts`
- `packages/features/shared/features.ts`
- `apps/seller/app/api/payroll/entries/route.ts`
- `apps/seller/app/api/payroll/periods/[id]/route.ts`
- `apps/seller/app/api/reimbursements/route.ts`
- `apps/seller/lib/api/flags.ts`
- `apps/seller/app/api/flags/route.ts`
- `apps/seller/lib/api/commission-configs.ts`
- `apps/seller/lib/hooks/commission-configs/useCommissionConfig.ts`
- `apps/seller/app/[tenantSlug]/mobile/account/details/_components/MobilePersonalDetails.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/earnings/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/earnings/[periodId]/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/_components/AccountProfile.tsx`
- `apps/seller/app/[tenantSlug]/mobile/config/navigation.ts`

---

## Session booster — read these before starting

Read every file below at the start of the session before touching any code:

```
packages/db/types.ts                                          — verify payroll_periods, payroll_entries, payroll_reimbursements, tenant_commission_configs columns after migrations
packages/services/payroll.ts                                  — full payroll service, understand createPayrollEntries + getOrCreatePayrollPeriod
packages/services/reimbursements.ts                           — full reimbursements service
packages/services/commission-configs.ts                       — getCommissionRate current signature
packages/features/payroll/schema.ts                           — current Zod schemas
packages/features/commission-configs/schema.ts                — current schema, spot the role vs userId mismatch
packages/features/reimbursements/schema.ts                    — current schema
packages/features/users/schema.ts                             — UserResponse shape, check if bank fields exist post-migration
apps/seller/app/api/payroll/entries/route.ts                  — spot the security hole
apps/seller/app/api/payroll/periods/[id]/route.ts             — current PATCH handler
apps/seller/app/api/reimbursements/route.ts                   — current GET + POST
apps/seller/app/api/users/route.ts                            — does it support PATCH? what fields?
apps/seller/app/api/flags/route.ts                            — how PostHog flags are evaluated + returned
apps/seller/lib/api/flags.ts                                  — Flags type definition
apps/seller/lib/context/FlagsContext.tsx                      — how flags are consumed in UI
apps/seller/lib/hooks/commission-configs/useCommissionConfig.ts — current hook signature
apps/seller/app/[tenantSlug]/mobile/account/earnings/page.tsx — existing My Earnings UI to revamp
apps/seller/app/[tenantSlug]/mobile/account/earnings/[periodId]/page.tsx — existing period detail to revamp
apps/seller/app/[tenantSlug]/mobile/account/details/_components/MobilePersonalDetails.tsx — read-only, needs bank fields
apps/seller/app/[tenantSlug]/mobile/config/navigation.ts      — understand resolveRoute wildcard pattern before adding new routes
apps/seller/app/api/upload/route.ts                           — understand bucket validation before adding payroll-proofs bucket
```
