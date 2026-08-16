# 046 — Naming Refactor: Files, Routes, and Layers

**Status:** sections B, D, E done. Sections A and C **deliberately dropped** — see the verdict below.

## Verdict (decided, do not relitigate)

File names are free to change and are read every day. URLs cost an external contract and are read almost never. So: rename aggressively inside the repo, never at the boundary.

- **Done:** every component and layer rename that touches no URL.
- **Dropped — section A, all seller route renames.** `earnings` → `pay` and friends would break service-worker caches on installed phones, break deep links, and split every PostHog funnel across two `$pathname` values *permanently*. A redirect fixes navigation; it cannot fix historical analytics. Not worth it for a name only developers read.
- **Dropped — section C's URL half.** `/mobile/pay/claim-types` and its heading "Claim Types" both stay. Only the code layer moved to `configs`.
- Revisit A only if URLs are being broken for some other reason anyway.

The `…Page` suffix convention proposed in section B was **not needed**: the headings are "Daily Chart" and "Monthly Chart", not "Daily Sales", so the page components never collided with the `DailySalesChart` primitive. Plain heading rule applied.

## What shipped

| Was | Now | Why |
| --- | --- | --- |
| `analytics/chart/_components/MobileDailySales.tsx` | `MonthlyChart.tsx` | File claimed daily, page is Monthly Chart |
| `orders/chart/_components/MobileHourlySales.tsx` | `DailyChart.tsx` | File claimed hourly, page is Daily Chart |
| `more/stores/_components/MobileProfileStores.tsx` | `MyStores.tsx` | "Profile" route no longer exists |
| `account/_components/AccountProfile.tsx` | `Account.tsx` | same |
| `account/details/_components/MobilePersonalDetails.tsx` | `PersonalDetails.tsx` | prefix |
| `home/manage/_components/MobileManage.tsx` | `Manage.tsx` | prefix |
| `home/pos/_components/MobilePOS.tsx` | `POS.tsx` | prefix |
| `orders/_components/MobileOrders.tsx` | `Orders.tsx` | prefix |
| `more/_components/SessionStreak.tsx` | `WorkDays.tsx` | matches the section heading; it is a grid, not a streak |
| seller `lib/api/payroll.ts` / `payrollApi` | `payouts.ts` / `payoutsApi` | only covers payouts + payslip. Backoffice's `payroll.ts` genuinely covers the domain and was left alone |
| `feedbacksApi` (both apps) | `customerFeedbacksApi` | export dropped the qualifier the file kept |
| `lib/hooks/payroll-claims/`, `lib/hooks/payroll-user-info/` | folded into `lib/hooks/payroll/` | three sibling folders for one domain |
| `packages/features/reimbursements/schema.ts` | **deleted** | imported by nothing; hardcoded the claim-type list `payroll_claim_configs` replaced |
| `packages/features/payroll-claim-types/` | `payroll-claim-configs/` | DB table is `payroll_claim_configs` |
| `packages/features/payroll-commission-types/` | `payroll-commission-configs/` | same |
| `packages/services/payroll-claim-types.ts` | `payroll-claim-configs.ts` | same |
| `packages/services/payroll-commission-types.ts` | `payroll-commission-configs.ts` | same |
| `PayrollClaimType*`, `PayrollCommissionType*`, `usePayroll*Types` | `…Config…` / `…Configs` | symbols follow the DB word |

**Deliberate inconsistency left in place:** the API routes are still `/api/payroll/claim-types`, and the backoffice screens still say "Claim Types". The DB word wins where developers read it, the human word wins where staff read it. Do not "fix" this without reading the verdict above.

Verified: `tsc --noEmit` and `next build` clean in both apps; lint counts unchanged from baseline (seller 15 errors / 7 warnings, backoffice 2 / 3 — all pre-existing).

---

## Original proposal (kept for the reasoning)

## The rule this proposal applies

> **A page's component file is named after the heading the user sees. A route segment is that heading in kebab-case. A domain keeps one name from the DB table up through the service, schema, API route, hook, and screen.**

The seller app's *root* routes already obey this — `/mobile/orders` is "Orders", `/mobile/analytics` is "Analytics". The drift is all in sub-routes, in `_components/` filenames, and in the `lib/` layers, where names were fixed at the time the feature was built and never followed the DB or the copy when those moved.

Each table below has a **Cost** column:

- **free** — rename only, no runtime behaviour changes, no external references
- **cheap** — touches several imports, still internal
- **breaking** — changes a URL or an external contract (PostHog, PWA cache, bookmarks); needs a redirect or a coordinated change

---

## A. Seller routes vs. the heading they render

