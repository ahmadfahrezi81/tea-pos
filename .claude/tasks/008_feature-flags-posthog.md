# Task 008 — Feature Flags + Analytics with PostHog

## Status: COMPLETE ✅

---

## Goal

Add PostHog to the seller app for two things at once:
1. **Feature flags** — kill-switches and per-store/per-role targeting, evaluated server-side
2. **Analytics** — page views, user events, funnels

This replaces the GrowthBook plan. PostHog covers both in one SDK with a generous free tier (1M events/month).

## What PostHog gives you vs what it doesn't

**Covers:**
- Feature flags (FE + BE) ✅
- Page view / event analytics ✅
- User identification and properties ✅

**Does NOT cover:**
- Error tracking (JS crashes, unhandled API errors) → Sentry for that later
- Uptime monitoring → Betterstack/UptimeRobot later
- Server performance (slow queries, p95 latency) → out of scope for now

---

## Architecture

```
Flag evaluation:  GET /api/flags (posthog-node) → { qris, payroll, reimbursement, skipManagePhotos }
                  Hard 403 gates on individual API routes as safety net
FE consumption:   FlagsProvider (mobile layout) → useFlags() in any component
Analytics:        instrumentation-client.ts (posthog-js) → page views, user identity
```

### Two-layer flag enforcement

1. **Soft gate** — `GET /api/flags` evaluates all flags in parallel and returns them to the FE. `FlagsProvider` fetches this once on mount (60s dedup). Components use `useFlags()` to show/hide UI.
2. **Hard gate** — Individual API routes call `isFlagEnabled()` and return 403 if off. Prevents direct API access even if someone bypasses the UI.

---

## Files Created / Modified

### New files
| File | Purpose |
|---|---|
| `apps/seller/instrumentation-client.ts` | PostHog browser init (runs once before app mounts, no Strict Mode issue) |
| `apps/seller/lib/posthog/PostHogAnalytics.tsx` | Client component: page view tracking + user identify/reset on auth change |
| `apps/seller/lib/flags.ts` | Server-side `isFlagEnabled()` using `evaluateFlags()` (non-deprecated API) |
| `apps/seller/app/api/flags/route.ts` | `GET /api/flags` — evaluates all 4 flags in parallel for current user |
| `apps/seller/lib/api/flags.ts` | Typed API client + `FlagsResponse` Zod schema |
| `apps/seller/lib/context/FlagsContext.tsx` | `FlagsProvider` + `useFlags()` hook |

### Modified files
| File | Change |
|---|---|
| `apps/seller/app/[tenantSlug]/mobile/layout.tsx` | Added `FlagsProvider` (wraps mobile app) + `PostHogAnalytics` in `Suspense` |
| `apps/seller/app/api/payments/qris/route.ts` | Hard 403 gate on POST — `isFlagEnabled("qris", ...)` |
| `apps/seller/app/api/payroll/periods/route.ts` | Hard 403 gate — `isFlagEnabled("payroll", ...)` |
| `apps/seller/app/api/payroll/periods/[id]/route.ts` | Hard 403 gate — `isFlagEnabled("payroll", ...)` |
| `apps/seller/app/api/payroll/entries/route.ts` | Hard 403 gate — `isFlagEnabled("payroll", ...)` |
| `apps/seller/app/api/payroll/entries/[id]/route.ts` | Hard 403 gate — `isFlagEnabled("payroll", ...)` |
| `apps/seller/app/api/reimbursements/route.ts` | Hard 403 gate on GET + POST — `isFlagEnabled("reimbursement", ...)` |
| `mobile/home/manage/open/page.tsx` | Replaced `isEnabled("skip-photos")` → `useFlags().skipManagePhotos` |
| `mobile/home/manage/close/page.tsx` | Replaced `isEnabled("skip-photos")` → `useFlags().skipManagePhotos` |

---

## Flags to Create in PostHog Dashboard

| Flag key | Default | Notes |
|---|---|---|
| `qris` | off | Gates QRIS payment initiation |
| `payroll` | off | Gates all payroll periods + entries routes |
| `reimbursement` | off | Gates reimbursement list + create |
| `skip-manage-photos` | off | Skips photo steps in open/close store flows |

**Targeting properties available on every flag call:** `role`, `tenantId`

---

## Env Vars (already added to `.env`)

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx     # browser SDK key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phc_xxx             # server SDK key (same value, no NEXT_PUBLIC_ = not bundled)
```

---

## Key Implementation Notes

- **`isFlagEnabled()` uses `evaluateFlags()`** — not the deprecated `isFeatureEnabled()`. Signature: `client.evaluateFlags(userId, { personProperties })`.
- **Per-request PostHog client** — new instance per request, `flushAt: 1`, `flushInterval: 0`, `after(() => client.shutdown())`. Required for Vercel/serverless — do not convert to singleton.
- **`FlagsProvider` dedup is 60s** — flags are cached client-side for 60 seconds. Toggling a flag in PostHog takes up to 60s to reflect in the UI (API-level enforcement is immediate).
- **`/api/flags` evaluates 4 flags in parallel** via `Promise.all` — single network roundtrip to PostHog per user session.
- **Analytics init** via `instrumentation-client.ts` (Next.js 15.3+ pattern) — runs before app mounts, avoids React Strict Mode double-init issue.

---

## Analytics Events to Add (Day 1 — not yet implemented)

| Event | Where | Properties |
|---|---|---|
| `order_created` | after successful order | `{ total_amount, item_count, store_id }` |
| `store_opened` | after open store flow | `{ store_id }` |
| `store_closed` | after close day flow | `{ store_id }` |

These can be added later with `posthog.capture()` in the relevant client components.

---

## Notes on `isEnabled()` coexistence

`isEnabled()` from `packages/features/shared/features.ts` (env-var based) is kept as-is. It's still used by middleware and any `packages/` code that has no user context. Do not remove it. The two systems coexist intentionally:

```
isEnabled('qris')             → env-var, no user context, middleware/build
isFlagEnabled('qris', userId) → PostHog, has user context, API routes
```
