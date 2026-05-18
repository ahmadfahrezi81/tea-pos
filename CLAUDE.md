# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Meta — Instructions for Claude Code

- **At the start of every session**, read `packages/db/types.ts` to understand the current DB schema before making any changes.
- **Keep this file updated** — but only for meaningful structural changes: new packages, refactors, architecture shifts, new patterns. Do NOT update for small changes like adding a single component or minor bug fixes.
- If you refactor a package, rename a pattern, or add a new layer/domain, update the relevant section here.

---

## Quick Start

### Essential Commands

**Development:**

- `pnpm dev` — Start all dev servers (Turbo manages both admin and seller apps)
- `pnpm dev:seller` — Start seller app only
- `pnpm dev:admin` — Start admin app only
- `pnpm build` — Build all apps and packages
- `pnpm lint` — Lint all workspaces with ESLint 9 + TypeScript 5

**Database:**

- `pnpm types:db` — Regenerate Supabase TypeScript types from remote schema into `packages/db/types.ts`

### Environment Setup

Copy `.env` from project root. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client auth
- `SUPABASE_SERVICE_ROLE_KEY` — Backend-only, privileged operations
- `NEXT_PUBLIC_FEATURES` — Feature flags (e.g., `"qris"` for payments)
- `TIMEZONE_OFFSET` / `NEXT_PUBLIC_TIMEZONE_OFFSET` — App timezone (+7 for Indonesia)
- `TOMORROW_IO_API_KEY` / `XENDIT_API_KEY` — Weather and payment APIs

Node 18+, pnpm 9.0.0 required.

---

## Codebase Architecture

### High-Level Structure

Monorepo for a **multi-tenant POS system** for tea shops:

- **Framework:** Next.js 15 (App Router, Server Components)
- **Package Manager:** pnpm workspaces + Turbo
- **Auth & Database:** Supabase (JWT auth + PostgreSQL)
- **UI:** Radix UI primitives + Tailwind CSS 4
- **Forms:** React Hook Form + Zod
- **State:** SWR + React Context
- **PWA:** next-pwa (offline support)

### Workspace Layout

```
├── apps/
│   ├── seller/          # Seller-facing mobile PWA (POS, orders, analytics)
│   ├── admin/           # Admin dashboard (undergoing refactor — not a pattern reference)
│
├── packages/
│   ├── db/              # Supabase auto-gen types (types.ts) — read-only
│   ├── features/        # Zod schemas by domain
│   ├── ui/              # Shared Radix UI components
│   ├── services/        # Business logic — DB + external APIs (no React, no HTTP)
│   ├── utils/           # Shared utilities
│
├── supabase/
│   └── migrations/      # SQL migration files
```

---

## Database Migrations

### Workflow

No local database — all migrations go directly to the remote (staging or prod).

**Creating a migration:**

```bash
supabase migration new <descriptive_name>
# e.g. supabase migration new add_rls_policies
# Generates: supabase/migrations/20260511120000_add_rls_policies.sql
```

The CLI auto-generates the timestamp in `YYYYMMDDHHmmss` format — never manually name migration files.

**After writing your SQL:**

```bash
supabase migration list   # verify it looks correct before pushing
# Deployment is done manually by the developer — do not run db push
```

**After any schema change:**

```bash
pnpm types:db             # regenerate packages/db/types.ts
```

Then update Zod schemas in `packages/features` to match.

### Rules

- Always use `supabase migration new <name>` — never create or rename migration files manually
- Never run `supabase db push` — the developer does this manually
- RLS policies are the source of truth for access control; always include them in migrations for new tables
- One focused migration per change — don't bundle unrelated schema changes

---

## Multi-Tenancy Architecture

**Tenant Resolution:**

- Routes: `/:tenantSlug/*` — slug resolved to tenant ID via DB
- Middleware validates tenant + user access before rendering
- `x-tenant-id` cookie (HTTP-only, 24h) cached for fast lookups

**Authorization:**

- `profiles.role`: `ADMIN` / `USER` / `DRIVER` / `SUPPLIER`
- Super admins (`ADMIN`) can access any tenant
- Regular users checked against `user_tenant_assignments`
- Store-level roles in `user_store_assignments`

---

## Layered Architecture (Seller App)

Strict 5-layer pattern — never skip a layer:

```
service      packages/services/*.ts
    ↓
api route    apps/seller/app/api/**/route.ts
    ↓
api client   apps/seller/lib/api/*.ts
    ↓
hook         apps/seller/lib/hooks/**/*.ts
    ↓
component    apps/seller/app/**/page.tsx or _components/
```

| Layer          | Job                                | May use                                             | Must NOT use                        |
| -------------- | ---------------------------------- | --------------------------------------------------- | ----------------------------------- |
| **service**    | DB queries, business logic         | `SupabaseClient`, `process.env`, external `fetch()` | React, `next/headers`, `apiFetch`   |
| **api route**  | Auth, validate input, call service | service functions, Zod, `NextResponse`              | Raw Supabase, business logic        |
| **api client** | Typed wrapper for each API route   | `apiFetch()`, `buildParams()`, Zod `.parse()`       | SWR, React                          |
| **hook**       | UI state + data lifecycle          | api clients, SWR                                    | `fetch()`, Supabase, business logic |
| **component**  | Render UI                          | hooks, context                                      | api clients, Supabase, `fetch()`    |

