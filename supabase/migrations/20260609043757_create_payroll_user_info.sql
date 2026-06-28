create table payroll_user_info (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id),
  user_id              uuid not null references users(id),
  commission_type_id   uuid references payroll_commission_types(id),
  rate_per_cup         integer not null,
  bank_name            text,
  bank_account_number  text,
  bank_account_holder  text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),
  unique (tenant_id, user_id)
);

-- Seed bank fields from users. Rate defaults to 0 and is set via backoffice.
insert into payroll_user_info (
  tenant_id, user_id, rate_per_cup,
  bank_name, bank_account_number, bank_account_holder
)
select
  uta.tenant_id,
  u.id,
  0,
  u.bank_name,
  u.bank_account_number,
  u.bank_account_holder
from users u
join user_tenant_assignments uta on uta.user_id = u.id
where u.bank_name is not null
   or u.bank_account_number is not null
   or u.bank_account_holder is not null
on conflict (tenant_id, user_id) do nothing;

-- Move bank fields off users
alter table users
  drop column bank_name,
  drop column bank_account_number,
  drop column bank_account_holder;

alter table payroll_user_info enable row level security;

create policy "users can manage own payroll info"
  on payroll_user_info for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "admins can manage all payroll info in tenant"
  on payroll_user_info for all
  using (
    tenant_id = any(user_tenant_ids())
    and exists (select 1 from users where id = auth.uid() and role = 'ADMIN')
  )
  with check (
    tenant_id = any(user_tenant_ids())
    and exists (select 1 from users where id = auth.uid() and role = 'ADMIN')
  );
