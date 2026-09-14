begin;

alter table public.operators
  add column can_use_paid_cadastral_services boolean not null default false;

comment on column public.operators.can_use_paid_cadastral_services is
  'Explicit LAB authorization for server-side paid cadastral operations. Defaults to denied.';

create table public.cadastral_requests (
  id uuid primary key default gen_random_uuid(),
  census_record_id uuid references public.census_records(id) on delete set null,
  operation_type text not null check (operation_type in ('ELENCO_IMMOBILI','PROSPETTO_CATASTALE','VISURA_ORDINARIA')),
  provider text not null default 'OPENAPI_CATASTO',
  canonical_parameters jsonb not null,
  parameters_hash text not null,
  provider_request_id text,
  status text not null default 'CREATED' check (status in ('CREATED','IN_PROGRESS','COMPLETED','FAILED')),
  result jsonb,
  estimated_cost numeric(12,4),
  known_cost numeric(12,4),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  error_message text,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(canonical_parameters) = 'object')
);

create unique index cadastral_requests_one_active_idx
  on public.cadastral_requests(provider, operation_type, parameters_hash)
  where status in ('CREATED','IN_PROGRESS');
create index cadastral_requests_cache_idx
  on public.cadastral_requests(provider, operation_type, parameters_hash, completed_at desc)
  where status = 'COMPLETED';
create index cadastral_requests_record_idx on public.cadastral_requests(census_record_id, requested_at desc);

create table public.cadastral_property_units (
  id uuid primary key default gen_random_uuid(),
  census_record_id uuid references public.census_records(id) on delete set null,
  source_request_id uuid not null references public.cadastral_requests(id) on delete restrict,
  provider text not null,
  provider_property_id text not null,
  municipality_cadastral_code text not null,
  municipality_name text,
  province_code text,
  section text,
  urban_section text,
  sheet text not null,
  parcel text not null,
  subaltern text,
  address text,
  census_zone text,
  category text,
  class text,
  consistency text,
  cadastral_income text,
  registry_lot text,
  acquired_at timestamptz not null default now(),
  raw_payload jsonb not null,
  unique(provider, provider_property_id, source_request_id),
  check (btrim(provider_property_id) <> '' and btrim(sheet) <> '' and btrim(parcel) <> '')
);
create index cadastral_property_units_record_idx on public.cadastral_property_units(census_record_id, acquired_at desc);

create table public.cadastral_ownership_rights (
  id uuid primary key default gen_random_uuid(),
  property_unit_id uuid not null references public.cadastral_property_units(id) on delete cascade,
  source_request_id uuid not null references public.cadastral_requests(id) on delete restrict,
  linked_subject_id uuid references public.subjects(id) on delete set null,
  holder_type text not null check (holder_type in ('PRIVATO','AZIENDA','NON_DETERMINATO')),
  first_name text,
  last_name text,
  company_name text,
  tax_code text,
  right_type_original text,
  share_original text,
  source text not null,
  acquired_at timestamptz not null default now(),
  raw_payload jsonb not null
);
create index cadastral_ownership_rights_unit_idx on public.cadastral_ownership_rights(property_unit_id, acquired_at desc);
create index cadastral_ownership_rights_tax_code_idx on public.cadastral_ownership_rights(upper(tax_code)) where tax_code is not null;
create unique index cadastral_ownership_rights_request_identity_uidx on public.cadastral_ownership_rights(
  source_request_id,property_unit_id,coalesce(upper(tax_code),''),coalesce(lower(first_name),''),coalesce(lower(last_name),''),
  coalesce(lower(company_name),''),coalesce(lower(right_type_original),''),coalesce(share_original,'')
);

