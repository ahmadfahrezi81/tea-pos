# Task 006 — Payroll & Reimbursements

## Overview

Five areas of work:

1. **Migrations** — Migrate `commission_configs` from per-user to per-role (`USER`, `DRIVER`, `SUPPLIER`). Add `reimbursements` table.
2. **Service + schema updates** — Update `getCommissionRate` to accept `role` instead of `userId`. Update feature schemas and API routes to match.
3. **Earnings list** — New page in More tab: list of payroll periods (weeks) with the seller's totals per week. Commission rate for USER role shown at the top.
4. **Period detail** — Tap a week → day-by-day breakdown of entries for that period.
5. **Reimbursements** — Staff submit expense claims (mobile data, lunch, gasoline). Types available vary by role.

**Driver & supplier payroll calculation is deferred** — the role and commission config are laid down here, but the actual payroll calculation logic for those roles is a future task. See the Deferred section.

---

## Key Files

**Migrations (new):**
- `supabase/migrations/*_commission_configs_per_role.sql`
- `supabase/migrations/*_add_reimbursements.sql`

**Being modified (service + schema):**
- `packages/services/commission-configs.ts` — `getCommissionRate` signature changes
- `packages/services/payroll.ts` — `createPayrollEntries` passes `role: 'USER'` instead of `userId`
- `packages/features/commission-configs/schema.ts` — replace `userId` with `role`
- `apps/seller/app/api/commission-configs/route.ts` — update query param from `userId` to `role`

**New (service + API + hook):**
- `packages/services/reimbursements.ts`
- `packages/features/reimbursements/schema.ts`
- `apps/seller/app/api/reimbursements/route.ts`
- `apps/seller/lib/api/reimbursements.ts`
- `apps/seller/lib/hooks/reimbursements/useReimbursements.ts`
- `apps/seller/lib/hooks/commission-configs/useCommissionConfig.ts`

**New (UI):**
- `apps/seller/app/[tenantSlug]/mobile/account/earnings/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/earnings/[periodId]/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/reimbursements/page.tsx`

**Being modified (UI):**
- `apps/seller/app/[tenantSlug]/mobile/account/_components/AccountProfile.tsx`

**Existing (verify — may need fixes):**
- `apps/seller/app/api/payroll/entries/route.ts`
- `apps/seller/app/api/payroll/periods/route.ts`
- `apps/seller/lib/hooks/payroll/usePayroll.ts`
- `packages/features/payroll/schema.ts`

---

## Ticket 0 — Migrations

### 0a — Commission configs: per-user → per-role

Current schema: `commission_configs` has `user_id UUID REFERENCES profiles(id)` (nullable = tenant-wide default), `effective_date`, `rate_per_cup`.

New schema: replace `user_id` with `role TEXT NOT NULL CHECK (role IN ('USER', 'DRIVER', 'SUPPLIER'))`.

```sql
-- supabase migration new commission_configs_per_role

-- 1. Add the new role column (default USER so existing rows survive)
ALTER TABLE commission_configs
  ADD COLUMN role TEXT NOT NULL DEFAULT 'USER'
  CHECK (role IN ('USER', 'DRIVER', 'SUPPLIER'));

-- 2. Drop the old user_id column and its FK
ALTER TABLE commission_configs DROP CONSTRAINT IF EXISTS commission_configs_user_id_fkey;
ALTER TABLE commission_configs DROP COLUMN IF EXISTS user_id;

-- 3. Prevent duplicate configs for the same tenant + role + effective_date
ALTER TABLE commission_configs
  ADD CONSTRAINT commission_configs_tenant_role_date_unique
  UNIQUE (tenant_id, role, effective_date);
```

After pushing: `pnpm types:db`.

**Commission lookup model (Option A — trust + assignment):**

| Role | Rate per cup | Calculation basis (current) |
|---|---|---|
| `USER` | e.g. Rp 500 | Cups sold during their own store sessions (seller) |
| `DRIVER` | e.g. Rp 250 | *Deferred — trust + store assignment (future task)* |
| `SUPPLIER` | e.g. Rp 250 | *Deferred — trust + store assignment (future task)* |

For now, only the `USER` rate is actively used in payroll calculations. `DRIVER` and `SUPPLIER` config rows can be created by admins but no payroll entries are generated for them yet.

---

## Ticket 1 — Service + schema updates

