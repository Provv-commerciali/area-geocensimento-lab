-- Controlled fictional LAB seed. Apply only to the dedicated area-geocensimento-lab project.
-- The four Bologna hierarchy rows only anchor demo entities; they are reconciled
-- in place by scripts/sync-istat-territories.ts and are not the national archive.
begin;
insert into public.operators(id,display_name) values
('00000000-0000-4000-8000-000000000001','Elena Rossi'),('00000000-0000-4000-8000-000000000002','Marco Bianchi'),('00000000-0000-4000-8000-000000000003','Sara Conti') on conflict do nothing;
insert into public.countries(id,code,name) values ('10000000-0000-4000-8000-000000000001','IT','Italia') on conflict do nothing;
insert into public.regions(id,country_id,name) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Emilia-Romagna') on conflict do nothing;
insert into public.provinces(id,region_id,code,name) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','BO','Bologna') on conflict do nothing;
insert into public.municipalities(id,province_id,cadastral_code,name) values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','A944','Bologna') on conflict do nothing;
insert into public.census_zones(id,municipality_id,name,assignee_operator_id) values
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Centro Storico','00000000-0000-4000-8000-000000000001'),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','Porto–Saragozza','00000000-0000-4000-8000-000000000002') on conflict do nothing;
insert into public.streets(id,municipality_id,name) values
('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Via Roma'),
('60000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','Via San Vitale'),
('60000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','Via Marconi'),
('60000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001','Via Indipendenza'),
('60000000-0000-4000-8000-000000000005','40000000-0000-4000-8000-000000000001','Via Rizzoli') on conflict do nothing;
insert into public.census_zone_streets values
('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',now()),('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002',now()),('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000005',now()),('50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003',now()),('50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000004',now()) on conflict do nothing;
insert into public.civics(id,street_id,number,extension)
select ('70000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid, ('60000000-0000-4000-8000-'||lpad((((g-1)%5)+1)::text,12,'0'))::uuid, (g*2)::text, case when g%6=1 then case when g%12=1 then 'A' else 'bis' end end from generate_series(1,20) g on conflict do nothing;
insert into public.complexes(id,census_zone_id,name,sheet,parcel,unit_count,description) values
('80000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Corte Mercanti','12','88',18,'Complesso multicivico fittizio'),
('80000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','Residenza Portico','14','102',10,'Dataset LAB'),
('80000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000002','Palazzo del Canale',null,null,14,'Dataset LAB') on conflict do nothing;
insert into public.complex_civics(complex_id,civic_id) values
('80000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001'),('80000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000006'),('80000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000011'),
('80000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002'),('80000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000007'),
('80000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000003'),('80000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000008') on conflict do nothing;
insert into public.census_records(id,census_zone_id,street_id,civic_id,complex_id,contact_type_id,responsible_operator_id,first_name,last_name,phone,building_scope,floor_label,rooms,surface_sqm,occupancy,has_elevator,sheet,parcel,subaltern,cadastral_category,inherited,is_appraised,created_at)
select ('90000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,
case when ((g-1)%5)+1 in (1,2,5) then '50000000-0000-4000-8000-000000000001' else '50000000-0000-4000-8000-000000000002' end::uuid,
('60000000-0000-4000-8000-'||lpad(((((g-1)%5)+1))::text,12,'0'))::uuid,('70000000-0000-4000-8000-'||lpad((((g-1)%20)+1)::text,12,'0'))::uuid,
case when g%9=0 then '80000000-0000-4000-8000-000000000001'::uuid end, ((g-1)%4)+1,('00000000-0000-4000-8000-'||lpad((((g-1)%3)+1)::text,12,'0'))::uuid,
(array['Anna','Luca','Giulia','Paolo','Chiara','Davide'])[((g-1)%6)+1],(array['Ferri','Romano','Esposito','Gallo','De Luca','Mancini'])[((g-1)%6)+1],
'051 555 '||(1000+g)::text,case when g%6=0 then 'Intero edificio' else 'Parte di edificio' end,case when g%6=0 then 'Intero edificio' else ((g%5)+1)::text||'°' end,
2+(g%6),45+(g*3),case when g%3=0 then 'Occupato' else 'Libero' end,g%2=0,case when g%5=1 then null else (10+(g%5))::text end,case when g%5=1 then null else (80+g)::text end,case when g%3=0 then g::text end,case when g%2=0 then 'A/3' else 'A/2' end,g%11=0,(g%4=0 and g%8=0),date '2026-01-01'+g
from generate_series(1,36) g on conflict do nothing;
insert into public.census_interviews(id,census_record_id,operator_id,interview_date,recall_date,response,reason,outcome)
select gen_random_uuid(),r.id,'00000000-0000-4000-8000-000000000001',date '2026-08-01'+(row_number() over())::int,case when (row_number() over())::int%2=0 then date '2026-12-15' end,'Da ricontattare','Verifica disponibilità','In attesa' from public.census_records r where right(r.id::text,1) in ('3','6','9');
commit;
