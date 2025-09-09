import AppHeader from "../components/AppHeader";
import { useEffect, useMemo, useState } from "react";

type RawB = any;
type ExtraWork = { from?: string; to?: string; note?: string };
type B = {
  id: string;
  name?: string|null;
  projekt_nr?: string|null;
  kunden_nr?: string|null;
  strasse?: string|null;
  hausnummer?: string|null;
  plz?: string|null;
  ort?: string|null;

  start_datum?: string|null;   // UI-Standard (kann aus starttermin stammen)
  rhythmus_tage?: number|null;
  fest_termin?: string|null;   // UI-Feld (für „kein Rhythmus“); DB: wir speichern in start_datum

  codes?: string[]|null;
  extra_works?: ExtraWork[]|null;

  next_date?: Date|null;
  last_date?: Date|null;
  days_until?: number|null;
  overdue_days?: number|null;
  status?: "green"|"yellow"|"red"|"blue"|"yellow-blue"|"pink"|"gray";
  column?: "left"|"right";
};

type EditState = {
  id: string;

  // Durchführung / Einsatz
  done_date: string;
  done_time: string;
  mitarbeiter: number;
  start_time?: string;
  end_time?: string;
  pause_min: number;
  entsorgung_m3?: number | null;

  // Wiederkehr / Termine (UI)
  rhythmus_tage: number;
  start_datum?: string;   // nächster Termin (bei Rhythmus)
  fest_termin?: string;   // fester Einzeltermin (bei rhythmus=0)

  // Stammdaten (nur bei Neuanlage sichtbar)
  name: string;
  projekt_nr: string;
  kunden_nr: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;

  // Eigenschaften / Zusatzarbeiten
  codes: string[];
  extra_works: ExtraWork[];

  // UI Flags
  isNew?: boolean;
  quickFixed?: boolean;          // Schnellmodus „Festen neuen Termin eintragen“
  resumeRhythm?: boolean;        // danach wieder im Rhythmus weiter?
  prev_rhythmus_tage?: number;   // für resumeRhythm
};

function fetchJsonOk(url: string, init?: RequestInit){
  return fetch(url, { headers:{ "Accept":"application/json" }, ...init }).then(async r=>{
    const ct = r.headers.get("content-type") || "";
    const text = await r.text();
    let data:any = null;
    if (ct.includes("application/json")) { try{ data = JSON.parse(text); }catch{} }
    if (!data) { try{ data = JSON.parse(text); }catch{} }
    if (!r.ok || (data && data.ok===false)) {
      const hint = text && text.startsWith("<") ? " (Server lieferte HTML statt JSON)" : "";
      throw new Error((data?.error || r.statusText || "Fehler") + hint);
    }
    return data ?? {};
  });
}
async function postJSON(url:string, body:any){
  return fetchJsonOk(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
}

// --- Datums-Utils ---
const MS_DAY = 24*60*60*1000;
function parseYMD(s?: string|null): Date|null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const dt = new Date(y, mo, d, 12, 0, 0, 0);
  if (isNaN(dt.getTime())) return null;
  return dt;
}
function ymd(dt: Date): string {
  const y = dt.getFullYear();
  const m = (dt.getMonth()+1).toString().padStart(2,"0");
  const d = dt.getDate().toString().padStart(2,"0");
  return y + "-" + m + "-" + d;
}
function startOfDayLocal(dt: Date): Date {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0, 0);
}
function addDays(dt: Date, days: number): Date {
  const copy = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0, 0);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function diffDays(a: Date, b: Date): number {
  const A = startOfDayLocal(a).getTime();
  const B = startOfDayLocal(b).getTime();
  return Math.floor((B - A) / MS_DAY);
}
function formatDE(dt?: Date|null): string {
  if (!dt) return "—";
  try { return dt.toLocaleDateString("de-DE"); } catch { return ymd(dt); }
}

