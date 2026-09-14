# Task 064 — The store the app opens on

**Status: written 2026-09-14, not built.** Opened after the owner reported having
to set `user_store_assignments.is_default` by hand in the Supabase UI every time
a seller picked up a new device. That has been the workaround for months.

Two pieces, and they are worth keeping separate because the first is a bug fix
that stands alone and the second is a feature that depends on it:

| Phase | What | Needs |
| --- | --- | --- |
| **1 — the floor** | The chain never ends in nothing | 3 lines in `StoreContext` |
| **2 — the memory** | The picked store is remembered, and follows the user across devices | service + route + api client + a precedence change |

---

## The bug

`StoreContext.tsx:132-143` resolves the selected store through a chain: cookie →
localStorage → `is_default` → **nothing**.

```ts
if (defaultStoreId) { persistStoreId(defaultStoreId); return defaultStoreId; }
return selectedStoreId;   // ""
```

A user with store assignments but no row marked `is_default` falls off the end
and keeps `""`. So `selectedStore` is `null`, and `MobileLayoutClient.tsx:85`
renders the header accessory only when it is not:

```tsx
titleAccessory={ selectedStore ? <button onClick={() => setIsPickerOpen(true)}>…</button> : null }
```

**That button is the only way to open the picker.** No store means no button
means no picker, so the device cannot fix itself and someone has to open
Supabase. That is the actual defect — not that the wrong store is chosen, but
that the screen offering the choice is behind the choice having already been
made.

Everything downstream takes `""` quietly: `useSession("")`, flags evaluated
without a `storeId` person property, orders scoped to nothing. The app boots
normally — `shellReady` gates on `storesData !== undefined`, not on a store — so
it looks fine and does nothing.

It reproduces on every new device because the cookie and localStorage are both
per-device, leaving `is_default` as the only durable rung, and nothing in the
live codebase ever writes it.

## What `is_default` means

It means **the store this user's app opens on**. User-owned, written by the
picker, one per user.

That is a reframe, so here is why it is allowed rather than a hijacking of an
admin column:

- **Nothing in the live apps writes it.** Every write path is in `apps/admin`,
  which is archived, excluded from the workspace, and broken.
- **It has exactly one live reader**, `StoreContext.tsx:75` — the line this task
  changes.
- **The other two consumers of the table do not read it.** `orders.ts:150` and
  `payments/qris/route.ts:63` both `select("id")` as an existence check — *is
  this user assigned to this store*. Repurposing the column cannot affect order
  creation or QRIS payments. This was the main risk and it is clear.

So the column has no incumbent meaning to protect. A new `users.last_store_id`
column was considered and rejected: it would need a migration, and it would need
the proxy to carry the value, where `is_default` is already on the boot path for
free — `/api/stores` returns `assignments`, the layout seeds it into SWR through
`BootFallback`, and `StoreContext:72-79` already computes `defaultStoreId` from
it. The read path for Phase 2 therefore costs nothing and needs no new query
anywhere.

**Scope is per tenant, not global.** The rows carry `user_id, store_id,
is_default` and no `tenant_id`, so every write must reach the tenant through
`stores.tenant_id`. No user is assigned across two tenants today; the write is
scoped anyway, because the cost is one subquery and the alternative is a bug
that appears years later with no clue attached to it.

---

## Do this

### Phase 1 — the chain ends in a store

In `resolvedStoreId`, after the `defaultStoreId` branch, fall back to the first
assigned store and persist it.

Prefer an `active` one. The picker hides `fake` and `inactive` stores unless the
user turns them back on (`StorePickerDrawer`, `hideInactiveStores` defaults to
true), so landing on one selects a store the user cannot see selected — a
stranger state than the one being fixed.

This is the floor, and it stays useful after Phase 2: on the day Phase 2 ships
every existing user still has no `is_default` row, so something has to answer
before the memory has anything in it.

### Phase 2 — the picker writes it down

**Service.** `setDefaultStore(supabase, { tenantId, userId, storeId })` in
`packages/services/stores.ts`. Two statements:

