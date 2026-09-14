begin;

alter table public.operators
  add column paid_services_monthly_budget numeric(12,2) not null default 30.00 check (paid_services_monthly_budget >= 0),
  add column paid_services_per_request_limit numeric(12,2) not null default 10.00 check (paid_services_per_request_limit >= 0),
  add column can_manage_paid_cadastral_services boolean not null default false;

comment on column public.operators.paid_services_monthly_budget is 'Maximum estimated OpenAPI Catasto expenditure per calendar month for this operator.';
comment on column public.operators.paid_services_per_request_limit is 'Maximum estimated OpenAPI Catasto expenditure for one explicit request by this operator.';
comment on column public.operators.can_manage_paid_cadastral_services is 'LAB cost-governance permission. It is distinct from permission to make a paid request.';

-- Existing authorized LAB operators become the initial managers; future authorizations remain manager-denied.
update public.operators set can_manage_paid_cadastral_services=true where can_use_paid_cadastral_services=true;

create or replace function public.enforce_paid_cadastral_budget_lab()
returns trigger language plpgsql security definer set search_path='' as $$
declare policy public.operators%rowtype; month_spend numeric(12,4);
begin
  select * into policy from public.operators where auth_user_id=new.requested_by for update;
  if not found or not policy.can_use_paid_cadastral_services then raise exception 'Operatore non autorizzato ai servizi OpenAPI a consumo.'; end if;
  if new.estimated_cost is null or new.estimated_cost < 0 then raise exception 'Costo previsto mancante o non valido.'; end if;
  if new.estimated_cost > policy.paid_services_per_request_limit then raise exception 'Il costo previsto supera il massimale per richiesta dell''operatore.'; end if;
  select coalesce(sum(coalesce(known_cost,estimated_cost)),0) into month_spend from public.cadastral_requests
    where requested_by=new.requested_by and requested_at>=date_trunc('month',now()) and requested_at<date_trunc('month',now())+interval '1 month'
      and status in ('CREATED','IN_PROGRESS','COMPLETED');
  if month_spend+new.estimated_cost>policy.paid_services_monthly_budget then raise exception 'Budget mensile OpenAPI dell''operatore esaurito.'; end if;
  return new;
end $$;
revoke all on function public.enforce_paid_cadastral_budget_lab() from public,anon,authenticated;
create trigger cadastral_requests_budget before insert on public.cadastral_requests for each row execute function public.enforce_paid_cadastral_budget_lab();

create or replace function public.set_paid_service_limits_lab(p_operator_id uuid,p_monthly_budget numeric,p_per_request_limit numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_monthly_budget<0 or p_per_request_limit<0 then raise exception 'I limiti non possono essere negativi.'; end if;
  if not exists(select 1 from public.operators where auth_user_id=(select auth.uid()) and can_manage_paid_cadastral_services) then raise exception 'Non sei autorizzato a gestire i limiti di spesa.'; end if;
  update public.operators set paid_services_monthly_budget=p_monthly_budget,paid_services_per_request_limit=p_per_request_limit where id=p_operator_id;
  if not found then raise exception 'Operatore non trovato.'; end if;
end $$;
revoke all on function public.set_paid_service_limits_lab(uuid,numeric,numeric) from public,anon;
grant execute on function public.set_paid_service_limits_lab(uuid,numeric,numeric) to authenticated;

commit;
