-- Clear test data. All four tables in one statement so Postgres handles FK ordering.
truncate payroll_reimbursements, payroll_payouts, payroll_commissions, payroll_periods;

alter table payroll_reimbursements rename to payroll_claims;

alter table payroll_claims rename constraint reimbursements_payroll_period_id_fkey to payroll_claims_payroll_period_id_fkey;
alter table payroll_claims rename constraint reimbursements_store_id_fkey        to payroll_claims_store_id_fkey;
alter table payroll_claims rename constraint reimbursements_tenant_id_fkey       to payroll_claims_tenant_id_fkey;
alter table payroll_claims rename constraint reimbursements_user_id_fkey         to payroll_claims_user_id_fkey;

alter table payroll_claims
  alter column payroll_period_id set not null;

alter table payroll_claims
  add column claim_type_id      uuid references payroll_claim_types(id),
  add column frequency          text,   -- denormalized from claim_type; enables scoped unique indexes
  add column payment_proof_url  text,
  add column paid_at            timestamptz,
  add column paid_by            uuid references users(id);

-- Rename payout totals columns
alter table payroll_payouts rename column cups_pay_total       to commissions_total;
alter table payroll_payouts rename column reimbursements_total to claims_total;

-- Ensure payroll_periods has unique constraint for getOrCreatePayrollPeriod ON CONFLICT
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payroll_periods_tenant_start_date_key'
      and conrelid = 'payroll_periods'::regclass
  ) then
    alter table payroll_periods
      add constraint payroll_periods_tenant_start_date_key unique (tenant_id, start_date);
  end if;
end $$;

-- Concurrency guard: one non-rejected claim per user per type per period (covers weekly)
create unique index payroll_claims_weekly_unique
  on payroll_claims (tenant_id, user_id, claim_type_id, payroll_period_id)
  where status != 'rejected';

-- Concurrency guard: at most one non-rejected one_time claim per user per type, ever
-- Uses denormalized frequency column to avoid conflicting with weekly/monthly claims
create unique index payroll_claims_one_time_unique
  on payroll_claims (tenant_id, user_id, claim_type_id)
  where status != 'rejected' and frequency = 'one_time';
