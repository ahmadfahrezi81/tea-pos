# Task 019 — Payroll Claims: Logic & FE Fixes

## Context

Task 018 built the core payroll claims system. This task fixes logic bugs and UX
regressions discovered during review before merging to master.

---

## Items by Priority

### P0 — Correctness bugs

#### 019-A · Seller: restore `amount > 0` in claim form validation
**File:** `apps/seller/app/[tenantSlug]/mobile/more/reimbursements/add/page.tsx`

The unstaged diff removed `amount > 0` from `isValid`. A claim type with `amount = 0`
(default in migration) can now be submitted silently.

Fix: `isValid = !!selectedTypeId && amount > 0 && (!isWeekly || claimableDates.includes(effectiveDate))`

---

#### 019-B · Backoffice: `upsertPayout` recalculates on re-load
**File:** `packages/services/payroll.ts` — `upsertPayout()`

Currently returns the existing row immediately without recalculating:
```ts
if (existing) return toCamelKeys(existing);
```

This means `claims_total` / `commissions_total` / `total_pay` in the DB are frozen
at the moment "Load Payout" was first clicked. If admin approves claims after that,
the stored totals are wrong. The admin period staff list and pay overview read these
stored totals directly.

Fix: when a row already exists, recompute totals and UPDATE the row before returning.
Only skip recalculation if `status === 'paid'` (already settled — don't mutate).

---

### P1 — UX regressions / missing information

#### 019-C · Seller: non-weekly date shown as read-only field
**File:** `apps/seller/app/[tenantSlug]/mobile/more/reimbursements/add/page.tsx`

The unstaged diff removes the date field entirely for non-weekly claims. Staff
submit without seeing what date is recorded. Should show a read-only date display
(same style as Amount — gray box) for monthly and one_time, so at minimum they
can see "today" is being used.

---

#### 019-D · Seller + Backoffice: show pending claims on payslip
**Files:**
- `apps/seller/app/[tenantSlug]/mobile/more/earnings/[periodId]/page.tsx`
- `apps/backoffice/app/[tenantSlug]/mobile/pay/periods/[periodId]/[userId]/page.tsx`

Both payslips filter `approvedClaims` and silently drop pending/rejected ones. Staff
submit a claim and it vanishes from their pay view until approved. Admin has no
visibility either.

Fix: render a second section below approved claims showing pending claims greyed out
with a "Pending" badge. Rejected claims can stay hidden. Keep the TOTAL line to only
count approved/paid.

Service already returns all claims (`getPayslip` fetches without status filter).
No backend change needed.

---

#### 019-E · Backoffice: warn before "Load Payout" if pending claims exist
**File:** `apps/backoffice/app/[tenantSlug]/mobile/pay/periods/[periodId]/[userId]/page.tsx`

When admin clicks "Load Payout", any pending (unreviewed) claims won't be in the
snapshot. There is no warning. Admin can snapshot too early and miss entitlements.

Fix: before calling `upsertPayout`, check if `claims` (from payslip data already
loaded on the page) has any `status === 'pending'` entries. If so, show an inline
warning: "N claim(s) still pending review. Approve them first, or load anyway."
Two buttons: "Go back" / "Load anyway".

---

#### 019-F · Seller: better empty state on claim add form
**File:** `apps/seller/app/[tenantSlug]/mobile/more/reimbursements/add/page.tsx`

When `typeOptions.length === 0`, the form shows:
> "No claimable types available for this period."

This message is used for two different situations:
1. User has no eligibility at all
2. User is eligible but has already claimed all types for this period

Fix: distinguish the two cases.
- If `types.length === 0` (no eligible types at all): "You have no claim entitlements set up. Contact your manager."
- If `types.length > 0` but `typeOptions.length === 0` (all already claimed): "All your entitlements for this period have already been submitted."

---

### P2 — Polish

#### 019-G · Seller: "Claimed" label for one_time types is misleading
**File:** `apps/seller/app/[tenantSlug]/mobile/more/reimbursements/page.tsx`

`claimable: false` for a `one_time` type means it was claimed at some point (possibly
months ago). Showing "Claimed" with a green CheckCircle implies it was done this
period. Change the label to "Used" for one_time frequency when `!claimable`.

---

#### 019-H · DB migration: unique index for monthly claims
**Migration:** `supabase/migrations/`

Monthly claim deduplication is only enforced in application code (`payroll-claims.ts:82`).
A concurrent request can bypass it.

Add a partial unique index:
```sql
CREATE UNIQUE INDEX payroll_claims_monthly_unique
  ON payroll_claims (tenant_id, user_id, claim_type_id, date_trunc('month', date::date))
  WHERE status != 'rejected' AND frequency = 'monthly';
```

Note: `date` column is `text` (YYYY-MM-DD), so cast to `::date` first.
Run `supabase migration new add_monthly_claims_unique_index` to generate the file.

---

## Order of Execution

1. 019-A (seller validation — 2 lines)
2. 019-B (upsert payout recalc — service layer)
3. 019-C (non-weekly date display — seller form)
4. 019-D (pending claims on payslip — both apps)
5. 019-E (load payout warning — backoffice)
6. 019-F (empty state copy — seller)
7. 019-G (one_time label — seller)
8. 019-H (monthly DB index — migration)
