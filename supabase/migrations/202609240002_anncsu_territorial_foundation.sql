begin;

-- LAB breaking cutover: the existing territorial/contact rows are disposable demo
-- data. Non-territorial schemas, Subject identity and cadastral service contracts
-- remain in place. The production tenant key is intentionally not fabricated.
truncate table public.census_zones, public.streets cascade;

drop function if exists public.add_civics_to_street_lab(uuid, jsonb);
drop function if exists public.save_civic_location_lab(uuid, jsonb);
drop function if exists public.rename_zone_street_lab(uuid, uuid, text);
drop table public.complex_civics;
alter table public.doorbell_contact_proposals drop column civic_id;
alter table public.census_records drop column street_id;
alter table public.census_records drop column civic_id;
drop table public.civics;

alter table public.streets drop constraint if exists streets_municipality_id_name_key;
drop index if exists public.streets_municipality_normalized_name_uidx;

create table public.anncsu_import_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_type text not null check (dataset_type in ('STRADARIO','INDIRIZZARIO')),
  territorial_scope text not null,
  release_date date not null,
  source_file text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_size_bytes bigint not null check (source_size_bytes > 0),
  parser_version text not null,
  artifact_retention_months integer not null default 12 check (artifact_retention_months > 0),
  state text not null check (state in ('STARTED','APPLIED','FAILED')),
  row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  quarantined_count integer not null default 0,
  warning_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (dataset_type, territorial_scope, source_sha256)
);
create unique index anncsu_applied_release_uidx on public.anncsu_import_runs(dataset_type, territorial_scope, release_date)
  where state = 'APPLIED';

create table public.anncsu_import_issues (
  id bigint generated always as identity primary key,
  import_run_id uuid not null references public.anncsu_import_runs(id),
  row_number integer,
  source_id text,
  issue_code text not null,
  severity text not null check (severity in ('WARNING','QUARANTINE','BLOCKING')),
  detail text not null,
  created_at timestamptz not null default now()
);

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipalities(id),
  normalized_name text not null check (btrim(normalized_name) <> ''),
  display_name text not null check (btrim(display_name) <> ''),
  created_at timestamptz not null default now(),
  unique (municipality_id, normalized_name),
  unique (id, municipality_id)
);

alter table public.streets
  add column source_kind text not null check (source_kind in ('OFFICIAL_ANNCSU','MANUAL')),
  add column ownership_scope text not null check (ownership_scope in ('GLOBAL_REFERENCE','TENANT_OPERATIONAL')),
  add column anncsu_progressivo_nazionale text,
  add column codice_comunale text,
  add column locality_name text,
  add column locality_id uuid references public.localities(id),
  add column dizione_lingua1 text,
  add column dizione_lingua2 text,
  add column total_accesses integer check (total_accesses is null or total_accesses >= 0),
  add column first_seen_run_id uuid references public.anncsu_import_runs(id),
  add column last_seen_run_id uuid references public.anncsu_import_runs(id),
  add column is_present_in_latest_snapshot boolean not null default false,
  add column manual_reason text,
  add column manual_author uuid references auth.users(id),
  add column manual_created_at timestamptz,
  add column manual_review_state text,
  add column superseded_by_street_id uuid references public.streets(id),
  add constraint streets_source_invariant check (
    (source_kind = 'OFFICIAL_ANNCSU' and ownership_scope = 'GLOBAL_REFERENCE'
      and anncsu_progressivo_nazionale is not null and first_seen_run_id is not null
      and manual_reason is null and manual_author is null)
    or (source_kind = 'MANUAL' and ownership_scope = 'TENANT_OPERATIONAL'
      and anncsu_progressivo_nazionale is null and first_seen_run_id is null
      and nullif(btrim(manual_reason),'') is not null and manual_author is not null
      and manual_created_at is not null and manual_review_state in ('PROPOSED','APPROVED','RETIRED'))
  );
alter table public.streets add constraint streets_locality_municipality_fk
  foreign key (locality_id, municipality_id) references public.localities(id, municipality_id);
create unique index streets_anncsu_progressivo_uidx on public.streets(anncsu_progressivo_nazionale)
  where anncsu_progressivo_nazionale is not null;
