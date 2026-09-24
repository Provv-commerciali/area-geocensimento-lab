begin;

create or replace function public.assert_territorial_identity_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'streets' then
    if new.source_kind is distinct from old.source_kind or new.ownership_scope is distinct from old.ownership_scope
      or new.anncsu_progressivo_nazionale is distinct from old.anncsu_progressivo_nazionale
      or new.first_seen_run_id is distinct from old.first_seen_run_id
      or new.municipality_id is distinct from old.municipality_id
      or new.manual_author is distinct from old.manual_author
      or new.manual_created_at is distinct from old.manual_created_at then
      raise exception 'Street identity and origin are immutable' using errcode='23514';
    end if;
  else
    if new.source_kind is distinct from old.source_kind or new.ownership_scope is distinct from old.ownership_scope
      or new.anncsu_progressivo_accesso is distinct from old.anncsu_progressivo_accesso
      or new.first_seen_run_id is distinct from old.first_seen_run_id
      or new.manual_author is distinct from old.manual_author
      or new.manual_created_at is distinct from old.manual_created_at then
      raise exception 'AddressAccess identity and origin are immutable' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger streets_identity_guard before update on public.streets
  for each row execute function public.assert_territorial_identity_lab();
create trigger address_accesses_identity_guard before update on public.address_accesses
  for each row execute function public.assert_territorial_identity_lab();

create or replace function public.assert_access_location_selection_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.access_location_observations o
    where o.id=new.observation_id and o.address_access_id=new.address_access_id
      and o.point is not null and o.validation_state in ('VALID','VERIFIED')) then
    raise exception 'Effective location must be a valid observation of the same Access' using errcode='23503';
  end if;
  return new;
end $$;
create trigger access_effective_location_guard before insert or update on public.access_location_selections
  for each row execute function public.assert_access_location_selection_lab();

create or replace function public.assert_zone_street_municipality_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.census_zones z join public.streets s on s.id = new.street_id
    where z.id = new.census_zone_id and z.municipality_id = s.municipality_id
      and (s.source_kind = 'OFFICIAL_ANNCSU' or s.manual_review_state <> 'RETIRED')
  ) then raise exception 'Street must belong to the Zone municipality and be active' using errcode = '23503'; end if;
  return new;
end $$;
create trigger census_zone_street_municipality before insert or update on public.census_zone_streets
  for each row execute function public.assert_zone_street_municipality_lab();

create or replace function public.assert_access_source_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_kind text; v_state text;
begin
  select source_kind, manual_review_state into v_kind, v_state from public.streets where id = new.street_id;
  if new.source_kind = 'OFFICIAL_ANNCSU' and v_kind <> 'OFFICIAL_ANNCSU' then
    raise exception 'Official access requires official Street' using errcode = '23503';
  end if;
  if new.source_kind = 'MANUAL' and v_state = 'RETIRED' then
    raise exception 'Manual access cannot belong to a retired Street' using errcode = '23503';
  end if;
  return new;
end $$;
create trigger address_access_source before insert or update on public.address_accesses
  for each row execute function public.assert_access_source_lab();

create or replace function public.assert_complex_access_zone_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.complexes c
    join public.census_zone_streets zs on zs.census_zone_id = c.census_zone_id
    join public.address_accesses a on a.street_id = zs.street_id
    where c.id = new.complex_id and a.id = new.address_access_id
  ) then raise exception 'Complex access must belong to its Zone' using errcode = '23503'; end if;
  return new;
end $$;
create trigger complex_address_access_zone before insert or update on public.complex_address_accesses
  for each row execute function public.assert_complex_access_zone_lab();

create or replace function public.assert_record_access_zone_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.census_zone_streets zs
    join public.address_accesses a on a.street_id = zs.street_id
    where zs.census_zone_id = new.census_zone_id and a.id = new.address_access_id
  ) then raise exception 'AddressAccess must belong to the Zone' using errcode = '23503'; end if;
  if new.complex_id is not null and not exists (
    select 1 from public.complex_address_accesses ca join public.complexes c on c.id = ca.complex_id
    where ca.complex_id = new.complex_id and ca.address_access_id = new.address_access_id
      and c.census_zone_id = new.census_zone_id
  ) then raise exception 'Complex must include the AddressAccess in the Zone' using errcode = '23503'; end if;
  return new;
