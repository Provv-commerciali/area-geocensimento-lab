begin;

-- A bounded, RLS-aware operational page. The zone link is part of the query,
-- so a caller cannot enumerate an unrelated street by guessing its UUID.
create or replace function public.street_access_page_lab(
  p_zone_id uuid, p_street_id uuid, p_search text default '',
  p_candidate_ids uuid[] default null, p_search_contact_ids uuid[] default '{}',
  p_sort text default 'civic_asc', p_limit integer default 40, p_offset integer default 0,
  p_civic_from numeric default null, p_civic_to numeric default null
)
returns table(id uuid, street_id uuid, source_kind text,
  anncsu_progressivo_accesso text, civic text, exponent text, specificity text,
  metric text, progressivo_snc text, total_count bigint)
language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select a.*, nullif(regexp_replace(coalesce(a.civic,''),'[^0-9]','','g'),'')::numeric as civic_number,
      nullif(regexp_replace(coalesce(a.progressivo_snc,''),'[^0-9]','','g'),'')::numeric as snc_number,
      case when a.civic is not null then 0 when a.metric is not null then 1 else 2 end as civic_group,
      op.first_name, op.last_name, op.record_created_at, op.record_updated_at, op.activity_at, op.recall_at
    from public.census_zone_streets zs
    join public.address_accesses a on a.street_id=zs.street_id
    left join lateral (
      select min(coalesce(sub.first_name,r.first_name)) first_name,
        min(coalesce(sub.last_name,r.last_name)) last_name,
        max(r.created_at) record_created_at, max(r.updated_at) record_updated_at,
        max(coalesce(i.last_interview,r.created_at)) activity_at,
        min(i.next_recall) recall_at
      from public.census_records r
      left join lateral (
        select sb.first_name,coalesce(sb.last_name,sb.company_name) last_name
        from public.census_record_subjects crs join public.subjects sb on sb.id=crs.subject_id
        where crs.census_record_id=r.id order by crs.is_primary desc limit 1
      ) sub on true
      left join lateral (
        select max(ci.interview_date)::timestamptz last_interview,
          min(ci.recall_date) filter (where ci.recall_date >= current_date) next_recall
        from public.census_interviews ci where ci.census_record_id=r.id
      ) i on true
      where r.address_access_id=a.id and r.census_zone_id=p_zone_id
        and p_sort not in ('civic_asc','civic_desc')
    ) op on true
    where zs.census_zone_id=p_zone_id and zs.street_id=p_street_id
      and (p_candidate_ids is null or a.id=any(p_candidate_ids))
      and (p_civic_from is null or nullif(regexp_replace(coalesce(a.civic,''),'[^0-9]','','g'),'')::numeric >= p_civic_from)
      and (p_civic_to is null or nullif(regexp_replace(coalesce(a.civic,''),'[^0-9]','','g'),'')::numeric <= p_civic_to)
      and (btrim(p_search)='' or concat_ws(' ',a.civic,a.exponent,a.metric,a.progressivo_snc,a.specificity)
        ilike '%' || replace(replace(btrim(p_search),'%',''),'_','') || '%'
        or a.id=any(p_search_contact_ids))
  )
  select f.id,f.street_id,f.source_kind,f.anncsu_progressivo_accesso,
    f.civic,f.exponent,f.specificity,f.metric,f.progressivo_snc,count(*) over() total_count
  from filtered f
  order by
    case when p_sort='civic_asc' then f.civic_group end asc nulls last,
    case when p_sort='civic_asc' then f.civic_number end asc nulls last,
    case when p_sort='civic_asc' then f.civic end asc nulls last,
    case when p_sort='civic_asc' then f.exponent end asc nulls last,
    case when p_sort='civic_asc' then f.snc_number end asc nulls last,
    case when p_sort='civic_desc' then f.civic_group end desc nulls last,
    case when p_sort='civic_desc' then f.civic_number end desc nulls last,
    case when p_sort='civic_desc' then f.civic end desc nulls last,
    case when p_sort='civic_desc' then f.exponent end desc nulls last,
    case when p_sort='civic_desc' then f.snc_number end desc nulls last,
    case when p_sort='name_asc' then f.last_name end asc nulls last,
    case when p_sort='name_asc' then f.first_name end asc nulls last,
    case when p_sort='name_desc' then f.last_name end desc nulls last,
    case when p_sort='name_desc' then f.first_name end desc nulls last,
    case when p_sort='created_desc' then f.record_created_at end desc nulls last,
    case when p_sort='created_asc' then f.record_created_at end asc nulls last,
    case when p_sort='updated_desc' then f.record_updated_at end desc nulls last,
    case when p_sort='updated_asc' then f.record_updated_at end asc nulls last,
    case when p_sort='activity_desc' then f.activity_at end desc nulls last,
    case when p_sort='activity_asc' then f.activity_at end asc nulls last,
    case when p_sort='recall_asc' then f.recall_at end asc nulls last,
    f.civic_group,f.civic_number,f.civic,f.exponent,f.id
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
$$;