```
1. is_default = false  where user_id = :user
                       and store_id in (select id from stores where tenant_id = :tenant)
                       and is_default
2. is_default = true   where user_id = :user and store_id = :store
```

**Route.** `PUT /api/stores/default`. Validate that the store is in the caller's
assignments *and* in the tenant from the cookie — the same guard
`payments/qris/route.ts:55-69` already applies, and the reason CLAUDE.md forbids
taking a store id from a request body on trust.

**Api client + call site.** `storesApi.setDefault(storeId)`, called from
`setSelectedStoreId` in `StoreContext`.

**Precedence flips, and this is the part that is easy to miss.** Today a valid
cookie returns before `defaultStoreId` is ever consulted, so a device that
already has a cookie would never see another device's pick. Sync exists only if
the DB value outranks the cookie on load. The cookie then demotes to what the
`locale` cookie is: a cache so the server render agrees with the client, rewritten
whenever the resolved store changes.

Without this change Phase 2 writes a column that nothing reads on any device
that has been used once. It is not optional.

## Decisions

**No migration.** Not for the column — `is_default` already exists and is free.
Not for atomicity either; see below.

**No `unique (user_id) where is_default` index**, though it is the obvious
safety net. It would be correct today and wrong the moment a second tenant
exists, because the rows carry no `tenant_id` and the intended rule is one
default *per user per tenant*. An index that encodes a rule the system does not
hold is worse than no index: it fails a legitimate write, in production, years
from now. Denormalising `tenant_id` onto the row to make it expressible is a
larger change than this task earns.

**Two statements, not an RPC.** The write is briefly non-atomic: between them the
user has zero defaults. A second device booting inside that window falls through
to Phase 1's floor, shows a valid store, and corrects itself on the next load —
the blast radius is one device, one boot, no data touched. That does not justify
a migration.

`transfer_store_session` is the precedent for doing this properly, and if the
window ever bites, the upgrade is a `set_default_store(p_user_id, p_store_id,
p_tenant_id)` function doing it in one statement:

```sql
update user_store_assignments
   set is_default = (store_id = p_store_id)
 where user_id = p_user_id
   and store_id in (select id from stores where tenant_id = p_tenant_id);
```

That expression is the reason an RPC is the tidy answer — supabase-js cannot set
a column to a computed expression, which is the only reason this is two
statements rather than one. Written down here so the next person does not
rediscover it.

**A failed write must be visible.** Once the DB outranks the cookie, a PATCH that
does not land means the next navigation silently restores the old store — and a
seller can ring up cups against the wrong shop without ever seeing a wrong thing
on screen. Close the drawer immediately, write in the background, and on failure
revert the local selection and surface it through `ErrorSheetContext`. The snap
back is the feedback.

**Not logged.** No `ActivityLogType` fits, and a display preference does not earn
a new enum value.

## What this changes for the user, and what it does not

- A new device opens on the store the user last picked, on any other device.
- It is **last-write-wins on next request, not live sync.** A device sitting open
  does not change when you pick elsewhere; it changes on its next load.
- **Per-device stores stop being possible.** Today device A can sit on Store X
  while device B sits on Store Y, because cookies are per-device. This removes
  that. Accepted deliberately by the owner — the multi-device case here is one
  person with two phones, not two people.

## Verification

1. A user with no `is_default` row, on a fresh browser profile: the store name
   appears in the header and the picker opens. This is the months-old bug and
   Phase 1 alone fixes it.
2. Pick a store on device A, then cold-open device B: B opens on it.
3. Pick on B, reload A: A follows.
4. With a store assigned in a second tenant — if one ever exists — picking in
   tenant A leaves tenant B's default alone.
5. Break the route (return 500) and pick a store: the selection visibly reverts
   and an error sheet appears.

## Not in scope

- Denormalising `tenant_id` onto `user_store_assignments`.
- A backoffice screen for managing store assignments. If one is ever built with
  a "default store" control, it will fight the seller's picker for this column —
  revisit then, and read this file first.
- Reviving `apps/admin`'s assignment routes, which still write `is_default` with
  the old meaning.
