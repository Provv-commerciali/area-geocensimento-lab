begin;

alter table public.census_record_subjects
  drop constraint if exists census_record_subjects_role_check;
alter table public.census_record_subjects
  add constraint census_record_subjects_role_check
  check (role in ('Proprietario', 'Comproprietario', 'Inquilino', 'Non specificato'));

create or replace function public.link_subject_to_census_record_lab(
  p_record_id uuid,
  p_subject_id uuid,
  p_role text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_role not in ('Proprietario', 'Comproprietario', 'Inquilino') then raise exception 'Invalid relationship role' using errcode = '22023'; end if;
  insert into public.census_record_subjects (census_record_id, subject_id, role, is_primary)
  values (p_record_id, p_subject_id, p_role, false)
  on conflict (census_record_id, subject_id) do update set role = excluded.role;
end;
$$;

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
  v_subject_id uuid;
  v_contact_type_id smallint;
  v_role text := p_record->>'relationshipRole';
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_interview is not null then raise exception 'Interviews must be created with an explicit interview action' using errcode = '22023'; end if;
  if v_role not in ('Proprietario', 'Comproprietario', 'Inquilino') then raise exception 'Invalid relationship role' using errcode = '22023'; end if;

  if nullif(p_record->>'existingSubjectId', '') is not null then
    select id into strict v_subject_id from public.subjects where id = (p_record->>'existingSubjectId')::uuid;
  else
    v_subject_id := public.create_subject_lab(p_record->'subject');
  end if;

  select id into strict v_contact_type_id from public.contact_types where label = p_record->>'contactType';

  if not exists (
    select 1 from public.census_zone_streets czs
    join public.civics c on c.street_id = czs.street_id
    where czs.census_zone_id = (p_record->>'zoneId')::uuid
      and czs.street_id = (p_record->>'streetId')::uuid
      and c.id = (p_record->>'civicId')::uuid
  ) then raise exception 'The selected zone, street and civic are not associated' using errcode = '23503'; end if;

  if nullif(p_record->>'complexId', '') is not null and not exists (
    select 1 from public.complex_civics cc
    where cc.complex_id = (p_record->>'complexId')::uuid and cc.civic_id = (p_record->>'civicId')::uuid
  ) then raise exception 'The selected complex is not associated with the civic' using errcode = '23503'; end if;

  if exists (
    select 1 from public.census_records r
    join public.census_record_subjects crs on crs.census_record_id = r.id
    where crs.subject_id = v_subject_id
      and r.census_zone_id = (p_record->>'zoneId')::uuid
      and r.civic_id = (p_record->>'civicId')::uuid
      and r.building_scope = p_record->>'buildingScope'
      and coalesce(r.floor_code, '') = coalesce(p_record->>'floorCode', '')
      and coalesce(r.subaltern, '') = coalesce(p_record->>'subaltern', '')
  ) then raise exception 'This subject is already linked to an identical property context' using errcode = '23505'; end if;

  insert into public.census_records (
    census_zone_id, street_id, civic_id, complex_id, contact_type_id,
    responsible_operator_id, building_scope, levels, floor_code, total_floors,
    is_top_floor, rooms, surface_sqm, occupancy, has_elevator, sheet, parcel,
    subaltern, cadastral_category, inherited, is_appraised
  ) values (
    (p_record->>'zoneId')::uuid, (p_record->>'streetId')::uuid, (p_record->>'civicId')::uuid,
    nullif(p_record->>'complexId', '')::uuid, v_contact_type_id,
    nullif(p_record->>'responsibleOperatorId', '')::uuid, p_record->>'buildingScope',
    nullif(p_record->>'levels', '')::integer, nullif(p_record->>'floorCode', ''),
    nullif(p_record->>'totalFloors', '')::integer, coalesce((p_record->>'isTopFloor')::boolean, false),
    nullif(p_record->>'rooms', '')::numeric, nullif(p_record->>'surface', '')::numeric,
    nullif(p_record->>'occupancy', ''), nullif(p_record->>'elevator', '')::boolean,
    nullif(btrim(p_record->>'sheet'), ''), nullif(btrim(p_record->>'parcel'), ''),
    nullif(btrim(p_record->>'subaltern'), ''), nullif(btrim(p_record->>'cadastralCategory'), ''),
    coalesce((p_record->>'inherited')::boolean, false), coalesce((p_record->>'isAppraised')::boolean, false)
  ) returning id into v_record_id;

  insert into public.census_record_subjects (census_record_id, subject_id, role, is_primary)
  values (v_record_id, v_subject_id, v_role, true);
  return v_record_id;
end;
$$;

revoke all on function public.link_subject_to_census_record_lab(uuid, uuid, text) from public, anon;
revoke all on function public.create_census_record_lab(jsonb, jsonb) from public, anon;
grant execute on function public.link_subject_to_census_record_lab(uuid, uuid, text) to authenticated;
grant execute on function public.create_census_record_lab(jsonb, jsonb) to authenticated;

commit;