create table public.cadastral_documents (
  id uuid primary key default gen_random_uuid(),
  cadastral_request_id uuid not null unique references public.cadastral_requests(id) on delete restrict,
  census_record_id uuid references public.census_records(id) on delete set null,
  provider_document_id text not null,
  document_type text not null check (document_type = 'VISURA_ORDINARIA'),
  storage_path text not null unique,
  mime_type text not null check (mime_type = 'application/pdf'),
  byte_size integer not null check (byte_size > 0 and byte_size <= 20971520),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('cadastral-documents','cadastral-documents',false,20971520,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create trigger cadastral_requests_updated_at before update on public.cadastral_requests
for each row execute function public.set_updated_at();

alter table public.cadastral_requests enable row level security;
alter table public.cadastral_property_units enable row level security;
alter table public.cadastral_ownership_rights enable row level security;
alter table public.cadastral_documents enable row level security;

revoke all on public.cadastral_requests,public.cadastral_property_units,public.cadastral_ownership_rights,public.cadastral_documents from public,anon,authenticated;
grant select,insert,update on public.cadastral_requests,public.cadastral_property_units,public.cadastral_ownership_rights,public.cadastral_documents to authenticated;

create or replace function public.can_use_paid_cadastral_services_lab()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.operators o where o.auth_user_id=(select auth.uid()) and o.can_use_paid_cadastral_services);
$$;
revoke all on function public.can_use_paid_cadastral_services_lab() from public,anon;
grant execute on function public.can_use_paid_cadastral_services_lab() to authenticated;

do $$ declare t text; begin foreach t in array array['cadastral_requests','cadastral_property_units','cadastral_ownership_rights','cadastral_documents'] loop
  execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null)', 'lab authenticated read', t);
end loop; end $$;

create policy "requester inserts cadastral request" on public.cadastral_requests for insert to authenticated
with check (requested_by=(select auth.uid()) and public.can_use_paid_cadastral_services_lab());
create policy "requester updates cadastral request" on public.cadastral_requests for update to authenticated
using (requested_by=(select auth.uid()) and public.can_use_paid_cadastral_services_lab())
with check (requested_by=(select auth.uid()) and public.can_use_paid_cadastral_services_lab());
create policy "requester inserts cadastral unit" on public.cadastral_property_units for insert to authenticated
with check (exists(select 1 from public.cadastral_requests r where r.id=source_request_id and r.requested_by=(select auth.uid())));
create policy "requester updates cadastral unit" on public.cadastral_property_units for update to authenticated
using (exists(select 1 from public.cadastral_requests r where r.id=source_request_id and r.requested_by=(select auth.uid())));
create policy "requester inserts cadastral right" on public.cadastral_ownership_rights for insert to authenticated
with check (exists(select 1 from public.cadastral_requests r where r.id=source_request_id and r.requested_by=(select auth.uid())));
create policy "requester updates cadastral right" on public.cadastral_ownership_rights for update to authenticated
using (exists(select 1 from public.cadastral_requests r where r.id=source_request_id and r.requested_by=(select auth.uid())));
create policy "requester inserts cadastral document" on public.cadastral_documents for insert to authenticated
with check (created_by=(select auth.uid()) and exists(select 1 from public.cadastral_requests r where r.id=cadastral_request_id and r.requested_by=(select auth.uid())));
create policy "requester updates cadastral document" on public.cadastral_documents for update to authenticated
using (created_by=(select auth.uid()));

create or replace function public.is_owned_cadastral_document_object(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select (select auth.uid()) is not null and exists(
    select 1 from public.cadastral_requests r
    where r.id::text=(storage.foldername(p_name))[1] and r.requested_by=(select auth.uid())
  );
$$;
revoke all on function public.is_owned_cadastral_document_object(text) from public,anon;
grant execute on function public.is_owned_cadastral_document_object(text) to authenticated;

create policy "cadastral documents authenticated read" on storage.objects for select to authenticated
using (bucket_id='cadastral-documents' and public.is_owned_cadastral_document_object(name));
create policy "cadastral documents authenticated insert" on storage.objects for insert to authenticated
with check (bucket_id='cadastral-documents' and public.is_owned_cadastral_document_object(name));

commit;
