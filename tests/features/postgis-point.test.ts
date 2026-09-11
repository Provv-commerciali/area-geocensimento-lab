import{describe,expect,it}from"vitest";import{parsePostgisPoint}from"@/services/postgis-point";
describe("PostGIS civic point reader",()=>{
  it.each([
    [{type:"Point",coordinates:[10.28,43.91]}],
    ['{"type":"Point","coordinates":[10.28,43.91]}'],
    ["POINT(10.28 43.91)"],
    ["SRID=4326;POINT (10.28 43.91)"],
  ])("reads %j",value=>expect(parsePostgisPoint(value)).toEqual({longitude:10.28,latitude:43.91}));
  it("reads EWKB returned by PostGIS",()=>expect(parsePostgisPoint("0101000020E6100000000000000000F03F0000000000000040")).toEqual({longitude:1,latitude:2}));
  it("rejects malformed or out-of-range points",()=>{expect(parsePostgisPoint("01010000")).toBeUndefined();expect(parsePostgisPoint({type:"Point",coordinates:[500,43]})).toBeUndefined()});
});
