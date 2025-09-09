"use client";
import React from "react";
import NextBadge from "../../components/NextBadge";

type Baustelle = {
  id: string;
  nummer?: number|null;
  name: string;
  adresse?: string|null;
  plz?: string|null;
  ort?: string|null;
};

export default function Page(){
  const [items,setItems] = React.useState<Baustelle[]>([]);
  const [loading,setLoading] = React.useState(true);
  const [err,setErr] = React.useState<string|null>(null);

  React.useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch(`/api/admin/baustellen/list?status=alle&q=`, { cache:"no-store" });
        const j = await r.json();
        if(!j.ok) throw new Error(j.error||"Fehler");
        setItems(Array.isArray(j.items) ? j.items : []);
      }catch(e:any){
        setErr(e?.message||"Fehler");
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Baustellen – Nächster Termin Demo</h1>

      {loading && <div>lädt…</div>}
      {err && <div className="text-red-600">Fehler: {err}</div>}

      <div className="grid gap-3">
        {items.map(b=>(
          <div key={b.id} className="border rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium">{b.nummer!=null ? `#${b.nummer} – ` : ""}{b.name}</div>
              <div className="text-sm text-gray-600">{[b.adresse, b.plz, b.ort].filter(Boolean).join(", ")}</div>
            </div>
            <NextBadge id={b.id} />
          </div>
        ))}
      </div>
    </main>
  );
}
