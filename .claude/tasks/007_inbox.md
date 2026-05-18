# Task 007 — Inbox

## Overview

The inbox is a personal message feed for sellers. It is **not** a notification log — it is a curated channel with a target read rate above 90%. Every message sent to the inbox must be directly relevant to the recipient and complete a meaningful loop.

The inbox currently shows `EmptyInbox`. The notifications tab handles broadcast events (weather forecast, store opened). This task builds the inbox as a separate, personal layer: messages always have a `recipient_id`, never a `target_role`.

Three areas of work:

1. **Service + schema cleanup** — The notification schema has inconsistencies and unused types. Clean it up before adding anything new. Define the inbox type set clearly.
2. **Dispatch** — Wire up inbox message creation at the right moments in existing service/API routes.
3. **UI** — Replace `EmptyInbox` with a real, rich message list. Each inbox type has its own visual treatment.

---

## Inbox Design Principles

Before writing code, agree on these constraints:

**Only send a message when it closes a loop for the recipient.**
- ✅ "Your shift ended. You sold 45 cups and earned Rp 90,000."  
- ✅ "Your payroll for May 12–18 has been paid: Rp 150,000."
- ✅ "Your supply request for Ice has been fulfilled."
- ❌ "User B opened the store." (recipient already knows or doesn't care)
- ❌ "A new order was placed." (too frequent, creates noise)
- ❌ "Today's weather: 28°C." (that's a notification, not inbox)

**One message per event.** Never send duplicates for the same trigger.

**Personal, not broadcast.** All inbox messages use `recipient_id`. `target_role` is for the notifications tab (weather, etc.), not inbox.

---

## Inbox Message Types

These are the only types that belong in the inbox:

| Type | Trigger | Recipient | Body preview |
|---|---|---|---|
| `shift_summary` | Daily summary is closed | The seller(s) who held sessions that day | "You sold X cups today at [Store]. Earnings: Rp Y." |
| `payout_ready` | Payroll period status → `paid` | Every seller with entries in that period | "Your payout of Rp X for [dates] has been processed." |
| `supply_request_update` | Manager updates supply request status → `acknowledged` or `fulfilled` | The seller who created the request | "Your Ice request has been [acknowledged / fulfilled]." |
| `incident_report_update` | Manager updates incident report status → `acknowledged` or `resolved` | The seller who filed the report | "Your incident report '[title]' has been [acknowledged / resolved]." |

This is a closed list. Do not add types without considering whether they meet the >90% read rate bar.

---

## Key Files

**Being cleaned up (existing):**
- `packages/features/notifications/schema.ts` — extend type enum, fix role casing, add inbox-only types
- `packages/services/notifications.ts` — stays as-is structurally, but verify it handles `recipient_id`-scoped queries correctly
- `apps/seller/app/[tenantSlug]/mobile/notifications/page.tsx` — remove handling for removed types; keep `weather_forecast`

**New dispatch points (existing files, adding calls):**
- `packages/services/summaries.ts` or wherever `closeDailySummary` lives — dispatch `shift_summary` to each session holder for that day
- `apps/seller/app/api/payroll/periods/[id]/route.ts` — dispatch `payout_ready` when status → `paid`
- `apps/seller/app/api/requests/[id]/route.ts` or wherever status updates happen — dispatch `supply_request_update`
- `apps/seller/app/api/reports/[id]/route.ts` or wherever status updates happen — dispatch `incident_report_update`

**New UI:**
- `apps/seller/app/[tenantSlug]/mobile/inbox/page.tsx` — replace `EmptyInbox` with real feed
- `apps/seller/app/[tenantSlug]/mobile/inbox/_components/` — one component per message type

---

## Ticket 0 — Schema & service cleanup

### 0a — Fix `NotificationTypeSchema`

**Current:**
```ts
z.enum(["weather_forecast", "store_opened"])
```

**Problems:**
- `store_opened` is unused and low-value (no known dispatch point). Remove it.
- Missing all inbox types.

**New:**
```ts
z.enum([
  // Broadcast (notifications tab)
  "weather_forecast",
  // Inbox (personal, recipient_id scoped)
  "shift_summary",
  "payout_ready",
  "supply_request_update",
  "incident_report_update",
])
```

### 0b — Fix `NotificationTargetRoleSchema`

**Current:** `z.enum(["ADMIN", "manager", "seller", "USER"])` — mixed casing doesn't match profile roles.

**Problem:** The `listNotifications` service filters by `target_role.eq.${userRole}` where `userRole` comes from `profiles.role`. Profiles use `ADMIN`, `SELLER`, `MANAGER` (uppercase). The schema allows `"manager"` (lowercase) which will never match.

**Fix:** Update to match profile roles exactly:
```ts
z.enum(["ADMIN", "SELLER", "MANAGER"])
```

Check if any existing `notification_events` rows have lowercase `target_role` values — if so, write a migration to fix them.

### 0c — `ListNotificationsQuery` inbox param

Add an optional `channel` param so the inbox and notifications tabs can query separately:

```ts
export const ListNotificationsQuery = z.object({
  channel: z.enum(["inbox", "notifications"]).optional(),
  isRead: z.enum(["true", "false"]).optional(),
})
```

**Inbox:** `channel=inbox` → filter for personal messages only (`recipient_id IS NOT NULL`).

**Notifications:** `channel=notifications` → filter for broadcasts only (`target_role IS NOT NULL OR (target_role IS NULL AND recipient_id IS NULL)`).

Update `listNotifications` in the service to apply this filter.

### 0d — Remove `EmptyInbox` component

Once the inbox has real content, `EmptyInbox` becomes dead code. Delete it:
- `apps/seller/app/[tenantSlug]/mobile/inbox/_components/EmptyInbox.tsx`

---

## Ticket 1 — Dispatch: shift_summary

### When

When a daily summary is closed (inside whatever service function handles close). The summary close already creates payroll entries — the inbox message should go out at the same moment.

### Who receives it

Every seller who held a session linked to that `dailySummaryId`. The sessions table has `user_id` per session row. Dispatch one `shift_summary` message per unique `user_id` among the day's sessions.

### Content

```
title: "Shift Summary · [date]"
body:  "You sold [N] cups at [Store Name] and earned Rp [gross_pay]."
metadata: {
  dailySummaryId,
  storeId,
  storeName,
  date,
  totalCups,      ← from the payroll entry for this user
  grossPay,       ← from the payroll entry for this user
  ratePerCup,     ← from the payroll entry
}
```

Each seller gets a personalized message with their own cups/earnings (not the store total). Use the payroll entry just created for each user.

### Implementation note

`createPayrollEntries` in `packages/services/payroll.ts` is already called on close and produces the per-user earnings. The shift_summary dispatch should happen right after `createPayrollEntries` returns, using the returned entries as the data source.

Where to add the call: find the close-day flow entry point (likely `closeDailySummary` in `packages/services/summaries.ts` or the close API route). Confirm before implementing.

---

## Ticket 2 — Dispatch: payout_ready

### When

`PATCH /api/payroll/periods/[id]` → status changes to `paid`.

### Who receives it

All sellers who have payroll entries in that period. Query `payroll_entries` for the period, get unique `user_id` values, dispatch one message per user.

### Content

```
title: "Payout Processed"
body:  "Your earnings for [startDate]–[endDate] have been paid: Rp [total]."
metadata: {
  periodId,
  startDate,
  endDate,
  totalGrossPay,   ← sum of this user's entries in the period
  entryCount,      ← number of working days
}
```

### Implementation note

Add the dispatch inside `updatePayrollPeriod` in `packages/services/payroll.ts` (after the status update succeeds), only when `status === 'paid'`. Fire-and-forget — failures must not throw.

---

## Ticket 3 — Dispatch: supply_request_update

### When

Supply request status changes to `acknowledged` or `fulfilled`. This requires a status-update endpoint for supply requests. Check if `PATCH /api/requests/[id]` exists — if not, this dispatch point needs the endpoint created first.

### Who receives it

The seller who created the request (`supply_requests.user_id`).

### Content

```
title: "Supply Request Update"
body:  "Your request for [TYPE_LABEL] has been [acknowledged / fulfilled]."
metadata: {
  requestId,
  type,
  status,
  storeId,
}
```

### Implementation note

If the update endpoint doesn't exist yet, create it as a minimal `PATCH /api/requests/[id]` that validates `{ status }`, updates the row, and dispatches the inbox message. The manager-facing flow for acknowledging requests lives in the admin app — seller app only needs to dispatch on status change (the webhook-like pattern).

---

## Ticket 4 — Dispatch: incident_report_update

### When

Incident report status changes to `acknowledged` or `resolved`. Same pattern as T3.

### Who receives it

The seller who filed the report (`incident_reports.user_id`).

### Content

```
title: "Report Update"
body:  "Your incident report '[title]' has been [acknowledged / resolved]."
metadata: {
  reportId,
  title,
  category,
  status,
  storeId,
}
```

### Implementation note

Create `PATCH /api/reports/[id]` if it doesn't exist. Minimal: validate `{ status }`, update row, dispatch inbox message. Fire-and-forget dispatch.

---

## Ticket 5 — Inbox UI

### Layout

```
Inbox

[empty state if no messages]

─── Today ─────────────────────────

[shift_summary card]
[supply_request_update card]

─── Earlier ──────────────────────

[payout_ready card]
...
```

Messages grouped by "Today" vs "Earlier". Sorted newest-first within each group.

### Per-type card design

**`shift_summary`**

```
┌──────────────────────────────────────────┐
│  🧾  Shift Summary · Mon 19 May          │
│      You sold 25 cups at Store Kota.     │
│      Earnings: Rp 50,000                 │
│                               2 hrs ago  │
└──────────────────────────────────────────┘
```

Tap → navigates to the payroll period detail page for the period containing that date (`/mobile/more/earnings/[periodId]`). Derive `periodId` from metadata.

**`payout_ready`**

```
┌──────────────────────────────────────────┐
│  💰  Payout Processed                    │
│      May 12–18 · Rp 150,000 paid         │
│                                 1 day ago│
└──────────────────────────────────────────┘
```

Tap → navigates to the payroll period detail page.

**`supply_request_update`**

```
┌──────────────────────────────────────────┐
│  📦  Supply Request                      │
│      Your Ice request has been fulfilled │
│                                 3 hrs ago│
└──────────────────────────────────────────┘
```

Tap → navigates to `/mobile/home/manage/request`.

**`incident_report_update`**

```
┌──────────────────────────────────────────┐
│  ⚠️   Report Update                      │
│      'Freezer broken' has been resolved  │
│                                 4 hrs ago│
└──────────────────────────────────────────┘
```

Tap → navigates to `/mobile/home/manage/report`.

### Unread state

Unread messages have a subtle left border accent or a dot indicator. On tap, mark as read (`PATCH /api/notifications/[id]/read`).

### Empty state

```
You're all caught up.
Shift summaries and payroll updates will appear here.
```

Clean, not sad. No illustration needed.

### Hook

Use `useNotifications` (or a new `useInbox` wrapper) with `channel=inbox` query param. The hook filters and returns only personal messages.

**File:** `apps/seller/app/[tenantSlug]/mobile/inbox/page.tsx` — replace `<EmptyInbox />` with the real feed.

---

## Implementation Phases

### Phase 1 — Schema + service cleanup (no UI, no dispatch)

1. **T0a** — Extend `NotificationTypeSchema` with inbox types.
2. **T0b** — Fix `NotificationTargetRoleSchema` casing. Write a DB migration if needed to update any existing rows.
3. **T0c** — Add `channel` param to `ListNotificationsQuery` + update `listNotifications` service.

**Verify:** `GET /api/notifications?channel=inbox` returns only personal messages. `channel=notifications` returns only broadcasts. No TypeScript errors.

---

### Phase 2 — Dispatch: shift_summary (highest value, closes the main loop)

4. **T1** — Find close-day entry point. Wire `shift_summary` dispatch after `createPayrollEntries`.

**Verify:** Close a day in staging → check `notification_events` table → one row per session-holding seller, `recipient_id` set, type = `shift_summary`, metadata contains correct cups/earnings.

---

### Phase 3 — Dispatch: payout_ready

5. **T2** — Wire dispatch in `updatePayrollPeriod` when `status === 'paid'`.

**Verify:** Mark a payroll period as "paid" via the admin app or direct API call → each seller with entries in that period gets a `payout_ready` row in `notification_events`.

---

### Phase 4 — Dispatch: request + report updates

6. **T3** — Create `PATCH /api/requests/[id]` if missing. Wire `supply_request_update` dispatch.
7. **T4** — Create `PATCH /api/reports/[id]` if missing. Wire `incident_report_update` dispatch.

**Verify:** Update a supply request status → `notification_events` row for the creating seller. Same for incident report.

---

### Phase 5 — Inbox UI

8. **T5** — Build the inbox page. Replace `EmptyInbox`. Implement all four card types with tap navigation. Group by Today/Earlier. Mark-read on tap.

**Verify:** Create a shift_summary event manually in the DB → inbox shows it immediately on reload. Tap it → navigates to payroll detail. Unread dot disappears after tap.

---

## Open Questions

1. **Close-day dispatch point** — Where exactly does `closeDailySummary` live and is `createPayrollEntries` called within the same function? Confirm before T1 implementation so the shift_summary dispatch hooks in cleanly.

2. **Supply request / incident report update endpoints** — Do `PATCH /api/requests/[id]` and `PATCH /api/reports/[id]` exist? If not, T3 and T4 need to create them. These endpoints are primarily for manager use (the admin app), but the seller app needs to dispatch the inbox message when status changes. Decide: does the seller app host these endpoints, or does the admin app? Recommend: seller app hosts them (service + route) since that's where the notification dispatch logic lives.

3. **Payroll period dispatch scope** — `payout_ready` goes to all sellers with entries in the period. If the tenant has 10 sellers and 5 worked that week, 5 messages are sent. Confirm this is acceptable (it should be — these are highly relevant, personal messages).

4. **Metadata-driven tap navigation** — The `shift_summary` card taps to a payroll period detail page. The `periodId` must be in the metadata. Confirm that `createPayrollEntries` has access to `payrollPeriodId` (it creates or finds the period, so yes — include it in the metadata at dispatch time).

5. **Notifications tab cleanup** — After this task, the notifications tab (`/mobile/notifications`) only handles `weather_forecast`. Consider whether the notifications tab should be removed from the nav and folded into inbox, or kept separate. Out of scope for this task, but worth deciding before starting to avoid a future refactor.
