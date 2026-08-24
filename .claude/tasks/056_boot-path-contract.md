# Task 056 — A contract for the boot path

**Status: written 2026-08-25.** The contract is in `CLAUDE.md` under **Boot
Path**. Opened 2026-08-23, late, after a long day of changing the seller and
backoffice boot paths by trial and error. See the closing section for what
shipped, what the working-out below got wrong, and what is still open.

This is a **documentation and rules** task, not a refactor. The deliverable is a
page in `CLAUDE.md`, not new architecture. Read the reasoning below before
writing it — the rules are worth little without the argument that produced them.

---

## Why this exists

The owner's words: *"it doesn't feel well designed compared to how we do our five
layers when we make a new API"*, and *"honestly right now it's more like we did
trial and error, we don't really have a plan."*

Both correct, and the reason is specific.

**The 5-layer table answers one question: what may this code touch?** Services
may use Supabase, components may not. It works because capabilities are visible
in the import list — you can see a violation while reading.

**The boot path fails a different question: how often does this run?** And that
one is invisible. `MobileLayout` reads like it runs once when the app opens. It
runs once per screen *and* once per prefetch — seller marks six routes
`prefetch: true`, backoffice five — so a single open executes it half a dozen
times. Nothing in the file says so.

Everything that went wrong on 2026-08-23 came from that blind spot, not from
anyone touching a forbidden module.

---

## The contract

Classify every server-side read by cost. Then cap what each place may use.

| Tier | What | Where it may run |
|---|---|---|
| **0 — Free** | Cookies, headers. No I/O. | Anywhere, unlimited |
| **1 — Cached** | A DB read behind a TTL. Must state the TTL. | Layouts and below |
| **2 — Live** | An uncached DB read. | **Never a layout.** API route + client hook, or a leaf page |
| **3 — External** | PostHog, Xendit, weather, any third party. | **Never on the render path.** Route + client hook |

One line to remember: **a layout may only do Tier 0 and Tier 1.**

### Why this rule is trustworthy

It explains the decisions already made, including the ones that were right —
which is the test a rule has to pass before it becomes doctrine:

| Decision | Tier | Verdict |
|---|---|---|
| PostHog evaluation in the layout (task 054) | 3 in a layout | Banned. Would have been caught while typing it. |
| Backoffice pay frequency, uncached in the layout | 2 in a layout | Banned. Must become Tier 1. |
| Session gate, uncached, in a client hook | 2 in the right place | **Correct. Leave it.** |
| Store list, cached, in the layout (task 053) | 1 | **Correct. Leave it.** |
| Products, `unstable_cache` 6h, in a route | 1 | Correct. |

A rule that only forbids things is a guess. One that also confirms your existing
good choices is describing something real.

### The part that makes it interesting

**A tier is a property of the mechanism, not of the data.**

Flags fetched over the network are Tier 3 and banned from layouts. The *same
flags*, evaluated locally, are Tier 0 and allowed anywhere. An uncached query is
Tier 2; wrap it in a TTL and it is Tier 1.

So the contract must not say "flags belong in a client hook". It says "a layout
may use Tier 0 and 1", and the engineering question becomes **how do I move this
data into a cheaper tier** rather than **where am I allowed to put it**. That is
a far better question for a reviewer to be asking.

---

## Where feature flags actually belong

Worth writing down, because task 054 got reverted and the file alone makes it
look like server-side flags are simply wrong. They are not.

- The mistake was **a network call per render**, not the location.
- PostHog's server SDK supports **local evaluation**: given a personal API key it
  polls the flag *definitions* on a timer and evaluates in memory, with no
  network call per request. The person properties are already supplied by this
  codebase — `{ role, tenantId, storeId }` — which is exactly what local
  evaluation needs. LaunchDarkly, Statsig and Unleash all work this way; avoiding
  per-request remote calls is most of why those systems exist.
- Caveats: the personal API key is a sensitive server-only credential, and flags
  built on cohorts or behavioural rules cannot evaluate locally and fall back to
  a remote call silently.
- **Today, without local evaluation, the client hook is correct.** The revert was
  right.

### Kill switches are not rollout flags

- `feature-qris` and friends flashing off-then-on for 200ms is fine; a button
  appears slightly late.
- `ops-maintenance` flashing the whole app before the overlay lands is not fine,
  and that is the one real problem the reverted change solved.
- Two kill switches and a dozen rollout flags may deserve two mechanisms. This is
  the strongest argument for eventually enabling local evaluation.

---

## The proxy gets its own rule

It runs on every request **including every prefetch** — the hottest code in the
system.

**The proxy answers from cookies unless it can prove it cannot.** Every DB read
in it carries a written reason for why a cookie will not do.

Current state:

| Read | Cached? |
|---|---|
| Tenant lookup | Yes, `x-tenant-id` cookie |
| Access check | Yes, `x-tenant-access`, 1h |
| `supabase.auth.getUser()` | No — session validation, correctly live |
| `users` row for role + status | **No, and no comment says why** |

That last row is the teaching point of the whole task. Not caching role and
status is a **correct security decision** — a cached role keeps a suspended
account working until it expires. But nothing in the file says that, so it is
indistinguishable from an oversight, and it sits between two reads that *are*
cached.

