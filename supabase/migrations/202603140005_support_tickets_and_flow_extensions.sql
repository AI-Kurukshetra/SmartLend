create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_org on public.support_tickets(org_id);
create index if not exists idx_support_tickets_borrower on public.support_tickets(borrower_id);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_select_actor" on public.support_tickets;
create policy "support_tickets_select_actor" on public.support_tickets
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = support_tickets.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "support_tickets_insert_borrower_or_member" on public.support_tickets;
create policy "support_tickets_insert_borrower_or_member" on public.support_tickets
  for insert with check (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = support_tickets.borrower_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "support_tickets_update_member" on public.support_tickets;
create policy "support_tickets_update_member" on public.support_tickets
  for update using (public.is_org_member(org_id));
