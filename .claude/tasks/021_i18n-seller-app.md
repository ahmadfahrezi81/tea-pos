# Task 021 — i18n: Seller App (EN ↔ ID)

## Goal
Add Indonesian language support to the seller app. User picks language in Account → Language. Preference stored in cookie (fast, no render flash) and synced to DB (cross-device persistence). All UI strings use translation keys — no hardcoded text in components.

## Guiding Principles
- `en.ts` is the source of truth. `id.ts` must satisfy `DeepPartial<typeof en>`.
- Keys are namespaced by screen/domain — never flat.
- A `t()` helper falls back to `en` for any key missing in `id` — safe to ship incomplete translations.
- No TMS needed now — TS files are the contract. Can export as JSON to Lokalise/Phrase later with zero restructuring.
- Known limitation: `t('key')` takes a plain string — typos in keys won't be caught by TypeScript. Accept this tradeoff for simplicity.

---

## Stack Decision
**No next-intl.** Custom lightweight solution — no new dependencies, fits existing context pattern.

- `packages/utils/translations/en.ts` — source of truth
- `packages/utils/translations/id.ts` — `DeepPartial<typeof en>`, Indonesian values
- `packages/utils/translations/index.ts` — exports `t(lang, key)` helper with fallback + `Locale` type + `DeepPartial` utility
- `apps/seller/lib/context/LanguageContext.tsx` — provides `language` + `setLanguage` to app
- Cookie (`locale`) — read by server root layout for zero flash on first render
- DB — source of truth for cross-device persistence

---

## Phase 1 — Setup ✅ COMPLETE

### 1.1 Translation files ✅
### 1.2 Export from packages/utils ✅ (explicit `"./translations": "./translations/index.ts"` entry)
### 1.3 DB migration ✅ (`preferred_language TEXT NOT NULL DEFAULT 'en'`, types regenerated, schema updated)
### 1.4 API + service layer ✅
### 1.5 Cookie handling ✅
### 1.6 LanguageContext ✅
### 1.7 Wire LanguageContext into root layout ✅
### 1.8 useT() hook ✅

---

## Phase 2 — Translation Files Content ✅ COMPLETE

`en.ts` and `id.ts` both exist with full coverage for all currently extracted keys. `en.ts` is the source of truth (`as const`), `id.ts` uses `DeepPartial<typeof en>`.

---

## Phase 3 — Screen-by-Screen String Extraction

### Shared / Layout
- [x] **MobileLayoutClient** — loader text, auth error messages, "Refresh Page", "Retry"
- [x] **MobileHeader** — intentionally deferred: page titles are string literals in `navigation.ts` config, not JSX. Leave as English.

---

### Tab 1 — POS / Home (`/mobile/home/*`)
- [x] **StoreGate**
- [x] **AtAGlance** — greeting keys (`home.greeting.morning/afternoon/evening`)
- [x] **TakeOverCard**
- [x] `/mobile/home/manage` — MobileManage
- [x] `/mobile/home/manage/open`
- [x] `/mobile/home/manage/close`
- [x] `/mobile/home/manage/expense`
- [x] `/mobile/home/manage/expense/add`
- [x] `/mobile/home/manage/request`
- [x] `/mobile/home/manage/request/add`
- [x] `/mobile/home/manage/report`
- [x] `/mobile/home/manage/report/add`

---

### Tab 2 — Orders (`/mobile/orders/*`)
- [x] `/mobile/orders` — MobileOrders — labels, empty state, filter labels
- [x] `/mobile/orders/chart` — OrdersChart — chart labels

---

### Tab 3 — Analytics (`/mobile/analytics/*`)
- [x] `/mobile/analytics` — MobileAnalytics (card labels, drawer, unclosed warning, close day button)
- [x] `/mobile/analytics/chart` — DailySalesChart (avg/day, total)
- [x] `/mobile/analytics/_components/SetBalanceModal` — set/update opening balance
- [x] `/mobile/analytics/daily/*` — DaySummaryDetails — extracted to client component `_components/DaySummaryDetails.tsx`
- [x] `/mobile/analytics/daily/*/events` — DayActivity — labels
- [x] `/mobile/analytics/daily/*/sessions` — DaySessions — labels

---

### Tab 4 — Chats (`/mobile/chats`)
- [x] `/mobile/chats` — Chats — labels, empty state

---

### Tab 5 — More (`/mobile/more/*`)
- [x] `/mobile/more` — MoreMenu (section headings, all row labels)
- [x] **SessionStreak** — `(current)` label
- [x] `/mobile/more/stores` — MobileProfileStores (no stores empty state, Default badge)
- [x] `/mobile/more/map` — LocationFeedback — labels
- [x] `/mobile/more/map/add` — NewLocationFeedback — form labels
- [x] `/mobile/more/earnings` — EarningsPage (status labels, no periods, tap to view)
- [x] `/mobile/more/earnings/[periodId]` — PayslipPage (all receipt labels, status long-form, proof, bank details)
- [x] `/mobile/more/reimbursements` — ReimbursementsPage (entitlements, freq labels, status labels, empty states)
- [x] `/mobile/more/reimbursements/add` — NewClaim — form labels

---

### Account (`/mobile/account/*`)
- [x] `/mobile/account` — AccountProfile (all rows, logout confirm)
- [x] `/mobile/account/details` — MobilePersonalDetails (all field labels, error state)
- [x] `/mobile/account/details/edit` — EditPersonalDetails — form labels
- [x] `/mobile/account/payroll-info` — PayrollInfo — labels
- [x] `/mobile/account/payroll-info/edit` — EditPayrollInfo — form labels
- [x] `/mobile/account/language` — LanguagePicker ✅ (Phase 4)

---

### Notifications (`/mobile/notifications/*`)
- [x] `/mobile/notifications` — NotificationsPage (empty state)
- [x] `/mobile/notifications/[id]/weather` — weather notification detail — labels

---

## Phase 4 — Language Picker UI ✅ COMPLETE

- [x] New route `/mobile/account/language` with `LanguagePicker` component
- [x] Navigation config updated (`inlineHeader: false`, `subPage: true`)
- [x] Language row in AccountProfile enabled and wired

---

## Phase 5 — Validation

- [ ] First render arrives in correct language — no English flash for Indonesian users (server reads cookie)
- [x] Switching language re-renders all strings instantly without page reload
- [ ] Language persists after logout + login on same device (cookie survives)
- [ ] Language persists on a different device (DB → sets cookie on first load)
- [x] Missing keys in `id.ts` silently fall back to English — no broken UI
- [ ] TypeScript errors if `id.ts` adds a key that doesn't exist in `en.ts`
- [x] TypeScript does NOT error if `id.ts` omits a key (DeepPartial allows this)
- [ ] No hardcoded English strings remain in Shared/Layout and Tab 1–5 components (Phase 3 scope)

---

## Remaining Work (next session)

**Phase 3 — COMPLETE ✅** All screens swept.

**Phase 5 — full validation checklist**

---

## Notes
- `en.ts` is the only file developers touch when adding new strings. Fill `id.ts` after.
- `as const` on `en.ts` gives full TypeScript inference on all nested keys.
- `DeepPartial` ensures nested omissions in `id.ts` are safe — you can translate one namespace at a time.
- Known limitation: `t('home.gate.typo')` won't error at build time — key is a plain string. Accept this for now.
- If team grows and needs Lokalise: export both files as JSON via a build script — zero restructuring.
- Do NOT use next-intl — it adds routing complexity that this app doesn't need.
