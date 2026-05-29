# Task 012 — Shell Load Performance (Footer Gate + Loading Flash + FormFooter CTA)

## Goal

Fix three unnecessary rendering delays in the mobile shell — all share the same root cause: chrome that could be instant is blocked behind data or lifecycle timing.

1. **Footer gate** — footer nav waits for `useStores()` to resolve, but tabs are pure static config that need no store data.
2. **`shellReady` flash + pop-in** — the loader shows for returning users who already have a session cookie (it should be instant for them), and when it disappears the header/footer pop in from nothing because the shell wasn't rendered underneath.
3. **`FormFooter` CTA delay** — on expense, request, and report list pages the action button injects itself upward via `useLayoutEffect` + slot context, so it always appears after the page mounts. The button is pure static config — same label, same destination, always enabled — and can be rendered directly by the shell from route config, instantly.

**The principle across all three:** header and footer chrome should be on screen in the same frame as the shell. Content loads after.

> **Status: READY TO EXECUTE**

---

## Part A — Remove the `storesReady` gate from the footer

### Why it's wrong

`MobileFooterNav` has a hard render guard:

```tsx
// MobileLayoutClient.tsx
const storesReady = !!storesData;   // true only after useStores() resolves

// MobileFooterNav.tsx
if (!storesReady) return null;      // footer hidden until API responds
```

The footer tabs are computed entirely from `tabGroups.global` in `navigation.ts` — static config, zero store data involved. The guard was in the very first commit that created the file with no justification, and has silently delayed the footer on every cold load since. This is why products (their own SWR key, unblocked) can load before the footer appears.

### `apps/seller/app/[tenantSlug]/mobile/components/MobileFooterNav.tsx`

Remove the prop and the guard:

```diff
  interface MobileFooterNavProps {
      tabs: Tab[];
      currentPath: string;
      onTabClick: (path: string) => void;
      isIPhonePWA: boolean;
-     storesReady: boolean;
  }

  export function MobileFooterNav({
      tabs,
      currentPath,
      onTabClick,
      isIPhonePWA,
-     storesReady,
  }: MobileFooterNavProps) {
-     if (!storesReady) return null;
```

### `apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx`

Remove the `storesReady` derived value and its pass-through:

```diff
- const storesReady = !!storesData;
  ...
  <MobileFooterNav
      tabs={tabs}
      currentPath={currentPath}
      onTabClick={handleNavClick}
      isIPhonePWA={isIPhonePWA}
-     storesReady={storesReady}
  />
```

> **Layout is safe.** The scroll container's `pb-28`/`pb-32` padding and `--mobile-footer-h` CSS variable are set unconditionally — always applied even when the footer was hidden. Nothing shifts.

> **`storesData` is still used** downstream by `StoreContext` / `StorePickerDrawer`. Do not remove the `useStores()` call itself.

---

## Part B — Fix `shellReady`: overlay approach + no pop-in

### The two problems

**Problem 1 — Unnecessary flash for returning users.**
`shellReady` always starts `false` and is set to `true` via `useEffect`. For a returning user whose `x-user-info` cookie is valid, `user` is synchronously available from SWR's `fallbackData` on the very first render — but `shellReady` is still `false`. The loader flashes for one paint cycle then immediately disappears. This is not the intended deliberate splash; it's a bug.

**Problem 2 — Header/footer pop in when loader disappears.**
The current structure is a conditional early return:

```tsx
if (!shellReady) return <LoaderScreen />;   // only loader, no shell
if (!user)       return <AuthErrorScreen />;
return <FullShell />;                        // shell rendered fresh
```

When the loader exits, the entire shell (header, footer, content) renders from nothing. On any device you can see the chrome appear out of thin air.

### The fix — loader as an overlay, shell always rendered

Change the structure so the shell is always in the DOM and the loader/error screens sit on top as `fixed inset-0 z-50` overlays:

```
┌─────────────────────────────┐
│  MobileHeader  (always)     │  ← rendered on first paint
├─────────────────────────────┤
│                             │
│  children (when shellReady) │
│                             │
├─────────────────────────────┤
│  MobileFooterNav (always)   │  ← rendered on first paint
└─────────────────────────────┘
         overlaid by
┌─────────────────────────────┐
│  Loader overlay  z-50       │  ← covers shell until shellReady
│  (fixed inset-0)            │
└─────────────────────────────┘
```