create index streets_municipality_lookup_idx on public.streets(municipality_id, normalized_name, locality_id);
create index streets_locality_idx on public.streets(locality_id);

create table public.address_accesses (
  id uuid primary key default gen_random_uuid(),
  street_id uuid not null references public.streets(id),
  source_kind text not null check (source_kind in ('OFFICIAL_ANNCSU','MANUAL')),
  ownership_scope text not null check (ownership_scope in ('GLOBAL_REFERENCE','TENANT_OPERATIONAL')),
  anncsu_progressivo_accesso text,
  codice_comunale_accesso text,
  civic text,
  exponent text,
  specificity text,
  metric text,
  progressivo_snc text,
  quota_raw text,
  first_seen_run_id uuid references public.anncsu_import_runs(id),
  last_seen_run_id uuid references public.anncsu_import_runs(id),
  is_present_in_latest_snapshot boolean not null default false,
  manual_reason text,
  manual_author uuid references auth.users(id),
  manual_created_at timestamptz,
  manual_review_state text,
  superseded_by_access_id uuid references public.address_accesses(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint address_accesses_source_invariant check (
    (source_kind = 'OFFICIAL_ANNCSU' and ownership_scope = 'GLOBAL_REFERENCE'
      and anncsu_progressivo_accesso is not null and first_seen_run_id is not null
      and manual_reason is null and manual_author is null)
    or (source_kind = 'MANUAL' and ownership_scope = 'TENANT_OPERATIONAL'
      and anncsu_progressivo_accesso is null and first_seen_run_id is null
      and nullif(btrim(manual_reason),'') is not null and manual_author is not null
      and manual_created_at is not null and manual_review_state in ('PROPOSED','APPROVED','RETIRED'))
  ),
  constraint address_accesses_numbering_check check (civic is not null or metric is not null or progressivo_snc is not null)
);
create unique index address_accesses_anncsu_progressivo_uidx on public.address_accesses(anncsu_progressivo_accesso)
  where anncsu_progressivo_accesso is not null;
create index address_accesses_street_idx on public.address_accesses(street_id);
create trigger address_accesses_updated_at before update on public.address_accesses
  for each row execute function public.set_updated_at();

create table public.street_official_revisions (
  id bigint generated always as identity primary key,
  street_id uuid not null references public.streets(id),
  import_run_id uuid not null references public.anncsu_import_runs(id),
  source_fingerprint text not null,
  attributes jsonb not null,
  created_at timestamptz not null default now(),
  unique (street_id, source_fingerprint)
);
create table public.access_official_revisions (
  id bigint generated always as identity primary key,
  address_access_id uuid not null references public.address_accesses(id),
  import_run_id uuid not null references public.anncsu_import_runs(id),
  source_fingerprint text not null,
  attributes jsonb not null,
  created_at timestamptz not null default now(),
  unique (address_access_id, source_fingerprint)
);

create table public.access_location_observations (
  id uuid primary key default gen_random_uuid(),
  address_access_id uuid not null references public.address_accesses(id),
  source_kind text not null check (source_kind in ('ANNCSU','GEOCODER','OPERATOR')),
  ownership_scope text not null check (ownership_scope in ('GLOBAL_REFERENCE','TENANT_OPERATIONAL')),
  source_crs text not null,
  raw_longitude text,
  raw_latitude text,
  longitude numeric(10,7),
  latitude numeric(10,7),
  quota_raw text,
  anncsu_method smallint check (anncsu_method between 1 and 5),
  point extensions.geometry(Point,6706),
  validation_state text not null check (validation_state in ('VALID','QUARANTINED','CANDIDATE','VERIFIED')),
  validation_note text,
  source_reference text,
  import_run_id uuid references public.anncsu_import_runs(id),
  source_sha256 text,
  source_fingerprint text not null,
  observed_at timestamptz not null default now(),
  author uuid references auth.users(id),
  unique (address_access_id, source_kind, source_fingerprint),
  constraint observations_source_invariant check (
    (source_kind = 'ANNCSU' and ownership_scope = 'GLOBAL_REFERENCE' and source_crs = 'EPSG:6706'
      and import_run_id is not null and source_sha256 is not null and anncsu_method is not null)
    or (source_kind in ('GEOCODER','OPERATOR') and ownership_scope = 'TENANT_OPERATIONAL'
      and import_run_id is null and author is not null)
  ),
  constraint observations_coordinate_pair check ((raw_longitude is null) = (raw_latitude is null)
    and (longitude is null) = (latitude is null)),
  constraint observations_valid_point check (validation_state not in ('VALID','VERIFIED') or point is not null)
);
create index access_location_observations_access_idx on public.access_location_observations(address_access_id, observed_at desc);
create index access_location_observations_point_gix on public.access_location_observations using gist(point);

create table public.access_location_selections (
  address_access_id uuid primary key references public.address_accesses(id),
  observation_id uuid not null references public.access_location_observations(id),
  ownership_scope text not null default 'TENANT_OPERATIONAL' check (ownership_scope = 'TENANT_OPERATIONAL'),
  reason text not null check (btrim(reason) <> ''),
  selected_by uuid not null references auth.users(id),
  selected_at timestamptz not null default now()
);

create table public.manual_reconciliations (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in ('STREET','ADDRESS_ACCESS')),
  manual_entity_id uuid not null,
  official_entity_id uuid not null,
  ownership_scope text not null default 'TENANT_OPERATIONAL' check (ownership_scope = 'TENANT_OPERATIONAL'),
  review_state text not null default 'PROPOSED' check (review_state in ('PROPOSED','APPROVED','REJECTED','APPLIED')),
  reason text not null,
  proposed_by uuid not null references auth.users(id),
  proposed_at timestamptz not null default now(),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_note text
);

