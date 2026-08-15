# Task 047 — Pay frequency moves to the tenant, then bi-weekly → weekly

**Status: step 1 written and building, migration applied. Step 2 pending.**
Opened 2026-08-15.

Step 1 deviation from the plan: **no `/api/tenant-config` endpoint was added.**
The cadence is server-rendered into `PayFrequencyProvider` from each app's mobile
layout, so no client screen fetches it. Add the endpoint when something needs the
value outside that tree.

| | What | When |
|---|---|---|
| **Step 1** | Cadence moves to `tenants`. All logic reads it. Value stays `bi_weekly`. | Whenever it's ready — behaviour is unchanged |
| **Step 2** | Flip the tenant value to `weekly`. | After Sunday's last close, 2026-08-16 → before Monday open |
| **Step 3** | Pay schedule with an anchor + effective date, and the backoffice screen on top of it. | After the dust settles |

Step 1 is inert by design, so it can ship early and be verified in production
against known-correct output. Step 2 is one `UPDATE`, reversible by re-running
it with the old value. Step 3 is the design that makes the screen safe; it is
not needed for the switch itself.

---

## Background — how a pay window is decided

One function: `getPayWindowBounds(dateStr, frequency)` in
`packages/utils/week.ts`. Everything else reads a frequency string and hands it
over.

- `weekly` = ISO Monday–Sunday. Already implemented.
- `bi_weekly` = fixed 14-day block anchored at `2025-01-06`.
- `getExpectedPayoutDate(endDate)` = end date + 1 day.

So the cadence switch is a **data change**, not a code change.

### Everywhere the frequency is read today

| Where | Use |
|---|---|
| `packages/services/payroll.ts:111` | close-day: the window the payout is created for |
| `packages/services/payroll-claims.ts:174,284` | auto-threshold claims, claim listing window |
| `apps/backoffice/.../pay/page.tsx:24`, `pay/payouts/page.tsx:117` | most-common-value scan across staff — period card + next-payout banner |
| `apps/seller/.../earnings/_components/PayConfigCard.tsx:27` | frequency label + next payout date |
| `apps/seller/.../more/reimbursements/page.tsx:31`, `add/page.tsx:33` | which window a claim is filed against |

Six `?? "bi_weekly"` literals plus two most-common-value scans. The scans exist
only because nothing owns the answer — step 1 deletes them.

Not related, do not touch: `packages/services/payroll-claims.ts:74` hardcodes
`"weekly"` for a **claim config's** duplicate check. Claim cadence is a separate
axis.

---

## Step 1 — Move the cadence to the tenant

### Migration

`supabase migration new move_pay_frequency_to_tenant`

Written: `supabase/migrations/20260815165659_move_pay_frequency_to_tenant.sql`

```sql
ALTER TABLE tenants
    ADD COLUMN pay_frequency text NOT NULL DEFAULT 'bi_weekly'
    CHECK (pay_frequency IN ('weekly', 'bi_weekly', 'four_weekly'));

ALTER TABLE payroll_user_info
    ALTER COLUMN pay_frequency DROP NOT NULL;
```

Ships as `bi_weekly` — every window comes out identical to today. Then
`pnpm types:db`.

**The cadence vocabulary changes.** `daily` and `monthly` are both gone:

| Old | New | Why |
|---|---|---|
| `daily` | — | A one-day period isn't whole weeks; nothing uses it |
| `monthly` | `four_weekly` | A calendar month can't end on a Sunday every time, so it can't hand over to weekly without a short period. Four-weekly is the standard payroll term: 13 periods a year, 28 days, always Mon–Sun |

Pre-flight before pushing:

```sql
SELECT DISTINCT pay_frequency FROM payroll_user_info;
```

Anything other than `bi_weekly` needs a decision before the `CHECK` forbids it.

Code that follows from the rename: `getPayWindowBounds` loses its `daily` and
`monthly` branches and gains `four_weekly` (28-day blocks from the same anchor
as `bi_weekly` until step 3 makes the anchor data). `FREQUENCY_LABELS`
(`PayConfigCard.tsx:32`) loses `daily`/`monthly` and gains `four_weekly`, with a
new `earnings.freqFourWeekly` key in both translation files — "Every 4 weeks" /
"Setiap 4 Minggu".

**The old column is kept, not dropped.** Made nullable, left in place, no longer
read. If step 1 has to be rolled back, the previous build finds the column it
expects instead of 500-ing across payroll on a payout weekend. Drop it in a
separate migration a week or two later.

### Backend