| Route | Heading today | Problem | Proposed | Cost |
| --- | --- | --- | --- | --- |
| `/mobile/more/earnings` | My Pay | Segment is a synonym nobody says out loud | `/mobile/more/pay` | breaking |
| `/mobile/more/earnings/[payoutId]` | Pay Details | Follows parent | `/mobile/more/pay/[payoutId]` | breaking |
| `/mobile/more/reimbursements` | My Claims | "Reimbursement" is the pre-rename domain word; DB table has been `payroll_claims` for a while | `/mobile/more/claims` | breaking |
| `/mobile/more/reimbursements/add` | New Claim | Follows parent | `/mobile/more/claims/add` | breaking |
| `/mobile/more/map` | Location Feedback | "map" names the widget, not the screen | `/mobile/more/location-feedback` | breaking |
| `/mobile/more/map/add` | New Location Feedback | Follows parent | `/mobile/more/location-feedback/add` | breaking |
| `/mobile/home/manage/expense` | Store Expenses | Singular segment, plural screen | `/mobile/home/manage/expenses` | breaking |
| `/mobile/home/manage/request` | Store Requests | Same | `/mobile/home/manage/requests` | breaking |
| `/mobile/home/manage/report` | Store Reports | Same | `/mobile/home/manage/reports` | breaking |
| `/mobile/orders/chart` | Daily Chart | Two different screens are both `/chart`; the segment carries no information | `/mobile/orders/daily` | breaking |
| `/mobile/analytics/chart` | Monthly Chart | Same | `/mobile/analytics/monthly` | breaking |

**Leave alone:** `/mobile/more/stores` ("My Stores" — the "My" is a possessive, not part of the noun), `/mobile/more/patch-notes`, `/mobile/account/*`, `/mobile/analytics/daily/*`, all root tabs.

**What "breaking" costs here.** Every one of these is a client-side route in an installed PWA. Renaming means: the service worker has the old URL cached, PostHog funnels and any dashboard filtered on `$pathname` break silently, and anyone who bookmarked or home-screened a deep link 404s. Mitigation is a `redirects()` block in `next.config.ts` kept for one or two releases, and a heads-up before the PostHog dashboards are read again.

---

## B. Seller page components vs. their heading

The `Mobile` prefix is on 7 files. The seller app has no desktop surface — the prefix distinguishes nothing and pushes the informative part of the name to the right. Dropping it is free.

| File | Renders the page | Problem | Proposed | Cost |
| --- | --- | --- | --- | --- |
| `analytics/chart/_components/MobileDailySales.tsx` | **Monthly Chart** | Actively wrong — file says daily, page says monthly | `MonthlySalesChart.tsx` | free |
| `orders/chart/_components/MobileHourlySales.tsx` | **Daily Chart** | Actively wrong in the other direction | `DailySalesChart.tsx` — **name is taken**, see note | free |
| `more/stores/_components/MobileProfileStores.tsx` | My Stores | "Profile" is a route that no longer exists | `MyStores.tsx` | free |
| `account/details/_components/MobilePersonalDetails.tsx` | Personal Details | Prefix | `PersonalDetails.tsx` | free |
| `home/manage/_components/MobileManage.tsx` | Manage | Prefix | `Manage.tsx` | free |
| `home/pos/_components/MobilePOS.tsx` | POS | Prefix | `Pos.tsx` | free |
| `orders/_components/MobileOrders.tsx` | Orders | Prefix | `Orders.tsx` | free |
| `account/_components/AccountProfile.tsx` | Account | "Profile" again | `Account.tsx` | free |
| `more/_components/SessionStreak.tsx` | (Work Days section) | Section was just renamed from "Activity"; file still says streak, and it is a grid, not a streak | `WorkDays.tsx` | free |

**The `DailySalesChart` collision.** `analytics/chart/_components/DailySalesChart.tsx` already exists — it is the *chart primitive* rendered inside the Monthly Chart page, plotting one bar per day. The Orders page component that wants the name plots one bar per hour. Suggested split:

- primitives keep the axis they draw: `DailySalesChart.tsx` (per-day bars), `HourlySalesChart.tsx`
- page components take the page heading: `MonthlySalesChart.tsx`, `DailySalesChart.tsx` — still collides.

Cleaner: **page components get a `…Page` suffix** (`MonthlyChartPage.tsx`, `DailyChartPage.tsx`) and primitives keep the plain names. Decide this one before the rest — it sets the convention for every page component in the table above.

**Leave alone:** `AtAGlance`, `PillSwitcher`, `StoreGate`, `TakeOverCard`, `CartDrawer`, `QrisCode`, `PhotoPicker`, `MiniDailySalesChart`, `MiniHourlySalesChart`, `DaySummaryDetails`, `PayConfigCard`, `EmptyChats`, `EmptyPatchNotes`, `MoreMenu`, `LanguagePicker`. These name a widget or a state, and the name is accurate.

---

## C. Backoffice

Backoffice route titles are literal strings in `config/navigation.ts`, not keys, so route and heading are easy to compare.

| Route | Heading | Problem | Proposed | Cost |
| --- | --- | --- | --- | --- |
| `/mobile/pay/claim-types` | Claim Types | DB table is `payroll_claim_configs`; "type" is the pre-rename word | `/mobile/pay/claim-configs`, heading "Claim Configs" | breaking |
| `/mobile/pay/commission-types` | Commission Types | Same | `/mobile/pay/commission-configs`, heading "Commission Configs" | breaking |
| `/mobile/pay/staff` | Staff Payroll Info | Segment much narrower than heading | `/mobile/pay/payroll-info` | breaking |
| `/mobile/pay/staff/[userId]` | Payroll Info | — | follows parent | breaking |
| `/mobile/pay/payouts` | Staff Payouts | Fine — "Staff" is a qualifier | keep | — |