When `shellReady` becomes `true`, the overlay disappears — the app was already behind it. No pop-in.

### `apps/seller/app/[tenantSlug]/mobile/layout.tsx`

Make the layout async, read the cookie, pass `hasInitialUser` down:

```diff
+ import { cookies } from "next/headers";

- export default function MobileLayout({ children }: MobileLayoutProps) {
+ export default async function MobileLayout({ children }: MobileLayoutProps) {
+     const cookieStore = await cookies();
+     const hasInitialUser = !!cookieStore.get("x-user-info")?.value;
+
      return (
          <StoreProvider>
              ...
-             <MobileLayoutClient>
+             <MobileLayoutClient hasInitialUser={hasInitialUser}>
```

### `apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx`

**1. Accept the new prop and seed `shellReady` from it:**

```diff
  interface MobileLayoutClientProps {
      children: ReactNode;
+     hasInitialUser: boolean;
  }

  export default function MobileLayoutClient({
      children,
+     hasInitialUser,
  }: MobileLayoutClientProps) {
-     const [shellReady, setShellReady] = useState(false);
+     const [shellReady, setShellReady] = useState(hasInitialUser);
```

Keep the `useEffect` as-is — it handles the `hasInitialUser=false` path (new sessions) where the loader needs to stay until `user` resolves:

```tsx
useEffect(() => {
    if (user) setShellReady(true);
}, [user]);
```

**2. Replace the early returns with overlays. The final return becomes:**

```tsx
return (
    <MobileFooterSlotContext.Provider value={{ setFooterSlot }}>
    <MobileOverlayContext.Provider value={{ setOverlay }}>
        {/* Shell — always rendered */}
        <div
            className="h-dvh flex flex-col bg-gradient-to-b from-slate-100 to-slate-200 select-none overflow-hidden"
            style={{ '--mobile-footer-h': isIPhonePWA ? '97px' : '65px' } as React.CSSProperties}
        >
            <MobileHeader ... />

            <div className="flex-1 relative overflow-hidden">
                <div
                    ref={scrollContainerRef}
                    className={`absolute inset-0 overflow-y-auto p-4 ${scrollPaddingBottom} ${scrollPaddingTop}`}
                >
                    {shellReady && !isTransitioning && children}
                </div>
                {/* ... transition skeleton, overlay, footerSlot ... */}
            </div>

            {!currentIsSubPage && (
                <MobileFooterNav ... />
            )}

            <StorePickerDrawer />
        </div>

        {/* Loader overlay — shown until shellReady */}
        {!shellReady && (
            <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
                {/* existing loader JSX — move it here unchanged */}
                ...
            </div>
        )}

        {/* Auth error overlay — shown when shellReady but user is gone */}
        {shellReady && !user && (
            <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
                {/* existing auth error JSX — move it here unchanged */}
                ...
            </div>
        )}
    </MobileOverlayContext.Provider>
    </MobileFooterSlotContext.Provider>
);
```

Key point: `children` is gated on `shellReady` inside the scroll container. Header and footer render unconditionally. The overlay covers everything until ready — when it lifts, the chrome was already there.

> **Edge case: stale/invalid cookie.** If `hasInitialUser=true` but auth fails, `shellReady` starts `true` and the shell renders. SWR revalidates, `user` becomes `null`, and the auth error overlay appears. Handled correctly.

> **Optional: fade-out on loader.** You can add `animate-out fade-out duration-200` or a CSS transition to the loader overlay for a smoother feel when it lifts.

---

## Part D — Static footer CTA from route config

### Why `FormFooter` is always late

`FormFooter` uses `useLayoutEffect` to push a button up into the shell via `MobileFooterSlotContext`:

```
Page renders
    → FormFooter mounts (renders null)
        → useLayoutEffect fires
            → setFooterSlot(...) called
                → MobileLayoutClient re-renders
                    → button appears   ← always at least one cycle late
```

