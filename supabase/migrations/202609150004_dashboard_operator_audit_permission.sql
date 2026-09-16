begin;

-- The browser intentionally sees only operators.id/display_name. Event attribution
-- needs auth_user_id, so the trigger owns this single privileged lookup without
-- widening SELECT privileges on the operators table.
alter function public.audit_census_dashboard_events_lab() security definer;
revoke all on function public.audit_census_dashboard_events_lab() from public, anon, authenticated;

comment on function public.audit_census_dashboard_events_lab() is
  'Trigger-only dashboard attribution boundary. Uses a locked search_path and maps auth.uid() without exposing operators.auth_user_id to browser roles.';

commit;
