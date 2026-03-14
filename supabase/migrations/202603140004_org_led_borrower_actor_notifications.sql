alter table public.profiles
  add column if not exists last_actor text check (last_actor in ('lender', 'borrower'));

alter table public.org_invites
  drop constraint if exists org_invites_role_check;

alter table public.org_invites
  add constraint org_invites_role_check
  check (role in ('admin', 'staff', 'borrower'));

alter table public.org_invites
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.borrower_profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_type text not null check (actor_type in ('lender', 'borrower', 'system')),
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists actor_type text,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists message text,
  add column if not exists read boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_actor_type_check'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_actor_type_check
      check (actor_type in ('lender', 'borrower', 'system'));
  end if;
end $$;

create index if not exists idx_notifications_user_created_at
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "notifications_insert_member_or_self" on public.notifications;
create policy "notifications_insert_member_or_self" on public.notifications
  for insert with check (
    auth.uid() = user_id
    or (org_id is not null and public.is_org_member(org_id))
  );

drop policy if exists "org_invites_select_admin_or_borrower_email" on public.org_invites;
create policy "org_invites_select_admin_or_borrower_email" on public.org_invites
  for select using (
    public.is_org_admin(org_id)
    or (
      role = 'borrower'
      and auth.uid() is not null
      and lower(coalesce(email, '')) = lower(coalesce((auth.jwt() ->> 'email'), ''))
    )
  );
