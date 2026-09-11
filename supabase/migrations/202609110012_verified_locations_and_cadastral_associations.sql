begin;

alter table public.civics drop constraint if exists civics_geocoding_consistency;
alter table public.civics drop constraint if exists civics_geocoding_status_check;

update public.civics set geocoding_status = case geocoding_status
  when 'GEOLOCATED' then 'VERIFIED'
  when 'NEEDS_REVIEW' then case when location is not null and geocoding_source is not null and geocoded_at is not null then 'AUTO_GEOLOCATED' else 'NOT_GEOLOCATED' end
  else geocoding_status
end;

update public.civics set location = null, geocoding_source = null, geocoded_at = null, geocoding_quality = null
where geocoding_status = 'NOT_GEOLOCATED';

alter table public.civics
  add column geocoding_method text,
  add column location_verified_at timestamptz,
  add column location_verified_by uuid references auth.users(id) on delete set null,
  add constraint civics_geocoding_status_check check (geocoding_status in ('NOT_GEOLOCATED', 'AUTO_GEOLOCATED', 'VERIFIED')),
  add constraint civics_geocoding_method_check check (geocoding_method is null or geocoding_method in ('GEOCODER', 'MANUAL_MAP', 'CADASTRAL'));

update public.civics
set geocoding_method = case when geocoding_status = 'VERIFIED' then 'MANUAL_MAP' else 'GEOCODER' end,
    location_verified_at = case when geocoding_status = 'VERIFIED' then coalesce(geocoded_at, updated_at) else null end
where location is not null;

alter table public.civics
  add constraint civics_geocoding_consistency check (
    (geocoding_status = 'NOT_GEOLOCATED' and location is null and geocoding_method is null and location_verified_at is null)
    or (geocoding_status = 'AUTO_GEOLOCATED' and location is not null and geocoding_method = 'GEOCODER' and geocoding_source is not null and geocoded_at is not null and location_verified_at is null)
    or (geocoding_status = 'VERIFIED' and location is not null and geocoding_method in ('MANUAL_MAP', 'CADASTRAL') and geocoding_source is not null and geocoded_at is not null and location_verified_at is not null)
  );

comment on column public.civics.geocoding_status is 'NOT_GEOLOCATED, automatic candidate, or explicitly operator-verified civic point.';
comment on column public.civics.geocoding_method is 'Provider/method provenance. GEOCODER can never create VERIFIED state.';
comment on column public.civics.location_verified_at is 'Set only by explicit operator confirmation; proximity never verifies a point.';

create table public.cadastral_associations (
  census_record_id uuid primary key references public.census_records(id) on delete cascade,
  municipality_cadastral_code text not null,
  municipality_name text,
  section text,
  sheet text not null,
  parcel text not null,
  feature_type text,
  source text not null,
  source_layer text not null,
  source_reference jsonb,
  raw_payload jsonb,
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(municipality_cadastral_code) <> '' and btrim(sheet) <> '' and btrim(parcel) <> '')
);

comment on table public.cadastral_associations is 'Explicitly confirmed free cadastral WMS association for one property/census context; not ownership or visura data.';
comment on column public.cadastral_associations.source_reference is 'Optional query reference only; never represents the civic point or an unavailable parcel geometry.';

create trigger cadastral_associations_updated_at before update on public.cadastral_associations
for each row execute function public.set_updated_at();

alter table public.cadastral_associations enable row level security;
revoke all privileges on table public.cadastral_associations from public, anon, authenticated;
grant select, insert, update, delete on table public.cadastral_associations to authenticated;
create policy "lab authenticated read" on public.cadastral_associations for select to authenticated using ((select auth.uid()) is not null);
create policy "lab authenticated insert" on public.cadastral_associations for insert to authenticated with check ((select auth.uid()) is not null);
create policy "lab authenticated update" on public.cadastral_associations for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "lab authenticated delete" on public.cadastral_associations for delete to authenticated using ((select auth.uid()) is not null);

