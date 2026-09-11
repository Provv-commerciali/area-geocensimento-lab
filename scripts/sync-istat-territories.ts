import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import readXlsxFile from "read-excel-file/node";

export const ISTAT_SOURCE_URL = "https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xlsx";
export const ISTAT_SOURCE_NAME = "ISTAT_SITUAS";

const CURRENT_RELEASE_COUNTS: Record<string, { provinces: number; municipalities: number }> = {
  "2026-02-21": { provinces: 110, municipalities: 7894 },
};
const OFFICIAL_REGION_CODES = Array.from({ length: 20 }, (_, index) => String(index + 1).padStart(2, "0"));

export interface IstatTerritoryRow {
  regionCode: string;
  regionName: string;
  geographicDivisionCode: string;
  geographicDivisionName: string;
  provinceCode: string;
  provinceName: string;
  provinceType: number;
  vehicleCode: string;
  nuts3Code: string;
  municipalityCode: string;
  municipalityName: string;
  municipalityItalianName: string;
  municipalityOtherLanguageName: string | null;
  cadastralCode: string;
}

export interface TerritorySummary {
  datasetDate: string;
  regions: number;
  provinces: number;
  municipalities: number;
}

type Cell = string | number | boolean | Date | null;

function text(cell: Cell): string {
  return cell == null ? "" : String(cell).trim();
}

function code(cell: Cell, length: number): string {
  return text(cell).padStart(length, "0");
}

function normalizedHeader(cell: Cell): string {
  return text(cell).normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").toLowerCase();
}

function assertHeader(row: Cell[], index: number, expectedFragment: string): void {
  if (!normalizedHeader(row[index]).includes(expectedFragment)) {
    throw new Error(`Formato ISTAT inatteso: colonna ${index + 1} non contiene “${expectedFragment}”`);
  }
}

