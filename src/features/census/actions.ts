"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, hasSupabaseEnvironment } from "@/lib/supabase/server";
import { saveCensusRecord, type CensusRecordGateway } from "./persistence";
import { uploadContactPhoto } from "@/services/contact-photo-data";

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
    buildingScope, levels: optionalNumber(data, "levels"), staircase: value(data, "staircase"), unitIdentifier: value(data, "unitIdentifier"),
    floorCode: buildingScope === "Parte di edificio" ? value(data, "floorCode") : "",
    totalFloors: buildingScope === "Parte di edificio" ? optionalNumber(data, "totalFloors") : undefined,
    isTopFloor: buildingScope === "Parte di edificio" && data.get("isTopFloor") === "on",
    subjectMode:value(data,"subjectMode"),existingSubjectId:value(data,"existingSubjectId"),subjectType:value(data,"subjectType"),
    firstName: value(data, "firstName"), lastName: value(data, "lastName"), companyName:value(data,"companyName"),vatNumber:value(data,"vatNumber"),phone: value(data, "phone"), email: value(data, "email"), taxCode: value(data, "taxCode"),
    contactType: value(data, "contactType"), engagementType: value(data, "engagementType"), relationshipRole: value(data, "relationshipRole"), inherited: data.get("inherited") === "on",
    birthDate: value(data, "birthDate"), responsibleOperatorId: value(data, "responsibleOperatorId"), notes: value(data, "notes"),
    rooms: optionalNumber(data, "rooms"), surface: optionalNumber(data, "surface"), occupancy: value(data, "occupancy"), elevator: data.get("elevator") === "on",
    sheet: value(data, "sheet"), parcel: value(data, "parcel"), subaltern: value(data, "subaltern"), cadastralCategory: value(data, "cadastralCategory"),
    isAppraised: value(data, "contactType") === "Notizia" && data.get("isAppraised") === "on",
  };
  const db = await createClient();
  const gateway: CensusRecordGateway = {
    async createRecord(payload) {
      const { data: id, error } = await db.rpc("create_census_record_lab", { p_record: {...payload,subject:{subjectType:payload.subjectType,firstName:payload.firstName,lastName:payload.lastName,companyName:payload.companyName,vatNumber:payload.vatNumber,phone:payload.phone,email:payload.email,taxCode:payload.taxCode,birthDate:payload.birthDate,notes:payload.notes}}, p_interview: null });
      if (error) throw new Error(error.message);
      if (typeof id !== "string") throw new Error("Supabase non ha restituito l'identificativo del record.");
      const location = await db.from("census_records").update({ staircase: payload.staircase || null, unit_identifier: payload.unitIdentifier || null,cadastral_class:value(data,"cadastralClass")||null,cadastral_consistency:value(data,"cadastralConsistency")||null,cadastral_income:value(data,"cadastralIncome")||null,cadastral_census_zone:value(data,"cadastralCensusZone")||null,cadastral_registry_lot:value(data,"cadastralRegistryLot")||null,cadastral_address:value(data,"cadastralAddress")||null }).eq("id", id);
      if (location.error) throw new Error(location.error.message);
      const photo=data.get("contactPhoto");if(photo instanceof File&&photo.size>0)await uploadContactPhoto(id,photo);
      return id;
    },
  };
  const result = await saveCensusRecord(gateway, record);
  if (!result.ok) return { error: result.error };

  revalidatePath("/");
  revalidatePath("/censimento/contatti");
  redirect("/censimento/contatti?created=1");
}
