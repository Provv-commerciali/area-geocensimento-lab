begin;

update public.census_records
set engagement_type = 'Nessuno'
where engagement_type is null or btrim(engagement_type) = '';

alter table public.census_records
  alter column engagement_type set default 'Nessuno',
  alter column engagement_type set not null;

alter table public.census_records
  drop constraint if exists census_records_engagement_type_check,
  add constraint census_records_engagement_type_check
  check (engagement_type in ('Nessuno', 'Incarico altre agenzie', 'In esclusiva', 'Verbale', 'Non esclusivo'));

comment on column public.census_records.engagement_type is
  'Esito commerciale controllato, distinto dalla tipologia di contatto: Nessuno, Incarico altre agenzie, In esclusiva, Verbale, Non esclusivo.';

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
  v_engagement_type text := coalesce(nullif(p_record->>'engagementType', ''), 'Nessuno');
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_interview is not null then raise exception 'Interviews must be created with an explicit interview action' using errcode = '22023'; end if;
  if v_role not in ('Proprietario', 'Comproprietario', 'Inquilino') then raise exception 'Invalid relationship role' using errcode = '22023'; end if;
  if v_engagement_type not in ('Nessuno', 'Incarico altre agenzie', 'In esclusiva', 'Verbale', 'Non esclusivo') then raise exception 'Invalid engagement type' using errcode = '22023'; end if;

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
    subaltern, cadastral_category, inherited, is_appraised, engagement_type
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
    coalesce((p_record->>'inherited')::boolean, false), coalesce((p_record->>'isAppraised')::boolean, false),
    v_engagement_type
  ) returning id into v_record_id;

  insert into public.census_record_subjects (census_record_id, subject_id, role, is_primary)
  values (v_record_id, v_subject_id, v_role, true);
  return v_record_id;
end;
$$;

