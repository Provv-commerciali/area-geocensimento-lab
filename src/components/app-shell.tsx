"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Contact, FlaskConical, LayoutDashboard, Map, MapPinned, Menu, Plus, X } from "lucide-react";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const items = [
  { href: "/", label: "Dashboard LAB", icon: LayoutDashboard },
  { href: "/censimento/contatti", label: "Contatti", icon: Contact },
  { href: "/censimento/contatti/nuovo", label: "Nuovo contatto", icon: Plus },
  { href: "/censimento/zone", label: "Zone", icon: MapPinned },
  { href: "/censimento/complessi", label: "Complessi", icon: Building2 },
  { href: "/geocensimento", label: "GeoCensimento", icon: Map },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [open, setOpen] = useState(false); const databaseMode=isSupabaseConfigured();
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "is-open" : ""}`}>
      <div className="brand"><div className="brand-mark">A</div><div><strong>A.R.E.A.</strong><span>GeoCensimento Lab</span></div><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Chiudi menu"><X /></button></div>
      <div className="lab-tag"><FlaskConical size={15}/> Ambiente sperimentale</div>
      <p className="nav-heading">Censimento</p>
      <nav>{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={path === href ? "active" : ""}><Icon size={19}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-foot"><span className={`status-dot ${databaseMode?"online":""}`}/>{databaseMode?"Database Supabase LAB":"Dataset demo LAB"}</div>
    </aside>
    <div className="content-wrap">
      <header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Apri menu"><Menu /></button><div><span className="eyebrow">A.R.E.A. / Censimento</span></div><div className="operator-pill"><span>ER</span><div><strong>Elena Rossi</strong><small>Operatore LAB</small></div></div></header>
      <main>{children}</main>
    </div>
    {open && <button className="backdrop mobile-only" onClick={() => setOpen(false)} aria-label="Chiudi menu"/>}
  </div>;
}
