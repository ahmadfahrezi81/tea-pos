# Task 040 — Session Transfer Duplicate Writes (offline queue replay)

## Context

Prod, 2026-08-01 14:38:29 UTC (21:38 WIB):

```
POST /api/sessions/transfer → 500
duplicate key value violates unique constraint "one_active_session_per_store"
Referer: /tealicious/mobile/home/manage/close?summaryId=f4833c64-…
```

Store `f559445e`, summary `f4833c64`. The session rows for that day (all
timestamps below are UTC, as stored):

| id | code | user | started_at | prev |
|---|---|---|---|---|
| cdb6486f | 69 | 390d… | 02:58:06 | — |
| e5e4e152 | 69 | 0edb… | 03:14:32.74 | cdb6486f |
| 40c1da7e | 95 | 0edb… | 03:14:35.05 | e5e4e152 |
| 6c3e36e2 | 95 | 390d… | 14:37:57.39 | 40c1da7e |
| be0557f8 | 90 | 390d… | 14:38:29.92 | 6c3e36e2 |

Two rows point at a `previous_session_id` held by **the same `user_id`** —
`40c1da7e` and `be0557f8` are sessions that transferred to themselves. No
human typing a claim code can produce that. The 500 is one of a pair of
identical requests that raced; the surviving one wrote `be0557f8`.

The user-facing symptom is near-zero, which is why this went unreported for
six weeks: the failing request is a background replay whose error is caught
and logged by `useMutationSync`, never surfaced. Staff confirmed they felt
nothing unusual.

> **Status: ALL PHASES APPLIED** (2026-08-01, uncommitted on `staging`).
> Phase 3's migration is already pushed and `packages/db/types.ts` regenerated.
> Phase 4 is closed — no work. Deviations from the plan as written are recorded
> under "What shipped".

---

## Root cause 1 (the bug) — successful mutations are written to the offline
## queue and replayed

`apps/seller/lib/hooks/sessions/useSession.ts:131-139`

```ts
const transferSession = async (claimCode) => {
    const result = await sessionsApi.transfer({ storeId: storeId!, claimCode });
    mutate({ gate: "open", session: result }, false);
    mutationQueue.add("transferSession", { claimCode });   // ← already succeeded
    ...
};
```

The mutation is enqueued *after* the request has already landed, and nothing
records that it landed. `useMutationSync` (`packages/utils/offline/useMutationSync.ts:100`)
syncs on mount and then every 10s, so the same POST is fired a second time
within seconds. Identical shape in `openStore` (`:70`), `resumeSession`
(`:105`) and `endSession` (`:169`).

