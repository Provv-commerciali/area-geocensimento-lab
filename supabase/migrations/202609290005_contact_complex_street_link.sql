begin;

-- Selecting a Complex in New Contact is the operator's explicit instruction to
-- add the chosen AddressAccess. The link and Contact succeed or fail together.
create function public.create_census_record_with_complex_access_lab(p_record jsonb,p_interview jsonb default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_complex_id uuid := nullif(p_record->>'complexId','')::uuid;
  v_zone_id uuid := nullif(p_record->>'zoneId','')::uuid;
  v_street_id uuid := nullif(p_record->>'streetId','')::uuid;
  v_access_id uuid := nullif(p_record->>'addressAccessId','')::uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if v_complex_id is null or v_zone_id is null or v_street_id is null or v_access_id is null
  then raise exception 'Complex, Zone, Street and Access are required' using errcode='22023'; end if;
  if not exists(
    select 1 from public.complexes c
    join public.complex_address_accesses ca on ca.complex_id=c.id
    join public.address_accesses linked on linked.id=ca.address_access_id
    where c.id=v_complex_id and c.census_zone_id=v_zone_id and linked.street_id=v_street_id
  ) then raise exception 'Complex is not on the selected Zone Street' using errcode='23503'; end if;
  if not exists(
    select 1 from public.address_accesses a
    join public.census_zone_streets zs on zs.street_id=a.street_id
    where a.id=v_access_id and a.street_id=v_street_id and zs.census_zone_id=v_zone_id
  ) then raise exception 'AddressAccess does not belong to the selected Zone Street' using errcode='23503'; end if;
  insert into public.complex_address_accesses(complex_id,address_access_id,is_primary)
    values(v_complex_id,v_access_id,false)
    on conflict (complex_id,address_access_id) do nothing;
  return public.create_census_record_lab(p_record,p_interview);
end $$;

revoke all on function public.create_census_record_with_complex_access_lab(jsonb,jsonb) from public,anon;
grant execute on function public.create_census_record_with_complex_access_lab(jsonb,jsonb) to authenticated;
commit;
