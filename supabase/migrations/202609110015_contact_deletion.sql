begin;

create or replace function public.delete_census_contact_lab(p_record_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if to_regclass('public.doorbell_contact_proposals') is not null then
    execute 'update public.doorbell_contact_proposals set census_record_id=null where census_record_id=$1' using p_record_id;
  end if;
  delete from public.census_records where id=p_record_id;
  if not found then raise exception 'Census contact not found' using errcode='P0002'; end if;
end $$;

revoke all on function public.delete_census_contact_lab(uuid) from public,anon;
grant execute on function public.delete_census_contact_lab(uuid) to authenticated;

commit;
