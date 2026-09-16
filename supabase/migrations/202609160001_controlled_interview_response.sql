begin;

alter table public.census_interviews
  add constraint census_interviews_response_controlled
  check (response is null or response in ('Risposto', 'Nessuna risposta'))
  not valid;

comment on constraint census_interviews_response_controlled on public.census_interviews is
  'Enforces the controlled response vocabulary on new interview writes while preserving historical LAB text.';

commit;
