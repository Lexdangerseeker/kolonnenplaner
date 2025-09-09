import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

const FIELDS = [
  "id","name","projekt_nr","kunden_nr",
  "strasse","hausnummer","plz","ort",
  "telefon","email",
  "start_datum","rhythmus_tage",
  "aktiv","archiviert_am",
  "notizen","lv_urls"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const id = (req.query.id||"").toString().trim();
  const projektnr = (req.query.projektnr||"").toString().trim();
  const kundenr   = (req.query.kundenr||"").toString().trim();
  if (!id && !projektnr && !kundenr)
    return res.status(400).json({ ok:false, error:"id, projektnr oder kundenr erforderlich" });

  const sb = supabaseAdmin();
  const sel = FIELDS.join(",");

  async function fetchOne(){
    if (id)        return sb.from("baustelle").select(sel).eq("id", id).limit(1).single();
    if (projektnr) return sb.from("baustelle").select(sel).eq("projekt_nr", projektnr).limit(1).single();
    return sb.from("baustelle").select(sel).eq("kunden_nr", kundenr).limit(1).single();
  }

  let r = await fetchOne();
  if (r.error && (r as any).error.code==="42703"){ // Spalte fehlt -> Minimal-Select
    const minimal = ["id","name","aktiv"].join(",");
    r = id
      ? await sb.from("baustelle").select(minimal).eq("id", id).limit(1).single()
      : projektnr
      ? await sb.from("baustelle").select(minimal).eq("projekt_nr", projektnr).limit(1).single()
      : await sb.from("baustelle").select(minimal).eq("kunden_nr", kundenr).limit(1).single();
  }
  if (r.error) return res.status(r.status===406?404:500).json({ ok:false, error:r.error.message });

  return res.json({ ok:true, item: r.data||{} });
}
