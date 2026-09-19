# Task 067 — One layer contract for both apps

**Status: steps 1–6 built and audited 2026-09-19, uncommitted. Nothing is left
except the commits.** Ticket:
`Chore: One layer contract for both apps`
(https://app.notion.com/p/3df95a71540581a3934dd23048cddb8a) — `Medium`.

Comes out of the payout-staleness bug found while finishing task 066: the fix was
one awaited promise and one extra `mutate`, and both mistakes were possible only
because backoffice has no written layer contract.

## What the owner asked for

| # | Owner's note | Decision |
| --- | --- | --- |
| 1 | Both apps should have the rules, not just seller | Un-scope the layer section; every rule names both apps |
| 2 | Keep it fast on a slow device | The rules are written as costs, not as etiquette: what a reader pays for a choice is in the rule next to it |
| 3 | Do not poll much — Vercel CPU is money | Polling is a fallback, never a habit. Exactly one hook polls on a timer and only while realtime is down; that is the pattern to name |
| 5 | "Some of my code might be bad — follow the good patterns" | Every rule here is taken from something already in the repo that works: seller's order-create invalidation, `useSession`'s conditional poll, the boot path's freshness declarations. Where two patterns disagree, the cheaper one wins and the other is deleted |
| 4 | Efficiency matters | Dedupe intervals become named tiers, so a reviewer sees a decision instead of a number copied from the hook next door |

## What the audit found

**The written rules predicted the drift almost perfectly.** The layer section is
titled *Layered Architecture (Seller App)*; its table, examples and file paths are
all seller. The sections written for both apps — boot path, form fields,
skeletons, mobile shell — are where the two apps stayed in step.

| | Seller | Backoffice |
| --- | --- | --- |
| `lib/api/client.ts` | — | **byte-identical** |
| Hooks calling `apiFetch` themselves | **0** of 34 | **4** of 13 |
| API client files / of those, Zod-parsing | 21 / 15 | 10 / 7 |
| Routes using `handleError` | 41 of 48 | 24 of 27 |
| Routes using `getRequestUser` | 28 of 48 | **24 of 27** |
| Raw Supabase in a component or hook | 2 | 1 |
| SWR hook files setting `revalidateOnFocus: false` **and** a dedupe | **25 of 25** | **10 of 10** |

Three things worth reading off that table before planning anything:

**The api client layer is the healthiest part of both apps.** `client.ts` is
identical. This task does not need to touch it.

**The drift is in the hook layer, and only there** — `usePayrollClaimConfigs`,
`usePayrollCommissionConfigs`, `usePayrollClaims`, `usePayrollUserInfo`.

**The drift is not one-directional.** Backoffice's route layer is *cleaner* than
seller's: 24 of 27 routes identify the caller against seller's 28 of 48. Some of
seller's twenty are public by design; how many is not known, which is why they are
out of scope here rather than quietly lumped in.

### The fetch policy has a floor nobody mentions, and the floor is the problem

Both apps already set one in their root layout:

```tsx
// apps/seller/app/layout.tsx:93
<SWRConfig value={{ dedupingInterval: 5000, revalidateOnFocus: false, errorRetryCount: 3 }}>
// apps/backoffice/app/layout.tsx:77
<SWRConfig value={{ dedupingInterval: 5000, revalidateOnFocus: false }}>
```

So the policy is not undocumented and not repeated 39 times for want of a
default — it is a **floor plus 39 overrides**. A hook that declares nothing still
gets `revalidateOnFocus: false`, so the omission risk this task was originally
written around does not exist.

What does exist is worse, because it is invisible: **the floor is the most
aggressive number in either codebase.** Forgetting to think costs 5 seconds.
Every hook in seller overrides it upward; the five backoffice payroll hooks that
"set 5000" are restating the floor rather than choosing it — which is how
admin-paced data ended up refetching six times more eagerly than the till.

The two roots also differ for no stated reason: `errorRetryCount: 3` in seller
only.

The intervals in use, a tier system that has never been named:

| Interval | Declarations | Where |
| --- | --- | --- |
| 5s | 7 | **All five backoffice payroll hooks, and nothing in seller** |
| 10s | 3 | Supply requests, incident reports, backoffice user info |
| 30s | 7 | Seller's hottest data: today's orders, today's summary |
| 60s | 14 | The common choice, spelled `60000` seven times and `60_000` seven times |
| 300s | 6 | Products, current user, most analytics, backoffice stores |
| 900s | 2 | Tea waste and daily sales — a closed month cannot change |

### The decision that follows: raise the floor, do not add a second default

A dedupe is not a poll, so a short window costs nothing while a screen sits
still. It costs on **navigation**: every hop between payroll screens more than
five seconds apart refetches, where the same hop in seller reuses the cache.

So the fix is not to name `5s` as a tier for payroll. It is to make the floor the
cheap answer, because the floor is what you get when nobody thinks:

- **The floor becomes `WARM`, 30s**, in both roots — the value seller's hottest
  data already chose for today's orders and today's summary.
- **A hook declares a tier only to leave the floor**, up or down, and the
  declaration is the reason it is leaving.
- **`revalidateOnFocus: false` lives in the root only.** Thirty-five hooks
  repeating a constant is thirty-five chances to disagree with it.
- **Both roots become identical**, `errorRetryCount: 3` included.

That turns the payroll retune from a step into a deletion: those hooks stop
overriding and inherit 30s. Owner approved this on 2026-09-19, on the grounds
that writes now invalidate explicitly, so the short window was buying nothing.

Declarations go from 39 to 25: the seven at 5s and the seven at 30s are the floor
restated and are deleted; `10s` ×3, `60s` ×14, `300s` ×6 and `900s` ×2 stay,
because each is a real move off it.

**Polling is almost absent.** Exactly one hook polls on a timer, and
conditionally — `useSession`:

```ts
refreshInterval: isConnected ? 0 : 30000,
```

Realtime carries it and the timer is only for when realtime is down. Weather
polls every 20 minutes. Everything else never polls, almost all of it by simply
not setting the option.

**A note on the four analytics hooks, which write `refreshInterval: 0`:** that is
SWR's default, so mechanically those lines do nothing — a hook that omits the
option behaves identically, and the four cannot be counted as evidence that
anything is being held down. What they are is a *declaration*, on the four
heaviest queries in the app, that never polling is deliberate. That is the boot
path's freshness rule applied to a client read, and it is worth keeping for the
same reason: a deliberate choice that is not written down decays into an
accident. It is a comment, not a guard, and the rules below should say so.

### The bug that started this

`usePayslip` mutated its own key and nothing else, while the payouts list renders
from a different key — so an approved row showed its old total on the way back,
for as long as `dedupingInterval` held. Seller already had the answer: its order
create invalidates the orders keys *and* the summaries key. One app knew; the
other had never been told.

## The rules to write

All of this lands in `CLAUDE.md`, in the section currently scoped to seller.

1. **A hook calls an api client. Never `apiFetch`, never Supabase.** The api
   client is where the URL, the method and the Zod parse live; a hook that
   fetches has quietly taken two jobs and the second one is invisible in its
   import list.
2. **A write invalidates every key that shows its result** — not only its own.
   Derived totals live under other keys. The global `mutate` with a key predicate
   is the tool; seller's order create is the example.
3. **A service finishes what the caller is waiting for.** Fire-and-forget is for
   work nobody reads — activity logs. A recomputed total the client refetches on
   the next line is part of the answer, and on a serverless runtime an unawaited
   promise may not run at all.
4. **The cheap answer is the default one.** The root `SWRConfig` holds the floor
   — `WARM`, 30s — and `revalidateOnFocus: false`. A hook declares a tier only
   when it is leaving the floor, and never repeats what the root already says.
   Same spirit as the boot path's freshness rule, with one addition learned here:
   **a default is a decision every future hook inherits silently, so it must be
   the conservative one.** A 5s floor meant forgetting to think was the most
   expensive option on the board.
5. **Polling is a fallback, not a habit.** `refreshInterval` stays 0 while
   realtime is connected, and any non-zero value carries the reason the data
   cannot be event-driven instead. Writing `refreshInterval: 0` changes nothing —
   it is SWR's default — so use it only where the query is expensive enough that
   a reader deserves to be told the silence is deliberate, and never as a guard
   against someone adding polling later.

Tier names to introduce, in a shared module both apps import:
`HOT` 5s · `QUICK` 10s · `WARM` 30s · `COOL` 60s · `COLD` 300s · `STATIC` 900s.
No interval changes value in this task — only its spelling.

## Steps

**Steps 1–2 are one merge, 3 a second, 4–5 a third.** The rules and the logging
fix are safe. Raising the floor changes what every screen in both apps caches, so
it lands alone. The hook rewrites and the three fixes touch payroll screens.

### Step 1 — Write the rules — **built**
Un-scope the layer section in `CLAUDE.md` to both apps, add the five rules above,
and add the tier table. Name backoffice's own files beside seller's in "Important
Files" so the section stops reading as one app's document.

### Step 2 — Port `handleError` to backoffice — **built**
Seller logs `{ apiError, cause: error }` with a paragraph explaining why: Supabase
reports failures as plain objects, so `toApiError` cannot preserve the message and
a log of the `ApiError` alone gives a 500 with no code, no hint, and a stack
pointing at where the `ApiError` was built. Backoffice logs only `apiError`. Copy
the behaviour and the paragraph.

### Step 3 — Raise the floor and name the tiers — **built**
`packages/utils/swr.ts` holds the tiers — `HOT` 5s, `QUICK` 10s, `WARM` 30s,
`COOL` 60s, `COLD` 300s, `STATIC` 900s — and both root layouts take
`{ dedupingInterval: SWR.WARM, revalidateOnFocus: false, errorRetryCount: 3 }`.

Then: delete every override that restates the floor (the seven at 5s, all
backoffice payroll, and the seven at 30s), name the rest, and drop
`revalidateOnFocus: false` from hooks now that the root owns it. 39 declarations
became 25 — `QUICK` ×3, `COOL` ×14, `COLD` ×6, `STATIC` ×2.

**Three more lived outside `lib/hooks`** and were missed by the first sweep:
`FlagsContext` in seller and two `useSWR` calls in backoffice's `AuthContext`.
A grep scoped to hooks says the job is done when it is not, so the check in step
6 looks at both apps whole.

**Check one thing before deleting the 5s overrides:** `InactivityRefresh` in both
apps uses `useSWRConfig` rather than `useSWR`, so it reads the cache instead of
declaring a key, and nothing there depends on the floor.

### Step 4 — The four backoffice hooks — **built**
Give each an api client alongside its siblings in `lib/api/`, with the Zod parse
the hook is doing inline today, then point the hook at it. `usePayrollClaimConfigs`
is the largest: four inline `apiFetch` calls including its own SWR fetcher.

While in each one, check rule 2: `usePayrollClaims` and `usePayrollUserInfo` both
write things that appear in totals elsewhere.

### Step 5 — Two adjacent fixes, not three — **built**

- ~~**`upsertPayout` gets a settled guard.**~~ **It already has one.**
  `packages/services/payroll.ts:286` reads the existing row first and returns it
  untouched when `isPayoutSettled`, so a paid payout's figures were never at
  risk. The flag was mine and it was wrong; checking cost one `grep` and saved a
  pointless edit to a money path.
- **Seller's login shows the error.** `signInWithOAuth` reports failure in its
  result; seller reads it now but has nowhere to show it, so a failed sign-in
  releases the button and says nothing. Backoffice already renders a line. Same
  treatment, so the two screens agree.
- **A stale-totals check, not a backfill**, in
  `.claude/sql/002_check_payout_totals.sql`. A read-only `SELECT` comparing each
  payout's stored totals against the live sum of its approved rows, summed the
  same way `upsertPayout` sums them (`payroll.ts:290`) so a hit is exactly what a
  re-run would write.

  **Run against staging 2026-09-19: zero rows.** The staleness was transient, as
  suspected, and no backfill was needed — which is the result that justifies
  having asked rather than written. Kept as a spot-check.

  Known gap: it does not compare `total_cups` / `total_orders`, which
  `upsertPayout` also writes. Two lines, not yet added.

### Step 6 — Verify — **done**
Run every grep against `apps/seller apps/backoffice` **whole**, never against
`lib/hooks` and never through a `apps/*` glob — the first scoping hid two live
violations (see step 6b) and the second sweeps in archived `apps/admin`.

Results after step 6b, 2026-09-19: hooks calling `apiFetch` **0**;
`revalidateOnFocus` set anywhere but the two roots **1**, `useSession`'s
deliberate `true`; literal `dedupingInterval` outside `packages/utils/swr.ts`
**0**; `errorRetryCount` outside the roots **0**; `revalidateIfStale` only where
it is set alone **3** (`useStores`, both `useWeather`); root layouts identical
**yes**; `refreshInterval` sites **7**, the same seven as before. `tsc` clean on
both apps, both apps build, and the only lint errors are the two pre-existing
setState-in-effect files in backoffice's config edit pages.

- Both root layouts are identical, and their `dedupingInterval` is `SWR.WARM`.
- No hook repeats `revalidateOnFocus: false`.
- No literal `dedupingInterval` number outside the tier module, counted with
  explicit app paths: `apps/seller/lib/hooks apps/backoffice/lib/hooks`. A glob
  like `apps/*/lib/hooks` sweeps in archived `apps/admin` and inflates every
  number — it happened twice while writing this task.
- `grep -rn "refreshInterval" apps/*/lib` returns the same hooks it does today
  and no more.
- A forced 500 in backoffice logs the Supabase code, not just "Internal server
  error".
- The payouts list shows the new total immediately after an approve, on a
  throttled connection — the case that started this.

### Step 6b — Audit pass on our own diff — **done 2026-09-19**

Read the whole diff back against the rules before committing. The tiers were all
correct and no behaviour was wrong, but five things failed the "every difference
is deliberate and readable" test. All five are fixed.

**Two rule-3 violations shipped.** `revalidateOnFocus: false` survived in
`apps/seller/lib/context/AuthContext.tsx` and `lib/context/FlagsContext.tsx`.
Backoffice's `AuthContext` was cleaned and seller's two were not. The step 6
grep reported **0** because it was scoped to `lib/hooks` — the exact trap this
task warned about one step earlier, and the reason the greps below now name no
directory. While in `AuthContext`, `errorRetryCount: 3` and
`shouldRetryOnError: true` also went: the root sets the first and the second is
SWR's default, so both were restatements.

**One key with two policies.** `useCurrentUser` declared `COLD` on key `"user"`,
which `AuthContext` also owns — mounted at the root and seeded from the
`x-user-info` cookie. A dedupe window is per key but the config is per hook, so
the tier held only when `useCurrentUser` happened to be the hook revalidating.
Neither file could keep its claim. Resolved by deleting the tier: the key takes
the floor in both, and the reason is written where the tier used to be.

**A no-op option pair in three hooks.** `useDailySummaries`,
`useSummaryBreakdown` and `useSummaryPhotosById` each set
`revalidateOnMount: true` *and* `revalidateIfStale: false`.
`swr/dist/index/index.mjs:316` takes `revalidateOnMount` directly on first
mount, so the second line was unreachable — and `revalidateIfStale` **defaults
to true** (`_internal/config-context:494`), so revalidating on mount is what the
hook gets for free. The pair cancelled out to the default. Both lines deleted,
one comment left in their place. `useStores` keeps its `revalidateIfStale: false`
because it sets it *alone*, which is the only way it does anything.

**Four comments describing settings their file no longer holds.** `useWeather`
and `useCustomerFeedbacks` in both apps opened "No `revalidateOnFocus`", and
`useCustomerFeedbacks` compared its 60s to "10s" — a baseline that stopped
existing when the floor moved to 30s. Rewritten to point at the root rather than
restate it.

**Left alone:** `useHourlySales` carries only `COLD` while its four analytics
siblings also carry `refreshInterval: 0` and `keepPreviousData: true` — and
hourly sales is the one whose chart swaps by date, so it is where
`keepPreviousData` would earn most. Predates this task; fixing it needs a look at
the chart rather than a sweep.

### Step 7 — Version bump and patch notes
Nothing here is user-visible, so **no bump and no notes.** A version that
announces nothing is correct; see the `patch-notes` skill.

---

## Decisions taken 2026-09-19

| Question | Answer |
| --- | --- |
| Payroll dedupe 5s → 30s | **Yes**, owner approved — and it becomes a deletion rather than a change, since 30s is the new floor |
| `SWRConfig` default or named tiers | **Both, split by which varies.** The invariant — focus revalidation, retry count, the floor — lives in the root. The tier lives at the hook, because that is the number that costs money and it should be read where it is chosen |
| `upsertPayout` settled guard | **Already there** — `payroll.ts:286`. Verified instead of assumed; no edit made |
| Seller login error message | **Converge with backoffice**, step 5 |
| Stale-totals backfill | **A check query only**, step 5. No write without evidence |
| The slower awaited approve | **Keep.** One query set against a number the client reads on the next line |

---

## Not in this task

- **Seller's 20 routes without `getRequestUser`.** Some are public by design —
  weather, version, the auth callback. Which ones are not is a read per route and
  its own ticket.
- **Retuning any interval above the floor.** `10s`, `60s`, `300s` and `900s` keep
  their values and only gain a name. The floor itself moves, which is step 3, and
  it lands in its own merge because it changes what every screen in both apps
  caches.
- **Realtime for backoffice.** Its screens are admin-paced and nobody has asked.
- **Moving the tier into the root as well.** The floor belongs there; the tier
  does not. A default is inherited silently, and the per-hook number is the one
  worth arguing about in review.