revoke all on function public.street_access_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric) from public, anon;
grant execute on function public.street_access_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric) to authenticated;

create index if not exists census_interviews_record_date_idx
  on public.census_interviews(census_record_id,interview_date desc,recall_date);

-- One scoped summary query replaces a per-zone RPC and incomplete 200-access
-- previews previously used by the Zone list search.
create or replace function public.zone_overview_lab(p_search text default '')
returns table(zone_id uuid,street_count bigint,access_count bigint,record_count bigint)
language sql stable security invoker set search_path = '' as $$
  select z.id,
    (select count(*) from public.census_zone_streets zs where zs.census_zone_id=z.id),
    (select count(*) from public.census_zone_streets zs
      join public.address_accesses a on a.street_id=zs.street_id where zs.census_zone_id=z.id),
    (select count(*) from public.census_records r where r.census_zone_id=z.id)
  from public.census_zones z
  where btrim(p_search)='' or z.name ilike '%' || btrim(p_search) || '%'
    or exists (select 1 from public.municipalities m where m.id=z.municipality_id and m.name ilike '%' || btrim(p_search) || '%')
    or exists (select 1 from public.operators op where op.id=z.assignee_operator_id and op.display_name ilike '%' || btrim(p_search) || '%')
    or exists (select 1 from public.census_zone_streets zs join public.streets s on s.id=zs.street_id
      where zs.census_zone_id=z.id and (s.name ilike '%' || btrim(p_search) || '%'
        or s.locality_name ilike '%' || btrim(p_search) || '%'))
    or exists (select 1 from public.census_zone_streets zs join public.address_accesses a on a.street_id=zs.street_id
      where zs.census_zone_id=z.id and concat_ws('/',a.civic,a.exponent) ilike '%' || btrim(p_search) || '%');
$$;
revoke all on function public.zone_overview_lab(text) from public, anon;
grant execute on function public.zone_overview_lab(text) to authenticated;

create or replace function public.zone_street_page_lab(
  p_zone_id uuid,p_search text default '',p_limit integer default 30,p_offset integer default 0
)
returns table(id uuid,municipality_id uuid,name text,locality_name text,locality_id uuid,
  total_accesses integer,source_kind text,anncsu_progressivo_nazionale text,
  is_present_in_latest_snapshot boolean,manual_review_state text,total_count bigint)
language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select s.* from public.census_zone_streets zs join public.streets s on s.id=zs.street_id
    where zs.census_zone_id=p_zone_id and (btrim(p_search)='' or s.name ilike '%' || btrim(p_search) || '%'
      or s.locality_name ilike '%' || btrim(p_search) || '%'
      or exists (select 1 from public.address_accesses a where a.street_id=s.id
        and concat_ws('/',a.civic,a.exponent) ilike '%' || btrim(p_search) || '%')
      or exists (select 1 from public.census_records r join public.address_accesses a on a.id=r.address_access_id
        where r.census_zone_id=p_zone_id and a.street_id=s.id
          and (concat_ws(' ',r.first_name,r.last_name,r.phone) ilike '%' || btrim(p_search) || '%'
            or exists (select 1 from public.census_record_subjects crs join public.subjects sb on sb.id=crs.subject_id
              where crs.census_record_id=r.id and concat_ws(' ',sb.first_name,sb.last_name,sb.company_name,sb.phone)
                ilike '%' || btrim(p_search) || '%'))))
  )
  select f.id,f.municipality_id,f.name,f.locality_name,f.locality_id,
    (select count(*)::integer from public.address_accesses a where a.street_id=f.id),
    f.source_kind,f.anncsu_progressivo_nazionale,f.is_present_in_latest_snapshot,
    f.manual_review_state,count(*) over() total_count
  from filtered f order by f.name,f.id
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
$$;
revoke all on function public.zone_street_page_lab(uuid,text,integer,integer) from public, anon;
grant execute on function public.zone_street_page_lab(uuid,text,integer,integer) to authenticated;

commit;
