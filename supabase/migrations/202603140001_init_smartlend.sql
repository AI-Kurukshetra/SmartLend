create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  bio text,
  phone text,
  avatar_url text,
  default_org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists default_org_id uuid;

do $$
begin
  -- Backward compatibility: older schema used `org_id`.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'org_id'
  ) then
    execute 'update public.profiles
             set default_org_id = coalesce(default_org_id, org_id)
             where default_org_id is null';
  end if;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text,
  role text not null check (role in ('admin', 'staff')),
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.borrower_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.loan_products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  min_amount numeric(12,2) not null,
  max_amount numeric(12,2) not null,
  min_term_months int not null,
  max_term_months int not null,
  min_apr numeric(7,4),
  max_apr numeric(7,4),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  loan_product_id uuid references public.loan_products(id) on delete set null,
  requested_amount numeric(12,2) not null,
  requested_term_months int not null,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'under_review', 'approved', 'declined', 'funded', 'closed')),
  decision_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.loan_applications(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  doc_type text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.loan_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  apr numeric(7,4) not null,
  term_months int not null,
  principal_amount numeric(12,2) not null,
  fee_amount numeric(12,2) not null default 0,
  monthly_payment numeric(12,2),
  status text not null default 'offered' check (status in ('offered', 'accepted', 'expired', 'withdrawn')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  principal_balance numeric(12,2) not null,
  status text not null default 'active' check (status in ('active', 'delinquent', 'forbearance', 'paid_off', 'charged_off')),
  funded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  amount numeric(12,2) not null,
  principal_component numeric(12,2) not null default 0,
  interest_component numeric(12,2) not null default 0,
  fee_component numeric(12,2) not null default 0,
  status text not null default 'posted' check (status in ('scheduled', 'posted', 'failed', 'reversed')),
  due_date date,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'forbearance', 'payment_plan', 'resolved', 'charged_off')),
  days_past_due int not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('lender', 'borrower', 'system')),
  event_type text not null,
  resource_type text not null,
  resource_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_members_user on public.org_members(user_id);
create index if not exists idx_org_members_org on public.org_members(org_id);
create index if not exists idx_borrower_profiles_user on public.borrower_profiles(user_id);
create index if not exists idx_loan_applications_org on public.loan_applications(org_id);
create index if not exists idx_loan_applications_borrower on public.loan_applications(borrower_id);
create index if not exists idx_loan_accounts_org on public.loan_accounts(org_id);
create index if not exists idx_loan_payments_account on public.loan_payments(loan_account_id);
create index if not exists idx_audit_events_org on public.audit_events(org_id);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;
alter table public.borrower_profiles enable row level security;
alter table public.loan_products enable row level security;
alter table public.loan_applications enable row level security;
alter table public.loan_documents enable row level security;
alter table public.loan_offers enable row level security;
alter table public.loan_accounts enable row level security;
alter table public.loan_payments enable row level security;
alter table public.collection_cases enable row level security;
alter table public.audit_events enable row level security;

drop function if exists public.is_org_member(uuid) cascade;
create function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

drop function if exists public.is_org_admin(uuid) cascade;
create function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = target_org_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "orgs_insert_authenticated" on public.organizations;
create policy "orgs_insert_authenticated" on public.organizations
  for insert with check (auth.uid() is not null);

drop policy if exists "orgs_update_admin" on public.organizations;
create policy "orgs_update_admin" on public.organizations
  for update using (public.is_org_admin(id));

drop policy if exists "org_members_select_member" on public.org_members;
create policy "org_members_select_member" on public.org_members
  for select using (
    auth.uid() = user_id
    or public.is_org_member(org_id)
  );

drop policy if exists "org_members_insert_admin" on public.org_members;
create policy "org_members_insert_admin" on public.org_members
  for insert with check (public.is_org_admin(org_id));

drop policy if exists "org_members_update_admin" on public.org_members;
create policy "org_members_update_admin" on public.org_members
  for update using (public.is_org_admin(org_id));

drop policy if exists "org_members_delete_admin" on public.org_members;
create policy "org_members_delete_admin" on public.org_members
  for delete using (public.is_org_admin(org_id));

drop policy if exists "org_invites_select_admin" on public.org_invites;
create policy "org_invites_select_admin" on public.org_invites
  for select using (public.is_org_admin(org_id));

drop policy if exists "org_invites_insert_admin" on public.org_invites;
create policy "org_invites_insert_admin" on public.org_invites
  for insert with check (public.is_org_admin(org_id));

drop policy if exists "org_invites_update_admin" on public.org_invites;
create policy "org_invites_update_admin" on public.org_invites
  for update using (public.is_org_admin(org_id));

drop policy if exists "borrower_profile_select_own" on public.borrower_profiles;
create policy "borrower_profile_select_own" on public.borrower_profiles
  for select using (user_id = auth.uid());

drop policy if exists "borrower_profile_insert_own" on public.borrower_profiles;
create policy "borrower_profile_insert_own" on public.borrower_profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "borrower_profile_update_own" on public.borrower_profiles;
create policy "borrower_profile_update_own" on public.borrower_profiles
  for update using (user_id = auth.uid());

