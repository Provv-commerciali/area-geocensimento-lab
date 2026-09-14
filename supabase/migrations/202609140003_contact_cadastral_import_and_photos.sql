begin;

alter table public.census_records
  add column cadastral_class text,
  add column cadastral_consistency text,
  add column cadastral_income text,
  add column cadastral_census_zone text,
  add column cadastral_registry_lot text,
  add column cadastral_address text,
  add column cadastral_acquired_at timestamptz,
  add column cadastral_source_request_id uuid references public.cadastral_requests(id) on delete set null;

comment on column public.census_records.cadastral_income is 'Provider-supplied cadastral income, imported only after explicit operator confirmation.';
comment on column public.census_records.cadastral_source_request_id is 'Auditable OpenAPI request that supplied the imported cadastral snapshot.';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('contact-photos','contact-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table public.census_record_photos (
  id uuid primary key default gen_random_uuid(),
  census_record_id uuid not null references public.census_records(id) on delete restrict,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check(byte_size>0 and byte_size<=10485760),
  caption text,
  is_primary boolean not null default false,
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete restrict,
  check(storage_path = census_record_id::text || '/' || id::text || case mime_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end)
);
create unique index census_record_photos_one_primary_idx on public.census_record_photos(census_record_id) where is_primary and deleted_at is null;
create index census_record_photos_record_idx on public.census_record_photos(census_record_id,uploaded_at desc);

alter table public.census_record_photos enable row level security;
revoke all on public.census_record_photos from public,anon,authenticated;
grant select,insert,update on public.census_record_photos to authenticated;
create policy "contact photos authenticated read" on public.census_record_photos for select to authenticated using ((select auth.uid()) is not null);
create policy "contact photos authenticated insert" on public.census_record_photos for insert to authenticated with check ((select auth.uid()) is not null and uploaded_by=(select auth.uid()));
create policy "contact photos authenticated update" on public.census_record_photos for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "contact photos storage read" on storage.objects for select to authenticated using (bucket_id='contact-photos' and (select auth.uid()) is not null and exists(select 1 from public.census_records r where r.id::text=(storage.foldername(name))[1]));
create policy "contact photos storage insert" on storage.objects for insert to authenticated with check (bucket_id='contact-photos' and (select auth.uid()) is not null and exists(select 1 from public.census_records r where r.id::text=(storage.foldername(name))[1]));
create policy "contact photos storage delete" on storage.objects for delete to authenticated using (bucket_id='contact-photos' and (select auth.uid()) is not null and exists(select 1 from public.census_records r where r.id::text=(storage.foldername(name))[1]));

commit;
