# Task 018 — Payroll: Commissions + Claims Separation

## Conceptual Model

Payroll is the parent concept. It has two children:

```
payroll_periods  (weekly cycle, parent)
├── payroll_commissions   — cups × rate_per_unit, auto-calculated on close-day
└── payroll_claims        — staff submits, manually reviewed + approved

payroll_payouts  (weekly payment per person, paid one week after the period ends)
  commissions_total + claims_total = total_pay
```

Both children share the same `payroll_period_id`. Both are reviewed separately in
the backoffice. Both are paid together in one weekly transfer per person.

Types for both are **tenant-defined in the DB** (not hardcoded enums). Admin creates
commission types (e.g. "Seller Standard") and claim types (e.g. "Lunch Allowance")
with their frequency. Eligibility per user per claim type is set explicitly by admin.
The backend is the single source of truth — the frontend renders what it receives.

---

### T+1 Payout Cycle

Payouts are staggered by one week. Week 1 work (Mon–Sun) is paid at the end of
Week 2, not at the end of Week 1.

```
Week 1 (Jan 1–7):   commissions + claims accumulate
Week 2 (Jan 8–14):  admin reviews Week 1 in backoffice
                    staff can still submit claims for Week 1 (deadline: end of Week 2)
End of Week 2:      admin approves → pays → one transfer per person for Week 1
```

**Why this matters:**
- Backoffice has a full week to review both commissions and claims before paying
- Staff aren't under pressure to submit claims the same day — they have until the
  review window closes (end of the following week)
- T+1 makes session validation reliable: by the time staff submits Week 1 claims
  during Week 2, all of Week 1's sessions are already in the DB
- Tradeoff: first payout is two weeks after start date (float week) — communicate
  clearly to staff

**Period assignment rule:**
`payroll_period_id` is resolved from the **claim's `date` field** (when the expense
happened), not today's submission date. A claim submitted on Monday for last Friday's
lunch belongs to last week's period.

```ts
// On claim create: use the expense date, not now
const period = await getOrCreatePayrollPeriod(supabase, { tenantId, date: claim.date });
```

**Deadline validation:**
Once a period reaches `approved` or `paid` status, no new claims can be added to it.
API rejects with: "This period is closed for new claims."

---

### Session-Based Claim Validation

Applies **only to `weekly` frequency claim types**. Monthly and one_time types skip
this check — eligibility row is sufficient.

```ts
// In createPayrollClaim, only when claimType.frequency === 'weekly':
const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
const dayStart = subHours(startOfDay(parseISO(date)), tzOffset).toISOString();
const dayEnd   = subHours(endOfDay(parseISO(date)), tzOffset).toISOString();

const { count } = await supabase
    .from("store_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .gte("started_at", dayStart)
    .lte("started_at", dayEnd);

if ((count ?? 0) === 0) {
    throw Object.assign(new Error("No session found for this date"), { status: 422 });
}
```

Sessions stored UTC. Indonesia is UTC+7 (`TIMEZONE_OFFSET=7`). Day boundaries must
use the app timezone — never raw `startOfDay(parseISO(date))`.

**Seller UI benefit — date picker replaced by worked-day list:**
Instead of a free date picker, the claim form shows only dates the user had a session
in the claimable period. Staff picks from real working days — no invalid dates possible.
This is only used for weekly claims; monthly/one_time get a standard date picker.

---

### Key Rule: Period Assignment

`payroll_period_id` is assigned at creation time — never later.
- Commission: close-day triggers creation → period resolved from `daily_summary.date`
- Claim: staff submits → period resolved from `claim.date` (expense date, not today)
- No "bundling" step, no side effects, no nullable period FK

This replaces the old `bundleReimbursementsIntoPeriod` side-effect pattern.

---

## Naming Changes

| Old name | New name | Scope |
|---|---|---|
| `payroll_entries` | `payroll_commissions` | DB table |
| `payroll_reimbursements` | `payroll_claims` | DB table |
| `payroll_entries_*` constraints | `payroll_commissions_*` | DB FK names |
| `payroll_reimbursements_*` constraints | `payroll_claims_*` | DB FK names |
| `packages/services/reimbursements.ts` | `packages/services/payroll-claims.ts` | Service file |
| `packages/features/reimbursements/` | `packages/features/payroll-claims/` | Feature package |
| `PayrollEntry*` types/schemas | `PayrollCommission*` | Zod + TS types |
| `Reimbursement*` types/schemas | `PayrollClaim*` | Zod + TS types |
| `*reimbursement*` API routes | `*claims*` | Route paths |
| `*reimbursement*` hooks | `*claims*` | Hook names |
| `cups_pay_total` | `commissions_total` | DB column + code |
| `rate_per_cup` (on commission entry) | `rate_per_unit` | DB column + code |

---

## Goals

1. Rename `payroll_entries` → `payroll_commissions` and `payroll_reimbursements` → `payroll_claims` everywhere
2. `payroll_claims.payroll_period_id` is non-nullable — assigned at submit time
3. Claims are standalone for submission + approval (no payroll coupling there)
4. Claims are included in the weekly payout alongside commissions (one transfer)
5. Remove `bundleReimbursementsIntoPeriod` — no longer needed
6. Add `payroll_user_info` for per-user rate + bank details (out of `users` table)
7. Add `payroll_commission_types` — tenant-managed commission type labels
8. Add `payroll_claim_types` — tenant-managed claim types with frequency
9. Add `payroll_claim_eligibility` — per-user, per-type access control (no hardcoded enums)
10. No PostHog checks in payroll services — all logic is DB-driven
11. Both apps updated throughout

