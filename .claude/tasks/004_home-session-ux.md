# Home + Session UX — Implementation Plan

## The Mental Model

Sessions = **shift ownership**. One person holds the POS at a time.

- Anyone can open the store → they get the session + a 2-digit claim code
- Shift handoff: current holder shares their code → next person enters it → session transfers
- Payroll accuracy: because only one user holds the session at a time, `orders.user_id` naturally maps to the right shift window — no extra logic needed

**POS gate states (driven entirely by BE response):**

| `gate` value | What FE shows |
|---|---|
| `no_summary` | Gate overlay — "Store not open yet" + Open Store button |
| `no_session` | Gate overlay — "Store not open yet" + Open Store button (summary exists but session lapsed) |
| `open` + `session.userId !== profile.id` | Gate overlay — "POS is in use" + Take Over (2-digit input) |
| `open` + `session.userId === profile.id` | Normal POS — no overlay |
| `closed` | Gate overlay — "Store is closed for today" — no action |

**Claim code lives only in the Manage tab** (top card, right column).

---

## Key Files

**Frontend:**
- `apps/seller/app/[tenantSlug]/mobile/home/manage/open/page.tsx` — open store form
- `apps/seller/app/[tenantSlug]/mobile/home/manage/close/page.tsx` — close day flow (exists, imports from analytics — fixed in T5)
- `apps/seller/app/[tenantSlug]/mobile/home/manage/expense/page.tsx` — add expenses (exists)
- `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/MobileManage.tsx` — action rows + top card
- `apps/seller/app/[tenantSlug]/mobile/home/pos/_components/MobilePOS.tsx` — product grid + cart
- `apps/seller/app/[tenantSlug]/mobile/home/_components/AtAGlance.tsx` — greeting + timeline
- `apps/seller/app/[tenantSlug]/mobile/home/layout.tsx` — shared layout
- `apps/seller/lib/hooks/sessions/useSession.ts` — session hook (will be updated in T0a)
- `apps/seller/lib/api/sessions.ts` — API client (will be updated in T0a)

**Backend:**
- `packages/services/sessions.ts` — all session service functions
- `packages/services/summaries.ts` — daily summary service functions
- `packages/features/sessions/schema.ts` — session Zod schemas
- `apps/seller/app/api/sessions/route.ts` — GET (active session) + POST (open store)

---

## T0 — Prerequisites (do before anything else, all backend)

### T0a — Gate state endpoint + service refactor

This is the core backend change everything else depends on. The FE should never derive session state from two separate API calls — the BE computes it in one shot.

**1. Add `GateStateResponse` to `packages/features/sessions/schema.ts`**

```ts
export const GateStateResponse = z.discriminatedUnion("gate", [
  z.object({ gate: z.literal("no_summary") }),
  z.object({ gate: z.literal("no_session"), summaryId: UUIDSchema }),
  z.object({ gate: z.literal("open"), session: StoreSessionResponse }),
  z.object({ gate: z.literal("closed"), summaryId: UUIDSchema, closedAt: z.string() }),
])
export type GateStateResponse = z.infer<typeof GateStateResponse>
```

Also add `GetGateStateQuery` (same shape as `GetActiveSessionQuery` — just `storeId`).

**2. Add `getStoreGateState()` to `packages/services/sessions.ts`**

Two DB queries, one function:

```ts
export async function getStoreGateState(supabase, { tenantId, storeId, date }) {
  // 1. Fetch today's daily summary
  const summary = await supabase
    .from("daily_summaries")
    .select("id, closed_at")
    .eq("store_id", storeId).eq("tenant_id", tenantId).eq("date", date)
    .maybeSingle()

  if (!summary) return { gate: "no_summary" }
  if (summary.closed_at) return { gate: "closed", summaryId: summary.id, closedAt: summary.closed_at }

  // 2. Fetch active session
  const session = await supabase
    .from("store_sessions")
    .select("*")
    .eq("store_id", storeId).eq("tenant_id", tenantId).eq("status", "active")
    .maybeSingle()

  if (!session) return { gate: "no_session", summaryId: summary.id }
  return { gate: "open", session: toCamelKeys(session) }
}
```

**3. Add `resumeSession()` to `packages/services/sessions.ts`**

Handles the `no_session` edge case — creates a new session linked to an existing open summary, without touching the summary itself. Called when the gate is `no_session` and user taps "Open Store".

