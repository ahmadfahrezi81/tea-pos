# Payroll & Sessions — Implementation Tickets

## Context

We're adding session-based POS locking, commission-based payroll, and refactoring daily_summaries. Only one user can hold an active session per store at a time. Commission is flat rate per cup, calculated from orders placed during a user's session window.

---

## Phase 1 — Schema

### Ticket 1 — Refactor `daily_summaries`

Replace `seller_id` + `manager_id` with `opened_by` + `closed_by`. Daily summary is now purely store financials — who sold what is tracked via sessions + orders.

```sql
ALTER TABLE daily_summaries RENAME COLUMN seller_id TO opened_by;
ALTER TABLE daily_summaries DROP COLUMN manager_id;
ALTER TABLE daily_summaries ADD COLUMN closed_by uuid REFERENCES profiles(id);
```

Search codebase for all references to `seller_id` and `manager_id` on `daily_summaries` and update. Do not touch `seller_id` on other tables.

---

### Ticket 2 — Create `sessions` table

A session is a POS ownership window. Only one session per store can be `active` at a time. Sessions chain together via `previous_session_id` for audit trail.

```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  daily_summary_id uuid NOT NULL REFERENCES daily_summaries(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  claim_code varchar(6) NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  previous_session_id uuid REFERENCES sessions(id),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX one_active_session_per_store
  ON sessions(store_id)
  WHERE status = 'active';
```

---

### Ticket 3 — Create `commission_configs` table

Flat rate per cup per user. If no user-specific config exists, fall back to tenant-wide default (user_id is null).

```sql
CREATE TABLE commission_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid REFERENCES profiles(id),
  rate_per_cup numeric NOT NULL,
  effective_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

---

### Ticket 4 — Create `payroll_periods` table

Defines the pay cycle window (weekly). One period per tenant per cycle.

```sql
CREATE TABLE payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'paid')),
  created_at timestamptz DEFAULT now()
);
```

---

### Ticket 5 — Create `payroll_entries` table

One row per user per store per day. Created when daily_summary is closed. `rate_per_cup` is snapshotted at creation time so future rate changes don't affect historical entries.

```sql
CREATE TABLE payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  payroll_period_id uuid NOT NULL REFERENCES payroll_periods(id),
  daily_summary_id uuid NOT NULL REFERENCES daily_summaries(id),
  date date NOT NULL,
  total_cups integer NOT NULL DEFAULT 0,
  rate_per_cup numeric NOT NULL,
  gross_pay numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  created_at timestamptz DEFAULT now()
);
```

After all migrations run `pnpm types:db` and update Zod schemas in `packages/features` for all new tables.

---

## Phase 2 — Services + API Routes

After all migrations, run `pnpm types:db` then follow the strict layer pattern: `zod schemas + openapi → service → api route → api client`

### Ticket 6 — Sessions service + API

**Service** `packages/services/sessions.ts`:

- `getActiveSession(supabase, storeId)` — get current active session for a store
- `claimSession(supabase, params)` — create new session, validate no active session exists
- `transferSession(supabase, params)` — validate claim_code, end current session, create new one
- `endSession(supabase, sessionId)` — set ended_at + status to ended

**API routes** `apps/seller/app/api/sessions/`:

- `GET /sessions?storeId=` — get active session
- `POST /sessions` — claim session
- `POST /sessions/transfer` — transfer via claim_code
- `PATCH /sessions/[id]` — end session

**Zod schemas** `packages/features/sessions/schema.ts` — `CreateSessionInput`, `TransferSessionInput`, `SessionResponse`, `SessionListResponse` with OpenAPI annotations

---

### Ticket 7 — Commission configs service + API

**Service** `packages/services/commission-configs.ts`:

- `getCommissionRate(supabase, { tenantId, userId })` — get rate for user, fall back to tenant default if no user-specific config
- `upsertCommissionConfig(supabase, params)` — create or update config

**API routes** `apps/seller/app/api/commission-configs/`:

- `GET /commission-configs?userId=` — get effective rate for user
- `POST /commission-configs` — create/update config

**Zod schemas** `packages/features/commission-configs/schema.ts` — `UpsertCommissionConfigInput`, `CommissionConfigResponse` with OpenAPI annotations

---

### Ticket 8 — Payroll service + API

**Service** `packages/services/payroll.ts`:

- `getOrCreatePayrollPeriod(supabase, { tenantId, date })` — find open period covering date or create new weekly one
- `createPayrollEntry(supabase, params)` — called when daily_summary closes, calculates total_cups from orders during user sessions that day, snapshots rate, computes gross_pay
- `getPayrollEntries(supabase, { tenantId, periodId, userId })` — list entries
- `approvePayrollEntry(supabase, entryId)` — mark as approved
- `markPeriodPaid(supabase, periodId)` — mark period + all entries as paid

`createPayrollEntry` logic:

1. Get all sessions for this daily_summary grouped by user_id
2. For each user: sum order_items.quantity where orders.user_id = user and orders.created_at falls within their session windows
3. Get commission rate via `getCommissionRate`
4. Insert payroll_entry with total_cups, rate_per_cup, gross_pay

**API routes** `apps/seller/app/api/payroll/`:

- `GET /payroll/periods` — list periods
- `GET /payroll/entries?periodId=&userId=` — list entries
- `PATCH /payroll/entries/[id]` — approve entry
- `PATCH /payroll/periods/[id]` — mark paid

**Zod schemas** `packages/features/payroll/schema.ts` — `PayrollPeriodResponse`, `PayrollEntryResponse`, `PayrollEntryListResponse`, `UpdatePayrollEntryInput` with OpenAPI annotations

Trigger `createPayrollEntry` from the existing daily_summary close flow in `packages/services/daily-summaries.ts`.

---

## Phase 3 — API Clients + Hooks + Refactor

### Ticket 9 — Sessions api client + hook

**API client** `lib/api/sessions.ts`:

- `sessionsApi.getActive(storeId)` — get active session for store
- `sessionsApi.claim(params)` — claim session
- `sessionsApi.transfer(params)` — transfer via claim_code
- `sessionsApi.end(sessionId)` — end session

**Hook** `lib/hooks/sessions/useSession.ts` — wraps api client, exposes active session state + claim, transfer, end actions via SWR

---

### Ticket 10 — Live cup count api client + hook

**API client** `lib/api/orders.ts` — add `ordersApi.todayCups(userId)` if not already exists

**API client** `lib/api/commission-configs.ts`:

- `commissionConfigsApi.getRate(userId)` — get effective rate for user

**Hook** `lib/hooks/orders/useTodayCups.ts` — cups + estimated earnings (cups × rate), ready to plug into home screen

---

### Ticket 11 — Payroll api client + hook

**API client** `lib/api/payroll.ts`:

- `payrollApi.getPeriods()` — list periods
- `payrollApi.getEntries(params)` — list entries by period/user
- `payrollApi.approveEntry(entryId)` — approve entry
- `payrollApi.markPeriodPaid(periodId)` — mark period paid

**Hook** `lib/hooks/payroll/usePayroll.ts` — wraps api client, exposes periods + entries state + mutations via SWR

---

### Ticket 12 — Daily summary UI refactor

Update all daily summary UI components to use `opened_by` + `closed_by` instead of `seller_id` + `manager_id`. Remove any seller/manager-specific UI assumptions — the summary is now store-level only.
