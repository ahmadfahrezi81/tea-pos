# Task 038 — Seller Lint Baseline Cleanup

**Status: Investigated, scoped, deliberately deferred.** `pnpm lint
--filter=@tea-pos/seller` currently exits 1 with **147 problems (31 errors,
116 warnings)** across 19 files with errors. None of it was introduced by
the 2026-07-27 analytics/PhotoPicker session — the baseline has been red
for a while. Nothing here is an active user-facing bug (the one error that
looked dangerous is a false positive, see below), and lint gates nothing,
so this was split out rather than bolted onto an unrelated UI diff.

## Why this was deferred, not fixed on the spot

1. **Diff hygiene.** It surfaced mid-session while making five small UI
   tweaks (tea-waste target, chart spacing, breakdown blocks, photo aspect
   clamp). Folding a 19-file lint pass into that PR would make review hard
   and ruin the revert story if one of the chart changes needs backing out.
2. **The risk is concentrated in the worst place to touch casually.** Six
   of the errors live in app-wide context providers (language, realtime,
   PWA install, mobile layout). Those are usually deliberate hydration
   patterns; "fixing" them needs real device testing, not a typecheck.
3. **Nothing is gating.** There is no `.github/workflows` directory in this
   repo, so lint blocks no merge and no deploy.

## Baseline, measured 2026-07-27

Config is `apps/seller/eslint.config.mjs` — `eslint-config-next@16.2.4`
(`core-web-vitals` + `typescript`), with only `no-unused-vars` and
`no-img-element` downgraded to warnings locally. The `react-hooks/*` rules
below ship as **errors** from that preset.

### Errors by rule (31 total)

| Rule | Count | Files |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 14 | `reimbursements/add` (4), `reimbursements/page` (3), `useSession.ts` (4), `ProductSalesChart`, `expense/page`, `MobileProfileStores` |
| `react-hooks/set-state-in-effect` | 6 | `MobileLayoutClient:57`, `close/page:143,151`, `LanguageContext:31`, `RealtimeContext:26`, `usePWA:12` |
| `react-hooks/refs` | 4 | `AtAGlance.tsx:66,67,67,246` |
| `react-hooks/static-components` | 2 | `DailySalesChart:229`, `TeaWasteChart:215` |
| `react-hooks/purity` | 2 | `home/layout:29`, `InactivityRefreshPopup:10` |
| `react-hooks/preserve-manual-memoization` | 2 | `MobileManage:42`, `WeatherDrawer:69` |
| `react-hooks/rules-of-hooks` | 1 | `earnings/[payoutId]/page:67` — **false positive**, see below |

### Warnings (116 total) — 78 of them are noise

`public/workbox-9568f90e.js` alone accounts for **78 warnings**. It is a
generated `next-pwa` artifact being linted as source. `eslint.config.mjs`
ignores `node_modules`, `.next`, `out`, `build` — but not `public/`.
Adding `public/workbox-*.js` and `public/sw.js` to `ignores` drops the
warning count from 116 to ~38 in one line, with zero behavioural risk.
**This is the single cheapest item in the task.**

## The `rules-of-hooks` error is a false positive — checked, not assumed

`apps/seller/app/[tenantSlug]/mobile/more/earnings/[payoutId]/page.tsx:67`
calls `useExpectedPayoutDate` *after* two early returns (`isLoading` at
`:26`, missing-payslip at `:36`). That is normally a real crash — React
throws "Rendered more hooks than during the previous render" the moment
`isLoading` flips true → false and the hook count goes 5 → 6.

It does not crash here, because `useExpectedPayoutDate`
(`apps/seller/lib/hooks/payroll/useExpectedPayoutDate.ts`) calls no hooks
at all:

```ts
export function useExpectedPayoutDate(endDate: string | undefined): string | null {
    if (!endDate) return null;
    return getExpectedPayoutDate(endDate);
}
```

