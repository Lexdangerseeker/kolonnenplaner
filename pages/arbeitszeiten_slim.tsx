// ———————————————————————————————————————————————
// /arbeitszeiten_slim – 15-Min-Raster, simple UI
// + einmaliger Urlaub/Krank-Eintrag (fest), ohne Schnickschnack
// Robust gegen HTML-Antworten (Login-Redirects) -> zeigt Hinweis statt Crash
// ———————————————————————————————————————————————
import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  date: string;
  start_hhmm?: string|null;
  end_hhmm?: string|null;
  pause_min?: number|null;
  hours?: number|null;
  note?: string|null;
};

const HOURS = Array.from({length:14}, (_,i)=> i+6); // 6..19
const MINS  = [0,15,30,45];

function two(n:number){ return String(n).padStart(2,"0"); }
function toHHMM(h:number,m:number){ return `${two(h)}:${two(m)}`; }
function parseHHMM(s?:string|null){ if(!s||!s.includes(":")) return null; const [hh,mm]=s.split(":"); const h=+hh,m=+mm; return (Number.isFinite(h)&&Number.isFinite(m))?{h,m}:null; }
function today(){ return new Date().toISOString().slice(0,10); }
function yyyymm(d:Date){ return `${d.getFullYear()}-${two(d.getMonth()+1)}`; }
function firstOfMonth(ym:string){ const [y,m]=ym.split("-").map(Number); return new Date(y,(m-1),1); }
function roundTo15Now(){
  const d=new Date(); let h=d.getHours(), m=d.getMinutes();
  let q=Math.round(m/15)*15; if(q===60){h++; q=0}
  h=Math.max(6,Math.min(19,h));
  const best=MINS.reduce((b,c)=> Math.abs(c-q)<Math.abs(b-q)?c:b,0);
  return {h, m:best};
}
function netHours(date:string, s?:string|null, e?:string|null, pause?:number|null){
  const S=parseHHMM(s||""); const E=parseHHMM(e||""); const p=Math.max(0, Number(pause||0));
  if(!S||!E) return 0;
  const t1=new Date(`${date}T${two(S.h)}:${two(S.m)}:00`);
  const t2=new Date(`${date}T${two(E.h)}:${two(E.m)}:00`);
  let diff=Math.max(0, Math.round((t2.getTime()-t1.getTime())/60000));
  diff=Math.max(0, diff - p);
  return Math.round(diff/60*100)/100;
}

async function safeJson(url:string, opts?:RequestInit){
  const r = await fetch(url, { headers: { Accept:"application/json, text/plain, */*" }, ...opts });
  const text = await r.text();
  let data:any=null; try{ data=JSON.parse(text) }catch{}
  if(!data){
    // häufig: Login-HTML statt JSON
    if(text?.trim().startsWith("<")) throw new Error("API lieferte HTML (vermutlich Login nötig)");
  }
  if(!r.ok || (data && data.ok===false)){
    const msg = (data && (data.error||data.message)) || r.statusText || "Fehler";
    throw new Error(msg);
  }
  return data||{};
}

