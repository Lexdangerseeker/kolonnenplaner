import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  const bid = String(req.query.baustelle_id||"");
  if (!bid) return res.status(400).json({ ok:false, error:"missing baustelle_id" });
  const sb = supabaseAdmin();
  const r = await sb.from("baustelle_note").select("id, text, pinned, created_at").eq("baustelle_id", bid).order("created_at",{ascending:false});
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true, items:r.data||[] });
}
