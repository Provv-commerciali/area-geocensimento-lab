import { z } from "zod";

const geoJsonPoint=z.object({type:z.literal("Point"),coordinates:z.tuple([z.coerce.number(),z.coerce.number()])});

function parseWkbPoint(value:string):{type:"Point";coordinates:[number,number]}|undefined{
  if(!/^[0-9a-f]+$/i.test(value)||value.length%2!==0)return undefined;
  const bytes=new Uint8Array(value.match(/.{2}/g)?.map(byte=>Number.parseInt(byte,16))??[]);
  if(bytes.byteLength!==21&&bytes.byteLength!==25)return undefined;
  const view=new DataView(bytes.buffer);const littleEndian=view.getUint8(0)===1;
  if(!littleEndian&&view.getUint8(0)!==0)return undefined;
  const geometryType=view.getUint32(1,littleEndian);const hasSrid=(geometryType&0x20000000)!==0;
  if((geometryType&0xff)!==1||(hasSrid&&bytes.byteLength!==25)||(!hasSrid&&bytes.byteLength!==21))return undefined;
  const coordinateOffset=hasSrid?9:5;
  return{type:"Point",coordinates:[view.getFloat64(coordinateOffset,littleEndian),view.getFloat64(coordinateOffset+8,littleEndian)]};
}

export function parsePostgisPoint(value:unknown):{longitude:number;latitude:number}|undefined{
  let candidate=value;
  if(typeof value==="string"){
    const trimmed=value.trim();
    if(trimmed.startsWith("{")){try{candidate=JSON.parse(trimmed)}catch{return undefined}}
    else if(/^[0-9a-f]+$/i.test(trimmed))candidate=parseWkbPoint(trimmed);
    else{const match=trimmed.match(/^(?:SRID=4326;)?POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i);if(!match)return undefined;candidate={type:"Point",coordinates:[Number(match[1]),Number(match[2])]}}
  }
  const parsed=geoJsonPoint.safeParse(candidate);if(!parsed.success)return undefined;
  const [longitude,latitude]=parsed.data.coordinates;if(longitude < -180||longitude > 180||latitude < -90||latitude > 90)return undefined;
  return{longitude,latitude};
}
