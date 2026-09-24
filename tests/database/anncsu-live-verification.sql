-- Run only against the dedicated LAB after migration and Toscana import.
-- Numeric PostGIS control approved in DEC-054 (0.01 m, 1e-7 degree).
do $$
declare source_point extensions.geometry; projected extensions.geometry; round_trip extensions.geometry;
begin
  source_point := extensions.st_setsrid(extensions.st_makepoint(11.0094693,43.9015994),6706);
  projected := extensions.st_transform(source_point,3857);
  if abs(extensions.st_x(projected)-1225568.516380178)>0.01 or
     abs(extensions.st_y(projected)-5450227.069928512)>0.01 then
    raise exception 'ANNCSU EPSG:6706 to EPSG:3857 numeric control failed';
  end if;
  round_trip := extensions.st_transform(projected,6706);
  if abs(extensions.st_x(round_trip)-11.0094693)>0.0000001 or
     abs(extensions.st_y(round_trip)-43.9015994)>0.0000001 then
    raise exception 'ANNCSU CRS round trip failed';
  end if;
end $$;

do $$
begin
  if (select count(*) from public.anncsu_import_runs where state='APPLIED')<2 then
    raise exception 'ANNCSU import pair not applied';
  end if;
  if (select count(*) from public.streets where source_kind='OFFICIAL_ANNCSU' and is_present_in_latest_snapshot)<87147 then
    raise exception 'ANNCSU Toscana Street count below validated source';
  end if;
  if (select count(*) from public.address_accesses where source_kind='OFFICIAL_ANNCSU' and is_present_in_latest_snapshot)<1901458 then
    raise exception 'ANNCSU Toscana AddressAccess count below validated source';
  end if;
  if exists (select 1 from public.address_accesses a left join public.streets s on s.id=a.street_id where s.id is null) then
    raise exception 'Orphan AddressAccess';
  end if;
end $$;
