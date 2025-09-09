import React, { useEffect, useMemo, useState } from "react";

type ListItem = { id: string; nachname: string; name?: string|null; aktiv?: boolean };
type DetailItem = {
  id: string;
  nachname?: string;
  name?: string|null;
  telefon?: string|null;
  email?: string|null;
  strasse?: string|null;
  hausnummer?: string|null;
  plz?: string|null;
  ort?: string|null;
  steuernummer?: string|null;
  iban?: string|null;
  bic?: string|null;
  bank_name?: string|null;
  kontoinhaber?: string|null;
  fuehrerschein_klassen?: string[]|null;
  fuehrerschein_gueltig_bis?: string|null; // YYYY-MM-DD
  geburtsdatum?: string|null;              // YYYY-MM-DD
  notfall_name?: string|null;
  notfall_tel?: string|null;
  notizen?: string|null;
  pin_set?: boolean;
  aktiv?: boolean;
};

async function fetchJson(url: string, opts?: RequestInit){
  const r = await fetch(url, opts);
  const data = await r.json().catch(()=> ({}));
  if (!r.ok || data?.ok === false) {
    const msg = data?.error || r.statusText || "Fehler";
    throw new Error(msg);
  }
  return data;
}

function toText(v: any){ return (v ?? "").toString(); }
function arrToCsv(a?: string[]|null){ return (a||[]).join(", "); }
function csvToArr(s: string){
  return (s||"").split(",").map(x=>x.trim()).filter(Boolean);
}
function randomPin6(){ return String(Math.floor(100000 + Math.random()*900000)); }

