# Task 005 — Session Integrity, Event History & Store Operations

## Overview

Six areas of work — feedback from Task 004 plus two new features:

1. **UX polish** — Camera-only photo inputs everywhere; weather/claim code card redesign in Manage.
2. **Gate unification** — "POS in use" state lives inside MobilePOS; all gate states should be in the layout.
3. **Session staleness** — User A's screen doesn't auto-refresh when User B takes over.
4. **Event history** — Timeline dots become a proper feature: dedicated page, entry from both Analytics and Manage.
5. **Supply Requests** — New table + UI for sellers to request supplies (cups, ice, syrup, etc.) with a camera photo.
6. **Incident Reports** — New table + UI for sellers to report issues (equipment, safety, hygiene) with description + optional camera photo.

---

## Key Files

**Existing (being modified):**
- `apps/seller/app/[tenantSlug]/mobile/home/manage/open/page.tsx` — add `capture="environment"` + better compression
- `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/MobileManage.tsx` — card redesign + new action rows
- `apps/seller/app/[tenantSlug]/mobile/home/layout.tsx` — add isPosInUse gate state
- `apps/seller/app/[tenantSlug]/mobile/home/pos/_components/MobilePOS.tsx` — remove all gate logic
- `apps/seller/lib/hooks/sessions/useSession.ts` — add polling + expose `summaryId`
- `apps/seller/app/[tenantSlug]/mobile/analytics/MobileAnalytics.tsx` — add event history entry per summary card

**New (being created):**
- `apps/seller/app/[tenantSlug]/mobile/analytics/daily/[summaryId]/events/page.tsx` — event history page
- `apps/seller/app/[tenantSlug]/mobile/home/manage/request/page.tsx` — supply request form + today list
- `apps/seller/app/[tenantSlug]/mobile/home/manage/report/page.tsx` — incident report form
- `apps/seller/app/api/requests/route.ts`
- `apps/seller/app/api/reports/route.ts`
- `apps/seller/lib/api/requests.ts`
- `apps/seller/lib/api/reports.ts`
- `apps/seller/lib/hooks/requests/useSupplyRequests.ts`
- `apps/seller/lib/hooks/reports/useIncidentReports.ts`
- `packages/services/requests.ts`
- `packages/services/reports.ts`
- `packages/features/requests/schema.ts`
- `packages/features/reports/schema.ts`
- `supabase/migrations/*_add_supply_requests.sql`
- `supabase/migrations/*_add_incident_reports.sql`

---

## Ticket 0 — UX polish: camera-only photos + Manage card redesign

### 0a — Camera-only photo inputs (all photo captures in the app)

**The problem**

`open/page.tsx` uses `<input type="file" accept="image/*">` which shows the full OS picker (gallery, files, camera). The close day `SinglePhotoStep.tsx` already has the correct pattern: `capture="environment"` forces the camera directly. Apply this everywhere.

**The standard** — copy `SinglePhotoStep.tsx`'s input exactly:

```html
<input
  type="file"
  accept="image/*"
  capture="environment"
  className="hidden"
  onChange={handleFileChange}
/>
```

`capture="environment"` = rear-facing camera, opens immediately on tap, no picker.

**Also standardize compression.** `open/page.tsx` uses a simplified JPEG-only compression. The `SinglePhotoStep` has the production-grade pattern (WebP with JPEG fallback, iOS HEIC safety net). Extract this into a shared utility:

**New file: `apps/seller/lib/compressPhoto.ts`**

```ts
export async function compressPhoto(file: File): Promise<File>
```

Moves the full compression logic from `SinglePhotoStep.tsx` into one place. All photo inputs (open store, supply requests, incident reports, future features) call this instead of duplicating the compression options.

**Files to update:**
- `apps/seller/app/[tenantSlug]/mobile/home/manage/open/page.tsx` — add `capture="environment"`, swap compression for `compressPhoto()`
- `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/daily/SinglePhotoStep.tsx` — replace inline compression with `compressPhoto()`
- `apps/seller/app/[tenantSlug]/mobile/home/manage/request/page.tsx` (new) — use `compressPhoto()` from the start
- `apps/seller/app/[tenantSlug]/mobile/home/manage/report/page.tsx` (new) — same

### 0b — Weather + Claim Code card redesign

**File:** `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/MobileManage.tsx`

**Current:** Left side = weather label + button. Right side = claim code shown in large monospace, tap to copy.

**New layout — two equal tappable halves:**