```ts
export async function resumeSession(supabase, { tenantId, storeId, userId, summaryId }) {
  // Verify summary is open and belongs to this store
  // Insert new store_session with the existing dailySummaryId
  // Log "store_open" activity
  // Return { session }
}
```

**4. Add `GET /api/sessions/gate` route**

New file: `apps/seller/app/api/sessions/gate/route.ts`

```ts
export async function GET(request) {
  const supabase = getServiceClient()
  const tenantId = await getCurrentTenantId()
  const query = GetGateStateQuery.safeParse(...)
  const date = getTodayStr() // UTC+7, consistent with summaries service

  const state = await getStoreGateState(supabase, { tenantId, storeId: query.data.storeId, date })
  return ok(GateStateResponse.parse(state))
}
```

**5. Update `apps/seller/lib/api/sessions.ts`**

Add `sessionsApi.getGateState({ storeId })` that calls `GET /api/sessions/gate`.

**6. Update `apps/seller/lib/hooks/sessions/useSession.ts`**

Change the SWR key and fetcher to call `sessionsApi.getGateState()` instead of `sessionsApi.getActive()`.

Return shape changes from `{ session }` to `{ gate, session }`:

```ts
export function useSession(storeId?) {
  const { data, ... } = useSWR(
    storeId ? `session-gate-${storeId}` : null,
    () => sessionsApi.getGateState({ storeId: storeId! }),
    { revalidateOnFocus: false, dedupingInterval: 5000 }
  )

  return {
    gate: data?.gate ?? null,        // 'no_summary' | 'no_session' | 'open' | 'closed' | null
    session: data?.gate === 'open' ? data.session : null,
    isLoading,
    openStore,      // unchanged
    resumeSession,  // new — calls POST /api/sessions/resume
    transferSession, // unchanged
    endSession,     // unchanged
    mutate,
  }
}
```

**`openStore` vs `resumeSession` in the hook:**  
The "Open Store" button in the gate overlay should call `openStore` when gate is `no_summary`, and `resumeSession` when gate is `no_session`. The FE checks `gate` to decide which to call — or a helper `startSession()` can wrap the logic.

### T0b — Fix `generateClaimCode()` to 2-digit integer

**File:** `packages/services/sessions.ts`

```ts
// Before
function generateClaimCode() { return Math.random().toString(36).substring(2, 8).toUpperCase() }

// After
function generateClaimCode() { return String(Math.floor(Math.random() * 90) + 10) } // "10"–"99"
```

**File:** `packages/features/sessions/schema.ts`

```ts
// TransferSessionInput.claimCode: change from
z.string().length(6)
// to
z.string().regex(/^\d{2}$/, "Must be a 2-digit number")
```

No DB migration needed — `store_sessions.claim_code` is already a string column.

### T0c — DB uniqueness constraint on `daily_summaries`

Currently only an app-level guard. A race condition (two simultaneous opens) can bypass it.

**Migration:** `supabase migration new add_unique_daily_summary_per_store`

```sql
CREATE UNIQUE INDEX unique_daily_summary_store_date
  ON daily_summaries (store_id, date, tenant_id);
```

### T0e — Fix close-day BE gaps

Three issues found while reading the close day API route and payroll service:

**1. Payroll creation is silent on failure**

In `apps/seller/app/api/summaries/route.ts` (PUT handler), `createPayrollEntries` is called fire-and-forget with only a `console.error`. If it fails in production, payroll entries silently never get created for that day — no UI feedback, no retry.

