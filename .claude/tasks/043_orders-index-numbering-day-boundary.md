# Task 043 — Orders: index, day boundaries, numbering, void

**Status: planning only. Nothing written, nothing pushed. Do not start coding
until the owner says so.**

Split out of task 041 Phase 3 on 2026-08-08. Phase 3's shipped work — the 25-row
cap, totals read from the summary row, the narrowed select — stays in 041 and is
done. This document holds what Phase 3 left open, plus what three verification
passes over the order path turned up.

The reason for the split is risk, not size. These items touch the **order write
path** — the money path — where a mistake is not a slow page but a wrong number
on a cash reconciliation, found days later in a payslip.

---

## Confidence — read this before acting on anything below

This document was revised three times on 2026-08-08, each pass reading more of
the actual code. Several early claims were wrong and are now corrected. To keep
the reader from having to guess which parts are solid:

**Verified by reading source.** Every code quote, line reference, migration and
column list below was read directly, not inferred. The claims about the midnight
cron, the session guard on order creation, the QRIS webhook's insert,
`updateSummary`'s close recompute, and the eleven `store_orders` read sites are
all quotes.

**Not verified, and not verifiable from the repo.** Anything about live data or
live configuration. Four queries decide how much of this matters, and **all four
should be run before any code is written**:

```sql
-- 1. Did the session-cleanup cron actually get scheduled?
--    (its own migration warns pg_cron may need dashboard enablement first)
SELECT jobname, schedule, active FROM cron.job;

-- 2. What indexes actually exist on the table Item A adds one to?
--    \d store_orders   -- or:
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'store_orders';

-- 3. How many orders never reached a summary, and are they QRIS?
SELECT payment_method, count(*), min(created_at), max(created_at)
FROM store_orders WHERE daily_summary_id IS NULL
GROUP BY payment_method;

-- 4. Does any store have more than one open summary?
SELECT store_id, count(*) FROM store_daily_summaries
WHERE closed_at IS NULL GROUP BY store_id HAVING count(*) > 1;
```

Plus one PostHog check: **which tenants have `feature-qris` enabled.** Query 3
and the flag together decide whether Item B is urgent or theoretical.

---

## Work order

| Order | Item | If it goes wrong in production | Reversible? |
|---|---|---|---|
| 1st | **A** — index on `store_orders` | Nothing; worst case unused disk | Trivially, `DROP INDEX` |
| 1st | **F** — one `appDay` module, half-open ranges | Nothing new; recovers rows currently dropped | Trivially, code-only |
| 2nd | **B** — QRIS orders never reach a summary | Already going wrong; this is the fix | Repair migration needed for history |
| 3rd | **C** — stored `order_number` | Duplicate or skipped receipt numbers; a failed write blocks the till | Clean if the column stays nullable |
| 4th | **E** — void | Voided orders counted in closed totals and payouts | Data damage persists past a code revert |
| done | ~~**D** — delete dead route~~ | Shipped in `6be6283` | — |

**A and F ship together.** Same query, no interaction, no migration for F.

**B is not blocked on a decision.** An earlier revision framed it as an open
business-rule question; that framing was built on a scenario that cannot occur.
What remains is a webhook that does half its job. It needs the flag's reach
established, not a decision.

**C precedes E.** Void is what makes derived numbering fall apart, so the stored
number wants to exist first.

---

## Risk posture

The app works. Everything here is an improvement to something already
functioning, so the bar is not "is this better" but "is this better by enough to
justify touching a working money path".

**Ship without hesitation — A and F.** Neither changes a written value. A adds an
index; worst case is wasted disk. F collapses five hand-rolled definitions of "a
day" into one and recovers rows currently dropped at the boundary. Both revert
with no data residue.

**Ship once the flag's reach is known — B.** This is the only item fixing damage
that is happening now rather than preventing damage that might. The forward fix
is small; the history repair is the part needing care.

**Hold — C's atomic-counter work, and E.** The counter race self-heals at close
and never reaches payroll, so converting `createOrder` to an RPC buys a correct
mid-day card while putting an RPC on the till's write path, where a failure means
a seller cannot take money. Bad trade on its own. C's *numbering* half stands,
but as a prerequisite for E. E is the genuinely dangerous item: eight money
queries must start excluding voided rows, one of them writes the final reconciled
totals, and a mistake there is baked into a summary that is already paid out.

**The general shape of the risk.** Every item replaces something that works in
the common case with something that works in the common case *and* an edge case.
The failure mode is always the same — the new code is subtly wrong in the common
case, and the common case is 100% of revenue. A, F and B's forward fix cannot be
wrong in the common case. C and E can. Sequence accordingly; do not batch.

---

## Decisions taken 2026-08-08

Owner answers, recorded so they are not re-litigated:

1. **A QRIS-paid order cannot be voided.** Money has moved; void is blocked at
   the endpoint rather than triggering a refund flow. Cash orders only.
2. **No voiding on a closed day.** Once `closed_at` is set the summary is
   reconciled and payroll commissions exist. Void is rejected.
3. **Seller may void directly, for now.** The intended end state is
   seller-requests / admin-approves, but that workflow is later. Build the
   endpoint so a seller can void; do not build the approval flow yet, and do not
   design anything that would block adding it.
4. **Void is not reversible.** No un-void.
5. **Voided orders stay visible in the list**, rendered as a card labelled as
   voided, and excluded from totals. Not hidden, not a gap.
