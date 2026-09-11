begin;

-- Normalize existing LAB values before introducing controlled vocabularies.
update public.census_records
set occupancy = 'Occupato dal proprietario'
where occupancy = 'Occupato';

alter table public.census_records
  add column floor_code text,
  add column total_floors integer,
  add column is_top_floor boolean not null default false;

-- Preserve the seed and existing manually-entered floor information where it
-- can be interpreted without inventing domain semantics.
update public.census_records
set
  floor_code = case
    when floor_label in ('Interrato', 'Seminterrato', 'Terra', 'Rialzato') then floor_label
    when floor_label ~ '^[0-9]+°' then substring(floor_label from '^([0-9]+°)')
    else null
  end,
  total_floors = case
    when floor_label ~ ' di [0-9]+$' then substring(floor_label from ' di ([0-9]+)$')::integer
    else null
  end
where building_scope = 'Parte di edificio';

alter table public.census_records
  add constraint census_records_qualification_check
    check (qualification is null or qualification in ('Proprietario', 'Inquilino')) not valid,
  add constraint census_records_occupancy_check
    check (occupancy is null or occupancy in (
      'Libero',
      'Libero al rogito',
      'Occupato dal proprietario',
      'Occupato dall''inquilino',
      'Inagibile'
    )) not valid,
  add constraint census_records_floor_code_check
    check (
      floor_code is null
      or floor_code in ('Interrato', 'Seminterrato', 'Terra', 'Rialzato')
      or floor_code ~ '^[1-9][0-9]*°$'
    ) not valid,
  add constraint census_records_total_floors_check
    check (total_floors is null or total_floors > 0) not valid,
  add constraint census_records_scope_floor_check
    check (
      (building_scope = 'Intero edificio' and floor_code is null and is_top_floor = false)
      or building_scope = 'Parte di edificio'
    ) not valid;

alter table public.census_records validate constraint census_records_qualification_check;
alter table public.census_records validate constraint census_records_occupancy_check;
alter table public.census_records validate constraint census_records_floor_code_check;
alter table public.census_records validate constraint census_records_total_floors_check;
alter table public.census_records validate constraint census_records_scope_floor_check;

