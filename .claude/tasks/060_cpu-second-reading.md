# Task 060 — The second CPU reading, and what 044 actually bought

**Status: measured 2026-08-26. Items 1 and 3 shipped the same day; Item 2
unblocked but not built.** Successor to 044.

| Item | State |
|---|---|
| 1 — double store fetch | **Shipped** in 5.4.14 |
| 2 — flag evaluation | **Shipped** in 5.4.14. Local evaluation on, `onlyEvaluateLocally` left false on purpose. Inert until `POSTHOG_PERSONAL_API_KEY` reaches Vercel |
| 3 — instrumentation | **Shipped** in 5.4.14. Reads `[render-metrics]` in the Vercel logs |

**Next action: deploy 5.4.14, let a full window run, record its length, then
read `[render-metrics]` — see *Reading the instrumentation* below, which carries
the decision table.** That one result decides Item 3 *and* whether task 061's
Phase 2 is worth starting, so nothing else in either file should move first.

Not deployed as of writing; the instrumentation produces nothing until it is.

Two things this reading settles and one it opens:

- **044's rule survives.** `day-activity` was the one item predicted to move, and
  it moved the predicted way. `/api/products` left the board entirely.
- **Page renders are no longer the cheap half of the bill.** 044 recorded them at
  15–26ms and used that to shelve its Phase 7. The spread is now 14ms to 63ms,
  and the most expensive line on the whole board is a page.
- **`/api/stores` went the wrong way**, 60 → 89ms, with no change that explains it.

---

## The reading

**Window length unrecorded, again.** 044 warned about this and it happened
anyway: compare `ms/inv` only. Invocation counts and CPU totals across the two
readings are not comparable and nothing below rests on them.

| Route | Inv | CPU | ms/inv |
|---|---|---|---|
| `/[tenantSlug]/mobile/home/pos` | 190 | 12s | **63** |
| `/api/orders` | 192 | 10s | 52 |
| `/api/sessions/gate` | 209 | 9s | 43 |
| `/api/summaries` | 115 | 7s | 61 |
| `/[tenantSlug]/mobile/analytics` | 110 | 6s | 55 |
| `/api/flags` | 85 | 6s | **71** |
| `/[tenantSlug]/mobile/orders` | 142 | 6s | 42 |
| `/api/summaries/[summaryId]/users` | 145 | 5s | 34 |
| `/api/stores` | 54 | 4.78s | **89** |
| `/api/activity-logs/day-activity` | 103 | 4.57s | 44 |
| `/api/analytics/hourly-sales` | 86 | 3.68s | 43 |
| `/api/cron/weather/fetch` | 12 | 3.26s | 272 |
| `/api/cron/weather/realtime` | 25 | 3.11s | 124 |
| `/` | 24 | 2.78s | 116 |
| `/[tenantSlug]/mobile/home/manage` | 151 | 2.13s | **14** |
| `/api/version` | 93 | 2.09s | 22 |

### Against 044

| Route | Aug 4 | Aug 9 | Aug 26 | Δ since Aug 9 | What happened |
|---|---|---|---|---|---|
| `/api/activity-logs/day-activity` | 95 | 66 | **44** | **−33%** | 044 Item 1 shipped — `20260808182633` |
| `/api/summaries/[id]/users` | 35 | 44 | **34** | −23% | nothing; drift |
| `/api/sessions/gate` | 57 | 41 | 43 | +5% | nothing; flat |
| `/api/orders` | 54 | 49 | 52 | +6% | nothing; 044 closed it |
| `/api/summaries` | 51 | 57 | 61 | +7% | nothing |
| `/api/flags` | 75 | 61 | **71** | +16% | nothing |
| `/api/stores` | 140 | 60 | **89** | **+48%** | unexplained |
| `/api/products` | 72 | 72 | **off the board** | — | 044 Item 3's 6h cache |

**044's rule holds.** It predicted `day-activity` at 25–40ms if "query count is
the lever" was right, and warned the rule rested on one clean data point. It
landed at 44 — just outside, same direction, same magnitude. Ten queries to three
bought 33%. Two clean points now.