```
┌──────────────────────────────────────────────┐
│  [Left half — full area is a button]         │
│  Weather Forecast                            │
│  Check today's forecast    [cloud icon]      │
│                                              │
│ ─────── vertical divider ───────             │
│                                              │
│  [Right half — full area is a button]        │
│  Claim Code                                  │
│  •• ← masked  (or "42" when revealed)        │
└──────────────────────────────────────────────┘
```

**Left half:**
- Entire left half (`flex-1`) is a `<button>` that opens the weather drawer on click
- Same weather label and icon as before, just the tap target is the whole half

**Right half — claim code:**
- Label: `"Claim Code"` in `text-xs text-gray-500 uppercase tracking-wide`
- Default state (not revealed): show `••` in the same monospace style as the code — NOT the code itself
- Revealed state: show the actual code (e.g. `42`) in large bold monospace
- Toggle on tap — `const [codeRevealed, setCodeRevealed] = useState(false)`
- When `gate !== 'open'` or no session: show `—` as before (muted, no tap)
- Remove `handleCopyCode` — no clipboard copy anymore
- No "Since HH:MM" text needed anymore — keep it minimal: just the label + the code/dots

---

## Ticket 1 — Gate unification: move "POS in use" into layout

### The problem

`layout.tsx` handles three gate states (`no_summary`, `no_session`, `closed`) but `MobilePOS.tsx` separately handles the fourth (`open` + `session.userId !== profile.id` → `TakeOverCard`). Gate logic is split across two files.

### Fix

**`apps/seller/app/[tenantSlug]/mobile/home/layout.tsx`**

1. Import `useAuth` to get `profile.id`.
2. Extend `showGate` — takeover case only fires on the POS tab (`isPos`):

```ts
const { gate, session, transferSession } = useSession(selectedStoreId)
const { profile } = useAuth()

const isPosInUse = isPos && gate === "open" && session?.userId !== profile?.id
const showGate = isHomeRoot && (
  gate === "no_summary" || gate === "no_session" || gate === "closed" || isPosInUse
)
```

3. Move `TakeOverCard` from `MobilePOS.tsx` into the layout gate overlay. Pass `transferSession` from `useSession` (layout already has it).

4. Move `TakeOverCard` component definition to `apps/seller/app/[tenantSlug]/mobile/home/_components/TakeOverCard.tsx` — import it in layout, delete it from MobilePOS.

**`apps/seller/app/[tenantSlug]/mobile/home/pos/_components/MobilePOS.tsx`**

Remove:
- `TakeOverCard` component definition
- `showOverlay` const and all logic depending on it
- `useSession` import and call
- `useAuth` import and call
- The relative wrapper + overlay `<div>` around the product grid

Result: `MobilePOS` is a pure product grid + cart — no gate awareness.

---

## Ticket 2 — Session staleness: polling + order guard

### The problem

When User B transfers the session, User A's SWR cache stays stale. After Ticket 1, the layout gate won't trigger until SWR revalidates — User A can still submit orders in the window.

### Fix

**`apps/seller/lib/hooks/sessions/useSession.ts`**

1. Add `refreshInterval: 20000` to SWR options:

```ts
{ revalidateOnFocus: false, dedupingInterval: 5000, refreshInterval: 20000 }
```

2. Expose `summaryId` from the hook — needed by Manage's event history link without requiring consumers to know the gate shape:

```ts
return {
  gate: data?.gate ?? null,
  session: data?.gate === "open" ? data.session : null,
  summaryId:
    data?.gate === "open" ? data.session.dailySummaryId
    : data?.gate === "no_session" ? data.summaryId
    : data?.gate === "closed" ? data.summaryId
    : null,
  isLoading,
  error,
  mutate,
  openStore,
  resumeSession,
  transferSession,
  endSession,
}
```

**`apps/seller/app/api/orders/route.ts`** — verify (add if missing)

`POST` must confirm the submitting user owns the active session for `storeId`. If not, return `403`:

```ts
const activeSession = await getActiveSession(supabase, { tenantId, storeId })
if (!activeSession || activeSession.user_id !== userId) {
  return error("You do not hold the active session for this store", 403)
}
```

If `getActiveSession` doesn't exist in `packages/services/sessions.ts`, add it — single `.maybeSingle()` on `store_sessions` where `store_id = storeId AND status = 'active'`.

---

## Ticket 3 — Event history page + dual entry points

### Design intent

The timeline dots exist but aren't browsable. The event history becomes a real screen — reachable from both Analytics (per daily summary) and Manage (today's summary). Both routes point to the same page.

### Entry point A — Analytics

**`apps/seller/app/[tenantSlug]/mobile/analytics/MobileAnalytics.tsx`**

