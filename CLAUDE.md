# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### Essential Commands

**Development:**
- `pnpm dev` — Start all dev servers (Turbo manages both admin and seller apps simultaneously)
- `pnpm dev:seller` — Start seller app only
- `pnpm dev:admin` — Start admin app only
- `pnpm build` — Build all apps and packages
- `pnpm lint` — Lint all workspaces with ESLint 9 + TypeScript 5

**Database:**
- `pnpm types:db` — Regenerate Supabase TypeScript types from remote schema into `packages/db/types.ts`

### Environment Setup

Copy `.env` from project root. Key variables:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client auth
- `SUPABASE_SERVICE_ROLE_KEY` — Backend-only, for privileged operations
- `NEXT_PUBLIC_FEATURES` — Feature flags (e.g., "qris" for payments)
- `TIMEZONE_OFFSET` / `NEXT_PUBLIC_TIMEZONE_OFFSET` — App timezone (currently +7 for Indonesia)
- `TOMORROW_IO_API_KEY` / `XENDIT_API_KEY` — Weather and payment provider APIs

Node 18+, pnpm 9.0.0 required.

---

## Codebase Architecture

### High-Level Structure

This is a **monorepo for a multi-tenant Point-of-Sale (POS) system** for tea shops, built with:
- **Framework:** Next.js 15 (App Router, Server Components)
- **Package Manager:** pnpm workspaces
- **Build Tool:** Turbo for parallelized builds/dev
- **Auth:** Supabase (JWT-based)
- **Database:** Supabase PostgreSQL (auto-generated TypeScript types)
- **UI:** Radix UI primitives + Tailwind CSS 4
- **Forms:** React Hook Form + Zod schema validation
- **State:** SWR (client data fetching) + React Context (auth)
- **PWA:** next-pwa for offline support and installability
- **Analytics:** Vercel Analytics, custom weather API, Mapbox (admin only)

### Workspace Layout

```
├── apps/
│   ├── seller/          # Seller-facing mobile PWA (POS, orders, analytics, profile)
│   ├── admin/           # Admin/manager web dashboard (currently undergoing refactor)
│
├── packages/
│   ├── db/              # Supabase auto-gen types (types.ts)
│   ├── features/        # Zod schemas organized by domain (tenants, orders, products, etc.)
│   ├── ui/              # Shared Radix UI components (buttons, dialogs, tables, etc.)
│   ├── services/        # Business logic — DB access, external APIs (no React, no HTTP)
│   ├── utils/           # Shared utilities (formatting, navigation, schema helpers)
│
├── supabase/            # Supabase project config and temp files
```

### Multi-Tenancy Architecture

**Tenant Resolution:**
- Routes: `/:tenantSlug/*` — slug is looked up in DB to get tenant ID
- Middleware (`middleware.ts`) validates tenant existence and user access before rendering
- Cookie-based: `x-tenant-id` (HTTP-only, 24h) cached in middleware for fast tenant lookups
- User can belong to multiple tenants; middleware redirects to first valid one if accessing wrong tenant

**Tenant Context:**
- `[tenantSlug]/TenantProvider.tsx` wraps all tenant routes with React Context
- Pass `initialTenant` data from SSR layout to avoid extra DB call
- Provides tenant info to client components

**Authorization:**
- Profiles have `role` (ADMIN / SELLER / MANAGER)
- Super admins (`role = 'ADMIN'`) can access any tenant
- Regular users checked against `user_tenant_assignments` table
- Store-level roles in `user_store_assignments` (e.g., seller vs manager)
- Middleware enforces RLS: redirects unauthenticated users to `/login`, denies cross-tenant access

### Database & Schema

**Generated Types:** `packages/db/types.ts` auto-generated from Supabase schema. Regenerate with `pnpm types:db`.

**Schema Organization:** Each domain (orders, products, tenants, etc.) has a dedicated Zod schema file in `packages/features/{domain}/schema.ts`:
- **Input schemas:** `Create{Entity}Input`, `Update{Entity}Input` (POST/PUT/PATCH)
- **Query schemas:** `List{Entity}Query`, `Get{Entity}Query` (GET params)
- **Response schemas:** `{Entity}Response`, `{Entity}ListResponse`, `Create{Entity}Response` (API responses)
- **Type exports:** Each schema exports both Zod schema and inferred TypeScript type

