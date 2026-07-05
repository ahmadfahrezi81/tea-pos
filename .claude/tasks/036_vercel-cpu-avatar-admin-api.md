# Task 036 — Vercel CPU Optimization: Avatar Lookups via Auth Admin API

**Status: Done**, 2026-07-05. Migration pushed, all 5 call sites fixed, both
apps typecheck and build clean. See "Implementation" at the bottom for what
actually shipped, including a correction to this doc's own dead-code claim.

## Context

Vercel Hobby plan Fluid Active CPU was near its 4hr/30-day ceiling (~98%).
After fixing an unrelated 5s-polling hook, projected usage settled to ~75%
for the current cycle. Investigated whether further optimization could buy
more headroom before needing to upgrade to Vercel Pro — specifically wanted
to defer that upgrade until a 3rd store opens (current: 2 stores, ~8 users,
not all daily-active).

## Root cause

`/api/sessions/gate` — the single highest-traffic route — calls
`auth.admin.getUserById()` on every request where a session is active, just
to read the user's Google profile photo URL
(`user_metadata.avatar_url`). Confirmed: `getStoreGateState()`
(`packages/services/sessions.ts:18-61`) does exactly this, and the consuming
hook `useSession()` (`apps/seller/lib/hooks/sessions/useSession.ts`) is
mounted from `mobile/home/layout.tsx`, `mobile/home/manage/layout.tsx`, and 5
more pages, with `revalidateOnFocus: true` and a 30s poll fallback whenever
realtime is disconnected — "fires on most navigations" checks out.

This is expensive because:
- It's a call to Supabase's Auth Admin API (a separate service from
  Postgres), not a simple DB query
- It returns and parses a large user object just to extract one string
- It's on the hottest path in the app

**Why it exists:** `avatar_url` has never been a real column on `users` —
confirmed absent from `packages/db/types.ts`'s `users.Row`. It only exists in
Supabase Auth's `user_metadata`, populated by Google OAuth at login. Every
place that needs to show an avatar has no choice but to call Auth Admin.

## Verified call-site count — 5 places, not 4

The original doc said the pattern was "repeated in 4 places" but only listed
2 in its table. Re-grepped `auth.admin.getUserById` across the repo — there
are **5** call sites, in 5 different functions:

| # | Function | Route | Notes |
| --- | --- | --- | --- |
| 1 | `getStoreGateState()` | `apps/seller` `/api/sessions/gate` | Dominant cost — 22s / 426 calls in the 12h sample. Single user per call (not a loop). |
| 2 | `listSessionsBySummary()` (`sessions.ts:455`) | `apps/seller` + `apps/backoffice` `/api/sessions/summary/[summaryId]` | Loops over unique session users, already wrapped in `Promise.all`. |
| 3 | `getSummaryUsers()` (`summaries.ts:79`) | `apps/seller` `/api/summaries/[summaryId]/users` | Not in original doc. Already fully parallel (see below). |
| 4 | `listTenantUsers()` (`users.ts:24`) | `apps/backoffice` `/api/users` | Not in original doc. Loops with `Promise.all`, individually try/caught per user. |
| 5 | `fetchSessionUsersForSummaries()` (`sessions.ts:293`) | **none** | **Dead code** — grepped every `.ts` file in `apps/` and `packages/`, zero callers anywhere. Costs nothing today since it's never invoked, but it's a 5th copy of the same bug sitting unused. Fix or delete alongside this work rather than leaving a 5th instance to rediscover later. |

All 5 need the same fix. #5 additionally needs a decision: delete it, or fix
it in case it's meant to be wired up somewhere.

## The "rowUsers" bonus item — real pattern, wrong scope in the original doc

Original doc: "in `rowUsers` (user row + avatar), the two independent
lookups are currently awaited serially — parallelize with `Promise.all`."

No function named `rowUsers` exists in the codebase — this was a paraphrase.
The actual pattern (a plain `users` row fetch and the avatar admin-API call
awaited serially, even though both only depend on an already-known user id)
is real, but it appears in **3** of the 5 functions, not 1:

