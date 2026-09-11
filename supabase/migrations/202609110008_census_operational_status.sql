begin;

create table public.census_operational_settings (
  id smallint primary key default 1 check (id = 1),
  stale_news_days integer not null default 30 check (stale_news_days between 1 and 3650),
  updated_at timestamptz not null default now()
);

insert into public.census_operational_settings (id, stale_news_days)
values (1, 30)
on conflict (id) do nothing;

create trigger census_operational_settings_updated_at
before update on public.census_operational_settings
for each row execute function public.set_updated_at();

alter table public.census_operational_settings enable row level security;

revoke all privileges on table public.census_operational_settings from public, anon, authenticated;
grant select on table public.census_operational_settings to authenticated;
grant update (stale_news_days) on table public.census_operational_settings to authenticated;

create policy "lab authenticated read" on public.census_operational_settings
for select to authenticated using ((select auth.uid()) is not null);

create policy "lab authenticated update" on public.census_operational_settings
for update to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null and id = 1);

commit;