In each daily summary card, below `PhotoCountLabel`, add:

```tsx
<button
  onClick={() => navigation.push(url(
    `/mobile/analytics/daily/${summary.id}/events?storeId=${selectedStoreId}&date=${summary.date}`
  ))}
  className="text-sm text-blue-500 mt-0.5"
>
  View day activity →
</button>
```

### Entry point B — Manage

**`apps/seller/app/[tenantSlug]/mobile/home/manage/_components/MobileManage.tsx`**

Add an `ActionRow` for today's event history. Uses `summaryId` from the updated `useSession` hook:

```tsx
const { gate, session, summaryId } = useSession(selectedStoreId)

// Show row when today's summary exists (any gate state except no_summary)
{summaryId && (
  <ActionRow
    icon={<History size={20} className="text-gray-500" />}
    label="Today's Activity"
    sublabel="View store events for today"
    onClick={() => navigation.push(url(
      `/mobile/analytics/daily/${summaryId}/events?storeId=${selectedStoreId}&date=${todayStr}`
    ))}
    disabled={false}
  />
)}
```

`todayStr` is already computed in the component (UTC+7 date string). Hidden entirely when `gate === 'no_summary'` (no summary to link to).

### New page

**`apps/seller/app/[tenantSlug]/mobile/analytics/daily/[summaryId]/events/page.tsx`**

Client component. Reads `summaryId` from route params, `storeId` + `date` from query params.

```ts
const storeId = searchParams.get("storeId")
const date = searchParams.get("date")
const { events, isLoading } = useStoreActivityLogs(storeId, date)
```

**Render:**
```
← Back

Events · [formatted date]

08:23 AM  ● Store opened
10:45 AM  ● Expense added
12:01 PM  ● Session handed over
21:47 PM  ● Store closed
```

Each row: `EVENT_COLOR` dot + `EVENT_LABEL` text (import both maps from AtAGlance or extract to a shared constants file) + formatted local time (use `formatEventTime` logic from AtAGlance).

Empty state: "No events recorded for this day."

**No new API or schema needed** — `GET /api/activity-logs?storeId=&date=` already exists and is used by `useStoreActivityLogs`.

---

## Ticket 4 — Supply requests

### When to use

A seller realizes they're running low mid-shift. They submit a request (cups, ice, syrup, bags, tea, other) with optional notes and a camera photo showing current stock. Managers see this on the admin side.

### DB migration

**`supabase migration new add_supply_requests`**

```sql
CREATE TABLE supply_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  store_id         UUID NOT NULL REFERENCES stores(id),
  user_id          UUID NOT NULL REFERENCES profiles(id),
  daily_summary_id UUID REFERENCES daily_summaries(id),
  type             TEXT NOT NULL CHECK (type IN ('cups','bags','syrup','ice','tea','other')),
  notes            TEXT,
  photo_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','acknowledged','fulfilled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE supply_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read" ON supply_requests
  FOR SELECT USING (tenant_id = ANY(user_tenant_ids()));

CREATE POLICY "tenant_insert" ON supply_requests
  FOR INSERT WITH CHECK (tenant_id = ANY(user_tenant_ids()));
```

After migration: `pnpm types:db`.

### Supply request types

| value | UI label |
|---|---|
| `cups` | Cups |
| `bags` | Bags |
| `syrup` | Syrup |
| `ice` | Ice |
| `tea` | Tea |
| `other` | Other |

Intentionally mirrors the closing photo slot inventory items.

### Backend

**`packages/features/requests/schema.ts`**

```ts
export const SUPPLY_REQUEST_TYPES = ['cups','bags','syrup','ice','tea','other'] as const
export type SupplyRequestType = typeof SUPPLY_REQUEST_TYPES[number]

export const CreateSupplyRequestInput = z.object({
  storeId: UUIDSchema,
  dailySummaryId: UUIDSchema.optional(),
  type: z.enum(SUPPLY_REQUEST_TYPES),
  notes: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
})

export const ListSupplyRequestsQuery = z.object({
  storeId: UUIDSchema,
  date: z.string().optional(),
})

export const SupplyRequestResponse = z.object({
  id: z.string(),
  storeId: z.string(),
  dailySummaryId: z.string().nullable(),
  type: z.enum(SUPPLY_REQUEST_TYPES),
  notes: z.string().nullable(),
  photoUrl: z.string().nullable(),
  status: z.enum(['pending','acknowledged','fulfilled']),
  createdAt: z.string(),
  userId: z.string(),
})
export type SupplyRequestResponse = z.infer<typeof SupplyRequestResponse>
```