**Schema Conventions:**
- Use camelCase in schemas (API layer) — convert from DB snake_case with `toCamelKeys()` utility
- OpenAPI annotations (`z.object().openapi({ description, example })`) for API docs
- Cross-domain refs via imports, e.g., orders import `PaymentMethodSchema` from payments

**Key Tables:**
- `tenants` — Workspaces
- `profiles` — User metadata (role, full name, email, phone)
- `user_tenant_assignments` — Role per user per tenant
- `user_store_assignments` — Role per user per store
- `tenant_invites` — Pending invitations to join a tenant
- `stores` — Individual tea shop locations
- `products` — Inventory
- `product_categories` — Product groupings
- `orders` + `order_items` — Transaction history
- `payments` — Payment records
- `daily_summaries` — Cash reconciliation per seller per day
- `daily_summary_photos` — Photos attached to a daily summary
- `expenses` — Cost tracking
- `customer_feedbacks` — Geotagged feedback with weather + location
- `notification_events` — System notification payloads
- `notification_reads` — Per-user read receipts for notifications
- `weather_hourly` — Cached hourly weather forecast data

### Auth & Session Management

**Middleware Auth Flow (`apps/seller/middleware.ts`):**
1. Skip expensive DB checks for static assets
2. Call Supabase `auth.getUser()` for JWT validation
3. If tenant slug in URL: look up tenant ID in parallel with auth check
4. Cache tenant ID in `x-tenant-id` cookie (24h) to avoid repeated DB queries on warm requests
5. If user has cached role cookie, refresh TTL only (no DB call); else fetch profile once and cache for 7 days
6. Verify user belongs to tenant via `user_tenant_assignments`; redirect to accessible tenant or `/unauthorized` if none
7. Handle `/login`, `/signup`: redirect authenticated users to first valid tenant's POS or profile page
8. Handle `/{tenant}/mobile` root: route to POS or profile based on store role

**Client Auth Context (`apps/seller/lib/context/AuthContext.tsx`):**
- Provider receives `initialUser` from root layout cookie
- SWR fetches full profile on mount (or skips if no initial user)
- Falls back to cookie data immediately (no loading state needed)
- Cached role + email from middleware avoids profile DB call on page load

**Cookie Strategy:**
- `x-user-info` (client-readable, 7 days) — id, role, fullName, email
- `x-tenant-id` (HTTP-only, 24 hours) — cached tenant ID to avoid DB lookup on each middleware call
- Supabase session cookie (HTTP-only) — managed by Supabase SDK, JWT expires after refresh token lifetime

### Apps

#### **Seller App** (`apps/seller`)

Mobile-first POS system for cashiers and sellers.

**Tech Stack:**
- PWA with Workbox caching (offline support)
- Iconify Fluent Emoji icon support
- QR code generation (react-qr-code)
- Image compression for uploads
- Recharts for analytics charts
- Leaflet + Mapbox for customer feedback map
- Vaul for drawer/sheet components
- Sonner for toast notifications

**Routes (mobile):**
- `/{tenantSlug}/mobile/pos` — Point-of-sale interface
- `/{tenantSlug}/mobile/orders` — Order history; `/orders/chart` for hourly chart
- `/{tenantSlug}/mobile/analytics` — Daily summary dashboard
  - `/analytics/chart` — Sales trend charts (daily, day-of-week, product)
  - `/analytics/daily/close` — End-of-day closing flow (cash count, photos, notes)
- `/{tenantSlug}/mobile/inbox` — Notifications inbox
- `/{tenantSlug}/mobile/notifications/[id]/weather` — Weather notification detail
- `/{tenantSlug}/mobile/more` — Profile + settings hub
  - `/more/map` — Customer feedback map
  - `/more/stores` — Stores list
- `/{tenantSlug}/mobile/account` — Account profile; `/account/details` for edit
- `/{tenantSlug}/mobile/tasks` — Tasks progress tracker
- `/(auth)/login` — Auth

**API Routes** (`apps/seller/app/api/`):
- `orders` / `orders/list` — CRUD + paginated list
- `products`, `stores`, `profiles` — Standard CRUD
- `summaries`, `summaries/breakdown`, `summaries/photo`, `summaries/photo/count` — Daily summary + photo management
- `expenses` — Expense tracking
- `analytics/daily-sales`, `hourly-sales`, `day-of-week-sales`, `product-sales` — Aggregated analytics
- `payments/qris`, `/simulate`, `/webhook` — QRIS payment flow (feature-flagged)
- `customer-feedbacks` — Geo-tagged feedback
- `notifications`, `notifications/[id]/read` — Notification management
- `weather` — Current weather
- `cron/weather/fetch`, `/notify`, `/realtime` — Cron-triggered weather jobs
- `version` — App version info

