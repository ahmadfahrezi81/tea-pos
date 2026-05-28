# Task 009 — Unify expenses, supply_requests, incident_reports Schema

## Goal

Standardize the three "store event" tables — `expenses`, `supply_requests`, `incident_reports` — to share the same shape. Remove DB-level CHECK constraints on type/category so custom values are allowed. Drop `status` from requests and reports (not needed for staff-facing UI). Add missing fields to `expenses` (`user_id`, `photo_url`, `notes`). Update all layers: DB → feature schema → service → API route → API client → hook → UI.

---

## Final Unified Shape

| field             | expenses          | supply_requests        | incident_reports              |
|-------------------|-------------------|------------------------|-------------------------------|
| `id`              | ✓                 | ✓                      | ✓                             |
| `tenant_id`       | ✓                 | ✓                      | ✓                             |
| `store_id`        | ✓                 | ✓                      | ✓                             |
| `user_id`         | add (nullable)    | ✓                      | ✓                             |
| `daily_summary_id`| ✓                 | ✓                      | ✓                             |
| `type`            | rename from `expense_type` | ✓ (drop CHECK) | rename from `category`, drop `title` + CHECK |
| `notes`           | add (nullable)    | ✓                      | rename from `description`     |
| `photo_url`       | add (nullable)    | ✓                      | ✓                             |
| `amount`          | ✓ (unique)        | —                      | —                             |
| `status`          | —                 | **drop**               | **drop**                      |
| `created_at`      | ✓                 | ✓                      | ✓                             |

---

## Migration

> Use `supabase migration new unify_expense_request_report_schema` to generate the file.
> **Never run `supabase db push`** — developer runs this manually.
> After pushing, run `pnpm types:db` to regenerate `packages/db/types.ts`.

### SQL

```sql
-- ─── incident_reports ────────────────────────────────────────────────────────

-- Drop constraints before altering columns
ALTER TABLE incident_reports DROP CONSTRAINT incident_reports_category_check;
ALTER TABLE incident_reports DROP CONSTRAINT incident_reports_status_check;

-- Drop columns
ALTER TABLE incident_reports DROP COLUMN title;
ALTER TABLE incident_reports DROP COLUMN status;

-- Rename columns
ALTER TABLE incident_reports RENAME COLUMN category TO type;
ALTER TABLE incident_reports RENAME COLUMN description TO notes;

-- ─── supply_requests ─────────────────────────────────────────────────────────

ALTER TABLE supply_requests DROP CONSTRAINT supply_requests_type_check;
ALTER TABLE supply_requests DROP CONSTRAINT supply_requests_status_check;
ALTER TABLE supply_requests DROP COLUMN status;

-- ─── expenses ────────────────────────────────────────────────────────────────

ALTER TABLE expenses RENAME COLUMN expense_type TO type;
ALTER TABLE expenses ADD COLUMN user_id uuid NULL REFERENCES profiles(id);
ALTER TABLE expenses ADD COLUMN photo_url text NULL;
ALTER TABLE expenses ADD COLUMN notes text NULL;
```

---

## Code Changes (all 5 layers)

### 1. Feature Schemas — `packages/features/`

**`expenses/schema.ts`**
- Rename `expenseType` → `type` in `CreateExpenseInput`, `UpdateExpenseInput`, `ExpenseResponse`
- Add `userId: UUIDSchema.nullable().optional()` to `ExpenseResponse`
- Add `photoUrl: z.string().nullable().optional()` to `ExpenseResponse`
- Add `notes: z.string().nullable().optional()` to `ExpenseResponse`

**`requests/schema.ts`**
- Remove `z.enum(SUPPLY_REQUEST_TYPES)` → `z.string().min(1).max(100)` for `type` in `CreateSupplyRequestInput` and `SupplyRequestResponse`
- Keep `SUPPLY_REQUEST_TYPES` and `SUPPLY_REQUEST_TYPE_LABELS` as UI suggestion constants (not enforced by schema)
- Remove `status` from `SupplyRequestResponse`

**`reports/schema.ts`**
- Remove `z.enum(INCIDENT_CATEGORIES)` → `z.string().min(1).max(100)` for `category`/`type`
- Rename `category` → `type` in `CreateIncidentReportInput` and `IncidentReportResponse`
- Rename `description` → `notes` in `CreateIncidentReportInput` and `IncidentReportResponse`
- Drop `title` from `CreateIncidentReportInput` and `IncidentReportResponse`
- Remove `status` from `IncidentReportResponse`
- Keep `INCIDENT_CATEGORIES` and `INCIDENT_CATEGORY_LABELS` as UI suggestion constants

### 2. Services — `packages/services/`

**`expenses.ts`**
- Rename `expenseType` → `type` in `CreateExpenseParams`, `UpdateExpenseParams`
- Update all DB column references: `expense_type` → `type`
- Update `toSnakeKeys` insert to use `type` (or pass directly)
- Update activity log metadata: `description: expenseType` → `type`
- Update `updateExpense`: `updates.expense_type` → `updates.type`
- Update `deleteExpense`: raw cast `expense_type` → `type`

**`requests.ts`**
- Remove `status` from insert (was using DB default anyway — check if explicit)
- No other changes needed (service already uses `type` as a plain string)

**`reports.ts`**
- Rename param `category` → `type`, `description` → `notes`, drop `title`
- Update `CreateIncidentReportParams` interface
- Update the `.insert({})` call to use new field names
- Update activity log metadata: `category` → `type`

