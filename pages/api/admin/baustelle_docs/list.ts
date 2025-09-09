import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  const bid = String(req.query.baustelle_id||"");
  if (!bid) return res.status(400).json({ ok:false, error:"missing baustelle_id" });
  const bucket = process.env.NEXT_PUBLIC_DOCS_BUCKET || "baustelle-lv";
  const sb = supabaseAdmin();
  const prefix = `baustellen/${bid}/`;
  const r = await sb.storage.from(bucket).list(prefix, { limit: 100, offset: 0 });
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  const files = (r.data||[]).filter(f=>!f.name.endsWith("/")).map(f=>({ name:f.name, size:f.metadata?.size||null }));
  // sign urls
  const out:any[] = [];
  for (const f of files){
    const path = prefix + f.name;
    const s = await sb.storage.from(bucket).createSignedUrl(path, 60*30); // 30 min
    if (s.error || !s.data) continue;
    out.push({ name: f.name, size: f.size, url: s.data.signedUrl });
  }
  return res.json({ ok:true, items: out });
}
