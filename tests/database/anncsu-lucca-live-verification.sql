-- Execute only after the 2026-09-15 ANNCSU Province 046 import on the dedicated LAB.
do $$
declare projected extensions.geometry; round_trip extensions.geometry;
begin
  projected := extensions.st_transform(
    extensions.st_setsrid(extensions.st_makepoint(11.0094693,43.9015994),6706),3857);
  if abs(extensions.st_x(projected)-1225568.516380178)>0.01 or
     abs(extensions.st_y(projected)-5450227.069928512)>0.01 then
    raise exception 'EPSG:6706 to EPSG:3857 regression failed';
  end if;
  round_trip := extensions.st_transform(projected,6706);
  if abs(extensions.st_x(round_trip)-11.0094693)>0.0000001 or
     abs(extensions.st_y(round_trip)-43.9015994)>0.0000001 then
    raise exception 'EPSG:6706 round trip failed';
  end if;
end $$;

do $$
begin
  if (select count(*) from public.anncsu_import_runs
    where territorial_scope='PROVINCE:046' and release_date='2026-09-15' and state='APPLIED')<>2 then
    raise exception 'Lucca import pair not applied';
  end if;
  if (select count(*) from public.streets
    where source_kind='OFFICIAL_ANNCSU' and is_present_in_latest_snapshot)<>10426 then
    raise exception 'Lucca Street count mismatch';
  end if;
  if (select count(*) from public.address_accesses
    where source_kind='OFFICIAL_ANNCSU' and is_present_in_latest_snapshot)<>250604 then
    raise exception 'Lucca AddressAccess count mismatch';
  end if;
  if (select count(distinct municipality_id) from public.streets
    where source_kind='OFFICIAL_ANNCSU')<>33 then
    raise exception 'Lucca Municipality count mismatch';
  end if;
  if (select count(*) from public.streets
    where source_kind='OFFICIAL_ANNCSU' and total_accesses=0)<>1464 then
    raise exception 'Zero-access Street count mismatch';
  end if;
  if (select count(*) from public.access_location_observations
    where source_kind='ANNCSU' and validation_state='VALID')<>215888 then
    raise exception 'Valid coordinate count mismatch';
  end if;
  if (select count(*) from public.access_location_observations
    where source_kind='ANNCSU' and validation_state='QUARANTINED')<>3 then
    raise exception 'Quarantine count mismatch';
  end if;
  if exists(select 1 from public.address_accesses a left join public.streets s on s.id=a.street_id
    where s.id is null) then
    raise exception 'Orphan AddressAccess';
  end if;
  if exists(select 1 from public.streets s left join (
      select street_id,count(*) n from public.address_accesses group by street_id
    ) a on a.street_id=s.id
    where s.source_kind='OFFICIAL_ANNCSU' and s.total_accesses<>coalesce(a.n,0)) then
    raise exception 'TOTALE_ACCESSI mismatch';
  end if;
end $$;
