import { useEffect, useMemo, useState } from "react";
import StammdatenTabs from "../../components/StammdatenTabs";

type B = {
  id:string; name?:string|null; projekt_nr?:string|null; kunden_nr?:string|null;
  strasse?:string|null; hausnummer?:string|null; plz?:string|null; ort?:string|null;
  telefon?:string|null; email?:string|null;
  start_datum?:string|null; rhythmus_tage?: number|null;
  aktiv?:boolean|null; archiviert_am?:string|null;
  notizen?:string|null; lv_urls?:string[]|null;
};

async function fetchSmart(url: string, opts?: RequestInit){
  const r = await fetch(url, { headers:{ Accept:"application/json, text/plain, */*", ...(opts?.headers||{}) }, ...opts });
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  let data:any = null;
  if (ct.includes("application/json")) { try { data = JSON.parse(text); } catch {} }
  if (!data) { try { data = JSON.parse(text); } catch {} }
  if (!r.ok || (data && data.ok === false)) {
    const short = (data && data.error) || r.statusText || "Fehler";
    const htmlHint = text && text.startsWith("<") ? " (Server lieferte HTML statt JSON – Route existiert evtl. nicht)" : "";
    throw new Error(short + htmlHint);
  }
  return data || {};
}

export default function BaustellenStammdaten(){
  const [items,setItems] = useState<B[]>([]);
  const [q,setQ] = useState("");
  const [status,setStatus] = useState<"alle"|"aktiv"|"archiv">("alle");
  const [loading,setLoading] = useState(false);
  const [creating,setCreating] = useState(false);
  const [sel,setSel] = useState<B|null>(null);
  const [edit,setEdit] = useState<B|null>(null);
  const [msg,setMsg] = useState<string>("");

  const todayIso = new Date().toISOString().slice(0,10);

  async function load(){
    setLoading(true);
    try{
      const url = "/api/admin/baustellen/list?status=" + status + "&q=" + encodeURIComponent(q) + "&ts=" + Date.now();
      const j = await fetchSmart(url);
      setItems(j.items||[]);
    }catch(e:any){
      setItems([]);
      setMsg("Liste: " + (e?.message||String(e)));
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */},[status]);

  function addr(b:B){
    const parts = [b.strasse, b.hausnummer, [b.plz,b.ort].filter(Boolean).join(" ")].filter(Boolean);
    return parts.join(", ");
  }

  function rhythmText(b:B){
    const t = (b.rhythmus_tage==null ? 0 : Number(b.rhythmus_tage));
    return t===0 ? "fest" : (t + " Tage");
  }

  async function onEdit(id:string){
    try{
      const j = await fetchSmart("/api/admin/baustellen/get?id=" + id);
      const rt = (j.item && (j.item.rhythmus_tage===null || j.item.rhythmus_tage===undefined)) ? null : Number(j.item?.rhythmus_tage);
      setSel(j.item); setEdit({ ...(j.item||{}), rhythmus_tage: (isFinite(rt as any) ? rt : null) as any });
    }catch(e:any){
      setMsg("Details: " + (e?.message||String(e)));
    }
  }

  function invalidFestStart(){
    if(!edit) return false;
    const rt = edit.rhythmus_tage==null ? 0 : Number(edit.rhythmus_tage);
    const isFest = (rt===0);
    const start = (edit.start_datum||"").slice(0,10);
    return isFest && !!start && start < todayIso;
  }

  async function save(){
    if(!edit) return;
    if (invalidFestStart()){ setMsg("Fester Termin darf nicht in der Vergangenheit liegen."); return; }
    setMsg("");
    try{
      const j = await fetchSmart("/api/admin/baustellen/update",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(edit)
      });
      setSel(j.item); setEdit(j.item);
      load();
      setMsg("Gespeichert ✓");
      setTimeout(()=>setMsg(""),2000);
    }catch(e:any){
      setMsg("Speichern: " + (e?.message||String(e)));
    }
  }

  async function toggleArchiv(toArchiv:boolean){
    if(!sel) return;
    try{
      const j = await fetchSmart("/api/admin/baustellen/update",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id: sel.id, archivieren: toArchiv })
      });
      setSel(j.item); setEdit(j.item);
      load();
    }catch(e:any){
      setMsg("(De-)Archivieren: " + (e?.message||String(e)));
    }
  }

  async function hardDelete(){
    if(!sel) return;
    if(!confirm("Wirklich unwiderruflich löschen?")) return;
    try{
      await fetchSmart("/api/admin/baustellen/update",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ id: sel.id, hard_delete: true })
      });
      setSel(null); setEdit(null);
      load();
      setMsg("Gelöscht ✓");
      setTimeout(()=>setMsg(""),2000);
    }catch(e:any){
      setMsg("Löschen: " + (e?.message||String(e)));
    }
  }

  async function createBaustelle(){
    const payload:any = { name:"Neue Baustelle", strasse:"", hausnummer:"", plz:"", ort:"", aktiv:true };
    setCreating(true); setMsg("");
    try{
      const j = await fetchSmart("/api/admin/baustellen/upsert",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      await load();
      const newId = (j && (j.item?.id || j.id)) || null;
      if(newId){ await onEdit(newId); }
      setMsg("Baustelle angelegt ✓");
      setTimeout(()=>setMsg(""),2000);
    }catch(e:any){
      setMsg("Anlegen: " + (e?.message||String(e)));
    }finally{
      setCreating(false);
    }
  }

  const filtered = useMemo(()=>items, [items]);

  return (
    <div>
      <StammdatenTabs active="baustellen" />
      <div style={{padding:"12px 16px 16px"}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") load(); }}
                 placeholder="Suche (Name, Projekt-, Kunden-Nr., Adresse)" style={{padding:"8px 10px",border:"1px solid #e5e7eb",borderRadius:8,minWidth:280}}/>
          <select value={status} onChange={e=>setStatus(e.target.value as any)} style={{padding:"8px 10px",border:"1px solid #e5e7eb",borderRadius:8}}>
            <option value="alle">Alle</option>
            <option value="aktiv">Aktiv</option>
            <option value="archiv">Archiv</option>
          </select>
          <button onClick={load} disabled={loading} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>{loading?"Lädt…":"Aktualisieren"}</button>

          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <button
              onClick={createBaustelle}
              disabled={creating}
              style={{padding:"8px 12px",border:"1px solid #10b981",borderRadius:8,background:"#ecfdf5",color:"#065f46"}}
              title="Neue Baustelle anlegen"
            >
              {creating ? "Anlegen…" : "➕ Neue Baustelle"}
            </button>
            <div style={{color:"#059669"}}>{msg}</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 460px",gap:16}}>
          {/* Liste */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
              <tr style={{background:"#f8fafc"}}>
                <th style={{textAlign:"left",padding:"10px"}}>Name</th>
                <th style={{textAlign:"left",padding:"10px"}}>Projekt-Nr.</th>
                <th style={{textAlign:"left",padding:"10px"}}>Kunden-Nr.</th>
                <th style={{textAlign:"left",padding:"10px"}}>Adresse</th>
                <th style={{textAlign:"left",padding:"10px"}}>Start</th>
                <th style={{textAlign:"left",padding:"10px"}}>Rhythmus</th>
                <th style={{textAlign:"left",padding:"10px"}}>Aktiv</th>
                <th style={{padding:"10px"}}></th>
              </tr>
              </thead>
              <tbody>
              {filtered.map(b=>(
                <tr key={b.id} style={{borderTop:"1px solid #e5e7eb"}}>
                  <td style={{padding:"8px 10px"}}>{b.name||"—"}</td>
                  <td style={{padding:"8px 10px"}}>{b.projekt_nr||"—"}</td>
                  <td style={{padding:"8px 10px"}}>{b.kunden_nr||"—"}</td>
                  <td style={{padding:"8px 10px"}}>{addr(b)||"—"}</td>
                  <td style={{padding:"8px 10px"}}>{b.start_datum||"—"}</td>
                  <td style={{padding:"8px 10px"}}>{rhythmText(b)}</td>
                  <td style={{padding:"8px 10px"}}>{(b.aktiv!==false && !b.archiviert_am) ? "Ja":"Nein"}</td>
                  <td style={{padding:"8px 10px"}}>
                    <button onClick={()=>onEdit(b.id)} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>Bearbeiten</button>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (
                <tr><td colSpan={8} style={{padding:20,textAlign:"center",color:"#6b7280"}}>Keine Einträge</td></tr>
              )}
              </tbody>
            </table>
          </div>

          {/* Bearbeiten-Leiste */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:12}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontWeight:600}}>Bearbeiten</div>
              {sel && (
                <div style={{display:"flex",gap:8}}>
                  {(sel.aktiv!==false && !sel.archiviert_am) ? (
                    <button onClick={()=>toggleArchiv(true)} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>Archivieren</button>
                  ) : (
                    <button onClick={()=>toggleArchiv(false)} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>Reaktivieren</button>
                  )}
                  <button onClick={save} disabled={!edit || invalidFestStart()} style={{padding:"6px 10px",border:"1px solid #10b981",color:"#065f46",borderRadius:8,background:"#ecfdf5"}}>Speichern</button>
                  <button onClick={hardDelete} disabled={!sel} style={{padding:"6px 10px",border:"1px solid #ef4444",color:"#991b1b",borderRadius:8,background:"#fee2e2"}}>Löschen</button>
                </div>
              )}
            </div>

            {!edit && <div style={{color:"#6b7280"}}>Wähle links eine Baustelle aus.</div>}
            {edit && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label> Name
                  <input value={edit.name||""} onChange={e=>setEdit({...edit!, name:e.target.value})} className="inp"/>
                </label>
                <label> Aktiv
                  <select value={(edit.aktiv!==false && !edit.archiviert_am) ? "1":"0"} onChange={e=>setEdit({...edit!, aktiv:e.target.value==="1", archiviert_am: e.target.value==="1"?null: (edit.archiviert_am||new Date().toISOString())})}>
                    <option value="1">Ja</option><option value="0">Nein</option>
                  </select>
                </label>

                <label> Projekt-Nr.
                  <input value={edit.projekt_nr||""} onChange={e=>setEdit({...edit!, projekt_nr:e.target.value})}/>
                </label>
                <label> Kunden-Nr.
                  <input value={edit.kunden_nr||""} onChange={e=>setEdit({...edit!, kunden_nr:e.target.value})}/>
                </label>

                <label> Straße
                  <input value={edit.strasse||""} onChange={e=>setEdit({...edit!, strasse:e.target.value})}/>
                </label>
                <label> Hausnummer
                  <input value={edit.hausnummer||""} onChange={e=>setEdit({...edit!, hausnummer:e.target.value})}/>
                </label>

                <label> PLZ
                  <input value={edit.plz||""} onChange={e=>setEdit({...edit!, plz:e.target.value})}/>
                </label>
                <label> Ort
                  <input value={edit.ort||""} onChange={e=>setEdit({...edit!, ort:e.target.value})}/>
                </label>

                <label> Start (YYYY-MM-DD)
                  <input value={edit.start_datum||""} onChange={e=>setEdit({...edit!, start_datum:e.target.value})}/>
                </label>

                <label> Rhythmus (Tage)
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                    <input type="number" min={0}
                           value={edit.rhythmus_tage==null ? 0 : Number(edit.rhythmus_tage)}
                           onChange={e=>setEdit({...edit!, rhythmus_tage: Math.max(0, parseInt(e.target.value||"0",10))})}
                           placeholder="0 = fester Termin"/>
                    <div style={{display:"flex",gap:6}}>
                      {[0,7,14,21,28,365].map(n=>(
                        <button key={n} onClick={()=>setEdit(e=> e?{...e, rhythmus_tage:n}:e)} style={{padding:"6px 8px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>{n}</button>
                      ))}
                    </div>
                  </div>
                </label>

                <label style={{gridColumn:"1 / -1"}}> Notizen
                  <textarea value={edit.notizen||""} onChange={e=>setEdit({...edit!, notizen:e.target.value})} rows={4} />
                </label>

                <div style={{gridColumn:"1 / -1"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:600}}>Leistungsverzeichnisse (PDF-Links)</div>
                    <button onClick={()=>{
                      if(!edit) return;
                      const url = prompt("Externe PDF-URL einfügen:");
                      if(!url) return;
                      const next = [...(edit.lv_urls||[]), url];
                      setEdit({ ...edit, lv_urls: next });
                    }} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>+ Link</button>
                  </div>
                  <ul style={{margin:0,paddingLeft:18}}>
                    {(edit.lv_urls||[]).map((u,i)=>(
                      <li key={i} style={{marginBottom:6}}>
                        <a href={u} target="_blank" rel="noreferrer">{u}</a>
                        <button onClick={()=>{
                          if(!edit) return;
                          const next = (edit.lv_urls||[]).slice(); next.splice(i,1);
                          setEdit({ ...edit, lv_urls: next });
                        }} style={{marginLeft:8,padding:"2px 8px",border:"1px solid #e5e7eb",borderRadius:8,background:"#fff"}}>Entfernen</button>
                      </li>
                    ))}
                    {(edit.lv_urls||[]).length===0 && <li style={{color:"#6b7280"}}>Keine Links hinterlegt.</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .inp, input, select, textarea{
          width:100%; padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; background:#fff;
        }
        label{ display:flex; flex-direction:column; gap:6px; font-size:14px; color:#374151; }
      `}</style>
    </div>
  );
}
