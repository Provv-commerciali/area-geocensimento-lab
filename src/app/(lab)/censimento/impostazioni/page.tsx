import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { OperationalSettingsForm } from "@/features/census/operational-settings-form";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { censusRepository } from "@/services/census-data";
import { getPaidServiceGovernance } from "@/services/cadastral-data-service";
import { PaidServiceGovernancePanel } from "@/features/cadastral/paid-service-governance-panel";

export default async function CensusSettingsPage() {
  const [settings,governance] = await Promise.all([censusRepository().getOperationalSettings(),getPaidServiceGovernance()]);
  return <><PageHeader eyebrow="Censimento / Configurazione" title="Impostazioni operative" description="Parametri persistenti usati per derivare priorità, attività e spesa OpenAPI." action={<Link className="button secondary" href="/censimento/contatti"><ArrowLeft size={17}/> Torna ai contatti</Link>}/><OperationalSettingsForm staleNewsDays={settings.staleNewsDays} databaseMode={hasSupabaseEnvironment()}/><PaidServiceGovernancePanel governance={governance}/></>;
}
