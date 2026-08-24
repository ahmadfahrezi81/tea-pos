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

- `pnpm dev` — Start all dev servers (Turbo manages seller and backoffice apps)
- `pnpm dev:seller` — Start seller app only
- `pnpm dev:backoffice` — Start backoffice app only
- `pnpm dev:admin` — Admin is archived and out of the workspace; this script will not work
- `pnpm build` — Build all apps and packages
- `pnpm lint` — Lint all workspaces with ESLint 9 + TypeScript 5

**Database:**

- `pnpm types:db` — Regenerate Supabase TypeScript types from remote schema into `packages/db/types.ts`

### Environment Setup

Copy `.env` from project root. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client auth
- `SUPABASE_SERVICE_ROLE_KEY` — Backend-only, privileged operations
- `POSTHOG_API_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` — Analytics **and** the seller app's feature flags
- `TIMEZONE_OFFSET` / `NEXT_PUBLIC_TIMEZONE_OFFSET` — App timezone (+7 for Indonesia)
- `TOMORROW_IO_API_KEY` — Weather forecasts
- `XENDIT_API_KEY` / `XENDIT_WEBHOOK_TOKEN` — QRIS payments and webhook verification
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — Map screens
- `CRON_SECRET` — Guards `/api/cron/*` routes
- `NEXT_PUBLIC_FEATURES` — Legacy env feature flags; **backoffice only** (see Feature Flags below)

Node 18+, pnpm 9.0.0 required.

---

## Codebase Architecture

### High-Level Structure

Monorepo for a **multi-tenant POS system** for tea shops:

- **Framework:** Next.js 16 (App Router, Server Components, React Compiler enabled)
- **React:** 19.2
- **Package Manager:** pnpm workspaces + Turbo
- **Auth & Database:** Supabase (JWT auth + PostgreSQL)
- **UI:** Radix UI primitives + Tailwind CSS 4
- **Forms:** React Hook Form + Zod 4
- **State:** SWR + React Context
- **Analytics & Flags:** PostHog (`posthog-js` client, `posthog-node` server) + Vercel Analytics
- **PWA:** `@ducanh2912/next-pwa` (production builds only — disabled in dev)

### Workspace Layout

```
├── apps/
│   ├── seller/          # Seller-facing mobile PWA (POS, orders, analytics, payroll claims)
│   ├── backoffice/      # Backoffice mobile app (payroll admin, supply, dashboard) — active development
│   ├── admin/           # ARCHIVED — broken, excluded from workspace. Do not use as reference.
│
├── packages/
│   ├── db/              # Supabase auto-gen types (types.ts) — read-only
│   ├── features/        # Zod schemas + OpenAPI annotations by domain
│   ├── shell/           # Shared mobile app shell (header, footer nav, scroll, route table)
│   ├── ui/              # Shared Radix UI components
│   ├── services/        # Business logic — DB + external APIs (no React, no HTTP)
│   ├── utils/           # Shared utilities (translations, realtime, server-config, formatters)
│
├── supabase/
│   └── migrations/      # SQL migration files
```

Apps consume workspace packages as source — each app lists them in `transpilePackages` in `next.config.ts`. A new package must be added there.

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
- **`proxy.ts`** (not `middleware.ts`) is the Next 16 request interceptor. Both `apps/seller/proxy.ts` and `apps/backoffice/proxy.ts` exist and are separate — update both if changing auth logic.
- Proxy validates session, role, and tenant access before rendering, then writes cookies:
  - `x-tenant-id` — `"<slug>:<uuid>"`, HTTP-only, 24h
  - `x-tenant-access` — cached access grant, HTTP-only, 1h
  - `x-user-info` — JSON `{ id, role, fullName, email, avatarUrl, preferredLanguage }`, **readable by JS**, 7 days
- Server code reads the tenant via `getCurrentTenantId()` from `@tea-pos/utils/server-config/tenant`, and the caller via `getRequestUser()` from `lib/auth/get-request-user.ts` (which parses `x-user-info`).

**Authorization:**

- `users.role`: `ADMIN` / `USER` / `DRIVER` / `SUPPLIER`
- The seller app admits only `USER` and `ADMIN`; `DRIVER` and `SUPPLIER` have their own apps
- Super admins (`ADMIN`) can access any tenant
- Regular users checked against `user_tenant_assignments`
- Store assignments (with a default store) in `user_store_assignments`

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
| **api route**  | Auth, validate input, call service | service functions, Zod, response helpers            | Raw Supabase, business logic        |
| **api client** | Typed wrapper for each API route   | `apiFetch()`, `buildParams()`, Zod `.parse()`       | SWR, React                          |
| **hook**       | UI state + data lifecycle          | api clients, SWR                                    | `fetch()`, Supabase, business logic |
| **component**  | Render UI                          | hooks, context                                      | api clients, Supabase, `fetch()`    |

