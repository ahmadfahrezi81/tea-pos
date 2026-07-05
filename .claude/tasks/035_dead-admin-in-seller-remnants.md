# Task 035 — Dead "Admin-in-Seller" Remnants (superseded by `apps/backoffice`)

**Status: Done.** Sanity-checked both findings against the live code, confirmed
no other references, applied the cleanup, typechecked clean. See "Cleanup
applied" at the bottom.

## Context

Question raised: was the original plan to put admin functionality inside
`apps/seller` itself, gated by role + a feature flag, before `apps/backoffice`
existed as its own app — and is that plan now dead?

No task doc explicitly writes down that original plan (`.claude/tasks/`
doesn't have a pre-015 doc describing it), but the code has two confirmed
leftovers from it, and `015_payroll-management-admin.md` is the doc where the
pivot away from it is made explicit.

## Confirmed: the pivot already happened, in task 015

`015_payroll-management-admin.md:80` and `:170` both state, verbatim:

> No feature flag needed — the entire backoffice app is admin-only by
> definition. Auth middleware enforces ADMIN role.

That's the decision point: instead of a flag-gated admin section living
inside `apps/seller`, admin functionality got its own app (`apps/backoffice`),
gated purely by `role === "ADMIN"` in its `proxy.ts` — no feature flag
involved at all in the current design. This is current and correct; nothing
to change here.

## Two dead leftovers from the pre-backoffice plan, found by code search

**1. `new-dashboard` feature flag — defined, never checked anywhere**

`packages/features/shared/features.ts:2`:
```ts
export const Features = ["qris", "new-dashboard", "export-pdf", "skip-photos"] as const;
```
It's been in this array since the file's very first commit. Grepped both
apps and `packages/` for any `isEnabled('new-dashboard')` or equivalent
call site — zero matches. It only shows up generically where all `Features`
are iterated to populate the flags context (`apps/seller/lib/context/features-provider.tsx:10`,
`apps/backoffice/lib/context/features-provider.tsx:6`) — nothing ever reads
that specific key back out. Dead flag.

**2. "Admin Dashboard" link in the seller profile page — points at a route
that no longer exists**

`apps/seller/app/[tenantSlug]/mobile/more/_components/MobileProfile.tsx:91-93,101`:
```ts
const handleAdminDashboard = useCallback(() => {
    window.open(url("/admin"), "_blank", "noopener,noreferrer");
}, [url]);
...
const isAdmin = user.role === "ADMIN";
```
This renders a settings row (visible only when `isAdmin`) that opens
`/{tenantSlug}/admin` — confirmed via `find apps/seller/app -type d -iname admin`
that no such route exists anywhere under `apps/seller/app/[tenantSlug]/`.
Clicking it 404s. This is almost certainly the UI entry point for the
pre-backoffice "admin lives inside seller" plan, orphaned once that
functionality moved to `apps/backoffice` in task 015.

## Recommendation

Both are safe, no-risk cleanup — remove them in one small pass:

1. Delete `"new-dashboard"` from the `Features` array in
   `packages/features/shared/features.ts:2`.
2. Remove the `isAdmin` / "Admin Dashboard" settings row and
   `handleAdminDashboard` callback from `MobileProfile.tsx` (lines ~91-93,
   101, and wherever the row is rendered further down — grep the file for
   `handleAdminDashboard` and `isAdmin` to catch the JSX usage too).

Not urgent — dead code, no user-facing breakage today (nobody can currently
reach a working `/admin` route to notice it's gone) — but worth doing next
time either file is touched, so a future reader doesn't mistake either for
a real, working feature.

## Implementation order

1. Remove `"new-dashboard"` from `packages/features/shared/features.ts`
2. Remove the dead admin-dashboard link + `isAdmin` check from
   `MobileProfile.tsx`
3. `pnpm lint` / typecheck to confirm no other reference to either

---

## Cleanup applied

Before editing, re-verified both claims directly:

- `new-dashboard`: confirmed the only place the literal string appears
  anywhere in `apps/` or `packages/` is the `Features` array itself. Both
  `apps/seller/lib/context/features-provider.tsx` and
  `apps/backoffice/lib/context/features-provider.tsx` (and the archived
  `apps/admin`'s copy) just `.reduce()` generically over whatever's in
  `Features` into a `Record<Feature, boolean>` — nothing destructures the
  `"new-dashboard"` key specifically, so shrinking the array is a type-level
  no-op for every consumer.
- `isAdmin` / "Admin Dashboard": read the full `MobileProfile.tsx` — `isAdmin`
  had exactly one use site (the conditional row at the bottom of Account
  Settings), and the `Wrench` icon import was only used by that same row.

**Changes made:**
- `packages/features/shared/features.ts:2` — removed `"new-dashboard"` from
  the `Features` tuple.
- `apps/seller/app/[tenantSlug]/mobile/more/_components/MobileProfile.tsx` —
  removed the `Wrench` import, the `handleAdminDashboard` callback, the
  `isAdmin` variable, and the conditional "Admin Dashboard" `SettingsRow`.

**Verified:** grepped both files post-edit for `isAdmin`, `handleAdminDashboard`,
`Wrench`, and `new-dashboard` — zero remaining references. Ran
`tsc --noEmit` for `apps/seller` — clean, no new errors.

Not done in this pass (out of scope, no code to clean up): the `/admin` route
itself was already confirmed not to exist, so there's no orphaned route
directory to delete — the dead link was the only artifact.

---

## Follow-up — ADMIN-only payroll branches in `apps/seller` were also dead duplication

After the above, asked a further question: `apps/seller` has 8 API
endpoints/branches gated on `user.role === "ADMIN"` for viewing/editing
*other users'* payroll data (list all users, list/approve all claims, view/
edit others' commissions, view/create/pay others' payouts, view others'
payslips). Given `apps/backoffice` is the dedicated admin app, was this
seller-side admin capability actually used, or more dead duplication from
before backoffice existed?

**Investigated via the layered architecture (api route → api client → hook →
component) for each of the 8 spots.** Result: every single one was
unreachable from any seller UI —
- Some had an api-client function that was never wrapped by any hook
  (`payrollClaimsApi.updateStatus`, `payrollApi.updatePayout`,
  `payrollApi.upsertPayout`).
- Some had a hook that supported an admin param (`all`, a foreign `userId`)
  that no seller page ever actually passed — every real call site only ever
  fetched the current user's own data.
- `usePayrollCommissions` (and the entire commissions feature — route, api
  client, hook) had zero callers anywhere in `apps/seller`.
- No admin page tree exists under `apps/seller/app/[tenantSlug]/**` at all
  (no staff list, no approve/pay screens) — the dead "Admin Dashboard" link
  above was the only entry point that ever existed, and it 404s.
- `apps/backoffice` has full functional equivalents built on the same
  underlying `packages/services` functions, with a real, reachable admin UI
  (`pay/staff`, `pay/payouts`, etc.) — confirming this was pre-backoffice
  duplication, not a live parallel feature.

**Cleanup applied** (services layer untouched — `apps/backoffice` depends on
the same functions):

- `apps/seller/app/api/users/route.ts` — removed the `?all=true` admin
  branch (`listTenantUsers`); route is now self-only.
- `apps/seller/lib/api/users.ts` — removed `usersApi.listAll()`.
- `apps/seller/lib/hooks/users/useTenantUsers.ts` — deleted (zero callers).
- `apps/seller/app/api/payroll/claims/route.ts` — removed the
  `all === "true"` admin branch from `GET`.
- `apps/seller/app/api/payroll/claims/[id]/route.ts` — deleted entirely
  (its only handler, `PATCH`, was 100% admin-gated and had no caller).
- `apps/seller/lib/api/payroll-claims.ts` — removed `listAll()` and
  `updateStatus()`.
- `apps/seller/lib/hooks/payroll-claims/usePayrollClaims.ts` — removed the
  `all` option; both real call sites (`more/reimbursements/page.tsx`,
  `.../add/page.tsx`) already called it with no arguments.
- `apps/seller/app/api/payroll/commissions/route.ts` and
  `.../commissions/[id]/route.ts` — deleted entirely (whole feature unused
  in seller).
- `apps/seller/lib/hooks/payroll/usePayroll.ts` — deleted (only exported
  the unused `usePayrollCommissions`).
- `apps/seller/app/api/payroll/payouts/route.ts` — removed the
  `role === "ADMIN"` branch on `GET` (now always scopes to `user.id`) and
  deleted the `POST` handler entirely (admin-only create-for-others, no
  caller).
- `apps/seller/app/api/payroll/payouts/[id]/route.ts` — deleted entirely
  (its only handler, `PATCH`, was 100% admin-gated and had no caller).
- `apps/seller/app/api/payroll/payslip/route.ts` — removed the
  `role === "ADMIN"` branch; now always returns the caller's own payslip.
- `apps/seller/lib/api/payroll.ts` — removed `getCommissions`,
  `updateCommission`, `upsertPayout`, `updatePayout`; kept `getPayouts` and
  `getPayslip` (both genuinely used, self-mode only).
- `apps/seller/lib/hooks/payroll/usePayslip.ts` — dropped the now-unusable
  `userId` override param (the route no longer accepts one); its one call
  site already omitted it.

**Verified:**
- Grepped for every removed symbol (`usersApi.listAll`, `useTenantUsers`,
  `payrollClaimsApi.listAll`/`updateStatus`, `usePayrollCommissions`,
  `payrollApi.getCommissions`/`updateCommission`/`upsertPayout`/
  `updatePayout`) — zero remaining references.
- `tsc --noEmit` for `apps/seller` — clean (after clearing a stale
  `.next/types/validator.ts` that still referenced the deleted route files
  from a prior build).
- `pnpm build` — both `@tea-pos/seller` and `@tea-pos/backoffice` build
  clean; the route manifest confirms `/api/payroll/commissions`,
  `/api/payroll/claims/[id]`, and `/api/payroll/payouts/[id]` are gone from
  seller as expected.
- `pnpm lint` — 34 pre-existing errors, all in files untouched by this
  change (confirmed via `git status` on each) — nothing new introduced.

Result: `apps/seller` no longer has any `role === "ADMIN"` branch or
admin-only capability anywhere. All payroll/user-management admin behavior
lives exclusively in `apps/backoffice`, matching the intended split.

---

## Follow-up 2 — broader dead-code sweep of `apps/seller`, prompted by "anything else unused?"

Ran `npx knip` (no config, whole monorepo) as a starting signal, then
manually verified every seller-relevant hit with grep before touching
anything — knip has real false positives in this monorepo (missing
workspace config, doesn't fully resolve the `packages/services` entry, and
`eslint .` linting a file is not evidence it's imported by anything, since
ESLint scans the whole directory regardless of reachability).

### Cluster A — dead components/hooks, zero references anywhere

- `analytics/_components/CloseDayModal.tsx`, `SetBalanceModal.tsx`,
  `SetExpenseModal.tsx` — zero imports; each file was mostly old
  commented-out versions of itself, confirming genuine abandonment rather
  than a recent accidental orphan.
- `home/pos/_components/WeatherButton.tsx` — zero imports; double-checked
  the real weather trigger (`WeatherDrawer`) is imported directly by
  `MobileManage.tsx` and `MoreMenu.tsx`, unrelated to this button.
- `more/_components/MobileProfile.tsx` — **the file edited in the first
  pass of this task** (dead "Admin Dashboard" link). Turned out the entire
  file is orphaned: `/mobile/account` actually renders a different,
  simpler `AccountProfile.tsx` (i18n via `useT`, avatar via
  `useAuth().avatarUrl`, no icon picker, no fast-order toggle) — confirmed
  `AccountProfile.tsx` never had the dead admin link this task originally
  "fixed" in the wrong (already-dead) file.
- `more/_components/IconPickerDrawer.tsx` — only consumer was the dead
  `MobileProfile.tsx`.
- `lib/context/ProfileIconContext.tsx` — its `ProfileIconProvider` was
  never mounted in any layout; only consumer was the dead `MobileProfile.tsx`.
- `more/earnings/_components/EarningsViewSwitcher.tsx`, `MonthSelector.tsx`,
  `PayCalendar.tsx` — zero imports; the live `earnings/page.tsx` uses a
  plain `<select>` year-picker instead, confirming these are leftovers from
  an older calendar-based earnings UI.
- `lib/hooks/orders/useTodayCups.ts`, `lib/hooks/summaries/useSummaryPhotoCount.ts`
  — zero imports.
- `lib/hooks/sessions/useSessionActivityByMonth.ts` — only consumer was the
  dead `PayCalendar.tsx`.

### Cluster B — Provider infrastructure mounted in a layout, but the hook it exposes has zero consumers

- `lib/context/features-provider.tsx` (`FeaturesProvider`/`useFeatures`) —
  wrapped around everything in root `app/layout.tsx`, but `useFeatures()`
  had no callers anywhere in seller. Real feature flagging goes entirely
  through the separate PostHog `useFlags()`/`isFlagEnabled` system — this
  env-var-based React context was a fully dead parallel mechanism (same
  family as the already-removed `new-dashboard` flag). Removed the file and
  unwrapped `<FeaturesProvider>` from `app/layout.tsx`.
- `app/[tenantSlug]/TenantProvider.tsx` (`TenantProvider`/`useTenant`) —
  wrapped around the tenant subtree in `app/[tenantSlug]/layout.tsx`, but
  `useTenant()` had no callers — components get tenant info via
  `useTenantSlug()` instead. Telling detail: the layout was passing
  `tenantName: ""`, hardcoded empty, never actually populated. Removed the
  file; `layout.tsx` now just does its existing `getCurrentTenantId()` /
  `notFound()` gate and returns `children` directly.

### Verified after every deletion batch

- Grepped for every removed symbol/file name — zero remaining references
  each time.
- Cleared `.next` and ran `tsc --noEmit` for `apps/seller` — clean after
  each batch.
- `pnpm build` — both `@tea-pos/seller` and `@tea-pos/backoffice` build
  clean after each batch (2/2 successful).
- User did a manual UI smoke test after all changes — confirmed fine.

### Explicitly not touched (flagged, lower value / out of scope)

- `useMobileOverlay` (`mobile/components/MobileOverlayContext.tsx`) — same
  shape as Cluster B (Provider mounted in `MobileLayoutClient.tsx`, hook
  unused), but that file is larger/more involved — flagged, not removed.
- Several "the `export` keyword is unnecessary" nits (`mobileRoutes`,
  `FlagsResponse`, `ALLOWED_UPLOAD_BUCKETS`, `MobileScrollContext`, a few
  analytics helper functions) — still used *internally* within their own
  file, just not imported elsewhere. Not real dead code; not worth the
  churn.
- `getPayout` in `packages/services/payroll.ts` — flagged by knip but lives
  in the shared services layer, out of scope for a seller-app-only sweep.
