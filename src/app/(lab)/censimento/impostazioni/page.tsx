import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { OperationalSettingsForm } from "@/features/census/operational-settings-form";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";
import { censusRepository } from "@/services/census-data";

export default async function CensusSettingsPage() {
  const settings = await censusRepository().getOperationalSettings();
  return <><PageHeader eyebrow="Censimento / Configurazione" title="Impostazioni operative" description="Parametri persistenti usati per derivare priorità e attività dei contatti." action={<Link className="button secondary" href="/censimento/contatti"><ArrowLeft size={17}/> Torna ai contatti</Link>}/><OperationalSettingsForm staleNewsDays={settings.staleNewsDays} databaseMode={hasSupabaseEnvironment()}/></>;
}
