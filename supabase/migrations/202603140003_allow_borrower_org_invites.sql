alter table public.org_invites
  drop constraint if exists org_invites_role_check;

alter table public.org_invites
  add constraint org_invites_role_check
  check (role in ('admin', 'staff', 'borrower'));