**Exception:** Server components (`page.tsx`, layouts without `"use client"`) may call Supabase directly for SSR data fetching — this is correct.

**Opening a store:** Use `openStore()` from `packages/services/sessions.ts` — this is the single entry point that creates `daily_summary` first, then `store_session` with the returned ID. Never create them separately or in parallel. The old `POST /api/summaries` still works for legacy compatibility but new UI should use `POST /api/sessions`.

**Activity logging in services:** Use `createLogger` from `packages/services/activity-logs.ts` — never call `logActivity` directly. Create once per function with shared context, then call the returned `log()` for each event. It is fire-and-forget; failures are swallowed and never propagate.

```ts
const log = createLogger(supabase, { tenantId, userId, storeId });
log("order_created", { refId: id, refTable: "orders", metadata: { ... } });
```

Any API route that calls a mutating service must call `getRequestUser()` and pass `userId` down — the service layer needs it for logging.

**Real examples:**

- `packages/services/orders.ts` → `listOrders(supabase, params)`
- `app/api/orders/route.ts` → validates `ListOrdersQuery`, calls `listOrders`
- `lib/api/orders.ts` → `ordersApi.list(params)`
- `lib/hooks/orders/useStoreOrders.ts` → SWR on `storeId+date`
- `app/[tenantSlug]/mobile/orders/_components/MobileOrders.tsx` → calls `useStoreOrders`

---

## Schema & Types

**`packages/db/types.ts`** — auto-generated from Supabase. Read this at session start. Never edit manually. Regenerate with `pnpm types:db`.

**`packages/features/{domain}/schema.ts`** — Zod schemas per domain:

- `Create{Entity}Input`, `Update{Entity}Input` — POST/PUT
- `List{Entity}Query`, `Get{Entity}Query` — GET params
- `{Entity}Response`, `{Entity}ListResponse` — API responses

**Conventions:**

- camelCase in schemas; convert from DB snake_case with `toCamelKeys()`
- OpenAPI annotations via `z.object().openapi({ description, example })`

---

## Key Tables

- `tenants` — Workspaces
- `profiles` — User metadata (role, name, email, phone)
- `user_tenant_assignments` — Role per user per tenant
- `user_store_assignments` — Role per user per store
- `tenant_invites` — Pending invitations
- `stores` — Tea shop locations
- `products` + `product_categories` — Inventory
- `orders` + `order_items` — Transactions
- `payments` — Payment records
- `daily_summaries` + `daily_summary_photos` — Cash reconciliation. Uses `opened_by` + `closed_by` (profile IDs); `seller_id`/`manager_id` no longer exist
- `store_sessions` — POS ownership windows. One active session per store enforced by partial unique index. Sessions chain via `previous_session_id`. Created by `openStore()` immediately after `daily_summaries`
- `commission_configs` — Flat rate per cup per user. `user_id IS NULL` = tenant-wide default fallback
- `payroll_periods` — Weekly pay cycles (Monday–Sunday) per tenant
- `payroll_entries` — One row per user per daily summary on close. `rate_per_cup` snapshotted at creation so historical entries are immutable to future rate changes
- `expenses` — Cost tracking
- `customer_feedbacks` — Geotagged feedback
- `notification_events` + `notification_reads` — Notifications
- `weather_hourly` — Cached weather forecasts
- `activity_logs` — Audit trail of user actions. Known types: `order_created`, `store_open`, `daily_summary_closed`, `balance_updated`, `photo_uploaded`, `photo_deleted`, `photo_quantity_updated`, `expense_created`, `expense_updated`, `expense_deleted`, `customer_feedback_submitted`, `session_transferred`, `session_ended`, `commission_config_updated`, `payroll_entry_updated`, `payroll_period_updated`, `reimbursement_submitted`

---

## Common Patterns & Gotchas

**Tenant isolation:** Always include `tenant_id` in queries (RLS enforces, but be explicit).

**Schema validation:** `fetch from Supabase → toCamelKeys() → Zod.parse()` — always in that order.

**Feature flags:** `isEnabled('qris')` from `packages/features/shared/features.ts`. Flags: `qris`, `new-dashboard`, `export-pdf`.

**Timezone:** All DB timestamps are UTC. Use `formatDate()` from utils for display.

**Image uploads:** Compress with `browser-image-compression` before upload. Stored in Supabase Storage or ibb.co CDN.

**SWR config:** `dedupingInterval: 5000, revalidateOnFocus: false`. Use `mutate()` after mutations.

**Next.js caching:** Use `revalidatePath()` in route handlers after mutations.

---

## Important Files

- `apps/seller/middleware.ts` — Auth + tenant routing
- `apps/seller/lib/api/client.ts` — `apiFetch()` and `buildParams()`
- `packages/features/shared/common-schema.ts` — Base Zod schemas
- `packages/features/shared/features.ts` — `isEnabled()` feature flags
- `packages/db/types.ts` — Auto-gen Supabase types (**read at session start**)
- `turbo.json` — Build config
- `pnpm-workspace.yaml` — Workspace config

---

## Notes

- **`pnpm install` first** if dependencies changed. Use `turbo build --no-cache` if build seems stale.
- **Middleware is per-app.** `apps/seller/middleware.ts` and `apps/admin` are separate — update both if changing auth logic.
- **Tenant slug is immutable.** Renaming requires a data migration.
- **Admin app is being refactored.** Don't use it as a pattern reference.
