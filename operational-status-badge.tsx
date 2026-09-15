import { CalendarClock, CircleCheck, CircleHelp, ClockAlert } from "lucide-react";
import { CENSUS_OPERATIONAL_STATUS_VISUALS, operationalStatusLabel, type CensusOperationalStatusResult } from "@/domain/census-operational-status";

const icons = { "calendar-alert": CalendarClock, "clock-alert": ClockAlert, "user-question": CircleHelp, "circle-check": CircleCheck };

export function OperationalStatusBadge({ result }: { result: CensusOperationalStatusResult }) {
  const visual = CENSUS_OPERATIONAL_STATUS_VISUALS[result.status];
  const Icon = icons[visual.icon];
  return <span className={`operational-badge ${visual.className}`}><Icon size={13} aria-hidden="true" />{operationalStatusLabel(result)}</span>;
}