**`packages/services/requests.ts`**

- `createSupplyRequest(supabase, { tenantId, storeId, userId, type, notes, photoUrl, dailySummaryId })` — inserts row, logs `supply_request_created` (fire-and-forget)
- `listSupplyRequests(supabase, { tenantId, storeId, date })` — returns requests for store on given date (UTC+7 boundaries)

**`apps/seller/app/api/requests/route.ts`**

- `GET ?storeId=&date=` → `listSupplyRequests`
- `POST` → validate `CreateSupplyRequestInput` → `getRequestUser()` → `createSupplyRequest`

**`apps/seller/lib/api/requests.ts`** — `requestsApi.list(params)`, `requestsApi.create(input)`

**`apps/seller/lib/hooks/requests/useSupplyRequests.ts`** — SWR key `supply-requests-{storeId}-{date}`, expose `{ requests, isLoading, mutate }`

### UI

**`apps/seller/app/[tenantSlug]/mobile/home/manage/request/page.tsx`**

**Section 1 — Form:**
- Type picker: horizontal scrollable pill row, all 6 types, single-select, required. Selected: `bg-brand text-white`.
- Notes: optional `<textarea>` (3 rows). Placeholder: "e.g. Less than 20 cups left"
- Photo: optional. **Camera only** — `<input capture="environment" accept="image/*">`. Compress with `compressPhoto()`. Upload to Supabase Storage under path `supply-requests/{storeId}/{filename}`.
- Submit "Send Request": disabled until type is selected. On submit: compress + upload photo if present → `requestsApi.create()` with `dailySummaryId` from `useSession().summaryId` → `mutate()` → toast "Request sent" → clear form (stay on page for follow-up requests).

**Section 2 — Today's requests (read-only list):**
- Header: "Today's Requests"
- Sorted newest-first: type label, HH:MM time, status badge
  - `pending` → gray
  - `acknowledged` → blue "Seen"
  - `fulfilled` → green "Done"
- Empty state: "No requests today"

**`MobileManage.tsx`** — add action row (disabled when `dimmed`):

```tsx
<ActionRow
  icon={<Package size={20} className={dimmed ? "text-gray-400" : "text-blue-500"} />}
  label="Request Supplies"
  sublabel={dimmed ? "Open store first" : "Cups, ice, syrup..."}
  onClick={() => navigation.push(url("/mobile/home/manage/request"))}
  disabled={dimmed}
/>
```

---

## Ticket 5 — Incident reports

### When to use

Something went wrong — equipment failed, safety hazard, hygiene issue. The seller documents it with a category, title, description, and optional camera photo so managers are informed immediately.

### DB migration

**`supabase migration new add_incident_reports`**

```sql
CREATE TABLE incident_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  store_id         UUID NOT NULL REFERENCES stores(id),
  user_id          UUID NOT NULL REFERENCES profiles(id),
  daily_summary_id UUID REFERENCES daily_summaries(id),
  category         TEXT NOT NULL CHECK (category IN ('equipment','safety','hygiene','other')),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  photo_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','acknowledged','resolved')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read" ON incident_reports
  FOR SELECT USING (tenant_id = ANY(user_tenant_ids()));

CREATE POLICY "tenant_insert" ON incident_reports
  FOR INSERT WITH CHECK (tenant_id = ANY(user_tenant_ids()));
```

After migration: `pnpm types:db`.

### Report categories

| value | UI label | Accent |
|---|---|---|
| `equipment` | Equipment | orange |
| `safety` | Safety | red |
| `hygiene` | Hygiene | yellow |
| `other` | Other | gray |

### Backend

**`packages/features/reports/schema.ts`**

```ts
export const REPORT_CATEGORIES = ['equipment','safety','hygiene','other'] as const

export const CreateIncidentReportInput = z.object({
  storeId: UUIDSchema,
  dailySummaryId: UUIDSchema.optional(),
  category: z.enum(REPORT_CATEGORIES),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  photoUrl: z.string().url().optional(),
})

export const IncidentReportResponse = z.object({
  id: z.string(),
  storeId: z.string(),
  category: z.enum(REPORT_CATEGORIES),
  title: z.string(),
  description: z.string(),
  photoUrl: z.string().nullable(),
  status: z.enum(['open','acknowledged','resolved']),
  createdAt: z.string(),
  userId: z.string(),
})
```

**`packages/services/reports.ts`**

- `createIncidentReport(supabase, { tenantId, storeId, userId, category, title, description, photoUrl, dailySummaryId })` — inserts row, logs `incident_report_created`
- `listIncidentReports(supabase, { tenantId, storeId, date })` — returns reports for today

