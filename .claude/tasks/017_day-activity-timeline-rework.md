# Task 017 — Day Activity: Rich Segmented Timeline

## Problem

The current Day Activity page (`/mobile/analytics/daily/[summaryId]/events`) is a bare
flat list — colored dot + event label + time. It lacks:

- User attribution (who did the action)
- Metadata (amounts, names, context per event type)
- Order history (100 orders a day are invisible — not shown at all)
- Visual weight and hierarchy

The service also intentionally strips data: only `id, type, created_at` returned,
filtered to 7 of the 21 known event types. Everything richer is silently discarded.

---

## Goal

A full-day audit timeline. Top→bottom chronological (oldest first — the day tells a
story: open → orders flow → events → close). Visual style: vertical line with circles
as nodes, dotted connector between nodes (reference: task discussion screenshot).

The timeline interleaves two kinds of nodes:

```
[Event node]   Store opened by Ahmad · 08:00
[Orders node]  08:00 – 09:00 · 14 orders · Rp 280,000
[Orders node]  09:00 – 10:00 · 22 orders · Rp 440,000
[Event node]   Session handed over → Budi · 10:23
[Orders node]  10:23 – 11:00 · 9 orders · Rp 180,000
[Event node]   Expense added · Rp 50,000 (Gas) · 11:47
[Orders node]  11:47 – 12:00 · 3 orders · Rp 60,000
[Orders node]  12:00 – 13:00 · 18 orders · Rp 360,000
...
[Event node]   Store closed by Ahmad · 17:30
```

Events are hard breaks in the order timeline. Within each gap between consecutive
events, orders are bucketed by calendar hour. If an event falls mid-hour, the bucket
for that hour is split at the event boundary.

---

## Design Decisions

### Backend does all the work — FE renders only

The service returns a flat, pre-merged `Segment[]`. No logic on the frontend.
Order aggregation, event merging, and segment boundary calculation all happen in
the service layer.

### Orders: aggregate by store_id + date, not daily_summary_id

`store_orders` has no `daily_summary_id`. Query by `store_id` + timezone-aware date
range (same pattern as `listStoreActivityLogs`). This is fine — one summary per store
per day is enforced upstream.

### CPU cost is minimal

- Significant events query: ~5–15 rows/day
- Orders aggregation: `SELECT date_trunc('hour', created_at), COUNT(*), SUM(total_amount)`
  — at most 16–17 rows for a full operating day
- Service merge loop: O(n) over ~30 rows total — negligible

---

## New Response Shape

### Segment union type (in `packages/features/activity-logs/schema.ts`)

```ts
export const EventSegment = z.object({
    kind: z.literal("event"),
    id: UUIDSchema,
    type: ActivityLogType,
    createdAt: z.string(),
    userName: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    refId: UUIDSchema.nullable(),
    refTable: z.string().nullable(),
});

export const OrdersSegment = z.object({
    kind: z.literal("orders"),
    startTime: z.string(),   // ISO string
    endTime: z.string(),     // ISO string
    count: z.number(),
    totalSales: z.number(),
});

export const DaySegment = z.discriminatedUnion("kind", [EventSegment, OrdersSegment]);
export const DayActivityResponse = z.object({ segments: z.array(DaySegment) });

export type EventSegment = z.infer<typeof EventSegment>;
export type OrdersSegment = z.infer<typeof OrdersSegment>;
export type DaySegment = z.infer<typeof DaySegment>;
export type DayActivityResponse = z.infer<typeof DayActivityResponse>;
```

---

## Changes Required

### 1. `packages/features/activity-logs/schema.ts`

Add the new segment types and `DayActivityResponse` above. Keep `TimelineEventResponse`
untouched — it's used by the existing at-a-glance widget elsewhere.

### 2. `packages/services/activity-logs.ts`

