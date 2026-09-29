export function RouteLoading({title}:{title:string}){
  return <div className="route-loading" role="status" aria-live="polite"><p className="eyebrow">Censimento</p><h1>{title}</h1><div className="route-loading-bar"/><span>Caricamento dei dati in corso…</span></div>;
}
