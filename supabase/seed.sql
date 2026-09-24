-- LAB seed after ANNCSU cutover: only stable operators and the territorial
-- hierarchy anchor. Official Streets and AddressAccesses are imported from the
-- verified regional ZIP; no fabricated ANNCSU identity is inserted here.
begin;
insert into public.operators(id,display_name) values
('00000000-0000-4000-8000-000000000001','Elena Rossi'),
('00000000-0000-4000-8000-000000000002','Marco Bianchi'),
('00000000-0000-4000-8000-000000000003','Sara Conti') on conflict do nothing;
insert into public.countries(id,code,name) values
('10000000-0000-4000-8000-000000000001','IT','Italia') on conflict do nothing;
insert into public.regions(id,country_id,name) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Emilia-Romagna') on conflict do nothing;
insert into public.provinces(id,region_id,code,name) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','BO','Bologna') on conflict do nothing;
insert into public.municipalities(id,province_id,cadastral_code,name) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','A944','Bologna') on conflict do nothing;
commit;
