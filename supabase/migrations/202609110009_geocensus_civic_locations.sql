begin;

alter table public.civics
  add column location extensions.geography(Point, 4326),
  add column geocoding_status text not null default 'NOT_GEOLOCATED'
    check (geocoding_status in ('GEOLOCATED', 'NOT_GEOLOCATED', 'NEEDS_REVIEW')),
  add column geocoding_source text,
  add column geocoded_at timestamptz,
  add column geocoding_quality numeric check (geocoding_quality is null or geocoding_quality between 0 and 1),
  add column geocoding_review_note text,
  add constraint civics_geocoding_consistency check (
    (geocoding_status = 'GEOLOCATED' and location is not null and geocoding_source is not null and geocoded_at is not null)
    or (geocoding_status <> 'GEOLOCATED')
  );

comment on column public.civics.location is 'Cached civic geocoding only; WGS84 Point. Contacts reuse the civic location.';
comment on column public.civics.geocoding_status is 'Explicit map eligibility; NEEDS_REVIEW locations are not rendered as authoritative.';
create index civics_location_gix on public.civics using gist (location);

-- Existing authenticated CRUD grant on civics covers these columns; RLS remains enabled.
-- Anonymous access stays revoked by migration 002.

commit;
