begin;

drop policy if exists "complex photos authenticated read" on storage.objects;
drop policy if exists "complex photos authenticated insert" on storage.objects;
drop policy if exists "complex photos authenticated delete" on storage.objects;

create or replace function public.is_existing_complex_photo_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.complexes c
      where c.id::text = (storage.foldername(p_name))[1]
    );
$$;

revoke all on function public.is_existing_complex_photo_object(text) from public, anon;
grant execute on function public.is_existing_complex_photo_object(text) to authenticated;

create policy "complex photos authenticated read" on storage.objects
for select to authenticated
using (bucket_id = 'complex-photos' and public.is_existing_complex_photo_object(name));

create policy "complex photos authenticated insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'complex-photos' and public.is_existing_complex_photo_object(name));

create policy "complex photos authenticated delete" on storage.objects
for delete to authenticated
using (bucket_id = 'complex-photos' and public.is_existing_complex_photo_object(name));

commit;
