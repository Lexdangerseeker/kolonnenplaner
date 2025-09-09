import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  const id = String(req.query.id||"");
  if (!id) return res.status(400).json({ ok:false, error:"missing id" });
  const sb = supabaseAdmin();
  const current = await sb.from("baustelle_note").select("pinned").eq("id", id).single();
  if (current.error || !current.data) return res.status(404).json({ ok:false, error:"not found" });
  const r = await sb.from("baustelle_note").update({ pinned: !current.data.pinned }).eq("id", id);
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true });
}