### 1a — Update `getCommissionRate`

**`packages/services/commission-configs.ts`**

Change the function signature from:
```ts
getCommissionRate(supabase, { tenantId, userId })
// → user-specific row first, then null user_id fallback
```

To:
```ts
getCommissionRate(supabase, { tenantId, role }: { tenantId: string; role: 'USER' | 'DRIVER' | 'SUPPLIER' })
// → most recent config row for this tenant + role where effective_date <= today
```

```ts
export async function getCommissionRate(
  supabase: SupabaseClient,
  { tenantId, role }: { tenantId: string; role: string }
): Promise<{ rate: number; effectiveDate: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('commission_configs')
    .select('rate_per_cup, effective_date')
    .eq('tenant_id', tenantId)
    .eq('role', role)
    .lte('effective_date', today)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { rate: data?.rate_per_cup ?? 0, effectiveDate: data?.effective_date ?? today };
}
```

If no config exists for the role, rate defaults to 0 (explicit, not silent). The calling code should handle this.

### 1b — Update `createPayrollEntries`

**`packages/services/payroll.ts`**

The existing call:
```ts
const { rate } = await getCommissionRate(supabase, { tenantId, userId });
```

Changes to:
```ts
const { rate } = await getCommissionRate(supabase, { tenantId, role: 'USER' });
```

All session-based payroll entries are for the `USER` role (sellers). The `userId` param is no longer needed in this call.

### 1c — Update feature schema

**`packages/features/commission-configs/schema.ts`**

Replace `userId` with `role` throughout:
- `CommissionConfigResponse`: `role: z.enum(['USER', 'DRIVER', 'SUPPLIER'])` instead of `userId`
- `CreateCommissionConfigInput`: `role: z.enum(...)` instead of `userId`
- `ListCommissionConfigsQuery`: add optional `role` param

### 1d — Update API route

**`apps/seller/app/api/commission-configs/route.ts`**

`GET ?role=USER` → returns the current active config for that role (most recent `effective_date` ≤ today). Valid values: `USER`, `DRIVER`, `SUPPLIER`.

Remove any `userId`-based query logic.

---

## Ticket 2 — Audit existing payroll backend

After the migrations and service updates, verify the payroll endpoints work correctly.

**`GET /api/payroll/entries?userId={id}`**
- Accepts `userId` as a query param (check `ListPayrollEntriesQuery`).
- Scopes to current tenant via cookie — does NOT trust a caller-supplied `tenantId`.
- **Security fix required:** this route uses `getServiceClient()` (bypasses RLS). A seller must not be able to query another user's entries by swapping `userId`. Add an ownership check: if the calling user's role is not `ADMIN`, assert `queryUserId === requestUser.id` and return 403 otherwise.
- Also verify: does `ListPayrollEntriesQuery` accept a `periodId` filter? Ticket 4 needs `usePayrollEntries({ userId, periodId })`. If not, add it here.

**`GET /api/payroll/periods`**
- Returns all periods for the tenant, newest first.

**Hook verification — do this before building UI:**
- Confirm `usePayrollPeriods()` exists in `lib/hooks/payroll/usePayroll.ts` and exposes `{ periods }` where each period has `id`, `startDate`, `endDate`, `status`. Create it if missing.
- Confirm `useStore()` exposes `assignedStores: { id: string; name: string }[]`. If the shape differs, adjust the store name resolution in Ticket 4 accordingly.

**Fix any issues before building UI.**

---

## Ticket 3 — Earnings list page

### Design

```
← Account

My Earnings

┌──────────────────────────────────────────┐
│  Seller Rate                             │
│  Rp 500 per cup                          │
│  Effective 1 Jan 2026                    │
└──────────────────────────────────────────┘

Week 20 · May 12–18        open
75 cups · Rp 37,500                       ›

Week 19 · May 5–11         paid ✓
100 cups · Rp 50,000                      ›

Week 18 · Apr 28 – May 4   paid ✓
60 cups · Rp 30,000                       ›
```

**Week number:** ISO week number via `getISOWeek(parseISO(period.startDate))` from `date-fns`. Use `parseISO` (not `new Date()`) to safely parse the `YYYY-MM-DD` date string — `new Date("2026-05-12")` is interpreted as UTC midnight and can shift to the wrong local date on some runtimes. Format: `"Week N · [startDate]–[endDate]"`. Start date uses day + month only (e.g. "May 12"), end date same. If the range spans two months, show both (e.g. "Apr 28 – May 4").

