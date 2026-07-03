# Task 033 — Close-Day Commissions Silently Not Created

## Context

Reported: closing a store today produced auto-submit claims correctly, but
zero `payroll_commissions` rows for the same daily summary — no error in
Vercel logs, no error in Supabase logs, reproducible every time. Investigated
live against the recent PR (#84, "Polish UI, enhance payouts functionality,
and cleanup flags") on the assumption it caused a regression. It didn't
directly — the payroll.ts diff in that PR is additive only (zero-rate
auto-approve, see Bug 2 below) and contains nothing that would throw. The
real defect is structural and predates that PR.

---

## Bug 1 (critical) — commissions creation loses a race it was never
guaranteed to win

**File:** `apps/seller/app/api/summaries/route.ts:69-86`

```ts
if (body.data.closedAt) {
    const s = summary as { id: string; storeId: string; date: string };
    await endSessionsForSummary(supabase, { tenantId, dailySummaryId: s.id });
    createPayrollCommissions(supabase, { ... })
        .catch((e) => console.error("[payroll] createPayrollCommissions failed:", e));
    createAutoClaimsForDailySummary(supabase, { ... })
        .catch((e) => console.error("[payroll] createAutoClaimsForDailySummary failed:", e));
}
// ...
return ok(parsed.data);   // returns without awaiting either call above
```

Neither call is `await`ed. On Vercel, an un-awaited promise kicked off inside
a Route Handler is not guaranteed to keep running once the response is sent —
there's no `waitUntil`/`after()` anywhere in this repo. This is a documented
platform gotcha, not a bug in Postgres/Supabase — which is why nothing shows
up in either app or DB logs when it happens. The work doesn't error; it's cut
off before it has a chance to.

**Why claims usually wins that race and commissions never does** — not
because claims does dramatically less *total* work (correction below), but
because it reaches its durable state — the row actually landing in the DB —
in fewer round trips than commissions does:

- `createAutoClaimsForDailySummary` (`packages/services/payroll-claims.ts`):
  one `store_sessions` fetch (shared across all users), then per user: one
  eligibility query, then straight to the insert. The row is safely in the
  DB after ~2 round trips. `upsertPayout` (see below) is called *after* that,
  so even if it gets cut off, the claim row itself already exists.
- `createPayrollCommissions` (`packages/services/payroll.ts:17-129`): before
  it can insert anything, it first needs a per-session `store_orders` query
  (one per session, sequential, inside a nested loop) plus `getPayrollUserInfo`
  — both round trips have to complete just to compute the values the insert
  needs. Only then does the insert happen. More required work stands between
  "function starts" and "row exists" than on the claims side.

**Correction to an earlier draft of this doc:** I'd originally described
`upsertPayout` (called once per user, from *both* functions, right after
their own insert) as adding "2 parallel queries" to the chain. Rereading
`packages/services/payroll.ts:260-362`, the commissions-total and
claims-total lookups inside `upsertPayout` are two separate sequential
`await`s, not parallel — only the final `payout_id` backfill step uses
`Promise.all`. That also means `upsertPayout`'s cost (existing-payout lookup
→ commissions total → claims total → upsert → parallel backfill, ~5 round
trips) is paid by *both* functions, not just commissions — so the two
functions' total workload is closer than "25-30 vs 5-8 round trips" implied.
The real, narrower claim: commissions has more mandatory work *before* its
insert; claims gets its insert done early and pays its `upsertPayout` tax
afterward, once the important part is already safe. See the "is close-day
heavy" section below for what this means for the follow-up perf work — it
makes consolidating the duplicate `upsertPayout` call more valuable than
originally framed, not less.

By the time the handler finishes building its JSON response (right after
firing both), essentially no extra wall-clock time has been granted to
either — this is why it's 100% reproducible rather than flaky. It's not a
timing coin-flip so much as commissions structurally needing more to happen
before it reaches safety.

Ruled out: the recent Supabase "degraded performance" incident (existing,
non-restarted/resized projects are explicitly not affected per their status
page) and a stray Postgres error a teammate hit via the Supabase dashboard
(unrelated query, different table, different session — `application_name:
supabase/dashboard`).

### Fix — make correctness not depend on winning a timing race

Await both calls, and run them concurrently with each other since they're
independent:

```ts
if (body.data.closedAt) {
    const s = summary as { id: string; storeId: string; date: string };
    await endSessionsForSummary(supabase, { tenantId, dailySummaryId: s.id });

    const [commissionsResult, claimsResult] = await Promise.allSettled([
        createPayrollCommissions(supabase, { tenantId, storeId: s.storeId, dailySummaryId: s.id, date: s.date, triggeredByUserId: user.id }),
        createAutoClaimsForDailySummary(supabase, { tenantId, storeId: s.storeId, dailySummaryId: s.id, date: s.date, triggeredByUserId: user.id }),
    ]);
    if (commissionsResult.status === "rejected") console.error("[payroll] createPayrollCommissions failed:", commissionsResult.reason);
    if (claimsResult.status === "rejected") console.error("[payroll] createAutoClaimsForDailySummary failed:", claimsResult.reason);
}
```

