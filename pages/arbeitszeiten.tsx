import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { id:string; user:string; date:string; hours:number; note?:string };

export default function Arbeitszeiten(){
  const [loggedIn, setLoggedIn] = useState<boolean|null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState<string>("");
  const [hours, setHours] = useState<number>(8);
  const [note, setNote] = useState<string>("");
  const [err, setErr] = useState<string|null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  async function check(){
    try{
      // simpler Ping – wenn Cookie/Session fehlt, kommt meist 401/redirect
      const r = await fetch("/api/heartbeat", { credentials:"include" });
      setLoggedIn(r.ok);
    }catch{ setLoggedIn(false); }
  }

  async function load(){
    try{
      const r = await fetch("/api/ma/arbeitszeiten/list", { credentials:"include" });
      if(!r.ok) throw new Error("List failed");
      const j = await r.json();
      setItems(Array.isArray(j?.items)? j.items : []);
    }catch(e:any){
      setErr(e?.message||String(e));
      setItems([]);
    }
  }

  useEffect(()=>{ check(); load(); },[]);

  async function add(e:React.FormEvent){
    e.preventDefault();
    setBusy(true); setErr(null);
    try{
      const r = await fetch("/api/ma/arbeitszeiten/list", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        credentials:"include",
        body: JSON.stringify({ date, hours, note })
      });
      const j = await r.json();
      if(!r.ok || !j?.ok) throw new Error(j?.error || "Add failed");
      setDate(""); setHours(8); setNote("");
      await load();
    }catch(e:any){ setErr(e.message||String(e)); }
    finally{ setBusy(false); }
  }

  return (
    <main style={{padding:16}}>
      <h1 className="text-xl font-semibold mb-3">Arbeitszeiten</h1>

      {loggedIn===false && (
        <section className="rounded border p-3 bg-white">
          <div className="font-semibold mb-2">Bitte anmelden</div>
          <Link className="underline text-sm" href="/ma/login">Zur Anmeldung</Link>
        </section>
      )}

      {err && <div className="p-2 rounded border bg-red-50 text-sm my-3">{err}</div>}

      {loggedIn && (
        <>
          <section className="rounded border p-3 bg-white mb-4">
            <div className="font-semibold mb-2">Neuer Eintrag</div>
            <form onSubmit={add} className="grid gap-3" style={{maxWidth:420}}>
              <label className="grid text-sm">
                <span className="text-xs opacity-70">Datum</span>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} required className="border p-2 rounded"/>
              </label>
              <label className="grid text-sm">
                <span className="text-xs opacity-70">Stunden</span>
                <input type="number" step="0.25" min="0" max="24" value={hours}
                       onChange={e=>setHours(Number(e.target.value||0))} required className="border p-2 rounded"/>
              </label>
              <label className="grid text-sm">
                <span className="text-xs opacity-70">Notiz</span>
                <input value={note} onChange={e=>setNote(e.target.value)} className="border p-2 rounded" placeholder="optional"/>
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="border rounded px-3 py-2 bg-white">
                  {busy? "Speichere…" : "Speichern"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded border p-3 bg-white">
            <div className="font-semibold mb-2">Monatsübersicht</div>
            {items.length===0 ? (
              <div className="text-sm opacity-60">Keine Einträge.</div>
            ) : (
              <ul className="divide-y border rounded">
                {items.map(it=>(
                  <li key={it.id} className="p-3">
                    <div className="font-medium">{it.date} – {Number(it.hours||0).toFixed(2)} h</div>
                    <div className="text-xs opacity-70">MA: {it.user}</div>
                    {it.note && <div className="text-sm mt-1">{it.note}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}