alter table public.org_members
  add column if not exists permissions jsonb not null default '[]'::jsonb;

alter table public.loan_products
  add column if not exists pricing_strategy text not null default 'fixed_band' check (pricing_strategy in ('fixed_band', 'risk_based', 'market_adjusted')),
  add column if not exists pricing_rate_adjustments jsonb not null default '[]'::jsonb,
  add column if not exists market_rate_index numeric(7,4),
  add column if not exists workflow_template jsonb not null default '[]'::jsonb;

alter table public.loan_applications
  add column if not exists current_stage text not null default 'application_submitted',
  add column if not exists workflow_history jsonb not null default '[]'::jsonb;

alter table public.borrower_bank_accounts
  add column if not exists verification_provider text,
  add column if not exists verification_reference text,
  add column if not exists micro_deposit_amount_1 numeric(6,2),
  add column if not exists micro_deposit_amount_2 numeric(6,2);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  borrower_id uuid references public.borrower_profiles(id) on delete cascade,
  application_id uuid references public.loan_applications(id) on delete cascade,
  loan_account_id uuid references public.loan_accounts(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null check (channel in ('email', 'sms', 'phone', 'in_app')),
  event_type text not null,
  subject text,
  message text not null,
  status text not null default 'logged' check (status in ('queued', 'sent', 'delivered', 'logged', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  external_reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comm_events_org on public.communication_events(org_id);
create index if not exists idx_comm_events_borrower on public.communication_events(borrower_id);
create index if not exists idx_comm_events_account on public.communication_events(loan_account_id);

alter table public.communication_events enable row level security;

drop policy if exists "communication_events_select_actor" on public.communication_events;
create policy "communication_events_select_actor" on public.communication_events
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = communication_events.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists (
    select 1 from public.borrower_profiles b
    where b.id = communication_events.borrower_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "communication_events_insert_member" on public.communication_events;
create policy "communication_events_insert_member" on public.communication_events
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = communication_events.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);
