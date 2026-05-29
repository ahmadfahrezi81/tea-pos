# Home / Manage Refactor

## Context

The current `/mobile/pos` screen does one thing: take orders. All store management actions (open store, expenses, close day) live in `/mobile/analytics`, which was never the right home for them.

The new structure introduces `/mobile/home/` as the parent for two sibling routes:
- `/mobile/home/pos` — the POS (sell mode)
- `/mobile/home/manage` — store management hub

A `PillSwitcher` component exists at `apps/seller/app/[tenantSlug]/mobile/pos/_components/PillSwitcher.tsx` but points to old paths. It will need to be updated.

**Do NOT remove existing analytics logic** — focus on building the new feature. Analytics cleanup is a separate task.

**No modals/popups** — every management action is a full page under `/mobile/home/manage/`.

**Session gate (from task 002 Ticket 2) goes inside `MobileManage.tsx` once this is done.**

---

## New Route Structure

```
/mobile/home/pos           — POS (order taking, same as current /mobile/pos)
/mobile/home/manage        — Manage hub (today's status, nav to actions)
/mobile/home/manage/open   — Open store page
/mobile/home/manage/close  — Close day page (replaces /mobile/analytics/daily/close)
/mobile/home/manage/expense — Add expenses page
```

---

## Files to create

### 1. `/mobile/home/pos/page.tsx`

Thin wrapper — renders the existing `MobilePOS` component:

```tsx
import MobilePOS from "../../pos/_components/MobilePOS";

export default function HomePOSPage() {
    return <MobilePOS />;
}
```

No need to move or duplicate `MobilePOS.tsx` — just import from its current location.

### 2. `/mobile/home/manage/page.tsx` + `_components/MobileManage.tsx`

The manage hub. Shows:
- Today's summary status card (open / closed badge, date, key stats if open)
- Nav buttons/cards to each action page:
  - **Open Store** → `/mobile/home/manage/open` (only show if no today's summary)
  - **Close Day** → `/mobile/home/manage/close` (only show if today's summary is open)
  - **Expenses** → `/mobile/home/manage/expense` (only show if today's summary is open)
- Session gate will slot in here (task 002 Ticket 2)

Use `useSummaries(selectedStoreId, currentMonthStr)` to get today's summary.
Use `useSession(selectedStoreId)` for the session gate (task 002).

Navigation uses `navigation.push(url(...))` — same pattern as rest of the app.

### 3. `/mobile/home/manage/open/page.tsx` + `_components/MobileOpenStore.tsx`

Full-page open store flow:
- Show store name + today's date
- Optional opening balance input (number input, defaults 0)
- Confirm button → calls `useSession(selectedStoreId).openStore({ date: todayStr, openingBalance })`
- On success → navigate back to `/mobile/home/manage`
- On error → show inline error message (no toast needed, it's a page)

### 4. `/mobile/home/manage/close/page.tsx` + `_components/`

Close day full page. The existing close day flow lives at `analytics/daily/close/page.tsx` and uses step components in `analytics/daily/_components/`. **Reuse those step components directly** — import them from their current location. No need to move files.

### 5. `/mobile/home/manage/expense/page.tsx` + `_components/MobileExpense.tsx`

Full-page expense entry. Reference the logic from `analytics/_components/SetExpenseModal.tsx` for the expense form structure but build it as a page (not a modal). On submit → navigate back to manage.

---

## Files to modify

### 6. `pos/_components/PillSwitcher.tsx`

Update the `base` and tab hrefs to use the new home routes:

```tsx
const base = `/${tenantSlug}/mobile/home/pos`;
const tabs = [
    { label: "Sell", href: base },
    { label: "Manage", href: `/${tenantSlug}/mobile/home/manage` },
];
```

### 7. `pos/_components/MobilePOS.tsx`

Wire in the pill switcher — add `<PillSwitcher />` at the top of the component (above the greeting or as the first element in the flex header row).

```tsx
import { PillSwitcher } from "./PillSwitcher";
// In JSX:
<PillSwitcher />
```

### 8. `config/routes.ts`

Add all new routes:

```ts
"/mobile/home/pos": {
    title: "Home",
    subPage: false,
    inlineHeader: false,
    isChart: false,
    parent: null,
},
"/mobile/home/manage": {
    title: "Manage",
    subPage: false,
    inlineHeader: false,
    isChart: false,
    parent: null,
},
"/mobile/home/manage/open": {
    title: "Open Store",
    subPage: true,
    inlineHeader: false,
    isChart: false,
    parent: "/mobile/home/manage",
},
"/mobile/home/manage/close": {
    title: "Close Day",
    subPage: true,
    inlineHeader: false,
    isChart: false,
    parent: "/mobile/home/manage",
},
"/mobile/home/manage/expense": {
    title: "Expenses",
    subPage: true,
    inlineHeader: false,
    isChart: false,
    parent: "/mobile/home/manage",
},
```

`subPage: false` for `/home/pos` and `/home/manage` so the bottom nav stays visible and the pill handles switching. `subPage: true` for the action pages so back navigation appears.

### 9. `components/MobileLayoutClient.tsx`

**a) Home tab** — point to new path and match both home routes:

```ts
{
    path: url("/mobile/home/pos"),
    label: "Home",
    icon: StoreIcon,
    matchPaths: [
        url("/mobile/home/pos"),
        url("/mobile/home/manage"),
    ],
},
```

**b) rootTabPaths array** (the `useEffect` that tracks last root tab):

```ts
const rootTabs = [
    url("/mobile/home/pos"),
    url("/mobile/home/manage"),
    url("/mobile/orders"),
    url("/mobile/analytics"),
    url("/mobile/inbox"),
    url("/mobile/more"),
];
```

**c) Same array in the static `rootTabPaths` const** used for `showAccountIcon`.

**d) Prefetch** — add to the prefetch `useEffect`:

```ts
router.prefetch(url("/mobile/home/pos"));
router.prefetch(url("/mobile/home/manage"));
```

---

## Routing notes

- The old `/mobile/pos` route stays as-is — do not delete or redirect. It will be cleaned up separately.
- `PillSwitcher` uses `<Link>` (Next.js client nav). Both routes share the same shell — no header/nav re-mount, transitions feel instant.
- Action sub-pages (`open`, `close`, `expense`) are `subPage: true` so the standard back arrow appears in the header pointing back to manage.

---

## After this task — return to task 002

With `/mobile/home/manage` in place, implement Ticket 2 (session gate) inside `MobileManage.tsx`:
- `useSession(selectedStoreId)` is already called there
- Gate states: loading → no session (CTA to open store page) → other user (claim flow) → current user (normal manage)
- See `002_sessions-payroll-ui.md` Ticket 2 for full spec
