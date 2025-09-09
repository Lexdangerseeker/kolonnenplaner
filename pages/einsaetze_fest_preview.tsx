import { useEffect, useState } from "react";
import Link from "next/link";

type Card = {
  id: string;
  ordnungsnummer?: number|null;
  name: string;
  farbe?: "blau"|"blaugelb"|"pink"|"rot"|"gruen"|"gelb"|"none";
  label?: string;
  time_von?: string|null;
  time_bis?: string|null;
  last_rhythm?: string|null;
};

function cls(f?:Card["farbe"]){
  switch(f){
    case "blau": return "bg-blue-500 text-white";
    case "blaugelb": return "bg-gradient-to-r from-blue-500 to-yellow-400 text-white";
    case "pink": return "bg-pink-500 text-white";
    case "rot": return "bg-red-600 text-white";
    case "gruen": return "bg-green-500 text-white";
    case "gelb": return "bg-yellow-400 text-black";
    default: return "bg-gray-100 text-gray-800";
  }
}

export default function EinsaetzeFestPreview(){
  const [loggedIn, setLoggedIn] = useState<boolean|null>(null);
  const [items, setItems] = useState<Card[]>([]);
  const [err, setErr] = useState<string|null>(null);

  async function check(){
    try{
      const r = await fetch("/api/ma/time/ping?ts="+Date.now());
      const j = await r.json();
      setLoggedIn(!!(r.ok && j?.ok));
    }catch{ setLoggedIn(false); }
  }
  async function load(){
    setErr(null);
    try{
      const r = await fetch(`/api/ma/einsaetze/fest/list?ts=${Date.now()}`, { cache: "no-store" });
      const j = await r.json();
      if(!r.ok || !j?.ok) throw new Error(j?.error || "HTTP "+r.status);
      setItems(j.items||[]);
    }catch(e:any){ setErr(e.message||String(e)); }
  }

  useEffect(()=>{ check(); },[]);
  useEffect(()=>{ if (loggedIn) { const t=setTimeout(load,150); return ()=>clearTimeout(t); } },[loggedIn]);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feste Einsaetze</h1>
        <nav className="text-sm flex items-center gap-3">
          <Link className="underline" href="/einsaetzeMH">Einsaetze MH</Link>
          <Link className="underline" href="/arbeitszeiten">Arbeitszeiten</Link>
        </nav>
      </header>

      {loggedIn === false && (
        <section className="rounded border p-3">
          <div className="font-semibold mb-2">Bitte anmelden</div>
          <Link className="underline text-sm" href="/ma/login">Zur Anmeldung</Link>
        </section>
      )}

      {err && <div className="p-2 rounded border bg-red-50 text-sm">{err}</div>}

      <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
        <span className="px-2 py-1 rounded bg-green-500 text-white">Gruen = Rhythmus weit weg</span>
        <span className="px-2 py-1 rounded bg-yellow-400 text-black">Gelb = Rhythmus bald</span>
        <span className="px-2 py-1 rounded bg-red-600 text-white">Rot = Noch offen</span>
        <span className="px-2 py-1 rounded bg-blue-500 text-white">Blau = fester Termin</span>
        <span className="px-2 py-1 rounded bg-gradient-to-r from-blue-500 to-yellow-400 text-white">Blaugelb = fest bald</span>
        <span className="px-2 py-1 rounded bg-pink-500 text-white">Pink = fest heute</span>
        <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">Grau = kein Termin</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.length===0 ? (
          <div className="p-4 text-sm opacity-70 rounded border">Keine Karten vorhanden.</div>
        ) : items.map(it=>(
          <div key={it.id} className={"rounded-xl shadow p-4 border "+cls(it.farbe)}>
            <div className="font-semibold">{it.ordnungsnummer!=null? it.ordnungsnummer+" · " : ""}{it.name}</div>
            {it.label && <div className="text-sm opacity-95 mt-1">Naechster: {it.label}</div>}
            <div className="text-xs opacity-80 mt-1">
              Letzter Rhythmus: {it.last_rhythm ? it.last_rhythm.split("-").reverse().join(".") : "—"}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}