Introduced in `67ecdaf` (2026-06-16, "hybrid realtime+polling session gate
system with offline-first resilience") — that commit replaced a plain
`mutate()` pair with the queue calls. ~6.5 weeks in prod. Nothing in the last
month of commits touches this path; the recent seller work is all UI.

**Why it almost never shows.** The replay carries the *old* claim code, and
`transferSession` (`packages/services/sessions.ts:237`) rejects a code that
doesn't match the current active session. The new session gets
`generateClaimCode()` — a fresh number in 10–99 (`sessions.ts:6`), 90 possible
values. So ~98.9% of replays get a 403, which `useMutationSync:61` treats as
terminal and silently drops. **Roughly 1 transfer in 90 draws the same code it
just replaced, and the replay is accepted.** That is exactly what the `69,69`
and `95,95` pairs in the table above are: the collisions. The bug has fired on
every single transfer since June 16; luck decided which ones left a mark.

The 403 is real, not swallowed on the way out: `toApiError`
(`packages/utils/errors.ts:14-16`) reads `.status` off the thrown `Error`, so
the route returns a genuine 403 and `useMutationSync` drops it. **And
`handleError` only logs at `status >= 500`** (`apps/seller/lib/api/response.ts:27`),
so a rejected replay leaves no trace in the Vercel logs either — which is why
six weeks of this produced exactly one visible error. That same line is what
surfaced the incident: a raw Postgres duplicate-key error carries no `.status`,
so `toApiError` defaults it to 500 and it gets logged.

`31c3278` (2026-06-21, "fix stale mutation replay") touched this exact
machinery — it added the 403/404/409 terminal-drop. It made the replay quieter
without asking why an already-applied mutation was in the queue at all. That
403 path has been absorbing the evidence ever since.

---

## Root cause 2 (the crash) — one global queue, N replayers

`useMutationSync` is called from inside `useSession`, and its
`syncInProgressRef` is per hook instance while `mutationQueue` is a module
singleton (`MutationQueue.ts:120`). Every mounted `useSession` therefore runs
its own replay loop over the same shared queue.

`useSession` is mounted 7 times across the app; on the close page — the
referer in the error — three are live at once:

- `app/[tenantSlug]/mobile/home/layout.tsx:21`
- `app/[tenantSlug]/mobile/home/manage/layout.tsx:15`
- `app/[tenantSlug]/mobile/home/manage/close/page.tsx:48`

Navigating there mounts all three, each fires its initial sync in the same
tick, and the queued `transferSession` goes out 2–3× concurrently. That is the
32-second gap between `6c3e36e2` (14:37:57, the real takeover) and the burst at
14:38:29 (the seller opening close-day).

Each instance also opens its own realtime channel subscription
(`useSession.ts:27-48`) — same multiplication, separate cost. See "Worth
refactoring?" below.

---

## Root cause 3 (the sharp edge) — `transferSession` is a non-atomic
## read-modify-write

`packages/services/sessions.ts:222-261` — fetch active session → check code →
`update` it to `ended` → `insert` the new one. Three separate round trips (the
code check is in-process), no transaction, no row lock. Two concurrent callers both read the same active
session, both pass the code check, both end it, then both insert; the partial
unique index catches the second insert and the route returns 500.

The index guarantees **at most one** active session. It does not guarantee
**at least one**, and it cannot tell a ghost transfer from a real one:

- **The serialized replay is not blocked at all.** One active session before,
  one after — the constraint is satisfied. Those are the phantom rows. The DB
  is not saving us here; the random claim code is.
- **The `update` is never rolled back when the `insert` fails.** In this
  incident the winner's row covered the gap. If an insert ever fails on its own
  (timeout, transient error), the store is left with **zero** active sessions,
  the gate flips to `no_session`, and the seller is locked out mid-shift until
  someone resumes. This is the real hazard and it is pure luck it hasn't landed.
- **The 500 can land on the human instead.** Flip the timing and the seller's
  own takeover is the request that loses the race: hard error on screen,
  "takeover failed", while the store did in fact change hands.

---

## Blast radius of the phantom rows — checked, and it is small

- **Payroll is not affected.** `createPayrollCommissions`
  (`packages/services/payroll.ts:38-62`) groups sessions by `user_id` and sums
  orders over each session's half-open `[started_at, ended_at)` window. A
  session split into two consecutive windows for the same user sums to exactly
  the same cups and orders. No double-count. Same for
  `fetchSessionUsersForSummaries` (`sessions.ts:290+`), which dedups by user.
- **Sub-second order holes.** The new session's `started_at` is 70–110ms after
  the old one's `ended_at`, so an order created inside that gap matches no
  session and is dropped from cup counts. Negligible in practice, but it is the
  same class of hole an atomic transfer would close.
- **User-visible:** `session_transferred` is in both
  `TIMELINE_EVENT_TYPES` and `DAY_ACTIVITY_EVENT_TYPES`
  (`packages/services/activity-logs.ts:8,56`) and survives the big-events
  filter in `useDayActivityBigEvents`
  (`apps/seller/lib/hooks/activity-logs/useStoreActivityLogs.ts:32-35`), so
  every phantom transfer plants an extra **"Session handed over"** marker on
  the AtAGlance day timeline, and the sessions detail page shows an extra row.
  Plausibly read as "my own takeover" — consistent with staff reporting
  nothing odd.

Verification query for the historical count:

```sql
select s.id, s.store_id, s.claim_code, s.started_at,
       p.claim_code as prev_code, p.ended_at as prev_ended
from store_sessions s
join store_sessions p on p.id = s.previous_session_id
where s.user_id = p.user_id
order by s.started_at desc;
```

Every row is a self-transfer. Expect ~1 per 90 transfers since 2026-06-16.
**Recommendation: leave the historical rows alone.** They cost nothing
(payroll is correct, the chain is intact), and a cleanup migration that
re-points `previous_session_id` and deletes rows is more risk than the cosmetic
timeline markers are worth. Revisit only if the count is large.

---

## The finding that decides the fix — the offline queue has never worked

`grep` for `mutationQueue` across both apps returns exactly one file:
`useSession.ts`. There is no other producer or consumer. And in that file every
call site has this shape:

```ts
const result = await sessionsApi.transfer(...);   // throws when offline
mutationQueue.add("transferSession", { claimCode });   // unreachable when offline
```

`apiFetch` (`apps/seller/lib/api/client.ts:4`) does a bare `fetch`, which
**rejects** when the device is offline. The `await` throws, the function exits,
and `mutationQueue.add` is never reached. **The queue is structurally incapable
of ever capturing an offline mutation.** In six weeks of production it has held
exactly one category of entry: mutations that already succeeded.

So the "offline-first resilience" layer provides zero offline capability and
100% of the duplicate writes. It is not a good feature with a bug in it — it is
a feature that only ever does the harmful half of its job.

**Do not fix it by moving `mutationQueue.add` into the failure path.** Blind
replay is the wrong semantics for these four operations specifically:

- `transferSession` — a claim code captured while offline and replayed 20
  minutes later would seize a store that has since changed hands. Session
  ownership is contended and ordering-sensitive; it must be decided by the
  server at the moment of the request, never re-applied from a stale client.
- `openStore` — replays into 409 "already opened for this date".
- `resumeSession` — inserts unconditionally (`sessions.ts:85-95`), so a replay
  hits the same unique index and 500s exactly like transfer.
- `endSession` — replaying an end against a store someone else has since taken
  over.

The correct offline story for the POS is caching reads (already handled by the
service worker, `apps/seller/next.config.ts:15-45`) and failing writes loudly.
Not queuing ownership changes.

**Decision: delete the queue rather than repair it.**

---

## Plan

### Phase 1 — remove the replay machinery (fixes the incident)

1. `apps/seller/lib/hooks/sessions/useSession.ts` — drop the four
   `mutationQueue.add(...)` calls (`:70`, `:105`, `:139`, `:169`) and the whole
   `useMutationSync([...])` block (`:196-224`).
2. Delete `packages/utils/offline/MutationQueue.ts` and
   `packages/utils/offline/useMutationSync.ts`; drop their re-exports from
   `packages/utils/offline/index.ts`. Keep `withTimeout.ts` (still used).
3. Confirm no other importer: `grep -rn "mutationQueue\|useMutationSync" apps packages`
   should return nothing.

Deleting the sync loop is also what neutralises leftovers: devices out there
still have entries under the `__mutation_queue` localStorage key
(`MutationQueue.ts:14`). With the loop gone nothing ever reads them again, and
they age out harmlessly. **A partial fix that repaired `add()` but kept the
loop would replay every stale entry once on next load** — so this ordering
matters.

### Phase 1b — optional cleanup in the same pass

Each mutation in `useSession` runs a `withTimeout(broadcast…)` /
`withTimeout(mutate()…)` ceremony whose only effect is a `console.warn`
(`:73-91`, `:107-127`, `:141-161`, `:172-191`), plus `withTimeout` itself logs
on every call (`withTimeout.ts:26,31`). Dropping the ceremony down to
`await broadcast(update); await mutate();` takes the hook from ~240 lines to
~120 and removes a steady stream of prod console noise. Behaviour is unchanged
— the timeouts never did anything but log.

### Phase 2 — make the transfer safe on its own (no migration)

Even with the client fixed, two devices can legitimately submit the same code
at once. In `packages/services/sessions.ts:240-246`, turn the "end the old
session" step into a compare-and-swap:

```ts
const { data: ended } = await supabase
    .from("store_sessions")
    .update({ ended_at: new Date().toISOString(), status: "ended" })
    .eq("id", session.id)
    .eq("tenant_id", tenantId)
    .eq("status", "active")          // ← only the request that still sees it active wins
    .select("id");

if (!ended?.length)
    throw Object.assign(new Error("Session already transferred"), { status: 409 });
```

The loser now aborts *before* inserting, so it returns a clean 409 instead of a
500, and no duplicate insert is attempted. Add a compensating re-activate if
the insert then fails, so a failed insert can't leave the store with zero
sessions. Also worth guarding `resumeSession` (`sessions.ts:85`) the same way —
today it inserts blind.

> **Superseded for `transferSession` by Phase 3.** The CAS and the compensating
> re-activate both shipped, then came back out when the RPC landed — a real
> transaction rolls the end back on its own, so hand-written compensation was
> just a second thing to keep correct. The `resumeSession` guard stayed: it maps
> Postgres `23505` to a 409 and is independent of the transfer path.

### Phase 3 — atomic transfer via RPC (the proper fix)

supabase-js cannot open a transaction, so Phase 2 is a narrowing, not a
guarantee: the window between the CAS and the insert stays open. A
`transfer_store_session(p_tenant, p_store, p_user, p_code)` function doing
`SELECT … FOR UPDATE` → validate code → end → insert → return the new row makes
the whole thing one statement, and removes the zero-session window entirely.

This does not violate the "business logic lives in services" rule in CLAUDE.md
— what moves into SQL is a transaction boundary, not payroll math. Compare with
task 033, where a pg_cron job was rejected precisely *because* it would have
duplicated business logic; that argument doesn't apply here.

Sequencing: Phase 3 needs a migration and a manual deploy, so ship Phases 1–2
first and treat 3 as the follow-up that closes the window for good.

**Applied.** `supabase/migrations/20260801155136_atomic_transfer_store_session.sql`
— `transfer_store_session(p_tenant_id, p_store_id, p_user_id, p_claim_code,
p_new_claim_code)`, `SELECT … FOR UPDATE` on the active session, returning the
new `store_sessions` row. Errors raise `PT404` / `PT403` / `PT409`, which
PostgREST turns into the HTTP status; the service reads the status back off
`error.code` instead of re-deriving it from the message. Execute is revoked
from `PUBLIC` and granted to `service_role` only — the route uses the
service-role client. The claim code is still generated in the service and
passed in, so generation stays out of SQL.

The migration is additive (one `CREATE FUNCTION` plus grants), so pushing it
ahead of the app deploy is safe — nothing calls it until the service does. The
reverse order is not: the app would call a function that doesn't exist yet.

### Phase 4 — claim code: decided, no change

`generateClaimCode()` returns 2 digits — 90 values — valid for the whole life
of a session, with no rate limiting. **Decision (owner, 2026-08-01): leave it
exactly as is.** Two digits is a deliberate UX choice for a code read aloud
between colleagues at a counter, and the threat model doesn't warrant more:
this is staff handing a POS to the next shift, not an authentication boundary.
Half-measures like rate limiting or 4 digits buy little — real safety would
mean 6+ digits, which costs the counter staff more than the risk is worth.

Recorded here so the 1-in-90 collision isn't re-litigated later: after Phase 1
nothing replays a stale code, so the collision has nothing left to trigger.
The code space stops mattering once the duplicate writes are gone.

No work items in this phase.

---

## Worth refactoring? — yes, one thing, and it is separable

`useSession` is a heavy hook mounted 7 times: 7 realtime subscriptions, 7 SWR
subscribers, and (until Phase 1) 7 replay loops. SWR dedups the *fetch* because
the key is shared, but the subscription in `useSession.ts:27-48` is per
instance and does real work each time.

The fix is conventional here — a `SessionContext` provider alongside the
existing `StoreContext` / `RealtimeContext` (`apps/seller/lib/context/`) that
owns the SWR key, the one realtime subscription and the four mutations, with
`useSession()` becoming a thin `useContext` read. That is a mechanical change
across the 7 call sites and it makes root cause 2 structurally impossible
rather than merely fixed.

**Not folding it into this task.** Phase 1 removes the harm today in a diff
small enough to reason about; the provider extraction touches layouts on the
POS critical path and deserves its own task, its own review, and its own
rollback. It also overlaps with tasks 037 (seller CPU reduction) and 003
(home/manage refactor) — worth landing as part of that line of work. Flagging
here so the connection isn't lost.

---

## Verification

1. `grep -rn "mutationQueue\|useMutationSync" apps packages` → no hits.
2. `pnpm lint && pnpm build`.
3. Manual, two devices on one store: A opens, A reads code to B, B takes over.
   Watch the network tab — exactly **one** `POST /api/sessions/transfer`, and
   no second one 10s later. Then navigate B to `/manage/close` and confirm no
   further transfer requests fire on mount.
4. Re-run the self-transfer SQL above and confirm the newest row predates the
   deploy; nothing new should ever appear.
5. Phase 2: fire two transfers at once with the same valid code (two tabs, or
   `curl` ×2). Expect one 200 and one **409** — not a 500 — and the store still
   holding exactly one active session afterwards.

### Result (staging, 2026-08-01)

1, 2 — pass locally. **3 — passes.** Two takeovers, one `POST
/api/sessions/transfer` → `200` each, no `403` chaser. The session chain
alternates users on every hop (`3efe → 060a → 3efe → 060a`), so no row
transferred to itself. 4 — nothing new. Those `200`s also confirm the RPC is
live: the service no longer inserts anything itself, so a missing function
would have been a 500.

**5 — deliberately skipped.** The Supabase SQL editor serialises on one
connection so the two-tab version can't overlap, and the curl version needs a
pasted auth cookie. Not worth it: the thing that generated concurrent transfers
was the replay loop, which is gone and verified, and `SELECT … FOR UPDATE` is
stock Postgres. The one part that is genuinely new code — mapping `PTxxx` onto
the HTTP status — is covered by entering a wrong claim code in the app and
seeing a clean 403, since the 409 branch is the same path with a different
`RAISE`. Revisit if a 500 ever reappears on this route.

### Gotcha found while testing — the fix ships in the client bundle

The first staging run still showed the `200` + `403` pair, and the cause was
not the fix: both phones were serving the previous JS from the `next-pwa`
service worker cache. The replay is fired by the browser, so a server deploy
does not stop a device running cached code — and in a two-device test *either*
stale device reproduces the pair on its own. Force-quitting both PWAs cleared
it.

Worth knowing for any future client-side fix: the fastest way to tell stale
bundle from broken fix is the console. The deleted modules logged
`[MutationQueue]`, `[MutationSync]` and `[withTimeout]`; those strings cannot
be produced by the current code, so seeing them is proof of a stale bundle. A
release-time update prompt would remove the guesswork — see the follow-ups
below.

## What shipped

`apps/seller/lib/hooks/sessions/useSession.ts` (240 → 130 lines),
`packages/services/sessions.ts`, one migration, and the regenerated
`packages/db/types.ts`. `packages/utils/offline/` deleted entirely. `pnpm build`
passes; `pnpm lint` fails only on pre-existing findings in files this change
doesn't touch.

`transferSession` ended up net *shorter* than before the task started — the
four-step read/check/end/insert dance is now a single `rpc()` call plus error
mapping.

Three things differ from the plan above:

1. **`withTimeout.ts` was deleted too, not kept.** The plan said keep it —
   that assumed Phase 1b might not happen. It did, and `useSession` was its
   only consumer, so keeping it would have left a dead export. The whole
   `packages/utils/offline` directory is gone: zero importers remain.
2. **"The timeouts never did anything but log" was not quite right.**
   `withTimeout` resolves its own promise after the deadline, so it also
   bounded how long the caller waited — a real effect on the TakeOverCard
   spinner, not just a `console.warn`. The replacement preserves that bound by
   tightening it: `syncAfterMutation` fires the broadcast and the revalidate
   without awaiting either, so the caller resolves as soon as the mutation
   itself lands. It also swallows `mutate()`'s rejection, which the old
   `withTimeout(...).catch` did implicitly — without that, a failed *refetch*
   would surface to `TakeOverCard` as a failed *transfer*.
3. **Phase 2's transfer changes shipped and were then removed by Phase 3.**
   Both landed in the same session rather than as separate PRs, so the CAS and
   the compensating re-activate existed only briefly. That ordering was still
   worth keeping: Phase 2 is the fix that needs no migration, so it is what to
   fall back to if the RPC ever has to be reverted.

## Rollout

One PR, no data migration. The function migration is already pushed and the
types regenerated, so the app change can ship on its own from here — but on any
environment that hasn't had the migration applied, **push it before deploying
the app**, or every transfer 500s on a missing function. Phase 4 is closed — no
work.

Verified on staging (see Result above). Prod still needs the migration pushed
before the app deploys.

## Follow-ups this surfaced (not in scope here)

- **Release-time update prompt.** `sw.js` already ships `skipWaiting` +
  `clientsClaim`, so a new service worker takes control immediately — but a
  page already open keeps running the JS it booted with, which for a POS open
  all shift can be days. Listen for `controllerchange`, prompt via the existing
  `ToastContext`, reload on tap. Guard the first install (no prior
  `navigator.serviceWorker.controller`), and call `registration.update()` on
  `visibilitychange` so long-lived installs actually check. Prompt rather than
  auto-reload — a reload mid-order drops the cart. Don't key it off
  `/api/version`: that compares `packageJson.version`, which is bumped per
  release, not per deploy.
- **`SessionContext` provider.** `useSession` is still mounted 7 times, each
  opening its own realtime subscription. See "Worth refactoring?" above.