**Item 3 worked completely.** `/api/products` was 72ms × 69 and unmovable by
payload narrowing; a 6h TTL removed it from the top sixteen.

**Item 2 is invisible here by design** — the `store_orders` index
(`20260808184644`) is Postgres budget, and this dashboard does not show it.

---

## The page-render spread

044: *"Page renders are now 15–26ms, cheaper per call than every API route."*
That sentence is the reason its Phase 7 was shelved. It is no longer true.

| Page | ms/inv |
|---|---|
| `home/manage` | **14** |
| `mobile/orders` | 42 |
| `mobile/analytics` | 55 |
| `home/pos` | **63** |

**One explanation is ruled out.** All four pages are three-line client shells —
`home/pos/page.tsx`, `home/manage/page.tsx`, `mobile/orders/page.tsx` and
`mobile/analytics/page.tsx` each import a `"use client"` component and return it.
Whatever produces a 4.5× spread, it is not the pages.

> **Retracted.** An earlier draft of this file explained the spread as
> `MobileLayout` re-rendering on any navigation that leaves `home/`. That is
> probably wrong: `pos` and `orders` share `[tenantSlug]/mobile/layout` as their
> common prefix, and App Router renders from the point of divergence, so that
> layout should *not* re-render on a `pos → orders` navigation. The claim was
> asserted from the segment tree rather than measured, and it is withdrawn.

**Leading hypothesis, unverified: `ms/inv` is a blend, and the blend differs per
route.** A full-document render and an RSC-segment render are both one
invocation and are wildly different amounts of work. `pos` is the boot landing —
`launch.html` sends every open straight to it — so it carries the highest share
of full documents. `manage` is reached only from `pos`, is never a boot target,
and is the cheapest. The ordering falls out of that without needing any claim
about layouts re-rendering.

Other candidates, none excluded:

- **Layout re-render on cross-segment navigation** — the retracted claim. Still
  possible; it needs measuring, not asserting.
