# Sessions & Payroll — UI Implementation Tickets

## Context

Phase 1–3 (schema, services, API, hooks) are fully implemented and type-check clean.
This file covers the UI layer only — wiring the existing hooks into components.

**Key hooks available:**

- `useSession(storeId)` — `session`, `openStore()`, `transferSession(claimCode)`, `endSession(sessionId)`
- `useTodayCups(storeId, userId, date)` — `totalCups`, `estimatedEarnings`, `ratePerCup`
- `usePayrollPeriods(params?)` — `periods`, `updatePeriodStatus()`
- `usePayrollEntries(params?)` — `entries`, `updateEntryStatus()`

**Key context already available in components:**

- `useStore()` → `selectedStoreId`, `selectedStore`
- `useProfile()` (or profile from auth context) → `profile.id`, `profile.fullName`
- Today's date string: use `getTodayStr()` pattern (UTC+7) from existing code

---

## Ticket 1 — Replace open store flow with `openStore()` from `useSession`

**File:** `apps/seller/app/[tenantSlug]/mobile/analytics/MobileAnalytics.tsx`

Currently `handleOpenStoreToday` (~line 160) calls `createSummary({ storeId, openedBy, date })` directly via `useSummaries`. Replace this with `useSession(selectedStoreId).openStore(...)`.

**What to change:**

1. Import `useSession` and call it with `selectedStoreId`
2. Replace `handleOpenStoreToday` body — call `session.openStore({ date: todayStr, openingBalance: 0 })`
3. After success, call `mutateSummaries()` so the analytics view refreshes (the session hook already updates its own state)
4. Keep all existing popup UI unchanged — only the handler logic changes

**Note:** `openStore()` returns `{ session, dailySummary }`. The `dailySummary` can be used to immediately update the summary list if needed.

---

## Ticket 2 — Session gate on the POS screen

**File:** `apps/seller/app/[tenantSlug]/mobile/pos/_components/MobilePOS.tsx`

The POS should block ordering if there is no active session, or if the active session belongs to a different user.

**States to handle:**

| State                          | What to show                                                               |
| ------------------------------ | -------------------------------------------------------------------------- |
| No store selected              | Existing "select a store" state                                            |
| Loading session                | Skeleton / spinner                                                         |
| No active session              | "Store is closed" — show **Open Store** button                             |
| Active session, different user | "POS is held by [name]" — show **Claim Session** button (enter claim code) |
| Active session, current user   | Normal POS UI — show claim code chip somewhere accessible                  |

**Implementation steps:**

1. Call `useSession(selectedStoreId)` at the top of `MobilePOS`
2. If `session === null` → show a locked state with "Open Store" CTA that opens the existing open store flow (or a simplified modal inline)
3. If `session.userId !== profile.id` → show a "claimed by another user" state with a **Claim** button
4. If `session.userId === profile.id` → render normal POS UI

**Claim flow (step 3):** A small modal/drawer where the current user enters the 6-char claim code. On submit, call `useSession.transferSession(claimCode)`. On success, close modal — POS unlocks.

**Claim code display (step 4):** Show the claim code somewhere in the POS header (e.g., small chip/badge). This is what the current holder shares verbally so another user can take over.

---

## Ticket 3 — Today's earnings widget on home/analytics screen

**File:** `apps/seller/app/[tenantSlug]/mobile/analytics/MobileAnalytics.tsx` (or a new `_components/EarningsWidget.tsx`)

Add a small widget visible when today's summary is open, showing the current user's cup count and estimated commission.

**Hook:** `useTodayCups(selectedStoreId, profile.id, todayStr)`

**Widget content:**

- Cups sold today: `totalCups`
- Estimated earnings: `formatRupiah(estimatedEarnings)`
- Rate: `formatRupiah(ratePerCup)` / cup (small secondary text)

**When to show:** Only when `todaySummary` exists and is not yet closed (`!closedAt`). If `ratePerCup === 0` (no commission config set), show cups only — omit earnings line.

**Placement suggestion:** Below the daily summary card for today, above the monthly summary stats.

---

## Ticket 4 — Payroll view (manager-facing)

**New page:** `apps/seller/app/[tenantSlug]/mobile/more/payroll/page.tsx` (or under a `/payroll` route)

A simple read-only list view of payroll periods and their entries. Managers can approve entries.

**Layout:**

```
Payroll Periods
  ┌─────────────────────────┐
  │ Week 12–18 May 2026     │
  │ Status: open            │
  │ [View Entries] →        │
  └─────────────────────────┘

Entries for selected period:
  ┌─────────────────────────┐
  │ Ahmad Fahrezi           │
  │ 42 cups · Rp 21,000     │
  │ Status: draft [Approve] │
  └─────────────────────────┘
```

**Hooks:**

- `usePayrollPeriods()` → list all periods
- `usePayrollEntries({ periodId })` → entries for selected period
- `updateEntryStatus(id, 'approved')` → approve button handler

**Note:** Keep it simple for now — no pagination, no export. Just list + approve action.

---

## Notes for next session

- Read `packages/db/types.ts` at session start per CLAUDE.md
- `useSession` is in `lib/hooks/sessions/useSession.ts`
- `useTodayCups` is in `lib/hooks/orders/useTodayCups.ts`
- `usePayrollPeriods` / `usePayrollEntries` are in `lib/hooks/payroll/usePayroll.ts`
- The `openStore()` action returns `{ session, dailySummary }` — the session has `claimCode` for display
- `transferSession(claimCode)` validates and swaps the session in one call — no separate validation step
- Claim code is always 6 uppercase alphanumeric chars (generated server-side)
- `formatRupiah` is available from `@tea-pos/utils/formatCurrency`
- Existing UI patterns: Radix UI primitives + Tailwind CSS 4, mobile-first, no desktop layout needed
