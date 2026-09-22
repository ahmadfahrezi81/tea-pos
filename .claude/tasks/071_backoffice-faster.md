# Task 071 — Make backoffice faster

**Status: built 2026-09-22, uncommitted. Rounds 1–3 complete, round 4 complete
except R4.1c (a migration, gated on soak time) and the last three routes of
R4.2 (designed below, deliberately not built). Both apps typecheck, build, and
emit their service workers; backoffice lints clean. Versions bumped to
backoffice 1.0.21 / seller 5.4.21 with patch notes.**

## The goal

**Backoffice should be faster.** Fewer queries, fewer round trips, less waiting.
Not a rewrite, not a refactor for its own sake — the measurable thing at the end
is that screens appear sooner and buttons finish sooner.

Two constraints the owner set, and they shape every decision below:

1. **Do not hurt existing code.** Every step names its blast radius and how we
   know nothing broke. A step that cannot state both does not ship.
2. **Fix bugs found along the way.** Several turned up during the audit. They
   ride along with the step that touches the same code, rather than becoming
   their own project.

**Where the inspiration comes from.** Seller is the reference. Every rule below
is taken from something seller already does correctly — its dedupe tiers, its
navigate-then-refresh, its cache seeding, its absence of per-row fetches. Where
the two apps disagree, seller is right and backoffice is the one that drifted.

**What we are optimising.** The Vercel CPU bill is roughly nothing at this scale.
Query counts throughout this document are a proxy for **latency**, not cost. The
owner also reports backoffice feels slower than seller **locally** — where there
is no cold start and no network — which means the wins that matter most are
*requests per screen* and *work per request*, not round-trip time.

---

## The ledger — where the time actually goes

Every win in this task, by mechanism and breadth. Ordered by what it is worth.

| # | What | Mechanism | Breadth |
| --- | --- | --- | --- |
| R2.1 | Per-staff eligibility fetch | **N requests become 1** | one screen, but N is the staff count |
| R1.1 | No dedupe tiers on payroll hooks | refetches that never needed to happen | **every screen** |
| R3.2 | Payouts list pulls all history | 5 queries over all time become 5 over one month | two busiest screens + the settle |
| R3.3 | Settle awaits two refetches | 4 blocking trips become 2 | the settle |
| R4.1 | Six awaited recomputes of dead columns | ~3 queries removed per write | **every payroll write, both apps** |
| R4.2 | Writes return a row, client asks again | 2 trips become 1 | four write paths |

Everything else in this task is correctness that rides along.

---

## Execution order — four rounds

Reordered from the original audit, which led with the reported bug. **The goal is
speed, so the order is now win-per-risk.** Rounds are independent of each other
except where stated; inside a round, order matters.

| Round | Steps | Why this round | Risk |
| --- | --- | --- | --- |
| **1 — free wins** | tiers, role check, guard | No behaviour changes, no data shape changes | none |
| **2 — the N+1** | kill the per-row fetch | Biggest single win, one screen, self-contained | low |
| **3 — list and settle** | parse, scope, navigate | The reported bug, plus the busiest read | medium |
| **4 — deeper cuts** | dead recomputes, richer responses | Touches services both apps share | medium, gated |

---

# Round 1 — Free wins

No behaviour change, no data shape change, nothing to regress. Do these first
because they cost nothing and one of them is felt on every screen.

## R1.1 — Give the payroll hooks a dedupe tier — **built 2026-09-22**

**Win: every screen. Risk: none.**

Seller declares a tier on twenty hooks. Backoffice declares one on five — and the
payroll hooks, which are most of the app, declare none, so they sit on the root's
30s floor.

| Hook | Data | Should be |
| --- | --- | --- |
| `usePayrollClaimConfigs` | tenant config, changes a few times a year | `STATIC` |
| `usePayrollCommissionConfigs` | same | `STATIC` |
| `useTenantUsers` | staff list, **mounted on six screens** | `COLD` |
| `useUserClaimEligibility` | changes when an admin changes it | `COLD` |
| `usePayrollClaims` | admin review queue | `COOL` |
| `usePayouts`, `usePayslip` | admin-paced | `COOL` |