alter table public.census_records add column address_access_id uuid not null references public.address_accesses(id);
alter table public.doorbell_contact_proposals add column address_access_id uuid references public.address_accesses(id) on delete restrict;
create index census_records_address_access_idx on public.census_records(address_access_id);
create unique index census_records_significant_access_duplicate_uidx on public.census_records (
  census_zone_id, address_access_id, lower(btrim(last_name)),
  lower(btrim(coalesce(first_name,''))), lower(btrim(coalesce(phone,''))),
  lower(btrim(coalesce(email,''))), upper(btrim(coalesce(tax_code,''))),
  building_scope, coalesce(floor_code,'')
);

create table public.complex_address_accesses (
  complex_id uuid not null references public.complexes(id) on delete cascade,
  address_access_id uuid not null references public.address_accesses(id),
  created_at timestamptz not null default now(),
  primary key (complex_id,address_access_id)
);
create index complex_address_accesses_access_idx on public.complex_address_accesses(address_access_id);

-- Direct client mutation of shared reference entities is closed. Narrow RPCs
-- below create only motivated MANUAL exceptions in the single-tenant LAB.
revoke all on public.streets from public, anon, authenticated;
grant select on public.streets to authenticated;
drop policy if exists "lab authenticated insert" on public.streets;
drop policy if exists "lab authenticated update" on public.streets;
drop policy if exists "lab authenticated delete" on public.streets;

do $$ declare t text; begin
  foreach t in array array['anncsu_import_runs','anncsu_import_issues','localities','address_accesses',
    'street_official_revisions','access_official_revisions','access_location_observations',
    'access_location_selections','manual_reconciliations','complex_address_accesses'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
  end loop;
  foreach t in array array['localities','address_accesses','access_location_observations',
    'access_location_selections','complex_address_accesses'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy "lab authenticated read" on public.%I for select to authenticated using ((select auth.uid()) is not null)',t);
  end loop;
end $$;
grant select, insert, delete on public.complex_address_accesses to authenticated;
create policy "lab authenticated insert" on public.complex_address_accesses for insert to authenticated with check ((select auth.uid()) is not null);
create policy "lab authenticated delete" on public.complex_address_accesses for delete to authenticated using ((select auth.uid()) is not null);

comment on column public.streets.ownership_scope is 'Logical boundary only. LAB has no definitive A.R.E.A. tenant key or production RLS binding.';
comment on column public.address_accesses.ownership_scope is 'Logical boundary only. LAB has no definitive A.R.E.A. tenant key or production RLS binding.';
comment on table public.anncsu_import_runs is 'Permanent ANNCSU snapshot audit. Source artifact retention defaults to 12 months; no destructive cleanup job is installed.';

commit;
