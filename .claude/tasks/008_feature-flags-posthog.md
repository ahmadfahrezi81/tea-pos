# Task 008 — Feature Flags + Analytics with PostHog

## Status: COMPLETE ✅

---

## Goal

Add PostHog to the seller app for two things at once:
1. **Feature flags** — kill-switches and per-store/per-role targeting, evaluated server-side
2. **Analytics** — page views, user events, funnels

This replaces the GrowthBook plan. PostHog covers both in one SDK with a generous free tier (1M events/month).

---

## Architecture

```
Flag evaluation:  GET /api/flags (posthog-node, 1 client, 1 evaluateFlags() call)
                  → { isQrisEnabled, isPayrollEnabled, isReimbursementEnabled, isSkipManagePhotosEnabled }
                  Hard 403 gates on individual API routes as safety net
FE consumption:   FlagsProvider (mobile layout) → useFlags() in any component
                  useFlags() returns { flags, isLoading }
Analytics:        instrumentation-client.ts (posthog-js) → page views, user identity + storeId
```

### Two-layer flag enforcement

1. **Soft gate** — `GET /api/flags` evaluates all flags in one PostHog round-trip and returns them to the FE. `FlagsProvider` fetches once per store selection (60s dedup, refetches on store switch). Components use `useFlags()` to show/hide UI. `isLoading` prevents false-disabled flash on slow devices.
2. **Hard gate** — Individual API routes call `isFlagEnabled()` and return 403 if off. Defense-in-depth — UI gates handle normal users, API gate handles direct access.

### Shared staging + prod PostHog project
One PostHog project covers both environments — acceptable at this scale. Staging noise is filtered by `tenantId`. No route blocking needed — API hard gates are sufficient.

---

## Flag Keys (PostHog Dashboard)

Flags use a namespaced key convention. All keys must match `FLAGS` constants exactly.

| PostHog key | Constant | Default | What it gates |
|---|---|---|---|
| `feature-qris` | `FLAGS.FEATURE.QRIS` | off | QRIS payment initiation (POST /api/payments/qris) |
| `feature-payroll` | `FLAGS.FEATURE.PAYROLL` | off | All payroll routes (periods + entries) |
| `feature-reimbursement` | `FLAGS.FEATURE.REIMBURSEMENT` | off | Reimbursement list + create |
| `ops-skip-manage-photos` | `FLAGS.OPS.SKIP_MANAGE_PHOTOS` | off | Skips photo steps in open/close store flows |

**Targeting properties available on every flag call:** `role`, `tenantId`, `storeId`

### Renaming a flag
1. Change the value in `FLAGS` in `lib/flags.ts` (one line)
2. Rename the key in PostHog dashboard

All callsites update automatically via the constant. TypeScript enforces valid keys via `FlagKey` type.

---

## FLAGS Constants Structure

```ts
// apps/seller/lib/flags.ts
export const FLAGS = {
    FEATURE: {
        QRIS: "feature-qris",
        PAYROLL: "feature-payroll",
        REIMBURSEMENT: "feature-reimbursement",
    },
    OPS: {
        SKIP_MANAGE_PHOTOS: "ops-skip-manage-photos",
    },
} as const;
```

Nested by category: `FLAGS.FEATURE.*` for user-facing features, `FLAGS.OPS.*` for operational toggles.

---

## API Response Shape

`GET /api/flags?storeId=<uuid>` returns:

```ts
{
    isQrisEnabled: boolean,
    isPayrollEnabled: boolean,
    isReimbursementEnabled: boolean,
    isSkipManagePhotosEnabled: boolean,
}
```

`storeId` query param is optional — passed by `FlagsProvider` from `useStore().selectedStoreId`. Required for per-store flag targeting in PostHog.

---

## Files Created / Modified

### New files
| File | Purpose |
|---|---|
| `apps/seller/instrumentation-client.ts` | PostHog browser init via Next.js 15.3+ pattern — runs once before app mounts |
| `apps/seller/lib/posthog/PostHogAnalytics.tsx` | Client component: page views + `posthog.identify()` with `email`, `role`, `storeId` |
| `apps/seller/lib/flags.ts` | `FLAGS` constants, `FlagKey` type, `getAllFlags()` (bulk), `isFlagEnabled()` (single) |
| `apps/seller/app/api/flags/route.ts` | `GET /api/flags` — one PostHog client, one `evaluateFlags()` call, all flags from single snapshot |
| `apps/seller/lib/api/flags.ts` | `FlagsResponse` Zod schema + `flagsApi.get()` client |
| `apps/seller/lib/context/FlagsContext.tsx` | `FlagsProvider` + `useFlags()` → `{ flags, isLoading }` |