Add a new export `getDayActivity` alongside the existing `listStoreActivityLogs`
(do not modify the existing function — it's used by the at-a-glance widget):

```ts
export async function getDayActivity(
    supabase: SupabaseClient,
    { tenantId, storeId, date }: { tenantId: string; storeId: string; date: string },
): Promise<DaySegment[]>
```

Implementation steps inside the function:

**Step A — fetch significant events with user names**
```sql
SELECT
  tal.id, tal.type, tal.created_at, tal.metadata, tal.ref_id, tal.ref_table,
  u.full_name
FROM tenant_activity_logs tal
JOIN users u ON u.id = tal.user_id
WHERE tal.tenant_id = $tenantId
  AND tal.store_id = $storeId
  AND tal.created_at BETWEEN $dayStart AND $dayEnd
  AND tal.type IN (NON_ORDER_TYPES)
ORDER BY tal.created_at ASC
```

`NON_ORDER_TYPES` = all `ActivityLogType` values except `order_created`.

**Step B — fetch hourly order aggregates**
```sql
SELECT
  date_trunc('hour', created_at AT TIME ZONE 'UTC') AS hour_bucket,
  COUNT(*)::int AS count,
  SUM(total_amount)::int AS total_sales
FROM store_orders
WHERE store_id = $storeId
  AND tenant_id = $tenantId
  AND created_at BETWEEN $dayStart AND $dayEnd
GROUP BY hour_bucket
ORDER BY hour_bucket ASC
```

> Note: Supabase JS doesn't support `date_trunc` directly in `.select()`. Use
> `.rpc('aggregate_orders_by_hour', { store_id, date_start, date_end })` OR
> fetch raw order timestamps and aggregate in JS (only ~100–200 rows/day — acceptable).
> Prefer the RPC if a migration is eventually allowed; for now, JS aggregation in the
> service is fine given daily volume.

**Step C — merge into segments**

```
breakpoints = [dayStart, ...event.createdAt values..., dayEnd]

For each consecutive pair (breakpoints[i], breakpoints[i+1]):
  1. If i > 0, emit the event at breakpoints[i] as an EventSegment
  2. Find all hourly order buckets that fall within (breakpoints[i], breakpoints[i+1])
  3. Emit each non-empty bucket as an OrdersSegment
     - startTime = max(breakpoints[i], bucket_hour_start)
     - endTime   = min(breakpoints[i+1], bucket_hour_end)
```

Empty order buckets (no orders in a gap) are omitted — don't show zero-order rows.

### 3. `apps/seller/app/api/activity-logs/route.ts`

Add a new GET param `view=day-activity` (or a separate route — separate route is
cleaner). Suggestion: new route at `/api/activity-logs/day-activity/route.ts`:

```ts
export async function GET(request: NextRequest) {
    // parse storeId + date
    // call getDayActivity(supabase, { tenantId, storeId, date })
    // return ok(segments)
}
```

### 4. `apps/seller/lib/api/activity-logs.ts`

Add:
```ts
dayActivity: async (params: { storeId: string; date: string }) => {
    const sp = buildParams(params);
    return apiFetch<DaySegment[]>(`/api/activity-logs/day-activity?${sp}`);
},
```

### 5. `apps/seller/lib/hooks/activity-logs/useStoreActivityLogs.ts`

Add a new hook alongside the existing one:
```ts
export function useDayActivity(storeId?: string, date?: string) {
    const { data, ...rest } = useSWR<DaySegment[]>(
        storeId && date ? `day-activity-${storeId}-${date}` : null,
        () => activityLogsApi.dayActivity({ storeId: storeId!, date: date! }),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );
    return { segments: data ?? [], ...rest };
}
```

### 6. `apps/seller/app/[tenantSlug]/mobile/analytics/daily/[summaryId]/events/page.tsx`

Full rework. Use `useDayActivity`. Styling must stay consistent with the other
analytics sub-pages (`daily/[summaryId]/page.tsx` and `sessions/page.tsx`).

**Reference patterns from existing pages:**
- Outer wrapper: `flex flex-col gap-3 pb-24`
- Cards: `bg-white rounded-2xl p-4` — same as sessions page
- Inner secondary areas: `bg-slate-100 rounded-xl px-3 py-2.5` — same as session time row
- Section headers: `text-sm font-semibold text-gray-800`
- Labels / secondary text: `text-gray-500 text-sm`
- Value text: `font-bold text-gray-900` or colored (`text-green-600`, `text-blue-600`, etc.)
- Status badges: `text-xs font-semibold px-2.5 py-1 rounded-full` (green-100/red-100/gray-100)
- Skeleton loading: `animate-pulse` with `bg-gray-200` placeholders, same shape as real cards
- Empty state: `bg-white rounded-2xl p-8 text-center` + `text-gray-400 text-sm`
- Summary stats bar (like sessions page top bar): `bg-white rounded-2xl px-4 py-3 flex items-center gap-4`

**Timeline structure (vertical line + circles):**

Outer container has a vertical line running down the left gutter (use `before:` pseudo
or a plain `w-px bg-gray-200` div absolutely positioned). Each row has a circle node
aligned to the line.

```
[circle] ─── [card content]
   |
[circle] ─── [card content]
   |
```

**Event node card** (`kind: "event"`):
- Filled circle: `w-3 h-3 rounded-full` using `EVENT_COLOR[type]` bg
- Icon from `EVENT_ICON[type]` displayed inside or beside the circle
- Content card: `bg-white rounded-2xl p-3` with:
  - Top row: `EVENT_LABEL[type]` in `font-semibold text-gray-800` + time in `text-xs text-gray-400`
  - Second row: user name in `text-sm text-gray-500` (same style as "Taken over from" in sessions)
  - Metadata row (if non-empty): `bg-slate-100 rounded-xl px-3 py-2` inline, e.g. amount in
    `font-bold text-orange-600` for expenses, same color system as summary detail financials

**Orders node card** (`kind: "orders"`):
- Hollow circle: `w-3 h-3 rounded-full border-2 border-gray-300 bg-white`
- Content card: `bg-white rounded-2xl p-3` with:
  - Time range: `text-sm font-semibold text-gray-800` (e.g. "09:00 – 10:00")
  - Stats in a `bg-slate-100 rounded-xl px-3 py-2 flex justify-between` row:
    - `{count} orders` in `font-bold text-blue-600` (matching summary detail "Orders" color)
    - `{formatRupiah(totalSales)}` in `font-bold text-green-600` (matching "Total Sales" color)

**Summary stats bar** (top of page, before timeline):
- `{totalEvents} events · {totalOrderBuckets} periods` — mirrors the sessions stats bar pattern

Use `EVENT_ICON`, `EVENT_COLOR`, `EVENT_LABEL` from `lib/constants/activity-log-events.ts`
— extend this file with any missing types that are now exposed.

Also add entries to `lib/constants/activity-log-events.ts` for all event types that
currently have no icon/color/label (e.g. `balance_updated`, `photo_uploaded`, etc.)

---

## Affected Files

| File | Change |
|---|---|
| `packages/features/activity-logs/schema.ts` | Add `EventSegment`, `OrdersSegment`, `DaySegment`, `DayActivityResponse` |
| `packages/services/activity-logs.ts` | Add `getDayActivity` — keep existing `listStoreActivityLogs` |
| `apps/seller/app/api/activity-logs/day-activity/route.ts` | New route |
| `apps/seller/lib/api/activity-logs.ts` | Add `dayActivity` method |
| `apps/seller/lib/hooks/activity-logs/useStoreActivityLogs.ts` | Add `useDayActivity` hook |
| `apps/seller/lib/constants/activity-log-events.ts` | Fill missing event types |
| `apps/seller/app/[tenantSlug]/mobile/analytics/daily/[summaryId]/events/page.tsx` | Full rework |

No schema migration required. `listStoreActivityLogs` and `useStoreActivityLogs` untouched.

---

## Open Questions

- **RPC vs JS aggregation for hourly orders**: JS aggregation in the service is fine
  for current daily volume (~50–200 orders). If volume grows, migrate to a Postgres RPC.
  Flag this when implementing.

- **`order_created` events**: currently logged per order in `tenant_activity_logs`.
  These are intentionally excluded from the activity feed (they're represented by the
  order buckets instead). Confirm this is the right call — showing both would be noisy.

---

## Testing Checklist

- [ ] Day with no events shows only hourly order buckets
- [ ] Day with no orders shows only event nodes
- [ ] Event mid-hour correctly splits the order bucket at that boundary
- [ ] Empty order gaps (no orders between two events) show no order node
- [ ] All 21 event types have icon + color + label (no fallback "undefined" shown)
- [ ] Metadata renders correctly for: expense_created (amount+type), session_transferred (user), balance_updated (amount)
- [ ] Loading state renders correctly
- [ ] Zero-event + zero-order day shows empty state