**Exception:** Server components (`page.tsx`, layouts without `"use client"`) may call Supabase directly for SSR data fetching — this is correct.

**API route shape.** Routes use the helpers in `apps/seller/lib/api/response.ts` — `ok`, `err`, `badRequest`, `unauthorized`, `forbidden`, `handleError` — rather than raw `NextResponse.json`. The canonical body:

```ts
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListThingQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await listThings(supabase, { tenantId, ...query.data });
        const parsed = ThingListResponse.safeParse(data);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/things", error); }
}
```

**Service-role client:** most seller API routes use `getServiceClient()` (`lib/supabase/service.ts`), which **bypasses RLS**. Tenant scoping in those routes is therefore manual and mandatory — every query must filter on the `tenantId` resolved from the cookie. Never derive a tenant or store id from the request body.

**Opening a store:** Use `openStore()` from `packages/services/sessions.ts` — the single entry point that creates the `store_daily_summaries` row first (seeding totals from any orders already on that date), then the `store_sessions` row with the returned id and a generated `claim_code`. Never create them separately or in parallel. `POST /api/summaries` still exists for legacy compatibility; new UI should use `POST /api/sessions`.

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
- `app/[tenantSlug]/mobile/orders/_components/Orders.tsx` → calls `useStoreOrders`

---

## Boot Path

The 5-layer table answers **what may this code touch?** — and it works because
capabilities are visible in the import list. The boot path fails a different
question, **how often does this run?**, and that one is invisible: `MobileLayout`
reads like it runs once per open, but it runs once per screen *and* once per
prefetch. Nothing in the file says so.

So the boot path gets its own contract. Classify every server-side read by cost,
then cap what each place may use.

| Tier | What | Where it may run |
| ------ | ---- | ---------------- |
| **0 — Free** | Cookies, headers, static files. No I/O. | Anywhere, unlimited |
| **1 — Cached** | A DB read behind a TTL. The TTL must be stated. | Layouts and below |
| **2 — Live** | An uncached DB read. | **Never a layout.** API route + client hook, or a leaf page |
| **3 — External** | PostHog, Xendit, weather, any third party. | **Never on the render path.** Route + client hook |

One line to remember: **a layout may only do Tier 0 and Tier 1.**

**A tier is a property of the mechanism, not of the data.** Flags fetched over the
network are Tier 3; the same flags evaluated locally are Tier 0. An uncached
query is Tier 2; wrap it in a TTL and it is Tier 1. So the question a reviewer
asks is not *where am I allowed to put this* but **how do I move it into a
cheaper tier** — and "move it off the render path entirely, into an API route a
client hook calls after hydration" is always an available answer.

Worked examples, including the ones that were right:

| Decision | Tier | Verdict |
| -------- | ---- | ------- |
| `public/launch.html`, served from the precache | 0 | Correct — being Tier 0 is *why* it can be precached at all |
| Store list, `unstable_cache` 60s, in the layout | 1 | Correct |
| Pay frequency, `unstable_cache` 300s, in the layout | 1 | Correct |
| Session gate, uncached, in a client hook | 2, in the right place | Correct — `live` is a legitimate answer |
| PostHog evaluation in the layout | 3 in a layout | Banned. Reverted; see task 054 |
| Backoffice pay frequency, uncached in the layout | 2 in a layout | Was banned, now fixed — it is the Tier 1 row above |

### The proxy answers from cookies unless it can prove it cannot

`proxy.ts` runs on every matched request **including every prefetch** — the
hottest code in either app. Every DB read in it carries a written reason for why
a cookie will not do.

| Read | Freshness | Why |
| ---- | --------- | --- |
| Tenant lookup | `x-tenant-id` cookie, 24h | Slug→id never changes |
| Access check | `x-tenant-access` cookie, 1h | Membership changes rarely |
| `supabase.auth.getUser()` | `live` | Session validation |
| `users` row for role + status | `live`, deliberately | A cached role keeps a suspended account working until the cookie expires. The security trade is not worth the latency |

That last row is the shape to imitate. Not caching role and status is a correct
decision sitting between two reads that *are* cached — indistinguishable from an
oversight unless the reason is written next to it. **A deliberate choice that is
not written down decays into an accident.**

