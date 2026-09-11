import { z } from "zod";
import { contactTypes } from "@/domain/census";

const optionalText = z.string().trim().optional().or(z.literal(""));
export const censusRecordSchema = z.object({
  zoneId: z.string().min(1, "Seleziona una zona"),
  streetId: z.string().min(1, "Seleziona una via"),
  civicId: z.string().min(1, "Seleziona un civico"),
  complexId: optionalText,
  buildingScope: z.enum(["Intero edificio", "Parte di edificio"]),
  levels: z.coerce.number().int().positive().optional().or(z.literal("")),
  firstName: optionalText,
  lastName: z.string().trim().min(1, "Il cognome è obbligatorio"),
  phone: optionalText,
  email: z.string().email("E-mail non valida").optional().or(z.literal("")),
  taxCode: optionalText,
  contactType: z.enum(contactTypes),
  qualification: optionalText,
  inherited: z.boolean().default(false),
  birthDate: optionalText,
  responsibleOperatorId: optionalText,
  notes: optionalText,
  floorLabel: optionalText,
  rooms: z.coerce.number().nonnegative().optional().or(z.literal("")),
  surface: z.coerce.number().nonnegative().optional().or(z.literal("")),
  occupancy: optionalText,
  elevator: z.boolean().optional(),
  sheet: optionalText,
  parcel: optionalText,
  subaltern: optionalText,
  cadastralCategory: optionalText,
  isAppraised: z.boolean().default(false),
});

export const zoneSchema = z.object({
  country: z.string().trim().min(1), region: z.string().trim().min(1), province: z.string().trim().min(1),
  municipality: z.string().trim().min(1), name: z.string().trim().min(1, "Il nome zona è obbligatorio"),
  operatorId: z.string().min(1, "Seleziona un assegnatario"), streetIds: z.array(z.string()).default([]),
});

export const complexSchema = z.object({
  name: z.string().trim().min(1), zoneId: z.string().min(1), civicIds: z.array(z.string()).min(1),
  sheet: optionalText, parcel: optionalText, units: z.coerce.number().int().positive().optional().or(z.literal("")), description: optionalText,
});

export const interviewSchema = z.object({
  operatorId: z.string().min(1), interviewDate: z.string().date(), recallDate: z.string().date().optional().or(z.literal("")),
  response: optionalText, reason: optionalText, outcome: optionalText,
});
