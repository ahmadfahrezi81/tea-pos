# Task 025 — Payroll Status Simplification, Day-by-Day Review, Auto Claims

## Context

Voice-feedback session on 2026-06-16 going through the payroll system before
the prod push. Conclusion: the status model across `payroll_periods`,
`payroll_payouts`, `payroll_commissions`, and `payroll_claims` had grown
several different shapes of "is this done yet," and — found partway through
this design — claims/commissions were being marked `"paid"` individually,
which was a mistake: **`paid` is a payout-wide concept** (money moves once
per user per week), not something that happens per line item. This task
unifies the status model around that correction, adds day-by-day leaf-level
review power, fixes one real bug found during the audit, and folds in the
still-unbuilt "auto claims" feature (task 020) updated to match.

**Housekeeping:** Task 019 (`019_payroll-claims-fixes.md`) was audited
line-by-line against current code — every item (A through H) is already
implemented. **019 is fully resolved, no carryover work.** Task 020
(`020_auto_claims.md`) is *not* implemented yet — its design is sound but
superseded by this task's Part 3.

---

## Summary (read this first, skip the detail sections unless implementing)

**The core fix:** commissions and claims were being marked `"paid"`
individually. That's wrong — `paid` should only ever happen once, on the
weekly payout, not on every line item. New rule everywhere: a commission
or claim goes `pending → approved` or `pending → rejected` (admin decides),
and only the payout itself ever becomes `paid`.

**Backoffice review becomes a drill-down:** tap a week → pick a staff
member → see their week (each day as a row, with a running total) → tap a
day → approve or reject each store's earnings and each claim for that day,
one at a time. **The "Pay" button only appears once every day's items have
been decided** — nothing left sitting undecided. This replaces today's
single "Approve / On Hold / Pay" buttons that act on the whole week at
once, and replaces the separate tenant-wide Claims screen entirely (it
gets folded into this same day-by-day flow).

**Auto claims (new):** some claim types (e.g. meal allowances) no longer
need staff to submit anything — the system creates and decides them itself
the moment the store closes for the day, based on hours worked. No manual
submission, no nightly job.

**Also included:** one real bug fix (a duplicate database query), a way
for admin to double-check a commission against the actual daily-summary
and session data it was computed from (instead of trusting the number
blindly — same way we manually checked it with SQL earlier tonight), and
cleanup of a few now-dead buttons/columns/translation keys.

**This went through three rounds of review before landing here**: a first
pass caught a missing screen, a second adversarial pass surfaced real
issues (a race condition, a silent-misconfiguration landmine, a hidden
dependency in existing code), all fixed below. Nothing in the detailed
sections is a first draft.

---

## Part 1 — Unify status model

### Target shape

| Table | Field | Before | After |
|---|---|---|---|
| `payroll_periods` | ~~`status`~~ | `pending/approved/on_hold/paid` | **dropped** — replaced by `closed_at` (nullable timestamp) |
| `payroll_payouts` | `status` | `pending/approved/on_hold/paid` | `pending \| paid` — **the only table where `paid` exists** |
| `payroll_commissions` | `status` | `draft/approved/paid` | `pending \| approved \| rejected` — no `paid` |
| `payroll_claims` | `status` | `pending/approved/rejected/paid` | `pending \| approved \| rejected` — no `paid` |

### Rationale

- **Leaf-level lifecycle is `pending → approved` or `pending → rejected`.**
  `pending` is the real default/unreviewed state — distinct from
  `approved`, which only happens when admin explicitly confirms a row.
  `rejected` excludes it. Neither commission rows nor claim rows are ever
  marked `paid` directly — that was the bug being fixed.
- **`paid` lives only on `payroll_payouts`.** Money moves once per user per
  period. The payout's `commissionsTotal`/`claimsTotal` are computed by
  summing only `approved` leaf rows (never `pending`, never `rejected`).
  Marking the payout `paid` doesn't touch the leaf rows at all — they stay
  `approved`/`rejected` permanently as the audit trail of what was decided.
