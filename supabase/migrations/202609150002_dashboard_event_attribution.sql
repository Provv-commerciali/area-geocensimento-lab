begin;

alter table public.census_records
  add column created_by_operator_id uuid references public.operators(id) on delete set null,
  add column news_found_at timestamptz,
  add column news_found_by_operator_id uuid references public.operators(id) on delete set null,
  add column appraised_at timestamptz,
  add column appraised_by_operator_id uuid references public.operators(id) on delete set null,
  add column engagement_acquired_at timestamptz,
  add column engagement_acquired_by_operator_id uuid references public.operators(id) on delete set null;

comment on column public.census_records.created_by_operator_id is 'Authenticated LAB operator who created the CensusRecord; historical rows are intentionally not inferred.';
comment on column public.census_records.news_found_at is 'First recorded transition to contact type Notizia; historical rows are intentionally not inferred.';
comment on column public.census_records.appraised_at is 'Current appraisal completion timestamp; cleared if the appraisal flag is corrected to false.';
comment on column public.census_records.engagement_acquired_at is 'First observed transition to In esclusiva, Verbale or Non esclusivo.';

create or replace function public.audit_census_dashboard_events_lab()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid;
  v_new_contact_type text;
  v_old_contact_type text;
  v_new_is_agency_engagement boolean;
  v_old_is_agency_engagement boolean;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select id into v_actor from public.operators where auth_user_id = (select auth.uid());
  select label into strict v_new_contact_type from public.contact_types where id = new.contact_type_id;
  v_new_is_agency_engagement := new.engagement_type in ('In esclusiva', 'Verbale', 'Non esclusivo');

  if tg_op = 'INSERT' then
    new.created_by_operator_id := v_actor;
    if v_new_contact_type = 'Notizia' then new.news_found_at := now(); new.news_found_by_operator_id := v_actor; end if;
    if new.is_appraised then new.appraised_at := now(); new.appraised_by_operator_id := v_actor; end if;
    if v_new_is_agency_engagement then new.engagement_acquired_at := now(); new.engagement_acquired_by_operator_id := v_actor; end if;
    return new;
  end if;

  select label into strict v_old_contact_type from public.contact_types where id = old.contact_type_id;
  v_old_is_agency_engagement := old.engagement_type in ('In esclusiva', 'Verbale', 'Non esclusivo');
  new.created_by_operator_id := old.created_by_operator_id;

  if v_old_contact_type <> 'Notizia' and v_new_contact_type = 'Notizia' and old.news_found_at is null then
    new.news_found_at := now(); new.news_found_by_operator_id := v_actor;
  else
    new.news_found_at := old.news_found_at; new.news_found_by_operator_id := old.news_found_by_operator_id;
  end if;

  if not old.is_appraised and new.is_appraised then
    new.appraised_at := now(); new.appraised_by_operator_id := v_actor;
  elsif old.is_appraised and not new.is_appraised then
    new.appraised_at := null; new.appraised_by_operator_id := null;
  else
    new.appraised_at := old.appraised_at; new.appraised_by_operator_id := old.appraised_by_operator_id;
  end if;

  if not v_old_is_agency_engagement and v_new_is_agency_engagement and old.engagement_acquired_at is null then
    new.engagement_acquired_at := now(); new.engagement_acquired_by_operator_id := v_actor;
  else
    new.engagement_acquired_at := old.engagement_acquired_at;
    new.engagement_acquired_by_operator_id := old.engagement_acquired_by_operator_id;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_census_dashboard_events_lab on public.census_records;
create trigger audit_census_dashboard_events_lab
before insert or update
on public.census_records for each row execute function public.audit_census_dashboard_events_lab();

create index census_records_created_operator_month_idx on public.census_records(created_by_operator_id, created_at);
create index census_records_news_operator_month_idx on public.census_records(news_found_by_operator_id, news_found_at) where news_found_at is not null;
create index census_records_appraisal_operator_month_idx on public.census_records(appraised_by_operator_id, appraised_at) where appraised_at is not null;
create index census_records_engagement_operator_month_idx on public.census_records(engagement_acquired_by_operator_id, engagement_acquired_at) where engagement_acquired_at is not null;
create index census_records_dashboard_scope_idx on public.census_records(census_zone_id, responsible_operator_id, engagement_type, occupancy);

revoke all on function public.audit_census_dashboard_events_lab() from public, anon;

commit;