---

## DB Schema

### New table: `payroll_user_info`

Per-user payroll config. Replaces bank fields in `users`. `rate_per_cup` is the
canonical commission rate for this user — snapshotted into `payroll_commissions.rate_per_unit`
at calc time so historical entries are immutable to future rate changes.

```sql
create table payroll_user_info (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id),
  user_id                uuid not null references users(id),
  commission_type_id     uuid references payroll_commission_types(id),
  rate_per_cup           integer not null,
  bank_name              text,
  bank_account_number    text,
  bank_account_holder    text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now(),
  unique (tenant_id, user_id)
);
```

RLS: user can read/update their own row. Admin can read/update any row in their tenant.

Migration: copy `bank_name`, `bank_account_number`, `bank_account_holder` from `users`
into this table, then drop those columns from `users`.

Also seed `rate_per_cup` from `tenant_commission_configs` where `user_id IS NOT NULL` —
that table already has per-user overrides, use them as the initial values. For users
without a `tenant_commission_configs` row, either require admin to set the rate manually
or seed from the tenant-wide default row (`user_id IS NULL`).

---

### New table: `payroll_commission_types`

Tenant-defined label for commission categories (e.g. "Seller Standard", "Driver").
Used for grouping/reporting; the actual rate is on `payroll_user_info`, not here.

```sql
create table payroll_commission_types (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id),
  name       text not null,
  slug       text not null,   -- e.g. SELLER_STANDARD, DRIVER_STANDARD
  is_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, slug)
);
```

RLS: admin can manage. Users can read.

---

### New table: `payroll_claim_types`

Tenant-defined claim types. `frequency` controls validation and duplicate-check logic.

```sql
create table payroll_claim_types (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id),
  name       text not null,
  slug       text not null,
  frequency  text not null check (frequency in ('weekly', 'monthly', 'one_time')),
  is_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, slug)
);
```

RLS: admin can manage. Users can read types they are eligible for (via `payroll_claim_eligibility`).

Examples of what admin might create:
- `{ name: "Lunch Allowance", slug: "LUNCH", frequency: "weekly" }`
- `{ name: "Mobile Data", slug: "MOBILE_DATA", frequency: "monthly" }`
- `{ name: "Equipment Bonus", slug: "BONUS_EQUIPMENT", frequency: "one_time" }`

No hardcoded claim type enums anywhere in code. Types are whatever the tenant defines.

---

### New table: `payroll_claim_eligibility`

Which users can submit which claim types. Admin manages this per user.
Delete and recreate rows if eligibility changes (no update needed).

```sql
create table payroll_claim_eligibility (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  user_id       uuid not null references users(id),
  claim_type_id uuid not null references payroll_claim_types(id),
  created_at    timestamptz default now(),
  unique (tenant_id, user_id, claim_type_id)
);
```

RLS: admin can manage. Users can read their own eligibility rows.

No `updated_at`. Use soft-delete: add `removed_at timestamptz` instead of hard-deleting
rows. When eligibility is revoked, set `removed_at = now()`. All eligibility checks
filter `WHERE removed_at IS NULL`. This preserves history so a disputed claim can be
verified ("was the user eligible at submission time?") without any extra audit tables.

```sql
create table payroll_claim_eligibility (
  ...
  removed_at  timestamptz,   -- null = active
  ...
);
-- active eligibility check:
-- WHERE tenant_id = $1 AND user_id = $2 AND removed_at IS NULL
```

`setUserClaimEligibility` in the service: soft-delete removed types (`set removed_at = now()`),
insert new ones. Never hard-delete.

---

### Rename: `payroll_entries` → `payroll_commissions`

Add `commission_type_id` and `rate_per_unit` columns. `commission_type_id` links to the
label for this commission entry. `rate_per_unit` is snapshotted from `payroll_user_info.rate_per_cup`
at calculation time.

```sql
alter table payroll_entries rename to payroll_commissions;

alter table payroll_commissions
  add column commission_type_id uuid not null references payroll_commission_types(id),
  add column rate_per_unit      integer not null;
-- update FK constraint names to payroll_commissions_*
```

No `updated_at` — immutable after insert.

---

### Rename + update: `payroll_reimbursements` → `payroll_claims`

```sql
alter table payroll_reimbursements rename to payroll_claims;

-- claim_type_id links to the DB-managed type definition
alter table payroll_claims
  add column claim_type_id uuid not null references payroll_claim_types(id);

-- payroll_period_id is now required (non-nullable)
-- before running: verify all existing rows have payroll_period_id set,
-- or backfill from the claim's date column via getOrCreatePayrollPeriod logic
alter table payroll_claims
  alter column payroll_period_id set not null;

-- payment tracking
alter table payroll_claims
  add column payment_proof_url  text,
  add column paid_at            timestamptz,
  add column paid_by            uuid references users(id);
-- update FK constraint names to payroll_claims_*

-- duplicate-claim race condition guards
-- weekly: one claim per user per type per period
create unique index payroll_claims_weekly_unique
  on payroll_claims (tenant_id, user_id, claim_type_id, payroll_period_id)
  where status != 'rejected';

-- one_time: never more than one non-rejected claim per user per type, ever
create unique index payroll_claims_one_time_unique
  on payroll_claims (tenant_id, user_id, claim_type_id)
  where status != 'rejected';
-- Note: weekly claims also satisfy one_time uniqueness within a period, but the
-- one_time index above is broader (spans all periods). Apply correct index per
-- frequency — the service enforces this at the application layer; the DB is the
-- final safety net for concurrent inserts.
```

