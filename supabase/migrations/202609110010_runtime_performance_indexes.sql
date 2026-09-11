begin;

-- Reverse traversal of many-to-many links is not covered by the leading column
-- of the composite primary keys.
create index if not exists census_zone_streets_street_idx
  on public.census_zone_streets (street_id, census_zone_id);
create index if not exists complex_civics_civic_idx
  on public.complex_civics (civic_id, complex_id);

-- Existing screens filter these nullable relationships independently.
create index if not exists census_records_complex_idx
  on public.census_records (complex_id)
  where complex_id is not null;
create index if not exists census_records_operator_idx
  on public.census_records (responsible_operator_id)
  where responsible_operator_id is not null;
create index if not exists census_records_contact_type_idx
  on public.census_records (contact_type_id);

-- Supports the deterministic registry ordering without sorting the full table.
create index if not exists subjects_created_at_idx
  on public.subjects (created_at, id);

commit;
