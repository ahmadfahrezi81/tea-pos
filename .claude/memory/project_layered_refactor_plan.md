---
name: Layered Architecture Refactor Plan
description: Full plan for refactoring apps/seller to a clean 5-layer architecture. Phase 1 done. Phases 2–5 pending.
type: project
---

# Layered Architecture Refactor — `apps/seller`

**Scope:** `apps/seller` only. Admin app is excluded (full redo another day).

**Why:** API routes had 100–600 lines of inline DB logic. No API client layer. Some hooks called Supabase directly from the browser.

---

## Target Layer Stack

```
packages/services/{domain}.ts        ← DB + business logic. Accepts SupabaseClient, no HTTP, no React.
apps/seller/app/api/{domain}/         ← auth check + validate input + call service + return json (~30 lines each)
apps/seller/lib/api/{domain}.ts       ← typed fetch() wrappers. Validates response with Zod. No SWR.
apps/seller/lib/hooks/{domain}/       ← SWR + calls lib/api. No fetch() inline.
apps/seller/app/.../components/       ← renders only, calls hooks. Already clean.
```

---

## Phase 1 — Expand `packages/services/` ✅ DONE

All 7 new service files created and type-check clean (`tsc --noEmit` exits 0).

### New files
| File | Exported functions |
|---|---|
| `packages/services/orders.ts` | `listOrders()`, `createOrder()` |
| `packages/services/products.ts` | `listProducts()` |
| `packages/services/expenses.ts` | `listExpenses()`, `createExpense()`, `updateExpense()`, `deleteExpense()` |
| `packages/services/summaries.ts` | `listSummaries()`, `createSummary()`, `updateSummary()`, `getSummaryBreakdown()`, `listSummaryPhotos()`, `uploadSummaryPhoto()`, `updateSummaryPhoto()`, `deleteSummaryPhoto()`, `getSummaryPhotoCount()`, `validatePhotoFile()` |
| `packages/services/stores.ts` | `listUserStores()` |
| `packages/services/profiles.ts` | `getProfile()` |
| `packages/services/analytics.ts` | `getDailySales()`, `getHourlySales()`, `getProductSales()`, `getDayOfWeekSales()` |

### Already had services (no change needed)
- `packages/services/weather.ts`
- `packages/services/notifications.ts`
- `packages/services/customer-feedbacks.ts`

### Updated
- `packages/services/package.json` — added `@tea-pos/utils` dependency + all 10 exports

### Silent fix included
`expenses.ts` `recalcSummary()` now always updates both `expected_cash` AND `total_expenses`. Original PUT/DELETE routes only updated `expected_cash` (bug).

---

## Phase 2 — Slim API routes

**Rule:** Each route handler should be ~30 lines max:
1. `createRouteHandlerClient()` + `getCurrentTenantId()`
2. For mutations: `supabase.auth.getUser()` → 401 if missing
3. `SomeSchema.safeParse()` → 400 if invalid
4. Call service function
5. Validate response shape with Zod
6. `return NextResponse.json(parsed.data)`

**Error handling:** Wrap service call in try/catch. Map `error.status` (set by services for 404/409) to HTTP status.

### Routes to rewrite (read each file, then replace with slim version)

```
apps/seller/app/api/orders/route.ts              → import { listOrders, createOrder } from "@tea-pos/services/orders"
apps/seller/app/api/products/route.ts            → import { listProducts } from "@tea-pos/services/products"
apps/seller/app/api/expenses/route.ts            → import { listExpenses, createExpense, updateExpense, deleteExpense } from "@tea-pos/services/expenses"
apps/seller/app/api/summaries/route.ts           → import { listSummaries, createSummary, updateSummary } from "@tea-pos/services/summaries"
apps/seller/app/api/summaries/breakdown/route.ts → import { getSummaryBreakdown } from "@tea-pos/services/summaries"
apps/seller/app/api/summaries/photo/route.ts     → import { listSummaryPhotos, uploadSummaryPhoto, updateSummaryPhoto, deleteSummaryPhoto, validatePhotoFile } from "@tea-pos/services/summaries"
apps/seller/app/api/summaries/photo/count/route.ts → import { getSummaryPhotoCount } from "@tea-pos/services/summaries"
apps/seller/app/api/stores/route.ts              → import { listUserStores } from "@tea-pos/services/stores"
apps/seller/app/api/profiles/route.ts            → import { getProfile } from "@tea-pos/services/profiles"
apps/seller/app/api/analytics/daily-sales/route.ts      → import { getDailySales } from "@tea-pos/services/analytics"
apps/seller/app/api/analytics/hourly-sales/route.ts     → import { getHourlySales } from "@tea-pos/services/analytics"
apps/seller/app/api/analytics/product-sales/route.ts    → import { getProductSales } from "@tea-pos/services/analytics"
apps/seller/app/api/analytics/day-of-week-sales/route.ts → import { getDayOfWeekSales } from "@tea-pos/services/analytics"
```

