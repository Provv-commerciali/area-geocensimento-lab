begin;

alter table public.census_records
  drop constraint census_records_scope_floor_check,
  add constraint census_records_scope_floor_check check (
    (building_scope = 'Intero edificio' and floor_code is null and is_top_floor = false)
    or (building_scope = 'Parte di edificio' and floor_code is not null)
  ) not valid,
  add constraint census_records_floor_within_total_check check (
    total_floors is null
    or floor_code !~ '^[1-9][0-9]*°$'
    or substring(floor_code from '^([0-9]+)°$')::integer <= total_floors
  ) not valid;

alter table public.census_records validate constraint census_records_scope_floor_check;
alter table public.census_records validate constraint census_records_floor_within_total_check;

-- Record creation and interview history are distinct domain actions. Keep the
-- two-argument signature for a zero-downtime application rollout, but reject
-- any attempt to smuggle an interview into record creation.
create or replace function public.create_census_record_lab(
  p_record jsonb,
  p_interview jsonb default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_record_id uuid;
  v_contact_type_id smallint;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_interview is not null then
    raise exception 'Interviews must be created with an explicit interview action' using errcode = '22023';
  end if;

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
    select 1 from public.census_records r
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

  return v_record_id;
end;
$$;

create or replace function public.create_census_interview_lab(
  p_record_id uuid,
  p_interview jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_interview_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.census_records where id = p_record_id) then
    raise exception 'Census record not found' using errcode = 'P0002';
  end if;
  if nullif(p_interview->>'operatorId', '') is null or nullif(p_interview->>'interviewDate', '') is null then
    raise exception 'Operator and interview date are required' using errcode = '22023';
  end if;

  insert into public.census_interviews (
    census_record_id, operator_id, interview_date, recall_date, response, reason, outcome
  ) values (
    p_record_id,
    (p_interview->>'operatorId')::uuid,
    (p_interview->>'interviewDate')::date,
    nullif(p_interview->>'recallDate', '')::date,
    nullif(btrim(p_interview->>'response'), ''),
    nullif(btrim(p_interview->>'reason'), ''),
    nullif(btrim(p_interview->>'outcome'), '')
  ) returning id into v_interview_id;

  return v_interview_id;
end;
$$;

alter function public.create_census_zone_lab(uuid, uuid, uuid, uuid, text, uuid, uuid[], text) security invoker;
alter function public.attach_street_to_zone_lab(uuid, uuid, text) security invoker;
alter function public.add_civics_to_street_lab(uuid, jsonb) security invoker;

revoke all on function public.create_census_interview_lab(uuid, jsonb) from public, anon;
grant execute on function public.create_census_interview_lab(uuid, jsonb) to authenticated;

-- A reusable, RLS-aware projection for filters and future consumers. Status is
-- derived exclusively from real child rows; no mutable flag or synthetic event.
create or replace view public.census_record_contact_status
with (security_invoker = true)
as
select
  r.id as census_record_id,
  exists (
    select 1 from public.census_interviews i where i.census_record_id = r.id
  ) as has_interviews,
  (
    select max(i.interview_date) from public.census_interviews i where i.census_record_id = r.id
  ) as latest_interview_date
from public.census_records r;

revoke all on public.census_record_contact_status from public, anon;
grant select on public.census_record_contact_status to authenticated;

commit;
