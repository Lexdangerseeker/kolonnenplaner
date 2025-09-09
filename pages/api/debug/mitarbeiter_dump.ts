import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const like = (req.query.like || "").toString().trim();
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit||"20").toString(), 10) || 20));

  const sb = supabaseAdmin();
  const out: any = { ok:true, like, tried:[], items:[] };

  // 1) Exakte Suche über mögliche Spalten
  const cols = ["nachname","name","vorname","vollname","anzeige_name"];
  for (const c of cols){
    try{
      const sel = `id, ${c}`;
      const r = await (sb.from("mitarbeiter") as any).select(sel).limit(limit).eq(c, like);
      out.tried.push({ kind:"eq", col:c, error:r.error?.message||null, count:r.data?.length||0 });
      if (!r.error && Array.isArray(r.data)){
        out.items.push(...(r.data as any[]).map(d => ({ id: (d as any).id, col: c, value: (d as any)[c] })));
      }
    }catch(e:any){
      out.tried.push({ kind:"eq", col:c, error: e?.message||String(e), count:0 });
    }
  }

  // 2) Teiltreffer (ILIKE) nur wenn like != ""
  if (like){
    for (const c of cols){
      try{
        const sel = `id, ${c}`;
        const r = await (sb.from("mitarbeiter") as any).select(sel).limit(limit).ilike(c, `%${like}%`);
        out.tried.push({ kind:"ilike", col:c, error:r.error?.message||null, count:r.data?.length||0 });
        if (!r.error && Array.isArray(r.data)){
          out.items.push(...(r.data as any[]).map(d => ({ id: (d as any).id, col: c, value: (d as any)[c] })));
        }
      }catch(e:any){
        out.tried.push({ kind:"ilike", col:c, error: e?.message||String(e), count:0 });
      }
    }
  }

  // 3) Fallback-Liste (nur erste N Datensätze), hilfreich zum Durchscrollen
  try{
    const r = await (sb.from("mitarbeiter") as any).select("id,nachname,name").limit(limit);
    out.tried.push({ kind:"list", error:r.error?.message||null, count:r.data?.length||0 });
    if (!r.error && Array.isArray(r.data)){
      out.items.push(...(r.data as any[]).map(d => ({ id:(d as any).id, col:"nachname", value:(d as any).nachname })));
    }
  }catch(e:any){
    out.tried.push({ kind:"list", error:e?.message||String(e), count:0 });
  }

  return res.json(out);
}