`useTenantUsers` is the one to feel: six screens mount it, so any navigation
between them more than thirty seconds apart refetches the whole staff list.

Values come from `@tea-pos/utils/swr`, never literals — the tier is the decision,
the number is an implementation detail.

**Blast radius:** caching only. No request changes shape.
**Regression guard:** after a write, the screen showing its result still updates.
That is the one thing a longer dedupe can break, and it is what rounds 2–4's
`mutate` fixes protect. Check the config lists after an edit.

## R1.2 — Role check on the three payout routes — **built 2026-09-22**

**Win: none (this is a bug fix). Risk: none. Four handlers, one line each.**

The proxy matcher excludes `/api/*`, so every route authorises itself. Twenty of
twenty-seven check `role !== "ADMIN"`. The three that do not are `payouts`,
`payouts/[id]` and `payslip` — including the PATCH that marks a payout paid.

**Not exploitable today, and the reason is an accident.** A non-admin never gets
the cookies these routes read: they are set on `response` (`proxy.ts:121,158`)
before the ADMIN gate, but every rejection returns `redirectTo(...)` —
`NextResponse.redirect(new URL(...))`, a fresh response carrying none of them
(`proxy.ts:67-68`). `app/auth/callback/route.ts` checks ADMIN independently too.

So the money route is defended by a side effect of a two-line helper four
functions away, documented nowhere. Make `redirectTo` preserve cookies — an
obvious, well-meant change so `/unauthorized` can greet the user by name — and
the settle opens to every tenant member in the same commit.

**Confirmed by the owner, 2026-09-22: seller and backoffice are not the same
deployment origin.** So the cookies these routes read cannot reach backoffice
from a seller session at all, on top of being host-only (`setUserCookie` sets no
`Domain`). The argument above holds on two independent grounds, and neither is
a reason to leave the check out.

**Blast radius:** the three routes, for admins only.
**Regression guard:** every payout screen still works signed in as admin. A
request with `x-user-info` stripped returns 401 before and after, proving the
change is additive.

## R1.3 — The confirm sheet must not drop its promise — **built 2026-09-22**

`components/shared/FormFooter.tsx:122` was:

```tsx
action={() => { setConfirmOpen(false); onSubmit(); }}
```

The promise was never returned, so `ActionButton` read an instant success: no
spinner over the whole wait, latch released at once, and the rejection reached
nobody because that instance passed no `onError`. The sheet also closed before
the work began, leaving the spinner no host.

Now the sheet stays open and spins for the duration, closing only where the
screen stays: a rejection, or a guard that sent nothing. All six confirm call
sites.

**This made the wait honest, not short.** R3.3 makes it short.

## R1.4 — The settled guard must not fire on your own settle — **built 2026-09-22**

**Win: removes a phantom screen. Risk: low.**

`pay/payouts/[payoutId]/pay/page.tsx:96` renders "Already paid" whenever the
payout is settled. Correct — the screen is reachable by back button, stale tab
and URL, and settling twice would overwrite `paid_at`, `paid_by` and the proof.

But it also fires on the settle made two lines earlier, in the window between the
cache flipping and the navigation committing. That is the flash the owner
reported: not a pop-up, the confirm page re-rendering into its own guard.

Latch in `handleConfirm`; render the form while the settle is ours and in flight.
Cleared in the `catch` and re-thrown, or a failed settle leaves the screen on a
form it will not accept. No `finally`: on success the screen is leaving and the
guard must stay suppressed for the whole navigation gap.