It is a pure function wearing a `use` prefix, so ESLint flags it on the
naming convention alone. **Fix is a rename, not a restructure** — either
drop the `use` prefix (`toExpectedPayoutDate`), or delete the wrapper and
call `getExpectedPayoutDate` from `@tea-pos/utils/week` directly at the
call site with the null guard inlined. Do not "fix" this by hoisting the
call above the early returns; that would imply a runtime problem that
isn't there.

## Why the `react-hooks/*` errors are worth more than style points

`apps/seller/next.config.ts:56` sets `reactCompiler: true`, and
`babel-plugin-react-compiler@^1.0.0` is a direct dependency. The 16
`react-hooks/*` errors are React Compiler bailout and correctness signals,
not cosmetic lint: components hitting `preserve-manual-memoization`,
`purity`, or `static-components` silently opt out of auto-memoization, so
the compiler is paying its build cost on those files and delivering
nothing.

`static-components` is the clearest example. `DailySalesChart` and
`TeaWasteChart` both declare `CustomTooltip` (and `CustomBarLabel`) inside
the component body and pass `content={<CustomTooltip />}` to recharts. A
brand-new component type is created on every render, so the tooltip
remounts and loses state each time instead of updating. `ProductSalesChart`
has the identical pattern — worth fixing all three together since the fix
is the same shape.

## Suggested sequencing, cheapest and safest first

| # | Item | Risk | Notes |
|---|---|---|---|
| 1 | Ignore `public/workbox-*.js` + `public/sw.js` | None | One line in `eslint.config.mjs`. 116 → ~38 warnings. |
| 2 | Rename `useExpectedPayoutDate` | None | Kills the scariest-looking error. Pure rename, one call site. |
| 3 | 14 × `no-explicit-any` | Low | Mechanical. Biggest clusters are `reimbursements/*` (7) and `useSession.ts` (4). Real types exist in `packages/features/*/schema.ts` for most of these. |
| 4 | `static-components` ×2 (+ `ProductSalesChart`) | Low | Hoist chart tooltip/label helpers to module scope, pass what they need via props/closure args. Fixes a genuine remount bug as a side effect. |
| 5 | `AtAGlance.tsx` refs ×4 | Medium | Refs read/written during render. Contained to one file, but needs care — read the component fully before touching. |
| 6 | `purity` ×2, `preserve-manual-memoization` ×2 | Medium | `home/layout`, `InactivityRefreshPopup`, `MobileManage`, `WeatherDrawer`. |
| 7 | `set-state-in-effect` ×6 | **High** | `LanguageContext`, `RealtimeContext`, `usePWA`, `MobileLayoutClient`, `close/page` ×2. App-wide state and hydration. Do last, with device testing — language switching, realtime reconnect, and PWA install prompt all need a live smoke test, and per tasks 036/037 that path is behind Google OAuth and not drivable in the agent environment. |

Items 1-4 are a clean, self-contained PR that clears 17 of 31 errors and
most of the warning noise with essentially no behavioural risk. Items 5-7
deserve their own pass and their own testing.

## Not doing

- **Turning the `react-hooks/*` rules off** to make the build green. They
  are pointing at real compiler bailouts; silencing them wastes the
  `reactCompiler: true` investment.
- **Adding lint to CI before the baseline is green.** There is no CI
  workflow at all right now; wiring one up to a red baseline just creates
  a permanently-failing check people learn to ignore. Sequence it after
  items 1-4 at the earliest.

## Next steps

1. Land items 1-2 (config ignore + rename) — trivial, could ride along with
   any small PR.
2. Items 3-4 as one "lint: types and chart tooltips" PR.
3. Re-measure. Decide whether 5-7 are worth a dedicated pass or stay
   documented here.
4. Only once errors are at zero: consider a CI lint check.

## Guiding principle for this task

A red lint baseline is worse than no lint, because it trains everyone to
ignore the output — which is exactly how the 31st error got in. The goal
is not "make it green today"; it is to get errors to zero in risk-ordered
slices so the signal becomes trustworthy, then keep it that way with CI.
Fix what the rule is actually pointing at, and when a rule is wrong (see
`rules-of-hooks` above), fix the naming that confused it rather than
contorting the code to satisfy it.
