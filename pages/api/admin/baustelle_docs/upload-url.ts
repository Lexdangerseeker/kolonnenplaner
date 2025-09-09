import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  const bid = String(req.query.baustelle_id||"");
  const filename = String(req.query.filename||"").replace(/[^A-Za-z0-9._-]+/g,"_");
  if (!bid || !filename) return res.status(400).json({ ok:false, error:"missing params" });

  const bucket = process.env.NEXT_PUBLIC_DOCS_BUCKET || "baustelle-lv";
  const sb = supabaseAdmin();
  const path = `baustellen/${bid}/${Date.now()}_${filename}`;
  const r = await sb.storage.from(bucket).createSignedUploadUrl(path);
  if (r.error || !r.data) return res.status(500).json({ ok:false, error: r.error?.message || "failed" });

  return res.json({ ok:true, url: r.data.signedUrl, token: r.data.token, path });
}