end $$;
create trigger census_record_access_zone before insert or update of census_zone_id,address_access_id,complex_id
  on public.census_records for each row execute function public.assert_record_access_zone_lab();

create or replace function public.create_census_zone_lab(
  p_country_id uuid, p_region_id uuid, p_province_id uuid, p_municipality_id uuid,
  p_name text, p_assignee_operator_id uuid, p_street_ids uuid[] default array[]::uuid[],
  p_new_street_name text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_zone_id uuid; v_expected integer; v_found integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if nullif(btrim(p_name),'') is null then raise exception 'Zone name is required' using errcode = '22023'; end if;
  if nullif(btrim(p_new_street_name),'') is not null then raise exception 'Use the motivated manual Street workflow' using errcode = '22023'; end if;
  if not exists (select 1 from public.countries c join public.regions r on r.country_id=c.id
    join public.provinces p on p.region_id=r.id join public.municipalities m on m.province_id=p.id
    where c.id=p_country_id and r.id=p_region_id and p.id=p_province_id and m.id=p_municipality_id)
  then raise exception 'Invalid territorial hierarchy' using errcode = '23503'; end if;
  select count(distinct x) into v_expected from unnest(coalesce(p_street_ids,array[]::uuid[])) x;
  select count(*) into v_found from public.streets s
    where s.id = any(coalesce(p_street_ids,array[]::uuid[])) and s.municipality_id=p_municipality_id
      and (s.source_kind='OFFICIAL_ANNCSU' or s.manual_review_state <> 'RETIRED');
  if v_found <> v_expected then raise exception 'Street selection contains another Municipality or retired exception' using errcode='23503'; end if;
  insert into public.census_zones(municipality_id,name,assignee_operator_id)
    values(p_municipality_id,btrim(p_name),p_assignee_operator_id) returning id into v_zone_id;
  insert into public.census_zone_streets(census_zone_id,street_id)
    select v_zone_id,s.id from public.streets s where s.id=any(coalesce(p_street_ids,array[]::uuid[]));
  return v_zone_id;
end $$;

create or replace function public.attach_street_to_zone_lab(
  p_zone_id uuid, p_existing_street_id uuid default null, p_new_street_name text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(p_new_street_name),'') is not null then raise exception 'Use the motivated manual Street workflow' using errcode='22023'; end if;
  if p_existing_street_id is null then raise exception 'Select an existing Street' using errcode='22023'; end if;
  insert into public.census_zone_streets(census_zone_id,street_id) values(p_zone_id,p_existing_street_id)
    on conflict do nothing;
  return p_existing_street_id;
end $$;

create or replace function public.create_manual_street_lab(p_municipality_id uuid,p_name text,p_locality text,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(p_name),'') is null or nullif(btrim(p_reason),'') is null then
    raise exception 'Street and reason are required' using errcode='22023'; end if;
  if not exists(select 1 from public.municipalities where id=p_municipality_id) then
    raise exception 'Municipality not found' using errcode='23503'; end if;
  insert into public.streets(municipality_id,name,source_kind,ownership_scope,locality_name,
    manual_reason,manual_author,manual_created_at,manual_review_state)
    values(p_municipality_id,btrim(p_name),'MANUAL','TENANT_OPERATIONAL',nullif(btrim(p_locality),''),
      btrim(p_reason),(select auth.uid()),now(),'PROPOSED') returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_manual_access_lab(
  p_street_id uuid,p_civic text,p_exponent text,p_metric text,p_snc text,p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(p_reason),'') is null or
    (nullif(btrim(p_civic),'') is null and nullif(btrim(p_metric),'') is null and nullif(btrim(p_snc),'') is null)
  then raise exception 'Access numbering and reason are required' using errcode='22023'; end if;
  if not exists(select 1 from public.streets where id=p_street_id and
    (source_kind='OFFICIAL_ANNCSU' or manual_review_state <> 'RETIRED')) then
    raise exception 'Street unavailable' using errcode='23503'; end if;
  insert into public.address_accesses(street_id,source_kind,ownership_scope,civic,exponent,metric,progressivo_snc,
    manual_reason,manual_author,manual_created_at,manual_review_state)
    values(p_street_id,'MANUAL','TENANT_OPERATIONAL',nullif(btrim(p_civic),''),nullif(btrim(p_exponent),''),
      nullif(btrim(p_metric),''),nullif(btrim(p_snc),''),btrim(p_reason),(select auth.uid()),now(),'PROPOSED')
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_manual_street_for_zone_lab(p_zone_id uuid,p_name text,p_locality text,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_municipality_id uuid; v_street_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select municipality_id into strict v_municipality_id from public.census_zones where id=p_zone_id;
  v_street_id := public.create_manual_street_lab(v_municipality_id,p_name,p_locality,p_reason);
  insert into public.census_zone_streets(census_zone_id,street_id) values(p_zone_id,v_street_id);
  return v_street_id;
end $$;

create or replace function public.save_access_location_lab(p_address_access_id uuid,p_location jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_source text := p_location->>'method'; v_lon numeric(10,7); v_lat numeric(10,7); v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if v_source not in ('GEOCODER','MANUAL_MAP','CADASTRAL') then raise exception 'Invalid method' using errcode='22023'; end if;
  if p_location->>'status' = 'VERIFIED' and v_source = 'GEOCODER' then raise exception 'Geocoder cannot verify' using errcode='22023'; end if;
  if p_location->>'status' not in ('VERIFIED','AUTO_GEOLOCATED') then raise exception 'Invalid status' using errcode='22023'; end if;
  v_lon := (p_location->>'longitude')::numeric(10,7); v_lat := (p_location->>'latitude')::numeric(10,7);
  if v_lon not between -180 and 180 or v_lat not between -90 and 90 then raise exception 'Invalid coordinates' using errcode='22023'; end if;
  if not exists(select 1 from public.address_accesses where id=p_address_access_id) then raise exception 'Access not found' using errcode='P0002'; end if;
  insert into public.access_location_observations(address_access_id,source_kind,ownership_scope,source_crs,
    raw_longitude,raw_latitude,longitude,latitude,point,validation_state,source_reference,source_fingerprint,author)
    values(p_address_access_id,case when v_source='GEOCODER' then 'GEOCODER' else 'OPERATOR' end,
      'TENANT_OPERATIONAL','EPSG:4326',p_location->>'longitude',p_location->>'latitude',v_lon,v_lat,
      extensions.st_transform(extensions.st_setsrid(extensions.st_makepoint(v_lon::double precision,v_lat::double precision),4326),6706),
      case when p_location->>'status'='VERIFIED' then 'VERIFIED' else 'CANDIDATE' end,
      p_location->>'source',md5(p_location::text || now()::text),(select auth.uid())) returning id into v_id;
  if p_location->>'status'='VERIFIED' then
    insert into public.access_location_selections(address_access_id,observation_id,reason,selected_by)
      values(p_address_access_id,v_id,'Operator verified location',(select auth.uid()))
      on conflict (address_access_id) do update set observation_id=excluded.observation_id,
        reason=excluded.reason,selected_by=excluded.selected_by,selected_at=now();
  end if;
end $$;

create or replace function public.zone_access_counts_lab(p_zone_id uuid)
returns table(street_count bigint, access_count bigint, located_count bigint, unlocated_count bigint)
language sql stable security invoker set search_path = '' as $$
  select count(distinct zs.street_id), count(a.id),
    count(a.id) filter (where exists (
      select 1 from public.access_location_observations o where o.address_access_id=a.id
        and o.source_kind='ANNCSU' and o.validation_state='VALID' and o.point is not null)),
    count(a.id) filter (where not exists (
      select 1 from public.access_location_observations o where o.address_access_id=a.id
        and o.source_kind='ANNCSU' and o.validation_state='VALID' and o.point is not null))
  from public.census_zone_streets zs left join public.address_accesses a on a.street_id=zs.street_id
  where zs.census_zone_id=p_zone_id;
$$;

create or replace function public.zone_address_accesses_lab(p_zone_id uuid,p_limit integer default 100,p_offset integer default 0)
returns table(id uuid,street_id uuid,street_name text,anncsu_progressivo_accesso text,
  source_kind text,civic text,exponent text,specificity text,metric text,progressivo_snc text,
  longitude numeric,latitude numeric,location_crs text,location_source text)
language sql stable security invoker set search_path = '' as $$
  select a.id,a.street_id,s.name,a.anncsu_progressivo_accesso,a.source_kind,
    a.civic,a.exponent,a.specificity,a.metric,a.progressivo_snc,
    o.longitude,o.latitude,o.source_crs,o.source_kind
  from public.census_zone_streets zs
  join public.streets s on s.id=zs.street_id
  join public.address_accesses a on a.street_id=s.id
  left join public.access_location_selections sel on sel.address_access_id=a.id
  left join lateral (
    select obs.longitude,obs.latitude,obs.source_crs,obs.source_kind
    from public.access_location_observations obs
    where obs.address_access_id=a.id and obs.point is not null and
      ((sel.observation_id is not null and obs.id=sel.observation_id) or
       (sel.observation_id is null and ((obs.source_kind='ANNCSU' and obs.validation_state='VALID')
         or (obs.source_kind='GEOCODER' and obs.validation_state='CANDIDATE'))))
    order by (obs.id=sel.observation_id) desc,(obs.source_kind='ANNCSU') desc,obs.observed_at desc limit 1
  ) o on true
  where zs.census_zone_id=p_zone_id
  order by s.name,a.anncsu_progressivo_accesso nulls last,a.id
  limit least(greatest(p_limit,1),200) offset greatest(p_offset,0);
$$;

create or replace function public.access_effective_locations_lab(p_access_ids uuid[])
returns table(address_access_id uuid,longitude double precision,latitude double precision,
  location_status text,location_source text,observed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select a.id,extensions.st_x(extensions.st_transform(o.point,4326)),
    extensions.st_y(extensions.st_transform(o.point,4326)),
    case when o.validation_state='VERIFIED' then 'VERIFIED' else 'AUTO_GEOLOCATED' end,
    o.source_kind,o.observed_at
  from public.address_accesses a
  left join public.access_location_selections sel on sel.address_access_id=a.id
  join lateral (
    select obs.point,obs.validation_state,obs.source_kind,obs.observed_at
    from public.access_location_observations obs
    where obs.address_access_id=a.id and obs.point is not null and
      ((sel.observation_id is not null and obs.id=sel.observation_id) or
       (sel.observation_id is null and ((obs.source_kind='ANNCSU' and obs.validation_state='VALID')
         or (obs.source_kind='GEOCODER' and obs.validation_state='CANDIDATE'))))
    order by (obs.id=sel.observation_id) desc,(obs.source_kind='ANNCSU') desc,obs.observed_at desc limit 1
  ) o on true
  where a.id=any(p_access_ids);
$$;

revoke all on function public.create_manual_street_lab(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.create_manual_access_lab(uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.create_manual_street_for_zone_lab(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.save_access_location_lab(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.create_manual_street_lab(uuid,text,text,text) to authenticated;
grant execute on function public.create_manual_access_lab(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.create_manual_street_for_zone_lab(uuid,text,text,text) to authenticated;
grant execute on function public.save_access_location_lab(uuid,jsonb) to authenticated;
grant execute on function public.zone_access_counts_lab(uuid) to authenticated;
grant execute on function public.zone_address_accesses_lab(uuid,integer,integer) to authenticated;
grant execute on function public.access_effective_locations_lab(uuid[]) to authenticated;

commit;