6. **The 25-row cap stays as shipped and is not tuned further.**

---

## Schema facts, from `packages/db/types.ts`

`store_orders` columns are exactly: `id`, `store_id`, `user_id`, `tenant_id`,
`daily_summary_id`, `total_amount`, `payment_method`, `created_at`.

- **No `order_number`, `voided_at`, `void_reason`, `status` or `updated_at`.**
  Items C and E each genuinely need their migration; nothing is half-built. E's
  void would be this table's first-ever mutation, so decide whether `updated_at`
  arrives at the same time.
- **`daily_summary_id` is nullable**, with a real FK. Nulls are legal; nothing in
  the schema prevents the state Item B describes.
- **`created_at` is nullable.** Every date-range query uses `.gte`/`.lte`, and
  SQL comparisons against null are never true — an order with a null `created_at`
  is invisible to *all* of them, including the summary seed and the close
  recompute.
- **`tenant_id` is nullable.** Most seller routes run service-role with RLS
  bypassed, so `.eq("tenant_id", …)` is the only tenant scoping; a null-tenant
  row matches no filter and is silently invisible everywhere.
- **`payment_method` is non-null with a default**, so QRIS orders are
  identifiable as `payment_method = 'qris'` — the handle for Item B's repair.

`store_daily_summaries` has no `orders_issued` column.

Both nullable columns above could be tightened to `NOT NULL` cheaply, and
`created_at` sits in the same migration as Item A. Logged, not scoped here.

---

## Context — what 041 Phase 3 shipped

Commit `6be6283`, plus the partial revert `013259b`.

- `listOrders` takes an optional `limit`, default 25, hard cap 500.
- The day's totals come from the `store_daily_summaries` row rather than being
  summed client-side, which is what makes the cap safe.
- `Order #N` is derived client-side as `totals.totalOrders - index`
  (`MobileOrders.tsx:84`).
- The select is aliased to camelCase, `toCamelKeys` is gone from this path, and
  `stores(name)` was dropped.
- The collapsed order card was built and then reverted — cards stay expanded.

### Volume correction

041 was sized against "a busy day is ~300 orders". The real figure is **80–100
orders per day per store**. Every 041 estimate leaning on the higher number is
optimistic; its `orders` row should read roughly **3.5s saved, not 6s**, moving
Phases 1–6 from ≈24.5s to ≈22s. *Not yet applied to 041's text* — apply it when
041 is next touched, or read its projection as high.

### The cap is CPU-neutral at this volume, and stays anyway

At 80–100 orders a day `hasMore` trips every day, so `Show all` is always on
screen. Per store per day:

| | Invocations | Rows fetched |
|---|---|---|
| No cap | 1 | ~90 |
| Cap 25, no tap | 1 | 25 |
| Cap 25, tapped | 2 | 115 |

A tap costs 25 rows *more* than never capping, plus an extra invocation, because
raising the limit re-fetches from the top rather than paging. The cap is ahead
only below roughly a 45–50% tap rate, **and that rate has never been measured**.

Keep it because it is shipped, costs nothing to leave, and bounds the tail — one
festival day at 400 orders is when an unbounded query hurts. Rejected, recorded
so they are not re-proposed:

- **Tap loads 25 more.** Whoever taps has a specific reason that 50 will not
  satisfy either, so they tap again — 037's ladder one rung at a time. And since
  a larger limit re-fetches from the top, a 90-order day via +25 taps is
  25+50+75+…, roughly 4× the rows across 4× the invocations.
- **Infinite scroll.** Same arithmetic, worse — it makes the expensive path the
  default, and needs keyset cursors, which is what 037 built and got reverted for.
- **Default 15 instead of 25.** Directionally right, but 10 rows is small against
  fixed per-invocation cost and not worth a change on unmeasured ground.

Noted for later: a high tap rate would mean the real need is "find one specific
order" — a search problem, better served by a filter than by any page size.

---

## Item A — the missing index on `store_orders`

**Risk: none. Independent of everything else.**

### State

Two migrations exist and both reached remote:

- `20260705161933_add_store_orders_store_date_index.sql` — `CREATE INDEX ON store_orders (store_id, created_at);`
- `20260705171042_drop_store_orders_store_date_index.sql` — `DROP INDEX IF EXISTS store_orders_store_id_created_at_idx;`

Create then drop, so **remote has no such index today.** That pair is task 037
fallout — the index supported the cursor-pagination work, which was reverted, and
the index went with it.

An index on `daily_summary_id` does exist
(`20260628135716_add_daily_summary_id_to_store_orders.sql:13`). Whether those
plus the primary key are the *only* indexes is unverified — see confidence query
2.

### Why it matters

`listOrders` (`packages/services/orders.ts:79-95`) filters `tenant_id` and
`store_id`, restricts `created_at` to a day range, sorts `created_at DESC`, and
applies a `LIMIT`. `getHourlySales` reads the same shape.

Without a matching index the `LIMIT` buys nothing — Postgres finds every matching
row and sorts it before discarding all but 25 — and the scan covers the **whole
table**, not the day. At 80–100 orders per day per store that is roughly 2,700
rows a month and 32,000 a year per store, so the query slows every month
regardless of the limit.

With the index the planner walks the range already in `created_at` order and
stops after `limit` rows: no sort node, cost flat in table size.