- **Resolver** — `getTenantPayFrequency(supabase, tenantId)` in services. Reads
  `tenants.pay_frequency`, validates against the known set, **throws** if the
  read fails or the value is unrecognised. Replaces all six `?? "bi_weekly"`
  literals.
  Call it **once per request, not per user** — `createPayrollCommissions` reads
  the frequency inside its `for (const userId of userIds)` loop
  (`packages/services/payroll.ts:111`), so a naive swap turns one lookup into
  one query per staff member on every close.
- **New endpoint** for client reads: `GET /api/tenant-config` (or extend an
  existing tenant route), returning the cadence. Standard layering — service →
  route → api client → hook.
- **`getPayWindowBounds` throws on an unrecognised frequency** instead of
  falling back to `bi_weekly` (`packages/utils/week.ts:92`). By the time it is
  called the value is validated, so reaching that branch means a cadence was
  added to the `CHECK` and not to the switch — a code bug that should be loud.
- Drop `payFrequency` from `AdminUpdatePayrollUserInfoInput` and
  `PayrollUserInfoResponse` (`packages/features/payroll-user-info/schema.ts`)
  and from `packages/services/payroll-user-info.ts`.

### Frontend

- **Server-render the cadence into a provider.**
  `app/[tenantSlug]/mobile/layout.tsx` is a server component and may query
  Supabase directly (CLAUDE.md exception). Read it there, pass it into a
  provider, and the value is in the first paint — no loading flash, no TTL to
  wait out on flip night. Same in both apps.
- **The frontend never defaults.** No `?? "bi_weekly"`, no constant. If the
  cadence is somehow absent, screens render their loading state rather than a
  confidently wrong date range. Pay tab already has one; check
  `PayConfigCard.tsx` and the two seller reimbursement screens.
- Delete both most-common-value scans.

Translations: `earnings.freqWeekly` and `freqBiWeekly` already exist
(`packages/utils/translations/en.ts:366`, `id.ts:369`). Add
`earnings.freqFourWeekly` and retire `freqDaily` / `freqMonthly` from the
earnings section along with their `FREQUENCY_LABELS` entries.

**Not** cached in a proxy cookie. `x-tenant-id` has a 24h TTL and the proxy
short-circuits the DB lookup while it matches (`apps/seller/proxy.ts:112`), so a
cookie-cached cadence would keep devices on the old calendar for up to a day
after the flip — worst on installed PWAs, which rarely cold-start.

### Verify before step 2

Pay tab still reads `Week 32 · Week 33`, `3–16 Aug`; next-payout banner still
says Mon 17 Aug. Nothing about the UI should change.

---

## Step 2 — Flip to weekly

```sql
UPDATE tenants SET pay_frequency = 'weekly' WHERE pay_frequency = 'bi_weekly';
```

### Timing: after Sunday's last close, before Monday's first open

Two hazards, pulling in opposite directions.

