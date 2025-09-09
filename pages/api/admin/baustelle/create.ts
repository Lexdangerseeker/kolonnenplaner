import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const body = (req.body||{}) as any;
  const sb = supabaseAdmin();

  const ins = {
    name: body.name || "",
    adresse: body.adresse ?? null,
    plz: body.plz ?? null,
    ort: body.ort ?? null,
    projekt_nr: body.projekt_nr ?? null,
    kunden_nr: body.kunden_nr ?? null,
    rhythmus_tage: body.rhythmus_tage ?? null,  // 0 = nur fest
    start_date: body.start_date ?? null,        // YYYY-MM-DD
    telefon: body.telefon ?? null,
    email: body.email ?? null,
    aktiv: true
  };

  const r = await sb.from("baustelle").insert(ins).select("id").single();
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true, id:r.data.id });
}
