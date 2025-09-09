import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  if (req.method!=="POST") return res.status(405).json({ ok:false, error:"method not allowed" });
  const { baustelle_id, text } = (req.body||{}) as any;
  if (!baustelle_id || !text) return res.status(400).json({ ok:false, error:"missing fields" });
  const sb = supabaseAdmin();
  const r = await sb.from("baustelle_note").insert({ baustelle_id, text, pinned:false }).select("id").single();
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true, id:r.data.id });
}