On expense, request, and report list pages the button never changes — it's always "New Store [X]", always navigates to `[current-path]/add`, always enabled. It's static config, not dynamic state. The `FormFooter` slot pattern is the wrong tool for this case.

Compare with the header: `navigation.ts` already has `headerAction: "add"` for these same routes, and `MobileHeader` renders the `+` button directly from that config — instant, no child needed. The footer CTA should work the same way.

### `apps/seller/app/[tenantSlug]/mobile/config/navigation.ts`

Add `footerCta` to `RouteConfig` and populate it for the three list routes:

```diff
  export type RouteConfig = {
      title: string;
      subPage: boolean;
      inlineHeader: boolean;
      isChart: boolean;
      parent: string | null | "lastRootTab";
      headerAction?: "add";
      hideStorePicker?: boolean;
+     footerCta?: string;
  };

  "/mobile/home/manage/expense": {
      ...
      headerAction: "add",
+     footerCta: "New Store Expense",
  },
  "/mobile/home/manage/request": {
      ...
      headerAction: "add",
+     footerCta: "New Store Request",
  },
  "/mobile/home/manage/report": {
      ...
      headerAction: "add",
+     footerCta: "New Store Report",
  },
```

### `apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx`

Read `footerCta` from the current route and render it in the same slot area. The `footerSlot` (used by dynamic form pages) takes priority if both are somehow set:

```diff
+ const footerCtaLabel = currentRoute?.footerCta;

  {/* in the content area div, replace the existing footerSlot block: */}
- {footerSlot && (
+ {(footerSlot || footerCtaLabel) && (
      <div className="absolute bottom-0 left-0 right-0 z-20">
-         {footerSlot}
+         {footerSlot ?? (
+             <div className="bg-white border-t border-gray-200 p-4 pb-8">
+                 <button
+                     onClick={() => handleNavClick(`${currentPath}/add`)}
+                     className="w-full bg-brand text-white py-4 rounded-xl font-semibold text-base active:scale-[0.98] transition-transform"
+                 >
+                     {footerCtaLabel}
+                 </button>
+             </div>
+         )}
      </div>
  )}
```

`handleNavClick` is already defined in `MobileLayoutClient` — it sets the optimistic path and fires `router.push`, giving the same transition behaviour as tab clicks.

### Remove `<FormFooter>` from the three list pages

```diff
  // expense/page.tsx, request/page.tsx, report/page.tsx — same change in all three

- import { FormFooter } from "@/components/shared/FormFooter";
  ...
  return (
      <>
          <div className="flex-1 bg-white rounded-2xl flex flex-col">
              {inner}
          </div>
-         <FormFooter
-             label="New Store ..."
-             onSubmit={() => navigation.push(url("...add"))}
-         />
      </>
  );
```

The wrapper `<>...</>` can become a plain `<div>` or be removed depending on what the page returns now.

> **`FormFooter` is not deleted** — it's still used by add/edit form pages where the button needs `isLoading`, `disabled`, and a real submit handler. It just no longer owns the list-page CTAs.

> **Scroll padding** — `scrollPaddingBottom` is already `pb-32` for routes with `headerAction: "add"`, which covers the footer CTA height. No change needed.

---

## Part C — Persistent SWR cache (optional, separate pass)

SWR's default in-memory cache is wiped on every page reload. Adding a `localStorage`-backed cache provider makes `useStores` (and any other key) return stale data immediately on reload, then revalidate in the background.

### Create `apps/seller/lib/swr-cache-provider.ts`

```ts
export function localStorageCacheProvider() {
    const map = new Map<string, unknown>(
        JSON.parse(localStorage.getItem("swr-cache") ?? "[]"),
    );

    window.addEventListener("beforeunload", () => {
        localStorage.setItem("swr-cache", JSON.stringify(Array.from(map.entries())));
    });

    return map;
}
```

### Wire into `apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx`

```tsx
import { SWRConfig } from "swr";
import { localStorageCacheProvider } from "@/lib/swr-cache-provider";

<SWRConfig value={{ provider: localStorageCacheProvider }}>
    ...existing shell...
</SWRConfig>
```

> **Scope:** Caches every SWR key under the mobile shell. All low-churn data; stale-while-revalidate is fine. If a key must never be served stale, add `revalidateOnMount: true` on that specific hook.