**The plan said to use a ref, and that was wrong.** The React Compiler lint
caught it: `Cannot access refs during render`. The rule is right and so is the
reason — I had copied `ActionButton`'s latch without checking that its reason
transferred. It does not. `ActionButton` guards two taps landing in the same
tick, so it cannot wait for a commit. This guard is read *during render* and only
has to be true before the cache update re-renders the page — a whole network
round trip later, long after React has flushed a `setState`. Built with
`useState`, and the distinction is written next to it so the next reader does not
repeat the copy.

**Blast radius:** one screen.
**Regression guard:** reach that URL by back button after settling — the guard
must still fire. Record the screen when confirming; no "Already paid" frame.

---

# Round 2 — The N+1

**The biggest single win in this task**, and it is why backoffice feels slow even
locally, where round trips are nearly free but fifteen of anything is not.

## R2.1 — One request per staff member on the claim-type edit screen — **built 2026-09-22**

`pay/claim-types/[id]/edit/page.tsx:181-188` maps over every non-admin user and
renders `EligibilityToggle`. That component calls `useUserClaimEligibility(userId)`
at line 26 — **a fetching hook, per row.**

Opening the screen fires one
`GET /api/payroll/claim-types/eligibility?userId=…` **per member of staff**, in
parallel, every time. Fifteen staff is fifteen requests, each paying its own
`getRequestUser`, `getCurrentTenantId`, ADMIN check and query.

It hides inside a correctly layered hook, which is why task 067's layer audit
did not catch it: every individual call obeys the contract. **The cost is in the
cardinality, and no layer rule mentions cardinality.**

**The fix is a list endpoint, not a loop.** Eligibility for every user of one
config in one call. `listUserClaimEligibility`
(`packages/services/payroll-claim-configs.ts:95`) is already the service; it
needs a config-scoped variant, one route, one api client, one hook. The toggle
then takes its value as a prop — which is what it wanted to be anyway. Note it
already accepts `localOverride` as a prop and only reaches for the hook to get
the *other* ids it must preserve on toggle; those come from the list too.

**How it was built, which is smaller than planned.** There was no other caller:
`useUserClaimEligibility` and `getEligibility` had exactly one consumer each —
the screen with the N+1 — so no second path was needed. `listUserClaimEligibility`
became `listClaimEligibility` with an optional `userId`, the route parses a new
`ClaimEligibilityListResponse`, and the client, hook and toggle were replaced
rather than added to. The joined config columns the old select pulled
(`name`, `slug`, `frequency`, `is_enabled`) were never read by anyone: two ids
is the whole answer.

**Blast radius:** one screen, one route, one shared service function whose only
caller is that route. Seller does not import this domain — checked, and its
`tsc` is clean.
**Regression guard:** toggles show the same state as before for a user who is
eligible for some configs and not others. Network panel shows one request where
it showed N.

## R2.2 — Saving eligibility invalidates nothing — **built 2026-09-22**

Rides along with R2.1 and is a one-liner once it lands.

`usePayrollClaimConfigs.setEligibility` calls the api and returns. No `mutate`.
All N eligibility caches keep the old answer.

It looks right on screen only because the page holds `eligibilityOverrides`
(`:60`, `:78`) — local state that paints the new value and **dies with the
screen**. Navigate away and back inside the dedupe window and the toggles show
the pre-save values. R1.1 lengthens that window, which is exactly why this must
land in the same round.

**Built as an unawaited `mutate` with a `.catch`**, not an awaited one. The only
caller saves several users in a `Promise.all` and then navigates away, so
awaiting would have made the revalidation a queue the user watches — the exact
shape R3.3 exists to remove. Writing it the slow way here would have been
shipping the bug while planning its fix.

---

# Round 3 — The list and the settle

The reported bug, plus the read that sits on its critical path. Order inside this
round matters: R3.1 must precede R3.3.

## R3.1 — Parse the payslip response — **built 2026-09-22**

**Win: none directly. Risk: low. It is the safety net R3.3 needs.**

`packages/features/payroll/schema.ts:136-148` declares `PayslipResponse`, exports
it, gives it an OpenAPI title — and it is referenced **nowhere outside its own
file**.