`Promise.allSettled` (not `Promise.all`) so one failing doesn't throw the
whole route handler and fail the close itself — the day is already closed and
sessions already ended by this point, which is the part that must not fail.
Commission/claim generation failing is now a loud, logged, retryable failure
instead of a silent one — see the idempotency fix below for what makes it
safely retryable.

This trades a snappier "day closed" response for correctness. Closing a day
is a once-a-day, non-latency-sensitive action; a couple of extra seconds is a
reasonable and honest tradeoff for "commissions are actually created."

---

## Bug 2 (real, separate, found in the same review but not the cause of Bug 1)
— zero-rate auto-approve catches unconfigured employees too

**File:** `packages/services/payroll.ts:78-82` (added in PR #84)

```ts
const commissionConfigSlug = (info?.commissionConfigSlug as string | null) ?? null;
const ratePerCup = (info?.ratePerCup as number | null) ?? 0;
...
const commissionStatus =
    ratePerCup === 0 || commissionConfigSlug === "SELLER_0" ? "approved" : "pending";
```

`getPayrollUserInfo` (`packages/services/payroll-user-info.ts:17-40`) returns
`null` when a user has no `payroll_user_info` row at all — i.e. any employee
whose payroll has never been configured, not just genuine zero-rate/
family-business staff. `ratePerCup` then defaults to `0` via `?? 0`, which
trips `ratePerCup === 0` and silently auto-approves a Rp 0 commission — the
exact case the pending-review queue exists to catch (missing rate config).
Before this PR that same Rp 0 case landed as `status: "pending"` and surfaced
in the "Needs Review" queue.

**Fix:** key off the config slug only, never the rate value:

```ts
const commissionStatus = commissionConfigSlug === "SELLER_0" ? "approved" : "pending";
```

If genuinely-zero-rate configs other than `SELLER_0` need to auto-approve
too, check `info !== null && ratePerCup === 0` (rate explicitly configured
*and* zero) instead of defaulting an absent config to zero.

Not urgent to ship alongside Bug 1's fix, but should be fixed in the same
pass since it's in the same function and was found in the same review.

---

## Design question raised: is close-day "heavy" and should it be?

Yes, structurally, and more than it needs to be — independent of the
await/race fix above, `createPayrollCommissions` does more work than the
data actually requires:

1. **Per-session `store_orders` query, scoped by `created_at` range.**
   `store_orders` now has a `daily_summary_id` column directly (added in PR
   #78, "Add daily_summary_id to orders"). The current code still re-derives
   the day's orders by querying per-session timestamp ranges — one query per
   session, N sessions per user. This can be replaced with a **single query
   for the whole daily summary** (`.eq("daily_summary_id", dailySummaryId)`),
   grouped by `user_id` in memory. Removes N-1 round trips per user with
   multiple sessions (split shifts, transfers) and removes the clock-skew
   session-boundary edge cases entirely (the reason `Math.max(0, ...)` had to
   be added to the claims side in commit `1b3cf15`).
2. **Sequential per-user loop, no parallelism.** `for (const userId of
   userIds)` processes one user fully (order query → info lookup → insert →
   `upsertPayout` chain) before starting the next. (The activity-log call in
   between is fire-and-forget — `log(...)` is never `await`ed, per the
   established `createLogger` pattern — so it doesn't add to this chain's
   latency, only to background DB load.) These per-user iterations are
   independent and safe to run concurrently — `Promise.all` (or a small
   concurrency-limited batch if there's a DB connection-count concern) turns
   N sequential users into effectively 1 user's worth of wall-clock time.
3. **`upsertPayout` called twice per user, once each from commissions and
   claims, independently — this is the single heaviest chunk of work in
   both functions, not a minor duplication.** Each call is ~5 sequential
   round trips on its own (existing-payout lookup → commissions total →
   claims total → upsert → parallel backfill — see the correction above).
   Both functions call it right after their own insert, so with Bug 1's fix
   running them concurrently via `Promise.allSettled`, a given user gets two
   near-simultaneous 5-round-trip read-modify-write cycles against the same
   `payroll_payouts` row. Fine correctness-wise (`upsertPayout` is an
   upsert), but given it's roughly half of each function's total work,
   consolidating to a single call — after both commissions and claims finish
   for a user — is the highest-leverage perf item here, more so than
   originally framed below. Worth prioritizing over the `store_orders`
   batching if only doing one.
4. **The blanket idempotency guard is all-or-nothing, unlike claims.**
   `payroll.ts:23-29` — if *any* `payroll_commissions` row exists for a
   `daily_summary_id`, the whole function no-ops for every user, silently.
   Claims instead catches per-row unique-constraint violations (`23505`) and
   continues. Once Bug 1 makes failures retryable (loud + `Promise.allSettled`
   means a client could reasonably retry the close), a partial commissions
   failure — say, insert succeeds for user A, throws for user B — permanently
   blocks user B from ever getting a commission for that day, because the
   next attempt short-circuits at the top the moment it sees user A's row.
   **This guard should become per-user idempotent**, matching claims: catch
   `23505` per insert and `continue`, rather than a single count check up
   front. This is what actually makes retries safe.

### Recommended plan of action (in order)

1. **Bug 1 fix** — `await` via `Promise.allSettled` in
   `apps/seller/app/api/summaries/route.ts`. This alone makes commissions
   reliable; everything else below is optimization/hardening on top of a
   now-correct baseline.
2. **Bug 1b** — make `createPayrollCommissions`'s idempotency guard per-user
   (catch `23505`, `continue`) instead of a blanket count check, so a retried
   close-day request can't be permanently blocked by one bad row.
3. **Bug 2 fix** — zero-rate auto-approve should key off `commissionConfigSlug`
   only, not `ratePerCup === 0`.
4. **Perf** — replace the per-session `store_orders` range query with one
   query per daily summary via `daily_summary_id`, grouped in memory by user.
5. **Perf** — parallelize the per-user loop in `createPayrollCommissions`
   with `Promise.all`.

(4) and (5) are not required to fix the reported bug — (1) alone does that —
but they're the right follow-up given the answer to "is close-day heavy": yes,
unnecessarily so, and shrinking the work is a better long-term fix than just
being willing to wait longer for it.

---

## Implementation order

1. Fix Bug 1 (route.ts — await + `Promise.allSettled`)
2. Fix Bug 1b (payroll.ts — per-user idempotency)
3. Fix Bug 2 (payroll.ts — zero-rate condition)
4. Verify manually: close a day with 2+ staff sessions, confirm both
   `payroll_commissions` and `payroll_claims` rows land every time
5. (Separate follow-up, not blocking) — perf items 4 and 5 above

---

## Additional perf item found while scoping this — `getPayrollUserInfo` called
once per user, twice total (once from commissions, once from claims)

Both `createPayrollCommissions` and `createAutoClaimsForDailySummary` call
`getPayrollUserInfo(supabase, { tenantId, userId })` inside their own
per-user loop — a single-row query each time. For a store with N staff that's
2N queries for data that's really "give me payroll_user_info for these N
users." Batch it: one `.in("user_id", userIds)` query per function (or
shared between both, if they end up merged — see below) instead of N.
Same category of fix as the `store_orders` batching above — not required for
correctness, worth doing in the same pass since it's the same pattern.

Bigger version of this same idea: `createPayrollCommissions` and
`createAutoClaimsForDailySummary` are two independent functions today, but
they operate on the exact same input (`dailySummaryId`) and the exact same
per-user data (sessions, `payroll_user_info`, `upsertPayout`). Once both are
awaited from the same call site (Bug 1 fix), there's a real argument for
merging their per-user loop into one pass — fetch sessions once, fetch
`payroll_user_info` once per user, do commission logic and claims logic
back-to-back, call `upsertPayout` once at the end instead of twice. This
would roughly halve the round-trip count on top of the batching fixes above.
Flagging as a real option, not committing to it here — it's a larger
refactor than this bug-fix task warrants; worth its own task if the batched
version still isn't fast enough in practice.

---

## Reconciliation safety net — considered, recommend a scoped-down version

Raised: should there be a scheduled sweep (e.g. pg_cron at midnight) that
catches any daily summary that closed without generating commissions/claims,
in case the primary path fails silently again for a reason not yet found?

**pg_cron specifically: no, doesn't fit this codebase.** All payroll business
logic lives in `packages/services/*.ts` by design (see CLAUDE.md's layered
architecture — services use `SupabaseClient`, never raw SQL business logic).
A pg_cron + plpgsql job would mean reimplementing commission/claim math a
second time in SQL, in a different language, invisible to the TS layer that
owns this domain everywhere else. That's a maintenance liability (two
implementations to keep in sync) for a problem that (post Bug 1b) is already
solved at the source.

**The underlying instinct is right, though — a reconciliation sweep is cheap
insurance for financial data, and it's now cheap to build because Bug 1b
makes both generator functions safely re-callable.** Right version of it:

- A Vercel Cron (`vercel.json` cron entry, or Next `route.ts` + `CRON_SECRET`
  header check — same pattern this repo would use for any scheduled job)
  hitting a small API route once a night.
- The route queries `store_daily_summaries` for `closed_at IS NOT NULL` in
  roughly the last 48h, left-joins against `payroll_commissions` /
  `payroll_claims` by `daily_summary_id`, and calls
  `createPayrollCommissions` / `createAutoClaimsForDailySummary` again for
  any summary missing rows it should have. Both are already idempotent
  per-user after Bug 1b, so re-calling them for a summary that's actually
  fine is a safe no-op, not a duplicate-data risk.
- This reuses the existing TS services as-is — no logic duplicated, no new
  language, consistent with everything else in the repo.

Worth building, but as a follow-up after Bug 1/1b/2 ship and are confirmed
working — it's a backstop for "the fix has a fix," not a substitute for
fixing the actual bug. Sequencing: ship the direct fix first, add the sweep
once the direct fix has a day or two of confirmed clean closes behind it.
