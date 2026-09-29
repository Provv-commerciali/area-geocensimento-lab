begin;
create or replace function public.complex_contact_counts_lab()
returns table(complex_id uuid,contact_count bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id,count(r.id) from public.complexes c
  left join public.census_records r on r.complex_id=c.id
  where (select auth.uid()) is not null
  group by c.id;
$$;
revoke all on function public.complex_contact_counts_lab() from public,anon;
grant execute on function public.complex_contact_counts_lab() to authenticated;
commit;