drop policy if exists "loan_products_select_members" on public.loan_products;
create policy "loan_products_select_members" on public.loan_products
  for select using (public.is_org_member(org_id));

drop policy if exists "loan_products_write_admin_staff" on public.loan_products;
create policy "loan_products_write_admin_staff" on public.loan_products
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "loan_apps_select_actor" on public.loan_applications;
create policy "loan_apps_select_actor" on public.loan_applications
  for select using (
    public.is_org_member(org_id)
    or
    exists (
      select 1 from public.borrower_profiles b
      where b.id = loan_applications.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "loan_apps_insert_borrower" on public.loan_applications;
create policy "loan_apps_insert_borrower" on public.loan_applications
  for insert with check (
    exists (
      select 1 from public.borrower_profiles b
      where b.id = borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "loan_apps_update_member" on public.loan_applications;
create policy "loan_apps_update_member" on public.loan_applications
  for update using (public.is_org_member(org_id));

drop policy if exists "loan_docs_select_actor" on public.loan_documents;
create policy "loan_docs_select_actor" on public.loan_documents
  for select using (
    exists (
      select 1 from public.loan_applications a
      join public.borrower_profiles b on b.id = a.borrower_id
      where a.id = loan_documents.application_id and b.user_id = auth.uid()
    )
    or
    public.is_org_member(org_id)
  );

drop policy if exists "loan_docs_insert_actor" on public.loan_documents;
create policy "loan_docs_insert_actor" on public.loan_documents
  for insert with check (
    exists (
      select 1 from public.loan_applications a
      join public.borrower_profiles b on b.id = a.borrower_id
      where a.id = application_id and b.user_id = auth.uid()
    )
    or
    public.is_org_member(org_id)
  );

drop policy if exists "loan_accounts_select_actor" on public.loan_accounts;
create policy "loan_accounts_select_actor" on public.loan_accounts
  for select using (
    exists (
      select 1 from public.borrower_profiles b
      where b.id = loan_accounts.borrower_id and b.user_id = auth.uid()
    )
    or
    public.is_org_member(org_id)
  );

drop policy if exists "loan_accounts_update_member" on public.loan_accounts;
create policy "loan_accounts_update_member" on public.loan_accounts
  for update using (public.is_org_member(org_id));

drop policy if exists "loan_payments_select_actor" on public.loan_payments;
create policy "loan_payments_select_actor" on public.loan_payments
  for select using (
    exists (
      select 1 from public.loan_accounts la
      join public.borrower_profiles b on b.id = la.borrower_id
      where la.id = loan_payments.loan_account_id and b.user_id = auth.uid()
    )
    or
    public.is_org_member(org_id)
  );

drop policy if exists "loan_payments_insert_member" on public.loan_payments;
create policy "loan_payments_insert_member" on public.loan_payments
  for insert with check (public.is_org_member(org_id));

drop policy if exists "collection_cases_select_member" on public.collection_cases;
create policy "collection_cases_select_member" on public.collection_cases
  for select using (public.is_org_member(org_id));

drop policy if exists "collection_cases_write_member" on public.collection_cases;
create policy "collection_cases_write_member" on public.collection_cases
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "audit_events_select_member" on public.audit_events;
create policy "audit_events_select_member" on public.audit_events
  for select using (
    org_id is null
    or public.is_org_member(org_id)
  );

drop policy if exists "audit_events_insert_member" on public.audit_events;
create policy "audit_events_insert_member" on public.audit_events
  for insert with check (
    org_id is null
    or public.is_org_member(org_id)
  );

insert into public.profiles (id, email, first_name, last_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'first_name', ''),
  coalesce(u.raw_user_meta_data ->> 'last_name', '')
from auth.users u
on conflict (id) do update
set email = excluded.email;

insert into public.organizations (id, name, created_by)
select distinct
  (u.raw_user_meta_data ->> 'org_id')::uuid as id,
  coalesce(nullif(u.raw_user_meta_data ->> 'org_name', ''), 'Imported Organization') as name,
  u.id as created_by
from auth.users u
where (u.raw_user_meta_data ->> 'org_id') ~ '^[0-9a-fA-F-]{36}$'
on conflict (id) do nothing;

insert into public.org_members (org_id, user_id, role, status)
select
  (u.raw_user_meta_data ->> 'org_id')::uuid as org_id,
  u.id as user_id,
  case when coalesce(u.raw_user_meta_data ->> 'role', '') in ('admin', 'staff')
    then (u.raw_user_meta_data ->> 'role')
    else 'staff'
  end as role,
  'active' as status
from auth.users u
where (u.raw_user_meta_data ->> 'org_id') ~ '^[0-9a-fA-F-]{36}$'
on conflict (org_id, user_id) do update
set role = excluded.role;

update public.profiles p
set default_org_id = m.org_id
from public.org_members m
where p.id = m.user_id and p.default_org_id is null;
