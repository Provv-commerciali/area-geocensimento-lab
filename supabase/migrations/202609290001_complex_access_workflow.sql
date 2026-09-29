begin;

alter table public.complex_address_accesses add column is_primary boolean not null default false;
create unique index complex_one_primary_access_idx on public.complex_address_accesses(complex_id) where is_primary;
create unique index complex_one_owner_per_access_idx on public.complex_address_accesses(address_access_id);

create or replace function public.assert_complex_has_primary_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  if tg_table_name = 'complexes' then v_id := new.id;
  elsif tg_op = 'DELETE' then v_id := old.complex_id;
  else v_id := new.complex_id; end if;
  if exists(select 1 from public.complexes where id=v_id) and not exists(
    select 1 from public.complex_address_accesses where complex_id=v_id and is_primary
  ) then raise exception 'Complex requires one primary AddressAccess' using errcode='23514'; end if;
  return null;
end $$;
create constraint trigger complex_primary_required after insert or update on public.complexes
  deferrable initially deferred for each row execute function public.assert_complex_has_primary_lab();
create constraint trigger complex_access_primary_required after insert or update or delete on public.complex_address_accesses
  deferrable initially deferred for each row execute function public.assert_complex_has_primary_lab();

create or replace function public.assert_zone_street_detach_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists(select 1 from public.census_records r join public.address_accesses a on a.id=r.address_access_id
    where r.census_zone_id=old.census_zone_id and a.street_id=old.street_id)
    or exists(select 1 from public.complexes c join public.complex_address_accesses ca on ca.complex_id=c.id
      join public.address_accesses a on a.id=ca.address_access_id
      where c.census_zone_id=old.census_zone_id and a.street_id=old.street_id)
  then raise exception 'Street is used by Contacts or Complexes in this Zone' using errcode='23503'; end if;
  return old;
end $$;
create trigger zone_street_detach_guard before delete on public.census_zone_streets
  for each row execute function public.assert_zone_street_detach_lab();

create or replace function public.assert_complex_zone_change_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.census_zone_id is distinct from old.census_zone_id and exists(
    select 1 from public.complex_address_accesses ca join public.address_accesses a on a.id=ca.address_access_id
    where ca.complex_id=new.id and not exists(select 1 from public.census_zone_streets zs
      where zs.census_zone_id=new.census_zone_id and zs.street_id=a.street_id)
  ) then raise exception 'Complex Accesses must belong to its Zone' using errcode='23503'; end if;
  return new;
end $$;
create trigger complex_zone_change_guard before update of census_zone_id on public.complexes
  for each row execute function public.assert_complex_zone_change_lab();

create or replace function public.create_complex_lab(
  p_name text,p_zone_id uuid,p_primary_access_id uuid,p_other_access_ids uuid[] default array[]::uuid[],
  p_sheet text default null,p_parcel text default null,p_unit_count integer default null,p_description text default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_ids uuid[]; v_count integer;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(p_name),'') is null or p_zone_id is null or p_primary_access_id is null
    or (p_unit_count is not null and p_unit_count < 1)
  then raise exception 'Invalid Complex data' using errcode='22023'; end if;
  select array_agg(distinct x) into v_ids from unnest(array_append(coalesce(p_other_access_ids,array[]::uuid[]),p_primary_access_id)) x;
  select count(*) into v_count from public.address_accesses a join public.census_zone_streets zs on zs.street_id=a.street_id
    where zs.census_zone_id=p_zone_id and a.id=any(v_ids);
  if v_count <> cardinality(v_ids) then raise exception 'Accesses must belong to the Complex Zone' using errcode='23503'; end if;
  insert into public.complexes(census_zone_id,name,sheet,parcel,unit_count,description)
    values(p_zone_id,btrim(p_name),nullif(btrim(p_sheet),''),nullif(btrim(p_parcel),''),p_unit_count,nullif(btrim(p_description),''))
    returning id into v_id;
  insert into public.complex_address_accesses(complex_id,address_access_id,is_primary)
    select v_id,x,x=p_primary_access_id from unnest(v_ids) x;
  return v_id;
end $$;

revoke all on function public.create_complex_lab(text,uuid,uuid,uuid[],text,text,integer,text) from public,anon;
grant execute on function public.create_complex_lab(text,uuid,uuid,uuid[],text,text,integer,text) to authenticated;
comment on column public.complex_address_accesses.is_primary is 'Exactly one primary Access per persisted Complex, checked at transaction commit.';
commit;
