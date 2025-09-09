"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import { supabase } from "../../../lib/supabaseBrowser";

type Note = { id:string; text:string; pinned:boolean; created_at:string };
type DocItem = { name:string; url:string; size:number|null };

const B = "border rounded px-3 py-1 text-sm";

function Page(){
  const sb = useMemo(()=>supabase(),[]);
  const [bid, setBid] = useState<string>("");
  const [bname, setBname] = useState<string>("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(()=>{
    const m = window.location.pathname.match(/\/admin\/baustelle\/([^\/]+)$/);
    if (m) setBid(m[1]);
  },[]);

  useEffect(()=>{ if(!bid) return; (async()=>{
    const r0 = await sb.from("baustelle").select("name").eq("id", bid).single();
    if (!r0.error && r0.data) setBname(r0.data.name||"");
    await loadNotes();
    await loadDocs();
  })(); }, [bid]);

  async function loadNotes(){
    const r = await fetch("/api/admin/baustelle_note/list?baustelle_id="+bid);
    const j = await r.json();
    if (j?.ok) setNotes(j.items||[]);
  }
  async function addNote(e:React.FormEvent){
    e.preventDefault(); if (!text.trim()) return;
    setBusy(true); setMsg(null);
    try{
      const r = await fetch("/api/admin/baustelle_note/create", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ baustelle_id: bid, text }) });
      const j = await r.json();
      if(!j?.ok) throw new Error(j?.error||"create failed");
      setText(""); await loadNotes(); setMsg("Note gespeichert.");
    }catch(e:any){ setMsg(e.message||String(e)); } finally{ setBusy(false); }
  }
  async function delNote(id:string){
    if(!confirm("Note loeschen?")) return;
    const r = await fetch("/api/admin/baustelle_note/delete?id="+encodeURIComponent(id), { method:"POST" });
    const j = await r.json(); if (j?.ok) loadNotes();
  }
  async function togglePin(id:string){
    const r = await fetch("/api/admin/baustelle_note/pin?id="+encodeURIComponent(id), { method:"POST" });
    const j = await r.json(); if (j?.ok) loadNotes();
  }

  async function loadDocs(){
    const r = await fetch("/api/admin/baustelle_docs/list?baustelle_id="+bid);
    const j = await r.json();
    if (j?.ok) setDocs(j.items||[]);
  }
  async function uploadFile(e:React.ChangeEvent<HTMLInputElement>){
    if(!e.target.files || e.target.files.length===0) return;
    const file = e.target.files[0];
    setUploadBusy(true); setMsg(null);
    try{
      const ru = await fetch("/api/admin/baustelle_docs/upload-url?baustelle_id="+bid+"&filename="+encodeURIComponent(file.name));
      const ju = await ru.json();
      if (!ru.ok || !ju?.ok) throw new Error(ju?.error || "upload url failed");
      const { url, token } = ju;

      const put = await fetch(url, { method:"PUT", headers:{ "x-upsert":"true", "Authorization":"Bearer "+token, "Content-Type": file.type||"application/octet-stream" }, body: file });
      if(!put.ok) throw new Error("upload failed: "+put.status);
      setMsg("Datei hochgeladen.");
      await loadDocs();
    }catch(err:any){ setMsg(err.message||String(err)); } finally{ setUploadBusy(false); e.target.value=""; }
  }
  async function delDoc(name:string){
    if(!confirm("Datei entfernen?")) return;
    const r = await fetch("/api/admin/baustelle_docs/delete?baustelle_id="+bid+"&name="+encodeURIComponent(name), { method:"POST" });
    const j = await r.json(); if (j?.ok) loadDocs();
  }

  return (
    <Layout title={"Baustelle Details - "+(bname||"")}>
      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm mb-3">{msg}</div>}

      <section className="rounded border p-4 mb-6">
        <h2 className="font-semibold mb-2">Notes</h2>
        <form onSubmit={addNote} className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" value={text} onChange={e=>setText(e.target.value)} placeholder="Notiz eingeben..." />
          <button className={B} disabled={busy} type="submit">{busy?"Speichere...":"Hinzufuegen"}</button>
        </form>
        <ul className="divide-y mt-3">
          {notes.map(n=>(
            <li key={n.id} className="py-2 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm">{n.text}</div>
                <div className="text-xs opacity-70">{n.created_at?.slice(0,19).replace("T"," ")}</div>
              </div>
              <div className="flex gap-2">
                <button className={B} onClick={()=>togglePin(n.id)}>{n.pinned? "Unpin":"Pin"}</button>
                <button className="px-3 py-1 rounded bg-red-600 text-white text-sm" onClick={()=>delNote(n.id)}>Loeschen</button>
              </div>
            </li>
          ))}
          {notes.length===0 && <li className="py-2 text-sm opacity-70">Keine Notizen.</li>}
        </ul>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold mb-2">Dokumente</h2>
        <div className="flex items-center gap-2">
          <input type="file" onChange={uploadFile} disabled={uploadBusy} />
          <button className={B} onClick={loadDocs}>Aktualisieren</button>
        </div>
        <ul className="divide-y mt-3">
          {docs.map(d=>(
            <li key={d.name} className="py-2 flex items-center justify-between gap-2">
              <a className="underline text-sm" href={d.url} target="_blank" rel="noreferrer">{d.name}</a>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-70">{d.size!=null? (d.size+" B") : ""}</span>
                <button className="px-3 py-1 rounded bg-red-600 text-white text-sm" onClick={()=>delDoc(d.name)}>Entfernen</button>
              </div>
            </li>
          ))}
          {docs.length===0 && <li className="py-2 text-sm opacity-70">Keine Dateien.</li>}
        </ul>
      </section>
    </Layout>
  );
}

export default dynamic(() => Promise.resolve(Page), { ssr: false });