**This is the only item whose value is independent of daily order volume**, and
the only one satisfying 041's guiding principle — cost per request flat in
accumulated data.

### The migration

New forward migration. Do not edit or delete either July 5 file.

```sql
CREATE INDEX IF NOT EXISTS store_orders_store_id_created_at_idx
    ON store_orders (store_id, created_at DESC);
```

Name it explicitly — the July 5 create used a bare `CREATE INDEX ON` and let
Postgres auto-name it, which is what forced its companion `DROP` to guess.

Leading with `store_id` rather than `tenant_id` is deliberate: a store belongs to
exactly one tenant, so `store_id` is already maximally selective and a leading
`tenant_id` column would only add width.

`DESC` is not required — Postgres scans a btree backwards efficiently — and is
written this way only to match the query's intent. Not significant.

Consider `CREATE INDEX CONCURRENTLY` if a brief write lock during the push is a
concern. It cannot run inside a transaction block, so check whether the Supabase
migration runner wraps statements before relying on it.

### Caveat on shape

`storeId` and `date` are both **optional** in `ListOrdersQuery`
(`packages/features/orders/schema.ts:62-70`), and `listOrders` applies each only
`if` present. A call with neither gets a tenant-wide scan this index cannot
serve. Every real caller passes both, so the shape is right for actual traffic —
worth knowing so nobody later concludes the index "did not work".

---

## Item B — QRIS orders never reach a summary

**Risk: this is already happening. Not blocked on a decision. Scope depends on
the `feature-qris` flag's reach.**

### The bug

`apps/seller/app/api/payments/qris/webhook/route.ts:55-64` inserts the order
directly on payment settlement:

```ts
const { data: orderData } = await supabase
    .from("store_orders")
    .insert({
        store_id: payment.store_id,
        user_id: payment.user_id,
        total_amount: amount,
        tenant_id: payment.tenant_id,
        payment_method: "qris",
    })              // ← no daily_summary_id, and no summary totals update at all
    .select()
    .single();
```

It does not look up a summary, does not set `daily_summary_id`, and — unlike
`createOrder` — never increments `total_sales`, `total_orders` or `total_cups`.
**Every QRIS order, at every hour, is a null-summary order the day's counters
never see.**

### Consequences

- **The close recompute drops them permanently.** `updateSummary`
  (`summaries.ts:414-451`) recomputes final totals from `store_orders WHERE
  daily_summary_id = id` when `closed_at` is first set. QRIS orders have null, so
  they are excluded from every closed summary's `total_sales`, `total_orders` and
  `total_cups`. Revenue is under-reported in the reconciled record, not just the
  live card.
- **The orders screen contradicts itself.** `listOrders` selects by *date*, so
  QRIS orders **do** appear in the list; `getDayTotals` reads the summary row,
  which never counted them. So `orders.length` exceeds `totals.totalOrders` —
  `hasMore` goes **false** and `Show all` vanishes while orders are still
  uncounted, and `Order #N = totals.totalOrders - index` duplicates and
  eventually goes negative. **This is a far more likely explanation for any
  observed count mismatch than Item F's one-second window.**
- **`expected_cash` is arguably correct to skip** — QRIS is not cash and must not
  inflate the drawer count. Whether the other three totals should include QRIS is
  a business question, but silently excluding them from `total_sales` is almost
  certainly not the intent.
- **Payroll is unaffected.** `createPayrollCommissions` (`payroll.ts:43-52`)
  counts order rows per session window directly and never reads summary totals.

### Forward fix

Give the webhook the same summary lookup and totals update `createOrder` already
has, minus `expected_cash` — with the summary resolved from
`payment.store_id` + `payment.tenant_id`. Two open points:

1. **Which summary?** The QR may be generated in one day's session and settle in
   the next. Resolving by settlement time is simplest; resolving by the payment
   row's own creation time attributes it to the session that rang it up. Pick
   deliberately — it is the only genuine decision left in this item.
2. **No open summary at settlement.** A QR paid after close has nowhere to go.
   Leaving `daily_summary_id` null in that narrow case is acceptable *if* the
   close recompute is taught to sweep by date rather than by summary id; leaving
   it null with no sweep reproduces the bug at lower volume.

### History repair

Depends on confidence query 3. `payment_method = 'qris' AND daily_summary_id IS
NULL` scopes it exactly. Whether to recompute already-closed summaries is an
owner call with consequences for payouts already paid — note that payroll does
not read these totals, so a repair affects reported revenue and cash
reconciliation, **not** anyone's wages.

Do not reuse the backfill approach from
`20260628135716_add_daily_summary_id_to_store_orders.sql`, which matched
`(created_at + 7h)::date` to `store_daily_summaries.date` — a calendar-date
convention that would re-create the mismatch for any store trading past midnight.

### Why the after-midnight scenario is *not* the problem

Earlier revisions of this task were built around a cash order placed at 00:30
missing its summary. That path cannot fire, and the reasoning is worth keeping so
it is not rediscovered.

`POST /api/orders` (`apps/seller/app/api/orders/route.ts:42-46`) requires an
active session owned by the caller:

```ts
const activeSession = await getActiveSession(supabase, { tenantId, storeId: body.data.storeId });
if (!activeSession || activeSession.userId !== user.id) {
    return forbidden("You do not hold the active session for this store");
}
```

