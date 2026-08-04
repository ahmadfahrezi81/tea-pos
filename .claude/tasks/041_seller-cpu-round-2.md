# Task 041 — Seller Active CPU, Round 2

**Status: Phases 0–5 written; 6 and 7 remain.** Successor to task 037, which
closed item #1 (middleware), reverted item #2 (`/api/orders`), and never
started item #3 (`/api/sessions/gate`).

| Phase | State |
|---|---|
| 0 — dead prefetch | **done**, confirmed gone from the logs. The other `/_not-found` source went to task 042 |
| 1 — singleton clients | **done**, deliberately unmeasured (see "How to measure") |
| 2 — narrow selects | **done at three routes**, two descoped with reasons |
| 3 — orders cap + totals | **done**, except the index migration, which needs `supabase migration list` first |
| 4 — gate join | **done** |
| 5 — delete `users` | **done** |
| 6 — `daily_summary_id` on logs | **not started** — needs a migration and a manual push |
| 7 — page navigations | **not started** — own branch, the only phase with real UX risk |

Nothing past Phase 0 has been verified in production. The CPU result is one
reading at the end of a cycle, not per phase — see "How to measure".

Since July, call volume dropped ~3× while per-call CPU roughly doubled on
eight of nine routes — so this round targets per-call cost, not traffic. Two
items (`/api/stores`, `day-activity`) are less "optimise this query" than
"this endpoint has carried a design mistake for months"; they are worth doing
even if the CPU number were fine.

**Constraint on everything below:** CPU is not the only budget. A change that
saves milliseconds and costs UX, readability or maintainability is a bad
trade. One proposal was dropped on exactly those grounds — see "Against the
three constraints".

## Measurement — top 20 routes, 12h window (2026-08-04)

| # | Route | Invocations | Active CPU | ms/inv | Kind |
|---|---|---|---|---|---|
| 1 | `/api/sessions/gate` | 210 | 12s | ~57 | api |
| 2 | `/api/activity-logs/day-activity` | 84 | 8s | ~95 | api |
| 3 | `/api/orders` | 149 | 8s | ~54 | api |
| 4 | `/api/summaries` | 99 | 5s | ~51 | api |
| 5 | `/[tenantSlug]/mobile/analytics` | 162 | 5s | ~31 | page |
| 6 | `/api/flags` | 67 | 5s | ~75 | api |
| 7 | `/[tenantSlug]/mobile/home/pos` | 167 | 4.75s | ~28 | page |
| 8 | `/[tenantSlug]/mobile/orders` | 160 | 4.65s | ~29 | page |
| 9 | `/api/stores` | 29 | 4.07s | **~140** | api |
| 10 | `/api/cron/weather/fetch` | 12 | 3.18s | ~265 | cron |
| 11 | `/api/summaries/[summaryId]/users` | 91 | 3.17s | ~35 | api |
| 12 | `/api/cron/weather/realtime` | 25 | 3.08s | ~123 | cron |
| 13 | `/_not-found` | 105 | 2.97s | ~28 | page |
| 14 | `/api/products` | 37 | 2.68s | ~72 | api |
| 15 | `/` | 38 | 2.15s | ~57 | page |
| 16 | `/[tenantSlug]/mobile/home/manage` | 134 | 1.98s | ~15 | page |
| 17 | `/[tenantSlug]/mobile/chats` | 67 | 1.13s | ~17 | page |
| 18 | `/[tenantSlug]/mobile/more` | 73 | 1.12s | ~15 | page |
| 19 | `/[tenantSlug]/mobile/more/stores` | 66 | 1.01s | ~15 | page |
| 20 | `/[tenantSlug]/mobile/more/map` | 66 | 1.00s | ~15 | page |

**Top 20 = 79.9s / 12h.** Billing cycle: **2h37m / 4h** over ~29 days
(≈5.4 min/day), Jul 31 peak ~8m56s against a 3–5m baseline.

| Bucket | CPU / 12h | Share of visible | Invocations |
|---|---|---|---|
| API routes | 47.9s | 60% | 766 |
| Page renders | 25.8s | 32% | 1,038 |
| Cron | 6.3s | 8% | 37 |

