import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action}</div>;
}
export function StatCard({ label, value, detail, tone = "cyan" }: { label: string; value: string | number; detail: string; tone?: "cyan" | "amber" | "blue" | "green" }) {
  return <article className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
export function EmptyState({ children }: { children: ReactNode }) { return <div className="empty-state"><ClipboardIcon/>{children}</div> }
function ClipboardIcon() { return <span aria-hidden="true" className="empty-icon">◎</span> }
export function DemoNotice() { return <div className="demo-notice"><strong>Modalità demo LAB</strong><span>Dati fittizi in sola lettura. Configura Supabase per abilitare autenticazione e persistenza.</span></div> }
