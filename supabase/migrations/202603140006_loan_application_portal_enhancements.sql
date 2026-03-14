alter table public.loan_applications
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists date_of_birth date,
  add column if not exists employment_status text,
  add column if not exists annual_income numeric(12,2),
  add column if not exists loan_purpose text,
  add column if not exists address_line1 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists consent_credit_pull boolean not null default false,
  add column if not exists consent_terms boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists draft_data jsonb not null default '{}'::jsonb;

create table if not exists public.loan_agreements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  status text not null default 'pending_signature' check (status in ('pending_signature', 'signed', 'cancelled')),
  agreement_text text not null,
  signed_by_user_id uuid references auth.users(id) on delete set null,
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_loan_agreements_org on public.loan_agreements(org_id);
create index if not exists idx_loan_agreements_borrower on public.loan_agreements(borrower_id);

alter table public.loan_agreements enable row level security;

drop policy if exists "loan_agreements_select_actor" on public.loan_agreements;
create policy "loan_agreements_select_actor" on public.loan_agreements
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = loan_agreements.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "loan_agreements_insert_member" on public.loan_agreements;
create policy "loan_agreements_insert_member" on public.loan_agreements
  for insert with check (public.is_org_member(org_id));

drop policy if exists "loan_agreements_update_actor" on public.loan_agreements;
create policy "loan_agreements_update_actor" on public.loan_agreements
  for update using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = loan_agreements.borrower_id and b.user_id = auth.uid()
    )
  );
