alter table public.loan_products
  add column if not exists auto_decision_enabled boolean not null default true,
  add column if not exists min_credit_score int,
  add column if not exists min_annual_income numeric(12,2),
  add column if not exists max_debt_to_income numeric(7,4),
  add column if not exists allowed_employment_statuses jsonb not null default '[]'::jsonb;

alter table public.loan_applications
  add column if not exists credit_score int,
  add column if not exists monthly_debt_obligations numeric(12,2),
  add column if not exists underwriting_recommendation text check (underwriting_recommendation in ('approve', 'review', 'decline')),
  add column if not exists underwriting_summary text;

create table if not exists public.underwriting_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  decision_source text not null check (decision_source in ('engine', 'manual')),
  recommendation text not null check (recommendation in ('approve', 'review', 'decline')),
  reason_codes jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_underwriting_decisions_org on public.underwriting_decisions(org_id);
create index if not exists idx_underwriting_decisions_app on public.underwriting_decisions(application_id);

alter table public.underwriting_decisions enable row level security;

drop policy if exists "underwriting_decisions_select_actor" on public.underwriting_decisions;
create policy "underwriting_decisions_select_actor" on public.underwriting_decisions
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1
      from public.loan_applications a
      join public.borrower_profiles b on b.id = a.borrower_id
      where a.id = underwriting_decisions.application_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "underwriting_decisions_insert_member" on public.underwriting_decisions;
create policy "underwriting_decisions_insert_member" on public.underwriting_decisions
  for insert with check (public.is_org_member(org_id));

drop policy if exists "underwriting_decisions_update_member" on public.underwriting_decisions;
create policy "underwriting_decisions_update_member" on public.underwriting_decisions
  for update using (public.is_org_member(org_id));
