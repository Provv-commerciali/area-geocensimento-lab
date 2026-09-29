begin;
create or replace function public.assert_complex_delete_safe_lab() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists(select 1 from public.census_records where complex_id=old.id)
    or exists(select 1 from public.complex_photos where complex_id=old.id)
  then raise exception 'Complex has Contacts or photo/OCR audit and cannot be deleted' using errcode='23503'; end if;
  return old;
end $$;
create trigger complex_delete_guard before delete on public.complexes
  for each row execute function public.assert_complex_delete_safe_lab();
commit;