export default function ArbeitszeitenSlim(){
  // Eingabe
  const [date,setDate] = useState<string>(today());
  const [sh,setSh] = useState<number>(7);
  const [sm,setSm] = useState<number>(0);
  const [eh,setEh] = useState<number>(roundTo15Now().h);
  const [em,setEm] = useState<number>(roundTo15Now().m);
  const [pause,setPause] = useState<number>(30);
  const [note,setNote] = useState<string>("");

  const preview = useMemo(()=> netHours(date, toHHMM(sh,sm), toHHMM(eh,em), pause), [date,sh,sm,eh,em,pause]);

  // Liste
  const [ym,setYm] = useState<string>(yyyymm(new Date()));
  const [items,setItems] = useState<Entry[]>([]);
  const [err,setErr] = useState<string>("");
  const [msg,setMsg] = useState<string>("");

  async function loadList(){
    setErr("");
    try{
      const j = await safeJson(`/api/ma/arbeitszeiten/list?month=${encodeURIComponent(ym)}&ts=${Date.now()}`);
      setItems(Array.isArray(j?.items)? j.items : []);
    }catch(e:any){
      setItems([]);
      setErr(e?.message||String(e));
    }
  }
  useEffect(()=>{ loadList(); }, [ym]);

  async function save(e:React.FormEvent){
    e.preventDefault(); setMsg(""); setErr("");
    try{
      const body = {
        date,
        start_hhmm: toHHMM(sh,sm),
        end_hhmm:   toHHMM(eh,em),
        pause_min:  Number(pause)||0,
        note: (note||"").trim(),
        client_saved_at: new Date().toISOString()
      };
      await safeJson("/api/ma/arbeitszeiten/list", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
      setMsg("Gespeichert ✓"); setTimeout(()=>setMsg(""),1500);
      setNote("");
      await loadList();
    }catch(e:any){ setErr(e?.message||String(e)); }
  }

  // Urlaub/Krank – EINMALIG fest speichern
  const [kind,setKind] = useState<"vacation"|"sick">("vacation");
  const [fromDate,setFrom] = useState<string>(today());
  const [toDate,setTo] = useState<string>(today());
  const [toMsg,setToMsg] = useState<string>("");

  async function submitTimeoff(){
    setToMsg(""); setErr("");
    try{
      await safeJson("/api/ma/timeoff/request", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ kind, from_date: fromDate, to_date: toDate, note: "" })
      });
      setToMsg("Eingetragen ✓ (fest)"); setTimeout(()=>setToMsg(""),2000);
    }catch(e:any){ setErr(e?.message||String(e)); }
  }

  // CSV Export
  function exportCsv(){
    const esc = (v:string)=> /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const hdr = ["Datum","Start","Ende","Pause (Min)","Stunden","Notiz"];
    const rows = items.map(it=>{
      const h = (it.hours!=null? Number(it.hours) : netHours(it.date, it.start_hhmm, it.end_hhmm, it.pause_min)).toFixed(2);
      return [it.date, it.start_hhmm||"", it.end_hhmm||"", it.pause_min==null?"":String(it.pause_min), h, it.note||""];
    });
    const csv = [hdr, ...rows].map(r=> r.map(x=>esc(x??"")).join(";")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`arbeitszeiten_${ym}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  return (
    <main style={{padding:16, maxWidth:1100, margin:"0 auto"}}>
      <h1 style={{fontSize:22, fontWeight:800, margin:"0 0 10px"}}>Arbeitszeiten (slim)</h1>

      <section style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginBottom:12}}>
        <div style={{fontSize:14, color:"#991b1b", background:"#fee2e2", border:"1px solid #fecaca", borderRadius:10, padding:"8px 10px", marginBottom:10}}>
          Hinweis: Die Stunden sind <b>zum Zeitpunkt der Beendigung</b> einzutragen. Nachträgliche Änderungen können als
          Urkundenfälschung gewertet werden und eine Abmahnung nach sich ziehen.
        </div>

        <form onSubmit={save} style={{display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:10}}>
          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Datum</span>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                   style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}} />
          </label>

          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Start</span>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <select value={sh} onChange={e=>setSh(Number(e.target.value))}
                      style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
                {HOURS.map(h=> <option key={h} value={h}>{two(h)}</option>)}
              </select>
              <select value={sm} onChange={e=>setSm(Number(e.target.value))}
                      style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
                {MINS.map(m=> <option key={m} value={m}>{two(m)}</option>)}
              </select>
            </div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              <button type="button" onClick={()=>{setSh(7); setSm(0);}}  style={{padding:"4px 8px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>07:00</button>
              <button type="button" onClick={()=>{setSh(7); setSm(30);}} style={{padding:"4px 8px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>07:30</button>
            </div>
          </label>

          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Ende</span>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <select value={eh} onChange={e=>setEh(Number(e.target.value))}
                      style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
                {HOURS.map(h=> <option key={h} value={h}>{two(h)}</option>)}
              </select>
              <select value={em} onChange={e=>setEm(Number(e.target.value))}
                      style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
                {MINS.map(m=> <option key={m} value={m}>{two(m)}</option>)}
              </select>
            </div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              <button type="button" onClick={()=>{ const n=roundTo15Now(); setEh(n.h); setEm(n.m); }}
                      style={{padding:"4px 8px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>Jetzt (runden)</button>
            </div>
          </label>

          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Pause (Min.)</span>
            <select value={pause} onChange={e=>setPause(Number(e.target.value))}
                    style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
              {[0,15,30,45,60,75,90].map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              <button type="button" onClick={()=>setPause(0)}  style={{padding:"4px 8px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>Ohne Pause</button>
              <button type="button" onClick={()=>setPause(30)} style={{padding:"4px 8px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>30 Min</button>
            </div>
          </label>

          <label style={{gridColumn:"1 / -1", display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Notiz (optional)</span>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. Zusatzarbeit, Ort, Besonderes"
                   style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}} />
          </label>

          <div style={{gridColumn:"1 / -1", display:"flex", alignItems:"center", gap:10}}>
            <div style={{fontSize:14, color:"#334155"}}>Vorschau Netto: <b>{preview.toFixed(2)} h</b></div>
            <div style={{marginLeft:"auto", display:"flex", gap:8, alignItems:"center"}}>
              <div style={{minWidth:120, color:"#059669"}}>{msg}</div>
              {err && <div style={{minWidth:120, color:"#b91c1c"}}>{err}</div>}
              <button type="submit" style={{padding:"8px 12px", border:"1px solid #10b981", borderRadius:8, background:"#ecfdf5", color:"#065f46"}}>Speichern</button>
            </div>
          </div>
        </form>
      </section>

      <section style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginBottom:12}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:10, alignItems:"end"}}>
          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Art</span>
            <select value={kind} onChange={e=>setKind(e.target.value as any)}
                    style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
              <option value="vacation">Urlaub</option>
              <option value="sick">Krankheit</option>
            </select>
          </label>
          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Von</span>
            <input type="date" value={fromDate} onChange={e=>setFrom(e.target.value)}
                   style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}} />
          </label>
          <label style={{display:"grid", gap:6, fontSize:14}}>
            <span style={{opacity:.7, fontSize:12}}>Bis</span>
            <input type="date" value={toDate} onChange={e=>setTo(e.target.value)}
                   style={{padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8}} />
          </label>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <button onClick={submitTimeoff} style={{padding:"8px 12px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>Fest eintragen</button>
            <div style={{minWidth:140, color:"#059669"}}>{toMsg}</div>
          </div>
        </div>
      </section>

      <section style={{background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
          <div style={{fontWeight:700}}>Monat</div>
          <select value={ym} onChange={e=>setYm(e.target.value)}
                  style={{padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8}}>
            {Array.from({length: 15}, (_,i)=>{
              const base=firstOfMonth(yyyymm(new Date()));
              const d=new Date(base.getFullYear(), base.getMonth()-i, 1);
              const v=yyyymm(d);
              return <option key={v} value={v}>{v}</option>;
            })}
          </select>

          <div style={{marginLeft:"auto"}}>
            <button onClick={exportCsv} style={{padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff"}}>CSV exportieren</button>
          </div>
        </div>

        {err && <div style={{color:"#b91c1c", marginBottom:8}}>{err}</div>}

        {items.length===0 ? (
          <div style={{color:"#64748b"}}>Keine Einträge.</div>
        ) : (
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8fafc"}}>
                <th style={{textAlign:"left", padding:"8px 10px"}}>Datum</th>
                <th style={{textAlign:"left", padding:"8px 10px"}}>Start</th>
                <th style={{textAlign:"left", padding:"8px 10px"}}>Ende</th>
                <th style={{textAlign:"left", padding:"8px 10px"}}>Pause</th>
                <th style={{textAlign:"left", padding:"8px 10px"}}>Stunden</th>
                <th style={{textAlign:"left", padding:"8px 10px"}}>Notiz</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=>{
                const h=(it.hours!=null? Number(it.hours) : netHours(it.date, it.start_hhmm, it.end_hhmm, it.pause_min));
                return (
                  <tr key={it.id} style={{borderTop:"1px solid #e5e7eb"}}>
                    <td style={{padding:"8px 10px"}}>{it.date}</td>
                    <td style={{padding:"8px 10px"}}>{it.start_hhmm||"—"}</td>
                    <td style={{padding:"8px 10px"}}>{it.end_hhmm||"—"}</td>
                    <td style={{padding:"8px 10px"}}>{it.pause_min==null?"—":`${it.pause_min} min`}</td>
                    <td style={{padding:"8px 10px"}}>{h.toFixed(2)}</td>
                    <td style={{padding:"8px 10px"}}>{it.note||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <style jsx global>{`
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"; background:#f6f7fb; }
        input, select, button { font: inherit; }
      `}</style>
    </main>
  );
}