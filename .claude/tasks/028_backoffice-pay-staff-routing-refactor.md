# Task 028 — Backoffice Pay: Payout-first routing refactor

## Context

Current `/pay/periods` routing is scoped by `startDate` (a date string), not a real UUID. The `[periodId]/[userId]` pattern also double-queries: fetches payouts to get `payoutId`, then fetches the payslip. The goal is to switch to a user-first, `payoutId`-native routing pattern that mirrors the seller app.

Note: `payroll_period_id` was dropped from `payroll_payouts` in migration `20260621` — there is no period UUID in the DB. Period info (week label, date range) is derived from `startDate`/`endDate` on the payout row and shown as card metadata.

---

## Sanity Check Findings (pre-implementation)

- **`/pay/staff` is already taken** — it is "Staff Payroll Info" (assign commission config, view bank details). Must NOT be touched. New payout review flow goes under `/pay/payouts`.
- **`/pay/page.tsx`** currently has two Operations menu rows: "Staff Pay Periods" → `/pay/periods` and "Staff Payroll Info" → `/pay/staff`. The first will be relabelled and repointed to `/pay/payouts`.
- **Backoffice has `/api/summaries/[id]` and `/api/sessions/summary/[summaryId]`** — both already exist and are ADMIN-only. The summary detail page can be a **server component** calling services directly (same pattern as seller's daily detail page) — no new API routes needed.
- **`SummaryDetailsCard` lives in seller app** (`apps/seller/components/SummaryDetailsCard.tsx`) and imports seller-specific hooks (`useT`, `CopyableField`, `SummaryPhotoThumbnail`). Cannot be imported from backoffice. The summary page in backoffice will call the same service functions and render equivalent JSX inline.
- **`usePayslip(payoutId, userId)`** — `userId` is optional in the hook but the backoffice payslip API falls back to the authenticated user's ID. Admin must always pass `userId` explicitly.
- **`dailySummaryId`** for the summary page comes from `commissions` filtered by date — `commissions.find(c => c.date === date)?.dailySummaryId`. If no commission exists for that date (claims-only day), summary is not available.

---

## New Routing Structure

```
/pay/payouts                                          → all staff with payouts; pending on top, paid at bottom
/pay/payouts/[userId]                                 → that user's payout history (like seller /earnings)
/pay/payouts/[userId]/[payoutId]                      → payslip: per-day list with 3-dot menu + Pay button
/pay/payouts/[userId]/[payoutId]/day/[date]           → day review: approve/reject commissions + claims
/pay/payouts/[userId]/[payoutId]/day/[date]/summary   → full SummaryDetailsCard (server component)
```

Old routes to delete after migration:
```
/pay/periods/
/pay/periods/[periodId]/
/pay/periods/[periodId]/[userId]/
/pay/periods/[periodId]/[userId]/day/[date]/
```

---

## Page Specs

### 1. `/pay/payouts/page.tsx` — Team list

- `usePayouts()` — all payouts for tenant (no filter)
- Group by `userId`, take the latest payout per user to determine current status
- Sort: users with any `pending` payout first, `paid` at bottom
- Each row: user name, status pill (Ongoing / Paid), latest period label ("Week 23 · Jun 16–22"), total pay
- Tap row → `/pay/payouts/${userId}`
- Staff with zero payouts ever are not shown
- Uses `useTenantUsers()` to resolve user names from `userId` on each payout

### 2. `/pay/payouts/[userId]/page.tsx` — User payout history

- `usePayouts({ userId })` — all payouts for this user, newest first
- Same card design as seller `/earnings` page:
  - Week label + full date range
  - Stats grid: Orders (orange), Cups (blue), Total Pay (green, col-span-2)
  - Second row: Claims (slate), Pending (yellow), Approved (green)
  - Status pill beside week label: `pending → Ongoing`, `paid → Paid`
  - ArrowUpRight icon top-right
- Tap card → `/pay/payouts/${userId}/${payout.id}`

### 3. `/pay/payouts/[userId]/[payoutId]/page.tsx` — Payslip detail

- Params: `payoutId`, `userId`
- `usePayslip(payoutId, userId)` directly — **no** `usePayouts` call
- `usePayrollUserInfo(userId)` for bank details
- `useTenantUsers()` to resolve user name
- On mount: call `upsertPayout({ startDate, endDate, userId })` from `payslip.payout`, then `mutate()`
- Sections:
  - **Bank account card**
  - **Pay summary header** — name, week + date range, total, pending/paid badges
  - **Per-day list** — one row per day in `startDate..endDate`:
    - Date label, subtotal (approved items), pending count pill
    - **3-dot (`MoreVertical`) button** → `Drawer.Root` bottom sheet with options:
      - "Review" (ListChecks icon) → navigate to `/day/${date}`
      - "Summary Details" (Info icon) → navigate to `/day/${date}/summary` (only shown if `dailySummaryId` exists for that date)
    - Days with no items: greyed out, no 3-dot button
  - **Fixed bottom Pay button** — only if `status === "pending"` && `pendingCount === 0`
  - **PaySheet bottom sheet** — same as current (transfer screenshot upload)

### 4. `/pay/payouts/[userId]/[payoutId]/day/[date]/page.tsx` — Day review

- Params: `payoutId`, `date` (reads `userId` from parent via URL for `mutate` scope)
- `usePayslip(payoutId, userId)` directly — **no** `usePayouts` call
- Filter commissions + claims by `date`
- Layout:
  - Date header card
  - **Commissions section** — per row: store name, cup count, amount, status pill, ✗/✓ buttons
  - **Claims section** — per row: claim type name, amount, status pill, ✗/✓ buttons
- **Confirm popup** (bottom sheet, inline state):
  - State: `confirmTarget: { type: "commission" | "claim"; id: string; action: "approved" | "rejected"; label: string; amount: number } | null`
  - Shows: "Approve commission from [store] — Rp X?" or "Reject claim [name]?"
  - Green confirm (approve) or red confirm (reject)
  - After confirm: call API, `mutate()`, close popup

### 5. `/pay/payouts/[userId]/[payoutId]/day/[date]/summary/page.tsx` — Day summary (server component)

- **Server component** — calls services directly, no hooks
- Receives `payoutId`, `userId`, `date` from params
- Flow: `getPayslip(supabase, { payoutId, userId })` → find commission for `date` → get `dailySummaryId`
- If no commission for that date → `notFound()`
- Parallel fetch: `getSummaryById`, `getSummaryBreakdown`, `listSummaryPhotos`, `listExpenses`, `fetchSessionUsersForSummaries`
- Renders inline equivalent of `SummaryDetailsCard` (read-only, no cash input, no confirmation checkbox)
- This gives backoffice admin the same financial visibility as seller analytics

---

## What Changes in `/pay/page.tsx`

- Relabel "Staff Pay Periods" → "Staff Payouts"
- Repoint from `/mobile/pay/periods` → `/mobile/pay/payouts`
- "Staff Payroll Info" → `/mobile/pay/staff` stays unchanged

---

## Key Decisions

- **Route name**: `/pay/payouts` (not `/pay/staff` — already taken for payroll info config)
- **No double-query**: `[payoutId]` and sub-pages call `usePayslip(payoutId, userId)` directly
- **3-dot pattern**: Mirrors seller analytics exactly — `MoreVertical` → `Drawer.Root` bottom sheet
- **Summary is a server component**: Calls services directly like seller's daily detail page — no new API routes needed
- **`SummaryDetailsCard` not imported cross-app**: Backoffice summary page renders equivalent JSX inline
- **Activity (history) option omitted from 3-dot for now**: Not in scope; can be added later
- **Staff without payouts**: Not shown — nothing to review yet

---

## Implementation Steps

### Phase 1 — New pages (old routes untouched)
1. `/pay/payouts/page.tsx`
2. `/pay/payouts/[userId]/page.tsx`
3. `/pay/payouts/[userId]/[payoutId]/page.tsx`
4. `/pay/payouts/[userId]/[payoutId]/day/[date]/page.tsx`
5. `/pay/payouts/[userId]/[payoutId]/day/[date]/summary/page.tsx`

### Phase 2 — Wire navigation
6. Update `/pay/page.tsx` menu: relabel + repoint to `/pay/payouts`
7. Build check on backoffice

### Phase 3 — Cleanup
8. Delete `/pay/periods/` tree
9. Final build check

---

## Files Touched

**New:**
- `apps/backoffice/app/[tenantSlug]/mobile/pay/payouts/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/payouts/[userId]/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/payouts/[userId]/[payoutId]/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/payouts/[userId]/[payoutId]/day/[date]/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/payouts/[userId]/[payoutId]/day/[date]/summary/page.tsx`

**Modified:**
- `apps/backoffice/app/[tenantSlug]/mobile/pay/page.tsx` — relabel + repoint menu row

**Deleted (Phase 3):**
- `apps/backoffice/app/[tenantSlug]/mobile/pay/periods/` (entire tree — 4 pages)