---

## Execution Order

1. Apply Part A — remove `storesReady` from `MobileFooterNav` and `MobileLayoutClient`
2. Apply Part B — make `MobileLayout` async, add `hasInitialUser` prop, seed `shellReady`, refactor to overlay pattern
3. Apply Part D — add `footerCta` to `RouteConfig` and the three routes, render from `MobileLayoutClient`, remove `<FormFooter>` from list pages
4. Run `pnpm build --filter @tea-pos/seller` — fix any TS errors
5. Test:
   - Returning user (cookie present) → no loader, header/footer/CTA all instant
   - New/expired session → loader shows, lifts to reveal app already behind it, no pop-in
   - Auth failure → auth error overlay appears after shell renders
   - Expense / request / report list pages → footer CTA visible on first paint, before list data loads
   - Expense / request / report add pages → `FormFooter` submit button still works normally
6. If doing Part C: implement cache provider, test stale-while-revalidate on reload

---

## Session Start — Read These First

```
apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx   — main file, touches Parts A B D
apps/seller/app/[tenantSlug]/mobile/components/MobileFooterNav.tsx      — Part A
apps/seller/app/[tenantSlug]/mobile/layout.tsx                          — Part B (making async)
apps/seller/app/[tenantSlug]/mobile/config/navigation.ts                — Part D (adding footerCta)
apps/seller/components/shared/FormFooter.tsx                            — understand slot pattern before removing usages
apps/seller/app/[tenantSlug]/mobile/home/manage/expense/page.tsx        — Part D removal
apps/seller/app/[tenantSlug]/mobile/home/manage/request/page.tsx        — Part D removal
apps/seller/app/[tenantSlug]/mobile/home/manage/report/page.tsx         — Part D removal
apps/seller/app/layout.tsx                                              — confirm x-user-info cookie name before Part B
```

---

## Open Questions

**1. `scrollPaddingBottom` doesn't account for `footerCta`-only routes**
Currently derived as:
```tsx
const scrollPaddingBottom = hasHeaderAction ? "pb-32" : "pb-28";
```
All three current `footerCta` routes also have `headerAction: "add"`, so they already get `pb-32` and the CTA button won't overlap content. But if `footerCta` is ever added to a route without `headerAction`, the `pb-28` padding won't clear the button. Consider updating to:
```tsx
const scrollPaddingBottom = (hasHeaderAction || !!currentRoute?.footerCta) ? "pb-32" : "pb-28";
```
— or just leave it and rely on the convention that `footerCta` always pairs with `headerAction`.

**2. `pb-8` bottom padding on the static CTA button**
The static CTA is styled to match `FormFooter` exactly (`p-4 pb-8`). Confirm this looks correct on non-iPhone Android devices — `FormFooter` always applies `pb-8` unconditionally so we're matching existing behaviour, but worth a visual check on both form factors.

**3. Async `MobileLayout` overhead**
Making `MobileLayout` async to read the cookie adds a trivial SSR cost. Confirm it doesn't interfere with any of the existing providers (`StoreProvider`, `FlagsProvider`, etc.) wrapping `MobileLayoutClient` — those are client components and should be unaffected.

**4. Children rendering while content data is loading (Part B)**
After the overlay fix, `children` only renders when `shellReady=true`, but store/session data may not be loaded yet. Verify the manage sub-pages (`expense`, `request`, `report`, `open`, `close`) handle `selectedStoreId = null` gracefully — they all go through `useStore()` which should return null safely, but worth a quick check.

---

## What NOT to change

- `useStores()` call in `MobileLayoutClient` — still needed for `StoreContext` / `StorePickerDrawer`
- The loader JSX content — intentional design, just moves from early return to overlay
- The `useEffect(() => { if (user) setShellReady(true) })` — still needed for new sessions
- `useSession`'s `refreshInterval: 5000` — intentional; `mutate` handles your own actions instantly, polling detects changes from other users on other devices
- `--mobile-footer-h` CSS variable and scroll padding classes — correct as-is
- `FormFooter` component itself — still needed for add/edit form pages with dynamic submit state
