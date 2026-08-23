# Task 054 — SSR the feature flags

**Status: designed, not built.** Opened 2026-08-23. Same pattern as task 053 —
work the server already does, thrown away and redone on the client — but smaller,
and with one caveat the owner explicitly attached: *do it only if it does not
change behaviour.* That caveat is the point of this file.

---

## The problem

`lib/context/FlagsContext.tsx:30` fetches `/api/flags` over SWR after hydration.
The route evaluates every flag server-side in one PostHog call, so the work is
already happening on a server — just a second one, a round trip later.

Unlike the store list in 053, this does **not** gate `shellReady`, so it is not on
the boot critical path. The win is smaller and is mostly about correctness.

## The behaviour this would actually change

`DEFAULT_FLAGS` (`FlagsContext.tsx:7-15`) is all-false and is passed as
`fallbackData`. That means **between hydration and the flags landing, every
gated feature renders as disabled.** Two consequences:

- **Good:** all-false is fail-closed, matching the documented behaviour of
  `isFlagEnabled`. Any replacement must preserve this exactly — on evaluation
  failure, SSR must emit all-false, never a partial or stale set.
- **Bad, and the real argument for this task:**
  `MobileLayoutClient.tsx:129` gates the full-screen maintenance overlay on
  `isMaintenanceEnabled`. Because it starts false, a device in maintenance mode
  currently shows the **app** for one round trip before the overlay appears.
  SSR'ing the flags closes that window.

So the honest framing: this is a small correctness fix that also happens to
remove a fetch, not a performance task.

## The complication

The SWR key is `["flags", selectedStoreId]`, and `selectedStoreId` comes from
`StoreContext` — which depends on the store list. So a server render cannot know
the selected store until task 053 supplies the stores.

**This task depends on 053.** Once the layout has the store list, it also has the
user's default store (`user_store_assignments.is_default`) and can evaluate flags
against the same `{ role, tenantId, storeId }` person properties the route uses.

Store switching still refetches client-side, unchanged. Only the first evaluation
moves to the server.

## Risks

- **Fail-closed must survive.** If PostHog errors during SSR, emit `DEFAULT_FLAGS`.
  A cached or partial set on failure would be worse than today.
- **Do not cache flags across users.** Person properties include `role` and
  `storeId`. If any caching is added here, key on all three properties — or
  simply do not cache, since it is one call already being made.
- Per-route hard gates (`isFlagEnabled` inside individual API routes) are
  unaffected and must stay. This changes the client's initial value only.

## Seller-only — verified 2026-08-23

Backoffice has no `FlagsContext` and no maintenance overlay; it uses the legacy
env flags (`packages/features/shared/features.ts`). Nothing to mirror.

## Work list

- [ ] Land task 053 first — this needs the default store id
- [ ] Evaluate flags in `app/[tenantSlug]/mobile/layout.tsx`, fail-closed on error
- [ ] Pass through as SWR `fallbackData` for `["flags", defaultStoreId]`
- [ ] Verify maintenance mode shows the overlay with no app flash
- [ ] Verify a PostHog outage still disables everything

---

## Built 2026-08-23

- `evaluateFlagSet(userId, properties)` added to `apps/seller/lib/flags.ts` and
  `GET /api/flags` rewritten to call it. The route and the layout now produce the
  same object from the same evaluation; duplicating that mapping would have shown
  up as flags flipping shortly after boot.
- The layout evaluates flags with `{ role, tenantId, storeId }` and seeds SWR
  through `BootFallback`. Fails to `null`, which falls through to the client
  fetch, and `evaluateFlagSet` is fail-closed by construction because
  `getAllFlags` returns `DISABLED` on any error.
- `StoresFallback` from task 053 became `BootFallback`, carrying both entries.
  The flags key is an array, so it goes through `unstable_serialize`; the stores
  key is a plain string SWR uses as-is. Getting either wrong is silent — the
  seeded entry is simply never read and the client fetches as before.

The store id the flag key is built from is resolved server-side by logic that
mirrors `resolvedStoreId` in `StoreContext`. Deliberately duplicated: that one is
a client hook chain and this has to run before any of it exists.

**Not verified at runtime.** In particular, nobody has confirmed that a tenant in
maintenance mode now shows the overlay with no flash of the app — which is the
behaviour this task was really for.
