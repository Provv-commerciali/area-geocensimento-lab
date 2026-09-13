import { z } from "zod";

const warningSchema = z.object({ code: z.string().min(1), message: z.string().optional() });
const pointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });
const proposalSchema = z.object({
  sourceText: z.string().min(1), proposedFirstName: z.string().optional(), proposedLastName: z.string().optional(),
  proposedCompanyName: z.string().optional(), proposedSubjectType: z.enum(["PERSON", "COMPANY", "UNKNOWN"]),
  confidence: z.number().min(0).max(1).optional(), region: z.object({ coordinateSpace: z.literal("NORMALIZED"), polygon: z.array(pointSchema).length(4) }).optional(),
  warnings: z.array(warningSchema).default([]),
});
export const doorbellRecognitionResultSchema = z.object({
  schemaVersion: z.literal("1"), rawText: z.string(), proposals: z.array(proposalSchema), warnings: z.array(warningSchema).default([]), providerRequestId: z.string().optional(),
});
export type DoorbellRecognitionResult = z.infer<typeof doorbellRecognitionResultSchema>;
export interface DoorbellTextRecognitionProvider { recognize(input: { photoId: string; bytes: Uint8Array; mimeType: string; originalFilename: string }, options?: { signal?: AbortSignal }): Promise<DoorbellRecognitionResult> }

export class DoorbellRecognitionError extends Error {
  constructor(public readonly code: "NOT_CONFIGURED" | "TIMEOUT" | "UPSTREAM_UNAVAILABLE" | "UPSTREAM_REJECTED" | "INVALID_RESPONSE", message: string, public readonly retryable: boolean) { super(message); }
}

export class HttpDoorbellTextRecognitionProvider implements DoorbellTextRecognitionProvider {
  constructor(private readonly endpoint: string, private readonly token?: string, private readonly timeoutMs = 90_000) {}
  async recognize(input: { photoId: string; bytes: Uint8Array; mimeType: string; originalFilename: string }, options?: { signal?: AbortSignal }): Promise<DoorbellRecognitionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const abort = () => controller.abort();
    options?.signal?.addEventListener("abort", abort, { once: true });
    try {
      const form = new FormData();
      form.set("request_id", input.photoId);
      form.set("image", new Blob([input.bytes as BlobPart], { type: input.mimeType }), input.originalFilename);
      const response = await fetch(this.endpoint, { method: "POST", headers: this.token ? { authorization: `Bearer ${this.token}` } : undefined, body: form, signal: controller.signal });
      if (!response.ok) throw new DoorbellRecognitionError(response.status >= 500 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_REJECTED", "Il servizio OCR non ha completato l'analisi.", response.status >= 500 || response.status === 429);
      const parsed = doorbellRecognitionResultSchema.safeParse(await response.json());
      if (!parsed.success) throw new DoorbellRecognitionError("INVALID_RESPONSE", "Il servizio OCR ha restituito dati non validi.", false);
      return parsed.data;
    } catch (error) {
      if (error instanceof DoorbellRecognitionError) throw error;
      if (controller.signal.aborted) throw new DoorbellRecognitionError("TIMEOUT", "Il servizio OCR non ha risposto entro il tempo previsto.", true);
      throw new DoorbellRecognitionError("UPSTREAM_UNAVAILABLE", "Il servizio OCR non è raggiungibile.", true);
    } finally { clearTimeout(timeout); options?.signal?.removeEventListener("abort", abort); }
  }
}

export function doorbellRecognitionProvider(): DoorbellTextRecognitionProvider | undefined {
  const endpoint = process.env.DOORBELL_OCR_SERVICE_URL;
  if (!endpoint) return undefined;
  return new HttpDoorbellTextRecognitionProvider(endpoint, process.env.DOORBELL_OCR_SERVICE_TOKEN);
}
