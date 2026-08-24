# Task 055 — Delete the migration scaffolding in tenant.ts

**Status: trivial, not done.** Opened 2026-08-23.

`packages/utils/server-config/tenant.ts` opens with 50 lines of
commented-out migration code — a hardcoded `MIGRATION_TENANT_ID`, a stub
`getCurrentTenantId`, a `validateTenantId` helper, and a `MIGRATION_MODE` flag.
All dead. The live implementation begins below it.

Costs nothing at runtime. Costs every person who opens the file, which is a file
on the tenant-resolution path and therefore one people open often — and a
hardcoded tenant UUID sitting in a comment invites exactly one bad afternoon.

## Work list

- [ ] Delete lines 1-50 (the live implementation starts at the `// lib/tenant.ts`
      header on line 51)
- [ ] Delete `getTenantIdOrFallback` and `validateTenantAccess` as well.
      **Verified 2026-08-23: neither has a single caller anywhere in `apps/` or
      `packages/`.** `getTenantIdOrFallback` exists "for migration/testing" by its
      own docstring and would silently paper over a missing tenant cookie, so it
      is worth removing rather than leaving loaded.

No behaviour change either way. Not worth its own commit — fold into whichever
task touches this area next.

---

## Done 2026-08-23

Removed the 50-line comment block, plus `getTenantIdOrFallback` and
`validateTenantAccess`, neither of which had a caller. Also dropped the `//
lib/tenant.ts` header, which named a path this file has not lived at for some
time.

`getCurrentTenantId` is now the whole file. Both apps build.
