alter table public.loan_modifications
  add column if not exists borrower_id uuid references public.borrower_profiles(id) on delete set null;

create table if not exists public.compliance_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid references public.loan_applications(id) on delete cascade,
  loan_account_id uuid references public.loan_accounts(id) on delete cascade,
  regulation text not null check (regulation in ('tila', 'respa', 'fcra', 'glba', 'internal')),
  check_type text not null,
  status text not null default 'pending' check (status in ('pending', 'passed', 'failed', 'waived')),
  detail text not null,
  payload jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_statements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  statement_period_start date not null,
  statement_period_end date not null,
  due_date date,
  opening_balance numeric(12,2) not null default 0,
  closing_balance numeric(12,2) not null default 0,
  amount_due numeric(12,2) not null default 0,
  status text not null default 'generated' check (status in ('generated', 'delivered')),
  statement_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (loan_account_id, statement_period_start, statement_period_end)
);

create table if not exists public.collection_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  collection_case_id uuid references public.collection_cases(id) on delete set null,
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  event_type text not null check (event_type in ('reminder_email', 'reminder_sms', 'call_task', 'payment_plan_offer', 'forbearance_offer', 'escalated')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'completed', 'failed')),
  scheduled_for timestamptz not null default now(),
  completed_at timestamptz,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_events_org on public.compliance_events(org_id);
create index if not exists idx_compliance_events_app on public.compliance_events(application_id);
create index if not exists idx_compliance_events_account on public.compliance_events(loan_account_id);
create index if not exists idx_loan_statements_org on public.loan_statements(org_id);
create index if not exists idx_loan_statements_account on public.loan_statements(loan_account_id);
create index if not exists idx_collection_events_org on public.collection_events(org_id);
create index if not exists idx_collection_events_account on public.collection_events(loan_account_id);

alter table public.compliance_events enable row level security;
alter table public.loan_statements enable row level security;
alter table public.collection_events enable row level security;

drop policy if exists "compliance_events_select_actor" on public.compliance_events;
create policy "compliance_events_select_actor" on public.compliance_events
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = compliance_events.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists (
    select 1
    from public.borrower_profiles b
    left join public.loan_applications a on a.id = compliance_events.application_id
    left join public.loan_accounts la on la.id = compliance_events.loan_account_id
    where b.user_id = auth.uid()
      and (
        a.borrower_id = b.id
        or la.borrower_id = b.id
      )
  )
);

drop policy if exists "compliance_events_insert_member" on public.compliance_events;
create policy "compliance_events_insert_member" on public.compliance_events
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = compliance_events.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "loan_statements_select_actor" on public.loan_statements;
create policy "loan_statements_select_actor" on public.loan_statements
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = loan_statements.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists (
    select 1 from public.borrower_profiles b
    where b.id = loan_statements.borrower_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "loan_statements_insert_member" on public.loan_statements;
create policy "loan_statements_insert_member" on public.loan_statements
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = loan_statements.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "collection_events_select_actor" on public.collection_events;
create policy "collection_events_select_actor" on public.collection_events
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = collection_events.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists (
    select 1
    from public.loan_accounts la
    join public.borrower_profiles b on b.id = la.borrower_id
    where la.id = collection_events.loan_account_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "collection_events_insert_member" on public.collection_events;
create policy "collection_events_insert_member" on public.collection_events
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = collection_events.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "loan_modifications_insert_actor" on public.loan_modifications;
create policy "loan_modifications_insert_actor" on public.loan_modifications
for insert with check (
  (
    exists (
      select 1 from public.org_members m
      where m.org_id = loan_modifications.org_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  )
  or (
    loan_modifications.status = 'proposed'
    and exists (
      select 1
      from public.loan_accounts la
      join public.borrower_profiles b on b.id = la.borrower_id
      where la.id = loan_modifications.loan_account_id
        and la.org_id = loan_modifications.org_id
        and b.id = loan_modifications.borrower_id
        and b.user_id = auth.uid()
    )
  )
);