| Where | What happens instead |
| --- | --- |
| `app/api/payroll/payslip/route.ts` | `ok(payslip)`, no parse, unlike the canonical route body |
| `apps/backoffice/lib/api/payroll.ts:51-54` | `apiFetch<unknown>` |
| `apps/seller/lib/api/payouts.ts` | same — and `getPayouts` directly above it *does* parse |
| `lib/hooks/payroll/usePayroll.ts:33-46` | hand-written `Payslip` type + a cast |
| `.../pay/page.tsx:88` | a second hand-written cast |
| seller `.../earnings/[payoutId]/page.tsx:54-56` | a third |

**One schema, three hand-maintained copies, no runtime check on the response that
carries the money.** Task 066 deleted one of those casts; it removed a symptom.

Comes before R3.3 because that step seeds an SWR cache, and **seeding a
hand-written type is how a cache seed introduces a bug the network never would.**

**Blast radius:** both apps' payslip screens.
**Regression guard:** open a payslip for a pending, a paid, a skipped and an
empty payout, in both apps. Expect at least one mismatch — `PayrollCommissionResponse`
omits `payoutId` while the column exists and every read filters on it. A parse
error here is this step working, not a reason to loosen the schema.

## R3.2 — Scope the payouts query — **built 2026-09-22**

**Win: the two busiest payroll screens, and step 4 of the settle chain.**

`pay/payouts/page.tsx:109` calls `usePayouts()` with no params, then filters to
the selected month in JS. With no dates, `listPayouts`
(`packages/services/payroll.ts:168-265`) selects every payout row the tenant has
ever had and runs four `IN` queries across all of their ids. Seller's only call
site passes a filter (`more/earnings/page.tsx:25`).

**The obvious fix is wrong, and it took three passes to see.** The page filters
by *overlap*:

```ts
if (!(start <= monthEnd && end >= monthStart)) return false;   // page.tsx:134
```

`listPayouts` filters by *containment*:

```ts
if (startDate) query = query.gte("start_date", startDate);     // payroll.ts:184
if (endDate)   query = query.lte("end_date", endDate);         // payroll.ts:185
```

Passing `monthStart`/`monthEnd` straight through would **drop every pay period
that straddles a month boundary** — on a fortnightly cadence, most months. A
payout would silently vanish from the list it is due in.

So the fix goes in the service: **give `listPayouts` overlap semantics**, which
is what every caller already means by a date range.

```ts
if (endDate)   query = query.lte("start_date", endDate);
if (startDate) query = query.gte("end_date", startDate);
```

Pass `keepPreviousData: true` so switching month holds the previous rows instead
of collapsing to a skeleton.

**Blast radius:** `listPayouts` is shared. Seller passes `userId` alone, so it is
unaffected — confirm that rather than assume it.
**Regression guard:** a fortnightly payout spanning 28 Sep – 11 Oct appears under
**both** September and October, before and after. That one case is the whole
step.

## R3.3 — Navigate on the write, refresh after it — **built 2026-09-22**

**Win: 4 blocking round trips become 2.**

Today the settle runs everything before the screen moves:

| # | Call | Server work |
| --- | --- | --- |
| 1 | `POST /api/upload` | phone → Vercel → Storage, ~400KB |
| 2 | `PATCH /api/payroll/payouts/{id}` | 1 select + 2 count + 1 update |
| 3 | `GET /api/payroll/payslip` | 1 joined select + 2 selects + 1 signed URL |
| 4 | `GET /api/payroll/payouts?` | 1 select over all history + 4 `IN` queries |
| 5 | `navigation.replace(...)` | the screen finally changes |

Steps 3 and 4 are cache maintenance. Step 3 also costs more *because* step 2
succeeded — `getPayslip` (`payroll.ts:549-558`) signs the proof URL, and before
this write there was no proof to sign. **The settle makes its own confirmation
more expensive.**

Seller already has the right shape
(`apps/seller/.../home/manage/close/page.tsx:292-295`):

