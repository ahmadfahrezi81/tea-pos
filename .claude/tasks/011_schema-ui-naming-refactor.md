# Task 011 — Schema & UI Naming Refactor (Post-Table-Rename Cleanup)

## Goal

Two things in one pass:

1. **Remove the alias workaround** in `orders.ts` and update the orders Zod schema + UI to use the new join key names (`storeOrderItems`, `tenantProducts`, `users`).
2. **Rename `profiles` → `users` end-to-end** across services, feature schemas, API routes, API clients, and hooks — because `profiles` was the old table name and `users` is the correct concept now. This includes renaming files and folders.

> **Status: READY TO EXECUTE — Task 010 is complete.**

---

## Part A — Orders Schema & UI (alias workaround removal)

### `packages/services/orders.ts`
Remove alias, use honest names:
```ts
// remove this:
`*, stores(name), profiles:users(full_name), order_items:store_order_items(*, products:tenant_products(name))`
// replace with:
`*, stores(name), users(full_name), store_order_items(*, tenant_products(name))`
```

### `packages/features/orders/schema.ts`
`OrderItemResponse`:
- `products: z.object({ name })` → `tenantProducts: z.object({ name })`

`OrderResponse`:
- `profiles: z.object({ fullName })` → `users: z.object({ fullName })`
- `orderItems: z.array(OrderItemResponse)` → `storeOrderItems: z.array(OrderItemResponse)`

### `apps/seller/app/[tenantSlug]/mobile/orders/_components/MobileOrders.tsx`
- `order.profiles?.fullName` → `order.users?.fullName`
- `order.orderItems` (all occurrences) → `order.storeOrderItems`
- `item.products?.name` → `item.tenantProducts?.name`

---

## Part B — `profiles` → `users` Full Rename

### Files to rename / move

| Current | New |
|---|---|
| `packages/services/profiles.ts` | `packages/services/users.ts` |
| `packages/features/profiles/schema.ts` | `packages/features/users/schema.ts` |
| `packages/features/profiles/openapi.ts` | `packages/features/users/openapi.ts` |
| `apps/seller/app/api/profiles/route.ts` | `apps/seller/app/api/users/route.ts` |
| `apps/seller/lib/api/profiles.ts` | `apps/seller/lib/api/users.ts` |
| `apps/seller/lib/hooks/profile/useProfile.ts` | `apps/seller/lib/hooks/user/useCurrentUser.ts` |

### Exports to rename

| Current | New |
|---|---|
| `getProfile()` | `getUser()` |
| `ProfileResponse` | `UserResponse` |
| `ProfileListResponse` | `UserListResponse` |
| `CreateProfileInput` | `CreateUserInput` |
| `UpdateProfileInput` | `UpdateUserInput` |
| `ListProfilesQuery` | `ListUsersQuery` |
| `Profile` (type) | `User` (type) |
| `profilesApi` | `usersApi` |
| `useProfile()` | `useCurrentUser()` |

### API route path
`/api/profiles` → `/api/users`

Update `apps/seller/app/unauthorized/page.tsx` which hardcodes `fetch("/api/profiles", ...)`.

### `packages/features/shared/schemas-index.ts`
`export * from "../profiles/schema"` → `export * from "../users/schema"`

### `packages/features/shared/types.ts`
- `profiles: { ... }` block → `users: { ... }`
- `order_items: { ... }` block → `store_order_items: { ... }`
- `export type Product = Database["public"]["Tables"]["products"]["Row"]` → `tenant_products`
- `export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"]` → `store_order_items`
- `export type Profile = Database["public"]["Tables"]["profiles"]["Row"]` → rename to `User`, point at `users`

### `packages/features/stores/user-assignments-schema.ts`
Line 247: `profiles: z.object(...)` → `users: z.object(...)`

### `packages/features/tenants/user-assignments-schema.ts`
Line 81: `profiles: z.object(...)` → `users: z.object(...)`

### `apps/seller/lib/context/AuthContext.tsx`
- Import `User`, `UserResponse` from new path
- `fetchProfile` → `fetchUser`
- Context type: `profile: Profile | null` → `profile: User | null` (keep the exported key as `profile` — renaming it to `user` would cascade to 15+ components with no clarity gain)
- `mutate: () => Promise<Profile | ...>` → `User`

### `packages/services/customer-feedbacks.ts`
- Local variable `const profile = row.users` → rename to `const user = row.users` for clarity

---

## Part C — What NOT to rename