Status flow: `pending → approved → paid`. Manual transfers only. Admin uploads proof
to confirm payment. No failure state needed. `on_hold` exists in DB but is not used in
the current UI flow.

No `updated_at` — use `reviewed_at` / `paid_at` for state transitions.

---

### `payroll_periods` — verify unique constraint + fix `getOrCreatePayrollPeriod`

Confirm `unique (tenant_id, start_date)` exists (or add it). The service function must
use `ON CONFLICT` — never a check-then-insert pattern:

```sql
-- add if missing:
alter table payroll_periods
  add constraint payroll_periods_tenant_start_date_key unique (tenant_id, start_date);
```

```ts
// In getOrCreatePayrollPeriod — safe under concurrent requests:
const { data } = await supabase
    .from("payroll_periods")
    .upsert({ tenant_id, start_date, end_date, status: "pending" }, {
        onConflict: "tenant_id,start_date",
        ignoreDuplicates: false,
    })
    .select()
    .single();
```

Two simultaneous close-day requests will race to create the same period. Only one will
win the insert; the other gets the existing row back. Without this, you get duplicate
period rows and broken payout math.

---

### `payroll_payouts` — column rename only

```sql
alter table payroll_payouts
  rename column cups_pay_total to commissions_total;

alter table payroll_payouts
  rename column reimbursements_total to claims_total;
```

Both columns confirmed in `packages/db/types.ts`. No `updated_at` — tracked by `paid_at`.

---

## Service Changes

### Rename: `packages/services/reimbursements.ts` → `packages/services/payroll-claims.ts`

Functions renamed:

| Old | New |
|---|---|
| `createReimbursement` | `createPayrollClaim` |
| `updateReimbursementStatus` | `updatePayrollClaimStatus` |
| `listAllReimbursements` | `listAllPayrollClaims` |
| `listMyReimbursements` | `listMyPayrollClaims` |

Add:
```ts
markPayrollClaimPaid(supabase, { id, tenantId, actorId, paymentProofUrl })
  // sets status = 'paid', paid_at, paid_by, payment_proof_url

getClaimableDates(supabase, { tenantId, userId, periodId })
  // returns dates the user had a store_session in the given period
  // used by seller UI to populate the date chip list (weekly claims only)

getClaimableTypes(supabase, { tenantId, userId, periodId })
  // returns payroll_claim_types the user is eligible for (via payroll_claim_eligibility)
  // with a claimable flag computed server-side (see validation logic below)
  // response shape: { id, name, frequency, claimable }[]
```

Remove: `validateClaimAmount` — no max_amount concept, no claim configs table.

**Full validation order in `createPayrollClaim`:**
```
1. Resolve period from claim.date → getOrCreatePayrollPeriod(supabase, { tenantId, date: claim.date })
2. Check period.status — reject if 'approved' or 'paid' ("This period is closed for new claims.")
3. Check payroll_claim_eligibility — reject if no row for (tenantId, userId, claim_type_id)
4. Check frequency (resolve from payroll_claim_types.frequency):
   - weekly:    reject if a non-rejected claim already exists for this period + claim_type_id
   - monthly:   reject if a non-rejected claim already exists this calendar month + claim_type_id
   - one_time:  reject if any non-rejected claim ever exists for this user + claim_type_id
                (rejected claims do NOT block re-submission — they reset the allowance)
5. If frequency === 'weekly': check store_sessions — reject if no session for user on claim.date
6. Insert claim with claim_type_id and payroll_period_id already set
```

No PostHog checks in this service.

---

### New: `packages/services/payroll-user-info.ts`

```ts
getPayrollUserInfo(supabase, { tenantId, userId })
upsertPayrollUserInfo(supabase, { tenantId, userId, commissionTypeId, ratePerCup, bankName, bankAccountNumber, bankAccountHolder })
```

---

### New: `packages/services/payroll-commission-types.ts`

```ts
listPayrollCommissionTypes(supabase, { tenantId })
createPayrollCommissionType(supabase, { tenantId, name, slug })
updatePayrollCommissionType(supabase, { id, tenantId, name, isEnabled })
```

---

### New: `packages/services/payroll-claim-types.ts`

```ts
listPayrollClaimTypes(supabase, { tenantId })
createPayrollClaimType(supabase, { tenantId, name, slug, frequency })
updatePayrollClaimType(supabase, { id, tenantId, name, isEnabled })
listUserClaimEligibility(supabase, { tenantId, userId })
setUserClaimEligibility(supabase, { tenantId, userId, claimTypeIds })
  // replaces all eligibility rows for this user (delete + insert)
```

---

### Updated: `packages/services/payroll.ts`

- Rename all `payroll_entries` → `payroll_commissions` in queries
- Rename `cups_pay_total` → `commissions_total` and `reimbursements_total` → `claims_total` in payout insert/update
- Rename `rate_per_cup` → `rate_per_unit` in commission insert
- Remove `bundleReimbursementsIntoPeriod` entirely
- `upsertPayout`: query claims by `payroll_period_id + user_id` (now reliable — period
  is always set at submit time, simpler than old date-range query)