### Data

- **Rate card:** `useCommissionConfig('USER')` → shows `ratePerCup` + `effectiveDate`. Label: "Seller Rate". If rate is 0 or no config exists, show "No rate configured" in amber.
- **Period list:** `usePayrollPeriods()` + `usePayrollEntries({ userId: profile?.id })`. Compute per-period totals client-side by grouping entries by `payrollPeriodId`. Volume is small (one entry per working day).
- Periods where the seller has no entries: show "No shifts · Rp 0" in muted text. Still show the row (they can see the week existed).

### Status badge

| `status` | Display |
|---|---|
| `open` | Gray pill "Open" |
| `processing` | Blue pill "Processing" |
| `paid` | Green pill "Paid ✓" |

### File

**`apps/seller/app/[tenantSlug]/mobile/account/earnings/page.tsx`** — client component, uses `useAuth`, `usePayrollPeriods()`, `usePayrollEntries({ userId: profile?.id })`, and `useCommissionConfig('USER')`.

---

## Ticket 4 — Period detail page

### Design

```
← My Earnings

Week 20 · May 12–18, 2026   [Paid ✓]

Total: 75 cups · Rp 37,500
Rate: Rp 500 / cup

─────────────────────────────────────────

Mon 12 May   Store Kota     25 cups   Rp 12,500
Tue 13 May   Store Kota     30 cups   Rp 15,000
Wed 14 May   —              —         —
Thu 15 May   Store Kota     20 cups   Rp 10,000
Fri 16 May   —              —         —
Sat 17 May   —              —         —
Sun 18 May   —              —         —
```

- All 7 days shown (Mon → Sun), always.
- Days with an entry: store name, cups, gross pay.
- Days without an entry: three dashes across the row (muted).
- If the seller worked at two stores on the same day (two entries, two different `dailySummaryId` values), show two rows for that day, each indented under the date.
- **`ratePerCup` shown is from the entry** (`entry.ratePerCup`) — this is the snapshotted rate at the time of close, not the current config. Historical entries are immutable.
- **Rate header line:** if all entries in the period share the same `ratePerCup`, show `Rate: Rp X / cup`. If they differ (rate changed mid-week), omit the rate line entirely — per-row amounts already make it clear.
- Total at the top is the sum of all entry rows in the period.

### Store name resolution

`PayrollEntryResponse` has `storeId` but no `storeName`. Resolve from `useStore()`'s `assignedStores` list. If not found there (edge case: was unassigned after the fact), fall back to last 8 chars of `storeId`.

### File

**`apps/seller/app/[tenantSlug]/mobile/account/earnings/[periodId]/page.tsx`** — client component, reads `periodId` from params, calls `usePayrollPeriods()` + `usePayrollEntries({ userId: profile?.id, periodId })`.

---

## Ticket 5 — AccountProfile entry points

**`apps/seller/app/[tenantSlug]/mobile/account/_components/AccountProfile.tsx`**

Add both rows to the existing **"Account Settings"** card (the white `div` that already contains Personal Details, Notifications, Language). Place them between "Personal Details" and "Notifications".

```tsx
import { Banknote, ReceiptText } from "lucide-react";

<SettingsRow
  icon={<Banknote size={20} className="text-gray-900" />}
  label="My Earnings"
  sublabel="Commission & payroll history"
  onClick={() => navigation.push(url("/mobile/account/earnings"))}
/>
<SettingsRow
  icon={<ReceiptText size={20} className="text-gray-900" />}
  label="Reimbursements"
  sublabel="Submit expense claims"
  onClick={() => navigation.push(url("/mobile/account/reimbursements"))}
/>
```

"My Earnings" first, "Reimbursements" second, both above "Notifications".

---

## Ticket 6 — Reimbursements

### When to use

A staff member incurs a personal expense on behalf of the business — mobile data top-up, lunch during a long shift, or fuel for a delivery. They submit a claim with the amount and optionally a receipt photo. A manager approves it, and it gets paid out (manually or bundled with payroll).

### Types per role

| Type | Label | `USER` | `DRIVER` | `SUPPLIER` |
|---|---|---|---|---|
| `mobile_data` | Mobile Data | ✓ | ✓ | ✓ |
| `lunch` | Lunch | ✓ | ✓ | ✓ |
| `gasoline` | Gasoline | — | ✓ | — |

