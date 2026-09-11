begin;

-- Persistence-only projection for bounded on-demand registry lookup.
create extension if not exists pg_trgm with schema extensions;

alter table public.subjects
  add column search_text text generated always as (
    lower(
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(company_name, '') || ' ' || coalesce(tax_code, '') || ' ' ||
      coalesce(vat_number, '')
    )
  ) stored;

create index subjects_search_text_trgm_idx
  on public.subjects using gin (search_text extensions.gin_trgm_ops);

commit;
