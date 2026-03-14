-- Fix RLS recursion by recreating helper functions and dependent policies.

drop policy if exists "orgs_select_member" on public.organizations;
drop policy if exists "orgs_update_admin" on public.organizations;
drop policy if exists "org_members_select_member" on public.org_members;
drop policy if exists "org_members_insert_admin" on public.org_members;
drop policy if exists "org_members_update_admin" on public.org_members;
drop policy if exists "org_members_delete_admin" on public.org_members;
drop policy if exists "org_invites_select_admin" on public.org_invites;
drop policy if exists "org_invites_insert_admin" on public.org_invites;
drop policy if exists "org_invites_update_admin" on public.org_invites;
drop policy if exists "loan_products_select_members" on public.loan_products;
drop policy if exists "loan_products_write_admin_staff" on public.loan_products;
drop policy if exists "loan_apps_select_actor" on public.loan_applications;
drop policy if exists "loan_apps_update_member" on public.loan_applications;
drop policy if exists "loan_docs_select_actor" on public.loan_documents;
drop policy if exists "loan_docs_insert_actor" on public.loan_documents;
drop policy if exists "loan_accounts_select_actor" on public.loan_accounts;
drop policy if exists "loan_accounts_update_member" on public.loan_accounts;
drop policy if exists "loan_payments_select_actor" on public.loan_payments;
drop policy if exists "loan_payments_insert_member" on public.loan_payments;
drop policy if exists "collection_cases_select_member" on public.collection_cases;
drop policy if exists "collection_cases_write_member" on public.collection_cases;
drop policy if exists "audit_events_select_member" on public.audit_events;
drop policy if exists "audit_events_insert_member" on public.audit_events;

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

create policy "orgs_select_member" on public.organizations
  for select using (public.is_org_member(id));
create policy "orgs_update_admin" on public.organizations
  for update using (public.is_org_admin(id));

create policy "org_members_select_member" on public.org_members
  for select using (auth.uid() = user_id or public.is_org_member(org_id));
create policy "org_members_insert_admin" on public.org_members
  for insert with check (public.is_org_admin(org_id));
create policy "org_members_update_admin" on public.org_members
  for update using (public.is_org_admin(org_id));
create policy "org_members_delete_admin" on public.org_members
  for delete using (public.is_org_admin(org_id));

create policy "org_invites_select_admin" on public.org_invites
  for select using (public.is_org_admin(org_id));
create policy "org_invites_insert_admin" on public.org_invites
  for insert with check (public.is_org_admin(org_id));
create policy "org_invites_update_admin" on public.org_invites
  for update using (public.is_org_admin(org_id));

create policy "loan_products_select_members" on public.loan_products
  for select using (public.is_org_member(org_id));
create policy "loan_products_write_admin_staff" on public.loan_products
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "loan_apps_select_actor" on public.loan_applications
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = loan_applications.borrower_id and b.user_id = auth.uid()
    )
  );
create policy "loan_apps_update_member" on public.loan_applications
  for update using (public.is_org_member(org_id));

create policy "loan_docs_select_actor" on public.loan_documents
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.loan_applications a
      join public.borrower_profiles b on b.id = a.borrower_id
      where a.id = loan_documents.application_id and b.user_id = auth.uid()
    )
  );
create policy "loan_docs_insert_actor" on public.loan_documents
  for insert with check (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.loan_applications a
      join public.borrower_profiles b on b.id = a.borrower_id
      where a.id = application_id and b.user_id = auth.uid()
    )
  );

create policy "loan_accounts_select_actor" on public.loan_accounts
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.borrower_profiles b
      where b.id = loan_accounts.borrower_id and b.user_id = auth.uid()
    )
  );
create policy "loan_accounts_update_member" on public.loan_accounts
  for update using (public.is_org_member(org_id));

create policy "loan_payments_select_actor" on public.loan_payments
  for select using (
    public.is_org_member(org_id)
    or exists (
      select 1 from public.loan_accounts la
      join public.borrower_profiles b on b.id = la.borrower_id
      where la.id = loan_payments.loan_account_id and b.user_id = auth.uid()
    )
  );
create policy "loan_payments_insert_member" on public.loan_payments
  for insert with check (public.is_org_member(org_id));

create policy "collection_cases_select_member" on public.collection_cases
  for select using (public.is_org_member(org_id));
create policy "collection_cases_write_member" on public.collection_cases
  for all using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

create policy "audit_events_select_member" on public.audit_events
  for select using (org_id is null or public.is_org_member(org_id));
create policy "audit_events_insert_member" on public.audit_events
  for insert with check (org_id is null or public.is_org_member(org_id));