- **This makes "Pay" gating free, no extra field needed.** Earlier in this
  design we hit a real wall: if leaf rows only had `pending/paid`, there
  was no way to tell "reviewed and accepted" apart from "never looked at,"
  since both were just `pending`. Bringing back `approved` as a *real*
  third state (distinct from `pending`) resolves this cleanly — gating
  "show Pay once everything's decided" becomes `count(status = 'pending') === 0`
  for that user+period. No `reviewed_at` timestamp, no extra metadata.
- **`payroll_periods.status` still isn't a real workflow** — its only
  actual usage (`payroll-claims.ts:36`) gates "can staff still submit
  claims into this period," a binary time-based fact, same as
  `closed_at`/`ended_at` already used on `store_daily_summaries` and
  `store_sessions` elsewhere in the schema. No enum needed, unchanged from
  the original design.

### DB migration

Run `supabase migration new payroll_status_simplification` and include:

```sql
-- periods: drop status, add closed_at
alter table payroll_periods add column closed_at timestamptz;
alter table payroll_periods drop column status;

-- payouts: collapse approved/on_hold -> pending (no paid rows exist yet per 2026-06-16 check)
update payroll_payouts set status = 'pending' where status in ('approved', 'on_hold');

-- commissions: collapse draft -> pending; 'approved' already matches, no change.
-- any 'paid' rows (none exist per the live close-day test run earlier) -> approved,
-- since 'paid' is no longer valid at this level.
update payroll_commissions set status = 'pending' where status = 'draft';
update payroll_commissions set status = 'approved' where status = 'paid';
-- CRITICAL: the column default is currently 'draft' (confirms why Insert.status
-- is optional in types.ts) — without changing this, every commission created
-- after this migration would still default to 'draft', a value the app no
-- longer recognizes. Must fix the default, not just historical rows:
alter table payroll_commissions alter column status set default 'pending';

-- claims: 'approved'/'pending'/'rejected' already match. Any 'paid' rows -> approved.
update payroll_claims set status = 'approved' where status = 'paid';

-- claims: drop now-dead columns. These were only ever written by
-- markPayrollClaimPaid() (deleted in this task) and confirmed via grep
-- that nothing reads them in any UI. Note these are separate from
-- payroll_payouts' own paid_at/paid_by/payment_proof_url columns, which
-- stay — only the claim-level copies are dead.
alter table payroll_claims drop column paid_at;
alter table payroll_claims drop column paid_by;
alter table payroll_claims drop column payment_proof_url;
```

No CHECK constraints currently enforce these enums at the DB level (confirm
via `\d payroll_payouts` etc. before writing — if any exist, drop + recreate
scoped to the new value sets).

### Service layer changes

