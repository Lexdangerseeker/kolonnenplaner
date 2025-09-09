import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { baustelle_id, datum, time_von, time_bis, qty_m3, material_text } = req.body || {};
    if (!baustelle_id) return res.status(400).json({ ok: false, error: "baustelle_id fehlt" });
    if (!datum)        return res.status(400).json({ ok: false, error: "datum fehlt" });

    // TODO: echte Persistierung ergänzen
    console.log("[EXTRA]", { baustelle_id, datum, time_von, time_bis, qty_m3, material_text });

    return res.status(200).json({ ok: true, saved: { baustelle_id, datum } });
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
