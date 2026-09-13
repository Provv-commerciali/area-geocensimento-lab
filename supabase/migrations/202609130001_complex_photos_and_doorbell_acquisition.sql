begin;

alter table public.census_records
  add column staircase text,
  add column unit_identifier text;

comment on column public.census_records.staircase is 'Optional operator-entered staircase label within the existing census context; not a PropertyUnit.';
comment on column public.census_records.unit_identifier is 'Optional operator-entered internal/unit label within the existing census context; not a unique property identity.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('complex-photos', 'complex-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table public.doorbell_acquisition_sessions (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.doorbell_acquisition_sessions add constraint doorbell_acquisition_sessions_id_complex_key unique (id, complex_id);

create table public.complex_photos (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete restrict,
  acquisition_session_id uuid references public.doorbell_acquisition_sessions(id) on delete restrict,
  photo_type text not null check (photo_type in ('COMPLEX','DOORBELL')),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  caption text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  processing_status text not null default 'UPLOADED' check (processing_status in ('UPLOADED','PROCESSING','PROCESSED','NEEDS_REVIEW','FAILED')),
  processing_error_code text,
  processing_error_message text,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete restrict,
  check ((photo_type = 'DOORBELL' and acquisition_session_id is not null) or (photo_type = 'COMPLEX' and acquisition_session_id is null)),
  check (storage_path = complex_id::text || '/' || id::text || case mime_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end)
);
alter table public.complex_photos add constraint complex_photos_session_complex_fk foreign key (acquisition_session_id, complex_id) references public.doorbell_acquisition_sessions(id, complex_id) on delete restrict;
create unique index complex_photos_one_primary_idx on public.complex_photos (complex_id) where is_primary and deleted_at is null;
create index complex_photos_complex_order_idx on public.complex_photos (complex_id, sort_order, uploaded_at);

create table public.doorbell_ocr_runs (
  id uuid primary key default gen_random_uuid(), photo_id uuid not null references public.complex_photos(id) on delete restrict,
  provider_code text not null, provider_request_id text, status text not null check (status in ('PROCESSING','PROCESSED','NEEDS_REVIEW','FAILED')),
  raw_text text, warnings jsonb not null default '[]'::jsonb, error_code text, error_message text,
  requested_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(), completed_at timestamptz
);
create unique index doorbell_ocr_one_active_run_idx on public.doorbell_ocr_runs(photo_id) where status = 'PROCESSING';

create table public.doorbell_ocr_detections (
  id uuid primary key default gen_random_uuid(), run_id uuid not null references public.doorbell_ocr_runs(id) on delete restrict,
  source_text text not null, proposed_first_name text, proposed_last_name text, proposed_company_name text,
  proposed_subject_type text not null check (proposed_subject_type in ('PERSON','COMPANY','UNKNOWN')),
  confidence numeric check (confidence is null or confidence between 0 and 1), region jsonb, warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.doorbell_contact_proposals (
  id uuid primary key default gen_random_uuid(), acquisition_session_id uuid not null references public.doorbell_acquisition_sessions(id) on delete restrict,
  photo_id uuid not null references public.complex_photos(id) on delete restrict, source_text text not null,
  subject_type text not null check (subject_type in ('PRIVATO','AZIENDA','UNKNOWN')),
  first_name text, last_name text, company_name text, confidence numeric check (confidence is null or confidence between 0 and 1), warnings jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT','DISCARDED','CREATED')),
  existing_subject_id uuid references public.subjects(id) on delete restrict,
  civic_id uuid references public.civics(id) on delete restrict,
  building_scope text not null default 'Parte di edificio' check (building_scope in ('Intero edificio','Parte di edificio')),
  staircase text, unit_identifier text, floor_code text, total_floors integer check (total_floors is null or total_floors > 0),
  qualification text check (qualification is null or qualification in ('Proprietario','Comproprietario','Inquilino')),
  occupancy text check (occupancy is null or occupancy in ('Libero','Libero al rogito','Occupato dal proprietario','Occupato dall''inquilino','Inagibile')),
  contact_type text not null default 'Generico' check (contact_type in ('Generico','Informatore','Informazione','Notizia')),
  responsible_operator_id uuid references public.operators(id) on delete restrict,
  census_record_id uuid unique references public.census_records(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete restrict, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status <> 'CREATED' or (subject_type = 'PRIVATO' and nullif(btrim(last_name),'') is not null and company_name is null) or (subject_type = 'AZIENDA' and nullif(btrim(company_name),'') is not null and first_name is null and last_name is null))
);
create trigger doorbell_contact_proposals_updated_at before update on public.doorbell_contact_proposals for each row execute function public.set_updated_at();

create table public.doorbell_proposal_sources (
  proposal_id uuid not null references public.doorbell_contact_proposals(id) on delete restrict,
  detection_id uuid not null references public.doorbell_ocr_detections(id) on delete restrict,
  primary key (proposal_id, detection_id)
);

alter table public.doorbell_acquisition_sessions enable row level security;
alter table public.complex_photos enable row level security;
alter table public.doorbell_ocr_runs enable row level security;
alter table public.doorbell_ocr_detections enable row level security;
alter table public.doorbell_contact_proposals enable row level security;
alter table public.doorbell_proposal_sources enable row level security;

revoke all on public.doorbell_acquisition_sessions, public.complex_photos, public.doorbell_ocr_runs, public.doorbell_ocr_detections, public.doorbell_contact_proposals, public.doorbell_proposal_sources from public, anon, authenticated;
grant select, insert, update on public.doorbell_acquisition_sessions, public.complex_photos, public.doorbell_ocr_runs, public.doorbell_ocr_detections, public.doorbell_contact_proposals, public.doorbell_proposal_sources to authenticated;

do $$ declare t text; begin foreach t in array array['doorbell_acquisition_sessions','complex_photos','doorbell_ocr_runs','doorbell_ocr_detections','doorbell_contact_proposals','doorbell_proposal_sources'] loop
  execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null)', 'lab authenticated read', t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) is not null)', 'lab authenticated insert', t);
  execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)', 'lab authenticated update', t);
