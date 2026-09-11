import { z } from "zod";

const externalFeatureSchema = z.object({
  COD_COMUNE: z.union([z.string(), z.number()]).transform(String),
  DENOM: z.union([z.string(), z.number()]).transform(String).optional(),
  SEZIONE: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  FOGLIO: z.union([z.string(), z.number()]).transform(String),
  NUM_PART: z.union([z.string(), z.number()]).transform(String),
  TIPOLOGIA: z.union([z.string(), z.number()]).transform(String).optional(),
}).passthrough();

export type CadastralFeatureInfo = {
  municipalityCode: string; municipalityName?: string; section?: string; sheet: string; parcel: string; featureType?: string;
};

function findJsonObject(body: string): unknown {
  const start = body.indexOf("{"); const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Risposta catastale priva di attributi strutturati");
  return JSON.parse(body.slice(start, end + 1));
}

function htmlValue(body:string,label:string):string|undefined{
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const match=body.match(new RegExp(`<th[^>]*>\\s*${escaped}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`,`i`));
  return match?.[1]?.replace(/<[^>]+>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").trim()||undefined;
}

function parseOfficialHtml(body:string):CadastralFeatureInfo{
  const reference=htmlValue(body,"NationalCadastralReference");const label=htmlValue(body,"Label");
  if(!reference||!label)throw new Error("Risposta catastale priva del riferimento nazionale");
  const match=reference.match(/^([A-Z0-9]{4})_([0-9]{4})([0-9]{2})\.(.+)$/i);
  if(!match)throw new Error("Riferimento catastale nazionale non riconosciuto");
  const sheet=String(Number(match[2]));if(!sheet||sheet==="NaN")throw new Error("Foglio catastale non riconosciuto");
  return{municipalityCode:match[1].toUpperCase(),sheet,parcel:label,featureType:/CadastralParcel|Particelle/i.test(body)?"PARTICELLA":undefined};
}

export function parseCadastralFeatureInfo(body: string): CadastralFeatureInfo {
  if(/NationalCadastralReference/i.test(body))return parseOfficialHtml(body);
  const parsed = externalFeatureSchema.parse(findJsonObject(body));
  const clean = (value?: string | null) => value?.trim() || undefined;
  return {
    municipalityCode: parsed.COD_COMUNE.trim(), municipalityName: clean(parsed.DENOM), section: clean(parsed.SEZIONE),
    sheet: parsed.FOGLIO.trim(), parcel: parsed.NUM_PART.trim(), featureType: clean(parsed.TIPOLOGIA),
  };
}
