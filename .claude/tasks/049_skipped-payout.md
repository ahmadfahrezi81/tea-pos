# Task 049 — A payout that closes without a transfer, and a Pay button that waits

**Status: agreed 2026-08-17, being written. Migration written but NOT pushed —
the owner deploys it by hand.**

Two changes to the backoffice pay flow, one schema value between them.

---

## 1. `skipped`

`payroll_payouts.status` gains a third value alongside `pending` and `paid`. It
means: this period is finished and no money moved. The case it exists for is a
staff member whose commissions were all rejected, or who simply earned nothing
in the window — today those payouts sit at `pending` forever, because the only
way out of `pending` is a transfer with a screenshot attached.

`skipped` is a terminal state, exactly like `paid`:

- `upsertPayout` early-returns rather than recomputing totals.
- Approving or rejecting a commission or claim afterwards is refused.
- `paid_at` and `paid_by` are still written. Who closed the period and when is
  worth as much as who paid it.

### Decisions that will not be visible in the diff

**The zero-total gate is UI only.** The Skip face of the confirm screen appears
when `totalPay === 0`, and that is a rendering decision. The API accepts a skip
at any amount. Deliberate: the backend has no business deciding that a
zero-total payout is the only kind a human may close, and a server-side equality
check on money invites a rounding argument nobody wants to have at 11pm.

**Rejecting everything is a legitimate route to zero.** A period where every
commission was rejected reads as zero-total and offers Skip, same as a period
with no work in it. That is the point, not an edge case.

**Reversal is a database job, not a screen.** Once `skipped`, the payout does
not reopen if a backdated claim is later approved. Operationally this is not
expected to happen; if it does, it is rare enough to fix by hand and too rare to
justify a reopen path that would also have to exist for `paid`.

**The list folds `skipped` under the "paid" filter.** Two chips, not three: the
question the filter answers is "is this period done with", and both values say
yes. The pill on the payslip still distinguishes them.

### Migration

`check (status in ('pending','paid','skipped'))` on `payroll_payouts`.

Note that the column has had **no** CHECK constraint since
`20260616161812_payroll_status_simplification.sql`, which dropped the legacy one
and never re-added it. So the new value would work without any migration at all.
The migration is here to put the constraint back with the correct set, not
because the code needs it.

---

## 2. The Pay button waits for the period to end

Pay could be pressed on day one of a period. Nothing stopped an early transfer
against half a window of work.

The button is now disabled until the period is over, and says how long is left —
"3 days left" — rather than going quiet and unexplained.

**Unlock is `endDate` itself — the Sunday — at 00:00 local (+7), not the Monday
that `getExpectedPayoutDate` returns.** The owner pays when the last store
closes, around 23:00 Sunday. Locking until Monday would block the hour the work
actually happens. One day before the anchor is the rule; the anchor stays where
it is for the "Expected payout" row.

Skip obeys the same gate. A period with nothing owed is still a period, and
closing it early is the same mistake as paying early.

---

## 3. Confirm sheets on both

Neither Pay nor Skip had a confirmation — `Confirm Payment` fired the upload and
the status write directly. Both now open the app's confirm sheet first.

`FormFooter` already owns that sheet, but its note text and icon were hardcoded
for payroll-configuration screens ("Payroll already recorded stays as it is…",
floppy disk). Both become props with the current values as defaults, so the
config screens keep their sheet unchanged and the pay screens get their own copy.

---

## 4. The back button could not reach home after a reload

Found while checking the pay flow, fixed here because the pay screens are where
it bites hardest.

`MobileShell` counts the history entries it pushed in `pushDepthRef` and unwinds
with `router.back()` while that count is above zero. The counter is memory; the
history is not. Any reload — the update sheet's, the idle sheet's
`location.reload()`, a manual one — leaves the counter at zero with real entries
still behind the page.

Back then **pushed** the parent. The system back button popped straight back to
where it started, header-back pushed again, and the two took turns forever
without ever reaching a root tab. This is the loop reported on the seller's My
Pay screens after leaving the app in the background.

The fallback now *replaces* instead of pushing, so it walks up the route tree in
place and history can only shrink. The warm path — counter above zero — is
untouched.

A persisted counter (sessionStorage) was considered and rejected. After a reload
the previous screen's client state is gone anyway, scroll restoration is keyed by
pathname and survives either way, so persistence would buy a history pop instead
of a route push and nothing the user can feel.

### And a settled payout could be settled twice

The confirm screen pushed the payslip on success, leaving itself in history. Back
landed on a confirm form for a payout that was already paid, and neither the
screen nor `updatePayoutStatus` checked. A second confirm would have overwritten
`paid_at`, `paid_by` and the transfer proof.

Three changes: the screen replaces rather than pushes (`navigation.replace`, new,
registered by both apps from the shell), the screen renders a dead end for a
settled payout, and the service refuses one with a 422.

---

## Reach

Backoffice payslip, its `/pay` route, and the payouts list. Seller's
`more/earnings` screens render the status too and need the "Skipped" label in
`en` and `id`. `packages/shell` and `packages/utils/navigation.ts` carry the
back-button fix, so both apps get it. Both apps get a version bump.

**Not verified from here:** the loop fix needs a device pass — go deep, force a
reload (idle sheet or manual), then press back repeatedly and confirm you climb
to a root tab instead of ping-ponging.
