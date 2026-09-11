import type { CensusInterview, ContactType } from "@/domain/census";

export const DEFAULT_STALE_NEWS_DAYS = 30;

export interface CensusOperationalSettings {
  staleNewsDays: number;
}

export const censusOperationalStatuses = [
  "RICONTATTO_SCADUTO",
  "NOTIZIA_NON_AGGIORNATA",
  "MAI_CONTATTATO",
  "ORDINARIO",
] as const;

export type CensusOperationalStatus = (typeof censusOperationalStatuses)[number];

export interface CensusOperationalStatusResult {
  status: CensusOperationalStatus;
  daysSinceLastInterview: number | null;
  overdueRecallDays: number | null;
  lastInterviewAt: string | null;
  isNeverContacted: boolean;
  isStaleNews: boolean;
  isRecallOverdue: boolean;
}

export const CENSUS_OPERATIONAL_STATUS_VISUALS: Record<CensusOperationalStatus, {
  label: string;
  className: string;
  icon: "calendar-alert" | "clock-alert" | "user-question" | "circle-check";
  markerColor: string;
}> = {
  RICONTATTO_SCADUTO: { label: "Ricontatto scaduto", className: "status-recall-overdue", icon: "calendar-alert", markerColor: "#b8394a" },
  NOTIZIA_NON_AGGIORNATA: { label: "Notizia non aggiornata", className: "status-stale-news", icon: "clock-alert", markerColor: "#a75b08" },
  MAI_CONTATTATO: { label: "Mai contattato", className: "status-never-contacted", icon: "user-question", markerColor: "#4f6474" },
  ORDINARIO: { label: "Regolare", className: "status-ordinary", icon: "circle-check", markerColor: "#277854" },
};

const DAY_MS = 86_400_000;
const civilDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function civilDay(value: string): number {
  if (!civilDatePattern.test(value)) throw new Error(`Data civile non valida: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  const result = Date.UTC(year, month - 1, day) / DAY_MS;
  const check = new Date(result * DAY_MS);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error(`Data civile non valida: ${value}`);
  return result;
}

export function todayInTimeZone(timeZone = "Europe/Rome", now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function deriveCensusOperationalStatus(input: {
  contactType: ContactType;
  interviews: readonly Pick<CensusInterview, "id" | "interviewDate" | "recallDate">[];
  staleNewsDays: number;
  today: string;
}): CensusOperationalStatusResult {
  if (!Number.isInteger(input.staleNewsDays) || input.staleNewsDays < 1) throw new Error("staleNewsDays deve essere un intero positivo");
  const todayDay = civilDay(input.today);
  const interviews = [...input.interviews].sort((a, b) => b.interviewDate.localeCompare(a.interviewDate));
  const lastInterviewAt = interviews[0]?.interviewDate ?? null;
  const daysSinceLastInterview = lastInterviewAt === null ? null : Math.max(0, todayDay - civilDay(lastInterviewAt));
  const overdueRecallDates = interviews.flatMap((scheduled) => {
    if (!scheduled.recallDate || civilDay(scheduled.recallDate) >= todayDay) return [];
    const fulfilled = interviews.some((candidate) => candidate.id !== scheduled.id && civilDay(candidate.interviewDate) >= civilDay(scheduled.recallDate!));
    return fulfilled ? [] : [scheduled.recallDate];
  }).sort();
  const overdueRecallDays = overdueRecallDates[0] ? todayDay - civilDay(overdueRecallDates[0]) : null;
  const isNeverContacted = interviews.length === 0;
  const isStaleNews = input.contactType === "Notizia" && daysSinceLastInterview !== null && daysSinceLastInterview > input.staleNewsDays;
  const isRecallOverdue = overdueRecallDays !== null;
  const status: CensusOperationalStatus = isRecallOverdue
    ? "RICONTATTO_SCADUTO"
    : isStaleNews
      ? "NOTIZIA_NON_AGGIORNATA"
      : isNeverContacted
        ? "MAI_CONTATTATO"
        : "ORDINARIO";
  return { status, daysSinceLastInterview, overdueRecallDays, lastInterviewAt, isNeverContacted, isStaleNews, isRecallOverdue };
}

export function unresolvedRecallDate(
  interviews: readonly Pick<CensusInterview, "id" | "interviewDate" | "recallDate">[],
  today: string,
): string | null {
  const todayDay = civilDay(today);
  return [...interviews]
    .filter((scheduled) => scheduled.recallDate && civilDay(scheduled.recallDate) >= todayDay)
    .filter((scheduled) => !interviews.some((candidate) => candidate.id !== scheduled.id && civilDay(candidate.interviewDate) >= civilDay(scheduled.recallDate!)))
    .map((scheduled) => scheduled.recallDate!)
    .sort()[0] ?? null;
}

export function operationalStatusLabel(result: CensusOperationalStatusResult): string {
  if (result.status === "RICONTATTO_SCADUTO") return `Ricontatto scaduto da ${result.overdueRecallDays} gg`;
  if (result.status === "NOTIZIA_NON_AGGIORNATA") return `Non aggiornata da ${result.daysSinceLastInterview} gg`;
  return CENSUS_OPERATIONAL_STATUS_VISUALS[result.status].label;
}
