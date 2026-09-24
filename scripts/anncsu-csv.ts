import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { createInflateRaw } from "node:zlib";
import { Transform } from "node:stream";
import { createInterface } from "node:readline";

export const STREET_HEADER = ["CODICE_COMUNE","CODICE_ISTAT","PROGRESSIVO_NAZIONALE","CODICE_COMUNALE","ODONIMO","LOCALITA'","TOTALE_ACCESSI","DIZIONE_LINGUA1","DIZIONE_LINGUA2"];
export const ACCESS_HEADER = ["CODICE_COMUNE","CODICE_ISTAT","PROGRESSIVO_NAZIONALE","CODICE_COMUNALE","ODONIMO","LOCALITA'","DIZIONE_LINGUA1","DIZIONE_LINGUA2","PROGRESSIVO_ACCESSO","CODICE_COMUNALE_ACCESSO","CIVICO","ESPONENTE","SPECIFICITA","METRICO","PROGRESSIVO_SNC","COORD_X_COMUNE","COORD_Y_COMUNE","QUOTA","METODO"];

type ZipEntry = { name: string; method: number; compressedSize: number; dataOffset: number };

async function csvEntry(zipPath: string): Promise<ZipEntry> {
  const file = await open(zipPath, "r");
  try {
    const stat = await file.stat();
    const tailLength = Math.min(stat.size, 65557);
    const tail = Buffer.alloc(tailLength);
    await file.read(tail, 0, tailLength, stat.size - tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("ANNCSU ZIP: central directory missing");
    const entries = tail.readUInt16LE(eocd + 10);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directory = Buffer.alloc(directorySize);
    await file.read(directory, 0, directorySize, directoryOffset);
    let offset = 0;
    let selected: { name: string; method: number; compressedSize: number; localOffset: number } | undefined;
    for (let index = 0; index < entries; index++) {
      if (directory.readUInt32LE(offset) !== 0x02014b50) throw new Error("ANNCSU ZIP: invalid central directory");
      const method = directory.readUInt16LE(offset + 10);
      const compressedSize = directory.readUInt32LE(offset + 20);
      const nameLength = directory.readUInt16LE(offset + 28);
      const extraLength = directory.readUInt16LE(offset + 30);
      const commentLength = directory.readUInt16LE(offset + 32);
      const localOffset = directory.readUInt32LE(offset + 42);
      const name = directory.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
      if (name.toLowerCase().endsWith(".csv")) {
        if (selected) throw new Error("ANNCSU ZIP: multiple CSV entries");
        selected = { name, method, compressedSize, localOffset };
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
    if (!selected || ![0,8].includes(selected.method)) throw new Error("ANNCSU ZIP: unsupported CSV entry");
    const local = Buffer.alloc(30);
    await file.read(local, 0, 30, selected.localOffset);
    if (local.readUInt32LE(0) !== 0x04034b50) throw new Error("ANNCSU ZIP: invalid local entry");
    return { name: selected.name, method: selected.method, compressedSize: selected.compressedSize,
      dataOffset: selected.localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28) };
  } finally { await file.close(); }
}

export async function* readAnncsuCsv(zipPath: string, expectedHeader: string[]): AsyncGenerator<string[]> {
  const entry = await csvEntry(zipPath);
  const compressed = createReadStream(zipPath, { start: entry.dataOffset, end: entry.dataOffset + entry.compressedSize - 1 });
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const utf8 = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      try { callback(null, decoder.decode(chunk, { stream: true })); } catch (error) { callback(error as Error); }
    },
    flush(callback) { try { callback(null, decoder.decode()); } catch (error) { callback(error as Error); } },
  });
  const lines = createInterface({ input: entry.method === 8 ? compressed.pipe(createInflateRaw()).pipe(utf8) : compressed.pipe(utf8), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber++;
    const values = line.split(";");
    if (expectedHeader === STREET_HEADER) {
      if (values.length !== expectedHeader.length + 1 || values.at(-1) !== "") throw new Error(`Stradario row ${lineNumber}: trailing empty column missing`);
      values.pop();
    }
    if (values.length !== expectedHeader.length) throw new Error(`ANNCSU row ${lineNumber}: expected ${expectedHeader.length} columns, found ${values.length}`);
    if (lineNumber === 1) {
      if (values.some((value,index) => value !== expectedHeader[index])) throw new Error(`ANNCSU ${entry.name}: unexpected header`);
      continue;
    }
    yield values;
  }
  if (lineNumber < 2) throw new Error(`ANNCSU ${entry.name}: empty CSV`);
}

export function decimalComma(value: string): string | null {
  if (!value) return null;
  if (!/^-?\d{1,5}(?:,\d{1,7})?$/.test(value)) throw new Error(`Invalid ANNCSU decimal: ${value}`);
  return value.replace(",", ".");
}

export function normalizeLocality(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g," ").toLocaleLowerCase("it");
}

export function coordinateWarning(longitude: number, latitude: number): string | null {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return "INVALID_COORDINATE";
  // Broad Toscana gate; precision is territorial plausibility, not a boundary polygon.
  if (longitude < 9.6 || longitude > 12.5 || latitude < 42.2 || latitude > 44.5) return "OUTSIDE_TOSCANA_ENVELOPE";
  return null;
}
