import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const { data, error } = await supabaseAdmin
      .from("baustelle")
      .select("id,name,plz,ort,projekt_nr,kunden_nr,rhythmus_tage,starttermin,archiviert,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, items: data || [] });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Fehler" });
  }
}