- **`__FRONTEND_NAV_CACHE__`** (see *Watch, don't act*) fetches each new path as
  a **full document**, once per device. That lands full-document renders on
  `orders`, `analytics` and `manage` in exactly the proportion their traffic
  suggests.
- **Cold starts**, distributed unevenly across routes.

**Item 3 is what settles this**, and until it reports, the only defensible
statement in this section is the table itself.

**`pos` being first is not a regression either way.** The
boot's document render used to be spread across `/` and `/login`; task 052 moved
it onto one route. The evidence is in the same table: `/` draws only 24
invocations, and `/login` does not appear in the top sixteen at all. Work
relocated, not created.

> The reading is a top-sixteen crop, so "off the board" everywhere in this file
> means *below the sixteenth row*, not zero. For `/api/products` that is still a
> real result — at its Aug 9 rate it would have placed around ninth.

> **Confidence: low, deliberately.** Four numbers and one ruled-out cause. No
> mechanism here is established. Item 3 is not "measure to confirm the plan" —
> it is "measure, because there is no plan yet".

---

## Do this

### Item 1 — `/api/stores` is 54 calls repeating a read the layout just did

> **Shipped. Corrected 2026-09-05 by task 063.** This item reads as unbuilt below
> and is not: `useStores` already carries `revalidateIfStale: false`, with a doc
> comment covering the same reasoning. The separate 89ms question at the end of
> the item is still open.

`BootFallback` seeds `SWRConfig.fallback` with the store list `MobileLayout`
already fetched. **SWR treats `fallback` as stale and revalidates on mount** —
`useStores` sets `revalidateOnFocus: false` and a 60s dedupe, and neither stops
that. So every boot pays the layout's cached read *and* a full `/api/stores`
round trip for the same rows.

```ts
// apps/seller/lib/hooks/stores/useStores.ts
return useSWR<StoreListResponse>("stores-all", () => storesApi.list(), {
    revalidateOnFocus: false,
    revalidateIfStale: false,   // ← the seeded list is authoritative for this boot
    dedupingInterval: 60_000,
});
```

Costs: a roster edited mid-session no longer appears until the next boot. The
server cache is already 60s, so the window was never tight. Call `mutate()`
explicitly wherever the app changes a store assignment.

**4.78s, most of it avoidable.** Cheapest item on the board.

Separately: **89ms is 48% worse than Aug 9 with no change to the route.** Worth
one `EXPLAIN` on `listUserStores` before assuming the number is noise — 044 saw
`day-activity` drift 31% untouched, so it may well be.

### Item 2 — stop the flag evaluation being a network call

71ms is a blocking PostHog HTTP round trip, 85 times. Tier 3, and the most
expensive non-cron API route per invocation.

> **A 60s `unstable_cache` around it — this item's first draft — buys almost
> nothing, and the arithmetic is worth keeping so nobody proposes it again.**
> `FlagsContext` already sets `dedupingInterval: 60_000`
> (`lib/context/FlagsContext.tsx:36`), so a given client will not ask twice
> inside 60s regardless. A 60s *server* cache can therefore only catch two
> different clients sharing one flag key within the same minute. Those 85
> invocations are roughly one per app load plus one per store switch — they do
> not overlap. The cache would hit almost never.
>
> A longer TTL does buy something, but it buys it by making flag flips take
> minutes, and `ops-maintenance` is on that path.

**The real fix is PostHog local evaluation.** `posthog-node` is on ^5.35.6, which
supports it: given a personal API key, the client polls flag *definitions* and
evaluates them in process. The person properties this app passes —
`{ role, tenantId, storeId }`, `app/api/flags/route.ts:14` — are exactly the kind
local evaluation handles.

That is not a cache. It moves the whole evaluation **from Tier 3 to Tier 0**, and
CLAUDE.md's own framing says that is the question to ask: not *where may this
live* but *how do I make it cheaper*. Task 054's revert note named this too,
alongside the caching idea; the caching half is what does not survive contact
with the client's dedupe.

**~71ms → ~0.** Roughly 6s of the bill.

### Built 2026-08-27

`personalApiKey` and `featureFlagsPollingInterval: 30_000` on the client
(`lib/flags.ts`). Two decisions in there are the whole of the risk:

- **`onlyEvaluateLocally` left at its default of `false`.** Setting it true
  guarantees no network call and also means an instance whose definitions have
  not loaded yet answers false for every flag. That is not a slow path, it is
  every feature off for the first requests a cold instance serves, and
  `ops-maintenance` is one of them. Left false, such an instance takes the
  network path — today's behaviour. Worst case is what we already have.
- **`personalApiKey` is `undefined` when the variable is absent**, which
  switches local evaluation off rather than failing. So the deploy is safe in an
  environment that does not have the variable yet, which at time of writing is
  Vercel.

**Still to do: add `POSTHOG_PERSONAL_API_KEY` to Vercel (staging and
production).** Until then this ships as a no-op and flags keep taking the 71ms
path — so the next reading will show no change on `/api/flags` and that is not a
failure of the item.

**Unresolved, and it needs a decision rather than a default.** Polling is a
`setInterval`, and a serverless instance freezes between invocations, so the
timer is not a reliable clock. A low-traffic instance can hold stale definitions
for longer than 30s. That is fine for the five feature flags and questionable for
`ops-maintenance`, which is the switch that turns the app off. Options if it
matters: keep maintenance on a separate network-path check, or accept the lag
deliberately and write it down. **Not decided.**

What it needed before it could be planned, all now answered:

- `POSTHOG_PERSONAL_API_KEY` — **DONE 2026-08-27.** Created as
  `tea-pos-flag-local-eval`, scoped with PostHog's *Local feature flag
  evaluation* preset, restricted to `TEA-POS-STG` and `TEA-POS-PROD`, and set in
  `.env`. **Still to do: add it to Vercel for both environments** — it is not a
  `NEXT_PUBLIC_` variable, so nothing picks it up from the client bundle.

  Kept because it caused half an hour of confusion and will again: it is **a
  second, new key, not the one already configured.** `POSTHOG_API_KEY` begins `phc_`,
  so it is a *project* key. That is the correct key for what the code does today
  (`new PostHog(...)` takes it positionally, `lib/flags.ts:37`, and event capture
  depends on it) and it **cannot download flag definitions** — PostHog withholds
  that from project keys deliberately, since they ship to browsers.
  Local evaluation needs a *personal* key (`phx_`), created under **account**
  settings rather than project settings, scoped to feature-flag read, and passed
  as the `personalApiKey` option alongside the existing one. It goes in both
  `.env` and Vercel's environment.
- **A poll interval, chosen rather than defaulted.** Local evaluation holds flag
  definitions in memory and refreshes on a timer, so a flag flip takes up to one
  interval instead of being instant. `ops-maintenance` is on that path — it is
  the switch that turns the app off — so the interval is a product decision, not
  a default to accept.
- A check that no flag in `FLAGS` uses targeting local evaluation cannot resolve.
  Cohort-based conditions are the usual gap. **Enumerate the seven flags against
  PostHog's project settings before committing to this.**
- The fallback path when definitions have not loaded yet. It must fail closed,
  same as today.

**Fail-closed is the constraint that outranks all of it.** `getAllFlags`
(`lib/flags.ts:62`) catches and returns `DISABLED`, so `evaluateFlagSet` never
throws — a PostHog outage arrives as a well-formed all-false object. Anything
that stores that result, cache or otherwise, converts a blip into minutes of
every feature off for everyone. Local evaluation avoids the trap by not storing
per-user results at all, but the same discipline applies to its definition
polling: a stale definition set is fine, a *failed* one must not be treated as an
answer.

### Item 3 — measure the page renders, then decide

Everything above is cheap and certain. This one is the largest number on the
board and the least understood, so it gets measured before it gets touched.

593 page invocations in this window (190 + 110 + 142 + 151), 26.1s of Active CPU
between them — as much as the top three API routes put together (10 + 9 + 7).
Whatever the mechanism turns out to be, that is where the money is.

What it does per render: `getCurrentTenantId()` (cookie, Tier 0),
`getRequestUser()` (cookie, Tier 0), `cookies()` for the selected store (Tier 0),
and two `unstable_cache` reads (Tier 1). **A Tier 1 hit is not free on Vercel** —
it is a network read against the data cache, and there are two of them.

Levers, in order of how much they cost to try:

1. **Instrument first, and instrument for the right question.** One deploy has to
   report three things, or it is wasted:
   a. `performance.now()` around `MobileLayout`'s `Promise.all` — splits "the two
      cached reads" from "rendering the provider tree".
   b. **Whether the invocation is a full document or an RSC segment render.** The
      `RSC` / `Next-Router-State-Tree` request headers distinguish them. This is
      the one that tests the blend hypothesis, and without it the other two
      numbers cannot be interpreted.
   c. Whether `[tenantSlug]/mobile/layout` executes at all on a `pos → orders`
      navigation — a single log line settles the retracted claim above.
2. **Pay frequency into a cookie.** Tenant-wide, changes a few times a year,
   already tolerates 300s of staleness. The proxy can write it beside
   `x-tenant-id`, which makes it Tier 0 and deletes one of the two reads.
3. **Store list into a cookie** — same idea, but per-user and much larger, so it
   is a size question, not a copy of item 2.

**Do not** re-open 044's shelved Phase 7 on the strength of this. It shelved page
navigations for auth and i18n first-paint risk, and those risks are unchanged.

---

## Note — the question this reading does not answer

*Why does the UI cost anything at all, if it does not change?*

The chunks do not: JS, CSS and fonts come off the CDN and the service-worker
precache, revision-keyed, at zero server cost. What is billed on every page row
is the **React server render** of that route's tree.

It cannot be cached today because of one line — `app/layout.tsx:72`,
`await cookies()`. A single `cookies()` call marks the whole subtree dynamic, so
nothing beneath the root layout can be prerendered. `public/launch.html` already
records this: it is a hand-written file in `public/` *because* a Next route under
that layout can never be precached.

And what is actually personal is tiny. The root layout wants locale and user
info; `MobileLayout` wants tenant, user, pay frequency, store list and selected
store. Everything else — shell, nav, product grid — is identical for every user
and is a client component regardless; `home/pos/page.tsx` is four lines returning
`<POS />`. So a full dynamic render produces a tree whose only variable content
is a handful of cookie values it hands straight to client providers.

**PPR is the shape that fits.** Prerender the static shell, stream the dynamic
holes; the shell leaves the CDN at zero server cost and only the cookie-dependent
parts render per request. Both `ppr` and `cacheComponents` are valid config keys
in the installed Next 16.2.4 — checked against `next/dist/server/config-schema`,
not from memory.

If it works it is worth more than Items 1–3 combined, because it *removes* server
renders rather than shaving them. **Recorded as a note, not an item**, because
nothing here has been verified: not how PPR interacts with a `proxy.ts` auth
model, not what it does to the boot sequence tasks 052/056 tuned, not whether the
static shell can be precached the way `launch.html` is. Any attempt starts by
answering those, on one route, behind a flag.

The alternative — moving the cookie reads to the client, which `x-user-info`,
`locale` and `selectedStoreId` all permit — makes the tree static and is
**rejected**: first paint would stop knowing the user and the language, which is
the exact regression tasks 052 and 053 were built to fix.

Small cleanup while in that file: `evaluateFlagSet`'s doc comment still says it
exists so `/api/flags` "and the mobile layout's server render" agree. The layout
has not evaluated flags since 054 was reverted.

---

## Reading the instrumentation — do this first tomorrow

Shipped in 5.4.14, in `apps/seller/app/[tenantSlug]/mobile/layout.tsx`. Vercel
runtime logs, filter `[render-metrics]`. Each line is one layout render:

```
[render-metrics] kind=doc reads=31.7ms
```

**Three questions, and the answers are read off the same set of lines.**

**Q1 — is `ms/inv` a blend?** Group the lines by route and count `kind=doc`
against `kind=rsc`.

| What you see | What it means | What happens next |
|---|---|---|
| `home/pos` mostly `doc`, `manage` mostly `rsc` | **Blend confirmed.** The spread is full documents, not layout cost | Item 3's cookie plan is dead. Go to task 061 — a prerendered shell is the fix |
| Similar doc/rsc mix on every route | Blend is not the cause | The spread is the layout or cold starts. Continue with Item 3's levers |
| Almost no `doc` lines anywhere | Full documents are rare | Cold starts. Neither 060 nor 061 addresses that; open a new task |

**Q2 — what do the reads cost?** Take the median `reads` across all lines. That
is the whole Tier 1 cost of this layout; the gap between it and Vercel's reported
duration is the provider tree plus serialization.

| Median `reads` | Reading |
|---|---|
| 30ms+ | The two `unstable_cache` reads are the story. Move pay frequency to a cookie |
| Under ~10ms | The reads are not the problem. Do **not** do the cookie work |

**Q3 — does this layout re-run when you leave `home/`?** Look for
`[render-metrics]` lines attributed to `/[tenantSlug]/mobile/orders` or
`/analytics`. If they appear, the layout does re-run on those navigations and the
mechanism retracted above was right after all. If they do not, the retraction
stands.

**Then delete the instrumentation.** It is marked TEMPORARY in two places in that
file — the `loadLayoutData` helper and the log block — and `loadLayoutData` is
meant to be inlined back into the layout when it goes.

---

## Cleanup — flag drift, found 2026-08-26

Not CPU work. Found while checking flag targeting for Item 2, and invisible
unless someone opens PostHog's flag list beside `lib/flags.ts`. Owner is aware of
both; deferred deliberately.

**PostHog has 8 flags. `lib/flags.ts` declares 7. They are not the same 7.**

| Flag | Code | PostHog | Consequence |
|---|---|---|---|
| `feature-fast-order` | declared, `flags.ts:11` | **missing** | Evaluates false forever. Fast order mode is unreachable — `MoreMenu.tsx:102` never renders |
| `feature-claims` | not referenced | exists, `100% of all users`, tagged STALE | Dead flag; feature already released to everyone |
| `feature-pay` | not referenced | exists, `100% of all users`, tagged STALE | Same |

Fix is one decision each: create `feature-fast-order` in PostHog **or** drop it
from the code and ungate the menu item; delete the two stale flags. Note that
undefined flags fail closed silently, which is why this cost nothing to nobody
and would have stayed hidden.

---

## Watch, don't act

- **`/api/sessions/gate` — 209 invocations, the highest count on the board.**
  43ms each, which is fine; the count is the question. `useSession` is one of
  three hooks with `revalidateOnFocus: true` — the others are `useWeather` and
  `useCustomerFeedbacks` — and it is the only one that *also* polls, every 30s,
  whenever realtime is disconnected. On a phone that sleeps, both fire often.
  **Measure the realtime connection rate before changing anything** — if realtime
  is up, the poll is idle and focus is the whole story, and those two have
  opposite fixes.
- **`/api/summaries/[summaryId]/users` — 145 invocations.** More than
  `/api/stores`, from `MobileAnalytics` and `TakeOverCard`. But it is 34ms and it
  *improved* 23% untouched. Cheap; leave it.
- **`cacheOnFrontEndNav: true`.** The generated `public/sw.js` registers no
  `pages` route — a custom `workboxOptions.runtimeCaching` array replaces
  next-pwa's defaults — so `swe-worker`'s `__FRONTEND_NAV_CACHE__` fetches each
  new path once per device into a cache **nothing ever reads**. Pure waste, but
  bounded at once per path per device, so the volume is small. One word to
  remove; take it while in the file, not on its own.
- **`__START_URL_CACHE__`.** Does `fetch("/")`, and `/` is `redirect("/login")`,
  so `if (!res.redirected)` means the response is never stored and the fetch
  repeats every time it fires. A permanently-failing cache. `/` is only 24
  invocations, so this is a curiosity, not a cost.
- **The crons.** 272ms and 124ms per invocation, the most expensive calls on the
  board — at 12 and 25 invocations. Correctly sized.
- **Prefetch is not implicated.** It has been off since `a12afae` (2026-08-25)
  and disabling it can only remove requests. Task 057 still owns the revert.

---

## Verification

1. **Item 1.** Boot the app with the network panel open and confirm `/api/stores`
   does **not** fire when the layout seeded the list. Then change a store
   assignment and confirm the picker updates on the next boot.
2. **Item 2.** Before any code: enumerate all seven flags in `FLAGS` against
   their PostHog targeting and confirm local evaluation can resolve each one. If
   any cannot, the item is smaller than advertised and needs re-scoping, not
   patching. Then:
   a. `/api/flags` makes **no outbound HTTP call** per request — check on the wire,
      not in the response.
   b. Flip each flag in PostHog and confirm it lands within the definition poll
      interval.
   c. **Block PostHog at the network layer, then restore it.** Flags go false
      while blocked and recover on the next request. An all-false answer that
      outlives the outage means a failure got stored, and the item is wrong.
3. **Item 3.** Ship the instrumentation alone and read it before touching
   anything. The pay-frequency and store-list cookie moves wait on what it says.
4. **Scoreboard.** Re-read after a full window and **record the window length**
   this time — two readings have now failed to. Expect `/api/stores` and
   `/api/flags` to move and nothing else to.

## What would make me stop and re-plan

- **`/api/stores` still at ~89ms after Item 1.** The item removes invocations, not
  milliseconds; if `ms/inv` is unchanged the +48% is a separate, unexplained
  problem and it should be found before anything else is built on this reading.
- **Instrumentation showing `MobileLayout` under ~10ms.** Then the page spread is
  the blend, or cold starts, and Item 3's cookie plan is aimed at the wrong
  thing. This is the *expected* outcome if the blend hypothesis is right, so plan
  for it rather than treating it as a surprise.
- **The blend hypothesis confirmed.** Then the lever is not the layout at all —
  it is the number of full-document renders, which is a service-worker and
  routing question, and task 061's static-shell work is the response rather than
  anything in this file.
- **A third reading with no deploy between it and this one that moves any row more
  than 20%.** 044 asked for exactly this control and never got it. Until it
  exists, every Δ in this file is directional.
