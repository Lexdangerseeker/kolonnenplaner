import React, { useEffect, useState } from "react";

type Baustelle = {
  id: string;
  name: string;
  adresse?: string|null;
  plz?: string|null;
  ort?: string|null;
};

async function fetchJson(url: string, opts?: RequestInit) {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.ok === false) {
    const msg = data?.error || r.statusText || "Fehler";
    throw new Error(msg);
  }
  return data;
}

export default function BaustellenPage() {
  const [items, setItems] = useState<Baustelle[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function loadList() {
    setLoading(true); setErr(null);
    try {
      const data = await fetchJson("/api/admin/baustellen/list?ts=" + Date.now());
      setItems(data.items || []);
    } catch(e:any) {
      setErr(e?.message||String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createBaustelle() {
    try {
      const res = await fetch("/api/admin/baustellen/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Neue Baustelle",
          adresse: "",
          plz: "",
          ort: "",
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || res.statusText);
      }
      await loadList();
    } catch (e:any) {
      alert("Fehler beim Anlegen: " + (e.message||e));
    }
  }

  useEffect(() => { loadList(); }, []);

  return (
    <div style={{padding:"16px"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
        <h1 style={{margin:0, fontSize:20}}>Baustellen</h1>
        <button
          onClick={createBaustelle}
          style={{
            padding:"8px 14px",
            border:"1px solid #0a7",
            background:"#0db",
            color:"#fff",
            borderRadius:6,
            cursor:"pointer"
          }}
        >
          ➕ Neue Baustelle
        </button>
      </div>

      {err && <div style={{color:"#b00", marginBottom:10}}>⚠️ {err}</div>}
      {loading && <div>Lade…</div>}

      <div style={{display:"grid", gap:8}}>
        {items.map(it=>(
          <div key={it.id} style={{padding:"10px 12px", border:"1px solid #ddd", borderRadius:6, background:"#fff"}}>
            <div style={{fontWeight:600}}>{it.name}</div>
            <div style={{fontSize:13, color:"#555"}}>{[it.adresse, it.plz, it.ort].filter(Boolean).join(" ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
