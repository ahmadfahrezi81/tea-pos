# Task 069 — Pull to refresh only where data changes from elsewhere

**Status: built 2026-09-19, uncommitted. The device pass in step 2 is owed.**
Ticket:
`Chore: Pull to refresh only where data changes from elsewhere`
(https://app.notion.com/p/3e095a71540581fdb1aefdebd902250f) — `Medium`.

One file: `apps/seller/app/[tenantSlug]/mobile/config/navigation.ts`. Backoffice's
route table is untouched.

## The rule

**A screen earns the gesture when someone other than the person holding the phone
can change what it shows.**

Pull to refresh went onto 19 of seller's 34 routes while the owner got a feel for
it — deliberately broad, to find out where it helped. This narrows it to where the
rule holds.

## Why it is not free to leave on

`refreshable` does two things, and the second is easy to miss —
`MobileShell.tsx:658`:

```tsx
className={`... ${refreshable ? "overscroll-y-none" : ""}`}
```

So it arms the pull **and turns off native rubber-band bounce on that route**. On a
screen where a refresh buys nothing, the flag trades away scroll feel for nothing.
That is the argument for trimming rather than just leaving it alone.

## The list — 19 offer it, 8 should

| Route | | Why |
| --- | --- | --- |
| `home/pos` | keep | Orders arriving while you watch |
| `home/manage` | keep | Today's totals move all shift |
| `orders` | keep | Same |
| `analytics` | keep | A day closing changes the month |
| `chats` | **add** | Messages someone else wrote — the textbook case |
| `more/earnings` | keep | An admin approves your pay. Strongest case in the app |
| `more/earnings/*` | keep | Same, for one payout |
| `more/reimbursements` | keep | An admin approves your claims |
| `more` | drop | A menu |
| `more/stores` | drop | Also contradictory: `useStores` sets `revalidateIfStale: false` precisely because the server just handed it the list |
| `home/manage/expense` | drop | Entered on this phone |
| `home/manage/request` | drop | See the decision below |
| `home/manage/report` | drop | See the decision below |
| `orders/chart` | drop | Root tab one tap away keeps it |
| `analytics/chart` | drop | Same |
| `analytics/daily/*` | drop | **A closed day cannot change** |
| `analytics/daily/*/events` | drop | Activity log of a closed day — immutable |
| `analytics/daily/*/sessions` | drop | Immutable |
| `account/details` | drop | Your own name and phone. Only you change them |
| `account/payroll-info` | drop | Rarely changed, and one tap from a screen that refreshes |

Net edit: **12 removals, 1 addition.** Final count 8.

Forms already have none — `open`, `close`, and the four `add` pages — and they stay
that way. A pull on a screen holding unsaved input is a different kind of bug.

## Decisions taken 2026-09-19

| Question | Answer |
| --- | --- |
| Roots plus children, or roots only? | **Roots only**, plus My Pay, a pay detail, and My Claims. Owner's call, against the wider option |
| Chats, which is not built yet | **Add it.** Owner: "chat is fine man.. we'll implement soon that's why allow it". A flag on a screen nobody can reach yet costs nothing |
| Supply requests and incident reports lose it, although an admin changes them | **Accepted.** Owner: "it's in seller app.. admin can refresh on backoffice app" — the review happens over there, and this screen is the seller's own submit log. Both are also one tap from Manage, which keeps the gesture |
| The three closed-day screens | **Drop.** They render a day that has closed; the numbers are frozen. This was the clearest case in the audit |
| Backoffice's 10 `refreshable` routes | **Unreviewed, unchanged.** Its screens are admin-paced and the question is different. Its own ticket if anyone wants it |

## Steps

### Step 1 — Edit the route table — **built**
Twelve `refreshable: true` lines removed, one added to `/mobile/chats`. No other
field changed; no route added or removed. The rule itself is now a comment above
`mobileRoutes`, including the overscroll cost — the flag was re-sprinkled once
because nothing next to it said what it was for.

### Step 2 — Verify — **partly done**

Static, 2026-09-19: seller's table has **8** `refreshable: true`, and they are
exactly the intended eight. Backoffice still has **10** — nothing leaked across.
`tsc` clean, both apps build, no new lint.

Still owed, and it needs a phone:
- Each of the 8 pulls down, spins, and refreshes.
- Each of the 12 does not pull — and **native bounce is back**: drag down past the
  top on iOS and the content rubber-bands instead of holding still. This is the
  check that proves the flag was doing two things.
- `grep -c "refreshable: true"` in seller's route table returns **8**.
- Backoffice still returns **10** — nothing leaked across.
- A day-detail screen under Analytics scrolls normally and offers nothing.

### Step 3 — Version bump and patch notes — **done**
Seller **5.4.19**, one line: *"Pull down to refresh is now on the screens where
information can actually change."* Backoffice unchanged and unbumped.

**Seller only, one line.** Unlike task 068, this *is* perceptible: a gesture
disappears from twelve screens, and a gesture that silently stops working reads as
a bug. Something like "Pull to refresh is now on the screens where data actually
changes."

Backoffice does not bump — nothing in it changes. The rule is a bump for each app a
change touches, and this one touches a single seller file.

## Not in scope

- **Backoffice's route table.**
- **The rate limit** on how often a pull may fetch — task 068.
- **Chats itself.** This adds a flag to its route entry; building the screen is
  RFC 001's business.
- **Any change to what a refresh fetches.** `mutate(() => true)` is untouched.