### Routes already delegating to services (verify + skip if correct)
```
apps/seller/app/api/weather/route.ts             ✅ already uses @tea-pos/services/weather
apps/seller/app/api/notifications/route.ts       → check if it already delegates; slim if not
apps/seller/app/api/customer-feedbacks/route.ts  → check if it already delegates; slim if not
```

### Routes to leave untouched
```
apps/seller/app/api/auth/signout/route.ts        — auth plumbing
apps/seller/app/api/cron/                        — server-to-server, no client needed
apps/seller/app/api/payments/qris/               — handled in Phase 5
apps/seller/app/api/version/route.ts             — trivial
```

### Reference pattern
```typescript
// GET
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const query = ListOrdersQuery.safeParse(Object.fromEntries(searchParams));
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const data = await listOrders(supabase, { tenantId: currentTenantId, ...query.data });
        const parsed = OrderListResponse.safeParse({ orders: data });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status });
    }
}

// POST
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = CreateOrderInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        const result = await createOrder(supabase, { tenantId: currentTenantId, userId: user.id, ...body.data });
        const parsed = CreateOrderResponse.safeParse({ success: true, ...result });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ error: message }, { status });
    }
}
```

### Special cases
- `summaries/photo/route.ts` POST: parse multipart in route → pass `fileBuffer + fileType` to `uploadSummaryPhoto()`. Run `validatePhotoFile(file)` first.
- `profiles/route.ts`: no `getCurrentTenantId()` needed (user-scoped)
- `stores/route.ts`: needs `auth.getUser()` for `userId` → `listUserStores(supabase, { tenantId, userId })`
- Analytics routes: delete the large commented-out code blocks at the bottom

---

## Phase 3 — Create `apps/seller/lib/api/`

**Rule:** Each file exports a typed object. Uses `apiFetch` from `lib/api/client.ts`. Validates response with Zod. No SWR, no state.

### Files to create
```
apps/seller/lib/api/client.ts
apps/seller/lib/api/orders.ts
apps/seller/lib/api/products.ts
apps/seller/lib/api/expenses.ts
apps/seller/lib/api/summaries.ts
apps/seller/lib/api/stores.ts
apps/seller/lib/api/profiles.ts
apps/seller/lib/api/analytics.ts
apps/seller/lib/api/notifications.ts
apps/seller/lib/api/weather.ts
apps/seller/lib/api/customer-feedbacks.ts
apps/seller/lib/api/payments.ts
```

### Reference pattern
```typescript
// lib/api/client.ts
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
}

// lib/api/orders.ts
import { apiFetch } from "./client";
import type { ListOrdersQuery, CreateOrderInput } from "@tea-pos/features/orders/schema";
import { OrderListResponse, CreateOrderResponse } from "@tea-pos/features/orders/schema";

export const ordersApi = {
    list: async (params: Partial<ListOrdersQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return OrderListResponse.parse(await apiFetch<unknown>(`/api/orders?${sp}`));
    },
    create: async (input: CreateOrderInput) => {
        return CreateOrderResponse.parse(await apiFetch<unknown>("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
};

// Photo upload uses FormData (no Content-Type header)
uploadPhoto: async (formData: FormData) =>
    UploadSummaryPhotoResponse.parse(await apiFetch<unknown>("/api/summaries/photo", { method: "POST", body: formData })),
```