And `20260529155501_enable_pg_cron_stale_session_cleanup.sql` schedules a job at
`0 17 * * *` — 17:00 UTC, i.e. **00:00 WIB** — ending every active session whose
summary date is already in the past:

```sql
UPDATE store_sessions SET status = 'ended', ended_at = NOW()
WHERE status = 'active'
AND daily_summary_id IN (
    SELECT id FROM store_daily_summaries
    WHERE date < (NOW() + INTERVAL '7 hours')::date
);
```

At midnight WIB every session opened on the previous date is ended,
`getActiveSession` returns null, and the route answers **403**. `createOrder` is
never reached.

**The real problem in that scenario is the opposite of a data bug: the till stops
working.** A store trading 22:00–01:00 locks its seller out at midnight,
mid-service. To keep selling they must re-open, which creates the next date's
summary and splits one night's trade across two summaries — visibly, and with the
seller aware of it. **That deserves its own task**; it is a business-rule and UX
problem, not silent corruption.

Two caveats: this rests on the cron actually being scheduled (confidence query
1 — its own migration warns pg_cron may need dashboard enablement first), and
there is a millisecond-wide race at exactly 17:00:00 UTC where an in-flight order
passes the session check and then misses the summary lookup.

### The latent fragility, unchanged

`createOrder` finds the summary by calendar date:

```ts
// packages/services/orders.ts:191-201
const TZ = Number(process.env.TIMEZONE_OFFSET ?? 7);
const todayStr = new Date(new Date().getTime() + TZ * 3600000).toISOString().split("T")[0];

const { data: activeSummary } = await supabase
    .from("store_daily_summaries")
    .select("id, total_sales, total_orders, total_cups, expected_cash")
    .eq("store_id", storeId)
    .eq("tenant_id", tenantId)
    .eq("date", todayStr)
    .is("closed_at", null)
    .maybeSingle();
```

Dropping `.eq("date", todayStr)` in favour of `closed_at IS NULL` alone would
**not** be safe. Uniqueness is per *date*, not per *open state*:

```sql
-- 20260516150145_add_unique_daily_summary_per_store.sql
CREATE UNIQUE INDEX unique_daily_summary_store_date
  ON daily_summaries (store_id, date, tenant_id);
```

(That migration predates the rename to `store_daily_summaries`; the index still
exists on the renamed table.)

`openStore` guards only against a summary existing **for the date being opened**
(`sessions.ts:167-177`) — never against an older one still being open. So a store
whose Monday summary was never closed can open Tuesday's, and both are
`closed_at IS NULL`. A date-less lookup would match two rows and `maybeSingle()`
would error — a hard failure at the till.

By contrast `store_sessions` *does* constrain this
(`20260514074108_create_store_sessions.sql:15-18`):

```sql
CREATE UNIQUE INDEX one_active_session_per_store
  ON store_sessions(store_id)
  WHERE status = 'active';
```

Note the predicate is `status = 'active'`, not a null timestamp; summaries have
no status column, so a mirroring index would use `closed_at IS NULL`. **Summaries
have no such index at all.** Adding one — a partial unique index on
`store_daily_summaries (store_id, tenant_id) WHERE closed_at IS NULL` — would
make the two-open-summaries state impossible going forward and make a date-less
lookup provably single-row. It will fail to apply if confidence query 4 returns
rows, which is a useful forcing function.

Worth doing, but as hardening, not as a fix for anything currently broken.

---

## Item C — stored `order_number`

**Risk: moderate. After B, before E.**

### Why — the derivation does not survive a void

`Order #N` is currently `totals.totalOrders - index` (`MobileOrders.tsx:84`).
Both inputs move when an order leaves the day: `totalOrders` drops and every row
below shifts an index. So **every number below a void silently decrements**. A
customer holding a slip for #48 finds #48 is someone else's order tomorrow.

A stored number is immune: #48 stays #48, and #47 is visibly voided beside it.
**Item E is the reason this item exists.**

### Two counters, not one

Per decision 5, `total_orders` decrements on void — it is an *active count*. A
number generator must never decrement, or the next order collides with a live
number. So the summary needs both:

| Column | Meaning | On void |
|---|---|---|
| `total_orders` | active orders — what the summary card shows | decrements |
| `orders_issued` | highest number handed out | **never moves** |

Counting rows to derive a number is racy, so the counter column is required
regardless of soft delete.

### The counter's lost-update race — real, but not urgent

```ts
// packages/services/orders.ts:235
if (activeSummary) {
    await supabase
        .from("store_daily_summaries")
        .update({
            total_sales:   activeSummary.total_sales   + totalAmount,
            total_orders:  activeSummary.total_orders  + 1,
            total_cups:    activeSummary.total_cups    + totalCups,
            expected_cash: activeSummary.expected_cash + totalAmount,
        })
        .eq("id", activeSummary.id)
        .eq("tenant_id", tenantId);
}
```

Every value is computed in JavaScript from a row read earlier in the same
function (`orders.ts:194`). Two concurrent orders both read `total_orders = 10`
and both write `11`. Classic lost update, drifting **low**.

**But the drift does not survive close.** `updateSummary` (`summaries.ts:414-451`)
recomputes `total_sales`, `total_orders`, `total_cups`, `total_expenses` and
`expected_cash` from actual rows when `closed_at` is first set, and computes
`variance` against that recomputed figure. And payroll never reads these totals
at all. So the race is a **mid-day display defect** — the card a seller watches
during service reads low until close corrects it.