The type list shown in the UI is filtered by `profile.role` — a USER never sees the Gasoline option. The DB does not enforce this per-role restriction (the check constraint just covers valid type strings), so enforcement is UI + API layer.

### DB migration

**`supabase migration new add_reimbursements`**

```sql
CREATE TABLE reimbursements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  user_id          UUID NOT NULL REFERENCES profiles(id),
  store_id         UUID REFERENCES stores(id),
  payroll_period_id UUID REFERENCES payroll_periods(id),
  type             TEXT NOT NULL CHECK (type IN ('mobile_data', 'lunch', 'gasoline')),
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date             DATE NOT NULL,
  notes            TEXT,
  photo_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read" ON reimbursements
  FOR SELECT USING (tenant_id = ANY(user_tenant_ids()));

CREATE POLICY "tenant_insert" ON reimbursements
  FOR INSERT WITH CHECK (
    tenant_id = ANY(user_tenant_ids())
    AND user_id = auth.uid()
  );

-- UPDATE intentionally omitted here — approval/rejection is admin-side.
-- Add a manager UPDATE policy when the admin approval UI is built.
```

After migration: `pnpm types:db`.

`store_id` is optional context — useful for filtering and reporting but not required. `payroll_period_id` is null on creation and set when a manager batches the reimbursement into a period for payout.

### Backend

**`packages/features/reimbursements/schema.ts`**

```ts
export const REIMBURSEMENT_TYPES = ['mobile_data', 'lunch', 'gasoline'] as const
export type ReimbursementType = typeof REIMBURSEMENT_TYPES[number]

export const REIMBURSEMENT_TYPE_LABELS: Record<ReimbursementType, string> = {
  mobile_data: 'Mobile Data',
  lunch: 'Lunch',
  gasoline: 'Gasoline',
}

export const REIMBURSEMENT_TYPES_BY_ROLE: Record<string, ReimbursementType[]> = {
  USER:     ['mobile_data', 'lunch'],
  DRIVER:   ['mobile_data', 'lunch', 'gasoline'],
  SUPPLIER: ['mobile_data', 'lunch'],
}

export const CreateReimbursementInput = z.object({
  type:     z.enum(REIMBURSEMENT_TYPES),
  amount:   z.number().int().positive(),
  date:     z.string(),           // YYYY-MM-DD
  storeId:  UUIDSchema.optional(),
  notes:    z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
})

export const ReimbursementResponse = z.object({
  id:               z.string(),
  userId:           z.string(),
  storeId:          z.string().nullable(),
  payrollPeriodId:  z.string().nullable(),
  type:             z.enum(REIMBURSEMENT_TYPES),   // 'mobile_data' | 'lunch' | 'gasoline'
  amount:           z.number(),
  date:             z.string(),
  notes:            z.string().nullable(),
  photoUrl:         z.string().nullable(),
  status:           z.enum(['pending', 'approved', 'rejected', 'paid']),
  createdAt:        z.string(),
})

export const ListReimbursementsQuery = z.object({
  limit: z.coerce.number().int().positive().optional(),
})
```

**`packages/services/reimbursements.ts`**

- `createReimbursement(supabase, { tenantId, userId, type, amount, date, storeId?, notes?, photoUrl? })` — inserts row, logs `reimbursement_submitted` activity.
- `listMyReimbursements(supabase, { tenantId, userId, limit? })` — returns own claims newest-first.

**`apps/seller/app/api/reimbursements/route.ts`**

- `GET` → `listMyReimbursements` scoped to calling user
- `POST` → validate `CreateReimbursementInput` → `getRequestUser()` → `createReimbursement`

**`apps/seller/lib/api/reimbursements.ts`** — `reimbursementsApi.list()`, `reimbursementsApi.create(input)`

**`apps/seller/lib/hooks/reimbursements/useReimbursements.ts`** — reads `userId` from `useAuth()` internally (no params). SWR key `reimbursements-{userId}`. Exposes `{ claims, isLoading, create, mutate }`.

**`apps/seller/lib/hooks/commission-configs/useCommissionConfig.ts`** — accepts `role: string`. SWR key `commission-config-{role}`. Calls `commissionConfigsApi.get({ role })`. Exposes `{ ratePerCup, effectiveDate, isLoading }`.

