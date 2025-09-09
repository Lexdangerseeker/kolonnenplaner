import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const sb = supabaseAdmin();
  const ln = (req.query.lastname||"").toString().trim();
  if (!ln) return res.status(400).json({ ok:false, error:"lastname query required" });

  // versucht: nachname, lastname, name
  const cols = ["nachname","lastname","name"];
  for (const col of cols){
    const r = await sb.from("mitarbeiter").select("id,"+col).eq(col, ln).limit(5);
    if (!r.error && (r.data?.length||0)>0) {
      return res.json({ ok:true, by: col, items: r.data });
    }
  }
  return res.json({ ok:true, items: [] });
}