- `packages/services/payroll.ts`
  - `getOrCreatePayrollPeriod()` — drop `status: "pending"` from the insert; remove status from the returned shape, add `closedAt`.
  - `upsertPayout()` — **fix the commissions total**: currently sums *all* commissions for the period+user with no status filter. Change to `.eq("status", "approved")`, matching how claims are already filtered. **Also fix the race condition**: this function currently does select-existing → then insert-or-update, with no DB-level uniqueness backing it. Since Part 2 now calls this on every view of the week-summary screen (2B) rather than behind one explicit "Load Payout" click, the odds of two concurrent calls (double-tap, two admins on the same user) creating duplicate payout rows go up. Convert to a real `upsert(payload, { onConflict: "tenant_id,payroll_period_id,user_id" })`, same pattern `getOrCreatePayrollPeriod()` already uses. **Confirmed via migration grep: no such unique constraint exists today** — it must be added as part of this migration:
    ```sql
    alter table payroll_payouts
      add constraint payroll_payouts_tenant_period_user_key
      unique (tenant_id, payroll_period_id, user_id);
    ```
  - `updatePayoutStatus()` — narrow accepted status to `"paid"` only. **Remove the cascade entirely** (current lines 354-363, which mark approved claims `"paid"` on payout-paid — this was exactly the bug). Marking a payout paid never touches leaf rows. **Add a server-side guard**: before allowing the `"paid"` transition, query for any `pending` commission or claim in this period+user and throw a 422 if any exist. The "Pay button is hidden until nothing's pending" rule in Part 2 is a UI nicety on top of this — without the server-side check it's bypassable (stale UI, race condition, or a direct API call). There's a small TOCTOU window between this check and the write (another row could change state in between) — accepted as-is given this is a human clicking one button once, not concurrent automated traffic; not worth wrapping in a transaction for this usage pattern.
  - `updatePayrollCommission()` — the leaf-level decision endpoint. Accepts `"pending" | "approved" | "rejected"` (full three-way, not just reject). **Required, not optional**: refuse the update (422) if a `paid` payout already exists for this row's period+user — once money's moved, the audit trail of what was decided is locked. Same guard on `updatePayrollClaimStatus()` below.
  - `updatePayrollPeriod()` — **delete entirely. Verified via grep: zero call sites of `updatePeriodStatus` anywhere in `apps/**/*.tsx`.** Safe to remove, no further audit needed.
  - **Bug fix found during audit:** `createPayrollCommissions()` (lines 115-130) calls `getPayrollUserInfo()` which already returns `info.ratePerCup`, then ignores it and fires a redundant second query to re-fetch the same `rate_per_cup` from `payroll_commission_types`. Delete the second query, use `info.ratePerCup ?? 0` directly.
- `packages/services/payroll-claims.ts`
  - `createPayrollClaim()` line 36-39 — change `periodStatus === "approved" || periodStatus === "paid"` to `if (period.closedAt) throw ...`.
  - `updatePayrollClaimStatus()` — accepts `"pending" | "approved" | "rejected"` (drop `"paid"` entirely — paid never happens at claim level anymore). Same immutability-after-payment guard as `updatePayrollCommission()` above — required, not optional.
  - `markPayrollClaimPaid()` — **delete this function entirely.** Its whole purpose (marking an individual claim paid) no longer exists.
  - `getPayslip()`'s `claimsTotal` filter (`packages/services/payroll.ts:433-435`, computed inline, not in payroll-claims.ts) — simplify from `status === "approved" || status === "paid"` to just `status === "approved"`.
- `packages/features/payroll/schema.ts` — update status consts; drop `status` from `PayrollPeriodResponse`, add `closedAt`; `PayrollCommissionResponse.status` becomes `pending|approved|rejected`.
- `packages/features/payroll-claims/schema.ts` — claim status enum becomes `pending|approved|rejected` (drop `paid`).

### UI changes (status-display surfaces)

- **Seller** `earnings/page.tsx` / `earnings/[periodId]/page.tsx` — payout-level `STATUS_STYLE`/`STATUS_PILL` stay `pending|paid` only (unaffected by this — payout status is unchanged). Unused translation keys (`statusReady`, `statusReview`, `statusReadyLong`, `statusReviewLong`) get removed.
- **Seller** `reimbursements/page.tsx` — individual claim status badges drop the `paid` branch (claims never reach paid now) and drop `approved`'s old "Claimed"-style wording if any — becomes pending/approved/rejected. `claims.statusPaid` translation key becomes unused for this screen (the *payout's* "you got paid" status is shown elsewhere, on the earnings page, unaffected).
- **Backoffice** — covered in Part 2 below.

---

## Part 2 — Backoffice: Week → User → Day → checkboxes, with gated Pay

**Confirmed navigation order (2026-06-16):** tap a week → pick a staff
member → see that user's days for the week (with a Pay button gated on
zero `pending` rows remaining) → tap a day → see store/claim
decision rows for that specific day.

### 2A — Period page: staff list (mostly unchanged)

`apps/backoffice/app/[tenantSlug]/mobile/pay/periods/[periodId]/page.tsx`
stays a staff list, same as today. Just clean up the payout-status badge
map (`STATUS_STYLE`/`STATUS_LABEL`, lines 11-23) — drop `approved`/`on_hold`
entries, keep `pending`/`paid` (payout status is unaffected by the leaf
changes). Tapping a user goes to 2B.

