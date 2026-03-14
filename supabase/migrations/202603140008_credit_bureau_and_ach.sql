create table if not exists public.credit_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.loan_applications(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  bureau text not null check (bureau in ('experian', 'equifax', 'transunion')),
  pull_type text not null default 'soft' check (pull_type in ('soft', 'hard', 'monitoring')),
  score int,
  report_data jsonb not null default '{}'::jsonb,
  monitoring_enabled boolean not null default false,
  pulled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_reports_org on public.credit_reports(org_id);
create index if not exists idx_credit_reports_app on public.credit_reports(application_id);

create table if not exists public.borrower_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  bank_name text not null,
  account_holder_name text not null,
  routing_number_last4 text not null,
  account_number_last4 text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'failed', 'disabled')),
  verification_method text not null default 'micro_deposits' check (verification_method in ('micro_deposits', 'instant')),
  is_default boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_borrower_bank_accounts_org on public.borrower_bank_accounts(org_id);
create index if not exists idx_borrower_bank_accounts_borrower on public.borrower_bank_accounts(borrower_id);

alter table public.loan_accounts
  add column if not exists autopay_enabled boolean not null default false,
  add column if not exists autopay_bank_account_id uuid references public.borrower_bank_accounts(id) on delete set null,
  add column if not exists scheduled_payment_amount numeric(12,2),
  add column if not exists apr numeric(7,4),
  add column if not exists term_months int,
  add column if not exists next_payment_due_date date;

alter table public.loan_payments
  add column if not exists payment_method text not null default 'manual' check (payment_method in ('manual', 'ach', 'card', 'wire', 'check')),
  add column if not exists bank_account_id uuid references public.borrower_bank_accounts(id) on delete set null,
  add column if not exists external_reference text;

alter table public.credit_reports enable row level security;
alter table public.borrower_bank_accounts enable row level security;

drop policy if exists "credit_reports_select_actor" on public.credit_reports;
create policy "credit_reports_select_actor" on public.credit_reports
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = credit_reports.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "credit_reports_insert_member" on public.credit_reports;
create policy "credit_reports_insert_member" on public.credit_reports
  for insert with check (public.is_org_member(org_id));

drop policy if exists "borrower_bank_accounts_select_actor" on public.borrower_bank_accounts;
create policy "borrower_bank_accounts_select_actor" on public.borrower_bank_accounts
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = borrower_bank_accounts.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "borrower_bank_accounts_insert_actor" on public.borrower_bank_accounts;
create policy "borrower_bank_accounts_insert_actor" on public.borrower_bank_accounts
  for insert with check (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = borrower_bank_accounts.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "borrower_bank_accounts_update_actor" on public.borrower_bank_accounts;
create policy "borrower_bank_accounts_update_actor" on public.borrower_bank_accounts
  for update using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = borrower_bank_accounts.borrower_id and b.user_id = auth.uid()
    )
  );