export default function StammdatenPage(){
  const [list, setList] = useState<ListItem[]>([]);
  const [q, setQ] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [detail, setDetail] = useState<DetailItem|null>(null);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [shownNewPin, setShownNewPin] = useState<string|null>(null);

  const [msg, setMsg] = useState<string|null>(null);
  const [err, setErr] = useState<string|null>(null);

  // Neu anlegen
  const [newOpen, setNewOpen] = useState(false);
  const [newNachname, setNewNachname] = useState("");
  const [newName, setNewName] = useState("");
  const [newBusy, setNewBusy] = useState(false);

  async function loadList(){
    try{
      setLoadingList(true);
      const data = await fetchJson(`/api/admin/stammdaten/list?ts=${Date.now()}`);
      const items: ListItem[] = (data?.mitarbeiter || data?.items || []).map((x:any)=>({
        id: x.id, nachname: x.nachname, name: x.name ?? null, aktiv: x.aktiv ?? true
      }));
      setList(items);
    }catch(e:any){
      setErr(e?.message||String(e));
    }finally{
      setLoadingList(false);
    }
  }

  useEffect(()=>{ loadList(); },[]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    const base = list.slice().sort((a,b)=> (a.nachname||"").localeCompare(b.nachname||""));
    return !s ? base : base.filter(it =>
      it.nachname?.toLowerCase().includes(s) ||
      (it.name||"").toLowerCase().includes(s)
    );
  }, [list, q]);

  async function loadDetail(it: ListItem){
    setErr(null); setMsg(null); setShownNewPin(null);
    setDetail(null);
    try{
      let data: any;
      try {
        data = await fetchJson(`/api/admin/mitarbeiter/get?id=${encodeURIComponent(it.id)}`);
      } catch {
        data = await fetchJson(`/api/admin/mitarbeiter/get?lastname=${encodeURIComponent(it.nachname)}`);
      }
      const d = data?.item || {};
      const di: DetailItem = {
        id: d.id,
        nachname: d.nachname ?? it.nachname,
        name: d.name ?? it.name ?? "",
        telefon: d.telefon ?? "",
        email: d.email ?? "",
        strasse: d.strasse ?? "",
        hausnummer: d.hausnummer ?? "",
        plz: d.plz ?? "",
        ort: d.ort ?? "",
        steuernummer: d.steuernummer ?? "",
        iban: d.iban ?? "",
        bic: d.bic ?? "",
        bank_name: d.bank_name ?? "",
        kontoinhaber: d.kontoinhaber ?? "",
        fuehrerschein_klassen: d.fuehrerschein_klassen ?? [],
        fuehrerschein_gueltig_bis: d.fuehrerschein_gueltig_bis ?? "",
        geburtsdatum: d.geburtsdatum ?? "",
        notfall_name: d.notfall_name ?? "",
        notfall_tel: d.notfall_tel ?? "",
        notizen: d.notizen ?? "",
        pin_set: Boolean(d.pin_set),
        aktiv: d.aktiv ?? it.aktiv ?? true,
      };
      setDetail(di);
      setPin("");
    }catch(e:any){
      setErr(e?.message||String(e));
    }
  }

  async function saveDetail(){
    if (!detail?.id) return;
    setSaving(true); setMsg(null); setErr(null);
    try{
      const payload: any = {
        id: detail.id,
        telefon: toText(detail.telefon),
        email: toText(detail.email),
        strasse: toText(detail.strasse),
        hausnummer: toText(detail.hausnummer),
        plz: toText(detail.plz),
        ort: toText(detail.ort),
        steuernummer: toText(detail.steuernummer),
        iban: toText(detail.iban),
        bic: toText(detail.bic),
        bank_name: toText(detail.bank_name),
        kontoinhaber: toText(detail.kontoinhaber),
        fuehrerschein_klassen: detail.fuehrerschein_klassen || [],
        fuehrerschein_gueltig_bis: toText(detail.fuehrerschein_gueltig_bis),
        geburtsdatum: toText(detail.geburtsdatum),
        notfall_name: toText(detail.notfall_name),
        notfall_tel: toText(detail.notfall_tel),
      };
      if (toText(detail.notizen)) payload.notizen = toText(detail.notizen);

      await fetchJson("/api/admin/mitarbeiter/update", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });

      setMsg("Gespeichert.");
    }catch(e:any){
      setErr(e?.message||String(e));
    }finally{
      setSaving(false);
    }
  }

  async function setPinNow(customPin?: string){
    if (!detail?.id) return;
    const newPin = (customPin ?? pin).trim();
    if (!newPin) return;
    setPinBusy(true); setMsg(null); setErr(null);
    try{
      await fetchJson("/api/admin/mitarbeiter/set_pin", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ id: detail.id, pin: newPin }),
      });
      setMsg("PIN gesetzt.");
      setShownNewPin(newPin);
      setPin("");
    }catch(e:any){
      setErr(e?.message||String(e));
    }finally{
      setPinBusy(false);
    }
  }
  async function setRandomPin(){ await setPinNow(randomPin6()); }

  async function toggleAktiv(){
    if (!detail?.id) return;
    const next = !detail.aktiv;
    try{
      setErr(null); setMsg(null);
      await fetchJson("/api/admin/mitarbeiter/set_active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, aktiv: next })
      });
      setDetail({...detail, aktiv: next});
      setList(list.map(it => it.id === detail.id ? {...it, aktiv: next} : it));
      setMsg(next ? "Mitarbeiter ist jetzt AKTIV." : "Mitarbeiter ist jetzt INAKTIV.");
    }catch(e:any){
      setErr(e?.message||String(e));
    }
  }

  async function deleteMitarbeiter(){
    if (!detail?.id) return;
    const c1 = window.prompt("Zum endgültigen Löschen bitte 'LÖSCHEN' eingeben. (Die 10-Jahres-Frist wird serverseitig geprüft.)");
    if (c1 !== "LÖSCHEN") return;
    try{
      setErr(null); setMsg(null);
      await fetchJson(`/api/admin/mitarbeiter/delete?id=${encodeURIComponent(detail.id)}`, { method: "DELETE" });
      setMsg("Mitarbeiter gelöscht (sofern serverseitig zulässig).");
      setList(list.filter(it => it.id !== detail.id));
      setDetail(null);
    }catch(e:any){
      setErr(e?.message||String(e));
    }
  }

  function copy(text: string){
    navigator.clipboard?.writeText(text).catch(()=>{});
  }

  return (
    <div style={{display:"grid", gridTemplateColumns:"320px 1fr", gap:"16px", padding:"16px"}}>
      {/* Liste */}
      <div style={{border:"1px solid #ddd", borderRadius:8, padding:12, height:"calc(100vh - 48px)", overflow:"auto"}}>
        <div style={{display:"flex", gap:8, marginBottom:12}}>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Suchen (Nachname / Name)…"
            style={{flex:1, padding:"8px 10px", border:"1px solid #bbb", borderRadius:6}}
          />
          <button
            onClick={()=>setNewOpen(v=>!v)}
            style={{padding:"8px 12px", border:"1px solid #0a7", background:"#0db", color:"#fff", borderRadius:6}}
            title="Neuen Mitarbeiter anlegen"
          >Neu</button>
        </div>

        {newOpen ? (
          <div style={{border:"1px dashed #aaa", borderRadius:8, padding:10, marginBottom:12, background:"#fbfbfb"}}>
            <div style={{display:"grid", gap:8}}>
              <div>
                <label style={{display:"block", fontSize:12, color:"#555", marginBottom:6}}>Nachname *</label>
                <input value={newNachname} onChange={e=>setNewNachname(e.target.value)} />
              </div>
              <div>
                <label style={{display:"block", fontSize:12, color:"#555", marginBottom:6}}>Name (Anzeige)</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} />
              </div>
              <div style={{display:"flex", gap:8}}>
                <button
                  onClick={async ()=>{
                    if (!newNachname.trim()) { setErr("Bitte Nachname angeben."); return; }
                    setNewBusy(true); setErr(null); setMsg(null);
                    try{
                      const res = await fetchJson("/api/admin/mitarbeiter/create", {
                        method: "POST",
                        headers: { "Content-Type":"application/json" },
                        body: JSON.stringify({ nachname: newNachname.trim(), name: newName.trim() || undefined })
                      });
                      await loadList();
                      setNewNachname(""); setNewName(""); setNewOpen(false);
                      const added = list.find(x=>x.id===res?.id);
                      if (added) loadDetail(added);
                      setMsg("Neuer Mitarbeiter angelegt.");
                    }catch(e:any){
                      setErr(e?.message||String(e));
                    }finally{
                      setNewBusy(false);
                    }
                  }}
                  disabled={newBusy || !newNachname.trim()}
                  style={{padding:"8px 12px", border:"1px solid #0a7", background:"#0db", color:"#fff", borderRadius:6, opacity:(newBusy||!newNachname.trim())?0.6:1}}
                >Anlegen</button>
                <button
                  onClick={()=>{ setNewOpen(false); setNewNachname(""); setNewName(""); }}
                  style={{padding:"8px 12px", border:"1px solid #bbb", background:"#f7f7f7", borderRadius:6}}
                >Abbrechen</button>
              </div>
            </div>
          </div>
        ) : null}

        {loadingList ? <div>Lade…</div> : null}
        {!loadingList && filtered.map(it=>(
          <button
            key={it.id}
            onClick={()=>loadDetail(it)}
            style={{
              display:"block",
              width:"100%",
              textAlign:"left",
              padding:"10px 12px",
              marginBottom:8,
              border:"1px solid #e5e5e5",
              background: it.aktiv === false ? "#f9f9f9" : "#fff",
              color: it.aktiv === false ? "#777" : "inherit",
              borderRadius:6,
              cursor:"pointer"
            }}
            title={it.aktiv === false ? "Inaktiv" : "Aktiv"}
          >
            <div style={{fontWeight:600, display:"flex", alignItems:"center", gap:8}}>
              <span>{it.nachname}</span>
              {it.aktiv === false ? <span style={{fontSize:11, padding:"1px 6px", border:"1px solid #ccc", borderRadius:999}}>inaktiv</span> : null}
            </div>
            <div style={{fontSize:12, color:"#666"}}>{it.name || "—"}</div>
          </button>
        ))}
      </div>

      {/* Detail */}
      <div style={{border:"1px solid #ddd", borderRadius:8, padding:16}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <h1 style={{margin:0, fontSize:20}}>Mitarbeiter-Stammdaten</h1>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <button
              onClick={saveDetail}
              disabled={!detail || saving}
              style={{padding:"8px 14px", border:"1px solid #0a7", background:"#0db", color:"#fff", borderRadius:6, opacity:(!detail||saving)?0.7:1}}
            >
              {saving ? "Speichern…" : "Speichern"}
            </button>
            <button
              onClick={toggleAktiv}
              disabled={!detail}
              style={{padding:"8px 14px", border:"1px solid #888", background:"#444", color:"#fff", borderRadius:6, opacity:(!detail)?0.6:1}}
              title="Aktiv/Inaktiv umschalten"
            >
              {detail?.aktiv === false ? "Aktiv setzen" : "Inaktiv setzen"}
            </button>
            <button
              onClick={deleteMitarbeiter}
              disabled={!detail}
              style={{padding:"8px 14px", border:"1px solid #b00", background:"#e33", color:"#fff", borderRadius:6, opacity:(!detail)?0.6:1}}
              title="Endgültig löschen (Server prüft 10-Jahres-Frist)"
            >
              Löschen
            </button>
          </div>
        </div>

        {msg ? <div style={{marginBottom:10, color:"#0a7"}}>✅ {msg}</div> : null}
        {err ? <div style={{marginBottom:10, color:"#b00"}}>⚠️ {err}</div> : null}

        {!detail ? (
          <div>Bitte links einen Mitarbeiter auswählen.</div>
        ) : (
          <div style={{display:"grid", gridTemplateColumns:"repeat(2, minmax(280px, 1fr))", gap:"12px"}}>
            <Field label="Nachname">
              <input value={toText(detail.nachname)} readOnly className="ro" />
            </Field>
            <Field label="Name (Anzeige)">
              <input value={toText(detail.name)} onChange={e=>setDetail({...detail, name: e.target.value})} />
            </Field>

            <Field label="Telefon">
              <input value={toText(detail.telefon)} onChange={e=>setDetail({...detail, telefon: e.target.value})} />
            </Field>
            <Field label="E-Mail">
              <input value={toText(detail.email)} onChange={e=>setDetail({...detail, email: e.target.value})} />
            </Field>

            <Field label="Straße">
              <input value={toText(detail.strasse)} onChange={e=>setDetail({...detail, strasse: e.target.value})} />
            </Field>
            <Field label="Hausnummer">
              <input value={toText(detail.hausnummer)} onChange={e=>setDetail({...detail, hausnummer: e.target.value})} />
            </Field>
            <Field label="PLZ">
              <input value={toText(detail.plz)} onChange={e=>setDetail({...detail, plz: e.target.value})} />
            </Field>
            {/* FIX: hier war ein überflüssiges '}' hinter </Field> */}
            <Field label="Ort">
              <input value={toText(detail.ort)} onChange={e=>setDetail({...detail, ort: e.target.value})} />
            </Field>

            <Field label="Steuernummer">
              <input value={toText(detail.steuernummer)} onChange={e=>setDetail({...detail, steuernummer: e.target.value})} />
            </Field>
            <Field label="IBAN">
              <input value={toText(detail.iban)} onChange={e=>setDetail({...detail, iban: e.target.value})} />
            </Field>
            <Field label="BIC">
              <input value={toText(detail.bic)} onChange={e=>setDetail({...detail, bic: e.target.value})} />
            </Field>
            <Field label="Bankname">
              <input value={toText(detail.bank_name)} onChange={e=>setDetail({...detail, bank_name: e.target.value})} />
            </Field>
            <Field label="Kontoinhaber">
              <input value={toText(detail.kontoinhaber)} onChange={e=>setDetail({...detail, kontoinhaber: e.target.value})} />
            </Field>

            <Field label="Führerschein-Klassen (z. B. B, BE)">
              <input
                value={arrToCsv(detail.fuehrerschein_klassen||[])}
                onChange={e=>setDetail({...detail, fuehrerschein_klassen: csvToArr(e.target.value)})}
              />
            </Field>
            <Field label="Führerschein gültig bis">
              <input type="date"
                value={toText(detail.fuehrerschein_gueltig_bis)}
                onChange={e=>setDetail({...detail, fuehrerschein_gueltig_bis: e.target.value})}
              />
            </Field>

            <Field label="Geburtsdatum">
              <input type="date"
                value={toText(detail.geburtsdatum)}
                onChange={e=>setDetail({...detail, geburtsdatum: e.target.value})}
              />
            </Field>

            <Field label="Notfall-Kontakt Name">
              <input value={toText(detail.notfall_name)} onChange={e=>setDetail({...detail, notfall_name: e.target.value})} />
            </Field>
            <Field label="Notfall-Kontakt Telefon">
              <input value={toText(detail.notfall_tel)} onChange={e=>setDetail({...detail, notfall_tel: e.target.value})} />
            </Field>

            <div style={{gridColumn:"1 / -1"}}>
              <Field label="Notizen">
                <textarea
                  rows={5}
                  value={toText(detail.notizen)}
                  onChange={e=>setDetail({...detail, notizen: e.target.value})}
                />
              </Field>
            </div>

            <div style={{gridColumn:"1 / -1", borderTop:"1px dashed #ddd", paddingTop:12, marginTop:6}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                <div style={{fontWeight:600}}>PIN-Verwaltung</div>
                {detail?.pin_set ? <div style={{fontSize:12, color:"#0a7"}}>Es ist bereits eine PIN hinterlegt.</div> : <div style={{fontSize:12, color:"#a70"}}>Noch keine PIN gespeichert.</div>}
              </div>

              {shownNewPin ? (
                <div style={{padding:12, border:"1px solid #0a7", borderRadius:8, marginBottom:10, background:"#f3fffa"}}>
                  <div style={{fontSize:12, color:"#066"}}>Neue PIN (jetzt weitergeben):</div>
                  <div style={{fontSize:28, fontWeight:700, letterSpacing:2}}>{shownNewPin}</div>
                  <div style={{marginTop:8}}>
                    <button
                      onClick={()=>copy(shownNewPin)}
                      style={{padding:"6px 10px", border:"1px solid #0a7", background:"#0db", color:"#fff", borderRadius:6}}
                    >PIN kopieren</button>
                  </div>
                </div>
              ) : null}

              <div style={{display:"flex", alignItems:"flex-end", gap:8, flexWrap:"wrap"}}>
                <div style={{flex:"1 1 220px"}}>
                  <label style={{display:"block", fontSize:12, color:"#555", marginBottom:6}}>Neue PIN (optional manuell)</label>
                  <input
                    value={pin}
                    onChange={e=>setPin(e.target.value)}
                    placeholder="z. B. 197310"
                    style={{width:"100%", padding:"8px 10px", border:"1px solid #bbb", borderRadius:6}}
                  />
                </div>
                <button
                  onClick={()=>setPinNow()}
                  disabled={!detail?.id || pinBusy || (!pin || !pin.trim())}
                  style={{padding:"9px 14px", border:"1px solid #888", background:"#444", color:"#fff", borderRadius:6, opacity:(!detail?.id || pinBusy || !pin.trim())?0.7:1}}
                >
                  {pinBusy ? "PIN wird gesetzt…" : "PIN setzen"}
                </button>
                <button
                  onClick={setRandomPin}
                  disabled={!detail?.id || pinBusy}
                  style={{padding:"9px 14px", border:"1px solid #0a7", background:"#0db", color:"#fff", borderRadius:6, opacity:(!detail?.id || pinBusy)?0.7:1}}
                  title="Erzeugt automatisch eine 6-stellige PIN und zeigt sie an"
                >
                  Zufalls-PIN erzeugen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        input, textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #bbb;
          border-radius: 6px;
          outline: none;
        }
        input.ro { background: #f7f7f7; color: #555; }
        label { display:block; font-size:12px; color:#555; margin-bottom:6px; }
      `}</style>
    </div>
  );
}

function Field({label, children}:{label:string; children: React.ReactNode}){
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}