```ts
mutateSession();                       // not awaited
navigation.push(url(...));             // next line
```

So: await the PATCH, seed the payslip key from its response with
`revalidate: false`, leave the two revalidations unawaited, navigate.
`updatePayoutStatus` already returns the updated row (`payroll.ts:474`), and
after R3.1 the shape is checked.

**The seed is not optional.** Without it the payslip screen shows a cached
`pending` payout for the length of the refetch — a money screen saying the
opposite of what just happened, worse than the wait it replaces.
`usePayrollUserInfo.update` already does exactly this with `mutate(updated, false)`:
the pattern is in the repo, one directory away.

Three things that must be in the diff or this step adds a bug:

- **A `.catch` on the unawaited revalidations.** A floating rejection is an
  unhandled promise rejection and a console error the user can see.
- **They must survive the unmount they are racing.** `useSWRConfig`'s `mutate` is
  cache-level and keeps running; say so in a comment, because the symptom of
  someone later moving it into a `useEffect` cleanup is a stale list nobody can
  reproduce.
- **Walk the double-submit defence, do not assume it.** Navigating sooner widens
  the window. Three layers stand: `ActionButton`'s ref latch (no `resetOnSuccess`
  on that instance, so it stays busy through the navigation), R1.4's guard, and
  the server's 422 (`payroll.ts:424-429`). Do not rely on the last alone.

**Blast radius:** the settle flow.
**Regression guard:** the screen changes within the PATCH's own time. The
destination shows `paid` immediately, never `pending`. Two fast taps produce
exactly one request — read the network panel, not the UI.

## R3.4 — Approving a claim tells nobody — **built 2026-09-22**

Rides along. `usePayrollClaims.updateStatus` mutates its own key and stops, while
approving a claim moves the payout's totals and changes the payslip — two other
keys, both stale afterwards. `usePayslip`'s writes already do this correctly with
`refreshPayoutLists`; this hook was written without it.

---

# Round 4 — Deeper cuts

Both touch services that seller shares. **Deliberately not started**: R4.1
removes six awaited recomputes from write paths that include seller's close day
and seller's claim submission, and R4.2 changes four response shapes. Rounds 1–3
already change enough of backoffice to be worth landing and watching on their
own — shipping round 4 on top would make a regression in either one hard to
attribute, which is the opposite of the "do not hurt existing code" constraint.

The gate below has been run so round 4 can start cold without re-deriving it.

## R4.1 — Stop maintaining totals nobody reads

**Win: every payroll write in both apps.**

`payroll_payouts` stores five totals: `commissions_total`, `claims_total`,
`total_pay`, `total_cups`, `total_orders` (`packages/db/types.ts:299-317`).

**Nothing reads them.** `listPayouts` overwrites all five in the response with
freshly summed values (`payroll.ts:253-257`); `getPayslip` computes its own
(`payroll.ts:537-547`). Every screen reads the computed ones.

The payslip response ships both numbers in one body — the nested payout carries
the stored totals, the top level the computed ones. They can disagree and nothing
notices, which is R3.1's missing parse showing its teeth.

Six call sites maintain them, all awaited. The count went 2 → 5 → 6 across the
audit passes, which is itself the argument: nobody could see how much of the
codebase was paying for this.

| Caller | Where | Whose screen waits |
| --- | --- | --- |
| `updatePayrollCommission` | `payroll.ts:608` | backoffice approve |
| `reviewPayrollDay` | `payroll.ts:736` | backoffice approve-all |
| `updatePayrollClaimStatus` | `payroll-claims.ts:338` | backoffice claim decision |
| `createAutoClaimsForDailySummary` | `payroll-claims.ts:290` | seller close day |
| `createPayrollCommissions` | `payroll.ts:124`, **once per user, in the loop** | seller close day |
| `createPayrollClaim` | `payroll-claims.ts:181` | **seller — staff submitting a claim** |

That last one was missed until the final pass. The dead recompute is not a
backoffice problem: a seller waits on it every time they submit a claim.