create or replace function public.save_civic_location_lab(p_civic_id uuid, p_location jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_status text := p_location->>'status';
  v_method text := p_location->>'method';
  v_longitude double precision := (p_location->>'longitude')::double precision;
  v_latitude double precision := (p_location->>'latitude')::double precision;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if v_status not in ('AUTO_GEOLOCATED', 'VERIFIED') then raise exception 'Invalid location status' using errcode = '22023'; end if;
  if v_method not in ('GEOCODER', 'MANUAL_MAP', 'CADASTRAL') or (v_status = 'VERIFIED' and v_method = 'GEOCODER') or (v_status = 'AUTO_GEOLOCATED' and v_method <> 'GEOCODER') then
    raise exception 'Location method cannot produce requested status' using errcode = '22023';
  end if;
  if v_longitude not between -180 and 180 or v_latitude not between -90 and 90 then raise exception 'Invalid coordinates' using errcode = '22023'; end if;

  update public.civics set
    location = extensions.st_setsrid(extensions.st_makepoint(v_longitude, v_latitude), 4326)::extensions.geography,
    geocoding_status = v_status,
    geocoding_method = v_method,
    geocoding_source = nullif(btrim(p_location->>'source'), ''),
    geocoded_at = now(),
    geocoding_quality = case when p_location ? 'quality' then (p_location->>'quality')::numeric else null end,
    location_verified_at = case when v_status = 'VERIFIED' then now() else null end,
    location_verified_by = case when v_status = 'VERIFIED' then (select auth.uid()) else null end
  where id = p_civic_id;
  if not found then raise exception 'Civic not found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.confirm_cadastral_association_lab(p_record_id uuid, p_feature jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_sheet text := nullif(btrim(p_feature->>'sheet'), '');
  v_parcel text := nullif(btrim(p_feature->>'parcel'), '');
  v_code text := nullif(btrim(p_feature->>'municipalityCode'), '');
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if v_sheet is null or v_parcel is null or v_code is null then raise exception 'Incomplete cadastral feature' using errcode = '22023'; end if;
  if not exists (select 1 from public.census_records where id = p_record_id) then raise exception 'Census record not found' using errcode = 'P0002'; end if;

  insert into public.cadastral_associations (
    census_record_id, municipality_cadastral_code, municipality_name, section, sheet, parcel, feature_type,
    source, source_layer, source_reference, raw_payload, verified_at, verified_by
  ) values (
    p_record_id, v_code, nullif(btrim(p_feature->>'municipalityName'), ''), nullif(btrim(p_feature->>'section'), ''),
    v_sheet, v_parcel, nullif(btrim(p_feature->>'featureType'), ''), 'AGENZIA_ENTRATE_INSPIRE_WMS', 'CP.CadastralParcel',
    p_feature->'sourceReference', p_feature->'rawPayload', now(), (select auth.uid())
  ) on conflict (census_record_id) do update set
    municipality_cadastral_code = excluded.municipality_cadastral_code, municipality_name = excluded.municipality_name,
    section = excluded.section, sheet = excluded.sheet, parcel = excluded.parcel, feature_type = excluded.feature_type,
    source = excluded.source, source_layer = excluded.source_layer, source_reference = excluded.source_reference,
    raw_payload = excluded.raw_payload, verified_at = excluded.verified_at, verified_by = excluded.verified_by;

  update public.census_records set sheet = v_sheet, parcel = v_parcel where id = p_record_id;
end $$;

revoke all on function public.save_civic_location_lab(uuid, jsonb) from public, anon;
revoke all on function public.confirm_cadastral_association_lab(uuid, jsonb) from public, anon;
grant execute on function public.save_civic_location_lab(uuid, jsonb) to authenticated;
grant execute on function public.confirm_cadastral_association_lab(uuid, jsonb) to authenticated;

commit;