- `updatePayoutStatus` when paid: mark claims paid by `payroll_period_id + user_id`
- `getPayslip`: rename fields, update table references. **Remove** the old "unbundled
  claims" fallback query (the `.is("payroll_period_id", null)` branch) — every claim
  now has a period set at submit time, that branch is dead code

**Updated: `createPayrollCommissions` (was `createPayrollEntries`)**

Rate comes from `payroll_user_info.rate_per_cup` per user. No PostHog, no extended family,
no bonus — just fetch the user's rate and snapshot it.

```ts
const info = await getPayrollUserInfo(supabase, { tenantId, userId });
if (!info) throw new Error("User has no payroll info configured");
if (!info.commissionTypeId) throw new Error("User has no commission type assigned");

const ratePerUnit = info.ratePerCup;
const grossPay = totalCups * ratePerUnit;

// insert into payroll_commissions with:
//   commission_type_id: info.commissionTypeId  ← set by admin on payroll_user_info
//   rate_per_unit: ratePerUnit                 ← snapshotted, immutable after insert
//   total_pay: grossPay
```

---

## Zod Schema Changes

### New: `packages/features/payroll-commission-types/schema.ts`

```ts
PayrollCommissionTypeResponse    { id, tenantId, name, slug, isEnabled, createdAt }
CreatePayrollCommissionTypeInput { name, slug }
UpdatePayrollCommissionTypeInput { name?, isEnabled? }
```

### New: `packages/features/payroll-claim-types/schema.ts`

```ts
PayrollClaimTypeResponse         { id, tenantId, name, slug, frequency, isEnabled, createdAt }
CreatePayrollClaimTypeInput      { name, slug, frequency }
UpdatePayrollClaimTypeInput      { name?, isEnabled? }

ClaimableTypeResponse            { id, name, frequency, claimable }
ClaimableTypesResponse           { types: ClaimableTypeResponse[] }
```

No hardcoded `PAYROLL_CLAIM_TYPES` enum. Types are whatever the tenant has created.

### New: `packages/features/payroll-user-info/schema.ts`

```ts
PayrollUserInfoResponse    { id, tenantId, userId, ratePerCup, bankName, bankAccountNumber, bankAccountHolder }
UpsertPayrollUserInfoInput { ratePerCup, bankName?, bankAccountNumber?, bankAccountHolder? }
```

### Rename: `packages/features/reimbursements/` → `packages/features/payroll-claims/`

Rename all types:

| Old | New |
|---|---|
| `CreateReimbursementInput` | `CreatePayrollClaimInput` |
| `ReimbursementResponse` | `PayrollClaimResponse` |
| `ReimbursementListResponse` | `PayrollClaimListResponse` |
| `REIMBURSEMENT_TYPES` | deleted — no hardcoded claim type enums |
| `REIMBURSEMENT_TYPE_LABELS` | deleted |
| `REIMBURSEMENT_TYPES_BY_ROLE` | deleted |

`CreatePayrollClaimInput` now has `claim_type_id: uuid` instead of `type: string`.
`PayrollClaimResponse` gains `claimTypeId`, `claimTypeName`, `claimTypeFrequency`,
`paidAt`, `paidBy`, `paymentProofUrl`.
`payrollPeriodId` stays — now always set, never null.

### Updated: `packages/features/payroll/schema.ts`

- Rename `PayrollEntryResponse` → `PayrollCommissionResponse`
- Rename `PayrollEntryListResponse` → `PayrollCommissionListResponse`
- Add `commissionTypeId`, `commissionTypeName`, `ratePerUnit` to `PayrollCommissionResponse`
- Rename `cupsPayTotal` → `commissionsTotal` and `reimbursementsTotal` → `claimsTotal` in `PayslipResponse` and `PayoutResponse`
- Update `PayslipResponse` to use `PayrollClaimResponse` (was `ReimbursementResponse`)

### Remove entirely

- `packages/features/payroll-claim-configs/` — never created
- Flags: `FLAGS.STAFF.EXTENDED_FAMILY`, `FLAGS.FEATURE.CLAIMS_BONUS` — not added

---

## API Route Changes

### Seller app

| Old path | New path | Notes |
|---|---|---|
| `POST /api/reimbursements` | `POST /api/payroll/claims` | Full validation order (see service) |
| `GET /api/reimbursements` | `GET /api/payroll/claims` | Rename |
| `PATCH /api/reimbursements/[id]` | `PATCH /api/payroll/claims/[id]` | Support `paid` status |
| *(new)* | `GET /api/payroll/claim-types` | Eligible types for current user + claimable flag |
| *(new)* | `GET /api/payroll/claimable-dates` | Dates with sessions for a given period (NOT under /claims/[id]) |
| *(new)* | `GET /api/payroll-user-info` | Own payroll info (rate + bank) |
| *(new)* | `PUT /api/payroll-user-info` | Update own bank info only (rate is admin-only) |

`GET /api/payroll/claim-types` response: `{ id, name, frequency, claimable }[]`
- Filters to only types the user has an eligibility row for
- `claimable: false` if already claimed for this period/month/ever (per frequency rules)
- FE renders the list, greys out `claimable: false`, submits with `claim_type_id`
- No business logic on FE — BE computes everything

### Backoffice