**Lib structure:**
- `lib/api/` — Typed API clients (one file per domain, calls `fetch()` only)
- `lib/hooks/` — SWR hooks organized by domain (call api clients only)
- `lib/context/` — React contexts: Auth, Store, FastOrderMode, ProfileIcon, Toast, Features
- `lib/supabase/` — Supabase client helpers (server + admin)

**Key Patterns:**
- Turbopack dev server (`pnpm dev:seller`)
- PWA config disables in dev, enables in prod; aggressive caching for Supabase API + product images
- Client components use SWR for real-time order/product updates
- Analytics instrumented for conversion tracking

#### **Admin App** (`apps/admin`)

Manager/admin web dashboard for business operations. **Currently undergoing refactor — do not use as a pattern reference.**

**Tech Stack:**
- Recharts for sales analytics
- Leaflet + Mapbox for geo-visualization
- OpenAPI schema export (zod-to-openapi)

**Routes:**
- `/{tenantSlug}/admin` — Overview dashboard
- `/{tenantSlug}/admin/products` — Inventory management
- `/{tenantSlug}/admin/orders` — Sales history
- `/{tenantSlug}/admin/stores` — Location/branch management
- `/{tenantSlug}/admin/users` — User management
- `/{tenantSlug}/admin/pos` — Admin POS view
- `/{tenantSlug}/admin/settings` — Tenant settings
- `/{tenantSlug}/admin/[storeId]` — Per-store drill-down (orders, pos, users)

### Shared Packages

#### **`packages/features`**

Zod schema definitions for all domain entities. Structure: `{domain}/{schema,openapi}.ts`

Domains:
- **tenants** — Workspace creation/management; includes `invites-schema.ts` and `user-assignments-schema.ts`
- **orders** — Sales transactions; includes `order-list-schema.ts` for paginated list response
- **products** — Inventory; includes `categories-schema.ts` for product categories
- **stores** — Branch/location data; includes `user-assignments-schema.ts` for store user roles
- **summaries** — Daily cash reconciliation and photo records; includes `photos-schema.ts`
- **profiles** — Seller profile info
- **users** — Auth user info
- **payments** — Payment method enum + QRIS schemas
- **expenses** — Cost entries
- **analytics** — Aggregated sales metrics (hourly, daily, product, day-of-week)
- **customer-feedbacks** — Location-tagged reviews
- **notifications** — System alerts
- **weather** — Weather codes and forecast schemas
- **shared** — Common schemas (UUID, timestamp, error responses), feature flags (`isEnabled()`), version, photo slot types

#### **`packages/ui`**

Radix UI component library (buttons, dialogs, tables, avatars, etc.) + Tailwind styling. All components use `cn()` utility for class merging.

#### **`packages/db`**

- `types.ts` — Supabase auto-generated TypeScript types (regenerate with `pnpm types:db`)

#### **`packages/utils`**

- `formatCurrency()`, `formatDate()`, `formatTimeAgo()` — Localization helpers
- `cn()` — Tailwind class merging (alias for `clsx` + `tailwind-merge`)
- `schemas.ts` — `toCamelKeys()` for converting DB snake_case to API camelCase
- `roleUtils.ts` — Role-based access helpers
- `navigation.ts` — Tenant-aware route builders
- `time.ts`, `weatherCode.ts` — Domain-specific utilities
- `server-config/` — Tenant URL, timezone resolution

#### **`packages/services`**

Business logic services — each receives a `SupabaseClient` as first argument. No HTTP, no React.
- `orders.ts` — Create orders, list with filters, attach items
- `products.ts` — List products by tenant/store
- `stores.ts` — List and look up stores
- `summaries.ts` — Daily summary creation, update, breakdown; photo management
- `expenses.ts` — Create and list expenses
- `analytics.ts` — Aggregate sales by hour, day, product
- `profiles.ts` — Fetch and update seller profiles
- `notifications.ts` — Create, list, mark-read alerts
- `customer-feedbacks.ts` — Submit feedback with geo-location scoring
- `weather.ts` — Tomorrow.io API integration (forecasts, current conditions, cron jobs)

### Layered Architecture Pattern

The seller app enforces a strict 5-layer architecture. Each layer has one job and must not reach past the next layer.

