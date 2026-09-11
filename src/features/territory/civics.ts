import type { CivicParity } from "@/domain/census";

export interface CivicDraft { number: string; extension?: string }

export function normalizeCivicDraft(draft: CivicDraft): CivicDraft {
  const number = draft.number.trim();
  const extension = draft.extension?.trim();
  return { number, ...(extension ? { extension } : {}) };
}

export function civicDraftKey(draft: CivicDraft): string {
  const normalized = normalizeCivicDraft(draft);
  return `${normalized.number.toLocaleLowerCase("it")}|${normalized.extension?.toLocaleLowerCase("it") ?? ""}`;
}

export function deduplicateCivicDrafts(drafts: CivicDraft[]): CivicDraft[] {
  const unique = new Map<string, CivicDraft>();
  for (const draft of drafts) {
    const normalized = normalizeCivicDraft(draft);
    if (normalized.number) unique.set(civicDraftKey(normalized), normalized);
  }
  return [...unique.values()];
}

export function generateCivicRange(from: number, to: number, parity: CivicParity): CivicDraft[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to - from > 2000) {
    throw new Error("Intervallo civici non valido");
  }
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
    .filter((number) => parity === "all" || (parity === "even" ? number % 2 === 0 : number % 2 !== 0))
    .map((number) => ({ number: String(number) }));
}

export function parseManualCivics(value: string): CivicDraft[] {
  return deduplicateCivicDrafts(value.split(/[\n,;]+/).map((entry) => {
    const [number = "", ...extensionParts] = entry.trim().split(/\s+/);
    return { number, extension: extensionParts.join(" ") || undefined };
  }));
}