| Old path | New path | Notes |
|---|---|---|
| `GET /api/reimbursements` | `GET /api/payroll/claims` | Rename |
| `PATCH /api/reimbursements/[id]` | `PATCH /api/payroll/claims/[id]` | Support `paid` |
| `PATCH /api/payroll/payouts/[id]` | *(same path)* | **Remove** `bundleReimbursementsIntoPeriod` call on approval — this is explicitly called here when `status === "approved"`, delete that block entirely |
| *(new)* | `GET /api/payroll/commission-types` | Admin: list all commission types |
| *(new)* | `PUT /api/payroll/commission-types` | Admin: create/update commission types |
| *(new)* | `GET /api/payroll/claim-types` | Admin: list all claim types |
| *(new)* | `PUT /api/payroll/claim-types` | Admin: create/update claim types |
| *(new)* | `GET /api/payroll/claim-eligibility` | Admin: list eligibility for a user |
| *(new)* | `PUT /api/payroll/claim-eligibility` | Admin: set eligibility for a user |
| *(new)* | `GET /api/payroll-user-info` | Admin: read any user's payroll info |
| *(new)* | `PUT /api/payroll-user-info` | Admin: set rate_per_cup + commission_type_id + bank info for a user |

---

## UI Architecture

### Navigation structure — Backoffice Pay section

```
Pay (tab)
├── Pay Periods                ← list of ISO weeks
│   └── [Week detail]          ← combined view: commissions + claims + total + pay CTA
│       ├── Commissions tab    ← read-only sanity check (cups per staff)
│       └── Claims tab         ← approve/reject individual claims per staff
├── Commission Types           ← admin manages payroll_commission_types
├── Claim Types & Eligibility  ← admin manages payroll_claim_types + per-user eligibility
└── Staff Rates                ← admin sets payroll_user_info.rate_per_cup per user
```

The period detail IS the combined view. No separate "Payout" menu.
Separation is at the review level (two tabs inside a period), not at the navigation level.

---

### Status language

**Period statuses (what staff sees vs internal):**

| DB | Staff label | Admin label |
|---|---|---|
| `pending` | In Review | Needs review |
| `approved` | Payout Scheduled · [expected date] | Ready to pay |
| `paid` | Paid ✓ · [paid date] | Done |

Expected payout date = `period.end_date + 7 days` (T+1, always deterministic).

**Individual claim statuses (staff sees in their claims list):**

| DB | Staff label |
|---|---|
| `pending` | Submitted |
| `approved` | Approved |
| `rejected` | Rejected |
| `paid` | Paid ✓ |

---

### Seller app — My Pay (period list)

Primary label is ISO week number + date range. Expected payout date shown for pending/approved.

```
Week 22  ·  Jun 2–8          In Review
Rp 480,000  ·  Expected Sun Jun 15

Week 21  ·  May 26 – Jun 1   Paid ✓ Jun 8
Rp 520,000
```

### Seller app — Period detail (staff taps a week)

Three sections, read-only:

```
Week 22  ·  Jun 2–8
Expected payout: Sun Jun 15
──────────────────────
COMMISSION
Mon 2 Jun    42 cups
Tue 3 Jun    38 cups
...
180 cups × Rp 500 = Rp 90,000
──────────────────────
CLAIMS
Mon 2 Jun   Lunch Allowance   Rp 10,000   Approved
Tue 3 Jun   Mobile Data       Rp 15,000   Approved
──────────────────────
TOTAL  Rp 115,000
```

Staff sees both together here as a read-only payslip.

---

### Backoffice — Period detail (two-tab review + combined footer)

**Commissions tab** — one row per staff, auto-calculated, read-only sanity check:
```
Ahmad     180 cups  ×  Rp 500  =  Rp 90,000
Budi      210 cups  ×  Rp 500  =  Rp 105,000
```

**Claims tab** — grouped by staff, each claim has approve/reject actions:
```
Ahmad
  Mon Jun 2   Lunch Allowance   Rp 10,000   [Approve] [Reject]
  Tue Jun 3   Mobile Data       Rp 15,000   ✓ Approved

Budi
  Mon Jun 2   Lunch Allowance   Rp 10,000   ✓ Approved
```

**Period footer (always visible, both tabs):**
```
Commissions  Rp 195,000
Claims       Rp  45,000
─────────────────────
Total        Rp 240,000     [Approve Period]
```

After approval: [Pay] flow per staff (bank details + transfer proof upload).

---

## UI Implementation Notes

### Shared form components (seller app)

These live at `app/[tenantSlug]/mobile/home/manage/_components/shared/`. Use them — don't
recreate them.

| Component | Import path | Use for |
|---|---|---|
| `NumberInput` | `.../_components/shared/NumberInput` | All IDR amount fields — pass `currency` prop for `Rp` prefix |
| `SelectInput` | `.../_components/shared/SelectInput` | Dropdowns — supports an optional "other" text reveal |
| `Textarea` | `.../_components/shared/Textarea` | Notes fields |
| `PhotoPicker` | `.../_components/shared/PhotoPicker` | Optional receipt photos |
| `FormFooter` | `@/components/shared/FormFooter` | Sticky submit button — hooks into `MobileFooterSlotContext` automatically |

Card wrapper pattern (consistent across all manage forms):
```tsx
<div className="space-y-3 pb-4">
    <div className="bg-white rounded-xl p-4 space-y-4">
        <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</p>
            {/* input component */}
        </div>
    </div>
    <FormFooter label="Submit" ... />
</div>
```