### 3. API Routes — `apps/seller/app/api/`

**`expenses/route.ts`** — Should be transparent if feature schema is updated correctly. Verify `CreateExpenseInput` and `ExpenseResponse` parse without errors.

**`requests/route.ts`** — Should be transparent. Verify `CreateSupplyRequestInput` and `SupplyRequestResponse` parse without errors.

**`reports/route.ts`** — Should be transparent. Verify `CreateIncidentReportInput` and `IncidentReportResponse` parse without errors.

### 4. API Clients — `apps/seller/lib/api/`

**`expenses.ts`** — Update type imports if `expenseType` referenced directly.

**`requests.ts`** — Update type imports; `status` removed from `SupplyRequestResponse`.

**`reports.ts`** — Update type imports; `category`/`title`/`description`/`status` gone, replaced by `type`/`notes`.

### 5. Hooks — `apps/seller/lib/hooks/`

**`requests/useSupplyRequests.ts`** — Update `CreateSupplyRequestInput` type reference; `status` no longer in response type.

**`reports/useIncidentReports.ts`** — Update `CreateIncidentReportInput` type reference; `category`/`title`/`description`/`status` gone.

**Note:** Expenses don't have a dedicated hook — they go through `useSummaries`. Check `useDailySummaries.ts` for any `expenseType` / `expense_type` references.

### 6. UI Components — `apps/seller/app/[tenantSlug]/mobile/home/manage/`

**`expense/add/page.tsx`**
- `createExpenses` call: rename `expenseType` field → `type` (or `label`/`customLabel` depending on how `useSummaries.createExpenses` maps it — check that hook)
- No UI field needed for `notes` or `photo_url` yet (nullable, added for future)

**`expense/page.tsx`**
- Update any display of `expenseType` → `type`

**`request/add/page.tsx`**
- Remove `SupplyRequestType` enum import and type cast
- Keep `SUPPLY_REQUEST_TYPES` / `SUPPLY_REQUEST_TYPE_LABELS` as UI suggestion list
- `type` field is now free string — `SelectInput` still works with suggestions + custom
- Remove `status` from any submit payload

**`request/page.tsx`**
- Remove any `status` display/badge

**`report/add/page.tsx`**
- Rename `selectedCategory` → `selectedType`, `description` → `notes`
- Drop `customTitle` state — `type` field handles custom text directly via `SelectInput`'s `otherValue`
- Remove `title` construction logic before `create()` call
- Remove `IncidentCategory` type import
- Keep `INCIDENT_CATEGORIES` / `INCIDENT_CATEGORY_LABELS` as UI suggestion list
- Update `create()` call: `category`/`title`/`description` → `type`/`notes`

**`report/page.tsx`**
- Remove any `status`, `title`, `category` display — use `type` and `notes`

**`home/_components/AtAGlance.tsx` (or similar)**
- Recently added timeline renders `supply_requests` and `incident_reports` — dropping `status`, `title`, `category` may affect display logic. Check and update.

---

## Post-Migration Checklist

- [ ] Run `supabase migration new unify_expense_request_report_schema` and paste SQL
- [ ] Developer runs `supabase db push` manually
- [ ] Run `pnpm types:db` to regenerate `packages/db/types.ts`
- [ ] Update `packages/features/expenses/schema.ts`
- [ ] Update `packages/features/requests/schema.ts`
- [ ] Update `packages/features/reports/schema.ts`
- [ ] Update `packages/services/expenses.ts`
- [ ] Update `packages/services/requests.ts`
- [ ] Update `packages/services/reports.ts`
- [ ] Verify `apps/seller/app/api/expenses/route.ts`
- [ ] Verify `apps/seller/app/api/requests/route.ts`
- [ ] Verify `apps/seller/app/api/reports/route.ts`
- [ ] Update `apps/seller/lib/api/expenses.ts`
- [ ] Update `apps/seller/lib/api/requests.ts`
- [ ] Update `apps/seller/lib/api/reports.ts`
- [ ] Update `apps/seller/lib/hooks/requests/useSupplyRequests.ts`
- [ ] Update `apps/seller/lib/hooks/reports/useIncidentReports.ts`
- [ ] Check `apps/seller/lib/hooks/summaries/useDailySummaries.ts` for expense field refs
- [ ] Update `manage/expense/add/page.tsx`
- [ ] Update `manage/expense/page.tsx`
- [ ] Update `manage/request/add/page.tsx`
- [ ] Update `manage/request/page.tsx`
- [ ] Update `manage/report/add/page.tsx`
- [ ] Update `manage/report/page.tsx`
- [ ] Check and update `AtAGlance` timeline component for removed fields (`status`, `title`, `category`)

---

## Notes

- `user_id` on expenses is nullable — existing rows have no user attached, that's fine
- `photo_url` and `notes` on expenses: nullable, no UI for now — added for future use
- `SUPPLY_REQUEST_TYPES` and `INCIDENT_CATEGORIES` constants stay in feature schemas as UI suggestion lists — just no longer used in `z.enum()`
- Dropping `title` from `incident_reports` loses existing title data — acceptable since it was derived from category label anyway
- Dropping `status` from both tables loses existing status data — acceptable per product decision
- CHECK constraint names in SQL (`incident_reports_category_check` etc.) follow Postgres naming conventions but may differ — verify with `\d incident_reports` and `\d supply_requests` before running, or rewrite as `DROP CONSTRAINT IF EXISTS`