That is worth fixing eventually and is **not** a reason to put an RPC on the
till's write path today. See Risk posture.

**A second racing writer.** `expected_cash` is also read-modify-written by the
expenses service (`expenses.ts:40-51`, `expenses.ts:81-109`). An order and an
expense recorded at the same moment lose one of the two. Any atomic-increment fix
that converts `createOrder` and leaves `expenses.ts` alone is cosmetic.

Evidence of the race, if wanted:

```sql
select s.id, s.date, s.total_orders, count(o.id) as actual
from store_daily_summaries s
left join store_orders o on o.daily_summary_id = s.id
where s.closed_at is null          -- closed rows were recomputed; they prove nothing
group by s.id, s.date, s.total_orders
having s.total_orders <> count(o.id);
```

Read the result carefully: Item B's null `daily_summary_id` also makes these
disagree, so a mismatch is not proof of the race. Understand B first.

### The numbering fix

A single statement, so Postgres serializes concurrent writers on the row:

```sql
UPDATE store_daily_summaries
SET orders_issued = orders_issued + 1,
    total_orders  = total_orders  + 1,
    total_sales   = total_sales   + p_total_amount,
    total_cups    = total_cups    + p_total_cups,
    expected_cash = expected_cash + p_total_amount
WHERE id = p_summary_id AND tenant_id = p_tenant_id
RETURNING orders_issued;
```

Store the returned value as `order_number` on the order. Numbering becomes a
stored fact — stable under void, immune to counter drift, correct without the
client knowing the day's total.

This must be an RPC, not a PostgREST `.update()`: the client cannot express
`column = column + n` or return the computed value.

### Open questions

1. **QRIS orders cannot be numbered this way.** The number comes from the
   summary's counter, and QRIS orders have no summary — so until Item B gives
   them one, every QRIS order gets a null `order_number` while cash orders get a
   real one, in the same visible list. **This is the strongest argument for
   sequencing B before C.** Keep the column nullable regardless; rejecting an
   order for want of a number turns a silent case into a failure at the till.

2. **Insert and increment ordering.** The order row must exist to carry a number,
   but the number comes from the update. Taking the number first and inserting
   with it is cleaner but leaves a gap if the insert then fails. Neither is atomic
   across both tables unless the whole thing moves into one RPC — probably the
   right answer, and a larger change than it first looks.

3. **The other writers of these totals.**

   | Writer | Pattern | Must it change? |
   |---|---|---|
   | `orders.ts:235` — `createOrder` | read-modify-write | yes, this item |
   | `expenses.ts:50`, `expenses.ts:109` | read-modify-write on `expected_cash` | **yes — races `createOrder`** |
   | `summaries.ts:441-445` — `updateSummary` on close | full recompute from rows | no, but see below |
   | `summaries.ts:405` — `updateSummary` on opening-balance edit | read-modify-write on `expected_cash` | yes |
   | `sessions.ts` — `openStore` via `seedTotalsFromOrders` | insert-time seed, no concurrency | no |

   Two consequences for the close recompute: `orders_issued` must be **excluded**
   from it — it is not derivable from rows, and recomputing it would reset the
   number generator mid-life. And once Item E lands, that recompute must count
   **active** orders only.

### CPU impact

Approximately zero. One more column in the select; `getDayTotals` stays because
the card still needs sales and cups. **This item is here for correctness.**

---

## Item D — delete `app/api/orders/list/route.ts` — already done

The file does not exist. It was deleted in commit `6be6283` (041 Phase 3), the
same commit that added the cap. `apps/seller/app/api/orders/` now contains only
`route.ts`. Kept here so the split from 041 stays legible.

---

## Item E — soft delete (void)

**Risk: high. Do last.**

Per decisions 1–5: void is a soft delete, the card stays visible and labelled,
totals are reduced, QRIS-paid orders and closed days are rejected, sellers may
void directly for now, and there is no un-void.

### Why soft, and why the card stays

A hard delete leaves a gap in the numbering that nothing explains. A voided card
on screen explains itself, keeps the audit trail where people actually look, and
keeps `store_order_payments` from referencing a row that no longer exists.

### The exclusion problem — the main risk in this item

`store_orders` is read from **11 sites across 7 files**, shared between seller and
backoffice. Each was read individually rather than inferred from the grep:

| Site | Function | Voided rows |
|---|---|---|
| `orders.ts:80` | `listOrders` | **include** — the card must render |
| `activity-logs.ts:99` | day-activity ref collection | **include** — the timeline should show the void |
| `summaries.ts:426` | `updateSummary` — **close recompute, and a writer** | exclude — highest stakes here |
| `summaries.ts:54` | `fetchDayOrders` → `seedTotalsFromOrders` | exclude |
| `summaries.ts:320` | `createSummary` seed (legacy `POST /api/summaries`) | exclude |
| `summaries.ts:84` | `getSummaryUsers` — per-user cups | exclude |
| `summaries.ts:492` | `getSummaryBreakdown` — per-product | exclude |
| `analytics.ts:148` | `getHourlySales` | exclude |
| `payroll.ts:46` | `createPayrollCommissions` — per-session cups | exclude |
| `sessions.ts:357` | per-user cups by session | exclude |
| `apps/seller/app/api/payments/qris/webhook/route.ts:56` | payment settlement | special — it inserts, see Item B |