### Every server read declares its freshness

`live`, a TTL, or `immutable` — in a comment beside the read. `live` is a
legitimate answer; an *undeclared* one is not. The backoffice pay-frequency read
was uncached in a layout for months precisely because it declared nothing, so
nobody could see it was wrong while seller's identical call was right.

### Boot budget

What one cold open costs, cookies warm. Check this before adding anything to a
layout or the proxy — a regression shows up here in review, not on a phone.

**Seller.** On the critical path: 1 precached document (`launch.html`, no
server), then 1 navigation — which is 1 proxy run (1 auth round trip + 1 live
`users` read, the tenant and access reads coming from cookies) and 1 layout run
(2 cached reads + 3 cookie reads). Off it: 1 PostHog call after hydration.

**Backoffice:** the same shape, 1 cached read per layout run instead of 2, and no
flags call — it uses env flags.

**So an open is 1 proxy run and 1 layout run — while prefetching is off.** It was
7 and 7. `MobileShell` gates prefetches on `ready` and schedules them in an idle
callback so they never tax the open, but off the critical path is not free: each
one pays the full proxy, live `users` read included. That multiplier is the whole
point of this section — a read that looks like it costs 40ms cost seven times
that per open, and the number appeared nowhere in the file that performs it.

Prefetching is currently **disabled** by `PREFETCH_DISABLED` in
`packages/shell/MobileShell.tsx` — a deliberate, temporary experiment; see task
057. With it back on the budget is 5 proxy runs for seller and 3 for backoffice:
the tables in each app's `app/[tenantSlug]/mobile/config/navigation.ts` declare
5 and 3 routes as `prefetch: true`, and the shell skips whichever one you are
already looking at.

---

## Mobile Shell (`packages/shell`)

Both mobile apps render inside the shared `MobileShell` — header, scrollable content region, and bottom chrome as three real flex children, so no height is ever measured or guessed.

- `MobileShell.tsx` — the shell itself. Route data, chrome, and i18n are **props**, never inferred inside the package.
- `routes.ts` — `RouteConfig` type. Every field describes a *layout capability* (`inlineHeader`, `headerAction`, `titleAccessory`, `footerCtaKey`, `preserveScroll`, `scrollPaddingBottom`), never a specific screen. `parent: null` marks a root tab; `"lastRootTab"` returns to whichever tab the user came from.
- `MobileHeader.tsx`, `MobileFooterNav.tsx`, `FooterSlotContext.tsx`, `ScrollContext.tsx`, `useScrollRestoration.ts`, `useStandaloneViewportHeight.ts`.

Each app owns its own route table and wiring:

- Seller: `app/[tenantSlug]/mobile/config/navigation.ts` + `app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx`
- Backoffice: the same pair under `apps/backoffice`

When adding a screen, add its entry to that app's route table — the shell derives title, back target, and header/footer chrome from it.

**Seller provider order** (`app/[tenantSlug]/mobile/layout.tsx`): `RealtimeProvider → StoreProvider → FlagsProvider → FastOrderModeProvider → ToastProvider → ErrorSheetProvider → MobileLayoutClient`. `AuthProvider` and `LanguageProvider` sit above, in the root `app/layout.tsx`, hydrated from the `x-user-info` and `locale` cookies.

---

## Internationalization

- Messages live in `packages/utils/translations/{en,id}.ts`; `t(locale, key)` resolves dotted keys and falls back to English.
- Client code calls `useT()` (`lib/hooks/useT.ts`) → `LanguageContext`.
- The chosen locale is stored on `users.preferred_language` and mirrored into a `locale` cookie so the server render starts in the right language.
- The root layout sets `google: "notranslate"` — browser auto-translate rewrites text nodes under React and can crash reconciliation.

---

## Feature Flags

**Seller — PostHog, evaluated server-side.** `apps/seller/lib/flags.ts` defines the flag keys:

- `FLAGS.FEATURE`: `feature-qris`, `feature-report`, `feature-request`, `feature-reimbursement`, `feature-fast-order`
- `FLAGS.OPS`: `ops-skip-manage-photos`, `ops-maintenance`

`GET /api/flags` evaluates them all in one call with person properties `{ role, tenantId, storeId }` and returns a camelCase booleans object; `FlagsContext` fetches it via SWR (60s dedupe) and components read `useFlags()`. Individual API routes hard-gate with `isFlagEnabled(flag, userId, props)`. Evaluation failures fail **closed** (everything disabled).

