begin;

create or replace function public.rename_zone_street_lab(
  p_zone_id uuid,
  p_street_id uuid,
  p_name text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(p_name), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'Street name is required' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.census_zone_streets
    where census_zone_id = p_zone_id and street_id = p_street_id
  ) then
    raise exception 'The street is not associated with the selected zone' using errcode = '23503';
  end if;

  update public.streets
  set name = v_name
  where id = p_street_id
    and municipality_id = (select municipality_id from public.census_zones where id = p_zone_id);

  if not found then
    raise exception 'Street not found in the selected municipality' using errcode = '23503';
  end if;
end;
$$;

revoke all on function public.rename_zone_street_lab(uuid, uuid, text) from public, anon;
grant execute on function public.rename_zone_street_lab(uuid, uuid, text) to authenticated;

commit;