end loop; end $$;

create policy "complex photos authenticated read" on storage.objects for select to authenticated
using (bucket_id = 'complex-photos' and (select auth.uid()) is not null and exists (select 1 from public.complexes c where c.id::text = (storage.foldername(name))[1]));
create policy "complex photos authenticated insert" on storage.objects for insert to authenticated
with check (bucket_id = 'complex-photos' and (select auth.uid()) is not null and exists (select 1 from public.complexes c where c.id::text = (storage.foldername(name))[1]));
create policy "complex photos authenticated delete" on storage.objects for delete to authenticated
using (bucket_id = 'complex-photos' and (select auth.uid()) is not null and exists (select 1 from public.complexes c where c.id::text = (storage.foldername(name))[1]));

create or replace function public.begin_doorbell_recognition_lab(p_photo_id uuid) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_run_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not exists (select 1 from public.complex_photos where id=p_photo_id and photo_type='DOORBELL' and deleted_at is null) then raise exception 'Doorbell photo not found' using errcode='P0002'; end if;
  update public.complex_photos set processing_status='PROCESSING',processing_error_code=null,processing_error_message=null where id=p_photo_id;
  insert into public.doorbell_ocr_runs(photo_id,provider_code,status) values(p_photo_id,'PADDLEOCR_PP_OCRV6_HTTP','PROCESSING') returning id into v_run_id;
  return v_run_id;
end $$;