```
service     packages/services/*.ts
    ↓
api route   apps/seller/app/api/**/route.ts
    ↓
api client  apps/seller/lib/api/*.ts
    ↓
hook        apps/seller/lib/hooks/**/*.ts
    ↓
component   apps/seller/app/**/…/page.tsx  or  _components/
```

**Layer rules:**

| Layer | Job | May use | Must NOT use |
|---|---|---|---|
| **service** | DB queries, external API calls, business logic | `SupabaseClient`, `process.env`, `fetch()` to external APIs | React, `next/headers`, `apiFetch` |
| **api route** | Auth check, validate input, call service, return response | service functions, Zod schemas, `NextResponse` | Raw Supabase queries, business logic |
| **api client** | Wrap each API route in a typed function | `apiFetch()`, `buildParams()`, Zod `.parse()` | SWR, `useState`, React |
| **hook** | Manage UI state and data lifecycle | api client functions, SWR `useSWR`/`mutate` | `fetch()` directly, Supabase, business logic |
| **component** | Render UI | hooks, context | api clients, Supabase, `fetch()`, business logic |

**Real examples (all in `apps/seller`):**

- Service: `packages/services/orders.ts` — `listOrders(supabase, params)`, pure DB logic
- Route: `app/api/orders/route.ts` — validates `ListOrdersQuery`, calls `listOrders`, returns JSON
- API client: `lib/api/orders.ts` — `ordersApi.list(params)` calls `/api/orders`, Zod-parses response
- Hook: `lib/hooks/orders/useStoreOrders.ts` — SWR key on `storeId+date`, calls `ordersApi.list`
- Component: `app/[tenantSlug]/mobile/orders/_components/MobileOrders.tsx` — calls `useStoreOrders`

**Note on server components:** Layouts and `page.tsx` files that are server components (no `"use client"`) may call `createRouteHandlerClient()` directly to fetch initial data for SSR — this is expected and correct. The no-Supabase-in-components rule applies to client components only.

**Known violations / in-progress:**
- `useQrisPayment.ts` correctly calls `paymentsApi` (api client layer) — conforms to the pattern.
- Any hook file that imports from `@supabase/*` directly is a violation.

### Data Fetching & State

**Server-Side:**
- Layout components fetch initial data (e.g., user profile, tenant info)
- Pass to client components via props or Context
- Middleware validates auth before rendering

**Client-Side:**
- SWR for polling and cache management (dedupe 5s, no focus revalidation)
- Prefer optimistic updates with `mutate()` for fast UX
- `@tanstack/react-table` for data tables (sorting, filtering, pagination)

**Forms:**
- React Hook Form with Zod validation
- `@hookform/resolvers` for Zod integration
- Display errors inline; submit on enter or button click

### Styling

**Tailwind CSS 4** with PostCSS. Config via `tailwindcss.config.js` (extends with custom colors, animations).

**Conventions:**
- Use `cn()` utility to merge Tailwind classes
- Radix UI components come pre-styled; extend via className if needed
- Animations via `tailwindcss-animate` + `tw-animate-css`
- Dark mode supported (theme toggle via `next-themes`)

---

## Development Workflow

### Adding a New Feature

1. **Define schema** in `packages/features/{domain}/schema.ts`
   - Input/query/response schemas with OpenAPI annotations
   - Type exports for TypeScript

2. **Create components** in app directory or shared `packages/ui`
   - Use Radix UI primitives where possible
   - Client components for interactivity; server components for data fetching

3. **Fetch data** server-side in layouts/pages; pass to clients via props
   - Or use SWR on client for polling

4. **Wire into app**
   - Add route in `apps/seller` or `apps/admin`
   - Ensure user roles checked in middleware/layout

5. **Test locally**
   - `pnpm dev:seller` or `pnpm dev:admin`
   - Verify auth flow and tenant isolation

### Debugging

**Middleware Issues:**
- Check `middleware.ts` matcher config to confirm route is covered
- Log tenant/user resolution in middleware (careful not to expose secrets)
- Test with different user roles and tenant assignments

**Tenant Context Not Available:**
- Ensure component uses `useContext(TenantContext)` inside `[tenantSlug]` layout
- Root layout `/` routes won't have tenant context

**SWR Cache Issues:**
- Use `mutate()` to revalidate after mutations
- Check SWR config: `dedupingInterval: 5000, revalidateOnFocus: false`
- Inspect Network tab for duplicate requests