### The decision reversed twice

Pass one said derive. Pass two said snapshot, because `store_daily_summaries`
stores period totals and reads them (`summaries.ts:144-148, 390, 406-410`) — a
working precedent in the same schema. Pass three says **derive**:

1. **The precedent does not transfer.** Summaries snapshot totals derived from
   *orders* — hundreds a day, unbounded. A payout's totals come from commissions
   and claims: tens of rows per period, ever. Summaries snapshot to escape
   volume. Payouts have no volume to escape.
2. **Snapshot moves the risk onto writes that swallow their errors.** All six
   call sites end `.catch(console.warn)`. Survivable only *because* nothing reads
   the result — the read recomputes, so it self-heals. Start reading the column
   and a swallowed failure becomes a wrong number on a payslip.
3. **Derive makes the writes faster**, and writes are what a person waits on.
   Snapshot optimises the list read, which R3.2 already fixed by scoping it.

### R4.1a — Gate: prove the columns are unread — **run and passed 2026-09-22**

The audit claimed nothing reads those five fields. Verified rather than assumed,
because being wrong means a screen silently renders zero.

- In `packages/services`, `commissions_total` / `claims_total` / `total_pay`
  appear only as **writes**: the response override at `payroll.ts:265-267` and
  the upsert at `payroll.ts:348-350`. No service selects them to return them.
- Every route that surfaces a payout row goes through `listPayouts` (which
  overrides all five) or `getPayslip` (which recomputes). Both apps, four routes.
- **One exception found, and it is inert.** `POST /api/payroll/payouts` returns
  `upsertPayout`'s row, stored totals and all — but no client calls it.
  `payrollApi.upsertPayout` exists in `lib/api/payroll.ts:58` and has zero call
  sites: it was the upsert-on-open that `usePayslip` removed. So the route and
  its client are both dead, and they are the only path by which a stored total
  could reach a screen. Delete them with R4.1b rather than carrying them.

**Verdict: derive is safe.** No screen reads these columns.

### R4.1b — Split `upsertPayout` — **built 2026-09-22**

`ensurePayout(tenantId, userId, startDate, endDate)` — upsert the identity
columns, return the row, stamp `payout_id` on unassigned commissions and claims
in the window. No sums. The six call sites call this instead. Per call it drops
two selects and shrinks the upsert.

**Two things to settle while in there.** `createPayrollCommissions` stamps
`payout_id` twice — `upsertPayout` already backfills it (`payroll.ts:351-368`)
and then `:128-134` updates the same row again; one is dead. And the backfill
`.catch`-logs its error (`:368`) while being the one load-bearing part — after
the split that is the only thing the function does, so a failure is the caller's
problem.

**Keep the `payout_id` backfill.** Both columns are nullable
(`types.ts:78,212`) and both `getPayslip` and `listPayouts` filter on them, so
stamping is what gives a payout contents at all.

### R4.1c — Drop the columns — **deliberately not built**

The only step of this task left undone, and on purpose. Dropping five columns
from a money table is irreversible, and R4.1b has not run against real data for
a single day. They are inert after the split — written by nothing, read by
nothing — so carrying them costs only the explanation above.

Do it when R4.1b has been live long enough to trust, with
`supabase migration new drop_payroll_payout_totals`. The developer pushes.

**What this does not fix:** `listPayouts` still runs four `IN` queries — that is
the derive side of the trade, and after R3.2 they cover one month rather than all
history. If it ever hurts, the answer is a view or an aggregate, not a column the
application maintains by hand.

## R4.2 — A write returns what the screen shows next

**Win: 2 round trips become 1, on four write paths.**

CLAUDE.md already says a service finishes what the caller is waiting for. The
settle satisfies the letter and not the point: it writes the row, returns the
row, and the client asks a second question to find out what the row *means*.