**Backoffice — legacy env flags.** `isEnabled()` from `packages/features/shared/features.ts`, driven by the comma-separated `NEXT_PUBLIC_FEATURES`. Flags there: `qris`, `export-pdf`, `skip-photos`. The seller app no longer uses this helper.

---

## Realtime

`packages/utils/realtime` exposes a transport-agnostic `RealtimeManager` interface (`subscribe`, `broadcast`, `isConnected`, `onConnectionChange`, `reconnect`) with `SupabaseRealtimeAdapter` as the implementation. Seller wires it up in `lib/context/RealtimeContext.tsx`; consume it with `useRealtime()`, never by touching a Supabase channel directly in a component.

---

## Schema & Types

**`packages/db/types.ts`** — auto-generated from Supabase. Read this at session start. Never edit manually. Regenerate with `pnpm types:db`.

**`packages/features/{domain}/schema.ts`** — Zod schemas per domain:

- `Create{Entity}Input`, `Update{Entity}Input` — POST/PUT
- `List{Entity}Query`, `Get{Entity}Query` — GET params
- `{Entity}Response`, `{Entity}ListResponse` — API responses

Several domains also carry an `openapi.ts` alongside the schema.

**Conventions:**

- camelCase in schemas; convert from DB snake_case with `toCamelKeys()`
- OpenAPI annotations via `z.object().openapi({ description, example })`

**Naming caveat:** the DB tables were renamed but their foreign-key constraint names were not, so `packages/db/types.ts` still shows keys like `payroll_claim_types_tenant_id_fkey` on `payroll_claim_configs`. Trust the table and column names, not the constraint names.

---

## Key Tables

- `tenants` — Workspaces
- `users` — User metadata (`role`, `full_name`, `email`, `phone_number`, `avatar_url`, `status`, `preferred_language`)
- `user_tenant_assignments` — Which tenants a user may access
- `user_store_assignments` — Store assignment per user, with `is_default`
- `stores` — Tea shop locations (`open_time`, `close_time`, lat/lng, `status`)
- `tenant_products` + `tenant_product_categories` — Inventory
- `store_orders` + `store_order_items` — Transactions
- `store_order_payments` — QRIS/Xendit payment records (`xendit_qr_id`, `qr_string`, `pending_items`, `expires_at`)
- `store_daily_summaries` + `store_daily_summary_photos` — Cash reconciliation. Uses `opened_by` + `closed_by` (user IDs); `seller_id`/`manager_id` no longer exist. Photos carry a `type` and an optional `quantity` JSON.
- `store_sessions` — POS ownership windows. One active session per store enforced by a partial unique index. Sessions chain via `previous_session_id` and are handed over with a `claim_code`. Created by `openStore()` immediately after `store_daily_summaries`.
- `store_expenses` — Cost tracking per daily summary
- `store_requests` — Supply requests submitted by staff
- `store_reports` — Incident reports submitted by staff
- `payroll_commission_configs` — (was `payroll_commission_types`) Tenant-defined commission categories with `rate_per_cup`, `slug`, `is_enabled`. Admin-managed.
- `payroll_claim_configs` — (was `payroll_claim_types`) Tenant-defined claim categories with `amount`, `frequency` (`weekly`/`monthly`/`one_time`), `claim_source`, `auto_threshold_hours`, `is_enabled`. Admin-managed.
- `payroll_user_claim_assignments` — (was `payroll_claim_eligibility`) Per-user per-config eligibility. Hard rows, no soft-delete column — `setUserClaimEligibility` replaces the full set for a user.
- `payroll_user_info` — Per-user payroll settings: `commission_config_id`, `pay_frequency`, bank details. The rate itself lives on the commission config, not here.
- `payroll_commissions` — (was `payroll_entries`) One row per user per daily summary on close. `rate_per_cup` snapshotted at creation, plus `total_cups` / `total_orders` / `total_commission`. Auto-created by `createPayrollCommissions()` on close-day; linked to a payout via `payout_id`.
- `payroll_claims` — (was `payroll_reimbursements`) Staff submits, admin reviews. `status`: `pending → approved/rejected → paid`. References `claim_config_id`, optionally `daily_summary_id` / `store_id`, and is linked to a payout via `payout_id`. `createAutoClaimsForDailySummary()` generates threshold-based claims on close using `hours_worked`.
- `payroll_payouts` — One per user per date range. **Owns its own `start_date` / `end_date`** — there is no periods table. `commissions_total` + `claims_total` = `total_pay`; carries `paid_at`, `paid_by`, `payment_proof_url`, `notes`. Created/updated by `upsertPayout()`.
- `tenant_customer_feedbacks` — Geotagged feedback
- `weather_hourly` — Cached weather forecasts
- `tenant_activity_logs` — Audit trail. The authoritative type list is the `ActivityLogType` enum in `packages/features/activity-logs/schema.ts`: `order_created`, `store_opened`, `store_closed`, `opening_balance_updated`, `summary_photo_uploaded`, `summary_photo_deleted`, `summary_photo_updated`, `expense_created`, `expense_updated`, `expense_deleted`, `customer_feedback_submitted`, `session_transferred`, `session_ended`, `commission_config_updated`, `payroll_entry_updated`, `payroll_commission_updated`, `payroll_period_updated`, `supply_request_created`, `incident_report_created`, `reimbursement_submitted`, `reimbursement_status_updated`, `claim_submitted`, `claim_status_updated`, `payroll_payout_updated`