**`apps/seller/app/api/reports/route.ts`** — `GET ?storeId=&date=` + `POST`

**`apps/seller/lib/api/reports.ts`** — `reportsApi.create()`, `reportsApi.list()`

**`apps/seller/lib/hooks/reports/useIncidentReports.ts`** — SWR key `incident-reports-{storeId}-{date}`

### UI

**`apps/seller/app/[tenantSlug]/mobile/home/manage/report/page.tsx`**

Single form — no list (one-and-done, not recurring):

1. **Category picker** — 4 pills in a 2×2 grid with icon + label per category. Safety: red accent.
2. **Title** — single-line input. Required, 3–100 chars.
3. **Description** — textarea (5 rows). Required, 10–2000 chars. Placeholder: "Describe what happened and its current state..."
4. **Photo** — optional. **Camera only** — `<input capture="environment" accept="image/*">`. Compress with `compressPhoto()`.
5. **Submit "Submit Report"** — disabled until category + title + description filled. On submit: compress + upload photo → `reportsApi.create()` with `dailySummaryId` from `useSession().summaryId` → toast "Report submitted" → navigate to `/mobile/home/manage`.

**`MobileManage.tsx`** — add Report Issue row. **Always enabled** — a broken machine should be reportable before the store opens:

```tsx
<ActionRow
  icon={<AlertTriangle size={20} className="text-orange-500" />}
  label="Report Issue"
  sublabel="Equipment, safety, or hygiene"
  onClick={() => navigation.push(url("/mobile/home/manage/report"))}
  disabled={false}
/>
```

---

## Implementation Phases

### Phase 1 — UX polish (no migrations, standalone changes)

1. **T0a** — Create `compressPhoto.ts` utility. Update `open/page.tsx` to use `capture="environment"` + `compressPhoto()`. Update `SinglePhotoStep.tsx` to use `compressPhoto()`.
2. **T0b** — Manage card redesign: left half opens weather drawer, right half shows "Claim Code" with reveal-on-tap.

**Verify:** Open store page → tap photo area → camera opens directly (no picker). Manage card → tap left side → weather drawer opens. Tap right side → `••` reveals `42` (or whatever the code is). Tap again → hides.

---

### Phase 2 — Gate fix + session staleness (no migrations, highest impact)

3. **T1** — Move `TakeOverCard` from `MobilePOS` to `HomeLayout`. Expose `summaryId` from `useSession`. MobilePOS becomes a pure grid.
4. **T2** — Add `refreshInterval: 20000` to `useSession`. Verify (or add) session ownership check in `POST /api/orders`.

**Verify:** Two sessions as User A and User B. User B takes over. Within 20s, User A's screen shows takeover gate in the layout. Order attempt returns 403.

---

### Phase 3 — Event history (no migrations, reuses existing API)

5. **T3** — Add "View day activity" to analytics summary cards. Add "Today's Activity" row to Manage. Build the events page.

**Verify:** Analytics → summary card → "View day activity" → chronological event list. Manage → Today's Activity (only visible when summary exists) → same page.

---

### Phase 4 — Supply requests

6. **T4** — Migration → `pnpm types:db` → service → API → hook → UI → Manage row.

**Verify:** Manage → Request Supplies → pick "Ice" → submit → appears in today's list. Camera opens directly (no picker).

---

### Phase 5 — Incident reports

7. **T5** — Migration → `pnpm types:db` → service → API → hook → UI → Manage row.

**Verify:** Manage → Report Issue → pick category → fill title + description → submit → toast + redirect. Row is visible even before store opens.

---

## Open Questions (resolve before starting)

1. **T2 — Order API session validation**: Does `POST /api/orders` currently validate session ownership? Verify first — if missing this is a correctness gap beyond UX.

2. **T4 — Photo storage bucket for supply requests**: Use the existing summary photos bucket with path prefix `supply-requests/{storeId}/{filename}`, or a dedicated bucket? Recommend the existing bucket with a prefix.

3. **T3 — EVENT_COLOR / EVENT_LABEL extraction**: Both maps are currently defined inline in `AtAGlance.tsx`. Before building the events page, extract them to `apps/seller/lib/constants/activity-log-events.ts` so both `AtAGlance` and the events page import from one place.

4. **T0b — Claim code "Claim Code" label placement**: The label should read `"Claim Code"` in small uppercase above the `••` / code. Is this the right label, or should it say something like `"Your Code"`? Confirm before implementing.
