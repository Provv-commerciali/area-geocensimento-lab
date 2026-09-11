"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const configured = isSupabaseConfigured(); const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget); try { const { error: authError } = await createClient().auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) }); if (authError) throw authError; router.push("/"); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Accesso non riuscito"); setBusy(false); } }
  return <main className="login-page"><section className="login-card"><div className="login-brand"><div className="brand-mark">A</div><div><strong>A.R.E.A.</strong><span>GeoCensimento Lab</span></div></div><div className="login-intro"><LockKeyhole/><p className="eyebrow">Accesso riservato</p><h1>Entra nel Censimento LAB</h1><p>Usa un utente creato manualmente nel progetto Supabase dedicato.</p></div>
    {configured ? <form onSubmit={submit}><label>E-mail<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required autoComplete="current-password"/></label>{error && <p className="form-error">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? "Accesso…" : "Accedi"}</button></form> : <div className="demo-login"><FlaskConical/><strong>Supabase non configurato</strong><p>Puoi comunque esaminare l’esperienza con il dataset fittizio in sola lettura.</p><Link className="button primary full" href="/">Entra nella demo LAB</Link></div>}
    <small className="security-note">Nessuna credenziale è inclusa nel repository.</small></section></main>;
}