- `getStoreGateState()` — `sessions.ts:44-50`, `userRow` awaited, then
  `authUser` awaited separately. Both keyed on the same known
  `session.user_id` — independent, safe to parallelize.
- `listSessionsBySummary()` — `sessions.ts:471-486`, `userRows` awaited
  before the `avatarMap` `Promise.all` loop starts.
- `fetchSessionUsersForSummaries()` (dead) — `sessions.ts:362-375`, same
  serial-then-parallel shape.

`getSummaryUsers()` (`summaries.ts:101-110`) already does this correctly —
`userRows` and the avatar `Promise.all` are combined into one outer
`Promise.all`. Use it as the reference shape for fixing the other three.

## The fix (not yet done)

1. Add `avatar_url` column to the `users` table (migration via
   `supabase migration new`).
2. Write it once at login / profile sync — not on every read.
3. Replace all 5 `auth.admin.getUserById()` call sites with a plain column
   read (`users.avatar_url`), batchable via `.in("id", userIds)` where a loop
   currently exists.
4. Decide the fate of dead call site #5 (`fetchSessionUsersForSummaries`) —
   fix it to read the new column, or delete it if truly unused.
5. While touching each function, parallelize the 3 serial user-row + avatar
   lookups identified above (moot once avatar is a plain column read
   alongside the row fetch — likely folds into the same query instead of a
   separate lookup).

**Known tradeoff:** if a user changes their Google photo, it won't be picked
up until the next login/sync. Minor, cosmetic only.

## Expected impact

Confirmed admin-API cost = ~25% of CPU visible in a 12h sample window (22s +
2.66s out of 95.66s total across top 16 routes), almost entirely from the
gate route alone since it's the highest-traffic endpoint.

**Estimate:** fixing this should take projected usage from **~75% → ~50%** of
CPU budget (rough order-of-magnitude). Not a marginal trim — likely the
single best lever available before touching Vercel Pro.

## Other things found along the way (separate, lower priority)