### 2B — User's week summary (NEW content at the existing route)

`apps/backoffice/app/[tenantSlug]/mobile/pay/periods/[periodId]/[userId]/page.tsx`
becomes the week-summary + Pay screen:

- Lists each day in the period for this user as a row: date, subtotal (sum
  of `approved` commission gross-pay + `approved` claim amounts for that
  day), and a small count of how many rows on that day are still `pending`.
  Tapping a day goes to 2C.
- Header shows the running total (`commissionsTotal + claimsTotal`, both
  `approved`-only sums, live-computed via `getPayslip`/`upsertPayout` —
  no manual "Load Payout" snapshot step needed, compute on every view).
- **Pay button is hidden/disabled while any commission or claim for this
  user in this period is still `pending`.** Once the pending count across
  every day is zero (everything's explicitly `approved` or `rejected`),
  the button appears. Tapping it opens the existing `PaySheet`
  proof-upload flow; confirming calls `upsertPayout()` (recompute from
  approved-only rows) then `updatePayoutStatus(payoutId, { status: "paid", paymentProofUrl })`.
  **No cascade to leaf rows** — they stay `approved`/`rejected` forever as
  the historical record of what was decided.

### 2C — Day decision screen (NEW route)

New route: `.../periods/[periodId]/[userId]/day/[date]/page.tsx`.

Two sections, each row gets a **three-way control** (not a checkbox —
there are three real states now): small Approve/Reject buttons per row,
row highlights green if `approved`, red/struck-through if `rejected`,
neutral if still `pending`.

1. **Per store** — one row per `payroll_commissions` row for this
   user+date (more than one if they worked multiple stores that day),
   showing store name, cup count, gross pay. Calls
   `updatePayrollCommission(id, { status })`.
2. **Claims for this day** — every `payroll_claims` row with this exact
   `date` for this user, showing claim type + amount. Calls
   `updatePayrollClaimStatus(id, { status })`.

**Verification panel** (cross-check against source data, not the computed
snapshot): since each commission row was computed *from* a specific
`daily_summary` + `store_sessions`, let admin pull up that source data
in-screen — same instinct that drove the manual SQL verification earlier
in this conversation, now built into the UI. Backoffice has no
`/api/summaries` or `/api/sessions` routes today (only `/api/payroll/*`
exists) — add thin wrappers over the existing services, same layered
pattern (service → route → client → hook → component):
- `GET /api/summaries?storeId=&date=` — note `listSummaries`
  (`packages/services/summaries.ts`) currently only filters by **month**
  (`ListDailySummariesQuery.month`), not exact date — add a `date` option
  or filter client-side from the month result.
- `GET /api/sessions?dailySummaryId=` — the actual session rows (user,
  store, started_at/ended_at) backing this commission.

Render as a collapsible "Verify" panel per store-commission row.

No Pay button on this screen — pure per-day line-item decision, informational
subtotal only.

### 2D — Remove the tenant-wide claims screen

`apps/backoffice/app/[tenantSlug]/mobile/pay/claims/page.tsx` is fully
superseded by 2C — delete the route, and remove its `MenuRow` entry
("Claims") from `apps/backoffice/.../pay/page.tsx:67`.

### 2E — Misc status cleanup

- `apps/backoffice/.../pay/page.tsx:29` — `pendingCount = payouts.filter(p => ["pending", "approved"].includes(p.status))` → `payouts.filter(p => p.status === "pending")` (payout never reaches `"approved"` anymore).
- `apps/backoffice/.../pay/periods/page.tsx:10-22` — dead `STATUS_STYLE`/`STATUS_LABEL` consts for periods (defined, never rendered) — delete.
- `ListPayrollPeriodsQuery.status` — confirmed dead via grep (`usePayrollPeriods()` never called with a status argument anywhere) — delete the query field and the `if (status)` branch in `listPayrollPeriods()`.

### 2F — Seller-side payslip receipt: interleave claims per day

`apps/seller/app/[tenantSlug]/mobile/more/earnings/[periodId]/page.tsx`
currently renders commissions day-by-day (already split per store from
earlier in this session) but claims in one separate `CLAIMS` block at the
bottom. Move claims into the same day-by-day loop — each day's block shows
that day's store-commission rows *and* any claims dated that day together,
combined grand total staying at the bottom. Group claims by `date`
(parallel to the existing `commissionsByDate` grouping) and render both
within each day's iteration. This screen stays **read-only** for staff —
they see the approved/pending/rejected decision, no action buttons (reject
is an admin-only action, happens in 2C).

**Auto-rejected claims need an explanation, not just a badge.** A staff
member seeing a claim labeled `rejected` that they never manually submitted
(an auto claim type, rejected because they didn't meet the hour threshold)
will be confused without context. Show the reason inline for auto-source
rejected claims — e.g. "Lunch Allowance — needed 4h, worked 2.5h" — pulling
`auto_threshold_hours` from the claim type and the day's actual worked
hours (already computed once by `createAutoClaimsForDailySummary`; either
store it on the claim row at creation time for easy display, or recompute
from sessions on render).

---

## Part 3 — Auto claims (close-day triggered, no cron)

Task 020's design used a two-step lifecycle: create a `pending` claim the
moment a session starts, then settle it via a midnight cron job. **Drop
that entirely.** Auto claims are computed at the same trigger point as
commissions: when the day closes. No cron, no pre-creation at session-open
time, no separate settlement step.

### What carries over from 020 unchanged

- Add `daily` to `payroll_claim_types.frequency` (full set: `daily | weekly | monthly | one_time`), with the index fixes from 020:
  ```sql
  drop index payroll_claims_weekly_unique;
  create unique index payroll_claims_weekly_unique
    on payroll_claims (tenant_id, user_id, claim_type_id, payroll_period_id)
    where status != 'rejected' and frequency = 'weekly';

  create unique index payroll_claims_daily_unique
    on payroll_claims (tenant_id, user_id, claim_type_id, date)
    where status != 'rejected' and frequency = 'daily';
  ```
- Add `claim_source text not null default 'manual'` and `auto_threshold_hours integer` (nullable) to `payroll_claim_types`.
- Backoffice claim-type UI: frequency dropdown, `claim_source` toggle, `auto_threshold_hours` field shown only when `auto`.
- Seller add-claim form: `getClaimableTypes()` filters to `claim_source = 'manual'` only.
- Entitlements list: auto types show an "Auto" badge instead of a submit action.

### Trigger point and lifecycle

Same place `createPayrollCommissions()` is called from —
`PUT /api/summaries` (`apps/seller/app/api/summaries/route.ts:68-78`), when
`closedAt` is set. Add a sibling call:

```ts
if (body.data.closedAt) {
    const s = summary as { id: string; storeId: string; date: string };
    await endSessionsForSummary(supabase, { tenantId, dailySummaryId: s.id });
    createPayrollCommissions(supabase, { tenantId, storeId: s.storeId, dailySummaryId: s.id, date: s.date, triggeredByUserId: user.id })
        .catch((e) => console.error("[payroll] createPayrollCommissions failed:", e));
    createAutoClaimsForDailySummary(supabase, { tenantId, storeId: s.storeId, dailySummaryId: s.id, date: s.date, triggeredByUserId: user.id })
        .catch((e) => console.error("[payroll] createAutoClaimsForDailySummary failed:", e));
}
```

New function in `packages/services/payroll-claims.ts`:
`createAutoClaimsForDailySummary(supabase, { tenantId, storeId, dailySummaryId, date, triggeredByUserId })`:

0. **Idempotency needs a real DB constraint, not just an application-level
   check-then-act guard** (a plain "does it exist yet" query has the same
   theoretical race a concurrent retry could slip through — checking first
   doesn't make it atomic). Add a dedicated column and a status-agnostic
   unique index, since `payroll_claims_daily_unique` deliberately excludes
   `rejected` rows (so manual claims can be resubmitted after rejection)
   and would NOT catch a duplicate `rejected` auto-claim from a retried
   close-day:
   ```sql
   alter table payroll_claims add column daily_summary_id uuid references store_daily_summaries(id);
   create unique index payroll_claims_auto_daily_summary_unique
     on payroll_claims (daily_summary_id, user_id, claim_type_id)
     where daily_summary_id is not null;
   ```
   `createAutoClaimsForDailySummary()` sets `daily_summary_id` on every row
   it inserts; manual claims leave it `null`. Insert and let the unique
   index reject true duplicates (catch the constraint-violation error and
   treat as "already created," same as how `getOrCreatePayrollPeriod()`
   already handles its own conflict) rather than relying on a pre-check.
1. Fetch `store_sessions` for `dailySummaryId`, group by `user_id`.
2. For each user, sum `(ended_at ?? now) - started_at` across their sessions that day → `totalHours`.
3. Resolve `period` via `getOrCreatePayrollPeriod()`.
4. Fetch this user's `auto` claim types via `payroll_claim_eligibility` join `payroll_claim_types` where `claim_source = 'auto'`.
5. For each eligible auto type:
   - **Guard against a missing threshold first**: if `auto_threshold_hours`
     is `null` (misconfigured type), skip this type entirely and log a
     warning — do NOT fall through to the comparison below.
     In JS, `totalHours >= null` evaluates `totalHours >= 0`, which is
     true for any non-negative hour count — meaning a misconfigured auto
     type with no threshold would silently auto-approve every claim
     regardless of hours worked. Consider also adding a DB constraint:
     `CHECK (claim_source != 'auto' OR auto_threshold_hours IS NOT NULL)`.
   - Otherwise insert a claim with:
     **`status = totalHours >= auto_threshold_hours ? "approved" : "rejected"`.**
     **Also store `hours_worked = totalHours` on the row** (new nullable
     numeric column on `payroll_claims`, set only for auto claims) — this
     is the decided value behind 2F's "needed 4h, worked 2.5h" explanation
     for staff. Storing it at creation time avoids recomputing from
     sessions on every payslip render (which would be an N+1 query inside
     a day-by-day loop); the threshold itself doesn't need duplicating,
     it's already reachable via the existing `claim_type_id` join.
     Auto claims skip `pending` entirely — the system is the one deciding
     (that's the whole point of "auto"), so there's no admin-review step
     for them, unlike manual claims which always start `pending`.

### What's removed from 020's original design

- `POST /api/cron/claims/settle` route, the cron schedule, `createAutoClaimsForSession()` and its three call sites (`/api/sessions`, `/resume`, `/transfer`), and `settleAutoClaimsForDate()` — none needed. Auto claims are computed once, after close, from the day's total hours — not per-session, not on a timer.

---

## Part 4 — Minor cleanup (optional, do if time allows)

- `payroll_claim_eligibility.removed_at` soft-delete → hard `delete`
  instead. The "claims snapshot their own data" reasoning holds for
  `payroll_claims` itself, but **this is not a one-line change** —
  verified via grep that `setUserClaimEligibility()`
  (`packages/services/payroll-claim-types.ts:71-106`) has a
  revoke-then-**reactivate** dance that explicitly depends on soft-deleted
  rows surviving: when re-adding a previously-revoked type, it finds the
  row where `removed_at !== null` and clears `removed_at` rather than
  inserting a new row. Switching to hard-delete means this function must
  be rewritten too (drop the reactivate branch entirely — revoke = delete,
  re-add = plain insert). Do this as one combined change, not a
  find-and-replace on `removed_at`.

---

## Order of execution

1. Part 1 — DB migration + service layer status unification (foundation everything else builds on)
2. Part 2 — Backoffice week→user→day review flow + gated Pay (depends on Part 1's three-way leaf status)
3. Part 3 — Auto claims (depends on Part 1's approved/rejected leaf model)
4. Part 4 — Eligibility hard-delete (independent, lowest priority)
