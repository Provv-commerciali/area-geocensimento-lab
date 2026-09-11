"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { saveCensusRecord, type CensusRecordGateway } from "./persistence";

export interface FormActionState { error?: string }

const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optionalNumber = (data: FormData, key: string) => value(data, key) || undefined;

export async function createCensusRecordAction(
  _state: FormActionState,
  data: FormData,
): Promise<FormActionState> {
  if (!hasSupabaseEnvironment()) return { error: "Modalità demo: il database non è configurato e il record non è stato salvato." };

  const buildingScope = value(data, "buildingScope");
  const record = {
    zoneId: value(data, "zoneId"), streetId: value(data, "streetId"), civicId: value(data, "civicId"), complexId: value(data, "complexId"),
    buildingScope, levels: optionalNumber(data, "levels"),
    floorCode: buildingScope === "Parte di edificio" ? value(data, "floorCode") : "",
    totalFloors: buildingScope === "Parte di edificio" ? optionalNumber(data, "totalFloors") : undefined,
    isTopFloor: buildingScope === "Parte di edificio" && data.get("isTopFloor") === "on",
    firstName: value(data, "firstName"), lastName: value(data, "lastName"), phone: value(data, "phone"), email: value(data, "email"), taxCode: value(data, "taxCode"),
    contactType: value(data, "contactType"), qualification: value(data, "qualification"), inherited: data.get("inherited") === "on",
    birthDate: value(data, "birthDate"), responsibleOperatorId: value(data, "responsibleOperatorId"), notes: value(data, "notes"),
    rooms: optionalNumber(data, "rooms"), surface: optionalNumber(data, "surface"), occupancy: value(data, "occupancy"), elevator: data.get("elevator") === "on",
    sheet: value(data, "sheet"), parcel: value(data, "parcel"), subaltern: value(data, "subaltern"), cadastralCategory: value(data, "cadastralCategory"),
    isAppraised: value(data, "contactType") === "Notizia" && data.get("isAppraised") === "on",
  };
  const db = await createClient();
  const gateway: CensusRecordGateway = {
    async createRecord(payload) {
      const { data: id, error } = await db.rpc("create_census_record_lab", { p_record: payload, p_interview: null });
      if (error) throw new Error(error.message);
      if (typeof id !== "string") throw new Error("Supabase non ha restituito l'identificativo del record.");
      return id;
    },
  };
  const result = await saveCensusRecord(gateway, record);
  if (!result.ok) return { error: result.error };

  revalidatePath("/");
  revalidatePath("/censimento/contatti");
  redirect("/censimento/contatti?created=1");
}