// --- Logik ---
function pickFixedDate(raw: any, rhythmus: number, start_datum: string|null): string|null {
  // fester Termin kann explizit in der Quelle heißen – oder wir nehmen start_datum, wenn KEIN Rhythmus
  const fixed = raw?.fest_termin ?? raw?.fixed_date ?? raw?.fester_termin ?? null;
  if (fixed) return String(fixed);
  if (!rhythmus) {
    const start = start_datum ?? raw?.starttermin ?? raw?.start ?? null;
    if (start) return String(start);
  }
  return null;
}
function readCodes(raw: any): string[] {
  const c = raw?.codes ?? raw?.zusatz_codes ?? raw?.flags ?? null;
  if (Array.isArray(c)) return c.map(String);
  return [];
}
function readExtraWorks(raw: any): ExtraWork[] {
  const e = raw?.extra_works ?? raw?.zusatzarbeiten ?? null;
  if (Array.isArray(e)) return e.map((x:any)=>({ from:x?.from, to:x?.to, note:x?.note }));
  return [];
}
function normalize(raw: RawB): B {
  const rhythmRaw = raw.rhythmus_tage ?? raw.rhythmus ?? null;
  const rhythm = (rhythmRaw===null || rhythmRaw===undefined) ? null : Number(rhythmRaw);
  const start = raw.start_datum ?? raw.starttermin ?? raw.start ?? null;
  const b: B = {
    id: String(raw.id),
    name: raw.name ?? null,
    projekt_nr: raw.projekt_nr ?? null,
    kunden_nr: raw.kunden_nr ?? null,
    strasse: raw.strasse ?? null,
    hausnummer: raw.hausnummer ?? null,
    plz: raw.plz ?? null,
    ort: raw.ort ?? null,
    start_datum: start,
    rhythmus_tage: rhythm,
    fest_termin: pickFixedDate(raw, Number(rhythm||0), start),
    codes: readCodes(raw),
    extra_works: readExtraWorks(raw),
    next_date: null,
    last_date: null,
    days_until: null,
    overdue_days: null,
    status: "gray",
    column: "right"
  };
  return b;
}
function address(b: B): string {
  const parts = [
    [b.strasse, b.hausnummer].filter(Boolean).join(" ").trim(),
    [b.plz, b.ort].filter(Boolean).join(" ").trim()
  ].filter(Boolean);
  return parts.join(", ");
}
function evalStatus(b: B, now: Date): B {
  const today = startOfDayLocal(now);
  const r = (b.rhythmus_tage==null ? 0 : Number(b.rhythmus_tage));
  const hasRhythm = r > 0;
  const start = parseYMD(b.start_datum);
  // „Fest“ kann aus explizitem fest_termin kommen – oder (Fallback) aus start_datum, wenn r==0
  const fixed = parseYMD(b.fest_termin || (r===0 ? b.start_datum || null : null));

  // Rhythmus-Fall
  if (hasRhythm && start) {
    b.next_date = start;
    b.last_date = addDays(start, -r);
    const d = diffDays(today, start);
    if (d > 4) { b.status = "green"; b.days_until = d; b.overdue_days = null; }
    else if (d >= 1 && d <= 4) { b.status = "yellow"; b.days_until = d; b.overdue_days = null; }
    else { b.status = "red"; b.days_until = null; b.overdue_days = Math.abs(Math.min(0, d)); }
    b.column = "left";
    return b;
  }

  // Kein Rhythmus → feste/lose Termine rechts
  b.column = "right";
  if (fixed) {
    b.next_date = fixed;
    b.last_date = (diffDays(fixed, today) < 0) ? fixed : null;
    const d = diffDays(today, fixed);
    if (d > 4) { b.status = "blue"; b.days_until = d; b.overdue_days = null; }
    else if (d >= 3 && d <= 4) { b.status = "yellow-blue"; b.days_until = d; b.overdue_days = null; }
    else if (d >= 1 && d <= 2) { b.status = "blue"; b.days_until = d; b.overdue_days = null; }
    else if (d === 0) { b.status = "pink"; b.days_until = 0; b.overdue_days = null; }
    else { b.status = "red"; b.days_until = null; b.overdue_days = Math.abs(d); }
    return b;
  }

  // Grau: kein Termin hinterlegt
  b.next_date = null;
  b.last_date = start ? start : null;
  b.status = "gray";
  b.days_until = null;
  b.overdue_days = null;
  return b;
}
function rankRight(b: B): number {
  if (b.status === "red") return 0;
  if (b.status === "pink") return 0;
  if (b.status === "yellow-blue") return 1;
  if (b.status === "blue") return 2;
  return 3;
}
function useNowTick(ms: number){
  const [now,setNow] = useState<Date>(new Date());
  useEffect(()=>{ const t = setInterval(()=>setNow(new Date()), ms); return ()=>clearInterval(t); },[ms]);
  return now;
}
function statusText(b: B): string {
  if (b.status==="red") {
    const d = b.overdue_days ?? 0;
    return d>0 ? ("überfällig seit " + d + " Tagen") : "heute fällig";
  }
  if (b.status==="yellow" || b.status==="green" || b.status==="blue" || b.status==="yellow-blue") {
    const d = b.days_until ?? 0;
    return (d===0) ? "heute fällig" : ("in " + d + " Tagen fällig");
  }
  if (b.status==="pink") return "heute fällig (akut)";
  if (b.status==="gray") return "wartet (kein Termin)";
  return "";
}
function cardClass(b: B, blink: boolean): string {
  const base = "card ";
  const map:any = { green:"card-green", yellow:"card-yellow", red:"card-red", blue:"card-blue", "yellow-blue":"card-yellowblue", pink:"card-pink", gray:"card-gray" };
  return base + (map[b.status||"gray"]||"card-gray") + (blink?" blink":"");
}
function calcNextPreview(edit: EditState): Date|null {
  const r = Number(edit.rhythmus_tage||0);
  if (edit.quickFixed) {
    // Vorschau: wenn „danach im Rhythmus“ -> fest + r, sonst fester Termin
    const fd = parseYMD(edit.fest_termin||null) || parseYMD(edit.done_date);
    if (!fd) return null;
    if (edit.resumeRhythm && (edit.prev_rhythmus_tage||0) > 0) {
      return addDays(fd, Number(edit.prev_rhythmus_tage||0));
    }
    return fd;
  }
  if (r > 0) {
    const done = parseYMD(edit.done_date);
    if (done) return addDays(done, r);
    const start = parseYMD(edit.start_datum||null);
    if (start) return addDays(start, r);
    return null;
  } else {
    return parseYMD(edit.fest_termin||null);
  }
}

