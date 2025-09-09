import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

/**
 * DEV ONLY: Loescht alle relevanten Datensaetze.
 * Reihenfolge: einsatz -> baustelle -> baustelle_note (falls vorhanden)
 * Erweitere die Liste bei Bedarf (z. B. leistungen, arbeitszeit, etc.).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (!requireAdmin(req)) return res.status(401).json({ ok:false, error:"admin required" });
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const sb = supabaseAdmin();

  const steps: Array<{table:string, where?: [string, any]}> = [
    { table: "einsatz" },
    { table: "baustelle_note" }, // falls vorhanden
    { table: "baustelle" },
  ];

  const results:any[] = [];
  for (const s of steps){
    try{
      let q = sb.from(s.table).delete();
      if (s.where) q = q.eq(s.where[0], s.where[1]);
      const r = await q;
      if (r.error) results.push({ table:s.table, error:r.error.message });
      else results.push({ table:s.table, ok:true, count:(r.count ?? null) });
    }catch(e:any){
      results.push({ table:s.table, error:e?.message || String(e) });
    }
  }

  res.json({ ok:true, results });
}
