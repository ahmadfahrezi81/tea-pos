# Task 024 — Earnings Page: Pay Config Card + Custom Calendar

## Context

Going to prod tonight. Scope is intentionally narrow: **only the seller's own
Earnings page** (`/mobile/more/earnings`). Reimbursements/claims are untouched
in this task.

No fixed height split (the earlier draft's "30%/60%" framing is dropped).
Instead, the top section is a **switcher** between two views — Pay Config
card and Calendar — same pattern as the POS/Manage segmented control at
`apps/seller/app/[tenantSlug]/mobile/home/_components/PillSwitcher.tsx`
(`bg-slate-200 rounded-xl p-1` pill group). Difference: POS/Manage switches
*routes* via `Link`; this one stays on the same page and switches *local
state* via `button`s (no navigation), since both views are just different
visualizations of the same earnings data.

```
┌─────────────────────────────┐
│ [ Pay Config | Calendar ]    │  ← pill switcher, shrink-0
├─────────────────────────────┤
│ (selected view renders here) │  ← shrink-0, height follows content
├─────────────────────────────┤
│ Week / Month filter bar      │  ← shrink-0
├─────────────────────────────┤
│ Period list (scrollable)     │  ← flex-1 overflow-y-auto, rest of page
└─────────────────────────────┘
```

Page must keep `"use client"` and the existing data already wired
(`usePayrollPeriods`, `usePayouts`) — this task adds to it, not replace it.

---

## Goal 1 — Pay Config Card (transparency)

Small card at the very top showing the seller's current commission setup —
so staff can see the rate they're paid without asking around.

### Data gap

`GET /api/payroll-user-info` currently returns `commissionTypeId` only — no
rate or type name (rate lives on `payroll_commission_types.rate_per_cup`,
joined from `payroll_user_info.commission_type_id`). Need a small backend
extension, following the layered architecture (service → route → schema →
api client → hook → component):

- **`packages/services/payroll-user-info.ts`** — `getPayrollUserInfo` should
  also join `payroll_commission_types(name, rate_per_cup)` when
  `commission_type_id` is set. Supabase nested select:
  ```ts
  .select("*, payroll_commission_types(name, rate_per_cup)")
  ```
  Flatten into the returned object as `commissionTypeName` and `ratePerCup`
  (both `null` if no commission type assigned).
- **`packages/features/payroll-user-info/schema.ts`** — add
  `commissionTypeName: z.string().nullable()` and
  `ratePerCup: z.number().nullable()` to `PayrollUserInfoResponse`.
- **`apps/seller/app/api/payroll-user-info/route.ts`** — no route change
  needed, `GET` already returns the full parsed object.
- **`apps/seller/lib/api/payroll-user-info.ts`** — no change, just re-parses
  the wider schema.
- **`apps/seller/lib/hooks/payroll-user-info/usePayrollUserInfo.ts`** — no
  change, already exposes `info`.

### UI

New file: `apps/seller/app/[tenantSlug]/mobile/more/earnings/_components/PayConfigCard.tsx`

```tsx
<div className="bg-white rounded-2xl p-4 space-y-1">
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
    {t("earnings.payConfig")}
  </p>
  {!info?.ratePerCup ? (
    <p className="text-sm text-amber-600">{t("earnings.noRateConfigured")}</p>
  ) : (
    <>
      <p className="text-lg font-bold text-gray-900">
        Rp {info.ratePerCup.toLocaleString("id-ID")} <span className="text-sm font-medium text-gray-400">/ cup</span>
      </p>
      <p className="text-sm text-gray-500">{info.commissionTypeName}</p>
    </>
  )}
</div>
```

Loading state: skeleton block matching other cards (`h-16 animate-pulse`).
Use `usePayrollUserInfo()` (existing hook) — no new hook needed for this card.

### Top switcher

New file: `apps/seller/app/[tenantSlug]/mobile/more/earnings/_components/EarningsViewSwitcher.tsx`

Controlled component — `view: "config" | "calendar"`, `onChange`. Visually
matches `PillSwitcher.tsx` exactly (`bg-slate-200 rounded-xl p-1 self-start`,
active tab `bg-white text-slate-950`, inactive `text-slate-600`) but renders
`<button>` instead of `<Link>` since there's no route change:

```tsx
<div className="flex items-center bg-slate-200 rounded-xl p-1 self-start">
  <button onClick={() => onChange("config")} className={pill(view === "config")}>
    {t("earnings.viewConfig")}
  </button>
  <button onClick={() => onChange("calendar")} className={pill(view === "calendar")}>
    {t("earnings.viewCalendar")}
  </button>
</div>
```

Owning page (`earnings/page.tsx`) holds `const [view, setView] = useState<"config" | "calendar">("config")`
and renders `<PayConfigCard />` or `<PayCalendar />` below the switcher based
on `view` — only one mounts at a time.

---

## Goal 2 — Custom Calendar (month grid, contribution-style)

A real calendar grid for the current month, marking which days the seller
worked (i.e. has a `payroll_commissions` entry for that date), with prev/next
month navigation and ISO week numbers.

### Data source — reuse, don't extend the service

`ListPayrollCommissionsQuery` only filters by `periodId`/`userId`, no date
range. Rather than add a date-range param, reuse the existing
`usePayrollCommissions({ userId })` (no `periodId` → returns all of the
user's commission rows) and filter client-side by month. Volume is small
(one row per worked day, per user) — same assumption the existing earnings
list already makes. Revisit with a real date-range param only if this proves
too slow later.

Each `PayrollCommissionResponse` has `date`, `totalCups`, `grossPay` — exactly
what a day cell needs.

### Component

New file: `apps/seller/app/[tenantSlug]/mobile/more/earnings/_components/PayCalendar.tsx`

**Props:** none — owns its own `currentMonth` state (`Date`, defaults to
today) and fetches via `usePayrollCommissions({ userId: user?.id })`
internally (`useAuth()` for `user`).

**Header row:**
```
‹     June 2026     ›
```
- Left/right chevron buttons (`ChevronLeft` / `ChevronRight` from
  `lucide-react`, same icon set already used on this page) step
  `currentMonth` by ±1 month (`addMonths`/`subMonths` from `date-fns`).
- Center label: `format(currentMonth, "MMMM yyyy")`.

**Grid:**
- Monday-start weeks (matches `getISOWeek` already used in this codebase for
  ISO week numbering — don't mix Sunday-start grid with ISO week labels,
  they'll visually disagree).
- 7 day-of-week letter headers (Mon–Sun).
- One extra **leading column** showing the ISO week number for each row
  (`getISOWeek` from `date-fns`, computed from the Monday of that row) —
  small muted text, e.g. `W24`.
- Use `startOfMonth`, `endOfMonth`, `startOfWeek(..., { weekStartsOn: 1 })`,
  `endOfWeek(..., { weekStartsOn: 1 })`, `eachDayOfInterval` from `date-fns`
  to build the full grid (including leading/trailing days from adjacent
  months, dimmed).
- Day cell: date number, small dot (or filled circle) in brand color under
  the number if a commission entry exists for that date. Today gets a subtle
  ring/border. Days outside `currentMonth` are dimmed (`text-gray-300`).
- Tap a day with an entry → resolve the `payrollPeriodId` for that date from
  the already-loaded `periods` (find period where `startDate <= date <=
  endDate`) and `navigation.push(url(`/mobile/more/earnings/${periodId}`))`.
  Tapping a day with no entry is a no-op.

**Perf note:** build a `Set<string>` of worked dates (`YYYY-MM-DD`) once per
`commissions` change via `useMemo`, not on every render/cell.

---

## Goal 3 — Week/Month filter bar + list

Between the top section and the existing period list, add a small filter row
(matching the search/filter row style in `FeedbackHistory.tsx`'s pattern —
pill buttons, not a dropdown):

```tsx
<div className="shrink-0 flex gap-2">
  <button className={pillClass(view === "week")} onClick={() => setView("week")}>
    {t("earnings.filterWeek")}
  </button>
  <button className={pillClass(view === "month")} onClick={() => setView("month")}>
    {t("earnings.filterMonth")}
  </button>
</div>
```

- `view` state: `"week" | "month"`, default `"week"` (current behavior).
- **Week view:** unchanged — existing period-by-period list (one row per
  ISO week), as today.
- **Month view:** group periods by the calendar month their `startDate`
  falls in (`format(parseISO(period.startDate), "MMMM yyyy")`), render a
  month-group header line + a summed total (sum of `payout.totalPay` for
  periods in that month) above each group's period rows. Still tap-through
  to the same `[periodId]` detail page per row.
- This is a pure client-side reshape of the data already fetched by
  `usePayrollPeriods()` + `usePayouts()` — no backend change.

### Per-card totals (cups + earnings, before opening) — UI only, simplified

Each week row in the list currently shows `payout.totalPay` only once a
payout row exists, otherwise "Tap to view" with no numbers. Add a
quick-glance cups line to every row — **UI pass only, no new backend
correctness logic**:

```
Week 20 · May 12–18              [Open]
142 cups · Rp 71,000
```

- **Cups source:** `usePayrollCommissions({ userId: user?.id })` (no
  `periodId` — same hook instance the calendar already needs, share it at
  the page level and pass `commissions` down rather than fetching twice).
  Group by `payrollPeriodId`, sum `totalCups` → `cupsByPeriod: Record<string, number>`.
- **Earnings shown:** keep existing behavior as-is — `payout.totalPay` if a
  payout row exists, otherwise the existing "Tap to view" text. Don't add an
  estimated/computed Rp figure for periods without a payout row; that
  requires backend decisions not yet made (see Open Question 4 below).
  Just show the cups count next to whatever earnings text already renders.
- Periods with zero commission rows: keep existing "No shifts · Rp 0"
  muted-text behavior.

---

## File List

**New:**
- `apps/seller/app/[tenantSlug]/mobile/more/earnings/_components/EarningsViewSwitcher.tsx`
- `apps/seller/app/[tenantSlug]/mobile/more/earnings/_components/PayConfigCard.tsx`
- `apps/seller/app/[tenantSlug]/mobile/more/earnings/_components/PayCalendar.tsx`

**Modified:**
- `apps/seller/app/[tenantSlug]/mobile/more/earnings/page.tsx` — add
  `usePayrollCommissions({ userId: user?.id })` once at page level (shared
  by `PayCalendar` and the per-card cups totals — don't fetch twice); add
  `view` state (`"config" | "calendar"`) rendering `EarningsViewSwitcher` +
  the selected component; add week/month filter pill state + month-grouping
  logic; add `cupsByPeriod` grouping for the list rows.
- `packages/services/payroll-user-info.ts` — join commission type in
  `getPayrollUserInfo`.
- `packages/features/payroll-user-info/schema.ts` — add `commissionTypeName`,
  `ratePerCup` to `PayrollUserInfoResponse`.
- i18n files — add `earnings.viewConfig`, `earnings.viewCalendar`,
  `earnings.payConfig`, `earnings.noRateConfigured`, `earnings.filterWeek`,
  `earnings.filterMonth` keys (check existing `earnings.*` keys' location,
  likely `apps/seller/lib/i18n/*` or wherever `useT` reads from — match the
  existing pattern for this page, e.g. `earnings.noPeriods`).

---

## Implementation Order

1. **Backend** — extend `getPayrollUserInfo` join + schema fields. Verify
   `GET /api/payroll-user-info` returns `ratePerCup` + `commissionTypeName`
   for a user with a commission type assigned, and `null` for one without.
2. **PayConfigCard** — build + verify against real data (standalone, not yet
   wired into the page).
3. **PayCalendar** — build month grid, wire worked-day dots from
   `commissions` (passed in as a prop from the page-level
   `usePayrollCommissions` call), wire prev/next month arrows, wire
   week-number column, wire tap-to-period-detail.
4. **EarningsViewSwitcher** — build the pill switcher (visual port of
   `PillSwitcher.tsx` using buttons + local state instead of `Link`s).
5. **Page wiring** — add `usePayrollCommissions({ userId })` at the page
   level, `view` state rendering switcher + selected component, `cupsByPeriod`
   grouping for per-row totals, week/month filter pill state +
   month-grouping for the list.
6. **Verify on a real phone-sized viewport** — confirm the switcher + list
   layout doesn't fight the page's own scroll container (see Open Question
   1 below — this matters more now than the old fixed-split draft did,
   since the top section's height is no longer constant).

---

## Open Questions

1. **Parent height constraint** — `FeedbackHistory.tsx` assumes its parent
   gives it `h-full` (it does `flex flex-col h-full`). Confirm
   `more/earnings/page.tsx`'s layout ancestor (`more/layout.tsx`?) provides a
   bounded height the same way, otherwise `flex-1 overflow-y-auto` on the
   list won't actually scroll-contain and the whole page will scroll instead
   (acceptable fallback, but worth confirming which behavior is intended).
2. **Commission type rename mid-history** — if a tenant renames a commission
   type, the card shows the *current* name (not snapshotted), since this is
   live config display, not a historical record. Confirmed fine for this
   use case (transparency about *current* pay, not historical).
3. **i18n key locations** — need to confirm where `earnings.*` translation
   strings currently live before adding new keys (not located in this pass).
4. **Period/payout status logic is not finalized — deferred, not part of
   this task.** There are currently two different ways a period's earnings
   number gets computed depending on whether a `payout` row exists yet, and
   it's not clear that's the right model. Mentioned concept: when a store
   closes, the day's commissions should probably move the period into some
   "submitted"/"in progress" state automatically, rather than the period
   only getting real numbers once an admin manually triggers a payout
   snapshot. Earnings *and* claims backend logic both need a real pass
   together — explicitly out of scope for tonight. This task only builds
   the UI shell (switcher, card, calendar, list totals) against whatever
   data currently exists; revisit the underlying calculation/status model
   in a follow-up task once both flows are sat down and finalized.
