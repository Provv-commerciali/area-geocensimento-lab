begin;

alter table public.census_records add column engagement_expires_on date;
comment on column public.census_records.engagement_expires_on is 'Required expiry for Incarico altre agenzie and In esclusiva; absent for all other engagement types.';

create or replace function public.validate_engagement_expiry_lab()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_invalid boolean;
begin
  select engagement_type in ('Incarico altre agenzie', 'In esclusiva') <> (engagement_expires_on is not null)
  into v_invalid from public.census_records where id = new.id;
  if v_invalid then raise exception 'Engagement expiry must exist only for external or exclusive assignments' using errcode = '23514'; end if;
  return null;
end;
$$;

create constraint trigger validate_engagement_expiry_lab
after insert or update of engagement_type, engagement_expires_on on public.census_records
deferrable initially deferred for each row execute function public.validate_engagement_expiry_lab();

alter function public.create_census_record_lab(jsonb, jsonb) rename to create_census_record_core_lab;
alter function public.update_census_contact_lab(uuid, jsonb) rename to update_census_contact_core_lab;

revoke all on function public.create_census_record_core_lab(jsonb, jsonb) from public, anon;
revoke all on function public.update_census_contact_core_lab(uuid, jsonb) from public, anon;
grant execute on function public.create_census_record_core_lab(jsonb, jsonb) to authenticated;
grant execute on function public.update_census_contact_core_lab(uuid, jsonb) to authenticated;

create function public.create_census_record_lab(p_record jsonb, p_interview jsonb default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_record_id uuid; v_type text := coalesce(nullif(p_record->>'engagementType', ''), 'Nessuno'); v_expiry date;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_expiry := nullif(p_record->>'engagementExpiresOn', '')::date;
  if (v_type in ('Incarico altre agenzie', 'In esclusiva')) <> (v_expiry is not null) then raise exception 'Invalid engagement expiry' using errcode = '22023'; end if;
  v_record_id := public.create_census_record_core_lab(p_record, p_interview);
  update public.census_records set engagement_expires_on = v_expiry where id = v_record_id;
  return v_record_id;
end;
$$;

create function public.update_census_contact_lab(p_record_id uuid, p_contact jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_type text := coalesce(nullif(p_contact->>'engagementType', ''), 'Nessuno'); v_expiry date;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_expiry := nullif(p_contact->>'engagementExpiresOn', '')::date;
  if (v_type in ('Incarico altre agenzie', 'In esclusiva')) <> (v_expiry is not null) then raise exception 'Invalid engagement expiry' using errcode = '22023'; end if;
  perform public.update_census_contact_core_lab(p_record_id, p_contact);
  update public.census_records set engagement_expires_on = v_expiry where id = p_record_id;
end;
$$;

revoke all on function public.validate_engagement_expiry_lab() from public, anon, authenticated;
revoke all on function public.create_census_record_lab(jsonb, jsonb) from public, anon;
revoke all on function public.update_census_contact_lab(uuid, jsonb) from public, anon;
grant execute on function public.create_census_record_lab(jsonb, jsonb) to authenticated;
grant execute on function public.update_census_contact_lab(uuid, jsonb) to authenticated;

create index census_records_engagement_expiry_idx on public.census_records(engagement_type, engagement_expires_on) where engagement_expires_on is not null;

commit;
