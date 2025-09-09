import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  const bid = String(req.query.baustelle_id||"");
  const name = String(req.query.name||"");
  if (!bid || !name) return res.status(400).json({ ok:false, error:"missing params" });

  const bucket = process.env.NEXT_PUBLIC_DOCS_BUCKET || "baustelle-lv";
  const sb = supabaseAdmin();
  const path = `baustellen/${bid}/${name}`;
  const r = await sb.storage.from(bucket).remove([path]);
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true });
}