function datasetDateFromSheet(sheetName: string): string {
  const match = sheetName.match(/(\d{2})_(\d{2})_(\d{4})/);
  if (!match) throw new Error(`Impossibile ricavare la data del dataset dal foglio “${sheetName}”`);
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export async function parseIstatWorkbook(input: Buffer): Promise<{ rows: IstatTerritoryRow[]; datasetDate: string }> {
  const sheets = await readXlsxFile(input);
  const sheet = sheets.find((candidate) => candidate.sheet.startsWith("CODICI"));
  if (!sheet) throw new Error("Foglio ISTAT CODICI non trovato");
  const [header, ...dataRows] = sheet.data as Cell[][];
  if (!header) throw new Error("Workbook ISTAT vuoto");

  assertHeader(header, 0, "codice regione");
  assertHeader(header, 1, "unita territoriale sovracomunale");
  assertHeader(header, 4, "codice comune formato alfanumerico");
  assertHeader(header, 5, "denominazione (italiana e straniera)");
  assertHeader(header, 10, "denominazione regione");
  assertHeader(header, 11, "denominazione dell'unita territoriale sovracomunale");
  assertHeader(header, 20, "codice catastale");

  const rows = dataRows.filter((row) => text(row[4])).map((row): IstatTerritoryRow => ({
    regionCode: code(row[0], 2),
    provinceCode: code(row[1], 3),
    municipalityCode: code(row[4], 6),
    municipalityName: text(row[5]),
    municipalityItalianName: text(row[6]),
    municipalityOtherLanguageName: text(row[7]) || null,
    geographicDivisionCode: text(row[8]),
    geographicDivisionName: text(row[9]),
    regionName: text(row[10]),
    provinceName: text(row[11]),
    provinceType: Number(row[12]),
    vehicleCode: text(row[14]),
    cadastralCode: text(row[20]),
    nuts3Code: text(row[26]),
  }));
  return { rows, datasetDate: datasetDateFromSheet(sheet.sheet) };
}

export function validateTerritories(rows: IstatTerritoryRow[], datasetDate: string): TerritorySummary {
  const regions = new Map<string, string>();
  const provinces = new Map<string, string>();
  const municipalities = new Set<string>();

  for (const row of rows) {
    if (!row.regionName || !row.provinceName || !row.municipalityName) throw new Error("Riga ISTAT priva di denominazione");
    if (!/^\d{2}$/.test(row.regionCode) || !/^\d{3}$/.test(row.provinceCode) || !/^\d{6}$/.test(row.municipalityCode)) {
      throw new Error(`Codice ISTAT non valido per ${row.municipalityName}`);
    }
    if (regions.has(row.regionCode) && regions.get(row.regionCode) !== row.regionName) throw new Error(`Regione incoerente: ${row.regionCode}`);
    regions.set(row.regionCode, row.regionName);
    const provinceIdentity = `${row.regionCode}|${row.provinceName}|${row.provinceType}`;
    if (provinces.has(row.provinceCode) && provinces.get(row.provinceCode) !== provinceIdentity) throw new Error(`Provincia incoerente: ${row.provinceCode}`);
    provinces.set(row.provinceCode, provinceIdentity);
    if (municipalities.has(row.municipalityCode)) throw new Error(`Comune duplicato: ${row.municipalityCode}`);
    municipalities.add(row.municipalityCode);
  }

  const actualRegionCodes = [...regions.keys()].sort();
  if (JSON.stringify(actualRegionCodes) !== JSON.stringify(OFFICIAL_REGION_CODES)) throw new Error("Il dataset non contiene tutte e sole le 20 Regioni italiane");
  if (provinces.size < 100 || provinces.size > 130) throw new Error(`Conteggio unità territoriali anomalo: ${provinces.size}`);
  if (municipalities.size < 7000 || municipalities.size > 8500) throw new Error(`Conteggio Comuni anomalo: ${municipalities.size}`);

  const expected = CURRENT_RELEASE_COUNTS[datasetDate];
  if (expected && (provinces.size !== expected.provinces || municipalities.size !== expected.municipalities)) {
    throw new Error(`Dataset ${datasetDate} incompleto: attesi ${expected.provinces} territori e ${expected.municipalities} Comuni`);
  }
  return { datasetDate, regions: regions.size, provinces: provinces.size, municipalities: municipalities.size };
}

async function loadSource(sourceFile?: string): Promise<Buffer> {
  if (sourceFile) return readFile(sourceFile);
  const response = await fetch(ISTAT_SOURCE_URL, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Download ISTAT fallito: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function syncDatabase(rows: IstatTerritoryRow[], summary: TerritorySummary, sourceHash: string): Promise<string> {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL non impostata");
  const useSsl = process.env.SUPABASE_DB_SSL !== "false";
  const client = new Client({ connectionString, ssl: useSsl ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(`
      create temporary table istat_territories_import (
        region_code text, region_name text, geographic_division_code text, geographic_division_name text,
        province_code text, province_name text, province_type smallint, vehicle_code text, nuts3_code text,
        municipality_code text, municipality_name text, municipality_italian_name text,
        municipality_other_language_name text, cadastral_code text
      ) on commit drop
    `);
    await client.query(`
      create temporary table istat_import_metadata (
        source_updated_on date not null, source_hash text not null,
        region_count integer not null, province_count integer not null, municipality_count integer not null
      ) on commit drop
    `);
    await client.query(`
      insert into istat_import_metadata (source_updated_on, source_hash, region_count, province_count, municipality_count)
      values ($1::date, $2, $3, $4, $5)
    `, [summary.datasetDate, sourceHash, summary.regions, summary.provinces, summary.municipalities]);
    await client.query(`
      insert into istat_territories_import
      select * from jsonb_to_recordset($1::jsonb) as item(
        "regionCode" text, "regionName" text, "geographicDivisionCode" text, "geographicDivisionName" text,
        "provinceCode" text, "provinceName" text, "provinceType" smallint, "vehicleCode" text, "nuts3Code" text,
        "municipalityCode" text, "municipalityName" text, "municipalityItalianName" text,
        "municipalityOtherLanguageName" text, "cadastralCode" text
      )
    `, [JSON.stringify(rows)]);

    await client.query(`
      insert into public.countries (code, name)
      values ('IT', 'Italia')
      on conflict (code) do update set name = excluded.name;

      update public.regions existing
      set istat_code = source.region_code,
          name = source.region_name,
          geographic_division_code = source.geographic_division_code,
          geographic_division_name = source.geographic_division_name,
          source = '${ISTAT_SOURCE_NAME}', source_updated_on = (select source_updated_on from istat_import_metadata), is_active = true
      from (
        select distinct region_code, region_name, geographic_division_code, geographic_division_name
        from istat_territories_import
      ) source
      join public.countries country on country.code = 'IT'
      where existing.country_id = country.id
        and existing.istat_code is null
        and lower(btrim(existing.name)) = lower(btrim(source.region_name));

      insert into public.regions (
        country_id, istat_code, name, geographic_division_code, geographic_division_name,
        source, source_updated_on, is_active
      )
      select country.id, source.region_code, source.region_name,
             source.geographic_division_code, source.geographic_division_name,
             '${ISTAT_SOURCE_NAME}', (select source_updated_on from istat_import_metadata), true
      from (
        select distinct region_code, region_name, geographic_division_code, geographic_division_name
        from istat_territories_import
      ) source
      cross join public.countries country
      where country.code = 'IT'
      on conflict (istat_code) do update set
        country_id = excluded.country_id, name = excluded.name,
        geographic_division_code = excluded.geographic_division_code,
        geographic_division_name = excluded.geographic_division_name,
        source = excluded.source, source_updated_on = excluded.source_updated_on, is_active = true;

      update public.provinces existing
      set istat_code = source.province_code, name = source.province_name,
          code = nullif(source.vehicle_code, ''), territorial_unit_type = source.province_type,
          source = '${ISTAT_SOURCE_NAME}',
          source_updated_on = (select source_updated_on from istat_import_metadata), is_active = true
      from (
        select distinct region_code, province_code, province_name, province_type, vehicle_code
        from istat_territories_import
      ) source
      join public.regions region on region.istat_code = source.region_code
      where existing.region_id = region.id
        and existing.istat_code is null
        and lower(btrim(existing.name)) = lower(btrim(source.province_name));

      insert into public.provinces (
        region_id, istat_code, code, name, territorial_unit_type,
        source, source_updated_on, is_active
      )
      select region.id, source.province_code, nullif(source.vehicle_code, ''), source.province_name,
             source.province_type, '${ISTAT_SOURCE_NAME}', (select source_updated_on from istat_import_metadata), true
      from (
        select distinct region_code, province_code, province_name, province_type, vehicle_code
        from istat_territories_import
      ) source
      join public.regions region on region.istat_code = source.region_code
      on conflict (istat_code) do update set
        region_id = excluded.region_id, code = excluded.code, name = excluded.name,
        territorial_unit_type = excluded.territorial_unit_type,
        source = excluded.source, source_updated_on = excluded.source_updated_on, is_active = true;

      insert into public.province_nuts3_codes (
        province_id, nomenclature_year, nuts3_code, source_updated_on, is_active
      )
      select distinct province.id, 2024, source.nuts3_code, (select source_updated_on from istat_import_metadata), true
      from istat_territories_import source
      join public.provinces province on province.istat_code = source.province_code
      where nullif(source.nuts3_code, '') is not null
      on conflict (province_id, nomenclature_year, nuts3_code) do update set
        source_updated_on = excluded.source_updated_on, is_active = true;

      update public.province_nuts3_codes existing set is_active = false
      where existing.nomenclature_year = 2024
        and not exists (
          select 1 from istat_territories_import source
          join public.provinces province on province.istat_code = source.province_code
          where province.id = existing.province_id and source.nuts3_code = existing.nuts3_code
        );

      update public.municipalities existing
      set istat_code = source.municipality_code, name = source.municipality_name,
          italian_name = source.municipality_italian_name,
          other_language_name = nullif(source.municipality_other_language_name, ''),
          cadastral_code = nullif(source.cadastral_code, ''), source = '${ISTAT_SOURCE_NAME}',
          source_updated_on = (select source_updated_on from istat_import_metadata), is_active = true
      from istat_territories_import source
      join public.provinces province on province.istat_code = source.province_code
      where existing.province_id = province.id
        and existing.istat_code is null
        and (
          upper(btrim(coalesce(existing.cadastral_code, ''))) = upper(btrim(source.cadastral_code))
          or lower(btrim(existing.name)) = lower(btrim(source.municipality_name))
        );

      insert into public.municipalities (
        province_id, istat_code, cadastral_code, name, italian_name, other_language_name,
        source, source_updated_on, is_active
      )
      select province.id, source.municipality_code, nullif(source.cadastral_code, ''),
             source.municipality_name, source.municipality_italian_name,
             nullif(source.municipality_other_language_name, ''), '${ISTAT_SOURCE_NAME}', (select source_updated_on from istat_import_metadata), true
      from istat_territories_import source
      join public.provinces province on province.istat_code = source.province_code
      on conflict (istat_code) do update set
        province_id = excluded.province_id, cadastral_code = excluded.cadastral_code,
        name = excluded.name, italian_name = excluded.italian_name,
        other_language_name = excluded.other_language_name, source = excluded.source,
        source_updated_on = excluded.source_updated_on, is_active = true;

      update public.municipalities existing set is_active = false
      where existing.source = '${ISTAT_SOURCE_NAME}'
        and not exists (select 1 from istat_territories_import source where source.municipality_code = existing.istat_code);
      update public.provinces existing set is_active = false
      where existing.source = '${ISTAT_SOURCE_NAME}'
        and not exists (select 1 from istat_territories_import source where source.province_code = existing.istat_code);
      update public.regions existing set is_active = false
      where existing.source = '${ISTAT_SOURCE_NAME}'
        and not exists (select 1 from istat_territories_import source where source.region_code = existing.istat_code);

      insert into public.territorial_dataset_imports (
        source, source_url, source_updated_on, source_sha256,
        region_count, province_count, municipality_count
      )
      select '${ISTAT_SOURCE_NAME}', '${ISTAT_SOURCE_URL}', source_updated_on, source_hash,
             region_count, province_count, municipality_count
      from istat_import_metadata;
    `);
    const verification = await client.query<{
      database_name: string; database_user: string; regions: string; provinces: string; municipalities: string; imports: string;
    }>(`
      select current_database() as database_name, current_user as database_user,
        (select count(*)::text from public.regions where source = '${ISTAT_SOURCE_NAME}' and is_active) as regions,
        (select count(*)::text from public.provinces where source = '${ISTAT_SOURCE_NAME}' and is_active) as provinces,
        (select count(*)::text from public.municipalities where source = '${ISTAT_SOURCE_NAME}' and is_active) as municipalities,
        (select count(*)::text from public.territorial_dataset_imports where source = '${ISTAT_SOURCE_NAME}') as imports
    `);
    const actual = verification.rows[0];
    if (!actual || Number(actual.regions) !== summary.regions || Number(actual.provinces) !== summary.provinces || Number(actual.municipalities) !== summary.municipalities || Number(actual.imports) < 1) {
      throw new Error(`Verifica database fallita: ${actual?.regions ?? 0} Regioni, ${actual?.provinces ?? 0} unità territoriali, ${actual?.municipalities ?? 0} Comuni, ${actual?.imports ?? 0} import`);
    }
    await client.query("commit");
    return `${actual.database_user}@${actual.database_name}: ${actual.regions} Regioni, ${actual.provinces} unità territoriali, ${actual.municipalities} Comuni`;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const source = await loadSource(option("--source-file"));
  const { rows, datasetDate } = await parseIstatWorkbook(source);
  const summary = validateTerritories(rows, datasetDate);
  const hash = createHash("sha256").update(source).digest("hex");
  console.log(`ISTAT/SITUAS ${summary.datasetDate}: ${summary.regions} Regioni, ${summary.provinces} unità territoriali, ${summary.municipalities} Comuni; SHA-256 ${hash}`);
  if (!process.argv.includes("--apply")) {
    console.log("Validazione completata (dry-run). Aggiungere --apply per sincronizzare il database.");
    return;
  }
  const target = await syncDatabase(rows, summary, hash);
  console.log(`Sincronizzazione Supabase completata e verificata in transazione (${target}).`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
