begin;

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('PRIVATO', 'AZIENDA')),
  first_name text,
  last_name text,
  company_name text,
  tax_code text,
  vat_number text,
  phone text,
  email text,
  birth_date date,
  notes text,
  normalized_tax_code text generated always as (
    upper(regexp_replace(btrim(coalesce(tax_code, '')), '[^A-Za-z0-9]', '', 'g'))
  ) stored,
  normalized_vat_number text generated always as (
    upper(regexp_replace(btrim(coalesce(vat_number, '')), '[^A-Za-z0-9]', '', 'g'))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_shape_check check (
    (subject_type = 'PRIVATO' and nullif(btrim(last_name), '') is not null and company_name is null and vat_number is null)
    or
    (subject_type = 'AZIENDA' and nullif(btrim(company_name), '') is not null and first_name is null and last_name is null and birth_date is null)
  )
);

create unique index subjects_normalized_tax_code_uidx
  on public.subjects (normalized_tax_code)
  where normalized_tax_code <> '';

create unique index subjects_normalized_vat_number_uidx
  on public.subjects (normalized_vat_number)
  where normalized_vat_number <> '';

create table public.census_record_subjects (
  census_record_id uuid not null references public.census_records(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  role text not null check (role in ('Proprietario', 'Inquilino', 'Non specificato')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (census_record_id, subject_id)
);

create unique index census_record_subjects_one_primary_uidx
  on public.census_record_subjects (census_record_id)
  where is_primary;
create index census_record_subjects_subject_idx
  on public.census_record_subjects (subject_id, census_record_id);

-- Strong tax identifiers may consolidate legacy rows. Names alone never do.
insert into public.subjects (
  id, subject_type, first_name, last_name, tax_code, phone, email, birth_date, notes, created_at, updated_at
)
select distinct on (upper(regexp_replace(btrim(r.tax_code), '[^A-Za-z0-9]', '', 'g')))
  r.id, 'PRIVATO', r.first_name,
  coalesce(nullif(btrim(r.last_name), ''), 'Anagrafica legacy'),
  r.tax_code, r.phone, r.email, r.birth_date,
  r.personal_notes, r.created_at, r.updated_at
from public.census_records r
where nullif(regexp_replace(btrim(coalesce(r.tax_code, '')), '[^A-Za-z0-9]', '', 'g'), '') is not null
order by upper(regexp_replace(btrim(r.tax_code), '[^A-Za-z0-9]', '', 'g')), r.created_at, r.id;

-- Without a strong identifier every legacy record becomes a distinct subject,
-- even when name and surname happen to match.
insert into public.subjects (
  id, subject_type, first_name, last_name, phone, email, birth_date, notes, created_at, updated_at
)
select r.id, 'PRIVATO', r.first_name,
  coalesce(nullif(btrim(r.last_name), ''), 'Anagrafica legacy'),
  r.phone, r.email, r.birth_date,
  r.personal_notes, r.created_at, r.updated_at
from public.census_records r
where nullif(regexp_replace(btrim(coalesce(r.tax_code, '')), '[^A-Za-z0-9]', '', 'g'), '') is null;

insert into public.census_record_subjects (census_record_id, subject_id, role, is_primary, created_at)
select
  r.id,
  coalesce(strong_subject.id, r.id),
  case when r.qualification in ('Proprietario', 'Inquilino') then r.qualification else 'Non specificato' end,
  true,
  r.created_at
from public.census_records r
left join lateral (
  select s.id
  from public.subjects s
  where s.normalized_tax_code = upper(regexp_replace(btrim(coalesce(r.tax_code, '')), '[^A-Za-z0-9]', '', 'g'))
    and s.normalized_tax_code <> ''
  limit 1
) strong_subject on true;

alter table public.census_records alter column last_name drop not null;
comment on column public.census_records.first_name is 'Legacy subject snapshot; new records use census_record_subjects.';
comment on column public.census_records.last_name is 'Legacy subject snapshot; new records use census_record_subjects.';
comment on column public.census_records.tax_code is 'Legacy subject snapshot; new records use subjects.tax_code.';
comment on column public.census_records.qualification is 'Legacy relationship snapshot; new links use census_record_subjects.role.';

create trigger subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;
alter table public.census_record_subjects enable row level security;

create policy "lab authenticated read" on public.subjects for select to authenticated using (true);
create policy "lab authenticated insert" on public.subjects for insert to authenticated with check (true);
create policy "lab authenticated read" on public.census_record_subjects for select to authenticated using (true);
create policy "lab authenticated insert" on public.census_record_subjects for insert to authenticated with check (true);
create policy "lab authenticated update" on public.census_record_subjects for update to authenticated using (true) with check (true);

revoke all on public.subjects, public.census_record_subjects from public, anon;
grant select, insert on public.subjects to authenticated;
grant select, insert, update on public.census_record_subjects to authenticated;

create or replace function public.create_subject_lab(p_subject jsonb) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_subject_id uuid;
  v_type text := p_subject->>'subjectType';
  v_tax_code text := nullif(upper(regexp_replace(btrim(coalesce(p_subject->>'taxCode', '')), '[^A-Za-z0-9]', '', 'g')), '');
  v_vat_number text := nullif(upper(regexp_replace(btrim(coalesce(p_subject->>'vatNumber', '')), '[^A-Za-z0-9]', '', 'g')), '');
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if v_type is null or v_type not in ('PRIVATO', 'AZIENDA') then raise exception 'Invalid subject type' using errcode = '22023'; end if;
  if v_type = 'PRIVATO' and nullif(btrim(p_subject->>'lastName'), '') is null then raise exception 'Private surname is required' using errcode = '22023'; end if;
  if v_type = 'AZIENDA' and nullif(btrim(p_subject->>'companyName'), '') is null then raise exception 'Company name is required' using errcode = '22023'; end if;

  if v_tax_code is not null and exists (select 1 from public.subjects where normalized_tax_code = v_tax_code) then
    raise exception 'A subject with this tax code already exists' using errcode = '23505';
  end if;
  if v_vat_number is not null and exists (select 1 from public.subjects where normalized_vat_number = v_vat_number) then
    raise exception 'A company with this VAT number already exists' using errcode = '23505';
  end if;

  insert into public.subjects (
    subject_type, first_name, last_name, company_name, tax_code, vat_number,
    phone, email, birth_date, notes
  ) values (
    v_type,
    case when v_type = 'PRIVATO' then nullif(btrim(p_subject->>'firstName'), '') end,
    case when v_type = 'PRIVATO' then btrim(p_subject->>'lastName') end,
    case when v_type = 'AZIENDA' then btrim(p_subject->>'companyName') end,
    v_tax_code,
    case when v_type = 'AZIENDA' then v_vat_number end,
    nullif(btrim(p_subject->>'phone'), ''),
    nullif(lower(btrim(p_subject->>'email')), ''),
    case when v_type = 'PRIVATO' then nullif(p_subject->>'birthDate', '')::date end,
    nullif(btrim(p_subject->>'notes'), '')
  ) returning id into v_subject_id;
  return v_subject_id;
end;
$$;

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
  if p_role not in ('Proprietario', 'Inquilino') then raise exception 'Invalid relationship role' using errcode = '22023'; end if;
  insert into public.census_record_subjects (census_record_id, subject_id, role, is_primary)
  values (p_record_id, p_subject_id, p_role, false)
  on conflict (census_record_id, subject_id) do update set role = excluded.role;
end;
$$;

-- The record RPC now resolves or creates the subject and links it atomically.
-- p_interview remains rejected as established by migration 004.
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
  if v_role not in ('Proprietario', 'Inquilino') then raise exception 'Invalid relationship role' using errcode = '22023'; end if;

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

revoke all on function public.create_subject_lab(jsonb) from public, anon;
revoke all on function public.link_subject_to_census_record_lab(uuid, uuid, text) from public, anon;
revoke all on function public.create_census_record_lab(jsonb, jsonb) from public, anon;
grant execute on function public.create_subject_lab(jsonb) to authenticated;
grant execute on function public.link_subject_to_census_record_lab(uuid, uuid, text) to authenticated;
grant execute on function public.create_census_record_lab(jsonb, jsonb) to authenticated;

commit;