Eight exclude, two include, one webhook. (A twelfth grep hit, `orders.ts:251`, is
the `refTable: "store_orders"` string in an activity-log call, not a query; a
thirteenth, `orders.ts:211`, is `createOrder`'s insert.)

**`summaries.ts:426` is the one to get right.** It is not a passive read — it is
the close recompute that **writes** final totals. If it can see voided orders,
every closed summary permanently includes them, and no later fix repairs a
summary that is already reconciled and paid out.

Relying on someone remembering a `voided_at IS NULL` filter at eight call sites
across two apps is how one gets missed and a payslip goes quietly wrong six weeks
later.

### Proposed structural answer: a `store_orders_active` view

Filter voided rows in the view, point every money query at it. `listOrders` keeps
reading the base table, explicitly, because it is one of the two places that
wants them.

**Be honest about what this buys.** It does **not** make the initial conversion
safe — someone still repoints eight call sites by hand, and getting one wrong on
day one is exactly as bad as forgetting a filter. What it buys is that every
*future* query against `store_orders_active` is correct by default, and that the
eight are a single greppable diff. A durability argument, not a safety argument
for the migration itself.

> **Check the view's RLS behaviour before relying on it.** A Postgres view runs
> with the privileges of its owner unless created with `security_invoker = true`,
> so it can silently bypass the underlying table's RLS. Most seller routes use
> the service-role client where RLS does not apply anyway, but backoffice and any
> anon-key path would be affected. Set `security_invoker` explicitly and verify.

### What a void must do, atomically

In one statement:

- set `voided_at`, `voided_by`, optionally `void_reason` on the order
- `total_orders  = total_orders  - 1`
- `total_sales   = total_sales   - <order amount>`
- `total_cups    = total_cups    - <order cups>`
- `expected_cash = expected_cash - <order amount>`
- leave `orders_issued` **untouched**

Guards, server-side and ideally in the same statement so they cannot be raced:

- reject if the summary has `closed_at IS NOT NULL` (decision 2)
- reject if a `store_order_payments` row exists for the order (decision 1).
  Confirm which payment states count as "paid" rather than assuming any row does
  — a pending or expired QR is not settled money.
- reject if already voided (idempotence; there is no un-void per decision 4)

Note the interaction with Item B: a QRIS order has no summary, so the totals
delta has nothing to apply to. Decision 1 blocks voiding those anyway, which
keeps the two items consistent — but only as long as decision 1 holds.

### Also needed

- **`order_voided` in `ActivityLogType`**
  (`packages/features/activity-logs/schema.ts`). **No migration** —
  `tenant_activity_logs.type` is plain `text` with no DB enum.
- **UI treatment** for the voided card, plus a translation key pair in
  `packages/utils/translations/{en,id}.ts`.
- **A void endpoint** following the standard route shape, calling
  `getRequestUser()` and passing `userId` down for logging.

### Update — a separate problem, not solved here

Editing an order's items does not affect numbering, but it must adjust
`total_sales` / `total_cups` / `expected_cash` by the **difference**, with the
same atomic-delta treatment and the same closed-day and paid-order guards.

**Keep update out of this task.** It needs its own thinking about what happens to
`store_order_items` rows. Noted so it is not forgotten.

### Open questions

- **Does void need a reason?** Free text, or a fixed list? Affects the schema and
  the eventual approval flow.
- **What does the approval flow need later** (decision 3)? Nothing built now, but
  a `status` column with `voided` as one value extends more gracefully than a
  bare `voided_at` if `pending_void` is coming. Choose deliberately.

---

## Item F — "a day" has five implementations

**Risk: low. No migration. Ship with A.**

### The visible bug

`listOrders` and `getHourlySales` end the day at `23:59:59.000`. Everything else
ends it at `23:59:59.999`. An order timestamped in that one-second window is
excluded from the order list and the hourly chart, but still counted in
`total_orders` — `createOrder` increments unconditionally, with no date filter.

The symptom is only *visible* when the whole day is already on screen: a day
under 25 orders, or after `Show all` was tapped. At 80–100 orders a day the
default view has `hasMore` true regardless, so the missing row hides behind a
button that is legitimately there — rarer to notice than to occur.

One second out of 86,400 per store per day, so roughly once per thousand
store-days. **Item B is a much more likely cause of any mismatch actually
observed.**

### The actual defect — five day-range implementations

| # | Convention | Sites | Day ends at |
|---|---|---|---|
| 1 | `` `${date}T23:59:59+07:00` ``, `.lte` | `orders.ts:93`, `analytics.ts:153` | **1s early** |
| 2 | `` `${date}T23:59:59.999Z` `` shifted by tz, `.lte` | `summaries.ts:51`, `summaries.ts:318`, `requests.ts:59`, `reports.ts:59` | 1ms early |
| 3 | `Date.UTC(y, m-1, d) - tz`, then `+ 24h - 1` | `activity-logs.ts:22-24`, `activity-logs.ts:79-81` | 1ms early |
| 4 | `setUTCHours(0 - tz, 0, 0, 0)` | `sessions.ts:416`, `sessions.ts:444` | range start only |
| 5 | `Date.now() + tz * 3600000`, then slice | `utils/time.ts:8` (`getTodayLocalStr`), `orders.ts:192` | "today" as a string |

Convention 5 states the problem plainly: `createOrder` reimplements
`getTodayLocalStr()` inline, character for character, because reaching for the
helper was less obvious than retyping the arithmetic.

### The FE is not involved

`MobileOrders.tsx:53` sends a bare `YYYY-MM-DD` from `getTodayLocalStr()`, and
that one string fans out to three endpoints — `/api/orders`,
`/api/analytics/hourly-sales`, and the summary read inside `listOrders`. The
client never sends a range and never sends a timestamp. The server owns the
entire definition of a day; three server files define it differently; the screen
contradicts itself. The FE cannot cause this and cannot fix it.

`selectedDate` itself is correct — migrated to `getTodayLocalStr` in `70a4807`,
2026-05-30.

### The fix — one module owns the concept

Not a patch at each site; the conventions exist because the logic is copy-paste,
so patching leaves the next person copying whichever they open first.

```ts
// packages/utils/time.ts

/**
 * Both TIMEZONE_OFFSET and NEXT_PUBLIC_TIMEZONE_OFFSET are set to 7 in the root
 * .env. Only the NEXT_PUBLIC one is inlined into the client bundle, and both are
 * present server-side — so reading the public one is the single form that works
 * on both sides. This is what time.ts already does; do not "improve" it into a
 * fallback chain, because a non-public var referenced from a client component is
 * replaced with `undefined` at build time and the chain's behaviour would then
 * depend on which bundle it landed in.
 */
const DEFAULT_TZ = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);

export interface AppDay {
    /** YYYY-MM-DD in app time. */
    readonly date: string;
    /** Inclusive lower bound, UTC ISO. */
    readonly startUtc: string;
    /** EXCLUSIVE upper bound, UTC ISO. Pair with `.lt`, never `.lte`. */
    readonly endUtc: string;
    next(): AppDay;
    prev(): AppDay;
}

export function appDay(date: string, tz: number = DEFAULT_TZ): AppDay { /* … */ }

/** The current day in app time. */
export function today(tz: number = DEFAULT_TZ): AppDay { /* … */ }
```

Call sites become uniform, and the millisecond question stops being askable:

```ts
const day = appDay(date, tz);
query = query.gte("created_at", day.startUtc).lt("created_at", day.endUtc);
```

**`.lte` becomes `.lt`.** The one line a reviewer must not wave through — an
exclusive bound paired with `.lte` double-counts midnight into both days, which
is worse than the bug being fixed.

**Why a factory returning a frozen object rather than a class.** `packages/services`
is plain functions taking a `SupabaseClient`; there is no class anywhere in it,
and this would be the only one. The encapsulation that matters is identical — one
module owns the concept, `3600000` appears once, and no caller can express a
half-open range incorrectly. A plain object also crosses the server/client
boundary and tree-shakes without ceremony.

**`getTodayLocalStr()` stays** as a one-line alias for `today().date`. About six
callers; no reason to churn them.

**Why the conversion is safe mechanically:** every current implementation *loses*
rows at the boundary. The replacement recovers them. No site gains a row it
should not have had, so there is no direction in which this over-counts.

### Scope for 043

Ship the module, convert only the order-reading paths:

- `orders.ts:92-94` — `listOrders`
- `analytics.ts:152-153` — `getHourlySales`
- `summaries.ts:50-51` — `seedTotalsFromOrders`
- `summaries.ts:317-318` — `createSummary` seed
- `orders.ts:191-192` — `createOrder`, replace the inline dupe with `today().date`

**Leave conventions 3 and 4 alone here.** `activity-logs.ts` and `sessions.ts`
feed the day timeline and the session streak; widening their ranges changes what
those screens display, which is separate to verify and unrelated to orders.
`requests.ts` / `reports.ts` likewise. Convert them in a follow-up — the point of
shipping the module now is that the follow-up becomes deletion rather than
invention.

### Follow-up, not part of this task

Two display formatters in `MobileOrders.tsx` were missed by the 2026-05-30
timezone migration and still read the device clock:

- `MobileOrders.tsx:24-26` — `formatMobileDate` compares against `new Date()`, so
  a device not set to WIB labels the wrong row "Today".
- `MobileOrders.tsx:40-46` — `formatFullTimestamp` calls `toLocaleString` with no
  `timeZone` option.

Both invisible on a correctly-set phone, both presentation-only — no query, no
total, no money. A small FE task, not this one.

---

## Migrations

Per `CLAUDE.md`: one focused migration per change, created with
`supabase migration new <name>`, verified with `supabase migration list`, and
**pushed manually by the developer**. Never `db push`.

| # | Migration | Item | Blocked by |
|---|---|---|---|
| 1 | `store_orders (store_id, created_at)` index | A | nothing — ready now |
| 2 | *(conditional)* Backfill `daily_summary_id` for historical QRIS orders | B | confidence query 3, and the owner's call on repairing closed summaries |
| 3 | `orders_issued` on `store_daily_summaries`, `order_number` on `store_orders` | C | ideally B, so QRIS orders can be numbered |
| 4 | RPC: atomic order create — insert, increment, return the number | C | migration 3 |
| 5 | Void columns on `store_orders` (`voided_at`, `voided_by`, reason or status) | E | decision on reason vs status |
| 6 | `store_orders_active` view, with `security_invoker` set | E | migration 5 |
| 7 | RPC: atomic void — guards plus the totals delta | E | migrations 5 and 6 |
| 8 | *(hardening)* Partial unique index on open summaries | B | confidence query 4 returning nothing |

Migrations 3+4 can reasonably merge, as can 5+6. Nothing here needs an enum
change — `tenant_activity_logs.type` is plain `text`. Item B's forward fix is
application code only and needs no migration.

**Only migration 1 is unblocked today.**

---

## Verification

The rule for this task: **none of these can be proven by placing one order by
hand.**

1. `pnpm lint && pnpm build` clean on **both** apps. `packages/services/orders.ts`
   and `summaries.ts` are shared with backoffice — grep its consumers before
   changing any signature.

2. **Item A.** `EXPLAIN (ANALYZE, BUFFERS)` the list query before and after on a
   store with real history. The evidence is the plan losing its sort node and
   ceasing to scan the whole table — *not* a wall-clock improvement. At ~90 rows
   a day the timing difference is noise.

3. **Item B.** Settle a real QRIS payment and confirm the order lands with a
   non-null `daily_summary_id`, that the summary's `total_sales`, `total_orders`
   and `total_cups` all advance, and that `expected_cash` does **not**. Then close
   the day and confirm the recomputed totals still include it — that second check
   is the whole point, since the recompute is what currently drops these orders.
   Separately confirm the orders screen: list length and summary count agree, and
   `Show all` behaves.

4. **Item C.** Place two orders **concurrently** against the same open summary —
   two devices, or two parallel API calls — and confirm distinct consecutive
   numbers and that `total_orders` advances by exactly 2. Serial testing proves
   nothing; serial writes are the case the current code already handles.

5. **Item E.** Void an order mid-day and confirm: the card still renders labelled
   as voided, `total_orders` drops by one while `orders_issued` does **not**, the
   next order takes the following number rather than reusing the voided one, the
   summary card and the payroll commission both exclude it, and the analytics
   screens agree. Then close the day and confirm the recompute also excludes it.
   Then confirm both guards reject — a QRIS-paid order, and an order on a closed
   day.

6. **Item F.** Not reproducible by hand. Insert rows directly with `created_at`
   at `23:59:59.5` and `23:59:59.999` local, and confirm each appears in the order
   list, the hourly chart, and the summary seed — all three, or the fix is
   half-applied. Then insert one at exactly `00:00:00.000` of the following day
   and confirm it appears in **exactly one** day; that catches an `endUtc` left
   paired with `.lte`. Unit-test `appDay` directly across a month boundary; it is
   pure, so this is cheap.

7. **Regression on what 041 shipped**, since this task edits the same code:
   newest 25 shown, `Show all` extends without duplicates or scroll loss, the
   summary card matches the daily summary row rather than the loaded list length,
   the date picker resets the limit, the mini chart renders.

8. **Force-quit the installed PWA on every test device before concluding
   anything.** Task 040 lost a staging cycle to a cached bundle. Task 042 restored
   the service worker, but a device still holding a pre-042 worker has no update
   path at all.

---

## Rollout

Run the five confidence checks first. Then:

**A and F together** — same query, one migration, no interaction.
**B** once the flag's reach is known; forward fix and history repair as separate
deploys, forward first.
**C**, then **E**.

Do **not** batch B and C despite adjacent code: B changes which summary an order
reaches, C changes how that summary's counter is written, and debugging them as
one diff means debugging a wrong total without knowing which half caused it.

Each migration ships before the app deploy that depends on it — an app calling an
RPC that does not exist yet fails at the till.

---

## What would make me stop and re-plan

- **Confidence query 1 showing the cron jobs absent or inactive.** The
  after-midnight cash path would then be live after all, and Item B grows a second
  producer of nulls.
- **Confidence query 3 returning a large QRIS backlog spanning closed
  summaries.** That turns B from "fix a webhook" into "restate historical
  revenue", which is a business conversation before it is a technical one.
- **Confidence query 4 returning stores with multiple open summaries.** A
  data-integrity problem to understand before any lookup change.
- **The `total_orders <> count(*)` query returning many rows on *open* summaries
  only.** That would mean the race is more common than assumed and C's counter
  half earns its priority back.
- **Any money query reading `store_orders` outside the eleven sites listed**,
  particularly inside a Postgres function or scheduled job. The view strategy in
  Item E assumes that list is complete; it was built by grep over the two active
  apps and does not cover SQL living in the database. There *is* a pg_cron job in
  the schema — confirm it touches only `store_sessions`.

---

## Logged, not actioned

**`GET /api/orders` has no caller check.** `apps/seller/app/api/orders/route.ts:16-30`
never calls `getRequestUser()`; `POST` in the same file does, and additionally
checks session ownership. Tenant isolation still holds — `tenantId` comes from the
signed cookie, not the query — so this is not a cross-tenant leak, but it is the
only route in the orders API with no caller check at all. An auth change on the
order list wants its own diff and its own reasoning; do not bundle it here.

**A store trading past midnight loses its till at 00:00 WIB.** Described in Item
B. The session is force-ended by cron and the seller gets a 403 mid-service. Own
task — it is a business-rule question about what a trading day means, not a bug
in any single function.

**Two nullable columns worth tightening.** `store_orders.created_at` and
`store_orders.tenant_id` both permit null, and a null in either makes the row
invisible to every query that filters on it. `created_at` could ride along with
Item A's migration.
