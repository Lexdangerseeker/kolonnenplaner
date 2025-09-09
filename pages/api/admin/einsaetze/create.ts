import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const b = (req.body||{}) as { baustelle_id?: string; datum?: string; time_von?: string|null; time_bis?: string|null };
  if (!b.baustelle_id || !b.datum) return res.status(400).json({ ok:false, error:"baustelle_id & datum required" });

  const sb = supabaseAdmin();
  const ins:any = {
    baustelle_id: b.baustelle_id,
    datum: b.datum,           // YYYY-MM-DD
    time_von: b.time_von ?? null,
    time_bis: b.time_bis ?? null,
    status: "geplant"
  };
  const r = await sb.from("einsatz").insert(ins).select("id").single();
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true, id:r.data.id });
}