Multi-step forms (like close-day): use `currentStep` state + `localStorage` persistence
keyed on record ID + `setFooterSlot` for the prev/next footer. See
`app/[tenantSlug]/mobile/home/manage/close/page.tsx` for the full pattern.

### Claim add form — refactor of existing page

`account/reimbursements/add/page.tsx` already uses all four components and is the
direct starting point for `account/claims/add/page.tsx`. Key changes from the old page:

1. **Type picker** — replace `SelectInput` (hardcoded `REIMBURSEMENT_TYPES_BY_ROLE` options)
   with API-driven type chips. Load types from `GET /api/payroll/claim-types`. Render as
   tappable chips: enabled for `claimable: true`, greyed out + disabled for `claimable: false`.
   Show a short reason beneath greyed-out chips ("Already submitted this month").

2. **Date field** — for `weekly` frequency: replace `<input type="date">` with worked-day
   chips from `GET /api/payroll/claimable-dates`. For `monthly`/`one_time`: keep the
   native date input but enforce max = today, min = 14 days ago (max-lookback rule).

3. **Amount** — keep `NumberInput currency` unchanged.

4. **Notes + photo** — keep `Textarea` and `PhotoPicker` unchanged.

5. **Photo upload** — keep the `apiFetch("/api/upload")` pattern from the existing page;
   just change `bucket` from `"reimbursements"` to `"payroll-claims"`.

6. **Submission payload** — swap `type: string` for `claimTypeId: uuid`. Remove
   `REIMBURSEMENT_TYPE_LABELS` and `REIMBURSEMENT_TYPES_BY_ROLE` imports entirely.

---

## UI Changes

### Seller app

**Account menu — updated labels and items:**

```
Personal Details   → /mobile/account/details       (unchanged)
My Pay             → /mobile/account/earnings       (unchanged)
My Claims          → /mobile/account/claims         (was "Reimbursements")
Payroll Info       → /mobile/account/payroll-info   (new — bank details)
Notifications      (disabled, unchanged)
Language           (disabled, unchanged)
```

**New: `/mobile/account/payroll-info`**
- Staff edits own bank name, account number, account holder name
- Simple form, save button, reads/writes `payroll_user_info`
- `rate_per_cup` is not editable by staff — read-only display only

**Updated: `/mobile/account/reimbursements` → `/mobile/account/claims`**

Add claim form (two-step):

Step 1 — Pick a claim type:
- Load available types via `GET /api/payroll/claim-types`
- Show types from response; grey out where `claimable: false`
- Show reason for greyed out (e.g. "Already submitted this month")
- No type dropdowns with hardcoded values — render what BE returns

Step 2 — Fill in details:
- For `weekly` frequency: show worked-day chips from `GET /api/payroll/claimable-dates`
- For `monthly`/`one_time` frequency: standard date picker
- Amount field + notes + optional photo upload
- Submit with `claim_type_id` in payload (not a string slug)

### Backoffice

**Updated: `/mobile/pay/reimbursements` → `/mobile/pay/claims`**
- Approved claims get a "Pay" button (bottom sheet with proof upload)
- Each claim row shows type name from `claimTypeName` (not a hardcoded label map)
- Remove all `REIMBURSEMENT_TYPE_LABELS` imports — type name comes from the API response

**Repurposed: `/mobile/pay/rates` → `/mobile/pay/staff-rates`**
- Currently manages `commission_configs` (global per-role rates via `commissionConfigsApi`)
- Replace entirely: now manages `payroll_user_info.rate_per_cup` + `commission_type_id` per user
- One row per staff member; admin sets their rate and commission type
- The `commission_configs` table and `useCommissionConfig` hook become unused — remove them

**New: `/mobile/pay/commission-types`**
- Admin creates/edits commission types (name, slug, enabled)

**New: `/mobile/pay/claim-types`**
- Admin creates/edits claim types (name, slug, frequency, enabled)
- Per-user eligibility assignment on a sub-page or expandable row

**Updated: `/mobile/pay/page.tsx`**
- Replace "Reimbursements" + "Commission Rates" nav rows with "Claims", "Staff Rates",
  "Commission Types", "Claim Types" rows

**Updated: `/mobile/pay/periods/[periodId]/page.tsx`** ← significant change
- Currently shows flat staff list per period
- New: becomes the two-tab period detail (Commissions tab | Claims tab) with combined footer

**Updated: `/mobile/pay/periods/[periodId]/[userId]/page.tsx`**
- Becomes the pay action page only (bank details + proof upload + pay CTA)
- Remove inline claims section — claims reviewed in parent tab
- Rename `cupsPayTotal` → `commissionsTotal`
- Bank info reads from `payroll_user_info` (currently reads from `users.bankName` etc — those fields move)
- Remove `REIMBURSEMENT_TYPE_LABELS` import — type name comes from `claimTypeName` on the response

**Updated: backoffice `navigation.ts`**
- Remove `/mobile/pay/reimbursements` entry, add `/mobile/pay/claims`
- Rename `/mobile/pay/rates` → `/mobile/pay/staff-rates`
- Add `/mobile/pay/commission-types`, `/mobile/pay/claim-types`
- Update `resolveRoute` for new sub-pages

---

## Migration Order

Run in order. Each migration is one focused change.