create or replace function public.update_census_contact_lab(p_record_id uuid, p_contact jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_subject_id uuid;
  v_subject_type text;
  v_contact_type_id smallint;
  v_role text := p_contact->>'relationshipRole';
  v_engagement_type text := coalesce(nullif(p_contact->>'engagementType', ''), 'Nessuno');
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if v_role not in ('Proprietario', 'Comproprietario', 'Inquilino') then raise exception 'Invalid relationship role' using errcode = '22023'; end if;
  if v_engagement_type not in ('Nessuno', 'Incarico altre agenzie', 'In esclusiva', 'Verbale', 'Non esclusivo') then raise exception 'Invalid engagement type' using errcode = '22023'; end if;

  select crs.subject_id, s.subject_type into strict v_subject_id, v_subject_type
  from public.census_record_subjects crs join public.subjects s on s.id = crs.subject_id
  where crs.census_record_id = p_record_id and crs.is_primary;
  if v_subject_id <> (p_contact->>'subjectId')::uuid or v_subject_type <> p_contact->>'subjectType' then raise exception 'Subject context mismatch' using errcode = '23503'; end if;
  if v_subject_type = 'PRIVATO' and nullif(btrim(p_contact->>'lastName'), '') is null then raise exception 'Private surname is required' using errcode = '22023'; end if;
  if v_subject_type = 'AZIENDA' and nullif(btrim(p_contact->>'companyName'), '') is null then raise exception 'Company name is required' using errcode = '22023'; end if;

  select id into strict v_contact_type_id from public.contact_types where label = p_contact->>'contactType';
  if not exists (select 1 from public.census_zone_streets czs join public.civics c on c.street_id = czs.street_id where czs.census_zone_id = (p_contact->>'zoneId')::uuid and czs.street_id = (p_contact->>'streetId')::uuid and c.id = (p_contact->>'civicId')::uuid) then raise exception 'The selected zone, street and civic are not associated' using errcode = '23503'; end if;
  if nullif(p_contact->>'complexId', '') is not null and not exists (select 1 from public.complex_civics cc where cc.complex_id = (p_contact->>'complexId')::uuid and cc.civic_id = (p_contact->>'civicId')::uuid) then raise exception 'The selected complex is not associated with the civic' using errcode = '23503'; end if;
  if exists (select 1 from public.census_records r join public.census_record_subjects crs on crs.census_record_id = r.id where r.id <> p_record_id and crs.subject_id = v_subject_id and r.census_zone_id = (p_contact->>'zoneId')::uuid and r.civic_id = (p_contact->>'civicId')::uuid and r.building_scope = p_contact->>'buildingScope' and coalesce(r.floor_code, '') = coalesce(p_contact->>'floorCode', '') and coalesce(r.subaltern, '') = coalesce(p_contact->>'subaltern', '')) then raise exception 'This subject is already linked to an identical property context' using errcode = '23505'; end if;

  update public.subjects set
    first_name = case when v_subject_type = 'PRIVATO' then nullif(btrim(p_contact->>'firstName'), '') end,
    last_name = case when v_subject_type = 'PRIVATO' then btrim(p_contact->>'lastName') end,
    company_name = case when v_subject_type = 'AZIENDA' then btrim(p_contact->>'companyName') end,
    tax_code = nullif(upper(regexp_replace(btrim(coalesce(p_contact->>'taxCode', '')), '[^A-Za-z0-9]', '', 'g')), ''),
    vat_number = case when v_subject_type = 'AZIENDA' then nullif(upper(regexp_replace(btrim(coalesce(p_contact->>'vatNumber', '')), '[^A-Za-z0-9]', '', 'g')), '') end,
    phone = nullif(btrim(p_contact->>'phone'), ''), email = nullif(lower(btrim(p_contact->>'email')), ''),
    birth_date = case when v_subject_type = 'PRIVATO' then nullif(p_contact->>'birthDate', '')::date end, notes = nullif(btrim(p_contact->>'notes'), '')
  where id = v_subject_id;

  update public.census_records set
    census_zone_id = (p_contact->>'zoneId')::uuid, street_id = (p_contact->>'streetId')::uuid, civic_id = (p_contact->>'civicId')::uuid,
    complex_id = nullif(p_contact->>'complexId', '')::uuid, contact_type_id = v_contact_type_id, responsible_operator_id = nullif(p_contact->>'responsibleOperatorId', '')::uuid,
    building_scope = p_contact->>'buildingScope', levels = nullif(p_contact->>'levels', '')::integer, floor_code = case when p_contact->>'buildingScope' = 'Parte di edificio' then nullif(p_contact->>'floorCode', '') end,
    total_floors = case when p_contact->>'buildingScope' = 'Parte di edificio' then nullif(p_contact->>'totalFloors', '')::integer end, is_top_floor = case when p_contact->>'buildingScope' = 'Parte di edificio' then coalesce((p_contact->>'isTopFloor')::boolean, false) else false end,
    rooms = nullif(p_contact->>'rooms', '')::numeric, surface_sqm = nullif(p_contact->>'surface', '')::numeric, occupancy = nullif(p_contact->>'occupancy', ''), has_elevator = (p_contact->>'elevator')::boolean,
    sheet = nullif(btrim(p_contact->>'sheet'), ''), parcel = nullif(btrim(p_contact->>'parcel'), ''), subaltern = nullif(btrim(p_contact->>'subaltern'), ''), cadastral_category = nullif(btrim(p_contact->>'cadastralCategory'), ''),
    inherited = (p_contact->>'inherited')::boolean, is_appraised = case when p_contact->>'contactType' = 'Notizia' then (p_contact->>'isAppraised')::boolean else false end,
    engagement_type = v_engagement_type
  where id = p_record_id;

  update public.census_record_subjects set role = v_role where census_record_id = p_record_id and subject_id = v_subject_id;
end;
$$;

revoke all on function public.create_census_record_lab(jsonb, jsonb) from public, anon;
revoke all on function public.update_census_contact_lab(uuid, jsonb) from public, anon;
grant execute on function public.create_census_record_lab(jsonb, jsonb) to authenticated;
grant execute on function public.update_census_contact_lab(uuid, jsonb) to authenticated;

commit;
