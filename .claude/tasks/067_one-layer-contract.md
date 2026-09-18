# Task 067 — One layer contract for both apps

**Status: designed, not built.** Ticket:
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

### The fetch policy is already disciplined — and undocumented

All 35 SWR hook files across the two apps — 39 declarations in total — set
`revalidateOnFocus: false` and a `dedupingInterval`. Nobody has ever forgotten.
That is the good news and also the risk: the policy exists 39 times and nowhere,
so the next hook is one omission away from refetching on every window focus,
which on Vercel is CPU nobody ordered.

The intervals in use, a tier system that has never been named:

| Interval | Declarations | Where |
| --- | --- | --- |
| 5s | 7 | **All five backoffice payroll hooks, and nothing in seller** |
| 10s | 3 | Supply requests, incident reports, backoffice user info |
| 30s | 7 | Seller's hottest data: today's orders, today's summary |
| 60s | 14 | The common choice, spelled `60000` seven times and `60_000` seven times |
| 300s | 6 | Products, current user, most analytics, backoffice stores |
| 900s | 2 | Tea waste and daily sales — a closed month cannot change |

### The one interval that looks backwards

**Seller's till data sits at 30s. Backoffice's payroll sits at 5s.** Today's
orders and today's summary — the numbers that move while a seller is serving —
are deduped for thirty seconds. Payroll configuration and payslips, which change
only when an admin taps approve, are deduped for five.

A dedupe is not a poll, so this costs nothing while a screen sits still. It costs
on *navigation*: every hop between payroll screens more than five seconds apart
refetches, where the same hop in seller would have reused the cache. Backoffice
refetches admin-paced data six times more eagerly than seller refetches the till,
which is the opposite of the reason those numbers were set high in the first
place.

It is also the tier whose members now invalidate explicitly on write (task 066's
follow-up), so the short window is no longer buying the freshness it was
presumably there for.

**This task still changes no interval's value** — see the open question at the
end. But it should not quietly bless `5s` as a named tier for payroll either, so
the recommendation is written down rather than decided here.

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
4. **Every SWR hook declares a named tier**, not a literal, and
   `revalidateOnFocus: false` unless it has a reason. Same spirit as the boot
   path's freshness rule: the cost is stated where the choice is made.
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

**Steps 1 and 2 are one merge, 3 and 4 a second.** The rules and the logging fix
are safe and worth landing on their own; the hook rewrites touch payroll screens
and should be revertible alone.

### Step 1 — Write the rules
Un-scope the layer section in `CLAUDE.md` to both apps, add the five rules above,
and add the tier table. Name backoffice's own files beside seller's in "Important
Files" so the section stops reading as one app's document.

### Step 2 — Port `handleError` to backoffice
Seller logs `{ apiError, cause: error }` with a paragraph explaining why: Supabase
reports failures as plain objects, so `toApiError` cannot preserve the message and
a log of the `ApiError` alone gives a 500 with no code, no hint, and a stack
pointing at where the `ApiError` was built. Backoffice logs only `apiError`. Copy
the behaviour and the paragraph.

### Step 3 — The tier module
A shared constant set both apps import, and replace all 35 literals with it.
Mechanical, and it makes step 4's diffs readable.

### Step 4 — The four backoffice hooks
Give each an api client alongside its siblings in `lib/api/`, with the Zod parse
the hook is doing inline today, then point the hook at it. `usePayrollClaimConfigs`
is the largest: four inline `apiFetch` calls including its own SWR fetcher.

While in each one, check rule 2: `usePayrollClaims` and `usePayrollUserInfo` both
write things that appear in totals elsewhere.

### Step 5 — Verify
- `grep -rl apiFetch apps/*/lib/hooks` returns nothing.
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

### Step 6 — Version bump and patch notes
Nothing here is user-visible, so **no bump and no notes.** A version that
announces nothing is correct; see the `patch-notes` skill.

---

## Not in this task

- **Seller's 20 routes without `getRequestUser`.** Some are public by design —
  weather, version, the auth callback. Which ones are not is a read per route and
  its own ticket.
- **Retuning any interval.** Every number stays what it is; only its spelling
  changes. The 5s-versus-30s question above is the one with evidence behind it,
  and it is an open question on the ticket rather than a step here: changing a
  dedupe changes what a screen shows, so it wants its own diff and its own
  before-and-after on a slow connection.
- **Realtime for backoffice.** Its screens are admin-paced and nobody has asked.
- **A `SWRConfig` default** carrying the fetch policy. Open question on the
  ticket: it would remove the omission risk, but it hides the cost at the call
  site, and the cost is the thing being managed.
