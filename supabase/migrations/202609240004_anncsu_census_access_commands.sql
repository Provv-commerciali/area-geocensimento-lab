begin;

-- The engagement-expiry wrappers from 202609150003 remain the public commands.
-- Only their core property-context operations change territorial FK.
create or replace function public.create_census_record_core_lab(p_record jsonb,p_interview jsonb default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_record_id uuid; v_subject_id uuid; v_contact_type_id smallint;
  v_role text := p_record->>'relationshipRole';
  v_engagement_type text := coalesce(nullif(p_record->>'engagementType',''),'Nessuno');
  v_access_id uuid := nullif(p_record->>'addressAccessId','')::uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_interview is not null then raise exception 'Interviews require an explicit action' using errcode='22023'; end if;
  if v_role not in ('Proprietario','Comproprietario','Inquilino') then raise exception 'Invalid relationship role' using errcode='22023'; end if;
  if v_engagement_type not in ('Nessuno','Incarico altre agenzie','In esclusiva','Verbale','Non esclusivo') then
    raise exception 'Invalid engagement type' using errcode='22023'; end if;
  if not exists(select 1 from public.census_zone_streets zs
    join public.address_accesses a on a.street_id=zs.street_id
    where zs.census_zone_id=(p_record->>'zoneId')::uuid and a.id=v_access_id)
  then raise exception 'AddressAccess does not belong to Zone' using errcode='23503'; end if;
  if nullif(p_record->>'complexId','') is not null and not exists(
    select 1 from public.complex_address_accesses ca join public.complexes c on c.id=ca.complex_id
    where ca.complex_id=(p_record->>'complexId')::uuid and ca.address_access_id=v_access_id
      and c.census_zone_id=(p_record->>'zoneId')::uuid)
  then raise exception 'Complex does not include the AddressAccess' using errcode='23503'; end if;
  if nullif(p_record->>'existingSubjectId','') is not null then
    select id into strict v_subject_id from public.subjects where id=(p_record->>'existingSubjectId')::uuid;
  else v_subject_id := public.create_subject_lab(p_record->'subject'); end if;
  select id into strict v_contact_type_id from public.contact_types where label=p_record->>'contactType';
  if exists(select 1 from public.census_records r
    join public.census_record_subjects crs on crs.census_record_id=r.id
    where crs.subject_id=v_subject_id and r.census_zone_id=(p_record->>'zoneId')::uuid
      and r.address_access_id=v_access_id and r.building_scope=p_record->>'buildingScope'
      and coalesce(r.floor_code,'')=coalesce(p_record->>'floorCode','')
      and coalesce(r.subaltern,'')=coalesce(p_record->>'subaltern',''))
  then raise exception 'This subject is already linked to an identical property context' using errcode='23505'; end if;
  insert into public.census_records(
    census_zone_id,address_access_id,complex_id,contact_type_id,responsible_operator_id,
    building_scope,levels,floor_code,total_floors,is_top_floor,rooms,surface_sqm,occupancy,
    has_elevator,sheet,parcel,subaltern,cadastral_category,inherited,is_appraised,engagement_type
  ) values (
    (p_record->>'zoneId')::uuid,v_access_id,nullif(p_record->>'complexId','')::uuid,v_contact_type_id,
    nullif(p_record->>'responsibleOperatorId','')::uuid,p_record->>'buildingScope',
    nullif(p_record->>'levels','')::integer,nullif(p_record->>'floorCode',''),
    nullif(p_record->>'totalFloors','')::integer,coalesce((p_record->>'isTopFloor')::boolean,false),
    nullif(p_record->>'rooms','')::numeric,nullif(p_record->>'surface','')::numeric,
    nullif(p_record->>'occupancy',''),nullif(p_record->>'elevator','')::boolean,
    nullif(btrim(p_record->>'sheet'),''),nullif(btrim(p_record->>'parcel'),''),
    nullif(btrim(p_record->>'subaltern'),''),nullif(btrim(p_record->>'cadastralCategory'),''),
    coalesce((p_record->>'inherited')::boolean,false),coalesce((p_record->>'isAppraised')::boolean,false),
    v_engagement_type
  ) returning id into v_record_id;
  insert into public.census_record_subjects(census_record_id,subject_id,role,is_primary)
    values(v_record_id,v_subject_id,v_role,true);
  return v_record_id;
end $$;

create or replace function public.update_census_contact_core_lab(p_record_id uuid,p_contact jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_subject_id uuid; v_subject_type text; v_contact_type_id smallint;
  v_role text := p_contact->>'relationshipRole';
  v_engagement_type text := coalesce(nullif(p_contact->>'engagementType',''),'Nessuno');
  v_access_id uuid := nullif(p_contact->>'addressAccessId','')::uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if v_role not in ('Proprietario','Comproprietario','Inquilino') then raise exception 'Invalid relationship role' using errcode='22023'; end if;
  if v_engagement_type not in ('Nessuno','Incarico altre agenzie','In esclusiva','Verbale','Non esclusivo') then
    raise exception 'Invalid engagement type' using errcode='22023'; end if;
  select crs.subject_id,s.subject_type into strict v_subject_id,v_subject_type
    from public.census_record_subjects crs join public.subjects s on s.id=crs.subject_id
    where crs.census_record_id=p_record_id and crs.is_primary;
  if v_subject_id<>(p_contact->>'subjectId')::uuid or v_subject_type<>p_contact->>'subjectType' then
    raise exception 'Subject context mismatch' using errcode='23503'; end if;
  if v_subject_type='PRIVATO' and nullif(btrim(p_contact->>'lastName'),'') is null then raise exception 'Private surname required' using errcode='22023'; end if;
  if v_subject_type='AZIENDA' and nullif(btrim(p_contact->>'companyName'),'') is null then raise exception 'Company name required' using errcode='22023'; end if;
  if not exists(select 1 from public.census_zone_streets zs join public.address_accesses a on a.street_id=zs.street_id
    where zs.census_zone_id=(p_contact->>'zoneId')::uuid and a.id=v_access_id)
  then raise exception 'AddressAccess does not belong to Zone' using errcode='23503'; end if;
  if nullif(p_contact->>'complexId','') is not null and not exists(
    select 1 from public.complex_address_accesses ca join public.complexes c on c.id=ca.complex_id
    where ca.complex_id=(p_contact->>'complexId')::uuid and ca.address_access_id=v_access_id
      and c.census_zone_id=(p_contact->>'zoneId')::uuid)
  then raise exception 'Complex does not include the AddressAccess' using errcode='23503'; end if;
  if exists(select 1 from public.census_records r join public.census_record_subjects crs on crs.census_record_id=r.id
    where r.id<>p_record_id and crs.subject_id=v_subject_id
      and r.census_zone_id=(p_contact->>'zoneId')::uuid and r.address_access_id=v_access_id
      and r.building_scope=p_contact->>'buildingScope'
      and coalesce(r.floor_code,'')=coalesce(p_contact->>'floorCode','')
      and coalesce(r.subaltern,'')=coalesce(p_contact->>'subaltern',''))
  then raise exception 'This subject is already linked to an identical property context' using errcode='23505'; end if;
  select id into strict v_contact_type_id from public.contact_types where label=p_contact->>'contactType';
  update public.subjects set
    first_name=case when v_subject_type='PRIVATO' then nullif(btrim(p_contact->>'firstName'),'') end,
    last_name=case when v_subject_type='PRIVATO' then btrim(p_contact->>'lastName') end,
    company_name=case when v_subject_type='AZIENDA' then btrim(p_contact->>'companyName') end,
    tax_code=nullif(upper(regexp_replace(btrim(coalesce(p_contact->>'taxCode','')),'[^A-Za-z0-9]','','g')),''),
    vat_number=case when v_subject_type='AZIENDA' then nullif(upper(regexp_replace(btrim(coalesce(p_contact->>'vatNumber','')),'[^A-Za-z0-9]','','g')),'') end,
    phone=nullif(btrim(p_contact->>'phone'),''),email=nullif(lower(btrim(p_contact->>'email')),''),
    birth_date=case when v_subject_type='PRIVATO' then nullif(p_contact->>'birthDate','')::date end,
    notes=nullif(btrim(p_contact->>'notes'),'')
    where id=v_subject_id;
  update public.census_records set
    census_zone_id=(p_contact->>'zoneId')::uuid,address_access_id=v_access_id,
    complex_id=nullif(p_contact->>'complexId','')::uuid,contact_type_id=v_contact_type_id,
    responsible_operator_id=nullif(p_contact->>'responsibleOperatorId','')::uuid,
    building_scope=p_contact->>'buildingScope',levels=nullif(p_contact->>'levels','')::integer,
    floor_code=case when p_contact->>'buildingScope'='Parte di edificio' then nullif(p_contact->>'floorCode','') end,
    total_floors=case when p_contact->>'buildingScope'='Parte di edificio' then nullif(p_contact->>'totalFloors','')::integer end,
    is_top_floor=case when p_contact->>'buildingScope'='Parte di edificio' then coalesce((p_contact->>'isTopFloor')::boolean,false) else false end,
    rooms=nullif(p_contact->>'rooms','')::numeric,surface_sqm=nullif(p_contact->>'surface','')::numeric,
    occupancy=nullif(p_contact->>'occupancy',''),has_elevator=(p_contact->>'elevator')::boolean,
    sheet=nullif(btrim(p_contact->>'sheet'),''),parcel=nullif(btrim(p_contact->>'parcel'),''),
    subaltern=nullif(btrim(p_contact->>'subaltern'),''),cadastral_category=nullif(btrim(p_contact->>'cadastralCategory'),''),
    inherited=(p_contact->>'inherited')::boolean,
    is_appraised=case when p_contact->>'contactType'='Notizia' then (p_contact->>'isAppraised')::boolean else false end,
    engagement_type=v_engagement_type
    where id=p_record_id;
  update public.census_record_subjects set role=v_role where census_record_id=p_record_id and subject_id=v_subject_id;
end $$;

create or replace function public.confirm_doorbell_proposals_lab(p_proposal_ids uuid[]) returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare v_proposal public.doorbell_contact_proposals%rowtype; v_photo public.complex_photos%rowtype; v_record_id uuid; v_ids uuid[]:=array[]::uuid[];
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if coalesce(array_length(p_proposal_ids,1),0)=0 then raise exception 'Select at least one proposal' using errcode='22023'; end if;
  for v_proposal in select * from public.doorbell_contact_proposals where id=any(p_proposal_ids) order by created_at,id for update loop
    select * into strict v_photo from public.complex_photos where id=v_proposal.photo_id and deleted_at is null;
    if v_proposal.status<>'DRAFT' or v_proposal.subject_type='UNKNOWN' or v_proposal.address_access_id is null or v_proposal.qualification is null then raise exception 'Proposal requires operator review' using errcode='22023'; end if;
    v_record_id:=public.create_census_record_lab(jsonb_build_object(
      'zoneId',(select census_zone_id from public.complexes where id=v_photo.complex_id),
      'addressAccessId',v_proposal.address_access_id,'complexId',v_photo.complex_id,
      'buildingScope',v_proposal.building_scope,'floorCode',case when v_proposal.building_scope='Parte di edificio' then v_proposal.floor_code end,'totalFloors',v_proposal.total_floors,'isTopFloor',false,
      'subjectMode',case when v_proposal.existing_subject_id is null then 'new' else 'existing' end,'existingSubjectId',v_proposal.existing_subject_id,
      'subject',jsonb_build_object('subjectType',v_proposal.subject_type,'firstName',v_proposal.first_name,'lastName',v_proposal.last_name,'companyName',v_proposal.company_name),
      'contactType',v_proposal.contact_type,'relationshipRole',v_proposal.qualification,'responsibleOperatorId',v_proposal.responsible_operator_id,'occupancy',v_proposal.occupancy,'inherited',false,'isAppraised',false
    ),null);
    update public.census_records set staircase=v_proposal.staircase,unit_identifier=v_proposal.unit_identifier where id=v_record_id;
    update public.doorbell_contact_proposals set status='CREATED',census_record_id=v_record_id,reviewed_by=(select auth.uid()),reviewed_at=now() where id=v_proposal.id;
    v_ids:=array_append(v_ids,v_record_id);
  end loop;
  if array_length(v_ids,1)<>array_length(p_proposal_ids,1) then raise exception 'One or more proposals were not found' using errcode='P0002'; end if;
  return v_ids;
end $$;

commit;
