import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";

type Item = { id:string; user:string; date:string; hours:number; note?:string };

export default function AdminArbeitszeiten(){
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [q, setQ] = useState<string>(""); // filter by user

  async function load(){
    setErr(null);
    try{
      const r = await fetch("/api/ma/arbeitszeiten/list");
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "HTTP "+r.status);
      setItems(j.items||[]);
    }catch(e:any){ setErr(e.message||String(e)); }
  }

  useEffect(()=>{ load(); },[]);

  const filtered = useMemo(()=>{
    const v = q.trim().toLowerCase();
    return v ? items.filter(i => i.user.toLowerCase().includes(v)) : items;
  }, [items, q]);

  const total = useMemo(()=> filtered.reduce((a,b)=> a + (b.hours||0), 0), [filtered]);

  return (
    <Layout title="Admin - Arbeitszeiten">
      <section className="rounded border p-4 space-y-3">
        <div className="font-semibold">Uebersicht</div>
        {err && <div className="p-2 rounded border bg-red-50 text-sm">{err}</div>}
        <div className="flex flex-wrap gap-2 items-end">
          <label className="grid text-sm">
            <span className="text-xs opacity-70">Filter Mitarbeiter</span>
            <input value={q} onChange={e=>setQ(e.target.value)} className="border rounded px-2 py-1" placeholder="z. B. Aninwatu"/>
          </label>
          <button className="border rounded px-3 py-1 text-sm" onClick={load}>Aktualisieren</button>
          <div className="ml-auto text-sm">Summe: <strong>{total.toFixed(2)} h</strong></div>
        </div>

        <div className="rounded border">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm opacity-70">Keine Eintraege vorhanden.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left p-2">Datum</th>
                  <th className="text-left p-2">Mitarbeiter</th>
                  <th className="text-right p-2">Stunden</th>
                  <th className="text-left p-2">Notiz</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(it=>(
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.date}</td>
                    <td className="p-2">{it.user}</td>
                    <td className="p-2 text-right">{(it.hours||0).toFixed(2)}</td>
                    <td className="p-2">{it.note||""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </Layout>
  );
}