1. `supabase migration new create_payroll_user_info`
   - New `payroll_user_info` table with `rate_per_cup` + bank fields
   - Copy `bank_name`, `bank_account_number`, `bank_account_holder` from `users`
   - Drop those columns from `users`
   - RLS policies

2. `supabase migration new create_payroll_commission_types`
   - New `payroll_commission_types` table
   - RLS policies

3. `supabase migration new create_payroll_claim_types_and_eligibility`
   - New `payroll_claim_types` table
   - New `payroll_claim_eligibility` table
   - RLS policies for both
   - Add index: `CREATE INDEX ON store_sessions (tenant_id, user_id, started_at)` — used by `getClaimableDates` and session validation

4. `supabase migration new rename_payroll_entries_to_commissions`
   - Rename `payroll_entries` → `payroll_commissions`
   - Add `commission_type_id uuid not null references payroll_commission_types(id)`
   - Add `rate_per_unit integer not null`
   - Rename FK constraint names

5. `supabase migration new rename_payroll_reimbursements_to_claims`
   - Rename `payroll_reimbursements` → `payroll_claims`
   - Add `claim_type_id uuid not null references payroll_claim_types(id)`
   - Set `payroll_period_id` not null (backfill first if needed)
   - Add `payment_proof_url`, `paid_at`, `paid_by`
   - Rename `payroll_payouts.cups_pay_total` → `commissions_total`
   - Rename FK constraint names
   - Add unique index for weekly duplicate guard: `unique (tenant_id, user_id, claim_type_id, payroll_period_id) WHERE status != 'rejected'`
   - Add unique index for one_time duplicate guard: `unique (tenant_id, user_id, claim_type_id) WHERE status != 'rejected'`
   - Verify or add `unique (tenant_id, start_date)` on `payroll_periods`

6. `pnpm types:db`

7. Update all code: services → features → api routes → hooks → UI

---

## Open Questions

### Q1: Period status flow for T+1 cycle

Current `payroll_periods.status`: `pending | approved | on_hold | paid`.
The `on_hold` status exists in DB but is not part of the active UI flow.
Start with `pending → approved → paid`. Add automation / on_hold UX later.

### Q2: First-week float communication

T+1 means staff wait two weeks for their first paycheck. Surface the "next expected payout"
clearly in the seller app so admin can explain it. Backoffice should also show it per period.

### Q3: Monthly/one_time claim date max-lookback

For `monthly` and `one_time` frequency claims, no session check runs. A staff member
picking an old date causes the period resolver to find an old period, which the deadline
check will catch only if that period is `approved` or `paid`. A `pending` period from
months ago would accept the claim silently.

Add a hard server-side max-lookback rule in `createPayrollClaim`:
```ts
const maxLookbackDays = 14; // current + previous ISO week
const earliest = subDays(new Date(), maxLookbackDays).toISOString().slice(0, 10);
if (claim.date < earliest) {
    throw Object.assign(new Error("Claim date is too far in the past"), { status: 422 });
}
```

This applies to all frequency types. Confirm the lookback window (14 days covers T+1
comfortably; adjust if needed).

### Q4: Period detail route restructure (backoffice)

`/mobile/pay/periods/[periodId]/page.tsx` becoming the two-tab review is a significant
change to existing working backoffice pages. Confirm this restructure is acceptable
before implementation — or consider a new route like `/mobile/pay/periods/[periodId]/review`.

---

## Session Booster

Read these files before writing a single line of code. In this order:

**1. Current DB schema**
- `packages/db/types.ts` — source of truth for all table shapes. Pay attention to
  `payroll_entries`, `payroll_reimbursements`, `payroll_payouts`, `payroll_periods`,
  `store_sessions`, `users` (bank columns being moved), `tenant_commission_configs`

**2. Existing payroll service — the thing being refactored**
- `packages/services/payroll.ts` — understand every function before touching anything:
  `createPayrollEntries`, `upsertPayout`, `getPayslip`, `bundleReimbursementsIntoPeriod`
- `packages/services/reimbursements.ts` — being renamed to `payroll-claims.ts`
- `packages/services/commission-configs.ts` — understand `getCommissionRate`; it will
  coexist with the new `payroll_user_info.rate_per_cup` approach

**3. Existing feature schemas**
- `packages/features/payroll/schema.ts` — all Zod types being renamed
- `packages/features/reimbursements/schema.ts` — being moved to `payroll-claims`

**4. Existing API routes (both apps)**
- `apps/seller/app/api/payroll/` — all routes
- `apps/seller/app/api/reimbursements/` — both routes
- `apps/backoffice/app/api/payroll/` — all routes
- `apps/backoffice/app/api/reimbursements/` — both routes

**5. Existing backoffice Pay UI (being restructured)**
- `apps/backoffice/app/[tenantSlug]/mobile/pay/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/periods/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/periods/[periodId]/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/periods/[periodId]/[userId]/page.tsx` — bank fields from `users` being moved; `REIMBURSEMENT_TYPE_LABELS` imported, remove it
- `apps/backoffice/app/[tenantSlug]/mobile/pay/reimbursements/page.tsx` — being renamed to claims; `REIMBURSEMENT_TYPE_LABELS` imported, remove it
- `apps/backoffice/app/[tenantSlug]/mobile/pay/rates/page.tsx` — being repurposed to staff-rates managing `payroll_user_info`
- `apps/backoffice/app/[tenantSlug]/mobile/config/navigation.ts`
- `apps/backoffice/app/api/payroll/payouts/[id]/route.ts` — contains the `bundleReimbursementsIntoPeriod` call to delete

