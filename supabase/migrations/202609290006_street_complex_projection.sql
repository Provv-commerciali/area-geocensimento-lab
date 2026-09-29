begin;

-- Remove an obsolete signature before defining the final RPC shape.
drop function if exists public.street_representation_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric);

-- Page visual items, not raw accesses: one row per free access or Complex.
-- A Complex is anchored to its primary access when that access is on this Street;
-- otherwise its first local access is the territorial anchor.
create or replace function public.street_representation_page_lab(
  p_zone_id uuid, p_street_id uuid, p_search text default '',
  p_candidate_ids uuid[] default null, p_search_contact_ids uuid[] default '{}',
  p_sort text default 'civic_asc', p_limit integer default 40, p_offset integer default 0,
  p_civic_from numeric default null, p_civic_to numeric default null,
  p_complex_id uuid default null
)
returns table(id uuid, street_id uuid, source_kind text,
  anncsu_progressivo_accesso text, civic text, exponent text, specificity text,
  metric text, progressivo_snc text, complex_id uuid, total_count bigint)
language sql stable security invoker set search_path = '' as $$
  with base as (
    select a.id,a.street_id,a.source_kind,a.anncsu_progressivo_accesso,a.civic,a.exponent,
      a.specificity,a.metric,a.progressivo_snc,ca.complex_id,coalesce(ca.is_primary,false) is_primary,
      coalesce(ca.complex_id::text,a.id::text) group_key,
      nullif(regexp_replace(coalesce(a.civic,''),'[^0-9]','','g'),'')::numeric civic_number,
      nullif(regexp_replace(coalesce(a.progressivo_snc,''),'[^0-9]','','g'),'')::numeric snc_number,
      case when a.civic is not null then 0 when a.metric is not null then 1 else 2 end civic_group,
      (p_candidate_ids is null or a.id=any(p_candidate_ids)) candidate_match,
      (p_civic_from is null or nullif(regexp_replace(coalesce(a.civic,''),'[^0-9]','','g'),'')::numeric >= p_civic_from)
        and (p_civic_to is null or nullif(regexp_replace(coalesce(a.civic,''),'[^0-9]','','g'),'')::numeric <= p_civic_to) civic_match,
      (btrim(p_search)='' or concat_ws(' ',a.civic,a.exponent,a.metric,a.progressivo_snc,a.specificity)
        ilike '%' || replace(replace(btrim(p_search),'%',''),'_','') || '%'
        or a.id=any(p_search_contact_ids)
        or c.name ilike '%' || replace(replace(btrim(p_search),'%',''),'_','') || '%') search_match,
      op.first_name,op.last_name,op.record_created_at,op.record_updated_at,op.activity_at,op.recall_at
    from public.census_zone_streets zs
    join public.address_accesses a on a.street_id=zs.street_id
    left join public.complex_address_accesses ca on ca.address_access_id=a.id
    left join public.complexes c on c.id=ca.complex_id and c.census_zone_id=zs.census_zone_id
    left join lateral (
      select min(coalesce(sub.first_name,r.first_name)) first_name,
        min(coalesce(sub.last_name,r.last_name)) last_name,
        max(r.created_at) record_created_at,max(r.updated_at) record_updated_at,
        max(coalesce(i.last_interview,r.created_at)) activity_at,min(i.next_recall) recall_at
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
  ), grouped as (
    select b.*,
      row_number() over(partition by b.group_key order by b.is_primary desc,b.civic_group,b.civic_number,b.civic,b.exponent,b.snc_number,b.id) anchor_rank,
      bool_or(b.candidate_match) over(partition by b.group_key) has_candidate,
      bool_or(b.civic_match) over(partition by b.group_key) has_civic,
      bool_or(b.search_match) over(partition by b.group_key) has_search,
      min(b.first_name) over(partition by b.group_key) group_first_name,
      min(b.last_name) over(partition by b.group_key) group_last_name,
      max(b.record_created_at) over(partition by b.group_key) group_created_at,
      max(b.record_updated_at) over(partition by b.group_key) group_updated_at,
      max(b.activity_at) over(partition by b.group_key) group_activity_at,
      min(b.recall_at) over(partition by b.group_key) group_recall_at
    from base b
  ), filtered as (
    select * from grouped where anchor_rank=1 and has_candidate and has_civic and has_search
      and (p_complex_id is null or complex_id=p_complex_id)
  )
  select f.id,f.street_id,f.source_kind,f.anncsu_progressivo_accesso,
    f.civic,f.exponent,f.specificity,f.metric,f.progressivo_snc,f.complex_id,count(*) over() total_count
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
    case when p_sort='name_asc' then f.group_last_name end asc nulls last,
    case when p_sort='name_asc' then f.group_first_name end asc nulls last,
    case when p_sort='name_desc' then f.group_last_name end desc nulls last,
    case when p_sort='name_desc' then f.group_first_name end desc nulls last,
    case when p_sort='created_desc' then f.group_created_at end desc nulls last,
    case when p_sort='created_asc' then f.group_created_at end asc nulls last,
    case when p_sort='updated_desc' then f.group_updated_at end desc nulls last,
    case when p_sort='updated_asc' then f.group_updated_at end asc nulls last,
    case when p_sort='activity_desc' then f.group_activity_at end desc nulls last,
    case when p_sort='activity_asc' then f.group_activity_at end asc nulls last,
    case when p_sort='recall_asc' then f.group_recall_at end asc nulls last,
    f.civic_group,f.civic_number,f.civic,f.exponent,f.id
  limit least(greatest(p_limit,1),100) offset greatest(p_offset,0);
$$;

revoke all on function public.street_representation_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric,uuid) from public,anon;
grant execute on function public.street_representation_page_lab(uuid,uuid,text,uuid[],uuid[],text,integer,integer,numeric,numeric,uuid) to authenticated;

commit;