-- Generated normalized keys preserve display values while preventing physical
-- duplicates caused by case or redundant whitespace.
alter table public.streets
  add column normalized_name text generated always as (
    lower(regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'))
  ) stored;

create unique index streets_municipality_normalized_name_uidx
  on public.streets (municipality_id, normalized_name);

alter table public.civics
  add column normalized_number text generated always as (
    lower(regexp_replace(btrim(number), '[[:space:]]+', '', 'g'))
  ) stored,
  add column normalized_extension text generated always as (
    lower(regexp_replace(btrim(coalesce(extension, '')), '[[:space:]]+', ' ', 'g'))
  ) stored;

create unique index civics_street_normalized_number_extension_uidx
  on public.civics (street_id, normalized_number, normalized_extension);

-- The same person name remains valid in different census/property contexts.
-- Only an identical normalized identity + location + building/floor combination
-- is rejected, also protecting against concurrent double submissions.
create unique index census_records_significant_duplicate_uidx
  on public.census_records (
    census_zone_id,
    civic_id,
    lower(btrim(last_name)),
    lower(btrim(coalesce(first_name, ''))),
    lower(btrim(coalesce(phone, ''))),
    lower(btrim(coalesce(email, ''))),
    upper(btrim(coalesce(tax_code, ''))),
    building_scope,
    coalesce(floor_code, '')
  );

create or replace function public.create_census_zone_lab(
  p_country_id uuid,
  p_region_id uuid,
  p_province_id uuid,
  p_municipality_id uuid,
  p_name text,
  p_assignee_operator_id uuid,
  p_street_ids uuid[] default array[]::uuid[],
  p_new_street_name text default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_zone_id uuid;
  v_street_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Zone name is required' using errcode = '22023'; end if;
  if not exists (
    select 1
    from public.countries c
    join public.regions r on r.country_id = c.id
    join public.provinces p on p.region_id = r.id
    join public.municipalities m on m.province_id = p.id
    where c.id = p_country_id and r.id = p_region_id and p.id = p_province_id and m.id = p_municipality_id
  ) then
    raise exception 'Invalid territorial hierarchy' using errcode = '23503';
  end if;

  insert into public.census_zones (municipality_id, name, assignee_operator_id)
  values (p_municipality_id, btrim(p_name), p_assignee_operator_id)
  returning id into v_zone_id;

  insert into public.census_zone_streets (census_zone_id, street_id)
  select v_zone_id, s.id
  from public.streets s
  where s.id = any(coalesce(p_street_ids, array[]::uuid[]))
    and s.municipality_id = p_municipality_id
  on conflict do nothing;

  if nullif(btrim(p_new_street_name), '') is not null then
    insert into public.streets (municipality_id, name)
    values (p_municipality_id, btrim(p_new_street_name))
    on conflict (municipality_id, normalized_name)
    do update set name = excluded.name
    returning id into v_street_id;

    insert into public.census_zone_streets (census_zone_id, street_id)
    values (v_zone_id, v_street_id)
    on conflict do nothing;
  end if;

  return v_zone_id;
end;
$$;

create or replace function public.attach_street_to_zone_lab(
  p_zone_id uuid,
  p_existing_street_id uuid default null,
  p_new_street_name text default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_municipality_id uuid;
  v_street_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select municipality_id into strict v_municipality_id from public.census_zones where id = p_zone_id;

  if p_existing_street_id is not null then
    select id into strict v_street_id
    from public.streets
    where id = p_existing_street_id and municipality_id = v_municipality_id;
  elsif nullif(btrim(p_new_street_name), '') is not null then
    insert into public.streets (municipality_id, name)
    values (v_municipality_id, btrim(p_new_street_name))
    on conflict (municipality_id, normalized_name)
    do update set name = excluded.name
    returning id into v_street_id;
  else
    raise exception 'Select or create a street' using errcode = '22023';
  end if;

  insert into public.census_zone_streets (census_zone_id, street_id)
  values (p_zone_id, v_street_id)
  on conflict do nothing;
  return v_street_id;
end;
$$;

create or replace function public.add_civics_to_street_lab(
  p_street_id uuid,
  p_civics jsonb
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_civics) <> 'array' then raise exception 'Civics must be an array' using errcode = '22023'; end if;

  insert into public.civics (street_id, number, extension)
  select
    p_street_id,
    btrim(entry->>'number'),
    nullif(btrim(entry->>'extension'), '')
  from jsonb_array_elements(p_civics) entry
  where nullif(btrim(entry->>'number'), '') is not null
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.create_census_record_lab(
  p_record jsonb,
  p_interview jsonb default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_record_id uuid;
  v_contact_type_id smallint;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;

  select id into strict v_contact_type_id
  from public.contact_types
  where label = p_record->>'contactType';

  if not exists (
    select 1
    from public.census_zone_streets czs
    join public.civics c on c.street_id = czs.street_id
    where czs.census_zone_id = (p_record->>'zoneId')::uuid
      and czs.street_id = (p_record->>'streetId')::uuid
      and c.id = (p_record->>'civicId')::uuid
  ) then
    raise exception 'The selected zone, street and civic are not associated' using errcode = '23503';
  end if;

  if nullif(p_record->>'complexId', '') is not null and not exists (
    select 1 from public.complex_civics cc
    where cc.complex_id = (p_record->>'complexId')::uuid
      and cc.civic_id = (p_record->>'civicId')::uuid
  ) then
    raise exception 'The selected complex is not associated with the civic' using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.census_records r
    where r.census_zone_id = (p_record->>'zoneId')::uuid
      and r.civic_id = (p_record->>'civicId')::uuid
      and lower(btrim(r.last_name)) = lower(btrim(p_record->>'lastName'))
      and lower(btrim(coalesce(r.first_name, ''))) = lower(btrim(coalesce(p_record->>'firstName', '')))
      and lower(btrim(coalesce(r.phone, ''))) = lower(btrim(coalesce(p_record->>'phone', '')))
      and lower(btrim(coalesce(r.email, ''))) = lower(btrim(coalesce(p_record->>'email', '')))
      and lower(btrim(coalesce(r.tax_code, ''))) = lower(btrim(coalesce(p_record->>'taxCode', '')))
      and r.building_scope = p_record->>'buildingScope'
      and lower(btrim(coalesce(r.floor_code, ''))) = lower(btrim(coalesce(p_record->>'floorCode', '')))
  ) then
    raise exception 'An identical census record already exists for this contact and location' using errcode = '23505';
  end if;

  insert into public.census_records (
    census_zone_id, street_id, civic_id, complex_id, contact_type_id,
    responsible_operator_id, first_name, last_name, phone, email, tax_code,
    qualification, inherited, birth_date, personal_notes, building_scope,
    levels, floor_code, total_floors, is_top_floor, rooms, surface_sqm,
    occupancy, has_elevator, sheet, parcel, subaltern, cadastral_category,
    is_appraised
  ) values (
    (p_record->>'zoneId')::uuid,
    (p_record->>'streetId')::uuid,
    (p_record->>'civicId')::uuid,
    nullif(p_record->>'complexId', '')::uuid,
    v_contact_type_id,
    nullif(p_record->>'responsibleOperatorId', '')::uuid,
    nullif(btrim(p_record->>'firstName'), ''),
    btrim(p_record->>'lastName'),
    nullif(btrim(p_record->>'phone'), ''),
    nullif(lower(btrim(p_record->>'email')), ''),
    nullif(upper(btrim(p_record->>'taxCode')), ''),
    nullif(p_record->>'qualification', ''),
    coalesce((p_record->>'inherited')::boolean, false),
    nullif(p_record->>'birthDate', '')::date,
    nullif(btrim(p_record->>'notes'), ''),
    p_record->>'buildingScope',
    nullif(p_record->>'levels', '')::integer,
    nullif(p_record->>'floorCode', ''),
    nullif(p_record->>'totalFloors', '')::integer,
    coalesce((p_record->>'isTopFloor')::boolean, false),
    nullif(p_record->>'rooms', '')::numeric,
    nullif(p_record->>'surface', '')::numeric,
    nullif(p_record->>'occupancy', ''),
    nullif(p_record->>'elevator', '')::boolean,
    nullif(btrim(p_record->>'sheet'), ''),
    nullif(btrim(p_record->>'parcel'), ''),
    nullif(btrim(p_record->>'subaltern'), ''),
    nullif(btrim(p_record->>'cadastralCategory'), ''),
    coalesce((p_record->>'isAppraised')::boolean, false)
  ) returning id into v_record_id;

  if p_interview is not null and nullif(p_interview->>'interviewDate', '') is not null then
    insert into public.census_interviews (
      census_record_id, operator_id, interview_date, recall_date, response, reason, outcome
    ) values (
      v_record_id,
      (p_interview->>'operatorId')::uuid,
      (p_interview->>'interviewDate')::date,
      nullif(p_interview->>'recallDate', '')::date,
      nullif(btrim(p_interview->>'response'), ''),
      nullif(btrim(p_interview->>'reason'), ''),
      nullif(btrim(p_interview->>'outcome'), '')
    );
  end if;

  return v_record_id;
end;
$$;

revoke all on function public.create_census_zone_lab(uuid, uuid, uuid, uuid, text, uuid, uuid[], text) from public, anon;
revoke all on function public.attach_street_to_zone_lab(uuid, uuid, text) from public, anon;
revoke all on function public.add_civics_to_street_lab(uuid, jsonb) from public, anon;
revoke all on function public.create_census_record_lab(jsonb, jsonb) from public, anon;

grant execute on function public.create_census_zone_lab(uuid, uuid, uuid, uuid, text, uuid, uuid[], text) to authenticated;
grant execute on function public.attach_street_to_zone_lab(uuid, uuid, text) to authenticated;
grant execute on function public.add_civics_to_street_lab(uuid, jsonb) to authenticated;
grant execute on function public.create_census_record_lab(jsonb, jsonb) to authenticated;

commit;
