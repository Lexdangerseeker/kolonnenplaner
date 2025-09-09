import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const who = (req.query.lastname || (req.body as any)?.lastname || "").toString().trim();
  if (!who) return res.status(400).json({ ok:false, error:"lastname required" });
  const sb = supabaseAdmin();

  // Gibt es ihn schon?
  const sel = await sb.from("mitarbeiter").select("id,nachname").eq("nachname", who).limit(1);
  if (!sel.error && sel.data && sel.data.length){
    return res.json({ ok:true, mode:"exists", item: sel.data[0] });
  }

  // Sonst anlegen (nur die Spalte 'nachname'; wenn deine Tabelle mehr Pflichtfelder hat, ergänzen!)
  const ins = await sb.from("mitarbeiter").insert({ nachname: who }).select("id,nachname").single();
  if (ins.error) return res.status(500).json({ ok:false, error: ins.error.message });
  return res.json({ ok:true, mode:"inserted", item: ins.data });
}
