begin;

-- RLS policies filter rows, but PostgreSQL table/schema privileges are checked
-- first. The initial migration created policies without granting privileges to
-- the Supabase `authenticated` role, causing permission denied at runtime.

grant usage on schema public to authenticated;

-- Start from an explicit deny baseline. Table owners and service_role retain
-- their own privileges; the browser never receives service_role credentials.
revoke all privileges on table
  public.operators,
  public.countries,
  public.regions,
  public.provinces,
  public.municipalities,
  public.census_zones,
  public.streets,
  public.census_zone_streets,
  public.civics,
  public.complexes,
  public.complex_civics,
  public.contact_types,
  public.census_records,
  public.census_interviews
from public, anon, authenticated;

-- Anonymous visitors must authenticate before reading any LAB domain data.
revoke usage on schema public from public, anon;

-- Reference/identity data is read-only for LAB users. Limit operators to the
-- columns consumed by the application so auth_user_id is not exposed.
grant select (id, display_name) on table public.operators to authenticated;
grant select on table
  public.countries,
  public.regions,
  public.provinces,
  public.municipalities,
  public.contact_types
to authenticated;

-- Operational Censimento data may be managed by authenticated LAB users.
grant select, insert, update, delete on table
  public.census_zones,
  public.streets,
  public.census_zone_streets,
  public.civics,
  public.complexes,
  public.complex_civics,
  public.census_records,
  public.census_interviews
to authenticated;

-- Lookup and operator rows are maintained through controlled SQL/admin flows,
-- not from the browser. Remove the overly broad write policies created first.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'operators', 'countries', 'regions', 'provinces', 'municipalities',
    'contact_types'
  ]
  loop
    foreach policy_name in array array[
      'lab authenticated insert',
      'lab authenticated update',
      'lab authenticated delete'
    ]
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end $$;

-- Recreate every policy with an explicit authenticated-user predicate. The
-- policies remain intentionally shared across LAB users: this milestone has no
-- tenant, agency, organisation, or complex role model.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'operators', 'countries', 'regions', 'provinces', 'municipalities',
    'census_zones', 'streets', 'census_zone_streets', 'civics', 'complexes',
    'complex_civics', 'contact_types', 'census_records', 'census_interviews'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'lab authenticated read', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null)',
      'lab authenticated read', table_name
    );
  end loop;

  foreach table_name in array array[
    'census_zones', 'streets', 'census_zone_streets', 'civics', 'complexes',
    'complex_civics', 'census_records', 'census_interviews'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'lab authenticated insert', table_name);
    execute format('drop policy if exists %I on public.%I', 'lab authenticated update', table_name);
    execute format('drop policy if exists %I on public.%I', 'lab authenticated delete', table_name);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) is not null)',
      'lab authenticated insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      'lab authenticated update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) is not null)',
      'lab authenticated delete', table_name
    );
  end loop;
end $$;

commit;