Fix: The function should still be non-blocking (don't make the close response wait for payroll), but failure should be logged to `activity_logs` or at minimum throw a structured error the monitoring can catch. Consider wrapping in a proper error handler rather than `console.error`.

**2. `createPayrollEntries` has no idempotency guard**

In `packages/services/payroll.ts`, there's no check for existing entries before inserting. If the close endpoint is called twice (double-tap, network retry), you get duplicate payroll entries for the same `(daily_summary_id, user_id)` pair.

Fix: Add a check at the top of `createPayrollEntries`:
```ts
const { count } = await supabase
  .from("payroll_entries")
  .select("id", { count: "exact", head: true })
  .eq("daily_summary_id", dailySummaryId)
  .eq("tenant_id", tenantId)

if ((count ?? 0) > 0) return [] // already created, skip
```

Or add a `UNIQUE` constraint on `(daily_summary_id, user_id)` at the DB level for belt-and-suspenders.

**3. Active session is never ended when the day closes**

When `closedAt` is set on a summary, the linked `store_session` stays `status: 'active'` in the DB indefinitely. With the new gate logic this is functionally fine (gate checks today's summary date, not session status), but it's incorrect state — the session should end when the day closes.

Fix: In the PUT route (or `updateSummary` service), when `closedAt` is being set, also update any active session for that `daily_summary_id` to `status: 'ended'`, `ended_at = now()`.

### T0d — Add `open_time` and `close_time` to `stores` table

The AtAGlance timeline currently hardcodes `"08:00"` / `"22:00"`. Each store has its own hours.

**Migration:** `supabase migration new add_store_open_close_time`

```sql
ALTER TABLE stores
  ADD COLUMN open_time  TEXT NOT NULL DEFAULT '08:00',
  ADD COLUMN close_time TEXT NOT NULL DEFAULT '22:00';
```

**After migration:**
- Run `pnpm types:db` to regenerate `packages/db/types.ts`
- Update `packages/features/stores/schema.ts` — add `openTime` and `closeTime` to `StoreResponse`
- Update the stores service/API to include these fields in responses
- `useStore()` context should expose them via `selectedStore.openTime` / `selectedStore.closeTime`

---

## Ticket 1 — Complete the Open Store page (photo step)

**File:** `apps/seller/app/[tenantSlug]/mobile/home/manage/open/page.tsx`

Current page has opening balance input only. Add a **required** photo — proof of who opened and when.

**New layout (single page, two sections stacked):**

1. **Section 1 — Opening Balance** (already exists)
2. **Section 2 — Opening Photo** (new): camera/gallery pick button, thumbnail preview once selected. Required — "Open Store" button disabled until both are filled.

**On submit:**
1. Decide which action to call based on gate state from `useSession`:
   - `gate === 'no_summary'` → call `openStore({ date, openingBalance })` → get `{ session, dailySummary }`
   - `gate === 'no_session'` → call `resumeSession()` → get `{ session }` (use existing `summaryId` from gate state)
2. Upload photo to Supabase Storage (`browser-image-compression` first)
3. Insert into `daily_summary_photos`: `type = 'opening'`, `daily_summary_id`, `store_id`, `tenant_id`
4. Navigate to `/mobile/home/manage` on success

Check `analytics/daily/_components/SinglePhotoStep.tsx` for the existing photo capture pattern. Confirm the correct `type` string — check `packages/features/summaries/photos-schema.ts` for `PHOTO_TYPES` to find or add `'opening'`.

---

## Ticket 2 — MobileManage: 2-col top card + session-aware rows

**File:** `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/MobileManage.tsx`

**Add at top:** `useSession(selectedStoreId)` — now returns `{ gate, session }`.

### Top card — split into 2 columns

Replace the current full-width weather card with a 2-column card:

```
┌──────────────────────────────────────────┐
│  Weather Forecast  │  Session Code        │
│  [Weather button]  │  42                  │
│                    │  Active since 08:23  │
└──────────────────────────────────────────┘
```

- **Left col:** existing weather button and label, unchanged
- **Right col when `gate === 'open'`:** `session.claimCode` in large bold monospace. Below: "Active since HH:MM" (format `session.startedAt`). Tap to copy → clipboard + toast "Code copied"
- **Right col otherwise:** muted `—`

### Action rows — gate-aware

**When `gate === 'no_summary'` or `gate === 'no_session'`:**
- "Open Store" row: highlighted green (primary action)
- "Add Expenses" and "Close Day": `opacity-50 pointer-events-none`, sublabel "Open store first"

**When `gate === 'open'`:**
- "Open Store" row: keep it for now — T3 Part B removes it
- "Add Expenses" and "Close Day": fully active

**When `gate === 'closed'`:**
- All rows dimmed — day is closed, nothing to do here today

---

## Ticket 3 — POS: session gate overlay + remove Open Store from Manage

### Part A — POS gate overlay

**File:** `apps/seller/app/[tenantSlug]/mobile/home/pos/_components/MobilePOS.tsx`

Add `useSession(selectedStoreId)` and get `profile.id` from auth context. Wrap the product grid in a relative container. When gate is active: product grid at `opacity-20 pointer-events-none`, centered card overlay on top.

**`gate === 'no_summary'` or `gate === 'no_session'`:**
```
┌─────────────────────────────┐
│  [Store icon]               │
│  Store not open yet         │
│  Open the store to start    │
│  taking orders today.       │
│                             │
│  [ Open Store → ]           │
└─────────────────────────────┘
```
"Open Store" navigates to `/mobile/home/manage/open`.

**`gate === 'closed'`:**
```
┌─────────────────────────────┐
│  [Lock icon]                │
│  Store is closed            │
│  Today's session has        │
│  ended.                     │
└─────────────────────────────┘
```
No action — read only.

**`gate === 'open'` + `session.userId !== profile.id`:**
```
┌─────────────────────────────┐
│  [Lock icon]                │
│  POS is in use              │
│  Ask the current seller     │
│  for their 2-digit code     │
│  to take over.              │
│                             │
│  [ 4 2 ] ← numeric input    │
│  [ Take Over ]              │
└─────────────────────────────┘
```
- Input: `type="number"` `inputMode="numeric"` `maxLength={2}`. Enable "Take Over" once 2 digits entered.
- "Take Over" calls `transferSession(claimCode)`. Show inline error if code is wrong.

**`gate === 'open'` + `session.userId === profile.id`:** normal product grid, no overlay.

**`gate === null` (loading):** full opacity product grid — avoids gate flash on every load.

### Part B — Remove "Open Store" from MobileManage

**File:** `apps/seller/app/[tenantSlug]/mobile/home/manage/_components/MobileManage.tsx`

Once the POS gate is the primary entry point, the "Open Store" action row in Manage is redundant.

- Remove the "Open Store" `ActionRow` and its navigation handler entirely
- When `gate` is not `'open'`: show "Add Expenses" and "Close Day" dimmed — the top card's right column `—` communicates no session is active
- When `gate === 'open'`: just "Add Expenses" and "Close Day" active

---

## Ticket 4 — AtAGlance: store hours + session state

**Files:**
- `apps/seller/app/[tenantSlug]/mobile/home/_components/AtAGlance.tsx`
- `apps/seller/app/[tenantSlug]/mobile/home/layout.tsx`

### Wire real store hours

In `HomeLayout`: call `useStore()` to get `selectedStore.openTime` / `selectedStore.closeTime` (available after T0d). Pass as props to `AtAGlance`. The component already accepts these — stop using the hardcoded defaults.

### Session state on the timeline

`HomeLayout` already fetches session state via `useSession`. Pass `gate` down as a prop.

**When `gate !== 'open'`:**
- `LockOpen` icon (left edge): amber color + `animate-pulse`
- Small label beneath: `"Tap to open"`
- On tap: navigate to `/mobile/home/manage/open`
- Timeline track: lighter inactive color (`bg-gray-100`)

**When `gate === 'open'`:** existing behaviour, no changes.

**When `gate === null` (loading):** no change — avoid layout shift.

### Timeline boundary icons — decide before implementing

Currently `LockOpen` (left) and `Lock` (right) sit at the scrollable edges of the timeline track. This feels like they're part of the scrollable content when they should be landmarks outside it.

- **Option A:** Remove both icons from the track entirely. Communicate session state through track color and the pulse on the header section only. Cleanest for now.
- **Option B:** Move both indicators above the scrollable track — fixed, not scrolling. Track becomes a pure progress bar. Future: actual event markers (store open time, shift changes) appear as dots on the track at the correct time position.

Pick one before implementing — don't leave icons at the scrollable edges.

---

## Ticket 4b — Close day: remove Notes step

**Files:**
- `apps/seller/app/[tenantSlug]/mobile/home/manage/close/page.tsx`
- `apps/seller/app/[tenantSlug]/mobile/analytics/daily/close/page.tsx` (will be deleted in T5 anyway, but update for consistency while it exists)

The close day wizard currently has 8 steps: Ice → Syrup → Bags → Cups → Waste → Cash → Notes → Review. Remove Notes to make the flow faster.

**Changes in both files:**

1. Remove `{ label: "Notes" }` from `STEPS` array → 7 steps
2. Remove `const STEP_NOTES = 6` constant
3. Change `const STEP_REVIEW = 7` → `const STEP_REVIEW = 6`
4. Remove `notes` state: `const [notes, setNotes] = useState("")`
5. Remove `setNotes(summary.notes)` from the `useEffect` that seeds from summary
6. Remove the `STEP_NOTES` block from `handleNext` (the one that calls `updateSummary(summaryId, { notes })`)
7. Remove `notes` from `handleConfirm` — change to `updateSummary(summaryId, { actualCash, closedAt: ... })`
8. Remove `NotesStep` import
9. Remove `{currentStep === STEP_NOTES && <NotesStep ... />}` render block

`nextDisabled` has no `STEP_NOTES`-specific condition — no change needed there.

The `notes` column stays nullable in the DB. It just won't be set from the close flow anymore.

---

## Ticket 5 (FINAL) — Remove store management from Analytics

**Context:** `home/manage/close/page.tsx` and `home/manage/expense/page.tsx` already fully exist. The only issue: `home/manage/close/page.tsx` imports its shared step components from `analytics/daily/_components/`. Those need a new home before analytics is cleaned up.

### Step 1 — Move shared step components

Move from `analytics/daily/_components/` to `home/manage/_components/daily/`:

- `DailyStepHeader`
- `SinglePhotoStep`
- `NotesStep`
- `ReviewStep`
- `SimpleCashStep`
- `SummaryPhotoThumbnail`

Update all import paths in `home/manage/close/page.tsx` and any other files that reference them.

### Step 2 — Remove from Analytics

Once imports are updated and verified working:

- Remove "Open Store" popup, `handleOpenStoreToday`, `useSession` call from `MobileAnalytics.tsx`
- Remove `SetBalanceModal` usage if tied to the opening flow
- Remove `analytics/daily/close/` page (or leave as a redirect to `/mobile/home/manage/close`)
- Remove any duplicate store management CTAs in analytics

**Do this ticket last** — only after T1–T4 are confirmed working in production.

---

## Implementation Phases

Work ticket-by-ticket within each phase. Deploy and smoke-test before moving to the next phase.

---

### Phase 1 — Backend foundation
*All service/API/schema changes. No FE changes yet. After this phase the gate endpoint is live but nothing on the FE uses it yet.*

1. **T0b** — 2-digit claim code: `generateClaimCode()` + schema validation. Lowest risk, no migration.
2. **T0c** — Migration: unique index on `daily_summaries(store_id, date, tenant_id)`.
3. **T0d** — Migration: `open_time` / `close_time` on `stores` → run `pnpm types:db` → update store schema + service + `useStore()` context.
4. **T0e** — Fix close-day BE gaps: payroll idempotency guard, proper failure logging, end active session when day closes. Do before T0a so the gate reads correct data from day one.
5. **T0a** — Gate endpoint: `getStoreGateState()` service, `resumeSession()` service, `GET /api/sessions/gate` route, `GateStateResponse` schema, update `useSession` hook and API client.

**Verify Phase 1:** Hit `GET /api/sessions/gate?storeId=X` directly and confirm it returns the correct `gate` value for each scenario (no summary, open, closed).

---

### Phase 2 — Quick win: close day simplification
*Isolated UI change with zero dependencies. Good warmup before the heavier FE work.*

6. **T4b** — Remove Notes step from both close day pages (manage + analytics).

**Verify Phase 2:** Run through the full close day flow — confirm it completes in 7 steps with no console errors.

---

### Phase 3 — Store management UX
*The main feature work. Each ticket depends on the previous one being stable.*

7. **T1** — Open store page: add photo step, handle both `no_summary` and `no_session` paths.
8. **T2** — MobileManage: 2-col top card (weather + session code), gate-aware action rows.
9. **T3** — POS gate overlay (all 4 states) + remove Open Store row from Manage.

**Verify Phase 3:** Full happy path — open store → sell → transfer session → close day. Check all gate states render correctly.

---

### Phase 4 — Polish
*Visible but non-critical. Safe to defer if Phase 3 takes longer.*

10. **T4** — AtAGlance: wire real store hours from `selectedStore`, session pulse on timeline. Decide icon option (A or B) before starting.

**Verify Phase 4:** Check timeline renders correctly for a store with non-default hours. Confirm pulse shows when store is not open.

---

### Phase 5 — Cleanup (do last, only when production is stable)

11. **T5** — Move shared step components out of analytics, remove store management from analytics pages.

---

## Open Questions (resolve before starting)

1. What `type` values exist in `packages/features/summaries/photos-schema.ts` `PHOTO_TYPES`? Need to confirm or add `'opening'` before T1.
2. Which hook provides `profile.id` in POS and Manage components? Needed for T3's `session.userId !== profile.id` check.
3. T4 icon decision: Option A (remove) or Option B (move above track)? Decide before implementing T4.
4. `resumeSession` API route — add to `POST /api/sessions/resume` or handle as a variant of `POST /api/sessions`? Keep them separate to avoid overloading the open store endpoint.
