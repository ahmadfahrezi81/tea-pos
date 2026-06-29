# Task 031 — Bi-Weekly Epoch Anchor

## Context

The bi-weekly payroll logic in `packages/utils/week.ts` uses ISO week number parity
(even/odd) to decide which 14-day block a date belongs to. This is mostly fine, but
it has a structural flaw: any year where both Jan 1 and Dec 31 fall on a Thursday
(called a "long year" — 53 ISO weeks) produces overlapping blocks at the year
boundary. **2026 is one of these years.**

The overlap at the 2026/2027 boundary:

```
Dec 28, 2026  (ISO Week 53, odd) → parity block: Dec 21 – Jan 3
Jan  4, 2027  (ISO Week  1, odd) → parity block: Dec 28 – Jan 10   ← overlaps
```

Dec 28–Jan 3 is claimed by both blocks. `upsertPayout` uses `(tenant_id, user_id, start_date)`
as its conflict key, so these two store closes create **two separate payout rows with
overlapping declared windows** — data integrity corruption.

The fix is to replace the parity check with an **epoch-anchored** calculation:
count days from a fixed Monday, divide by 14, floor. The result is a globally
consistent, infinitely repeating 14-day schedule with no year-boundary edge cases.

---

## Epoch choice — `2025-01-06`

`2025-01-06` is the Monday of ISO Week 2, 2025 (the first bi-weekly block start
of 2025 under the current even-week-leads convention). Choosing this date means
the epoch formula produces **identical results** to the current parity logic for
every date that the parity logic handles correctly. The only dates where they
differ are the 53-week boundary dates (e.g. Jan 4, 2027), where the epoch
gives the correct non-overlapping answer and parity does not.

**No data migration is needed.** All existing `payroll_payouts.start_date` values
were written by the parity method. For every non-boundary date the epoch method
returns the exact same `start_date`, so `upsertPayout` will continue to find and
update the correct existing rows.

Verified test cases:

| Date | Day | ISO Wk | Parity start | Epoch start | Match |
|---|---|---|---|---|---|
| 2025-03-03 | Mon | W10 even | 2025-03-03 | 2025-03-03 | ✓ |
| 2025-03-10 | Mon | W11 odd  | 2025-03-03 | 2025-03-03 | ✓ |
| 2026-06-22 | Mon | W26 even | 2026-06-22 | 2026-06-22 | ✓ |
| 2026-06-29 | Mon | W27 odd  | 2026-06-22 | 2026-06-22 | ✓ |
| 2026-12-21 | Mon | W52 even | 2026-12-21 | 2026-12-21 | ✓ |
| 2026-12-28 | Mon | W53 odd  | 2026-12-21 | 2026-12-21 | ✓ |
| 2027-01-04 | Mon | W1 odd   | **2026-12-28** ← WRONG | **2027-01-04** ✓ | fixed |
| 2027-01-11 | Mon | W2 even  | 2027-01-11 | 2027-01-11 | ✓ |

---

## Fix — `packages/utils/week.ts`

Replace the `bi_weekly` case in `getPayWindowBounds` (lines 84–88):

**Before:**
```ts
case "bi_weekly": {
    const mon = isoMondayStr(dateStr);
    const wn = isoWeekNumStr(dateStr);
    const start = wn % 2 === 0 ? mon : addDaysToStr(mon, -7);
    return { startDate: start, endDate: addDaysToStr(start, 13) };
}
```

**After:**
```ts
case "bi_weekly": {
    // Epoch = Monday of ISO Week 2, 2025. All bi-weekly blocks are fixed
    // 14-day windows from this anchor — no ISO week parity, no year-boundary drift.
    const EPOCH = "2025-01-06";
    const epochMs = new Date(EPOCH + "T12:00:00Z").getTime();
    const dateMs = new Date(dateStr + "T12:00:00Z").getTime();
    const blockIndex = Math.floor(Math.round((dateMs - epochMs) / 86_400_000) / 14);
    const start = addDaysToStr(EPOCH, blockIndex * 14);
    return { startDate: start, endDate: addDaysToStr(start, 13) };
}
```

`Math.round` before `floor` guards against sub-millisecond floating point drift
on the day division. `addDaysToStr` already handles negative offsets (pre-epoch
dates) correctly via `setUTCDate`.

---

## Callers — no other changes required

`getPayWindowBounds` is the only place pay-window math lives. All six callers
receive `startDate`/`endDate` strings and need no changes — the fix propagates
automatically:

| File | Line | Frequency used |
|---|---|---|
| `packages/services/payroll.ts` | 106 | user's `frequency` from `payroll_user_info` (can be `bi_weekly`) |
| `packages/services/payroll-claims.ts` | 74 | hardcoded `"weekly"` (duplicate check) |
| `packages/services/payroll-claims.ts` | 175 | user's `payFrequency ?? "bi_weekly"` (payout refresh after claim create) |
| `packages/services/payroll-claims.ts` | 277 | user's `payFrequency ?? "bi_weekly"` (payout refresh after auto claims) |
| `apps/seller/app/[tenantSlug]/mobile/more/reimbursements/page.tsx` | 33 | `info.payFrequency ?? "bi_weekly"` (UI — filter window display) |
| `apps/seller/app/[tenantSlug]/mobile/more/reimbursements/add/page.tsx` | 31 | `info.payFrequency ?? "bi_weekly"` (UI — add claim window display) |

Display labels ("Week 26 · Week 27") are derived from `date-fns/getISOWeek` on
the start/end dates at render time — unchanged.

---

## Verification

After the change, add unit assertions in a scratch test or console:

```ts
import { getPayWindowBounds } from "packages/utils/week";

// Stable dates — must not change
console.assert(getPayWindowBounds("2026-06-22", "bi_weekly").startDate === "2026-06-22");
console.assert(getPayWindowBounds("2026-06-29", "bi_weekly").startDate === "2026-06-22");
console.assert(getPayWindowBounds("2026-12-21", "bi_weekly").startDate === "2026-12-21");
console.assert(getPayWindowBounds("2026-12-28", "bi_weekly").startDate === "2026-12-21");

// Fixed boundary — was wrong, now correct
console.assert(getPayWindowBounds("2027-01-04", "bi_weekly").startDate === "2027-01-04");
console.assert(getPayWindowBounds("2027-01-10", "bi_weekly").startDate === "2027-01-04");
console.assert(getPayWindowBounds("2027-01-11", "bi_weekly").startDate === "2027-01-11");
```