create or replace function public.record_doorbell_recognition_lab(p_run_id uuid,p_result jsonb) returns integer language plpgsql security invoker set search_path = '' as $$
declare v_photo public.complex_photos%rowtype; v_item jsonb; v_detection_id uuid; v_proposal_id uuid; v_count integer:=0; v_needs_review boolean:=false;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select p.* into strict v_photo from public.complex_photos p join public.doorbell_ocr_runs r on r.photo_id=p.id where r.id=p_run_id and r.status='PROCESSING';
  for v_item in select value from jsonb_array_elements(coalesce(p_result->'proposals','[]'::jsonb)) loop
    v_needs_review := v_needs_review or coalesce((v_item->>'confidence')::numeric,0)<0.70 or v_item->>'proposedSubjectType'='UNKNOWN' or jsonb_array_length(coalesce(v_item->'warnings','[]'::jsonb))>0;
    insert into public.doorbell_ocr_detections(run_id,source_text,proposed_first_name,proposed_last_name,proposed_company_name,proposed_subject_type,confidence,region,warnings)
    values(p_run_id,v_item->>'sourceText',nullif(v_item->>'proposedFirstName',''),nullif(v_item->>'proposedLastName',''),nullif(v_item->>'proposedCompanyName',''),v_item->>'proposedSubjectType',nullif(v_item->>'confidence','')::numeric,v_item->'region',coalesce(v_item->'warnings','[]'::jsonb)) returning id into v_detection_id;
    insert into public.doorbell_contact_proposals(acquisition_session_id,photo_id,source_text,subject_type,first_name,last_name,company_name,confidence,warnings)
    values(v_photo.acquisition_session_id,v_photo.id,v_item->>'sourceText',case v_item->>'proposedSubjectType' when 'PERSON' then 'PRIVATO' when 'COMPANY' then 'AZIENDA' else 'UNKNOWN' end,nullif(v_item->>'proposedFirstName',''),nullif(v_item->>'proposedLastName',''),nullif(v_item->>'proposedCompanyName',''),nullif(v_item->>'confidence','')::numeric,coalesce(v_item->'warnings','[]'::jsonb)) returning id into v_proposal_id;
    insert into public.doorbell_proposal_sources(proposal_id,detection_id) values(v_proposal_id,v_detection_id); v_count:=v_count+1;
  end loop;
  update public.doorbell_ocr_runs set status=case when v_needs_review or v_count=0 then 'NEEDS_REVIEW' else 'PROCESSED' end,raw_text=p_result->>'rawText',warnings=coalesce(p_result->'warnings','[]'::jsonb),provider_request_id=p_result->>'providerRequestId',completed_at=now() where id=p_run_id;
  update public.complex_photos set processing_status=case when v_needs_review or v_count=0 then 'NEEDS_REVIEW' else 'PROCESSED' end where id=v_photo.id;
  return v_count;
end $$;

create or replace function public.fail_doorbell_recognition_lab(p_run_id uuid,p_code text,p_message text) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.doorbell_ocr_runs set status='FAILED',error_code=p_code,error_message=p_message,completed_at=now() where id=p_run_id and status='PROCESSING';
  update public.complex_photos p set processing_status='FAILED',processing_error_code=p_code,processing_error_message=p_message from public.doorbell_ocr_runs r where r.id=p_run_id and r.photo_id=p.id;
end $$;

create or replace function public.confirm_doorbell_proposals_lab(p_proposal_ids uuid[]) returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare v_proposal public.doorbell_contact_proposals%rowtype; v_photo public.complex_photos%rowtype; v_record_id uuid; v_ids uuid[]:=array[]::uuid[];
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if coalesce(array_length(p_proposal_ids,1),0)=0 then raise exception 'Select at least one proposal' using errcode='22023'; end if;
  for v_proposal in select * from public.doorbell_contact_proposals where id=any(p_proposal_ids) order by created_at,id for update loop
    select * into strict v_photo from public.complex_photos where id=v_proposal.photo_id and deleted_at is null;
    if v_proposal.status<>'DRAFT' or v_proposal.subject_type='UNKNOWN' or v_proposal.civic_id is null or v_proposal.qualification is null then raise exception 'Proposal requires operator review' using errcode='22023'; end if;
    v_record_id:=public.create_census_record_lab(jsonb_build_object(
      'zoneId',(select census_zone_id from public.complexes where id=v_photo.complex_id),'streetId',(select street_id from public.civics where id=v_proposal.civic_id),'civicId',v_proposal.civic_id,'complexId',v_photo.complex_id,
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

revoke all on function public.begin_doorbell_recognition_lab(uuid),public.record_doorbell_recognition_lab(uuid,jsonb),public.fail_doorbell_recognition_lab(uuid,text,text),public.confirm_doorbell_proposals_lab(uuid[]) from public,anon;
grant execute on function public.begin_doorbell_recognition_lab(uuid),public.record_doorbell_recognition_lab(uuid,jsonb),public.fail_doorbell_recognition_lab(uuid,text,text),public.confirm_doorbell_proposals_lab(uuid[]) to authenticated;

commit;