### Modified files
| File | Change |
|---|---|
| `mobile/layout.tsx` | Added `FlagsProvider` + `PostHogAnalytics` in `Suspense` |
| `app/api/payments/qris/route.ts` | Hard 403 on POST via `FLAGS.FEATURE.QRIS`; body parsed first to extract `storeId` |
| `app/api/payroll/periods/route.ts` | Hard 403 via `FLAGS.FEATURE.PAYROLL` |
| `app/api/payroll/periods/[id]/route.ts` | Hard 403 via `FLAGS.FEATURE.PAYROLL` |
| `app/api/payroll/entries/route.ts` | Hard 403 via `FLAGS.FEATURE.PAYROLL` |
| `app/api/payroll/entries/[id]/route.ts` | Hard 403 via `FLAGS.FEATURE.PAYROLL` |
| `app/api/reimbursements/route.ts` | Hard 403 on GET + POST via `FLAGS.FEATURE.REIMBURSEMENT` |
| `pos/_components/CartDrawer.tsx` | Migrated from `useFeatures()` (env-var) to `useFlags()` for QRIS toggle |
| `mobile/home/manage/open/page.tsx` | `isEnabled("skip-photos")` → `useFlags().isSkipManagePhotosEnabled`; opening balance now required (balanceConfirmed state) |
| `mobile/home/manage/close/page.tsx` | `isEnabled("skip-photos")` → `useFlags().isSkipManagePhotosEnabled` |
| `mobile/account/_components/AccountProfile.tsx` | My Earnings + Reimbursements disabled when flags off; neutral during `isLoading` |
| `manage/_components/shared/NumberInput.tsx` | Fixed "0" not displaying after typed; added `dirty` ref to prevent parent sync override |

---

## Key Implementation Notes

- **Single PostHog client per `/api/flags` call** — `getAllFlags()` creates one client, calls `evaluateFlags()` once, reads all flags from the snapshot. Not 4 separate calls.
- **Per-request client** — new `PostHog` instance per request, `flushAt: 1`, `flushInterval: 0`, `after(() => client.shutdown())`. Do not convert to singleton.
- **`identified_only`** — PostHog browser SDK only creates person profiles after `identify()`. No anonymous profiles. Verified on staging — deleting historical duplicates + fresh login produces one profile per user.
- **`storeId` in identify** — `PostHogAnalytics` sends `storeId` via `posthog.identify()` so it appears in PostHog's property picker for flag targeting rules.
- **60s client-side dedup** — flags cached for 60s per store. PostHog toggle takes up to 60s to reflect in UI; API-level gate is immediate.
- **`isLoading` in `useFlags()`** — account menu rows stay enabled during initial fetch, preventing false-disabled flash on slow devices.

---

## Env Vars

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx     # browser SDK — must be in Vercel env vars
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phc_xxx             # server SDK — must be in Vercel env vars (same value)
```

Both use the same project API key. `POSTHOG_API_KEY` has no `NEXT_PUBLIC_` prefix so Next.js never bundles it into the client.

---

## Adding a New Flag

1. Add to `FLAGS` in `lib/flags.ts` (choose `FEATURE` or `OPS` category)
2. Add `evaluation.isEnabled(FLAGS.X.Y)` to `GET /api/flags` response
3. Add to `FlagsResponse` Zod schema in `lib/api/flags.ts`
4. Add to `DEFAULT_FLAGS` in `FlagsContext.tsx`
5. Create the flag in PostHog dashboard with the matching key
6. Wire `useFlags()` in the relevant UI component

TypeScript errors guide steps 2–4 if any are missed.

---

## Analytics Events to Add (not yet implemented)

| Event | Where | Properties |
|---|---|---|
| `order_created` | after successful order | `{ total_amount, item_count, store_id }` |
| `store_opened` | after open store flow | `{ store_id }` |
| `store_closed` | after close day flow | `{ store_id }` |

Add via `posthog.capture()` in the relevant client components when ready.

---

## Notes on `isEnabled()` coexistence

`isEnabled()` from `packages/features/shared/features.ts` (env-var based) is kept as-is for middleware and `packages/` code that has no user context. Do not remove it.

```
isEnabled('qris')                    → env-var, no user context, middleware/build
isFlagEnabled(FLAGS.FEATURE.QRIS, userId) → PostHog, has user context, API routes
```