### Zod schema imports per domain
| Domain | Import path |
|---|---|
| orders | `@tea-pos/features/orders/schema` |
| products | `@tea-pos/features/products/schema` |
| expenses | `@tea-pos/features/expenses/schema` |
| summaries | `@tea-pos/features/summaries/schema` + `@tea-pos/features/summaries/photos-schema` |
| stores | `@tea-pos/features/stores/schema` |
| profiles | `@tea-pos/features/profiles/schema` |
| analytics | `@tea-pos/features/analytics/schema` |
| notifications | `@tea-pos/features/notifications/schema` |
| customer-feedbacks | `@tea-pos/features/customer-feedbacks/schema` |
| payments | `@tea-pos/features/payments/schema` |

---

## Phase 4 — Update hooks to use `lib/api/`

**Rule:** Replace every inline `fetch()` with a call to the `lib/api/` function. SWR fetcher becomes a one-liner.

### Hooks to update
```
apps/seller/lib/hooks/orders/useStoreOrders.ts             → ordersApi.list()
apps/seller/lib/hooks/products/useProducts.ts              → productsApi.list()
apps/seller/lib/hooks/summaries/useDailySummaries.ts       → summariesApi.list/create/update()  [197 lines, biggest]
apps/seller/lib/hooks/summaries/useSummaryBreakdown.ts     → summariesApi.getBreakdown()
apps/seller/lib/hooks/summaries/useSummaryPhotoCount.ts    → summariesApi.getPhotoCount()
apps/seller/lib/hooks/summaries/useSummaryPhotos.ts        → summariesApi.listPhotos/uploadPhoto/deletePhoto()
apps/seller/lib/hooks/summaries/useSummaryPhotosById.ts    → summariesApi.listPhotos()
apps/seller/lib/hooks/stores/useStores.ts                  → storesApi.list()
apps/seller/lib/hooks/profile/useProfile.ts                → profilesApi.get()
apps/seller/lib/hooks/analytics/useDailySales.ts           → analyticsApi.getDailySales()
apps/seller/lib/hooks/analytics/useDayOfWeekSales.ts       → analyticsApi.getDayOfWeekSales()
apps/seller/lib/hooks/analytics/useHourlySales.ts          → analyticsApi.getHourlySales()
apps/seller/lib/hooks/analytics/useProductSales.ts         → analyticsApi.getProductSales()
apps/seller/lib/hooks/notifications/useNotifications.ts    → notificationsApi.list/markRead()
apps/seller/lib/hooks/weather/useWeather.ts                → weatherApi.get()
apps/seller/lib/hooks/customer-feedbacks/useCustomerFeedbacks.ts      → feedbacksApi.list()
apps/seller/lib/hooks/customer-feedbacks/useCreateCustomerFeedback.ts → feedbacksApi.create()
```

### Reference pattern
```typescript
// Before
const fetchProducts = async (params?) => {
    const res = await fetch(`/api/products?${searchParams}`);
    if (!res.ok) { ... }
    const parsed = ProductListResponse.safeParse(await res.json());
    return parsed.data.products;
};

// After
import { productsApi } from "@/lib/api/products";
const fetchProducts = (params?: { all?: boolean }) =>
    productsApi.list(params ?? {}).then((r) => r.products);
```

---

## Phase 5 — Fix `useQrisPayment`

**File:** `apps/seller/lib/hooks/payments/useQrisPayment.ts`

**Problem:** Lines ~67–97 call `createClient()` and query the `payments` table directly from the browser.

**Fix:** Remove the direct Supabase call. Replace with `paymentsApi.getQrisStatus(id)` via the existing `/api/payments/qris` route. Read both the hook and `apps/seller/app/api/payments/qris/route.ts` to understand the data shape before editing.

---

## Validation commands

```bash
# After Phase 2
cd /Volumes/DevSSD/Projects/Personal/tea-pos
npx tsc --project apps/seller/tsconfig.json --noEmit

# After Phase 3 & 4 (same)
npx tsc --project apps/seller/tsconfig.json --noEmit

# Final
pnpm lint
```

---

## Key paths

```
Monorepo root:        /Volumes/DevSSD/Projects/Personal/tea-pos/
Seller app:           apps/seller/
Services:             packages/services/
Features (schemas):   packages/features/
Utils:                packages/utils/
API routes:           apps/seller/app/api/
API client (new):     apps/seller/lib/api/
Hooks:                apps/seller/lib/hooks/
Supabase server:      apps/seller/lib/supabase/server.ts       → createRouteHandlerClient()
Tenant helper:        @tea-pos/utils/server-config/tenant      → getCurrentTenantId()
```
