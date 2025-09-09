import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

function normArray(x:any){
  if (x==null) return null;
  if (Array.isArray(x)) return x.map(String);
  if (typeof x==="string"){
    try{ const j=JSON.parse(x); if(Array.isArray(j)) return j.map(String); }catch{}
    return x.split(/\s*[,;]\s*/).filter(Boolean);
  }
  return [String(x)];
}

function parseIntOrNull(x:any){
  if (x===null || x===undefined || x==="") return null;
  const n = parseInt(String(x),10);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (req.method!=="POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const b = (req.body||{}) as any;
  const id = (b.id||"").toString().trim();
  if (!id) return res.status(400).json({ ok:false, error:"id required" });

  const patch:any = {};
  const fields = [
    "name","projekt_nr","kunden_nr",
    "strasse","hausnummer","plz","ort",
    "telefon","email",
    "start_datum", // YYYY-MM-DD
    "aktiv","notizen"
  ];
  for (const f of fields) if (f in b) patch[f] = b[f];

  // Rhythmus als Tage (Zahl) – 0/NULL = fester Termin
  if ("rhythmus_tage" in b) patch.rhythmus_tage = parseIntOrNull(b.rhythmus_tage);

  // Archivieren / Reaktivieren
  if ("archivieren" in b){
    if (b.archivieren===true){ patch.aktiv=false; patch.archiviert_am=new Date().toISOString(); }
    if (b.archivieren===false){ patch.aktiv=true; patch.archiviert_am=null; }
  }

  // LV-URLs
  if ("lv_urls" in b) patch.lv_urls = normArray(b.lv_urls);

  // Geschäftsregel: fester Termin (rhythmus_tage 0 oder null) => start_datum >= heute
  const startIso = (patch.start_datum ?? b.start_datum ?? "").toString().slice(0,10);
  const rtage    = ("rhythmus_tage" in patch) ? patch.rhythmus_tage : parseIntOrNull(b.rhythmus_tage);
  const isFest   = (rtage===null || rtage===0);

  if (isFest && startIso){
    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    if (startIso < today){
      return res.status(400).json({ ok:false, error:"Fester Termin darf nicht in der Vergangenheit liegen." });
    }
  }

  const sb = supabaseAdmin();
  const tryUpdate = async (p:any) => sb.from("baustelle").update(p).eq("id", id).select().single();

  let r = await tryUpdate(patch);

  // Falls Spalten (lv_urls/notizen/rhythmus_tage) in DB (noch) fehlen: soft fallback
  if (r.error && ((r as any).error.code==="42703" || /column .* does not exist/i.test((r as any).error?.message||""))){
    const p2 = { ...patch };
    delete p2.lv_urls;
    delete p2.notizen;
    delete p2.rhythmus_tage;
    r = await tryUpdate(p2);
  }

  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true, item: r.data });
}