**Open question on "Configs".** The DB says configs and CLAUDE.md documents the rename, but "Claim Types" is the better phrase for a human reading a screen. Two consistent answers: rename the screens to match the DB, or keep the UI copy as "Types" and only align the code layer. My recommendation: **keep the UI heading as "Claim Types", rename the route and code to `claim-configs`** — the DB word wins where developers read it, the human word wins where staff read it. That is a deliberate exception to the top rule and should be written down as such.

Backoffice has almost no `_components/` yet — only the two added this session, both correctly named.

---

## D. Seller `lib/` layers

Folder and file disagree in three places, and the payroll domain is split across three folder shapes.

| Location | Problem | Proposed | Cost |
| --- | --- | --- | --- |
| `lib/hooks/requests/useSupplyRequests.ts` | Folder `requests`, hook `useSupplyRequests`, API route `/api/requests`, service `requests.ts` — three of the four omit "supply" | Pick one: **`supply-requests`** throughout (matches `store_requests` intent and the UI heading "Store Requests") | cheap + breaking for the API route |
| `lib/hooks/reports/useIncidentReports.ts` | Same shape — folder `reports`, hook `useIncidentReports`, heading "Store Reports" | `incident-reports` throughout, or rename the hook to `useStoreReports` | cheap + breaking |
| `lib/api/payroll.ts` | Contains payouts and payslip only, but is named for the whole domain | `lib/api/payouts.ts` | free |
| `lib/hooks/payroll/` vs `lib/hooks/payroll-claims/` vs `lib/hooks/payroll-user-info/` | Three sibling folders for one domain, split on no principle | Flatten to `lib/hooks/payroll/{usePayouts,usePayslip,usePayrollClaims,usePayrollUserInfo}.ts` | cheap |
| `lib/api/customer-feedbacks.ts` exports `feedbacksApi` | Export drops the qualifier the file keeps | `customerFeedbacksApi` | free |

---

## E. Packages lagging the DB

CLAUDE.md already records these table renames. The code did not follow.

| Path | DB says | Proposed | Cost |
| --- | --- | --- | --- |
| `packages/features/reimbursements/schema.ts` | — | **Delete.** Nothing imports it. It defines `REIMBURSEMENT_TYPES` as a hardcoded `mobile_data / lunch / gasoline` list, which `payroll_claim_configs` replaced with tenant-defined rows | free |
| `packages/features/payroll-claim-types/` | `payroll_claim_configs` | `payroll-claim-configs/` | cheap |
| `packages/features/payroll-commission-types/` | `payroll_commission_configs` | `payroll-commission-configs/` | cheap |
| `packages/services/payroll-claim-types.ts` | same | `payroll-claim-configs.ts` | cheap |
| `packages/services/payroll-commission-types.ts` | same | `payroll-commission-configs.ts` | cheap |
| `ActivityLogType` in `packages/features/activity-logs/schema.ts` | — | Holds both `reimbursement_submitted` and `claim_submitted`, and both `payroll_entry_updated` and `payroll_commission_updated`. The old members are still valid values sitting in historical `tenant_activity_logs` rows | see below |

**On the activity-log enum.** These are not free to remove — old rows in the table carry the old strings, and dropping the enum member makes those rows fail validation on read. The right move is to keep the old members, mark them deprecated in a comment, and make sure nothing *writes* them any more. Worth a grep as part of this task; not worth a migration.

---

## F. Explicitly not in scope

- **PostHog flag keys** (`feature-reimbursement`, `feature-request`, …). Renaming a key means editing the flag in the PostHog UI at the same moment the code deploys, or the flag fails closed and the feature vanishes for everyone. Separate, coordinated task.
- **DB columns and tables.** This task renames code to match the DB, never the reverse.
- **`packages/db/types.ts`.** Generated.
- **The FK constraint names** (`payroll_claim_types_tenant_id_fkey` and friends). Already documented as a known lie in CLAUDE.md; renaming constraints is a migration with no functional payoff.

---

## Suggested order

1. **Settle the two conventions first** — the `…Page` suffix question in section B, and Types-vs-Configs in section C. Everything downstream depends on both.
2. **Section B and the free rows of D and E.** Pure renames, no URLs move, no external system notices. Ship as one commit per section so a `git log --follow` stays readable.
3. **Section E's cheap rows.** Package renames — touches import paths across both apps.
4. **Section A and the breaking rows of C and D last**, together, in one release with a `redirects()` block. Doing them piecemeal means several rounds of broken PostHog dashboards instead of one.

## Verification per step

`pnpm lint` and `npx tsc --noEmit` in both apps after each commit, plus a build of both — a moved page file that nothing imports will typecheck clean and 404 at runtime, so the build's route listing is the check that matters. For section A, walk the redirect list against the old URLs by hand.
