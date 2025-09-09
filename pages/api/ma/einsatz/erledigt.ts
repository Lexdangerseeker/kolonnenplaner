import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const {
      baustelle_id, datum, time_von, time_bis, pause_min,
      schnittgut_m3, work_rs, work_hs, work_ss, work_bp, work_grau, work_l, work_wk, work_muell,
      rhythmus_tage, next_manual, crew_size
    } = req.body || {};

    if (!baustelle_id) return res.status(400).json({ ok: false, error: "baustelle_id fehlt" });
    if (!datum)        return res.status(400).json({ ok: false, error: "datum fehlt" });

    // TODO: Hier eure echte Persistierung integrieren (DB, Service, etc.)
    console.log("[ERLEDIGT]", { baustelle_id, datum, time_von, time_bis, pause_min, schnittgut_m3,
      work_rs, work_hs, work_ss, work_bp, work_grau, work_l, work_wk, work_muell, rhythmus_tage, next_manual, crew_size });

    return res.status(200).json({ ok: true, saved: { baustelle_id, datum } });
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
