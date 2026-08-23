# Task 053 — SSR the store list so the shell is ready on first paint

**Status: designed, not built.** Opened 2026-08-23 alongside task 052. Split out
because it is independent of the splash work and probably worth more: 052 hides
the wait, this one shortens it.

---

## The problem

`apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx:36`:

```ts
if (!shellReady && user && storesData !== undefined) {
    setShellReady(true);
}
```

`storesData` comes from `useStores()` (`lib/hooks/stores/useStores.ts`), a client
SWR fetch against `/api/stores`. A client fetch cannot begin until hydration
finishes. So the boot loader is held up for, in order:

1. TTFB on the document
2. JS bundle download
3. Parse and execute
4. React hydration
5. **A full HTTP round trip to `/api/stores`**

Step 5 is pure waste. `app/api/stores/route.ts` does nothing the layout could not
do itself — it resolves the tenant from the cookie, takes the user from
`getRequestUser()`, and calls `listUserStores(supabase, { tenantId, userId })`.
Every input is available in `MobileLayout` at render time.

## The fix

Call `listUserStores` in `app/[tenantSlug]/mobile/layout.tsx` and hand the result
to SWR as `fallbackData`, so `useStores()` returns populated on its first render
and `shellReady` is true on first paint.

`useStores` uses the static key `"stores-all"`, so the cleanest injection is a
client `SWRConfig` wrapper inside the layout:

```tsx
<SWRConfig value={{ fallback: { "stores-all": stores } }}>
```

The hook itself does not change, and SWR still revalidates in the background, so
staleness behaves exactly as it does today.

---

## The trap — read before implementing

**Do not add an uncached DB read to `MobileLayout`.** The existing comment above
`cachedPayFrequency` in that file records why:

> *this layout wraps every mobile screen **and** every prefetch of one: uncached,
> a single boot pays for this read a dozen times over, on the critical path each
> time*

`app/[tenantSlug]/mobile/config/navigation.ts` marks **six** routes `prefetch: true` (lines 21, 27, 33, 39, 46, 51), so a naive implementation
turns one query into many. The store list is per-user, so it cannot reuse the
tenant-wide caching that pay frequency gets.

Options, in preference order:

1. `unstable_cache` keyed on `["user-stores", tenantId, userId]` with a short TTL
   (30-60s). Store assignments change rarely; the cost of staleness is one stale
   entry in the store picker until the SWR revalidation lands.
2. React `cache()` for request-level dedupe only. Safe, but does nothing for
   prefetches, which are separate requests — so it does not solve the actual
   problem.

Option 1 is the intended approach. Confirm the invalidation story: if a store
assignment changes in backoffice, that is a **separate deployment with its own
cache**, exactly as noted for pay frequency, so TTL rather than `revalidateTag`.

## Risks

- **Cache key must include `userId`.** A key scoped only to the tenant would
  serve one user's store list to another. This is the one way to get this wrong
  that actually matters.
- The layout must degrade the way pay frequency does — swallow the error, fall
  back to letting the client fetch. Taking orders must not depend on this
  optimization succeeding.

## Work list

- [ ] Cached `listUserStores` wrapper in `app/[tenantSlug]/mobile/layout.tsx`,
      keyed on tenant **and** user
- [ ] `SWRConfig` fallback for `"stores-all"`
- [ ] Confirm `shellReady` flips on first paint (no loader flash at all on a warm
      cache)
- [ ] Confirm failure path still boots via the client fetch
- [ ] Version bump plus patch notes

## Backoffice does not need this — verified 2026-08-23

Its gate is `if (!shellReady && user)`
(`apps/backoffice/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx:28`)
— user only, no store list. Backoffice already flips ready without waiting on a
fetch, so this task is **seller-only**.

## Note

`/api/stores` stays. It is still the revalidation endpoint for SWR and is used
elsewhere; this only removes it from the **boot critical path**.

---

## Built 2026-08-23 — and what the plan above missed

Implemented, but the scope was wider than this file described, because the plan
had a crash in it.

### The bug the plan would have shipped

`StoreContext.tsx` resolves the selected store in a `useMemo` that opens with
`if (!storesData) return selectedStoreId;`. That guard is the only reason the
memo's `localStorage.setItem` never runs during SSR — today `storesData` is
always `undefined` on the server, because nothing fetches it there.

Seeding SWR removes that guard. `storesData` becomes populated during SSR, the
memo runs to completion, and `localStorage.setItem` executes on the server:
`ReferenceError: localStorage is not defined`, on every mobile route. The
optimization and the crash are the same line of code.

### The second problem underneath it

Guarding the write is not enough. With the store list present on the server, the
server resolves a selected store and renders its name in the header — while the
browser's first render resolves from `localStorage`, which the server cannot see.
For anyone whose chosen store is not their default, those disagree: a hydration
mismatch on the header, and a frame of data fetched against the wrong store.

That mismatch already existed in latent form; SSR is what makes it visible.

### What shipped

- `lib/context/StoresFallback.tsx` (new) — seeds the SWR cache via
  `SWRConfig.fallback`, **not** the hook's `fallbackData`. `fallbackData` is
  per-hook and never reaches the shared cache, and `useStores()` has two callers
  — `StoreProvider` and `MobileLayoutClient`, which is the one that gates the
  loader. Only a cache entry satisfies both.
- `cachedUserStores` in the mobile layout — `unstable_cache`, 60s, keyed
  `["user-stores", tenantId, userId]`. Runs in `Promise.all` with the existing
  pay-frequency read, and fails to `null` the same way, falling through to the
  client fetch.
- **Selected store now mirrors into a `selectedStoreId` cookie**, so the server
  can resolve the same store the browser last used. localStorage is still
  written and is still what people carry between sessions; the cookie exists
  only so the first render agrees. Matches the `locale` cookie precedent in
  `LanguageContext.tsx:32`.
- A one-time migration effect adopts an existing localStorage value for users
  who predate the cookie — without it, a multi-store seller would silently be
  moved to their default store on the first boot after this ships.

### Verification

`tsc --noEmit` clean, `next build` compiled, `eslint` clean on all three files
(the one remaining warning in `StoreContext.tsx` is pre-existing).

**Not verified at runtime.** Nobody has yet loaded the built app with a real
session and confirmed the loader is absent from the SSR HTML. That is the check
that actually proves this task, and it has not been done.
