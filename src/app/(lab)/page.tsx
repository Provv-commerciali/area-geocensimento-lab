import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DataModeNotice, PageHeader } from "@/components/ui";
import { PerformanceDashboard } from "@/features/dashboard/performance-dashboard";
import { loadCensusData } from "@/services/census-data";
import { hasSupabaseEnvironment } from "@/lib/supabase/server";

export default async function Dashboard(){
  const{records,zones,operators,operationalToday}=await loadCensusData(["records","zones","operators"]);
  return <><PageHeader eyebrow="Dashboard Censimento" title="Performance e attività" description="Notizie, ricontatti, incarichi e copertura operativa per zona e operatore." action={<Link className="button primary" href="/censimento/contatti/nuovo">Nuovo contatto <ArrowRight size={17}/></Link>}/><DataModeNotice databaseMode={hasSupabaseEnvironment()}/><PerformanceDashboard {...{records,zones,operators,today:operationalToday}}/></>;
}
