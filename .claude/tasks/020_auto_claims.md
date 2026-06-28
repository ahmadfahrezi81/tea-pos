# Task 020 — Auto Claims

## What we're building

Some claim types (lunch, dinner) should be handled automatically —
no staff submission required. The system creates them when a user gets a session
and settles them at midnight based on actual hours worked that day.

Manual claim types (receipts, one-time expenses) are unchanged.

---

## Design

### Add `daily` to frequency

`payroll_claim_types.frequency` currently allows: `weekly | monthly | one_time`

Add `daily` — one claim per day worked.

Full set:
- `daily`    — once per day worked
- `weekly`   — once per payroll period Mon–Sun
- `monthly`  — once per calendar month
- `one_time` — once ever

All forms that render frequency as a text badge switch to a **dropdown** with all 4 options.

#### Critical: fix `payroll_claims_weekly_unique` index

The existing index has no frequency filter:
```sql
-- current — blocks daily claims from having multiple entries in the same period
CREATE UNIQUE INDEX payroll_claims_weekly_unique
  ON payroll_claims (tenant_id, user_id, claim_type_id, payroll_period_id)
  WHERE status != 'rejected';
```

A daily claim (e.g. Food 1) submitted Mon and Tue both belong to the same
`payroll_period_id`. The current index would reject the second one.

Fix: DROP and recreate scoped to weekly only:
```sql
DROP INDEX payroll_claims_weekly_unique;
CREATE UNIQUE INDEX payroll_claims_weekly_unique
  ON payroll_claims (tenant_id, user_id, claim_type_id, payroll_period_id)
  WHERE status != 'rejected' AND frequency = 'weekly';
```

New index for daily:
```sql
CREATE UNIQUE INDEX payroll_claims_daily_unique
  ON payroll_claims (tenant_id, user_id, claim_type_id, date)
  WHERE status != 'rejected' AND frequency = 'daily';
```

Duplicate check in `createPayrollClaim()` also needs a `daily` branch:
check for existing non-rejected claim with same `claim_type_id` and `date`.

---

### New columns on `payroll_claim_types`

```
claim_source          text     -- 'manual' | 'auto'
auto_threshold_hours  integer  -- minimum hours to auto-approve (0 = any session, null if manual)
```

`claim_source = 'manual'` → staff submits, admin approves. Unchanged.
`claim_source = 'auto'`   → system creates + settles. Staff never submits these.

Settlement if statement: `if total_session_hours >= auto_threshold_hours → approved, else → rejected`

Examples:
| Name           | claim_source | frequency | auto_threshold_hours |
|----------------|-------------|-----------|----------------------|
| Food 1         | auto        | daily     | 4                    |
| Food 2         | auto        | daily     | 8                    |
| Manual receipt | manual      | weekly    | null                 |

---

## Lifecycle

### Step 1 — User gets a session → create pending claims

Three routes give a user a session. All three must call
`createAutoClaimsForSession(supabase, { tenantId, userId, date })` after the session is created:

- `POST /api/sessions` (open store)
- `POST /api/sessions/resume`
- `POST /api/sessions/transfer` — new user gets the session, use the incoming `user.id`

`createAutoClaimsForSession`:
1. Fetches all `auto` claim types this user is eligible for
2. For each type, checks if a non-rejected claim already exists for this user + type + date (daily) or period (weekly/monthly/one_time)
3. If not → inserts a `pending` claim

Staff sees the claim as "Pending" during the day.

### Step 2 — Midnight cron → settle

New cron job `settle-auto-claims` at **17:05 UTC** (midnight WIB + 5 min), giving the
17:00 UTC cron time to force-close any stale sessions first.

Follows the existing cron route pattern — lives at
`POST /api/cron/claims/settle`, protected by `Bearer ${CRON_SECRET}` header
(same pattern as `/api/cron/weather/*`).

That route calls `settleAutoClaimsForDate(supabase, { tenantId, date })` in
`packages/services/payroll-claims.ts`:
1. Fetches all `pending` auto claims for today, joins `payroll_claim_types` for `auto_threshold_hours`
2. For each claim, sums `(ended_at - started_at)` across all sessions that day for that user
3. `if total_hours >= auto_threshold_hours → approved, else → rejected`

The 5am cron closes missed sessions only. It does not settle claims.

---

## What changes

### DB migration
- Drop and recreate `payroll_claims_weekly_unique` scoped to `frequency = 'weekly'`
- Add `payroll_claims_daily_unique` on `(tenant_id, user_id, claim_type_id, date)` where daily + non-rejected
- Drop and recreate `CHECK` constraint on `payroll_claim_types.frequency` to include `daily`
  (Postgres requires DROP CONSTRAINT + ADD CONSTRAINT — can't modify in place)
- Add `claim_source text not null default 'manual'` to `payroll_claim_types`
- Add `auto_threshold_hours integer` (nullable) to `payroll_claim_types`
- New cron job: `settle-auto-claims` at `5 17 * * *` via `pg_cron`

### Service layer
- `packages/services/payroll-claims.ts`
  - `createPayrollClaim()` — add `daily` branch to frequency duplicate check
  - add `createAutoClaimsForSession()`
  - add `settleAutoClaimsForDate()`
- `packages/services/payroll-claim-types.ts` — include `claim_source`, `auto_threshold_hours` in create/update/list
- `packages/features/payroll-claims/schema.ts` — add `daily` to frequency enum
- `packages/features/payroll-claim-types/schema.ts` — add `claim_source`, `auto_threshold_hours`, `daily` to frequency enum
- `packages/services/payroll-claims.ts` — `getClaimableTypes()` filter by `claim_source = 'manual'` for seller add form

### API routes (seller)
- `POST /api/sessions` — call `createAutoClaimsForSession` after `openStore()`
- `POST /api/sessions/resume` — call `createAutoClaimsForSession` after `resumeSession()`
- `POST /api/sessions/transfer` — call `createAutoClaimsForSession` for the incoming user after `transferSession()`
- `POST /api/cron/claims/settle` — new, `Bearer ${CRON_SECRET}` protected

### Backoffice UI
- Claim type add/edit — frequency → **dropdown** (daily/weekly/monthly/one_time)
- Claim type add/edit — `claim_source` toggle; `auto_threshold_hours` field only shown when `auto`
- Claims list — label auto vs manual

### Seller UI
- Add claim form — only show `claim_source = 'manual'` types
- Entitlements cards — auto types show "Auto" badge; no submit button for them

---

## What does NOT change
- Manual claim submission and approval flow
- Admin approve/reject for manual claims
- Payout calculation — already sums all approved claims regardless of source
