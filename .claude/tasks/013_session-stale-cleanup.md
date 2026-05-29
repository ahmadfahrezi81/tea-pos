# Task 013 — Stale Session Cleanup (pg_cron)

## Goal

If a seller forgets to close the day, the active session from that day stays `status: "active"` in `store_sessions` indefinitely. The next morning when someone tries to open the store, `openStore()` inserts a new session which hits the partial unique index (one active session per store) and throws "Failed to create session". The store is completely blocked until an admin intervenes.

**The fix:** two `pg_cron` jobs that run inside Supabase at midnight and 5am WIB to end any active sessions whose summary date is before today. Summaries are left unclosed intentionally — sellers or admins can close them later from the analytics page. Payroll is not auto-calculated for forgotten days.

> **Status: READY TO EXECUTE**

---

## What pg_cron is

`pg_cron` is a PostgreSQL extension that runs scheduled SQL jobs directly inside the database. Supabase ships it pre-installed — you just enable it in the dashboard (Database → Extensions → search "pg_cron" → enable). Once on, you register jobs with `cron.schedule()` and Postgres runs them on the schedule. No external server, no Edge Function, no Lambda.

---

## Part A — Migration file

Migration file already created at:
```
supabase/migrations/20260529155501_enable_pg_cron_stale_session_cleanup.sql
```

Write the following SQL into it:

```sql
-- Enable pg_cron (if not already enabled via dashboard)
-- Note: on Supabase hosted projects, pg_cron also needs to be enabled in the
-- dashboard (Database → Extensions) before this migration runs. The line below
-- handles it in code but Supabase's extension system may require the dashboard
-- step first. Safe to have both.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: midnight WIB (00:00 WIB = 17:00 UTC)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'end-stale-sessions-midnight') THEN
        PERFORM cron.schedule(
            'end-stale-sessions-midnight',
            '0 17 * * *',
            $job$
            UPDATE store_sessions
            SET status = 'ended', ended_at = NOW()
            WHERE status = 'active'
            AND daily_summary_id IN (
                SELECT id FROM store_daily_summaries
                WHERE date < (NOW() + INTERVAL '7 hours')::date
            );
            $job$
        );
    END IF;
END $$;

-- Job 2: 5am WIB (05:00 WIB = 22:00 UTC) — safety net before stores open
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'end-stale-sessions-morning') THEN
        PERFORM cron.schedule(
            'end-stale-sessions-morning',
            '0 22 * * *',
            $job$
            UPDATE store_sessions
            SET status = 'ended', ended_at = NOW()
            WHERE status = 'active'
            AND daily_summary_id IN (
                SELECT id FROM store_daily_summaries
                WHERE date < (NOW() + INTERVAL '7 hours')::date
            );
            $job$
        );
    END IF;
END $$;
```

`cron.schedule()` is not idempotent by default — running the migration twice (or resetting and re-pushing) would try to insert duplicate job names and error. The `IF NOT EXISTS` guard makes it safe to re-run.

After pushing the migration, verify in the SQL editor:
```sql
-- Jobs registered
SELECT jobid, schedule, command, jobname FROM cron.job;
```

To unschedule if needed:
```sql
SELECT cron.unschedule('end-stale-sessions-midnight');
SELECT cron.unschedule('end-stale-sessions-morning');
```

---

## Part C — Structural issues found during exploration (fix in same session)

These were found while reading the session/summary service layer. None are blocking by themselves but each is a real issue.

### C1 — `POST /api/summaries` has no user auth check (security gap)

`apps/seller/app/api/summaries/route.ts` — the `POST` handler:
- Uses `getServiceClient()` (bypasses RLS entirely)
- Never calls `getRequestUser()`
- Anyone with a valid tenant cookie can create a daily summary

Compare with `PUT` on the same route — it correctly calls `getRequestUser()` and returns `unauthorized()`.

**Fix:** add the same auth guard to `POST`:
```diff
  export async function POST(request: NextRequest) {
+     const user = await getRequestUser();
+     if (!user) return unauthorized();
      const supabase = getServiceClient();
      ...
      const summary = await createSummary(supabase, {
          tenantId,
          storeId: body.data.storeId,
-         openedBy: body.data.openedBy,
+         openedBy: user.id,
          ...
      });
```

Note: `CreateDailySummaryInput` currently has an `openedBy` field. Once the route enforces auth, `openedBy` should come from `user.id` (not the request body) — same pattern as `POST /api/sessions`.

### C2 — `openStore()` initialises summary totals at zero