export default function EinsaetzeMH(){
  const now = useNowTick(60000);
  const hour = now.getHours();

  const [items,setItems] = useState<B[]>([]);
  const [q,setQ] = useState("");
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState<string>("");

  const [showEdit,setShowEdit] = useState(false);
  const [edit,setEdit] = useState<EditState|null>(null);
  const [saving,setSaving] = useState(false);
  const [hint,setHint] = useState<string>("");

  async function load(){
    setLoading(true); setErr("");
    try{
      const j = await fetchJsonOk("/api/ma/einsaetzeMH/list?ts=" + Date.now());
      const arr: RawB[] = j.items || j || [];
      const normed = arr.map(normalize).map(b => evalStatus(b, now));
      setItems(normed);
    }catch(e:any){
      setErr("Laden: " + (e?.message || String(e)));
      setItems([]);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */},[]);

  const filtered = useMemo(()=>{
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(b=>{
      const hay = [b.name, b.projekt_nr, b.kunden_nr, address(b)].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  },[items,q]);

  const left = useMemo(()=>{
    return filtered.filter(b=> (b.rhythmus_tage||0) > 0 && b.next_date).sort((a,b)=>{
      return (a.next_date!.getTime() - b.next_date!.getTime()) || (a.name||"").localeCompare(b.name||"");
    });
  },[filtered]);

  const right = useMemo(()=>{
    const arr = filtered.filter(b=> (b.rhythmus_tage||0) === 0);
    return arr.sort((a,b)=>{
      const r1 = rankRight(a), r2 = rankRight(b);
      if (r1 !== r2) return r1 - r2;
      const t1 = a.next_date ? a.next_date.getTime() : Number.MAX_SAFE_INTEGER;
      const t2 = b.next_date ? b.next_date.getTime() : Number.MAX_SAFE_INTEGER;
      if (t1 !== t2) return t1 - t2;
      return (a.name||"").localeCompare(b.name||"");
    });
  },[filtered]);

  function baseEditFrom(b: B): EditState {
    const today = new Date();
    const hh = String(today.getHours()).padStart(2,"0");
    const mm = String(Math.round(today.getMinutes()/15)*15).padStart(2,"0");
    const codes = Array.isArray(b.codes) ? b.codes.slice() : [];
    const extra = Array.isArray(b.extra_works) ? b.extra_works.slice() : [];
    return {
      id: b.id,
      done_date: ymd(today),
      done_time: hh + ":" + mm,
      mitarbeiter: 1,
      start_time: "",
      end_time: "",
      pause_min: 30,
      entsorgung_m3: undefined,

      rhythmus_tage: (b.rhythmus_tage==null?0:Number(b.rhythmus_tage)),
      start_datum: b.start_datum || "",
      fest_termin: (b.rhythmus_tage||0)===0 ? (b.fest_termin || b.start_datum || "") : "",

      name: b.name || "",
      projekt_nr: b.projekt_nr || "",
      kunden_nr: b.kunden_nr || "",
      strasse: b.strasse || "",
      hausnummer: b.hausnummer || "",
      plz: b.plz || "",
      ort: b.ort || "",

      codes, extra_works: extra,

      isNew: false,
      quickFixed: false,
      resumeRhythm: false,
      prev_rhythmus_tage: Number(b.rhythmus_tage||0)
    };
  }

  function openEdit(b: B){
    const deff = baseEditFrom(b);
    setEdit(deff); setShowEdit(true);
  }
  function openQuickFixed(b: B){
    const e = baseEditFrom(b);
    e.quickFixed = true;
    e.resumeRhythm = (e.prev_rhythmus_tage||0) > 0;  // Standard: wieder im Rhythmus
    e.rhythmus_tage = 0;                             // sichtbar: kein Rhythmus
    // fester Termin default: heute
    e.fest_termin = ymd(new Date());
    setEdit(e); setShowEdit(true);
  }

  async function createNewFixed(){
    try{
      const payload:any = {
        name: "Neuer Kunde",
        rhythmus_tage: 0,
        // wir speichern fest in start_datum – API nimmt das
        start_datum: null,
        strasse: "", hausnummer: "", plz: "", ort: "",
        projekt_nr: "", kunden_nr: ""
      };
      const j = await postJSON("/api/admin/baustellen/upsert", payload);
      const id = j?.item?.id || j?.id;
      await load();
      if (id) {
        // aus GET öffnen
        try{
          const g = await fetchJsonOk("/api/admin/baustellen/get?id="+encodeURIComponent(id));
          const b = normalize(g.item); 
          const e = baseEditFrom(evalStatus(b, new Date()));
          e.isNew = true; // Stammdaten-Block sichtbar
          setEdit(e); setShowEdit(true);
        }catch{}
      }
      setHint("Neuer Kunde angelegt");
      setTimeout(()=>setHint(""),2000);
    }catch(e:any){
      alert("Anlegen fehlgeschlagen: " + (e?.message||String(e)));
    }
  }

  function toggleCode(code: string){
    if (!edit) return;
    const has = edit.codes.includes(code);
    setEdit({...edit, codes: has ? edit.codes.filter(c=>c!==code) : [...edit.codes, code]});
  }
  function addExtra(){ if (!edit) return; setEdit({...edit, extra_works: [...edit.extra_works, { from:"", to:"", note:"" }]}); }
  function updExtra(i:number, key: keyof ExtraWork, val: string){
    if (!edit) return; const copy = edit.extra_works.slice(); copy[i] = { ...copy[i], [key]: val }; setEdit({...edit, extra_works: copy});
  }
  function delExtra(i:number){
    if (!edit) return; const copy = edit.extra_works.slice(); copy.splice(i,1); setEdit({...edit, extra_works: copy});
  }

  async function saveWithVerify(payload:any, expectedNext:string|null){
    try { await postJSON("/api/admin/baustellen/update", payload); }
    catch {
      try { await postJSON("/api/admin/baustellen/upsert", payload); }
      catch(e2:any){ throw e2; }
    }
    try{
      const g = await fetchJsonOk("/api/admin/baustellen/get?id="+encodeURIComponent(payload.id));
      const gotStart = (g?.item?.start_datum ?? g?.item?.starttermin ?? null) as string|null;
      if (expectedNext && expectedNext !== gotStart) {
        await postJSON("/api/admin/baustellen/upsert", { id: payload.id, start_datum: expectedNext });
      }
    }catch{}
  }

  async function saveEdit(){
    if (!edit) return;
    setSaving(true); setHint("");
    try{
      const today = parseYMD(edit.done_date) || new Date();
      const rPrev = Number(edit.prev_rhythmus_tage||0);
      const rUI   = Number(edit.rhythmus_tage||0);

      let rOut = rUI;
      let nextPlannedISO: string|null = null;
      let startOut: string|null = null; // was wir in start_datum speichern

      // QUICK FIXED: „Festen neuen Termin eintragen“
      if (edit.quickFixed) {
        const fixed = parseYMD(edit.fest_termin||null) || today;
        if (edit.resumeRhythm && rPrev>0) {
          rOut = rPrev;
          startOut = ymd(addDays(fixed, rPrev)); // danach wieder im Rhythmus
          nextPlannedISO = startOut;
        } else {
          rOut = 0;
          startOut = ymd(fixed);                 // fester Termin (wir speichern in start_datum)
          nextPlannedISO = null;
        }
      }
      else {
        // Standard-Flow
        if (rUI > 0) {
          const done = parseYMD(edit.done_date);
          if (done) nextPlannedISO = ymd(addDays(done, rUI));
          else {
            const start = parseYMD(edit.start_datum||null);
            if (start) nextPlannedISO = ymd(addDays(start, rUI));
            else nextPlannedISO = null;
          }
          startOut = nextPlannedISO || (edit.start_datum||null);
        } else {
          rOut = 0;
          // fester Termin wird in start_datum gespeichert
          startOut = edit.fest_termin || null;
          nextPlannedISO = null;
        }
      }

      const payload:any = {
        id: edit.id,

        // Stammdaten (nur bei Neuanlage relevant – wir schicken aber unverändert mit)
        name: (edit.name||"").trim(),
        projekt_nr: (edit.projekt_nr||"").trim(),
        kunden_nr: (edit.kunden_nr||"").trim(),
        strasse: (edit.strasse||"").trim(),
        hausnummer: (edit.hausnummer||"").trim(),
        plz: (edit.plz||"").trim(),
        ort: (edit.ort||"").trim(),

        // Termine – nur start_datum wird an die DB gesendet (robust)
        rhythmus_tage: rOut,
        start_datum: startOut,

        // Durchführung
        erledigt_am: edit.done_date + "T" + (edit.done_time||"00:00") + ":00",
        mitarbeiter_anzahl: Number(edit.mitarbeiter)||0,
        arbeitszeit_start: edit.start_time||null,
        arbeitszeit_ende: edit.end_time||null,
        pause_min: Number(edit.pause_min)||0,
        entsorgung_m3: (edit.entsorgung_m3==null ? null : edit.entsorgung_m3),

        // Flags/Extras
        codes: edit.codes,
        extra_works: edit.extra_works
      };

      await saveWithVerify(payload, nextPlannedISO);
      setShowEdit(false);
      await load();
      setHint("Gespeichert ✓");
      setTimeout(()=>setHint(""),2000);
    }catch(e:any){
      alert("Speichern fehlgeschlagen: " + (e?.message||String(e)));
    }finally{
      setSaving(false);
    }
  }

  const previewNext = (edit ? calcNextPreview(edit) : null);

  return (
    <div style={{padding:"12px 16px 16px"}}>
      <h1 style={{fontSize:20, fontWeight:700, margin:"4px 0 12px"}}>Einsätze MH</h1>

      <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:12}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Suche nach Name/Adresse…"
               style={{padding:"8px 10px",border:"1px solid #e5e7eb",borderRadius:8,minWidth:280}}/>
        <button onClick={load} disabled={loading} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>{loading?"Lädt…":"Server neu laden"}</button>
        <div style={{marginLeft:"auto", display:"flex", gap:8, alignItems:"center"}}>
          <button onClick={createNewFixed} className="btn">Neuer Kunde</button>
          <div style={{color:"#059669"}}>{hint}</div>
          <div style={{color:"#ef4444"}}>{err}</div>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div>
          <div style={{fontWeight:700, marginBottom:8}}>Rhythmus-Termine</div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {left.map(b=>{
              const blink = (b.status==="pink" && hour>=10);
              return (
                <div key={b.id} className={cardClass(b, blink)} onClick={()=>openEdit(b)} style={{cursor:"pointer"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                    <div style={{fontWeight:700}}>{b.name||"—"}</div>
                    <div className="status-text">{statusText(b)}</div>
                  </div>
                  <div className="sub">{address(b)}</div>
                  <div className="sub">Nächster Termin: <b>{formatDE(b.next_date)}</b></div>
                  <div className="sub">Letzter Termin: {formatDE(b.last_date)}</div>
                  <div className="sub">
                    <button className="link" onClick={(e)=>{e.stopPropagation(); openQuickFixed(b);}}>
                      Festen neuen Termin eintragen
                    </button>
                  </div>
                </div>
              );
            })}
            {left.length===0 && <div style={{color:"#6b7280"}}>Keine rhythmischen Termine.</div>}
          </div>
        </div>

        <div>
          <div style={{fontWeight:700, marginBottom:8}}>Feste Termine</div>
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {right.map(b=>{
              const blink = (b.status==="pink" && hour>=10);
              return (
                <div key={b.id} className={cardClass(b, blink)} onClick={()=>openEdit(b)} style={{cursor:"pointer"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                    <div style={{fontWeight:700}}>{b.name||"—"}</div>
                    <div className="status-text">{statusText(b)}</div>
                  </div>
                  <div className="sub">{address(b)}</div>
                  <div className="sub">Termin: <b>{b.next_date?formatDE(b.next_date):"—"}</b></div>
                  <div className="sub">Letzter Termin: {formatDE(b.last_date)}</div>
                  <div className="sub">
                    <button className="link" onClick={(e)=>{e.stopPropagation(); openQuickFixed(b);}}>
                      Festen neuen Termin eintragen
                    </button>
                  </div>
                </div>
              );
            })}
            {right.length===0 && <div style={{color:"#6b7280"}}>Keine festen/losen Termine.</div>}
          </div>
        </div>
      </div>

      {showEdit && edit && (
        <div className="modal-backdrop" onClick={()=>setShowEdit(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
              <div style={{fontWeight:700}}>Termin bearbeiten</div>
              <button onClick={()=>setShowEdit(false)} className="btn">Schließen</button>
            </div>

            {edit.quickFixed && (
              <div className="banner">
                Schnellmodus: <b>Festen neuen Termin</b> erfassen
                <label style={{marginLeft:12, display:"inline-flex", alignItems:"center", gap:6}}>
                  <input type="checkbox" checked={!!edit.resumeRhythm} onChange={e=>setEdit({...edit!, resumeRhythm: e.target.checked})}/>
                  danach wieder im Rhythmus weiter{(edit.prev_rhythmus_tage||0)>0 ? ` (${edit.prev_rhythmus_tage} Tage)` : ""}
                </label>
              </div>
            )}

            <div className="preview">
              <b>Nächster Termin (Vorschau):</b> {formatDE(previewNext)}
            </div>

            {/* Stammdaten nur bei Neuanlage */}
            {edit.isNew && (
              <>
                <div style={{fontWeight:600, margin:"6px 0"}}>Stammdaten (Überschrift & Adresse)</div>
                <div className="grid2">
                  <label>Name (Überschrift)
                    <input type="text" value={edit.name} onChange={e=>setEdit({...edit!, name:e.target.value})}/>
                  </label>
                  <label>Projekt-Nr.
                    <input type="text" value={edit.projekt_nr} onChange={e=>setEdit({...edit!, projekt_nr:e.target.value})}/>
                  </label>
                  <label>Kunden-Nr.
                    <input type="text" value={edit.kunden_nr} onChange={e=>setEdit({...edit!, kunden_nr:e.target.value})}/>
                  </label>
                  <div></div>
                  <label>Straße
                    <input type="text" value={edit.strasse} onChange={e=>setEdit({...edit!, strasse:e.target.value})}/>
                  </label>
                  <label>Hausnummer
                    <input type="text" value={edit.hausnummer} onChange={e=>setEdit({...edit!, hausnummer:e.target.value})}/>
                  </label>
                  <label>PLZ
                    <input type="text" value={edit.plz} onChange={e=>setEdit({...edit!, plz:e.target.value})}/>
                  </label>
                  <label>Ort
                    <input type="text" value={edit.ort} onChange={e=>setEdit({...edit!, ort:e.target.value})}/>
                  </label>
                </div>
              </>
            )}

            {/* Durchführung / Einsatz */}
            <div style={{fontWeight:600, margin:"10px 0 6px"}}>Durchführung</div>
            <div className="grid2">
              <label>Durchführungsdatum
                <input type="date" value={edit.done_date} onChange={e=>setEdit({...edit!, done_date:e.target.value})}/>
              </label>
              <label>Uhrzeit
                <input type="time" step="900" min="06:00" max="19:00" value={edit.done_time} onChange={e=>setEdit({...edit!, done_time:e.target.value})}/>
              </label>
              <label>Mitarbeiter
                <input type="number" min={0} value={edit.mitarbeiter} onChange={e=>setEdit({...edit!, mitarbeiter: Number(e.target.value||0)})}/>
              </label>
              <div></div>
              <label>Arbeitsbeginn
                <input type="time" step="900" min="06:00" max="19:00" value={edit.start_time||""} onChange={e=>setEdit({...edit!, start_time:e.target.value})}/>
              </label>
              <label>Arbeitsende
                <input type="time" step="900" min="06:00" max="19:00" value={edit.end_time||""} onChange={e=>setEdit({...edit!, end_time:e.target.value})}/>
              </label>
              <label>Pause (Minuten)
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,alignItems:"center"}}>
                  <input type="number" min={0} step={5} value={edit.pause_min} onChange={e=>setEdit({...edit!, pause_min: Number(e.target.value||0)})}/>
                  <button className="btn" onClick={()=>setEdit({...edit!, pause_min: 0})}>Ohne Pause</button>
                </div>
              </label>
              <label>Entsorgung (m³)
                <input type="number" min={0} step="0.01" value={(edit.entsorgung_m3==null?"":String(edit.entsorgung_m3))} onChange={e=>{
                  const v = e.target.value; setEdit({...edit!, entsorgung_m3: (v==="" ? null : Number(v))});
                }}/>
              </label>
            </div>

            {/* Terminlogik */}
            <div style={{fontWeight:600, margin:"10px 0 6px"}}>Terminlogik</div>
            <div className="grid2">
              <label>Rhythmus (Tage)
                <select value={String(edit.rhythmus_tage)} onChange={e=>setEdit({...edit!, rhythmus_tage: Number(e.target.value)})} disabled={edit.quickFixed && edit.resumeRhythm}>
                  <option value="0">Kein Rhythmus</option>
                  <option value="7">7</option>
                  <option value="14">14</option>
                  <option value="21">21</option>
                  <option value="28">28</option>
                  <option value="365">365</option>
                </select>
              </label>
              <label>Eigener Rhythmus
                <input type="number" min={0} placeholder="eigene Tage" onChange={e=>{ const n = Number(e.target.value||0); if(n>0) setEdit({...edit!, rhythmus_tage:n}); }} disabled={edit.quickFixed && edit.resumeRhythm}/>
              </label>

              { (edit.rhythmus_tage>0 && !(edit.quickFixed && !edit.resumeRhythm)) ? (
                <label style={{gridColumn:"1 / -1"}}>Nächster Termin wird gespeichert als (start_datum)
                  <input type="date" value={previewNext? ymd(previewNext) : (edit.start_datum||"")} onChange={e=>setEdit({...edit!, start_datum:e.target.value})}/>
                </label>
              ) : (
                <label style={{gridColumn:"1 / -1"}}>Fester Termin
                  <input type="date" value={edit.fest_termin||""} onChange={e=>setEdit({...edit!, fest_termin:e.target.value})}/>
                </label>
              )}
            </div>

            {/* Eigenschaften / Zusatzarbeiten */}
            <div style={{marginTop:12}}>
              <div style={{fontWeight:600, marginBottom:6}}>Eigenschaften</div>
              <div className="chips">
                {["SS","HS","M","L","RS","BP","GRAU","WK"].map(code=>(
                  <button key={code} onClick={()=>toggleCode(code)} className={"chip-btn " + (edit.codes.includes(code)?"on":"")}>{code}</button>
                ))}
              </div>
            </div>

            <div style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontWeight:600}}>Zusatzarbeiten</div>
                <button className="btn" onClick={addExtra}>+ Zeile</button>
              </div>
              <div>
                {edit.extra_works.map((x,idx)=>(
                  <div key={idx} className="row-extra">
                    <input type="time" step="900" min="06:00" max="19:00" value={x.from||""} onChange={e=>updExtra(idx,"from",e.target.value)} placeholder="von"/>
                    <input type="time" step="900" min="06:00" max="19:00" value={x.to||""} onChange={e=>updExtra(idx,"to",e.target.value)} placeholder="bis"/>
                    <input type="text" value={x.note||""} onChange={e=>updExtra(idx,"note",e.target.value)} placeholder="was wurde gemacht?"/>
                    <button className="btn" onClick={()=>delExtra(idx)}>Entfernen</button>
                  </div>
                ))}
                {edit.extra_works.length===0 && <div style={{color:"#6b7280"}}>Keine Zusatzarbeiten erfasst.</div>}
              </div>
            </div>

            <div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:12}}>
              <button className="btn" onClick={()=>setShowEdit(false)}>Abbrechen</button>
              <button className="btn btn-save" onClick={saveEdit} disabled={saving}>{saving?"Speichert…":"Speichern"}</button>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html:
            ".card{border:1px solid transparent;border-radius:12px;padding:10px;color:#111827}"+
            ".card-green{background:#ecfdf5;border-color:#10b981}"+
            ".card-yellow{background:#fefce8;border-color:#f59e0b}"+
            ".card-red{background:#fee2e2;border-color:#ef4444}"+
            ".card-blue{background:#eff6ff;border-color:#60a5fa}"+
            ".card-yellowblue{background:linear-gradient(90deg,#fde047,#60a5fa);border-color:#d1d5db}"+
            ".card-pink{background:#fce7f3;border-color:#ec4899}"+
            ".card-gray{background:#f3f4f6;border-color:#e5e7eb;color:#4b5563}"+
            ".sub{font-size:13px;margin-top:2px}"+
            ".status-text{font-size:12px;font-weight:600}"+
            "@keyframes blink{0%{opacity:1}50%{opacity:.4}100%{opacity:1}}"+
            ".blink{animation:blink 1s linear infinite}"+
            ".modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}"+
            ".modal{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;max-width:860px;width:100%}"+
            ".grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}"+
            ".preview{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:14px}"+
            ".btn{padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}"+
            ".btn-save{border-color:#10b981;background:#ecfdf5;color:#065f46}"+
            ".chips{display:flex;flex-wrap:wrap;gap:8px}"+
            ".chip-btn{padding:6px 10px;border:1px solid #e5e7eb;border-radius:9999px;background:#fff;font-weight:600}"+
            ".chip-btn.on{border-color:#2563eb;background:#dbeafe}"+
            ".row-extra{display:grid;grid-template-columns:120px 120px 1fr auto;gap:8px;align-items:center;margin-bottom:8px}"+
            ".link{background:none;border:none;padding:0;margin:0;cursor:pointer;text-decoration:underline;font-size:13px;color:#1d4ed8}"+
            ".banner{background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:8px 10px;margin-bottom:10px;color:#1e3a8a}"
        }}
      />
    </div>
  );
}
