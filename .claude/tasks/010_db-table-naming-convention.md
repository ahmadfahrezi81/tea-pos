# Task 010 — DB Table Naming Convention Refactor

## Goal

Standardize all table names with domain prefixes so it's immediately obvious what each table belongs to when scanning the DB. Currently a mix of prefixed and unprefixed tables makes it hard to spot groupings.

> **Status: READY TO EXECUTE — Task 009 is complete.**
> Start a fresh session for this task. Read the checklist below before touching any code.

---

## Session Start Checklist

Before writing a single migration, do these in order:

1. **Read `packages/db/types.ts`** — confirm the current table names match this task's "Current" column. Task 009 has been applied so `expenses`, `supply_requests`, `incident_reports` will have their new column shapes.

2. **Read `packages/services/`** — scan all service files to get a full picture of every `.from("table_name")` call. The renaming map covers known tables but verify nothing is missed.

3. **Check Supabase Dashboard → Database → Functions** for a `handle_new_user` trigger before renaming `profiles` → `users`. If it exists, the migration must update the trigger body in the same step.

4. **Grep for RLS policy references** — run `grep -r "profiles\|orders\|products\|activity_logs" supabase/migrations/ --include="*.sql"` to find any raw SQL that references these tables by name. These need updating alongside the rename.

5. **Execute in the recommended order** (low-risk first, highest last) — do not batch multiple renames into one migration. One table = one migration.

---

## Proposed Convention

Prefix = the domain that "owns" the table. When you see a table name, the prefix tells you which part of the system it belongs to.

---

## Full Renaming Map

### `store_` — store-level daily operations

| Current | Proposed |
|---|---|
| `daily_summaries` | `store_daily_summaries` |
| `daily_summary_photos` | `store_daily_summary_photos` |
| `expenses` | `store_expenses` |
| `supply_requests` | `store_requests` |
| `incident_reports` | `store_reports` |
| `orders` | `store_orders` |
| `order_items` | `store_order_items` |
| `payments` | `store_order_payments` |

### `tenant_` — tenant config and catalog

| Current | Proposed |
|---|---|
| `products` | `tenant_products` |
| `product_categories` | `tenant_product_categories` |
| `commission_configs` | `tenant_commission_configs` |
| `activity_logs` | `tenant_activity_logs` |
| `customer_feedbacks` | `tenant_customer_feedbacks` |

### Root entities — no prefix (same as `tenants`, `stores`)

| Current | Proposed |
|---|---|
| `profiles` | `users` |

### `payroll_` — payroll domain
> Already prefixed: `payroll_periods`, `payroll_entries`

| Current | Proposed |
|---|---|
| `reimbursements` | `payroll_reimbursements` |

### Drop — unused tables

| Table | Reason |
|---|---|
| `tenant_invites` | Unused — drop the table |

### No change — already correctly named

| Table | Why |
|---|---|
| `tenants` | Root entity |
| `stores` | Root entity, treated same as tenants |
| `store_sessions` | ✓ |
| `payroll_periods` | ✓ |
| `payroll_entries` | ✓ |
| `user_store_assignments` | ✓ |
| `user_tenant_assignments` | ✓ |
| `notification_events` | ✓ |
| `notification_reads` | ✓ |
| `weather_hourly` | System/external data |

---

## Final Table List (post-migration)

All tables as they will exist after this task completes, grouped by prefix.

```
store_
  store_daily_summaries
  store_daily_summary_photos
  store_expenses
  store_order_items
  store_order_payments
  store_orders
  store_reports
  store_requests
  store_sessions

tenant_
  tenant_activity_logs
  tenant_commission_configs
  tenant_customer_feedbacks
  tenant_product_categories
  tenant_products

user_
  user_store_assignments
  user_tenant_assignments

payroll_
  payroll_entries
  payroll_periods
  payroll_reimbursements

notification_
  notification_events
  notification_reads

(root / ungrouped)
  stores
  tenants
  users
  weather_hourly
```

---

## Touch Surface (high-level, not exhaustive)

Renaming these tables is a large refactor — every `.from("table_name")` call in services, every FK reference in migrations, and all TypeScript type references need updating.

**Highest impact tables (used everywhere):**
- `orders` / `order_items` — POS, analytics, summaries service
- `products` / `product_categories` — POS, admin
- `activity_logs` — every service that logs
- `profiles` → `users` — referenced in nearly every service via FK and auth

**Medium impact:**
- `payments` — QRIS flow
- `customer_feedbacks` — isolated feature
- `reimbursements` — payroll feature

**Recommended execution order:**
1. Low-risk isolated tables first: `reimbursements`, `customer_feedbacks`, `commission_configs`
2. Medium: `payments`, `product_categories`, `daily_summaries`, `daily_summary_photos`
3. High: `products`, `expenses`, `supply_requests`, `incident_reports`
4. Highest: `orders`, `order_items`, `activity_logs`, `profiles` → `users` — do these last with full test pass

---

## Open Questions

**`profiles` → `users` vs `user_profiles`** *(decided: `users`)*

`users` was chosen to match the root entity pattern (`tenants`, `stores` have no prefix). Supabase has an `auth.users` table in the `auth` schema — this does NOT conflict with `public.users` since they are in different schemas. In SQL, unqualified `users` resolves to `public.users`; `auth.users` always requires explicit schema qualification. In the Supabase TypeScript client, `.from("users")` correctly points to `public.users`.

**Risks to verify before executing:**
- Any raw SQL in migrations, functions, or RLS policies that references `users` without a schema prefix could become ambiguous — audit these before renaming
- Supabase Dashboard may show both `auth.users` and `public.users` in the same table list — this is cosmetic only, not a functional issue
- The `handle_new_user` trigger (if it exists) inserts into `profiles` — must be updated to `users` in the same migration

---

## Notes

- Run Task 009 before this task — Task 009 modifies columns on `expenses`, `supply_requests`, `incident_reports` under their current names
- Each table rename = one focused migration (`ALTER TABLE x RENAME TO y`)
- FK constraints survive renames in Postgres — no need to drop/recreate them
- After each migration: `pnpm types:db` to regenerate `packages/db/types.ts`
- **Before renaming `profiles` → `users`:** check Supabase Dashboard → Database → Functions for a `handle_new_user` trigger. It's not in migrations so it may have been set up directly in the dashboard. If it exists, update the trigger function body to reference `users` as part of the same migration.
- **`activity_logs.ref_table`** stores table names as raw strings (e.g. `"orders"`, `"expenses"`). Historical rows will stay stale after renaming — acceptable caveat, no data migration needed.
- **After all renames:** update the Key Tables section in `CLAUDE.md` to reflect new names.
