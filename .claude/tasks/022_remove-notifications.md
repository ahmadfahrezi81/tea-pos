# Remove Notification System + Unused Code

**Status:** Pending approval before deletion

---

## 1. Notification System (full removal)

### Files to delete

**Seller app — API routes**
- `apps/seller/app/api/notifications/route.ts`
- `apps/seller/app/api/notifications/[id]/read/route.ts`
- `apps/seller/app/api/cron/weather/notify/route.ts`

**Seller app — UI pages**
- `apps/seller/app/[tenantSlug]/mobile/notifications/` (entire directory)
  - `page.tsx`
  - `[id]/weather/page.tsx`

**Seller app — API client + hook**
- `apps/seller/lib/api/notifications.ts`
- `apps/seller/lib/hooks/notifications/useNotifications.ts`

**Packages**
- `packages/services/notifications.ts`
- `packages/features/notifications/schema.ts`
- `packages/features/notifications/openapi.ts`

### Files to edit (remove references)

- `packages/features/shared/schemas-index.ts` — remove `export * from "../notifications/schema";`
- `apps/seller/app/[tenantSlug]/mobile/config/navigation.ts` — remove `/mobile/notifications`, `/mobile/notifications/*`, `/mobile/notifications/*/weather` route entries + bottom nav entry
- `apps/seller/app/[tenantSlug]/mobile/components/MobileLayoutClient.tsx` — remove `router.prefetch(url("/mobile/notifications"))`
- `apps/seller/app/[tenantSlug]/mobile/account/_components/AccountProfile.tsx` — remove disabled notifications `<SettingsRow>` + `Bell` icon import

### DB — tables to drop

```bash
supabase migration new drop_notification_tables
```
```sql
drop table if exists notification_reads;
drop table if exists notification_events;
```
Then: `pnpm types:db`

---

## 2. Tasks page (unused stub)

### Files to delete
- `apps/seller/app/[tenantSlug]/mobile/tasks/` (entire directory)
  - `page.tsx` — hardcoded mock, links to non-existent routes
  - `_components/TasksProgressBar.tsx`

No nav entry exists for tasks, no other file imports from it.

---

## 3. Unused shared component

- `apps/seller/components/shared/ConfirmationPopup.tsx` — imported nowhere, 0 usages

---

## Order of execution

1. Delete notification files + edit references
2. Create + run DB migration
3. `pnpm types:db`
4. Delete tasks page
5. Delete ConfirmationPopup
6. `npx tsc --noEmit` to verify clean
