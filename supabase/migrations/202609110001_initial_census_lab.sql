begin;

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.operators (
  id uuid primary key default gen_random_uuid(), display_name text not null, auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.countries (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null);
create table public.regions (id uuid primary key default gen_random_uuid(), country_id uuid not null references public.countries(id), name text not null, unique(country_id,name));
create table public.provinces (id uuid primary key default gen_random_uuid(), region_id uuid not null references public.regions(id), code text, name text not null, unique(region_id,name));
create table public.municipalities (id uuid primary key default gen_random_uuid(), province_id uuid not null references public.provinces(id), cadastral_code text, name text not null, unique(province_id,name));
create table public.census_zones (
  id uuid primary key default gen_random_uuid(), municipality_id uuid not null references public.municipalities(id), name text not null,
  assignee_operator_id uuid references public.operators(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(municipality_id,name)
);
create table public.streets (
  id uuid primary key default gen_random_uuid(), municipality_id uuid not null references public.municipalities(id), name text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(municipality_id,name)
);
create table public.census_zone_streets (
  census_zone_id uuid not null references public.census_zones(id) on delete cascade, street_id uuid not null references public.streets(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(census_zone_id,street_id)
);
create table public.civics (
  id uuid primary key default gen_random_uuid(), street_id uuid not null references public.streets(id) on delete cascade, number text not null,
  extension text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique nulls not distinct(street_id,number,extension)
);
create table public.complexes (
  id uuid primary key default gen_random_uuid(), census_zone_id uuid not null references public.census_zones(id), name text not null,
  sheet text, parcel text, unit_count integer check(unit_count is null or unit_count > 0), description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(census_zone_id,name)
);
create table public.complex_civics (
  complex_id uuid not null references public.complexes(id) on delete cascade, civic_id uuid not null references public.civics(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(complex_id,civic_id)
);
create table public.contact_types (id smallint generated always as identity primary key, code text not null unique, label text not null unique);
insert into public.contact_types(code,label) values ('generic','Generico'),('informant','Informatore'),('information','Informazione'),('news','Notizia');
create table public.census_records (
  id uuid primary key default gen_random_uuid(), census_zone_id uuid not null references public.census_zones(id), street_id uuid not null references public.streets(id),
  civic_id uuid not null references public.civics(id), complex_id uuid references public.complexes(id), contact_type_id smallint not null references public.contact_types(id),
  responsible_operator_id uuid references public.operators(id), first_name text, last_name text not null, phone text, email text, tax_code text,
  qualification text, inherited boolean not null default false, birth_date date, personal_notes text,
  building_scope text not null check(building_scope in ('Intero edificio','Parte di edificio')), levels integer check(levels is null or levels > 0),
  floor_label text, rooms numeric check(rooms is null or rooms >= 0), surface_sqm numeric check(surface_sqm is null or surface_sqm >= 0), occupancy text,
  has_elevator boolean, sheet text, parcel text, subaltern text, cadastral_category text,
  is_appraised boolean not null default false, probable_assignment boolean, engagement_type text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
comment on column public.census_records.is_appraised is 'Manual flag only. Contact type Notizia must never set it automatically.';
comment on column public.census_records.floor_label is 'Text preserves values such as Intero edificio and 3° di 10.';
create table public.census_interviews (
  id uuid primary key default gen_random_uuid(), census_record_id uuid not null references public.census_records(id) on delete cascade,
  operator_id uuid not null references public.operators(id), interview_date date not null, recall_date date, response text, reason text, outcome text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index census_records_zone_idx on public.census_records(census_zone_id);
create index census_records_street_civic_idx on public.census_records(street_id,civic_id);
create index census_records_contact_idx on public.census_records(last_name,first_name);
create index census_interviews_record_date_idx on public.census_interviews(census_record_id,interview_date desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger operators_updated_at before update on public.operators for each row execute function public.set_updated_at();
create trigger zones_updated_at before update on public.census_zones for each row execute function public.set_updated_at();
create trigger streets_updated_at before update on public.streets for each row execute function public.set_updated_at();
create trigger civics_updated_at before update on public.civics for each row execute function public.set_updated_at();
create trigger complexes_updated_at before update on public.complexes for each row execute function public.set_updated_at();
create trigger records_updated_at before update on public.census_records for each row execute function public.set_updated_at();
create trigger interviews_updated_at before update on public.census_interviews for each row execute function public.set_updated_at();

alter table public.operators enable row level security;
alter table public.countries enable row level security;
alter table public.regions enable row level security;
alter table public.provinces enable row level security;
alter table public.municipalities enable row level security;
alter table public.census_zones enable row level security;
alter table public.streets enable row level security;
alter table public.census_zone_streets enable row level security;
alter table public.civics enable row level security;
alter table public.complexes enable row level security;
alter table public.complex_civics enable row level security;
alter table public.contact_types enable row level security;
alter table public.census_records enable row level security;
alter table public.census_interviews enable row level security;

do $$ declare t text; begin foreach t in array array['operators','countries','regions','provinces','municipalities','census_zones','streets','census_zone_streets','civics','complexes','complex_civics','contact_types','census_records','census_interviews'] loop
  execute format('create policy "lab authenticated read" on public.%I for select to authenticated using (true)', t);
  execute format('create policy "lab authenticated insert" on public.%I for insert to authenticated with check (true)', t);
  execute format('create policy "lab authenticated update" on public.%I for update to authenticated using (true) with check (true)', t);
  execute format('create policy "lab authenticated delete" on public.%I for delete to authenticated using (true)', t);
end loop; end $$;

commit;