**Removed — do not reintroduce:**

- `payroll_periods` — gone. Payouts own their date range; `/api/payroll/periods` and `/api/payroll/periods/current` return **410**.
- `notification_events` / `notification_reads` — never shipped; there are no notification tables.

**DB functions:** `transfer_store_session(p_claim_code, p_new_claim_code, p_store_id, p_tenant_id, p_user_id)` (atomic session handover), `payroll_claims_month_key(d)`, `user_tenant_ids()`.

---

## Common Patterns & Gotchas

**Tenant isolation:** Always include `tenant_id` in queries. RLS backs this up for anon-key clients, but most seller API routes run on the service-role key where RLS does **not** apply — the filter is the only protection.

**Schema validation:** `fetch from Supabase → toCamelKeys() → Zod.parse()` — always in that order.

**Timezone:** All DB timestamps are UTC. Day boundaries are computed against `TIMEZONE_OFFSET` (server) / `NEXT_PUBLIC_TIMEZONE_OFFSET` (client), default +7. Use `formatDate()` from `packages/utils` for display.

**Image uploads:** Compress with `browser-image-compression` (`lib/compressPhoto.ts`) before upload. Stored in Supabase Storage or the ibb.co CDN; both `i.ibb.co` and `i.ibb.co.com` are allowed image hosts.

**SWR config:** `dedupingInterval: 5000, revalidateOnFocus: false`. Use `mutate()` after mutations.

**Next.js caching:** Use `revalidatePath()` in route handlers after mutations.

**Errors:** Throw from services; `handleError()` in the route converts via `toApiError()` and only logs 5xx. Client-side, `apiFetch` throws `ApiError`, surfaced through `ErrorSheetContext`.

---

## Important Files

- `apps/seller/proxy.ts` — Auth + tenant routing (Next 16 replacement for `middleware.ts`)
- `apps/seller/lib/api/client.ts` — `apiFetch()` and `buildParams()`
- `apps/seller/lib/api/response.ts` — `ok` / `err` / `badRequest` / `unauthorized` / `forbidden` / `handleError`
- `apps/seller/lib/auth/get-request-user.ts` — `getRequestUser()`
- `apps/seller/lib/flags.ts` — PostHog flag keys and evaluation
- `apps/seller/app/[tenantSlug]/mobile/config/navigation.ts` — Seller route table for the shell
- `packages/shell/routes.ts` — `RouteConfig` contract
- `packages/utils/server-config/tenant.ts` — `getCurrentTenantId()`
- `packages/utils/translations/` — en/id messages
- `packages/features/shared/common-schema.ts` — Base Zod schemas
- `packages/db/types.ts` — Auto-gen Supabase types (**read at session start**)
- `turbo.json` — Build config
- `pnpm-workspace.yaml` — Workspace config

---

## Notes

- **`pnpm install` first** if dependencies changed. Use `turbo build --no-cache` if build seems stale.
- **The request interceptor is per-app and is named `proxy.ts`.** `apps/seller/proxy.ts` and `apps/backoffice/proxy.ts` are separate — update both if changing auth logic.
- **Tenant slug is immutable.** Renaming requires a data migration.
- **React Compiler is on** in the seller app. Don't hand-add `useMemo`/`useCallback` purely for referential stability; do keep them where a value is semantically expensive.
- **PWA is production-only.** Service worker caching is disabled in dev, so offline behavior can only be tested against a production build.
- **Admin app is archived.** Excluded from pnpm workspace and builds. Code preserved in `apps/admin/` but broken and unmaintained. Do not reference or modify it.