**Supabase Auth Failures:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Check session in browser DevTools (cookies tab)
- Middleware logs auth errors; check terminal

### Database Migrations

Schema changes require manual SQL in Supabase Dashboard (RLS policies, new columns, etc.).

After schema change:
1. Update Supabase via Dashboard or CLI
2. Run `pnpm types:db` to regenerate TypeScript types
3. Update Zod schemas in `packages/features` to match new types

---

## Key Architectural Decisions

### Server Components by Default

Layouts and pages are server components (async). Fetch data at the tree level where needed. Only use client components for interactivity (forms, modals, tables).

### Tenant Cookie Caching

Middleware caches tenant ID in a cookie to avoid DB lookup on every request. Tenant lookup is only done if the slug in the URL is not a reserved word (`api`, `login`, etc.). This dramatically speeds up warm requests.

### Role-Based Access Control via Middleware

Auth is enforced in middleware before rendering, not in components. Unauthenticated or unauthorized users see a redirect or error page, not a blank UI.

### Zod for Schema & OpenAPI

All schemas live in `packages/features` and double as runtime validation + OpenAPI docs. No separate schema or spec files needed.

### Cross-App Shared Code

Both seller and admin apps import from `packages/ui`, `packages/features`, `packages/utils`, `packages/db`, `packages/services`. This ensures consistency and reduces duplication. Changes to shared code require `pnpm build`.

### No Global Database Abstraction

Direct Supabase client calls via `@supabase/supabase-js` in components and services. This keeps code simple and readable, though it means RLS policies enforce access control, not app logic.

---

## Common Patterns & Gotchas

### Tenant Isolation
- Always include `tenant_id` in WHERE clauses (RLS enforces, but good practice)
- Middleware ensures tenant cookie is set; use `request.cookies.get('x-tenant-id')` in route handlers

### Schema Validation
- Fetch raw data from Supabase, convert keys with `toCamelKeys()`, validate with Zod schema
- This ensures types are correct and API responses match spec

### Image Uploads
- Use `browser-image-compression` to reduce size before upload
- Store in Supabase Storage or external CDN (ibb.co in config)
- Cache aggressively in PWA config (product images cached for 30 days)

### PWA Caching
- Dev: PWA disabled (clear cache frequently for testing)
- Prod: Aggressive caching for static assets, Supabase API, product images
- Runtime cache with 5-minute expiry for dynamic data; network-first strategy

### Feature Flags
- Read from `NEXT_PUBLIC_FEATURES` env var as comma-separated list
- Use `isEnabled(feature)` from `packages/features/shared/features.ts`
- Available flags: `"qris"` (QRIS payment flow), `"new-dashboard"`, `"export-pdf"`
- Example: `if (isEnabled('qris')) { /* show QRIS payments */ }`

### Timezone Handling
- All timestamps in DB are UTC
- `TIMEZONE_OFFSET` used client-side to display local time
- Use `formatDate()` from utils for consistent formatting

---

## Important Files to Know

- `.env` — Environment variables (Supabase, API keys, feature flags)
- `turbo.json` — Turbo build config and task pipelines
- `apps/seller/middleware.ts` — Auth/tenant routing logic
- `apps/seller/lib/api/client.ts` — `apiFetch()` and `buildParams()` used by all API clients
- `packages/features/shared/common-schema.ts` — Base Zod schemas (UUID, timestamp, error)
- `packages/features/shared/features.ts` — `isEnabled()` feature flag helper
- `packages/db/types.ts` — Auto-gen Supabase types (read-only, regenerate with `pnpm types:db`)
- `pnpm-workspace.yaml` — Workspace configuration

---

## Notes for Future Claude Instances

- **Always run `pnpm install` first if dependencies change.** Turbo caches builds, so `pnpm build` may be fast/stale; use `turbo build --no-cache` if you suspect issues.
- **Middleware applies to both apps.** Changes to seller's `middleware.ts` don't affect admin. Update both if changing auth logic.
- **Tenant slug is immutable.** `user_tenant_assignments.tenant_id` is a foreign key; renaming a tenant requires data migration.
- **RLS policies in Supabase are the source of truth for access control.** App logic should assume policies work correctly.
- **SWR dedupes within 5 seconds.** Don't worry about duplicate request cancellation; it's automatic.
- **Next.js caching is aggressive.** Use `revalidatePath()` in route handlers or `mutate()` in SWR to force revalidation after mutations.