**Too early (before Sunday's closes are done):** a close dated 16 Aug under
`weekly` derives the window `10–16 Aug` and inserts a **new** payout with
`start_date = 2026-08-10`. Payout totals are summed by date range, so that row
re-reports commissions already paid inside the `3–16 Aug` payout. Money shown
twice.

**Too late (a 3–16 Aug payout still unpaid):** `payroll_payouts` is unique on
`(tenant_id, user_id, start_date)` and `upsertPayout`
(`packages/services/payroll.ts:258`) upserts on that key, so it **rewrites
`end_date`** on a row it finds. A weekly window starting `2026-08-03` shares its
start date with the bi-weekly block. If anything back-dated touches early August,
that payout shrinks to 08-09 and the 08-10..08-16 commissions stay stamped with a
payout whose totals no longer include them — money unreachable from any payslip.

So the order is: **pay everyone → last store closes → run the `UPDATE`.** Late
Sunday night or Monday morning before opening; both work.

Two things make that safe:

- **Paid rows are immune.** `upsertPayout` returns early when the existing row is
  `paid` (`packages/services/payroll.ts:275`).
- **2026-08-17 is a clean boundary** — 588 days from the epoch `2025-01-06`,
  exactly 42 blocks. The next window starts that Monday under either cadence, so
  nothing in flight is reshaped.

**If someone can't be paid on Sunday**, handle that row explicitly before running
the `UPDATE` rather than leaving it exposed.

### Verify after

- Pay tab reads `Week 34`, `17–23 Aug`.
- First Monday close creates a payout with `start_date = 2026-08-17`,
  `end_date = 2026-08-23`.
- **No payout exists with `start_date = 2026-08-10`.** That row appearing means
  the flip landed before a Sunday close.

---

## Step 3 — Pay schedule with an anchor, and the screen

Not before the switch. This is what makes a backoffice cadence toggle safe, and
it is much smaller than it first looked.

### The rule that unlocks it: every period is whole weeks, Monday to Sunday

Payout is always Sunday midnight → Monday morning, holidays included — that is
the promise made to staff, and it is absolute. So:

| Cadence | Length |
|---|---|
| `weekly` | 1 week |
| `bi_weekly` | 2 weeks |
| `four_weekly` | 4 weeks — 13 periods a year |

(`daily` and `monthly` are both dropped in step 1 — see the vocabulary table
there.)

Consequence of `four_weekly` to accept knowingly: **13 payouts a year, and the
pay date drifts through the calendar month.** The alternative — 4-or-5 weeks
ending the last Sunday of the month, 12 a year — is more code for a cadence
nobody is asking for yet.

Because every cadence is a whole number of weeks ending on a Sunday, **any
Monday is a legal handoff between any two cadences.** No stub periods, no
alignment search, no "pending change: 1 Feb 2027". This is the whole reason
step 3 is cheap.

### The design

```
pay_schedule: { tenant_id, frequency, effective_from }
```

- `effective_from` is a Monday, and it doubles as the schedule's **anchor** — a
  new schedule always starts its own first period, so no separate anchor column
  is needed.
- A window is still computed by formula, but relative to that anchor rather than
  a hardcoded `2025-01-06`. One rule for every cadence: `weeksPerPeriod`,
  floor-divided from the anchor.
- Changing cadence = **insert a new row** with `effective_from` = the next Monday
  boundary of the current schedule. Nothing is ever mutated.
- "Which cadence applies to date D" = the row with the greatest
  `effective_from ≤ D`.

Seeded with exactly two rows, which reproduce history precisely:

| frequency | effective_from |
|---|---|
| `bi_weekly` | `2025-01-06` (the old epoch) |
| `weekly` | `2026-08-17` (this weekend's switch) |

### What it buys

- **History stays true.** March resolves against the schedule in force in March,
  because that row still exists. This also fixes the bug where recomputing an old
  payout uses today's cadence.
- **Nothing in flight is reshaped**, because a change never edits the active row.
- **The screen's pending date is arithmetic, not a search**: the next boundary
  Monday of the active schedule. "Weekly — starts Mon 5 Oct."
- **No generator, no per-period rows, no idempotency problem.** One row per
  cadence change ever — two rows total after this weekend.
- The epoch constant disappears; the anchor becomes data.

### What it gives up

One-off adjusted periods: "this period ended early", or a pay date shifted off a
holiday. The Monday rule makes both unnecessary. If that ever changes, the next
step is storing each period as its own row (the "chain" idea) — this design is a
clean stepping stone to it, not a detour.

### Why not just store every period

That was the earlier proposal. It needs a seeded row, a generator on close-day, a
unique constraint plus upsert for simultaneous closes, and a decision about
pre-chain dates. The anchor design gets the same guarantees for one table and no
generator, because whole-week periods make the formula safe to keep.

### Also worth doing

Snapshot the frequency onto `payroll_payouts` at creation, the way `rate_per_cup`
is snapshotted onto commissions. A payout should record the cadence it was paid
under.

---

## Knock-on effects — checked

**Claim cadence is unaffected.** `payroll-claims.ts:174,284` read the pay
frequency only to refresh the payout after a claim is written; claim
eligibility and duplicate checks run off `payroll_claim_configs.frequency`,
which is a separate axis. Nobody starts receiving a weekly allowance twice as
often.

**Behaviour change to expect in step 1:** both claim paths currently skip the
payout refresh entirely when a user has no `payroll_user_info` row
(`if (info)` at `payroll-claims.ts:173,282`). Once the cadence comes from the
tenant, that guard has no reason to exist, so those users start getting payout
rows where they previously got none. That is a fix, not a regression — but it
means new payouts can appear for staff who never had them, and it's better to
know that on Monday than to discover it.

**Volume roughly doubles.** Weekly means twice as many payout rows and twice as
many approval passes, and each payout covers half the commissions and claims it
used to. Nothing technical — but the "needs review" count on the Pay tab will
look different, and staff should be told they're now paid every Monday.

---

## Rules this establishes

1. **The cadence is a tenant fact.** One row, one value; nothing per-user.
2. **The backend decides, the frontend displays.** No fallback cadence in client
   code — a missing value is a loading state, never a guess.
3. **Cached copies are display-only.** Close-day, claim creation and
   `upsertPayout` must read the cadence live from the DB inside the same request.
   A stale provider showing last week's dates is cosmetic and fixed by a reload;
   a stale value deciding which window a payout is written into is wrong money.
4. **Every period is whole weeks, Monday to Sunday**, and payout is Sunday
   midnight → Monday morning regardless of holidays.
