import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

const ALL_FIELDS = [
  "id","name","projekt_nr","kunden_nr",
  "strasse","hausnummer","plz","ort",
  "telefon","email",
  "start_datum","rhythmus_tage",
  "aktiv","archiviert_am",
  "notizen","lv_urls"
];

async function safeSelect(sb:any, sel:string){
  let r = await sb.from("baustelle").select(sel);
  if (r.error && (r as any).error.code==="42703"){ // Spalte fehlt -> reduziere
    const present = ALL_FIELDS.filter(f => !(r.error!.message||"").includes(f));
    r = await sb.from("baustelle").select(present.join(","));
  }
  return r;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const sb = supabaseAdmin();
  const q  = (req.query.q||"").toString().trim().toLowerCase();
  const status = (req.query.status||"alle").toString(); // 'aktiv' | 'archiv' | 'alle'

  let sel = ALL_FIELDS.join(",");
  let r = await safeSelect(sb, sel);
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });

  let items:any[] = r.data || [];
  if (status==="aktiv")    items = items.filter(x => x.aktiv!==false && !x.archiviert_am);
  if (status==="archiv")   items = items.filter(x => x.aktiv===false || !!x.archiviert_am);

  if (q){
    items = items.filter(x=>{
      const txt = ([
        x.name,x.projekt_nr,x.kunden_nr,x.strasse,x.hausnummer,x.plz,x.ort
      ].filter(Boolean).join(" ").toLowerCase());
      return txt.includes(q);
    });
  }

  items.sort((a,b)=> String(a.name||"").localeCompare(String(b.name||"")));
  return res.json({ ok:true, items });
}