The list decays fast (#20 is 1.0s), so these twenty routes are essentially
all the *visible* CPU. Two consequences shape the plan:

**Page renders are a third of the visible bill and take more requests than
every API route combined** — 1,038 vs 766, individually cheap (15–31ms),
collectively 25.8s. Parked in the first draft as a small uncertain win; that
was wrong on this data. See Phase 7.

**`proxy.ts` is not in this table at all** and is very likely the single
largest line item. Vercel reports it as a separate function type; task 037
measured it at **1h28m of a 4h cycle (38%)**. It runs on every one of those
1,038+ page navigations. 037 closed it after fixing the tenant lookup, but
"closed" meant *no further lever on the existing design* — `auth.getUser()`
ruled out (legacy JWT signing), role lookup deliberately uncached for
security. Neither forecloses Phase 7's different question: why does a
client-side navigation inside an installed PWA hit a function at all?

Scaling 79.9s/12h to a full day gives ~110–130s against daily bars of
180–216s, so **these twenty routes are ~60% of the bill and everything
invisible — the sub-1s tail plus middleware — is ~40%.** Independently
consistent with 037's 38% middleware measurement.

### Items visible only in the extended table

- **`/_not-found` — 105 invocations, 2.97s.** 037 saw 189/12h and parked it
  as "a why question". Still happening a month later; 100% waste. Cheapest
  item on the board — promoted to Phase 0.
- **Weather crons — 6.3s from 37 invocations, 8% of visible CPU.**
  `realtime` runs 25× per 12h (~every 29 min) at 123ms, `fetch` 12× at 265ms,
  both serving a cached forecast table. Hourly weather does not need a
  half-hourly refresh. Likely a `vercel.json` schedule change, not code.
- **`/api/products` — 37 calls, 72ms each.** Menu changes weekly. The one
  endpoint where caching is unambiguously safe, and it has none.
- **`/api/summaries/[summaryId]/users` — 91 calls, 35ms.** Not previously
  examined. Backed by `fetchSessionUsersForSummaries`
  (`packages/services/sessions.ts:285`). Assumed to share the list-endpoint
  shape and folded into Phase 2 — it doesn't, and was descoped there.

---

## Will this get under 2h?

**Not on Phases 1–6 alone.** Target end-states, route by route:

| Route | Now | After | Saved | Phase |
|---|---|---|---|---|
| `gate` | 12s | ~9.5s | 2.5s | 4 |
| `orders` | 8s | ~2s | 6s | 3 |
| `day-activity` | 8s | ~3s | 5s | 6 |
| `flags` | 5s | ~2s | 3s | 1 |
| `summaries` | 5s | ~3.5s | 1.5s | 2 |
| `stores` | 4.07s | ~1.5s | 2.6s | 2+5 |
| ~~`summaries/[id]/users`~~ | 3.17s | — | — | descoped |
| `products` | 2.68s | ~2s | 0.7s | 2 |
| all API routes | — | — | ~2s | 1 |

**≈24.5s — about half the API bucket, but only ~18% of the whole bill**,
because Phases 1–6 touch neither pages nor middleware. 18% of 2h37m ≈ 28 min,
landing around **2h05–2h10**.

Clearing 2h needs 24%+, and the way there is not squeezing API routes harder:

- **Page renders** — 19% of the bill. A 60% cut ≈ 18 min.
- **Middleware** — ~35–38% of the bill (inferred). A 30% cut ≈ 17 min.

Either one plus Phases 1–6 clears 2h. They are also one fix from two sides:
**fewer server-rendered navigations means fewer page invocations *and* fewer
proxy runs.** That is Phase 7.

**Prefer a better target than "under 2h".** Daily bars swing 3m36s to 8m56s;
an 18% cut against the average is one busy week from being absorbed. The
durable goal is **flat CPU per store per day**. Phases 3, 5, 6 and 7 change
the curve; the rest change the constant.

---

## Findings

### 1 — A new Supabase client is constructed on every request

```ts
// apps/seller/lib/supabase/service.ts
export function getServiceClient() {
    return createClient<Database>(url, serviceRoleKey);   // ← every call
}
```

42 of the seller app's 49 API route files call this. `createClient`
constructs five sub-clients; `GoTrueClient` is the least trivial — with the
default `persistSession: true` / `autoRefreshToken: true` it sets up storage
and starts an async `_initialize()`, none of which a service-role client on a
server uses.

> **Do not revive the TLS theory.** An earlier draft claimed this was the
> biggest finding, because a per-request client supposedly cannot reuse a
> keep-alive connection. Wrong — checked `@supabase/supabase-js@2.99.2`:
>
> ```js
> const resolveFetch = (customFetch) => {
>     if (customFetch) return (...args) => customFetch(...args);
>     return (...args) => fetch(...args);            // ← global fetch
> };
> ```
>
> No `customFetch` is passed anywhere, so every client uses Node's global
> `fetch`, whose undici pool is global and keyed by origin, not owned by the
> client. Second client, same warm socket, no extra handshake.

So this is **single-digit milliseconds, not fifty** — worth fixing because it
is five lines and strictly less work, not because it explains the table.

**What does explain the 28–140ms band is not established.** Per-route costs
broadly track the work each route does, so there may be no fixed tax to find
— just every route doing more than it needs, which is Findings 2–6. **Do not
let the plan depend on a fixed-tax theory.**

`apps/seller/lib/flags.ts` has the same shape: `new PostHog(...)` per request
with `flushAt: 1, flushInterval: 0`, then `shutdown()`. At 75ms for one
cookie read plus one flag evaluation it is the clearest outlier on the board,
and since Fluid does not bill I/O wait the PostHog round trip cannot be the
answer. Profile it locally before assuming a singleton fixes it.

### 2 — Every list endpoint walks its payload four times

The house pattern is `DB → toCamelKeys() → safeParse() → NextResponse.json()`.
Free for a scalar; for a list it is four traversals, two allocating a full
copy:

1. `toCamelKeys` (`packages/utils/schemas.ts:16`) — recursive
   `Object.entries().reduce()` plus a regex `.replace()` per key per row.
2. `safeParse` — walks and allocates again.
3. `JSON.stringify` — walks a fourth time.

On `/api/orders` a busy day is ~300 orders × (8 fields + `stores` + `users` +
~3 items × 8 fields + nested `tenant_products`) ≈ 15,000 nodes. Plausibly a
large share of the 54ms — reasoning, not measurement.

**The Zod pass is also stripping, which decides the fix order.** Zod objects
default to `strip`, so `safeParse` silently drops undeclared keys. With
`select("*")`, that schema is the only thing keeping extra DB columns out of
the response. Removing the parse without first narrowing the select would
**widen** the payload. Phase 2 is ordered accordingly.

### 3 — `/api/orders` has no limit at all

`listOrders` (`packages/services/orders.ts:29`) has no `.limit()`, no
`.range()`:

```ts
.select(`*, stores(name), users(full_name), store_order_items(*, tenant_products(name))`)
```

- `stores(name)` and `users(full_name)` join **per row** — the same store name
  repeated 300 times on a single-store, single-day view.
- An unbounded list has a ceiling somewhere. 037 asserted PostgREST's default
  `max-rows` of 1000 and this task repeated it; **neither verified it against
  this project's config**. Check the dashboard before quoting the number. The
  consequence if a cap exists is not in doubt: the client sums this same array
  for "total orders / sales / cups" (`MobileOrders.tsx:94`), so truncation
  makes the summary silently **wrong** rather than visibly broken.

Client side, separately: every card renders fully expanded — order ID, store,
seller, timestamp, every line item (`MobileOrders.tsx:214`). That costs phone
battery and scroll jank, not Vercel CPU, but it is part of the same screen.

### 4 — `/api/stores` ships the whole tenant's user list, and nothing reads it

`listUserStores` (`packages/services/stores.ts:6`) runs three queries; the
second is:

```ts
supabase.from("user_tenant_assignments")
    .select("users(id, full_name, email)")
    .eq("tenant_id", tenantId)          // ← every user in the tenant
```

A store-picker endpoint returning the org chart, on the worst per-call route
on the board, growing with every hire.

**And it is dead weight.** `StoreListResponse` declares `users` as required,
but all three consumers of `useStores` — `StoreContext:36`,
`MobileLayoutClient:40`, `MobileProfileStores:7` — read only `stores` and
`assignments`. The query, the schema field and the payload satisfy nothing.
The fix is deletion, not optimisation.

### 5 — `day-activity` runs nine queries, seven to build an `IN` list

`getDayActivity` (`packages/services/activity-logs.ts:62`) fetches the
summary, fires seven parallel queries whose only purpose is collecting child
row IDs, then queries the logs with `.in("ref_id", allRefIds)` — an `IN` list
holding every order ID for the day, several hundred UUIDs in a URL.

The root cause is a schema gap. Five of the seven preamble queries are
literally `.eq("daily_summary_id", summaryId)` against
`store_daily_summary_photos`, `store_expenses`, `store_sessions`,
`store_requests`, `store_reports` — **every child table already carries
`daily_summary_id`; `tenant_activity_logs` is the one that doesn't.** It has
only `ref_id`, so the summary→events link is rebuilt on every request.

Then a `createSignedUrl()` per photo event — `Promise.all`-wrapped, so not a
serial stall, but N HTTPS calls whose results usually go unviewed because the
photos sit behind a collapsed section.

> **Rejected fix, recorded so it isn't retried:** filtering
> `tenant_activity_logs` by `store_id` + the day's `created_at` range, the way
> `listStoreActivityLogs` does. It looks equivalent and isn't. The day
> boundary comes from the summary's business `date`, but a store closing
> 22:00–01:00 logs `store_closed`, closing photos and final expenses **after
> midnight UTC+7**. Those belong to the previous day's summary and are
> correctly included today via `ref_id`; a time range would drop them.

### 6 — No caching anywhere

`grep` for `revalidate`, `unstable_cache`, `Cache-Control`, `revalidatePath`
across `apps/seller/app` returns **nothing**. (CLAUDE.md claimed
`revalidatePath()` was the house pattern; it isn't, and that line has been
corrected.) Every response is computed from scratch.

### 7 — Analytics aggregates in Node what Postgres could aggregate

`getProductSales` and `getDayOfWeekSales` (`packages/services/analytics.ts`)
call `fetchAllOrderItems`, which pages `store_order_items` 1000 rows at a time
in a `while (true)` loop accumulating with `all.concat(data)` (quadratic),
then reduces in JS.

**Sanity check against the data: no `/api/analytics/*` route appears in the
top 20**, so each is under 1.0s/12h. This is a latent problem, not a current
cost — parked accordingly, with one freebie kept in Phase 2.

---

## Plan

Phases 1–7 are ordered by (CPU removed) ÷ (diff size), with the Finding 1
caveat that Phase 1's size is uncertain — **measure after Phase 1 before
sizing the rest.** Phase 0 jumps the queue because it is free: an
investigation with no code change and no dependency on anything else.

### Against the three constraints — UX, readability, maintainability

| Phase | UX | Readability / maintainability |
|---|---|---|
| 0 `/_not-found` | neutral, or better if a dead link is fixed | **better** — removes a broken route |
| 1 Singleton clients | neutral | **better** — one client, explicit options |
| 2 Narrow selects | neutral | **better** — queries name their fields instead of `*` |
| 3 Orders limit + totals | **better** — faster tab, no 300-card scroll | neutral |
| 4 Gate join | neutral | **better** — 3 round trips → 2 |
| 5 Delete `users` | neutral | **better** — deletes a query, a field, a type |
| 6 `daily_summary_id` on logs | neutral | **better** — 9 queries → 2, models the real relationship |
| 7 Page navigations | **risk** — locale flash on first paint | neutral to better |

Phase 7 carries the only genuine UX risk, which is why it ships last and
alone. Everything before it is neutral-or-better on all three axes.

**Dropped: dev-only response validation.** An earlier draft proposed running
`safeParse` only when `NODE_ENV !== "production"`. It saves real CPU and
fails the principle: production and development would take different paths
through the response layer, so the one environment where schema drift matters
stops checking for it. Phase 2's select narrowing gets most of the same win —
a parse over an already-correct object is far cheaper than one stripping a
dozen keys per row — without splitting behaviour by environment.

### Phase 0 — Find the `/_not-found` source (do this first)

105 invocations and 2.97s per 12h rendering a 404 for a route that doesn't
exist — pure waste, ~4% of the visible bill, and the only item here needing no
code change at all if the cause is a dead link. 037 saw it at 189/12h and
parked it as "a why question"; a month later it is still running.

> **Resolved 2026-08-04 from the Vercel logs** (`route:/_not-found`,
> `environment:production`). Two distinct causes, neither of them the missing
> favicon an earlier draft guessed at. The first is fixed here; the second is
> not a CPU problem at all and needs its own task.

**Cause 1 — a dead route in the prefetch list. Fixed.**
`MobileLayoutClient.tsx:24` still listed `/mobile/notifications` in
`PREFETCH_SUFFIXES`. Task 022 deleted the notifications feature; this entry
survived it. The shell warms that list on **every mount**, and the path
matches the proxy matcher (`/:tenantSlug/mobile/:path*`), so each app open
burned a middleware invocation *and* a `/_not-found` render — the `m` + `f`
badge pair visible on those log rows. One line deleted. Backoffice's list
(`dashboard`, `pay`, `account`) is clean.

**Cause 2 — there is no service worker in production. Not fixed; see below.**
`GET /sw.js` returns 404 with `x-matched-path: /_not-found`, so every service
worker update check also renders the 404 page as a function.

The root cause is a silent build regression, reproduced locally: the build
banner reads `▲ Next.js 16.2.4 (Turbopack)`. Next 16 builds with Turbopack by
default, and `@ducanh2912/next-pwa` is a **webpack** plugin — it hooks
`config.webpack`, which Turbopack never calls. `withPWA` no-ops with no error
and no warning. Deleting `public/sw.js` and running `pnpm build` regenerates
nothing; the `sw.js` / `workbox-*.js` / `swe-worker-*.js` files still sitting
in `public/` locally are leftovers from a pre-upgrade webpack build.

Consequences well past this task's CPU budget:

- **No offline support.** None of the `runtimeCaching` rules in
  `next.config.ts:15-45` are in effect for a POS that is meant to work on a
  patchy connection.
- **Installed PWAs can never update.** A device still holding a service worker
  from a pre-upgrade build polls `/sw.js`, gets a 404, and keeps serving its
  cached bundle indefinitely. This is very likely the mechanism behind task
  040's lost staging cycle, and it means the force-quit advice in this task's
  Rollout section is currently the *only* way a client fix reaches a device.

**Split out to task 042, and since fixed there.** The options were a
build-tooling decision with a possible dependency swap, which does not belong
in a CPU task. 042 took `next build --webpack`; `/sw.js` now returns 200 on
staging, so this source of `/_not-found` renders is closed for every device
immediately — it does not wait on anything picking up the new worker.

**Phase 0 verified 2026-08-04.** Owner confirmed
`/tealicious/mobile/notifications` no longer appears in the production logs
after the prefetch removal, and `/sw.js` returns 200 on staging. Both sources
are gone; `/_not-found` should fall out of the route table on the next window.
That is the last item in this task's Verification list, and the only one that
can be checked without a fresh CPU reading.

### Phase 1 — Singleton clients

1. `apps/seller/lib/supabase/service.ts` — memoize at module scope:

   ```ts
   let client: SupabaseClient<Database> | null = null;
   export function getServiceClient() {
       client ??= createClient<Database>(url, key, {
           auth: { persistSession: false, autoRefreshToken: false },
       });
       return client;
   }
   ```

2. `apps/seller/lib/flags.ts` — hoist the `PostHog` instance to module scope,
   drop the per-request `shutdown()`, batch properly (`flushAt: 20`,
   `flushInterval: 10000`). Keep an `after()`-scheduled `flush()` if any route
   captures events; never `shutdown()` a shared client.

   **Local evaluation probably matters more than the singleton.**
   `posthog-node` can poll flag *definitions* and evaluate in-process given a
   `personalApiKey` — zero per-request network call. Every person property
   this app passes (`role`, `tenantId`, `storeId`) is supplied explicitly at
   the call site, so the flags are locally evaluable. It also removes a live
   dependency on PostHog being reachable: today an outage silently disables
   every flag, including `ops-maintenance`, via the `DISABLED` fallback.

3. Do **not** touch `getSSRClient()` — it closes over per-request cookies.
   Checked: every `supabase.auth.*` call in the app goes through it, never
   through the service client (`app/api/auth/signout`, `app/auth/callback`,
   `AuthContext`), so `persistSession: false` on the service client is safe.
4. Mirror the Supabase client into `apps/backoffice` — **only that one.**
   Backoffice has no `lib/flags.ts`; it still uses the legacy env-var flags
   (`isEnabled()` from `packages/features/shared/features.ts`) and never
   constructs a PostHog server client.
5. ~~**Then measure**, before sizing Phases 2–6 against each other.~~
   **Dropped as a gate (owner decision, 2026-08-04).** See "How to measure".

> **Applied 2026-08-04.** Both `service.ts` files memoized with
> `persistSession: false` / `autoRefreshToken: false`; `lib/flags.ts` hoisted
> to a module-scope PostHog singleton with `flushAt: 20`,
> `flushInterval: 10000`, and the per-request `shutdown()` replaced by an
> `after()`-scheduled `flush()`. Typecheck and lint counts are identical to
> HEAD on both apps (seller 23, backoffice 5 — the pre-existing baseline from
> task 038; every remaining `tsc` error is in Next's stale
> `.next/dev/types/validator.ts`). **Not yet measured** — step 5 is the gate
> before sizing the rest.

> **The singleton is shared across concurrent requests.** Fluid runs several
> invocations in one process, so this client is now genuinely shared state.
> That is safe as written — PostgREST query builders return new objects per
> call, and the key and headers are fixed at construction. It stops being safe
> the moment anything attaches per-request state to it: no
> `.auth.setSession()`, no mutating `.headers`, no stashing a tenant id on it.
> This client bypasses RLS, so a leak there crosses tenants. Worth a comment
> above the singleton saying exactly that.

### Phase 2 — Narrow the selects

One change per route doing three things: less data off the wire, no
`toCamelKeys` walk, and a cheaper parse because nothing is left to strip.

Alias columns so Postgres returns camelCase directly, and name every column
instead of `*`. **Embedded resources need aliasing too, not just scalars** —
the schemas expect `storeOrderItems` and `tenantProducts`, which are relation
names, not columns.

> **The rule that decides whether this works: in Zod, `.nullable()` still
> requires the key to be present. Only `.optional()` lets you omit it.**
> Checked `packages/features/orders/schema.ts` — every field on
> `OrderResponse` and `OrderItemResponse` is `.nullable()`, and only
> `paymentMethod` is `.optional()`. So a narrowed select must produce
> **exactly** the schema's key set: drop one column and `safeParse` fails with
> a missing-key error, not a silently smaller payload.
>
> This makes Phase 2 a two-file change per route, not one. The select and the
> response schema move together — narrowing the query without deleting the
> field from the schema is the failure mode to expect, and the retained
> `safeParse` is what catches it in dev.

The `/api/orders` query is the clearest illustration of embedded aliasing
(**that route is owned by Phase 3** — shown here only as the pattern):

```ts
.select(`
    id, storeId:store_id, userId:user_id, tenantId:tenant_id,
    totalAmount:total_amount, createdAt:created_at, paymentMethod:payment_method,
    users(fullName:full_name),
    storeOrderItems:store_order_items(
        id, orderId:order_id, productId:product_id, tenantId:tenant_id,
        quantity, unitPrice:unit_price, totalPrice:total_price,
        createdAt:created_at,
        tenantProducts:tenant_products(name)
    )
`)
```

Note what the example does **not** drop: `tenantId` and `createdAt` on both
levels, and the `users` embed. All are `.nullable()` in the schema, so
omitting any of them breaks the parse unless the schema is edited in the same
commit. `stores` is the one field Phase 3 removes — and it removes it from
the schema too.

Then drop `toCamelKeys` on that path. **Keep the `safeParse`.**

Scope: `/api/summaries`, `/api/activity-logs/day-activity`, `/api/stores`,
`/api/products`. `/api/orders` is excluded — Phase 3 rewrites that query
anyway, so narrowing it here would mean editing the same select twice and
re-capturing the baseline in between.

> **`/api/summaries/[summaryId]/users` removed from scope, 2026-08-04.** It
> was folded in on the assumption it shared the list-endpoint shape. Reading
> it, it doesn't: `fetchSessionUsersForSummaries`
> (`packages/services/sessions.ts:285`) already selects a narrow column list
> and **already returns camelCase**, assembling
> `{userId, userName, userAvatarUrl, totalCups}` in JS — so there is no
> `toCamelKeys` walk to remove and nothing to narrow.
>
> Its 35ms is a different problem: one order query **per summary**, each
> pulling `store_order_items(quantity)` over a session-bounded time range,
> then matching orders to sessions in JS. That is a query-count and
> aggregation issue, closer to Finding 7 than Finding 2. It is also shared
> with backoffice's payout day-summary page, so it needs its own look rather
> than a mechanical edit. Left alone.
>
> **`/api/activity-logs/day-activity` also removed from scope, 2026-08-04** —
> same reason, found the same way. `packages/services/activity-logs.ts` never
> calls `toCamelKeys`; `getDayActivity` builds its `EventSegment` objects in
> camelCase by hand, and every one of its selects is already a narrow explicit
> column list. There is no walk to remove and nothing to narrow. Its 95ms is
> the nine queries and the per-photo `createSignedUrl` — **entirely Phase 6's
> problem**, and narrowing anything here first would only edit selects that
> Phase 6 deletes.
>
> **Phase 2 is therefore complete at three routes**, not five. The scope was
> written from the route table's cost ranking rather than from which services
> actually carry the `toCamelKeys` pattern — worth checking that first next
> time. `/api/orders` (the fourth) is in Phase 3 by design.

**Applied 2026-08-04 — `/api/products`.** Columns aliased to camelCase in the
query, `toCamelKeys` dropped, service now returns rows straight from the
driver.

> **Found a live bug while narrowing it.** The old select embedded
> `tenant_product_categories(id, name)`, but the transform destructured
> `product_categories` — a name that never existed on the row, because
> PostgREST keys an embed by the relationship name used in the select. So
> `categoryName` has been **`null` on every response since it was written**,
> and the join was fetched and discarded on every call.
>
> Traced the consumers before deciding: `categoryName` and `categoryId` have
> zero readers, and the POS reads only `id`, `name`, `price`, `imageUrl`
> (`MobilePOS.tsx:162` via `useProducts`). Dropped the embed and removed
> `categoryName` from `ProductResponse` rather than repairing a field nobody
> asked for. Remaining references are in `apps/admin`, which is archived and
> out of the workspace.

**Applied 2026-08-04 — `/api/stores`.** Store columns aliased; `toCamelKeys`
gone from the service entirely. Note the second half: the `assignments` map is
built in JS and only reached camelCase *because* `toCamelKeys` ran over the
whole return value, so its source query is aliased too
(`userId:user_id, storeId:store_id, isDefault:is_default`) and the map is
assembled in camelCase directly. This is the same trap the `listSummaries`
note below describes — worth expecting on any route where the service shapes
data after the query.

**Applied 2026-08-04 — `/api/summaries`.** Both selects aliased, including the
embeds (`openedByUser:users!daily_summaries_opened_by_fkey(fullName:full_name)`
— PostgREST names an embed after the *relationship*, so the alias is what makes
it land on the response field). `toCamelKeys` is gone from `listSummaries`;
other functions in that file still use it and are out of scope.

Two cleanups taken while in there, since the code had to be touched anyway:

- **Removed a quadratic loop.** Building `expensesByDate` called
  `summaryList.find()` *inside* a `forEach` over every expense — a linear scan
  per expense, over a month of them. Now a single `Map` of summary id → date,
  built once.
- **`photo_count` → `photoCount` at the source.** The old code emitted
  snake_case and leaned on `toCamelKeys` to rename it; the schema has always
  declared `photoCount`.

Deliberately **not** taken, flagged instead: `expensesByDate` duplicates data
already on each summary's `expenses`, and `useDailySummaries`' fallback
(`summary.expenses ?? data.expensesByDate?.[date]`) is dead — `expenses` is
always at least `[]`, so the right-hand side never runs. The field survives
because `summariesHelpers.ts:79` reads it directly. Collapsing the two is an
API change touching analytics, which does not belong in a select-narrowing
pass.

> **Aliasing doesn't cover fields assembled in JS.** `listSummaries`
> (`packages/services/summaries.ts:126`) builds `expenses`, `sessions` and
> `photo_count` in JavaScript after the query, then runs the whole object
> through `toCamelKeys` — so `photo_count → photoCount` comes from the walk,
> not the select. On that route, alias the DB columns *and* name the
> JS-assembled keys in camelCase directly before removing the call. It is the
> one route in scope where this isn't purely mechanical.

> **`packages/services` is shared with backoffice — narrowing a select changes
> both apps.** Verified importers: `apps/backoffice` pulls in
> `services/summaries` (`app/api/summaries/[id]/route.ts` and the payout day
> summary page), `services/sessions`, `services/expenses` and most of
> `services/payroll`. So `listSummaries` and `fetchSessionUsersForSummaries`
> are **not** seller-only. Grep the backoffice consumers of any function
> before trimming its select, and rebuild both apps — `pnpm build`, not
> `pnpm dev:seller`. Dropping a column the seller stopped using but a
> backoffice payslip screen still reads is the likeliest way to break
> something in this phase.

Freebie while in `analytics.ts`: `all = all.concat(data)` → `all.push(...data)`.

**Do this before touching response validation** — per Finding 2 the parse is
currently the only thing stripping undeclared columns; narrowing the select
is what makes that job redundant rather than load-bearing.

### Phase 3 — `/api/orders`, the simple version

Deliberately not 037's design — that one was reverted as too complicated
(`swr/infinite`, composite keyset cursors, a three-way split, two new routes,
two new hooks). **That verdict was right; this does not re-propose it.** No
cursors, no extra routes, no extra hooks.

1. **`listOrders` takes an optional `limit`, default 50.** Already
   newest-first; nothing else about the query shape changes.
2. **Return the day's totals in the same response.** One extra
   `store_daily_summaries` row read — the totals are already maintained there
   incrementally by `createOrder` — returned as `{ orders, totals }`. The
   client keeps one hook and stops summing an array it no longer fully holds.
   Folding this into the existing response is what avoids 037's sprawl.
3. **Narrow the select here, not in Phase 2** — Phase 2 excludes this route
   precisely so the query is edited once. Apply Phase 2's aliasing pattern and
   **drop `stores(name)`**: it repeats one string per row and `StoreContext`
   already holds it. **Keep `users(full_name)`** — the seller genuinely varies
   per order, and once rows are capped at 50 the join is cheap.

   Delete `stores` from `OrderResponse` in the same commit. Per Phase 2's
   nullable rule, `stores` is `.nullable()` and therefore a *required key* —
   removing it from the select without removing it from the schema fails the
   parse. Then check `MobileOrders.tsx:~250`, which renders `order.stores?.name`.
> **Applied 2026-08-04 — and the sizing above was wrong.** Owner input
> reshaped two things before implementation:
>
> **The ladder was over-engineered for the real data.** Sellers look at roughly
> the last ten orders, and a day almost never passes ~200. A 50 → 200 → 1000
> ladder is three states for a range the second one already covers. Shipped
> instead: **default 25, then one "show all" fetch** capped at 500 as a safety
> net. Two states, and the common day never reaches the second.
>
> **Why the previous attempt actually failed.** 037 is recorded here as
> "reverted for complexity", which was only half of it — it also got the
> ordering wrong. The list is reverse-chronological, newest at top, scrolling
> back through the day. Any cap has to take from the *newest* end, and
> `Order #N` has to be numbered against the **day**, not the loaded slice, or
> the numbers shift as more loads. Both are now explicit: the query keeps
> `created_at DESC` with a plain `.limit()`, and numbering is
> `totals.totalOrders - index`.
>
> That is what `totals` is for. The summary card and the row numbers both
> describe the whole day, so both read the `store_daily_summaries` row —
> already maintained incrementally by `createOrder` — instead of reducing over
> a truncated array. Reducing over the array is precisely what would
> under-report once the cap exists.
>
> Also folded in, since the query was being rewritten anyway: the Phase 2
> aliasing (`toCamelKeys` gone from this path too), `stores(name)` dropped
> along with the store row in the detail block — the view is store-scoped and
> `StoreContext` has the name. The card was also collapsed to a native
> `<details>` and then reverted at the owner's request — full view stays.
>
> `useHourlySales` is wired up in place of the client-side re-derivation.
> Lint held at baseline after fixing one warning this introduced (`?? []`
> handing a fresh array identity to a memo each render).

4. ~~**"Show more" bumps the limit** (50 → 200 → 1000) on the same SWR key.~~
   **Superseded — see the note above.**
   With `ORDER BY created_at DESC` and a re-fetch from the top, a larger limit
   is a strict superset of the smaller — no skips, no duplicates, which is the
   entire reason cursors were needed and now aren't. Two UX requirements:
   - `keepPreviousData: true`, or bumping the limit drops the list into a
     loading state and loses scroll position — a regression on the exact
     interaction being added.
   - Keep a real ceiling (1000, not "all"). "Load everything" is how the
     current unbounded query got here.
5. ~~**Collapse the order card.**~~ **Built, then reverted at owner's request
   — full view stays.** It costs no server CPU either way, and the cap already
   bounds how many cards exist, so the DOM argument for it is much weaker once
   the list is 25 rather than 300. Revisit only if the tab feels heavy after
   the cap ships. The store row is still gone from the detail block, since
   `stores(name)` left the query.
6. **Mini chart: reuse `useHourlySales`.** 037's good discovery, lost in the
   revert — `getHourlySales` already selects only
   `id, created_at, store_order_items(quantity)` and buckets server-side.
   `MobileOrders.tsx:61` reimplements it client-side off the heavy fetch.
7. **Add the index back.** `store_orders (store_id, created_at)`. Both
   migrations exist locally — `20260705161933_add_store_orders_store_date_index.sql`
   and `20260705171042_drop_store_orders_store_date_index.sql` — so local
   history is create-then-drop and **applying local history from scratch ends
   with no index**. Run `supabase migration list` first to see which of the
   two reached remote, then write a *new forward* migration with
   `CREATE INDEX IF NOT EXISTS` and an explicit name. Do not edit or delete
   either existing file.
8. **Delete `app/api/orders/list/route.ts`.** Dead since 037, verified still
   present. Zero CPU today — a readability item, not a performance one.

### Phase 4 — `/api/sessions/gate` (037 item #3, still open, now #1 by CPU)

> **Correction — "trim the `select("*")`" is a no-op here, contrary to 037.**
> 037 listed narrowing that select as one of two real CPU-relevant trims, and
> an earlier draft of this task repeated it. Checked both sides: `store_sessions`
> has exactly eleven columns, and `StoreSessionResponse`
> (`packages/features/sessions/schema.ts:56`) declares all eleven as required
> keys (only `userName` / `userAvatarUrl` are `.optional()`, and those are
> added in JS, not selected). `getStoreGateState` returns
> `...toCamelKeys(session)` — the whole row. So `select("*")` fetches precisely
> what the schema requires; there is nothing to trim without also deleting
> fields from the response contract. **The real win in this phase is the join,
> not the select.**

1. Fold the third query into the second:
   `.select("<fields>, users(full_name, avatar_url)")` — three sequential
   round trips become two. This is the whole phase; size the ~2.5s estimate
   against it alone, not against a select trim that isn't available.
2. Leave the early-return structure alone. Parallelizing buys wall-clock,
   which Fluid does not bill; 037 reached the same conclusion.
3. Separately, confirm how often realtime is actually disconnected —
   `useSession` polls every 30s only when it is, so a flaky connection would
   show up as invocation volume rather than per-call cost. Never measured.

> **Applied 2026-08-04, taken before Phase 3** — it is the top route by CPU and
> a contained service change, where Phase 3 touches UI.
>
> The `users` lookup is now an embed on the session query, so the gate is two
> round trips instead of three. Columns are aliased to camelCase while the
> query was being rewritten anyway, which also removes the `toCamelKeys` call
> from this path — the embed is lifted off the row and dropped, so what returns
> is exactly `StoreSessionResponse`.
>
> Single caller (`app/api/sessions/gate/route.ts`), typecheck clean both apps,
> lint at baseline, build green.
>
> Step 3 (realtime disconnect rate) still not measured — it is an invocation-count
> question, not a per-call one, and needs production data rather than code.

### Phase 5 — `/api/stores`: delete the `users` list

Callers already traced (Finding 4). Smallest, safest item on the board:

1. Drop the `user_tenant_assignments → users(...)` query from `listUserStores`
   and the `users` key from its return value.
2. Drop `users` from `StoreListResponse` and **delete `UserResponse` from
   `packages/features/stores/schema.ts`** — traced, and `StoreListResponse` is
   its only consumer. Every other `UserResponse` import in the monorepo
   (seller `api/users`, backoffice `AuthContext` and `lib/api/users`) resolves
   to `@tea-pos/features/users/schema`, a different module with the same
   exported name. Don't let the name collision stop the deletion, and don't
   delete the wrong one.
3. Backoffice never imports `packages/features/stores/schema` at all — checked
   — so this is seller-only despite living in a shared package.

Separate commit, not folded in: `StoreContext` uses `assignments` for exactly
one thing — whether the current user has `isDefault` on some store
(`StoreContext.tsx:48-55`). That is one store id, and the endpoint returns a
full per-store assignment map to compute it. Worth a `defaultStoreId` field,
but the deletion above has no behavioural risk and this does.

> **Applied 2026-08-04, ahead of Phase 2.** Taken first on purpose: it deletes
> the `/api/stores` user query outright, so Phase 2 does not narrow a select
> that was about to shrink anyway — the same argument that pulled
> `/api/orders` out of Phase 2.
>
> `listUserStores` loses the `user_tenant_assignments → users(...)` query, the
> `UserRow` mapping and sort, and the `users` key. The `Promise.all` goes with
> it, since only one query is left to run. `UserResponse` and the `users` field
> are gone from `packages/features/stores/schema.ts`.
>
> Re-confirmed nothing reads the removed field: all three `useStores`
> consumers touch only `stores` and `assignments`, and `assignments` — which
> the default-store lookup depends on — is untouched. Typecheck clean on both
> apps, lint at baseline (23 / 5), `pnpm build` green.
>
> `defaultStoreId` deliberately not done. Still worth doing later.

### Phase 6 — `day-activity`: give the log table its missing column

Per Finding 5 the time-range shortcut is unsafe. Fix the schema gap:

1. Migration: add `daily_summary_id uuid references store_daily_summaries(id)`
   to `tenant_activity_logs`, plus an index on `(tenant_id, daily_summary_id)`.
   Nullable — payroll and customer-feedback events genuinely have no summary.
2. `createLogger` / `LogContext` gains an optional `dailySummaryId`, set once
   per calling service exactly as `storeId` is today. Most call sites in
   `sessions.ts`, `summaries.ts`, `expenses.ts`, `orders.ts` already have it
   in scope.
3. Backfill existing rows in the same migration by joining `ref_id`/`ref_table`
   back to each child table — the mapping `getDayActivity` does per request
   now, done once. **`ref_table` is optional in `LogOpts` and null on some
   rows**; those cannot be joined and must fall back to matching `ref_id`
   against each child table in turn, or be left null deliberately.

   > **The one that will silently break the timeline.** `order_created` events
   > would backfill from `store_orders.daily_summary_id` — but that column is
   > **nullable**, and `createOrder` only sets it when an *open* summary exists
   > for today (`orders.ts:118-126`). Orders placed against a closed or missing
   > summary have null. Today those events still appear on the timeline,
   > because `getDayActivity` finds orders by `store_id` + `created_at` range
   > rather than by summary id. Key the logs on `daily_summary_id` naively and
   > **those orders vanish from the day view.**
   >
   > Migration `20260628135716_add_daily_summary_id_to_store_orders.sql`
   > already backfilled that column by matching `(created_at + 7h)::date` to
   > `store_daily_summaries.date`. Reuse **exactly that expression** for the
   > null cases here, so the log rows land on the same day the orders did.
   > Before writing the migration, run:
   >
   > ```sql
   > select count(*) from store_orders where daily_summary_id is null;
   > ```
   >
   > If that is zero, the fallback is cheap insurance. If it isn't, it is the
   > difference between a correct timeline and a quietly incomplete one.

4. `getDayActivity` becomes two queries: the summary, and its events. Nine →
   two, with no change in which events appear.
5. Sign photo URLs lazily on expand via a small dedicated endpoint.

Needs a migration and a manual push, so it sequences last among per-route
items. Steps 1–3 are additive and safe to push ahead of the app deploy; step
4 must not ship before the backfill.

### Phase 7 — Page navigations (the one that clears 2h)

1,038 page invocations per 12h, 25.8s of visible CPU, plus a proxy run on
every one. Largest remaining item, and the only one that moves both untouched
buckets at once.

Every page under `/[tenantSlug]/mobile/*` is a thin wrapper around a
`"use client"` component — `orders/page.tsx` is four lines, `pos/page.tsx` and
`analytics/page.tsx` likewise, none of them fetching anything. Yet each
navigation costs a full RSC render plus a proxy run, because the root layout
reads `cookies()` for `x-user-info` and `locale`, making the whole tree
dynamic.

In order of payoff-to-risk:

1. **Move the cookie reads out of the root layout.** `AuthProvider` and
   `LanguageProvider` hydrate from `x-user-info` and `locale` in
   `app/layout.tsx`. Both cookies are client-readable by design
   (`x-user-info` is deliberately `httpOnly: false`). Reading them
   client-side on mount makes the shell static. The cost is a first-paint
   flash of the default locale — real, and to be measured against the win.
2. **Check whether the shell can be prerendered per tenant.** The slug is in
   the path and immutable; a static shell per tenant with client hydration
   takes these routes to zero invocations.
3. **Then re-examine `proxy.ts`.** Its cost is a function of how many page
   requests reach it. Steps 1–2 reduce the count; separately check whether the
   matcher can skip navigations already authenticated client-side. 037 found
   no lever on *what it does per run* — this is a lever on *how often it runs*.

**Do not rush this phase.** It touches the auth path and i18n first paint —
regressions there are user-visible and easy to miss in testing. Ship Phases
1–6 first; none of them depends on this. Then take it on its own branch with
its own verification pass.

### Parked

- **Analytics aggregation** (Finding 7). Move `getProductSales` /
  `getDayOfWeekSales` onto a Postgres RPC (the `getDailySales` / `getTeaWaste`
  precedent) or pre-aggregate on close. Real latent problem, but no
  `/api/analytics/*` route appears in the top 20, so it is not costing
  anything today. Revisit when one shows up.
- **Weather cron schedules** — 6.3s/12h, 8% of visible CPU, refreshing an
  hourly forecast every ~29 minutes. Likely a `vercel.json` change rather than
  code, so it doesn't belong in a code phase — but check it, it may be the
  best minutes-per-effort item here. Confirm what consumes `weather_hourly`
  and how fresh it needs to be first.
- **`zod-to-openapi` out of the runtime path.**
  `packages/features/shared/common-schema.ts:5` calls `extendZodWithOpenApi(z)`
  at module scope, so the extension is patched onto Zod in every serverless
  bundle and every `.openapi({...})` allocates doc metadata at module init.
  Moving annotations into the per-domain `openapi.ts` files would fix it, but
  that touches every schema file for a win bounded by a 1.4% cold-start rate.
- **Server-side flag caching** — re-measure after Phase 1 and local
  evaluation before adding a cache. Caching per-user evaluations has real
  staleness consequences for `ops-maintenance`, precisely the flag that must
  take effect immediately.

---

## How to measure

> **Decision, 2026-08-04: batch the phases, measure once at the end of a
> cycle.** An earlier draft made Phase 1 a gate — ship it, take a reading,
> size the rest against it. That was wrong for the instrument available. The
> dashboard's per-route CPU is rounded to whole seconds, so Phase 1's expected
> single-digit-ms win is smaller than the measurement error; waiting on a
> signal it cannot resolve would have blocked the phases that actually move
> the number.
>
> Instead: ship Phases 0–6, let a full billing cycle run, and compare the
> **cycle total** — the one number whose resolution is good enough to see a
> ~20% change. Baseline to beat: **2h37m over ~29 days**, 3–5m/day with an
> 8m56s peak, at 2026-08-04.
>
> **The tradeoff, stated so it isn't a surprise:** a single aggregate reading
> cannot attribute the win to a phase. If the total doesn't move, you learn
> the batch failed, not which part. Two things make that acceptable — each
> phase is a separate commit, so a bisect is possible if it matters; and
> *correctness* is verified per phase below regardless (payload diffs, gate
> states, timeline completeness). Only the CPU number is measured in
> aggregate.
>
> The local `performance.now()` method below stays available for any single
> question worth answering on its own — it is no longer a required step.

Several phases above are gated on "measure first", and the Vercel dashboard
is the wrong instrument for that: its per-route CPU column is rounded to whole
seconds (a route at 8s could be 7.5 or 8.4), it aggregates over a fixed
window rather than a change you just shipped, and the billing total lags by
hours. So measure locally before shipping, and use the dashboard only as the
monthly scoreboard.

The cheap version, sufficient for every decision in this task:

```ts
// temporarily, at the top of the route handler
const t0 = performance.now();
// ... existing body ...
console.log(`[cpu] ${route} ${(performance.now() - t0).toFixed(1)}ms`);
```

Run it against a **realistic** dataset — a store's busiest historical day, not
a fresh local tenant with four orders. Most findings here only appear at
volume; a 5-order day will show every route at 3ms and prove nothing.

Wall-clock is not Active CPU (it includes the Supabase round trip, which
Fluid does not bill), so treat the number as a **before/after ratio on the
same route**, never as an absolute. For the couple of places where that
distinction actually matters — Finding 1's client construction, `/api/flags`
— wrap just the suspect call rather than the whole handler.

## Verification

1. `pnpm lint && pnpm build` clean, both apps.
2. Phase 0: after the fix (or after confirming it was a stale bundle),
   `/_not-found` should fall out of the route table on the next 12h window.
   If it doesn't, the cause was misdiagnosed — re-check the referrer before
   moving on.
3. Phase 1: no per-phase reading — see the decision under "How to measure".
   Correctness only: both apps build and the service-role paths still work,
   which the rest of the suite covers.
4. Phase 2: response payloads must be **identical** before and after — diff a
   captured response per route. An extra key means the select is still too
   wide; a missing key means an alias typo, which the retained `safeParse`
   should catch for you. `/api/orders` is deliberately **not** in Phase 2 —
   capture its baseline before Phase 3 instead, which is where that query gets
   narrowed and reshaped in one pass.
5. Phase 3, live store: newest 50 shown, "show more" extends without
   duplicates, gaps or scroll loss, summary card matches the daily summary row
   (not the loaded list length), date picker resets the limit, mini chart
   renders. Verify the summary card deliberately on a high-order day — that is
   the one behavioural bug fix in this task.
6. Phase 4: gate returns all five states — `no_summary`, `closed`,
   `no_session`, `open`, open-with-avatar. The avatar is most likely to break,
   since it moves into a join.
7. Phase 5: store picker, `MobileLayoutClient` and the stores screen all
   render, and the default store still resolves on a fresh login with cleared
   `localStorage` — that path reads `assignments`, which stays.
8. Phase 6: pick a real close-day that ran past midnight and confirm its
   timeline still shows `store_closed` and the closing photos. That is exactly
   what the rejected time-range shortcut would have broken.
9. Phase 7: full navigation pass on a real device — login, tenant switch,
   every root tab, language switch, cold PWA start — network tab open,
   confirming page routes no longer invoke a function. Watch for the locale
   flash and for a stale `x-user-info` surviving a role change.
10. **Scoreboard: the billing-cycle total — and the only CPU measurement this
   task takes.** Baseline **2h37m** over ~29 days at 2026-08-04. Expected
   after Phases 1–6: **~2h05–2h10**. After Phase 7: **under 1h50m**.

   Read it after a full cycle on the shipped batch, roughly 2026-09-04.
   Traffic is not held constant between cycles, so compare min/day and the
   per-route table alongside the total rather than treating the headline as
   controlled — a busier month can eat the win and still mean the work landed.

   If the total doesn't move ~18%, the bucket split was wrong. Re-pull
   Vercel's by-type breakdown before sizing Phase 7: that split is the one
   number here that is inferred rather than observed, and it is what the
   estimate rests on.

## Assumptions not verified

- **The row cap on `/api/orders`.** Inherited from 037 as "PostgREST defaults
  to 1000"; never checked against this project's config.
- **What accounts for the 28–140ms band.** Finding 1's explanation was wrong
  and retracted; no measured replacement.
- **`/api/flags` at 75ms.** Unexplained. Fluid does not bill I/O wait, so the
  PostHog round trip should not appear here at all.
- **The middleware share.** API and page shares come from the top-20 table and
  are solid. The ~35–38% for middleware is *inferred* from the gap between
  ~110–130s/day of visible routes and 180–216s/day of actual bars,
  cross-checked against 037. Vercel's by-type breakdown gives it directly.
- **Backoffice consumption of shared schemas — partly resolved.** Phase 5 is
  now confirmed seller-only (backoffice imports nothing from
  `packages/features/stores`). Phase 2 is **not**: backoffice imports
  `services/summaries`, `services/sessions`, `services/expenses` and most of
  `services/payroll`, so `listSummaries` and `fetchSessionUsersForSummaries`
  serve both apps. Trace each function's backoffice consumers before trimming
  its select.
- **Why the 12h table and the daily chart don't reconcile.** The table was
  described as a busy window, yet Aug 4's bar is among the month's lowest.
  Either it straddles two days or "busiest" was approximate. This is why every
  monthly projection here is a range.
- **The per-call trend.** Nine routes got 1.2–2.6× more expensive per call
  between 037's window and this one, but they are different days and the CPU
  column is coarsely rounded. Direction is consistent; multiples are not
  reliable.

## Rollout

Not one PR. Each phase is independently valuable, independently revertable,
and — importantly, given 037's fate — independently *abandonable* if it turns
out uglier than it's worth.

| Phase | PR | Migration | Notes |
|---|---|---|---|
| 0 `/_not-found` | one line, shipped | no | Dead prefetch removed. Cause 2 (no service worker) is split out — not this task |
| 1 Singletons | one, both apps | no | Safe to ship alone; gates the rest |
| 2 Narrow selects | one per route | no | Five small PRs, each diffable against a captured response. Each touches the service **and** its response schema — see the nullable rule |
| 3 Orders | one, plus a separate one for 3.7/3.8 | **maybe** | Check `supabase migration list` before writing the index migration |
| 4 Gate | one | no | |
| 5 Stores | one for the deletion, one for `defaultStoreId` | no | Keep them separate — the deletion is risk-free, the second isn't |
| 6 day-activity | one app PR, one migration | **yes** | Push migration + backfill **before** the app deploy, or `getDayActivity` reads a column of nulls |
| 7 Page navigations | own branch | no | Ship after everything else; own verification pass |

Phase 6 is the only ordering hazard: steps 1–3 (column, logger, backfill) are
additive and safe to push ahead of any app deploy, but step 4 must not ship
until the backfill has run, or the timeline silently goes empty for every
historical day.

Per `CLAUDE.md`, migrations are pushed manually by the developer — write them,
verify with `supabase migration list`, don't run `db push`.

**Testing client-side changes: force-quit the PWA first.** Phases 3, 5 and 7
change client code, and a device holding a cached bundle serves it regardless
of what was deployed. Task 040 lost a whole staging cycle to exactly this — a
shipped fix looked broken because two phones were running last week's JS. The
reliable tell is the console: log strings that only exist in the old code mean
a stale bundle, not a failed fix. Force-quit the installed app on every test
device before concluding anything.

Per Phase 0's cause 2, this is currently **mandatory rather than
precautionary**: with no service worker being deployed, an installed app has
no update path at all, so force-quitting is the only way a client change
reaches one.

## Guiding principle

037's principle stands — fetch the shape the UI needs, prefer reading a
computed value over re-deriving it, bound anything whose UI shows a window.
This round adds one:

**Cost per request should be flat in the amount of data the tenant has
accumulated.** A route whose CPU grows with orders per day, staff per tenant,
or events per month will be a problem again in three months no matter how
much is shaved today. Phases 3, 5, 6 and 7 convert such routes from growing to
flat — the durable part. Phases 1, 2 and 4 are constant-factor trims, worth
taking because they are cheap and each leaves the code clearer.
