begin;

alter table public.cadastral_requests drop constraint cadastral_requests_operation_type_check;
alter table public.cadastral_requests add constraint cadastral_requests_operation_type_check check (operation_type in ('ELENCO_IMMOBILI','PROSPETTO_CATASTALE','VISURA_ORDINARIA','ELABORATO_PLANIMETRICO'));
alter table public.cadastral_documents drop constraint cadastral_documents_document_type_check;
alter table public.cadastral_documents add constraint cadastral_documents_document_type_check check (document_type in ('VISURA_ORDINARIA','ELABORATO_PLANIMETRICO'));

create table public.realestate_comparable_requests (
  id uuid primary key default gen_random_uuid(),
  census_record_id uuid not null references public.census_records(id) on delete cascade,
  parameters jsonb not null check (jsonb_typeof(parameters)='object'),
  parameters_hash text not null,
  provider text not null default 'OPENAPI_REALESTATE',
  result jsonb not null default '[]'::jsonb check (jsonb_typeof(result)='array'),
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now()
);
create unique index realestate_comparable_requests_cache_idx on public.realestate_comparable_requests(provider,parameters_hash);
create index realestate_comparable_requests_record_idx on public.realestate_comparable_requests(census_record_id,requested_at desc);
alter table public.realestate_comparable_requests enable row level security;
revoke all on public.realestate_comparable_requests from public,anon,authenticated;
grant select,insert on public.realestate_comparable_requests to authenticated;
create policy "operator reads comparable requests" on public.realestate_comparable_requests for select to authenticated using ((select auth.uid()) is not null);
create policy "authorized operator inserts comparable requests" on public.realestate_comparable_requests for insert to authenticated with check (requested_by=(select auth.uid()) and public.can_use_paid_cadastral_services_lab());

commit;