`packages/services/sessions.ts` `openStore()` inserts the summary with:
```ts
total_sales: 0, total_orders: 0, total_cups: 0
```

This means there's a window after opening where totals show zero even if orders were placed before the store was officially opened. `listSummaries()` will eventually sync the real totals on the next read.

Compare with `createSummary()` in `packages/services/summaries.ts` which correctly queries existing orders before inserting.

**Fix:** extract a private helper `seedTotalsFromOrders(supabase, storeId, tenantId, date)` in `summaries.ts` — the same logic `createSummary()` already has — and call it from `openStore()` after the summary insert. Don't duplicate the fetch + aggregate inline in `sessions.ts`.

### C3 — `listSummaries()` writes on every read

`packages/services/summaries.ts` `listSummaries()` — if today's summary is open, it:
1. Fetches all today's orders
2. Re-aggregates totals
3. Writes back to `store_daily_summaries` if anything changed

This is a mutation inside a function called by `GET /api/summaries`. `useSummaries` is configured with `revalidateOnFocus: true` — so every tab focus potentially fires a DB write.

This keeps totals live but it's architecturally a side-effectful read. The correct long-term fix is to update totals at the point of mutation (when an order is created), not on every read. For now, at minimum document this behaviour so it isn't accidentally removed thinking it's dead code.

---

## Execution Order

1. Write the SQL into `supabase/migrations/20260529155501_enable_pg_cron_stale_session_cleanup.sql`
2. Run `supabase migration list` to verify it looks correct
3. Push the migration (developer does this manually — do not run `supabase db push`)
4. Verify in SQL editor: `SELECT jobid, schedule, jobname FROM cron.job;`
5. Apply C1 — add auth guard to `POST /api/summaries`, remove `openedBy` from request body, use `user.id`
6. Apply C2 — seed real totals in `openStore()`
7. Apply C3 — add a comment documenting the write-on-read behaviour (full refactor is a separate task)
8. Run `pnpm build --filter @tea-pos/seller` — confirm no TS errors from C1/C2

---

## Session Start — Read These First

```
packages/db/types.ts                             — required at session start per CLAUDE.md; confirm store_sessions + store_daily_summaries columns
packages/services/sessions.ts                    — openStore(), getStoreGateState(), endSessionsForSummary()
packages/services/summaries.ts                   — listSummaries() write-on-read, createSummary()
apps/seller/app/api/summaries/route.ts           — C1 auth gap (POST handler), reference PUT for correct auth pattern
apps/seller/app/api/sessions/route.ts            — reference for correct auth pattern (POST already uses getRequestUser)
packages/features/summaries/schema.ts            — check CreateDailySummaryInput; openedBy field needs to be removed or made server-only as part of C1
```

---

## Open Questions

**1. C1 — `CreateDailySummaryInput` schema needs updating**
Once `openedBy` is sourced from `user.id` in the route, the `openedBy` field in `packages/features/summaries/schema.ts` `CreateDailySummaryInput` should be removed or marked server-only. If it stays in the schema as a required client field, the TypeScript types will be misleading. Confirm the full change scope before executing: route → Zod schema → any callers of `summariesApi.create()`.

**3. C2 — prefer shared helper over inline duplication**
`openStore()` and `createSummary()` both need to seed totals from existing orders. Extract this into a private helper in `summaries.ts` (e.g., `seedTotalsFromOrders(supabase, storeId, tenantId, date)`) and call it from both. Don't duplicate the fetch + aggregate logic a second time in `sessions.ts`.

**4. Cron jobs run as Postgres superuser — RLS is bypassed**
`pg_cron` executes as the `postgres` role, which bypasses RLS. The `UPDATE store_sessions` in the job will work regardless of RLS policies. This is intentional for a cleanup job, but worth knowing so nobody later wonders why there's no RLS check in the SQL.

**5. Stale unclosed summaries in the UI**
After the cron ends a stale session, the summary stays with `closed_at = NULL`. The analytics page already supports closing past summaries via `?summaryId=`. Consider whether the analytics list should flag unclosed past summaries visually — separate UX task, not required for this fix.

**6. `cron.job_run_details` for monitoring**
After the first midnight run, verify it executed cleanly:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

---

## What NOT to change

- `endSessionsForSummary()` in `sessions.ts` — the close-day flow correctly calls this via `PUT /api/summaries`; don't touch it
- `store_daily_summaries.closed_at` for stale summaries — leave them unclosed; sellers/admins close manually from analytics
- Payroll entries — not auto-created for forgotten days; intentional
- `useSession` polling interval — unrelated to this fix
