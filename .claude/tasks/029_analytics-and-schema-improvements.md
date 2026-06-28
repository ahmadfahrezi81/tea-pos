# Task 029 — Analytics & Schema Improvements

## Context

Post-`bdf7a0d` cleanup. The analytics area has a known timezone display bug
(times showing 7 hours behind / UTC instead of local time) and a few small
UI/i18n inconsistencies surfaced during that session.

---

## Bug 1 — `formatTimestamp` in SummaryDetailsCard doesn't guard against missing Z suffix

**File:** `apps/seller/components/SummaryDetailsCard.tsx:51-57`

```ts
function formatTimestamp(utc: string): string {
    return new Date(utc).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    });
}
```

**Problem:** Per ECMAScript spec, a datetime string *without* an explicit
timezone designator (e.g. `"2026-06-28T07:00:00"`, no `Z` or `+00:00`) is
parsed as **local time**, not UTC. Supabase sometimes returns `timestamptz`
values without the timezone suffix depending on the PostgREST version. The
established defensive pattern in `packages/utils/server-config/timezone.ts`
explicitly appends `"Z"` (`new Date(utcDate + "Z")`) to force UTC parsing.
`formatTimestamp` doesn't do this, so on environments whose local timezone is
UTC (e.g. the server during SSR, or a developer's machine), the time is
displayed as-is (UTC) rather than converted to +7 — which is the "7 hours
behind" symptom.

Same issue exists in `sessions/page.tsx:10-16` (`formatTime` function).

**Fix:** Append `"Z"` if the string doesn't already end with one, consistent
with the rest of the codebase:

```ts
function formatTimestamp(utc: string): string {
    const safe = utc.endsWith("Z") || utc.includes("+") ? utc : utc + "Z";
    return new Date(safe).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
    });
}
```

Apply the same guard to `formatTime` in `sessions/page.tsx`.

---

## Bug 2 — Hardcoded `"Asia/Jakarta"` instead of env-driven timezone

**Files:**
- `apps/seller/components/SummaryDetailsCard.tsx:55`
- `apps/seller/app/[tenantSlug]/mobile/analytics/daily/[summaryId]/sessions/page.tsx:14`
- `packages/utils/server-config/timezone.ts` (throughout — acceptable here since
  the file is named for Indonesia, but should still be noted)

**Problem:** The rest of the codebase reads the timezone from
`NEXT_PUBLIC_TIMEZONE_OFFSET` (a numeric `+7`). These two client components
hardcode the IANA name `"Asia/Jakarta"` instead. The `toLocaleString` API
requires an IANA name, not a numeric offset, so a mapping is needed.

`formatEventTime` in `lib/constants/activity-log-events.ts:80-88` uses the
offset-arithmetic approach and correctly reads `NEXT_PUBLIC_TIMEZONE_OFFSET`
— it's the right pattern for displaying times when you only have a numeric
offset.

**Options (pick one):**

A. **Preferred — offset arithmetic (no new env var needed):** Convert
   `formatTimestamp` and `formatTime` to the same arithmetic approach used by
   `formatEventTime`:
   ```ts
   const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
   const localMs = new Date(safe).getTime() + tz * 3_600_000;
   const d = new Date(localMs);
   // format d using UTC getters (getUTCHours etc.) or toISOString slicing
   ```
   Downside: you lose `toLocaleString` formatting sugar and must format
   manually.

B. **Add `NEXT_PUBLIC_TIMEZONE_IANA` env var** (e.g. `"Asia/Jakarta"`), read
   it in both functions, and update `.env.example`. Keeps `toLocaleString`
   simple but adds another env var.

---

## Bug 3 — Hardcoded `"Unknown"` (not i18n) in `MobileAnalytics.tsx`

**File:** `apps/seller/app/[tenantSlug]/mobile/analytics/MobileAnalytics.tsx:430`

```tsx
{s.userName ?? "Unknown"}
```

`useT()` is already imported and used throughout the same component. This
should be:

```tsx
{s.userName ?? t("common.unknown")}
```

---

## Improvement 1 — Cup-count badge color inconsistency between session lists

The same "X cups" pill appears in two places with different colors:

| Location | Class |
|---|---|
| `MobileAnalytics.tsx:433` (summary card inline sessions) | `bg-blue-500 text-white` |
| `SummaryDetailsCard.tsx:391-393` (detail card sessions section) | `bg-orange-100 text-orange-700` |

Orange is the established cups color everywhere else in the codebase (the
financials section uses `bg-orange-100` for the cups stat). Unify to orange.

**Fix:** Change `MobileAnalytics.tsx:433` to match `SummaryDetailsCard`:
```tsx
className="text-sm font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-lg shrink-0"
```

---

## Improvement 2 — `EVENT_LABEL` not using i18n system

**File:** `apps/seller/lib/constants/activity-log-events.ts:56-78`

All event labels are hardcoded English strings. The activity timeline page
(`analytics/daily/[summaryId]/events/page.tsx`) is fully i18n'd otherwise.
These labels should move into the i18n translation files so they can be
translated.

This is a larger change (requires adding ~20 keys across all locale files) so
treat it as a separate sub-task or follow-up, not a blocker.

---

## Schema — Add `daily_summary_id` to `store_orders`

### Problem

`fetchSessionUsersForSummaries` (packages/services/sessions.ts:293) is the
bottleneck behind the ~6s analytics load time. For a month view with 20 days
it fires **one order query per summary in parallel** — up to 20+ concurrent DB
round trips — plus N `auth.admin.getUserById` calls (one per unique user).

The previous approach queried the whole month at once but hit **Supabase's
1000-row default limit**, causing truncated cup counts on busy stores. The
per-summary fix avoids truncation but trades it for N queries.

### Root cause

The relationship between an order and a daily summary is currently *implicit*
— derived at query time from `store_id + user_id + session time window`. There
is no direct FK.

### Solution

Add `daily_summary_id uuid REFERENCES store_daily_summaries(id)` to
`store_orders`. This makes the relationship explicit and unlocks a single
aggregation query for the whole month:

```sql
SELECT daily_summary_id, user_id, SUM(soi.quantity) AS cups
FROM store_orders so
JOIN store_order_items soi ON soi.order_id = so.id
WHERE so.daily_summary_id = ANY($1::uuid[])
GROUP BY daily_summary_id, user_id
```

Returns one row per user per day (~40-60 rows for a busy month) — well under
any row limit — replacing N parallel joins on raw order rows.

### Migration

```sql
ALTER TABLE store_orders
  ADD COLUMN daily_summary_id uuid REFERENCES store_daily_summaries(id);

-- Backfill: match UTC created_at to local date (UTC+7)
UPDATE store_orders o
SET daily_summary_id = s.id
FROM store_daily_summaries s
WHERE o.tenant_id = s.tenant_id
  AND o.store_id = s.store_id
  AND (o.created_at + INTERVAL '7 hours')::date = s.date::date
  AND o.daily_summary_id IS NULL;

-- Index for the aggregation query
CREATE INDEX ON store_orders (daily_summary_id);
```

Orders that predate the summary system stay NULL — acceptable legacy data.

### Write path

**File:** `packages/services/orders.ts:58` (`createOrder`)

`createOrder` already fetches `activeSummary` after the order insert (line 149)
to update running totals. The write path change is:

1. Move the `activeSummary` fetch **before** the order insert (currently it's
   after at line 149)
2. Include `daily_summary_id: activeSummary?.id ?? null` in `orderPayload`
   (line 113) — `toSnakeKeys` handles the conversion

No new params needed. The function already has everything it needs.

### Service changes

**`fetchSessionUsersForSummaries` → replace with orders-based query:**

Sessions are not the right source for the main analytics flow. Auditing what
each UI place actually renders:

| Location | What it shows | Needs sessions? |
|---|---|---|
| `MobileAnalytics.tsx` inline | user name + cup count | No |
| `SummaryDetailsCard.tsx` sessions section | user name + cup count | No |
| `/sessions` page (`sessions/page.tsx`) | start/end times, duration, handover chain | **Yes** |

`store_sessions` is also only ~1 month old — any earlier summaries silently
return no users and no cup counts via `fetchSessionUsersForSummaries`, even
though order data exists for those days.

**New approach:** replace `fetchSessionUsersForSummaries` with a direct
orders aggregation:

```ts
// One query, all summaries, all of history
supabase
  .from("store_orders")
  .select("daily_summary_id, user_id, store_order_items(quantity)")
  .in("daily_summary_id", summaryIds)
  .eq("tenant_id", tenantId)
// aggregate cups per (daily_summary_id, user_id) in JS
```

Then batch-fetch user names from `users` and avatars via `auth.admin`.
Result: same shape the UI already expects — `{ [summaryId]: { userId, userName, userAvatarUrl, totalCups }[] }`.

Works for **all history**. No session dependency. No merging needed.

The `/sessions` page is unaffected — it keeps using `listSessionsBySummary`
which is the right and only place session records are needed.

**Dead code to remove during refactor:**
- `useSessionsByMonth` (`lib/hooks/sessions/useSessionsByMonth.ts`) — exported
  but never imported by any component
- `listSessionsByMonth` (`packages/services/sessions.ts:401`) — only reachable
  via the unused hook above
- The `?month=` branch in `apps/seller/app/api/sessions/route.ts` GET handler
  (lines 18-23) — same dead path

**`getSummaryBreakdown` (`packages/services/summaries.ts:401`):**
Currently does a time-window order query using `store_id + date + UTC range`
(lines 414-422). With `daily_summary_id` on orders, simplifies to:
```ts
.from("store_orders")
.select(`id, total_amount, store_order_items(...)`)
.eq("daily_summary_id", summaryId)
.eq("tenant_id", tenantId)
```
No date arithmetic, no extra summary lookup for `store_id`.

**`updateSummary` on close (`packages/services/summaries.ts:343`):**
Also calls `fetchOrdersForDate` (time-window query) to lock in final totals.
With `daily_summary_id`, this becomes a direct `eq("daily_summary_id", id)` query.

---

## Order of execution

1. Bug 1 (Z-suffix guard) — tiny, safe, fixes the visible symptom
2. Bug 3 (i18n "Unknown") — one-liner
3. Improvement 1 (badge color) — one-liner
4. Bug 2 (hardcoded timezone) — pick approach A or B with the user, then
   apply consistently across `SummaryDetailsCard`, `sessions/page.tsx`, and
   ideally `server-config/timezone.ts` too
5. Schema — `daily_summary_id` on `store_orders` (migration → write path → service refactor)
6. Improvement 2 (EVENT_LABEL i18n) — follow-up task
