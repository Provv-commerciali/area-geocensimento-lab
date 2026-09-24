begin;

-- Order-independent searches apply one ILIKE predicate per user token. This
-- generated document adds the operational identifiers used by the UI without
-- changing the authoritative Subject fields.
alter table public.subjects
  add column search_document text generated always as (
    lower(
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' || coalesce(first_name, '') || ' ' ||
      coalesce(company_name, '') || ' ' || coalesce(tax_code, '') || ' ' ||
      coalesce(vat_number, '') || ' ' || coalesce(phone, '') || ' ' ||
      coalesce(email, '')
    )
  ) stored;

create index subjects_search_document_trgm_idx
  on public.subjects using gin (search_document extensions.gin_trgm_ops);

commit;