If `PATCH /api/payroll/payouts/{id}` returned the `PayslipResponse` shape, step 3
of the settle chain disappears — not deferred, gone — and R3.3's seed becomes the
contract rather than a trick. Same for `PATCH .../commissions/{id}`,
`PATCH .../claims/{id}` and `POST .../reviews/day`.

**One route per commit, settle first.** Each is a breaking change to its api
client's parse *and* its hook's return, so a route lands whole or not at all.
Four in one diff is a single revert that takes the lot.

**Blast radius:** per route, both the client and the hook.
**Regression guard:** one request where there were two, and the screen's numbers
identical to a hard refresh.

---

## Measuring

The owner should not have to read a network panel.

**Costs nothing:** query counts and requests-per-screen are static and already
counted above. The before/after for R1.1, R2.1, R3.2 and R4.1 can be read off the
code.

**Costs one tap:** real timings. Add a timing log to `lib/api/response.ts` — one
small change, instruments every route at once, reverted after. Owner runs the dev
server and does one settle and one open of the claim-type edit screen. The
numbers come off the terminal.

Do this **before round 2 and before round 3**, so each round has a
before-figure. Without it every number in this document is a count, not a
measurement, and should be described that way.

**Honest estimate for the settle, pending that measurement.** After round 3 it is
the upload plus the write — roughly 1.2–1.8s if today's ~3s splits evenly across
the four trips, probably better since step 4 is the unbounded query. After moving
the upload off the path (Deferred, below), roughly 0.3–0.5s. These are estimates
with stated assumptions.

---

## Rules to write down — **written into CLAUDE.md 2026-09-22**

Each defect above was reachable because a rule was missing. All seven now sit in
the layered-architecture section, beside "a service finishes what the caller is
waiting for" — each phrased as a cost, with the failure from this task named in
it so the rule carries its own evidence:

> **A write navigates when the write lands, not when the cache catches up.**
> Seed the destination's key from the response, then revalidate without awaiting
> it — with a `.catch`, because a floating rejection is a bug. A refetch awaited
> before a navigation is a round trip the user watches instead of one the app
> absorbs.

> **A fetching hook never goes inside a `.map`.** A list screen fetches a list. A
> hook called per row is a request per row, and it is invisible in review because
> each call is correctly layered — the cost is in the cardinality, which no
> import list shows.

> **A guard that refuses a repeat must tell the repeat from the original.** Any
> screen that re-reads its own write will, for one render, look like the stale
> tab its guard was written for.

> **A response schema that nothing parses is a comment.** If a `Response` type
> exists in `packages/features`, the api client parses with it. Otherwise the
> copies downstream are the real contract.

> **A derived total is stored only to escape volume.** Orders per day justify a
> snapshot; tens of rows per period do not. A stored total the read path
> recomputes anyway is not a cache, it is a second opinion.

> **A route authorises itself.** The proxy does not match `/api/*`, so a route
> whose neighbours check a role and which does not is either an exception with a
> written reason, or a hole.

---

## Deferred

- **Upload the proof at photo-pick time.** After R4.2 the settle is one blocking
  trip plus the upload; this removes the upload. The largest remaining win, and
  deferred only because handling a failed upload and a replaced file is real
  work.
- **Row approve is not optimistic** while `reviewDay` is
  (`usePayroll.ts:99-121`). Three writes in one hook, one behaving differently,
  undocumented.
- **`updatePayoutStatus` runs two count queries** (`payroll.ts:431-444`) where
  one filtered update would do — `reviewPayrollDay` has the pattern, written up
  at `payroll.ts:663-666`.
- **`getPayslip` signs the proof URL for an hour on every read** while the hook
  caches for far less, so it re-signs roughly every refetch.
- **`createPayrollCommissions` is N+1 on seller's close day** — one order query
  per session per user. R4.1b shrinks it; it does not flatten it.