### UI

**`apps/seller/app/[tenantSlug]/mobile/account/reimbursements/page.tsx`**

**Section 1 — Submit form:**

- **Type picker:** horizontal scrollable pills, showing only the types allowed for `profile.role` (use `REIMBURSEMENT_TYPES_BY_ROLE[profile.role]`). Required.
- **Amount:** numeric input, labeled "Amount (Rp)". Required. No cents — integer only.
- **Date:** defaults to today. `<input type="date">`. Required.
- **Notes:** optional textarea, 2 rows.
- **Photo:** optional receipt photo. Camera only — `<input capture="environment" accept="image/*">`. Compress using `browser-image-compression` before upload (matching the pattern used elsewhere in the codebase — check if a shared `compressPhoto()` wrapper already exists; use it if so, otherwise call the library directly). Upload to Supabase Storage under `reimbursements/{userId}/{filename}`. **Note:** verify the `reimbursements` Storage bucket exists before implementing — create it (public read, authenticated write) if not.
- **Submit "Submit Claim":** disabled until type + amount filled. On submit → upload photo if present → `reimbursementsApi.create()` → `mutate()` → show "Claim submitted" inline (stay on page) → clear form.

**Section 2 — My Claims (read-only list):**

Sorted newest-first. Show: type label, date, amount (Rp), status badge.

| Status | Badge |
|---|---|
| `pending` | Gray "Pending" |
| `approved` | Blue "Approved" |
| `rejected` | Red "Rejected" |
| `paid` | Green "Paid ✓" |

Empty state: "No claims yet."

---

## Implementation Phases (updated)

### Phase 1 — Migrations

1. **T0a** — `supabase migration new commission_configs_per_role` → write + push.
2. **T0b** — `supabase migration new add_reimbursements` → write + push.
3. Run `pnpm types:db` after both.

**Verify:** `commission_configs` has `role` column. `reimbursements` table exists with correct columns and RLS.

**After types are regenerated:** update the `commission_configs` entry in `CLAUDE.md` Key Tables — remove the `user_id IS NULL` fallback language and describe the new per-role model.

---

### Phase 2 — Service + schema

4. **T1a–d** — Update `getCommissionRate`, `createPayrollEntries`, commission feature schema, commission API route.
5. **T6 backend** — Write `packages/features/reimbursements/schema.ts`, `packages/services/reimbursements.ts`, `apps/seller/app/api/reimbursements/route.ts`, api client, hook.

**Verify:** `GET /api/commission-configs?role=USER` returns correct rate. `POST /api/reimbursements` creates a row. `GET /api/reimbursements` returns own claims only.

---

### Phase 3 — Backend audit

6. **T2** — Verify payroll entry + period endpoints return correct shaped data for a user.

---

### Phase 4 — Earnings UI

7. **T3 + T5** — Build `account/earnings/page.tsx` + add both rows to `AccountProfile.tsx`.
8. **T4** — Build `account/earnings/[periodId]/page.tsx`.

---

### Phase 5 — Reimbursements UI

9. **T6 UI** — Build `account/reimbursements/page.tsx`.

**Verify:** Account → My Earnings shows period list. Account → Reimbursements → type picker shows only role-appropriate types. Submit a claim → appears in list as "Pending". Photo capture opens camera directly.

---

## Deferred

**Driver & supplier payroll calculation** — Deferred to a future task. The rate config in `commission_configs` is laid in this task. When the time comes, the calculation will use Option A (trust + store assignment):
- Driver and supplier are assigned to stores via `user_store_assignments` (same as sellers)
- Their payroll basis is `daily_summaries.total_cups` across all assigned stores for days they appear in context (no session lock needed — trust-based)
- A new code path in `createPayrollEntries` (or a separate `createDriverSupplierEntries` function) will handle this

No extra tables needed for Option A — the data is already there.

---

## Open Questions

1. **Existing commission config data** — Are there any rows in `commission_configs` with the old `user_id` set (non-null)? If so, the migration will set them all to `role = 'USER'` via the DEFAULT. Handle manually before deploying if any row had a different intent.

2. **ISO week number display** — `date-fns` is already a dependency in this project (used in cron routes). Use `getISOWeek(date)` for the week number. Verify the import path before building the earnings list.