- **`/api/stores`** (`packages/services/stores.ts:18`) — confirmed:
  `listUserStores()` queries the `users` table with no `tenant_id` filter
  (pulls every user in the DB, not just the tenant's), while the sibling
  `stores` query on the same line correctly filters by `tenant_id`. Real bug,
  ~47ms/call, unrelated to the avatar issue. Worth tightening separately.
- **`/api/activity-logs/day-activity`** (`packages/services/activity-logs.ts:158-168`)
  — confirmed: signs one photo URL per row in a loop. Already wrapped in
  `Promise.all` (not serial), so it's N+1-*shaped* for Storage signing rather
  than a true N+1 stall. Candidate for batching later, not urgent.
- **`/api/summaries` PUT (close-day)** — confirmed: triggers
  `createPayrollCommissions` + `createAutoClaimsForDailySummary` for every
  user in `apps/seller/app/api/summaries/route.ts`. High per-call cost is
  *expected*, real work, not a bug. No action needed here (see task 033 for
  unrelated correctness bugs in this same close-day path).

## Implementation order

1. Migration: add `users.avatar_url` (nullable text).
2. `pnpm types:db` to regenerate `packages/db/types.ts`.
3. Write `avatar_url` at login / OAuth profile sync (wherever `user_metadata`
   is currently read at sign-in — check `apps/seller/proxy.ts` and
   `apps/backoffice/proxy.ts`, both already read
   `user.user_metadata?.avatar_url` at auth time).
4. Replace the 5 call sites with a plain column read, batching the 3 that
   currently loop.
5. Decide + resolve dead call site #5.
6. Verify: `tsc --noEmit` both apps, manual smoke test (login, view gate
   state, view session summary, view backoffice users list, view summary
   users) — confirm avatars still render.
7. (Separate, lower priority) — tighten `/api/stores` tenant filter.

---

## Implementation

**Migration:** `supabase/migrations/20260705072358_add_avatar_url_to_users.sql`
— `ALTER TABLE users ADD COLUMN avatar_url text`. Pushed and `pnpm types:db`
regenerated by the developer; confirmed `avatar_url: string | null` present
on `users.Row` in `packages/db/types.ts` before continuing.

**Correction to this doc's own claim:** call site #5,
`fetchSessionUsersForSummaries`, was declared dead code above based on a grep
that only covered `.ts` files. It is not dead — `tsc --noEmit` failed after
deleting it, because `apps/seller/app/[tenantSlug]/mobile/analytics/daily/[summaryId]/page.tsx`
(a `.tsx` Server Component) imports and calls it directly, which is valid
per CLAUDE.md's SSR exception for Server Components. Restored the function
and fixed it in place instead of deleting it. Lesson: when grepping for dead
code in a Next.js app, always include `.tsx`, not just `.ts`.

**What changed:**
- `apps/seller/app/auth/callback/route.ts` and
  `apps/backoffice/app/auth/callback/route.ts` — after
  `exchangeCodeForSession`, write `user_metadata.avatar_url` into the new
  `users.avatar_url` column via `getServiceClient()` (service role, matching
  every other write path in this codebase). Awaited, not fire-and-forget —
  task 033 already documented that un-awaited work racing the response can
  get cut off on Vercel with no `waitUntil`/`after()` in this repo, so this
  write follows that lesson rather than repeating the mistake. Runs once per
  login, not per request — the correct place, not middleware (`proxy.ts`),
  which runs on every navigation.
- `packages/services/sessions.ts`:
  - `getStoreGateState()` — dropped the `auth.admin.getUserById` call
    entirely; `avatar_url` added to the existing `userRow` select (was
    already fetching that row for `full_name`), so the fix also collapses
    two round trips into one, not just removing the admin call.
  - `listSessionsBySummary()` — same shape: `avatar_url` added to the
    existing `userRows` select, admin-API `Promise.all` loop deleted.
  - `fetchSessionUsersForSummaries()` — same fix, restored in place (see
    correction above) rather than left deleted.
- `packages/services/summaries.ts` — `getSummaryUsers()`: same shape,
  `avatar_url` added to the existing `userRows` select, admin-API loop
  deleted, outer `Promise.all` (which combined the row fetch with the avatar
  loop) collapsed since there's only one query left.
- `packages/services/users.ts` — `listTenantUsers()`: simplified furthest.
  It already selected `users(*)`, which now includes `avatar_url` for free;
  the entire manual per-user `Promise.all` avatar-fetch loop was deleted with
  no replacement needed, `toCamelKeys` handles `avatar_url` → `avatarUrl`.
- `packages/services/stores.ts` — `listUserStores()`: fixed the separately
  flagged tenant-filter bug. The `users` query no longer does an unscoped
  `supabase.from("users").select(...)`; it now joins through
  `user_tenant_assignments` filtered by `tenant_id`, mirroring the exact join
  shape already used by `listTenantUsers()` (proven safe there, so trusted
  here — same table, no dedup needed since one row per user per tenant).

**Verification performed:**
- `grep -rn "auth.admin.getUserById"` across `packages/` and `apps/` —
  zero remaining matches.
- `tsc --noEmit` — clean in both `apps/seller` and `apps/backoffice`.
- `pnpm build` — both apps build clean.
- `pnpm lint` (full monorepo) — zero new errors/warnings; the errors it
  reports are all pre-existing, in files untouched by this change
  (`InactivityRefreshPopup.tsx`, `usePWA.ts`, a couple of backoffice pages'
  `useEffect` + `setState` patterns).

**Not done / left for follow-up:**
- No manual browser smoke test — this change is behind Google OAuth login,
  which isn't something drivable in this environment. The user should verify
  avatars still render correctly (gate state header, session summary list,
  backoffice users list, summary users list) after deploying, and confirm a
  fresh login populates `avatar_url` on that user's row.
- Users who don't log in again won't get `avatar_url` backfilled — it stays
  `null` until their next login, per the documented tradeoff. Not a bug, just
  worth knowing the column will be sparsely populated for a while after
  deploy for infrequent users.
- `/api/activity-logs/day-activity`'s per-photo `signUrl()` loop — left as
  documented, not urgent.
