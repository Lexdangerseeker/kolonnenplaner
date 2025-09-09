"use client";
import React from "react";

type Props = { id: string };

function fmtDE(iso?: string|null){
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
function humanDays(n?: number|null){
  if(n==null) return "";
  if(n===0) return " (heute)";
  if(n===1) return " (morgen)";
  if(n===-1) return " (gestern)";
  return ` (in ${n} Tag${Math.abs(n)===1?"":"en"})`;
}
function badgeClasses(days?: number|null){
  // <=0 überfällig/ heute -> rot, 1-3 Tage -> gelb, sonst neutral
  if(days!=null){
    if(days<=0) return "border-red-300 text-red-700 bg-red-50";
    if(days<=3) return "border-amber-300 text-amber-700 bg-amber-50";
  }
  return "border-gray-300 text-gray-700 bg-gray-50";
}

export default function NextBadge({ id }: Props){
  const [state,setState] = React.useState<{loading:boolean; err?:string; date?:string|null; days?:number|null}>({
    loading:true
  });

  React.useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        const r = await fetch(`/api/admin/baustellen/next?id=${encodeURIComponent(id)}`, { cache:"no-store" });
        const j = await r.json();
        if(!alive) return;
        if(!j.ok) return setState({loading:false, err:j.error||"Fehler"});
        setState({
          loading:false,
          date: j.item?.next_date ?? null,
          days: (typeof j.item?.days_until === "number") ? j.item.days_until : null
        });
      }catch(e:any){
        if(!alive) return;
        setState({loading:false, err: e?.message || "Netzwerkfehler"});
      }
    })();
    return ()=>{ alive = false; };
  },[id]);

  if(state.loading){
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border animate-pulse">lädt…</span>;
  }
  if(state.err){
    return <span title={state.err} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border border-red-300 text-red-700">Fehler</span>;
  }
  if(!state.date){
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border text-gray-600">Kein Termin</span>;
  }

  const hint = humanDays(state.days);
  const cls  = badgeClasses(state.days);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border ${cls}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V7H3v12a2 2 0 0 0 2 2z"/></svg>
      Nächster: <strong>{fmtDE(state.date)}</strong>{hint}
    </span>
  );
}
