alter table public.loan_documents
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists version int not null default 1,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

create table if not exists public.servicing_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  visibility text not null default 'internal' check (visibility in ('internal', 'borrower')),
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_modifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  loan_account_id uuid not null references public.loan_accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  modification_type text not null check (modification_type in ('forbearance', 'payment_plan', 'term_extension', 'apr_change', 'manual_adjustment')),
  status text not null default 'active' check (status in ('proposed', 'active', 'completed', 'cancelled')),
  effective_date date not null default current_date,
  previous_snapshot jsonb not null default '{}'::jsonb,
  new_terms jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null unique references public.loan_applications(id) on delete cascade,
  borrower_id uuid not null references public.borrower_profiles(id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  band text not null check (band in ('low', 'moderate', 'elevated', 'high')),
  summary text not null,
  recommended_action text not null check (recommended_action in ('approve', 'review', 'decline')),
  factors jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_servicing_notes_org on public.servicing_notes(org_id);
create index if not exists idx_servicing_notes_account on public.servicing_notes(loan_account_id);
create index if not exists idx_loan_modifications_org on public.loan_modifications(org_id);
create index if not exists idx_loan_modifications_account on public.loan_modifications(loan_account_id);
create index if not exists idx_risk_assessments_org on public.risk_assessments(org_id);
create index if not exists idx_risk_assessments_app on public.risk_assessments(application_id);

alter table public.servicing_notes enable row level security;
alter table public.loan_modifications enable row level security;
alter table public.risk_assessments enable row level security;

drop policy if exists "loan_docs_update_member" on public.loan_documents;
create policy "loan_docs_update_member" on public.loan_documents
for update using (
  exists (
    select 1
    from public.org_members m
    where m.org_id = loan_documents.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.org_members m
    where m.org_id = loan_documents.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "servicing_notes_select_actor" on public.servicing_notes;
create policy "servicing_notes_select_actor" on public.servicing_notes
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = servicing_notes.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or (
    visibility = 'borrower'
    and exists (
      select 1
      from public.loan_accounts la
      join public.borrower_profiles b on b.id = la.borrower_id
      where la.id = servicing_notes.loan_account_id
        and b.user_id = auth.uid()
    )
  )
);

drop policy if exists "servicing_notes_insert_member" on public.servicing_notes;
create policy "servicing_notes_insert_member" on public.servicing_notes
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = servicing_notes.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "loan_modifications_select_actor" on public.loan_modifications;
create policy "loan_modifications_select_actor" on public.loan_modifications
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = loan_modifications.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists (
    select 1
    from public.loan_accounts la
    join public.borrower_profiles b on b.id = la.borrower_id
    where la.id = loan_modifications.loan_account_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "loan_modifications_insert_member" on public.loan_modifications;
create policy "loan_modifications_insert_member" on public.loan_modifications
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = loan_modifications.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "risk_assessments_select_actor" on public.risk_assessments;
create policy "risk_assessments_select_actor" on public.risk_assessments
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = risk_assessments.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
  or exists (
    select 1 from public.borrower_profiles b
    where b.id = risk_assessments.borrower_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "risk_assessments_insert_member" on public.risk_assessments;
create policy "risk_assessments_insert_member" on public.risk_assessments
for insert with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = risk_assessments.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "risk_assessments_update_member" on public.risk_assessments;
create policy "risk_assessments_update_member" on public.risk_assessments
for update using (
  exists (
    select 1 from public.org_members m
    where m.org_id = risk_assessments.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.org_members m
    where m.org_id = risk_assessments.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'loan-documents',
  'loan-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "loan_documents_bucket_select" on storage.objects;
create policy "loan_documents_bucket_select" on storage.objects
for select to authenticated using (
  bucket_id = 'loan-documents'
  and exists (
    select 1
    from public.loan_documents d
    left join public.loan_applications a on a.id = d.application_id
    left join public.borrower_profiles b on b.id = a.borrower_id
    where d.storage_path = storage.objects.name
      and (
        exists (
          select 1
          from public.org_members m
          where m.org_id = d.org_id
            and m.user_id = auth.uid()
            and m.status = 'active'
        )
        or b.user_id = auth.uid()
      )
  )
);

drop policy if exists "loan_documents_bucket_insert" on storage.objects;
create policy "loan_documents_bucket_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'loan-documents'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "loan_documents_bucket_update" on storage.objects;
create policy "loan_documents_bucket_update" on storage.objects
for update to authenticated using (
  bucket_id = 'loan-documents'
  and exists (
    select 1
    from public.loan_documents d
    left join public.loan_applications a on a.id = d.application_id
    left join public.borrower_profiles b on b.id = a.borrower_id
    where d.storage_path = storage.objects.name
      and (
        exists (
          select 1
          from public.org_members m
          where m.org_id = d.org_id
            and m.user_id = auth.uid()
            and m.status = 'active'
        )
        or b.user_id = auth.uid()
      )
  )
)
with check (
  bucket_id = 'loan-documents'
);

drop policy if exists "loan_documents_bucket_delete" on storage.objects;
create policy "loan_documents_bucket_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'loan-documents'
  and exists (
    select 1
    from public.loan_documents d
    where d.storage_path = storage.objects.name
      and exists (
        select 1
        from public.org_members m
        where m.org_id = d.org_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
  )
);