| Item | Why |
|---|---|
| `AccountProfile.tsx`, `MobileProfile.tsx` component filenames | UI concepts (profile page/section), not DB entities — fine as-is |
| `{ profile } = useAuth()` in all UI components | Exported context key stays `profile` — renaming cascades to 15+ files with no clarity gain |
| `packages/features/products/`, `packages/services/products.ts` | Domain name is "products"; `tenant_` prefix is a DB detail |
| `packages/features/orders/`, `packages/services/orders.ts` | Same reasoning |
| `packages/features/tenants/invites-schema.ts` | `tenant_invites` table was dropped — check if this schema is even used, may just delete it |

---

## Execution Order

1. Rename files/folders first (git mv so history is preserved)
2. Update all imports that reference old paths
3. Rename exports inside the moved files
4. Update `orders/schema.ts` and `MobileOrders.tsx` (Part A)
5. Update `shared/types.ts`, `shared/schemas-index.ts`
6. Update `stores/user-assignments-schema.ts`, `tenants/user-assignments-schema.ts`
7. Update API route path (`/api/profiles` → `/api/users`) and `unauthorized/page.tsx`
8. Run `pnpm build --filter @tea-pos/seller` — fix all TS errors
9. Test: orders page, profile/account page, login flow

---

## Audit Greps (run before starting)

```bash
# Confirm full profiles scope
grep -rn "profiles\|Profile\b" packages/ apps/seller --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | grep -v "packages/db/types.ts"

# Confirm orders join field scope
grep -rn "orderItems\|order\.profiles\|item\.products" apps/seller --include="*.tsx" --include="*.ts" | grep -v node_modules
```

---

## Open Questions / Concerns

**1. `invites-schema.ts` — safe to delete?**
`packages/features/shared/schemas-index.ts` re-exports it (`export * from "../tenants/invites-schema"`). The underlying `tenant_invites` table was dropped in task 010. Check if any UI or route actually imports types from this schema before deleting. If nothing imports it directly, delete both the file and the re-export line.

**2. `shared/types.ts` stale aliases will cause immediate TS errors**
This file has `export type Profile = Database["public"]["Tables"]["profiles"]["Row"]` and similar for `products`, `order_items` — all pointing at old table names that no longer exist in `packages/db/types.ts`. Fix these early in the session or the TS build will fail from the start.

**3. Confirm: keep exported `profile` key in `useAuth()`**
The context exports `{ profile, avatarUrl, isLoading, mutate }`. We are NOT renaming `profile` → `user` here because it cascades to 15+ UI components. Confirm this decision holds before starting, or scope it in explicitly.

**4. `MobilePersonalDetails.tsx` imports `useProfile` directly**
This is the only UI component that imports `useProfile` from the hook (not via `useAuth`). It will break when the hook file moves. Easy fix — update the import path — just don't miss it.

**5. `unauthorized/page.tsx` hardcodes `/api/profiles`**
Line 28: `fetch("/api/profiles", ...)`. Must be updated to `/api/users` alongside the route rename. This file is outside the normal hook/api-client pattern so easy to miss in a grep.

---

## Session Start — Read These First

Before writing a single line, read these files to understand current state:

```
packages/features/profiles/schema.ts       — full Profile schema, all exports
packages/features/orders/schema.ts         — OrderResponse shape (Part A target)
packages/features/shared/types.ts          — stale type aliases, needs full read
packages/features/shared/schemas-index.ts  — what gets re-exported
apps/seller/lib/context/AuthContext.tsx    — how Profile type flows into the app
apps/seller/lib/hooks/profile/useProfile.ts
apps/seller/lib/api/profiles.ts
packages/services/profiles.ts
```

Then run these greps to confirm nothing was missed:

```bash
# All profile/Profile references
grep -rn "profiles\|Profile\b" packages/ apps/seller --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next" | grep -v "packages/db/types.ts"

# All import paths that will break on file rename
grep -rn "from.*profiles\|from.*useProfile\|from.*profilesApi" apps/seller --include="*.ts" --include="*.tsx" | grep -v node_modules

# Orders join field references in UI
grep -rn "orderItems\|order\.profiles\|item\.products\b" apps/seller --include="*.tsx" --include="*.ts" | grep -v node_modules
```

---

## Notes

- Use `git mv` for file/folder renames so git history is preserved
- After this task: zero occurrences of `profiles` anywhere except user-facing UI text like "Profile Header" — those are fine
- The alias workaround in `packages/services/orders.ts` is currently keeping the orders page working — do not remove it until the orders schema + UI are updated in the same pass
- Run `pnpm build --filter @tea-pos/seller` after completing all changes before committing
