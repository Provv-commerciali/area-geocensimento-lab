begin;

-- Extend the existing normalized hierarchy without replacing rows already
-- referenced by LAB zones. The importer reconciles the Bologna demo rows in
-- place, so their UUIDs and every dependent foreign key remain stable.
alter table public.regions
  add column istat_code text,
  add column geographic_division_code text,
  add column geographic_division_name text,
  add column source text,
  add column source_updated_on date,
  add column is_active boolean not null default true;

alter table public.provinces
  add column istat_code text,
  add column territorial_unit_type smallint,
  add column source text,
  add column source_updated_on date,
  add column is_active boolean not null default true;

alter table public.municipalities
  add column istat_code text,
  add column italian_name text,
  add column other_language_name text,
  add column source text,
  add column source_updated_on date,
  add column is_active boolean not null default true;

alter table public.regions
  add constraint regions_istat_code_key unique (istat_code),
  add constraint regions_istat_code_check check (istat_code is null or istat_code ~ '^[0-9]{2}$');

alter table public.provinces
  add constraint provinces_istat_code_key unique (istat_code),
  add constraint provinces_istat_code_check check (istat_code is null or istat_code ~ '^[0-9]{3}$'),
  add constraint provinces_territorial_unit_type_check check (territorial_unit_type is null or territorial_unit_type between 1 and 5);

alter table public.municipalities
  add constraint municipalities_istat_code_key unique (istat_code),
  add constraint municipalities_istat_code_check check (istat_code is null or istat_code ~ '^[0-9]{6}$');

create index regions_country_active_idx on public.regions (country_id, is_active, name);
create index provinces_region_active_idx on public.provinces (region_id, is_active, name);
create index municipalities_province_active_idx on public.municipalities (province_id, is_active, name);

-- NUTS3 and ISTAT intermediate units are not always one-to-one (the official
-- workbook maps some 2026 Sardinian units to multiple NUTS3 areas).
create table public.province_nuts3_codes (
  province_id uuid not null references public.provinces(id) on delete cascade,
  nomenclature_year smallint not null,
  nuts3_code text not null,
  source_updated_on date not null,
  is_active boolean not null default true,
  primary key (province_id, nomenclature_year, nuts3_code)
);

alter table public.province_nuts3_codes enable row level security;
create policy "lab authenticated read" on public.province_nuts3_codes
for select to authenticated using ((select auth.uid()) is not null);
grant select on table public.province_nuts3_codes to authenticated;
revoke insert, update, delete on table public.province_nuts3_codes from authenticated;

create table public.territorial_dataset_imports (
  id bigint generated always as identity primary key,
  source text not null,
  source_url text not null,
  source_updated_on date not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  region_count integer not null check (region_count > 0),
  province_count integer not null check (province_count > 0),
  municipality_count integer not null check (municipality_count > 0),
  imported_at timestamptz not null default now()
);

alter table public.territorial_dataset_imports enable row level security;
revoke all privileges on table public.territorial_dataset_imports from public, anon, authenticated;
revoke all privileges on sequence public.territorial_dataset_imports_id_seq from public, anon, authenticated;

-- Reference tables remain read-only to browser clients. Existing SELECT grants
-- automatically cover the new columns and RLS remains enabled.
revoke insert, update, delete on table public.countries, public.regions, public.provinces, public.municipalities from authenticated;

create or replace function public.require_active_zone_municipality()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.municipalities municipality
    join public.provinces province on province.id = municipality.province_id
    join public.regions region on region.id = province.region_id
    where municipality.id = new.municipality_id
      and municipality.is_active
      and province.is_active
      and region.is_active
  ) then
    raise exception 'Census zones require an active territorial hierarchy' using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger census_zones_active_municipality
before insert or update of municipality_id on public.census_zones
for each row execute function public.require_active_zone_municipality();

revoke all on function public.require_active_zone_municipality() from public, anon, authenticated;

commit;