**A deliberate choice that is not written down decays into an accident.** A large
part of 2026-08-23 was spent reading omissions as decisions and decisions as
omissions.

---

## Caching gets one rule

**Every server read declares its freshness: `live`, a TTL, or `immutable`.**

`live` is a legitimate answer — the session gate genuinely is — but it has to be
*stated*. The backoffice pay-frequency bug survived for months precisely because
that read declared nothing, so nobody could see it was wrong while seller's
identical call was right.

Worth considering: a thin `cachedTenantRead(name, ttl, fn)` helper, so a read
with no declared freshness does not typecheck. That turns the rule from a
convention into something the compiler enforces.

---

## Deliverables

- [ ] A **Boot path** section in `CLAUDE.md`, beside the existing 5-layer table:
      the tier table, the layout rule, the proxy cookie-first rule, the freshness
      rule.
- [ ] A **boot budget** per app, written down: *"opening the app costs N
      navigations, M cached reads, K external calls."* Cheap to write, and the
      only item here that catches a regression in review rather than on a phone.
- [ ] Write the role/status decision into `proxy.ts` as a comment saying it is
      deliberate and why.
- [ ] Record the freshness of every existing server read — most already have one,
      they are just not stated in a uniform way.

## Explicitly not in scope

- **Do not restructure the layouts.** Their shape was never the problem; the
  absence of a constraint on what goes in them was.
- **Do not enable PostHog local evaluation as part of this.** It is a real
  option with a credential and a fallback mode to think about, and it deserves
  its own task once the contract exists.

## Optional, discussed and deferred

- **Share the proxy pipeline between the apps.** They are roughly 90% identical
  and have already drifted — different caching, different gates, different
  landing paths. Moving the common stages into a package with the differences as
  config would remove the entire drift class of bug, which is where the real
  damage came from. Bigger change; worth doing after the contract, not before.

---

# Written 2026-08-25

`CLAUDE.md` gains a **Boot Path** section beside the 5-layer table: the tier
table, the layout rule, the proxy cookie-first rule, the freshness rule, and a
boot budget per app. Both `proxy.ts` files now carry the freshness comment on
their `users` read.

## Two pieces of evidence above were stale

Worth recording, because the task was nearly written on them.

- **"Backoffice pay frequency, uncached in the layout."** It is cached, 300s,
  and has been since `08b211c` on 2026-08-23 — the same evening this file was
  opened. The verdict table in `CLAUDE.md` keeps the row but marks it fixed:
  a rule that can point at a bug it would have caught, now closed, is more
  convincing than one pointing at a bug that no longer exists.
- **"`users` row for role + status — no comment says why."** There was one:
  *"Always fetch fresh from DB — role changes must take effect immediately."*
  It gave the reason but not the trade, and did not say the choice was
  deliberate against two cached reads either side of it. Sharpened rather than
  written from scratch.

## What the budget turned up

Counting the boot properly, which is the exercise this task exists to force:

**A seller open is 7 proxy runs, not 1.** One navigation plus six prefetches,
each running the full proxy — including the uncached `users` read. The
prefetches are off the critical path — `MobileShell` gates them on `ready` and
schedules them in an idle callback — but off the critical path is not free, and
the count is what the budget records. Task 052
priced that read at 40-100ms and declined to cache it, correctly, on the
security trade. It priced it **once**. Seven times is a different number, and
nothing in `proxy.ts` or `navigation.ts` connected the two.

This does not change the verdict — caching role and status is still the wrong
trade. It sharpens the case for the alternative 052 already named: custom JWT
claims via a Supabase auth hook, which removes the read without weakening the
gate.

## Found while counting: the apps gate differently

`apps/seller/proxy.ts` selects `role, status` and locks out anything where
`status !== "active"`. `apps/backoffice/proxy.ts` selects `role` alone and gates
on `role === "ADMIN"`, never reading `status`.

**So a suspended or inactive ADMIN keeps full backoffice access.** Raised with
the owner 2026-08-25 and **left as is, deliberately**: they are the only ADMIN,
so there is no suspended-admin case to lock out. Written into
`apps/backoffice/proxy.ts` as a decision, with the condition that would reopen
it — a second admin.

Found by reading the two files side by side, which is the drift the "share the
proxy pipeline" item below predicts. This instance is harmless; the next one may
not be.

## What the budget immediately changed

Counting the prefetches led straight to switching them off — see
[[057_prefetch-experiment]]. That is the section doing its job on the day it was
written: nobody had a reason to question six prefetches until the cost was
written next to them.

The two cleanups found on the way are keepers regardless of how that experiment
ends: the shell no longer prefetches the route already on screen, and the three
`ComingSoon` placeholders no longer declare `prefetch: true`.

## Left open, deliberately

- **Recording the freshness of every existing server read.** The rule is
  written and the boot path's own reads are annotated; the long tail of API
  routes is mechanical and does not need to happen in one sitting.
- **`cachedTenantRead(name, ttl, fn)`.** Making an undeclared read fail to
  typecheck is attractive, but it is machinery built to enforce a convention
  that is one day old. Let the convention earn it first.
- **PostHog local evaluation.** Still its own task, as stated above.
- **Sharing the proxy pipeline.** Still deferred, and the status drift above is
  a point in its favour.
