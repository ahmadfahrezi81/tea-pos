-- Are any payout totals out of step with their own rows?
--
-- Read-only. Run it, do not fix from it blindly: the staleness it looks for was
-- a race, not corruption. Until 2026-09-19 the three payroll status paths
-- recomputed `payroll_payouts` fire-and-forget, so a client could read the old
-- figures — and on a serverless runtime a response that ended early could kill
-- the recompute outright. Both are fixed; this asks whether anything was left
-- behind.
--
-- Run against staging on 2026-09-19: **zero rows**. The race left nothing
-- behind, so no backfill was ever needed. Kept as a spot-check — re-run it after
-- any change to `upsertPayout` or to the three status paths that call it.
--
-- Expected result: zero rows. Every row it does return is a payout whose stored
-- totals disagree with the approved commissions and claims inside its own date
-- range, which is what `upsertPayout` would write if it ran again.
--
-- A settled payout is included deliberately. `upsertPayout` refuses to touch one
-- (see the guard at the top of it), so a mismatch there is history that can no
-- longer be corrected automatically and wants a human decision.

with live as (
    select
        p.id as payout_id,
        p.tenant_id,
        p.user_id,
        p.start_date,
        p.end_date,
        p.status,
        p.commissions_total as stored_commissions,
        p.claims_total     as stored_claims,
        p.total_pay        as stored_total,
        coalesce((
            select sum(c.total_commission)
            from payroll_commissions c
            where c.tenant_id = p.tenant_id
              and c.user_id   = p.user_id
              and c.date between p.start_date and p.end_date
              and c.status = 'approved'
        ), 0) as live_commissions,
        coalesce((
            select sum(cl.amount)
            from payroll_claims cl
            where cl.tenant_id = p.tenant_id
              and cl.user_id   = p.user_id
              and cl.date between p.start_date and p.end_date
              and cl.status = 'approved'
        ), 0) as live_claims
    from payroll_payouts p
)
select
    payout_id,
    user_id,
    start_date,
    end_date,
    status,
    stored_commissions,
    live_commissions,
    stored_claims,
    live_claims,
    stored_total,
    live_commissions + live_claims as live_total
from live
where stored_commissions <> live_commissions
   or stored_claims      <> live_claims
   or stored_total       <> live_commissions + live_claims
order by end_date desc;
