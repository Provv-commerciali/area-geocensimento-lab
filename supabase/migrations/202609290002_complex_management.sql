begin;

grant update (is_primary) on public.complex_address_accesses to authenticated;
create policy "lab authenticated update" on public.complex_address_accesses for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

create or replace function public.assert_complex_access_detach_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists(select 1 from public.census_records where complex_id=old.complex_id and address_access_id=old.address_access_id)
    or exists(select 1 from public.doorbell_contact_proposals p join public.complex_photos photo on photo.id=p.photo_id
      where photo.complex_id=old.complex_id and p.address_access_id=old.address_access_id)
  then raise exception 'Access is used by Complex Contacts or doorbell review' using errcode='23503'; end if;
  return old;
end $$;
create trigger complex_access_detach_guard before delete on public.complex_address_accesses
  for each row execute function public.assert_complex_access_detach_lab();

create or replace function public.update_complex_lab(
  p_id uuid,p_name text,p_primary_access_id uuid,p_other_access_ids uuid[] default array[]::uuid[],
  p_sheet text default null,p_parcel text default null,p_unit_count integer default null,p_description text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_zone_id uuid; v_ids uuid[]; v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(p_name),'') is null or p_primary_access_id is null or (p_unit_count is not null and p_unit_count<1)
  then raise exception 'Invalid Complex data' using errcode='22023'; end if;
  select census_zone_id into v_zone_id from public.complexes where id=p_id for update;
  if v_zone_id is null then raise exception 'Complex not found' using errcode='P0002'; end if;
  select array_agg(distinct x) into v_ids from unnest(array_append(coalesce(p_other_access_ids,array[]::uuid[]),p_primary_access_id)) x;
  select count(*) into v_count from public.address_accesses a join public.census_zone_streets zs on zs.street_id=a.street_id
    where zs.census_zone_id=v_zone_id and a.id=any(v_ids);
  if v_count<>cardinality(v_ids) then raise exception 'Accesses must belong to the Complex Zone' using errcode='23503'; end if;
  delete from public.complex_address_accesses where complex_id=p_id and not(address_access_id=any(v_ids));
  update public.complex_address_accesses set is_primary=false where complex_id=p_id and is_primary;
  insert into public.complex_address_accesses(complex_id,address_access_id,is_primary)
    select p_id,x,false from unnest(v_ids) x on conflict (complex_id,address_access_id) do nothing;
  update public.complex_address_accesses set is_primary=true where complex_id=p_id and address_access_id=p_primary_access_id;
  update public.complexes set name=btrim(p_name),sheet=nullif(btrim(p_sheet),''),parcel=nullif(btrim(p_parcel),''),
    unit_count=p_unit_count,description=nullif(btrim(p_description),'') where id=p_id;
  return p_id;
end $$;

create or replace function public.delete_complex_lab(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if exists(select 1 from public.census_records where complex_id=p_id)
    or exists(select 1 from public.complex_photos where complex_id=p_id)
  then raise exception 'Complex has Contacts or photo/OCR audit and cannot be deleted' using errcode='23503'; end if;
  delete from public.complexes where id=p_id;
end $$;

revoke all on function public.update_complex_lab(uuid,text,uuid,uuid[],text,text,integer,text) from public,anon;
revoke all on function public.delete_complex_lab(uuid) from public,anon;
grant execute on function public.update_complex_lab(uuid,text,uuid,uuid[],text,text,integer,text) to authenticated;
grant execute on function public.delete_complex_lab(uuid) to authenticated;
commit;
