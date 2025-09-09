import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const url = (process.env.SUPABASE_URL||"").toString();
  const svc = (process.env.SUPABASE_SERVICE_ROLE||"").toString();
  const env = {
    hasUrl: url.trim().length>0,
    hasService: svc.trim().length>0,
    urlHost: (()=>{ try{ return new URL(url).host; }catch{ return null; } })(),
    serviceLen: svc.trim().length
  };

  const out:any = { ok:true, env, tests: {} };
  try {
    const sb = supabaseAdmin();

    const t1 = await sb.from("baustelle").select("id, ordnungsnummer, name").limit(1);
    out.tests.baustelle = { ok: !t1.error, error: t1.error?.message||null, rows: t1.data?.length||0 };

    const t2 = await sb.from("einsatz").select("id, baustelle_id, datum").limit(1);
    out.tests.einsatz = { ok: !t2.error, error: t2.error?.message||null, rows: t2.data?.length||0 };
  } catch(e:any) {
    out.ok = false;
    out.error = e?.message||String(e);
  }
  res.json(out);
}