**6. Existing seller account UI**
- `apps/seller/app/[tenantSlug]/mobile/account/_components/AccountProfile.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/reimbursements/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/account/reimbursements/add/page.tsx` — **direct template for the new claims add page**; uses `SelectInput`, `NumberInput`, `Textarea`, `PhotoPicker`, `FormFooter`
- `apps/seller/app/[tenantSlug]/mobile/account/earnings/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/config/navigation.ts`
- `apps/seller/app/[tenantSlug]/mobile/home/manage/expense/add/page.tsx` — another clean example of the form pattern
- `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/shared/` — all four shared components

**7. Existing hooks + API clients (both apps)**
- `apps/seller/lib/hooks/payroll/usePayroll.ts`
- `apps/seller/lib/hooks/reimbursements/useReimbursements.ts`
- `apps/backoffice/lib/hooks/payroll/usePayroll.ts`
- `apps/backoffice/lib/hooks/reimbursements/useReimbursements.ts`
- `apps/backoffice/lib/hooks/commission-configs/useCommissionConfig.ts` — to be deleted
- `apps/backoffice/lib/api/commission-configs.ts` — to be deleted
- `apps/backoffice/lib/api/payroll.ts` — update method names + add new endpoints
- `apps/backoffice/lib/api/reimbursements.ts` — rename to `payroll-claims.ts`

**8. Latest migration**
- `supabase/migrations/` — read the most recent file to understand current DB state
  and follow the naming/style convention

---

## Testing Checklist

**Naming:**
- [ ] No references to `payroll_entries` or `payroll_reimbursements` anywhere in code
- [ ] No references to `cups_pay_total`, `cupsPayTotal`, `reimbursements_total`, or `reimbursementsTotal` anywhere
- [ ] No hardcoded claim type enums (`REIMBURSEMENT_TYPES`, etc.) anywhere

**Payroll user info:**
- [ ] Staff can view and update own bank info via `/mobile/account/payroll-info`
- [ ] Staff cannot edit `rate_per_cup` — read-only in seller UI
- [ ] Admin can set rate + bank info per user in backoffice
- [ ] Bank info gone from `users` table
- [ ] Backoffice pay sheet reads bank info from `payroll_user_info`

**Commission types:**
- [ ] Admin can create, rename, enable/disable commission types
- [ ] Close-day correctly resolves `commission_type_id` for each user
- [ ] `rate_per_unit` snapshotted at calc time — changing rate later doesn't alter past entries

**Claim types and eligibility:**
- [ ] Admin can create claim types with correct frequency (weekly / monthly / one_time)
- [ ] Admin can assign/remove eligibility per user per type
- [ ] `GET /api/payroll/claim-types` returns only eligible types for current user
- [ ] `claimable: false` correctly computed for each frequency rule

**Claim submission — weekly type:**
- [ ] Claim form shows worked-day chips (not a free date picker)
- [ ] Submitting on a date with no session → rejected server-side
- [ ] Cannot submit same weekly type twice in same period → rejected (app + DB unique index)
- [ ] Two concurrent submits for same weekly claim → only one succeeds (DB index is the guard)

**Claim submission — monthly type:**
- [ ] No session check runs
- [ ] Cannot submit same monthly type twice in same calendar month → rejected
- [ ] Claim date older than 14 days → rejected server-side (max-lookback rule)

**Claim submission — one_time type:**
- [ ] No session check runs
- [ ] Cannot submit same one_time type a second time → rejected (app + DB unique index)
- [ ] A rejected one_time claim allows re-submission (rejected status excluded from unique index)
- [ ] Claim date older than 14 days → rejected server-side

**Concurrency:**
- [ ] Two simultaneous close-day requests → only one `payroll_periods` row created (`ON CONFLICT`)
- [ ] Two simultaneous claim submits → only one succeeds (partial unique index on `payroll_claims`)

**Eligibility:**
- [ ] Revoking eligibility soft-deletes (`removed_at` set), not hard-deletes
- [ ] Revoked eligibility: prior claims remain intact; new submissions rejected

**Claim lifecycle:**
- [ ] Submitting a claim for a closed period (approved/paid) is rejected
- [ ] Period resolved from claim's `date` field, not submission date
- [ ] Admin approves, rejects, marks paid with proof upload
- [ ] Claim status reflects in seller app

**Weekly payout (T+1 cycle):**
- [ ] Payout combines `commissions_total` + `claims_total`
- [ ] No bundling step — claims have period assigned at submit time
- [ ] On payout paid: all claims for that period + user move to `paid`

**Decoupling:**
- [ ] `bundleReimbursementsIntoPeriod` is gone — including the call in `api/payroll/payouts/[id]/route.ts`
- [ ] No claims queries inside commission calculation logic
- [ ] No PostHog checks in any payroll or claims service
- [ ] Backoffice has separate tabs for commissions and claims review
- [ ] `REIMBURSEMENT_TYPE_LABELS` removed from payslip detail + claims page — replaced by `claimTypeName` from response
- [ ] `commission_configs` table + `useCommissionConfig` hook + `commissionConfigsApi` removed — all rate data now in `payroll_user_info`
- [ ] Backoffice `rates/page.tsx` replaced by `staff-rates/page.tsx` managing `payroll_user_info` per user