- **A cadence change can extend an unpaid payout's window.**
  `getPayWindowBounds` anchors multi-week periods to a fixed epoch
  (`packages/utils/week.ts:106-129`) while weekly uses the ISO Monday, and the
  upsert conflicts on `tenant_id,user_id,start_date`. Settled payouts are
  protected by `payroll.ts:286-288`; unpaid ones absorb the extra week.
- **The mobile layout comment says five prefetch routes; the table marks three.**
  `app/[tenantSlug]/mobile/layout.tsx:17` against `config/navigation.ts`.

## Checked and found fine

So the next pass does not re-open them:

- **`useDailySales` mounted twice on home** (`Totals.tsx:21`,
  `DailySalesChart.tsx:54`). Both pass `DAYS = 14` and the same store id, so it
  is one key and SWR serves one request.
- **The layer contract.** Task 067 held — zero backoffice hooks call `apiFetch`,
  zero components call an api client. Every defect in this task sits *inside* a
  correctly layered hook, which is the point of R2.1's rule.


---

## What shipped, and what did not

Built 2026-09-22 in one session. Both apps typecheck, build and emit service
workers. Backoffice lints clean; seller's four remaining lint errors are
pre-existing, in `close/page.tsx`, `LanguageContext.tsx` and
`RealtimeContext.tsx`, none of which this task touched.

| | Step | State |
| --- | --- | --- |
| R1.1 | Dedupe tiers on every payroll hook | built |
| R1.2 | ADMIN check on the three payout routes | built |
| R1.3 | Confirm sheet returns its promise | built |
| R1.4 | Settled guard ignores its own settle | built, as state not a ref |
| R2.1 | Per-staff eligibility fetch → one request | built |
| R2.2 | Saving eligibility invalidates | built, unawaited |
| R3.1 | Payslip response parsed, three copies deleted | built |
| R3.2 | `listPayouts` overlap semantics, list scoped to its month | built |
| R3.3 | Settle navigates on the write | built |
| R3.4 | Claim status invalidates payout and payslip | built |
| R4.1a | Gate: prove the columns are unread | run, passed |
| R4.1b | `upsertPayout` → `ensurePayout`, six call sites | built |
| R4.1c | Drop the five columns | **not built** — gated, see above |
| R4.2 | Settle route returns the payslip | built for the settle |
| D | Rules written into CLAUDE.md | built |

### R4.2, the three routes not built

`PATCH /commissions/[id]`, `PATCH /claims/[id]` and `POST /reviews/day` still
return their own row or a count, so their hooks still refetch the payslip.

**The blocker is a design decision, not effort.** To return a payslip a route
needs the payout id, and none of the three has it: the commission and claim rows
carry `payout_id` but it is nullable, so a route that returned a payslip only
when it happened to be set would have two response shapes — worse than the
refetch it replaces. The clean version is to take the payout id from the client,
which already knows it (`PATCH /api/payroll/commissions/{id}?payoutId=…`), so
the route can always answer with a payslip. That changes the *input* contract of
three money routes, which is not something to land at the end of a long session.

What did land for those three: the payouts-list refresh is no longer awaited, so
an approve waits on the payslip it repaints and nothing else. Roughly half the
win, none of the risk.

### Extra fixes made in passing

- **Two `set-state-in-effect` lint errors**, pre-existing, in the claim-type and
  commission-type edit screens. Both seeded their form from an effect, so the
  form painted empty once before the values arrived. Moved to the documented
  adjust-during-render pattern. Backoffice went from one lint error to none.
- **The dead `POST /api/payroll/payouts` route and `payrollApi.upsertPayout`**,
  both deleted. R4.1a found them: zero call sites, and the only path by which a
  stored total could have reached a screen.
- **The double `payout_id` stamp** in `createPayrollCommissions`, deleted.

### The one plan error worth remembering

R1.4 was planned as a ref, copying `ActionButton`'s latch. The React Compiler
lint refused it — `Cannot access refs during render` — and was right: that latch
uses a ref because two taps land in the same tick, and this one is read during
render and only has to beat a re-render a network round trip away. Built with
`useState`, with the distinction written beside it.
