import type { NextApiRequest, NextApiResponse } from "next";

type OutItem = {
  baustelle_id: string;
  nummer: number|null;
  name: string|null;
  adresse: string|null;
  plz: string|null;
  ort: string|null;
  projekt_nr: string|null;
  kunden_nr: string|null;

  letzter_durchgang?: string|null;
  erster_durchgang?: string|null;
  rhythmus_tage: number|null;
  naechster_faellig_am: string|null;
  ueberfaellig_tage: number;
  durchgaenge_gesamt: number;
  sum_schnitt_m3_total: number;

  work: { rs:number; hs:number; ss:number; bp:number; grau:number; l:number; wk:number; m:number; };
  arbeitstage: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const { from = "", to = "" } = req.query as { from?: string; to?: string };

  const base = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const url  = new URL(base + "/api/admin/baustellen/list");
  url.searchParams.set("status", "alle");
  url.searchParams.set("q", "");

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    if (!r.ok) throw new Error(`Upstream /admin/baustellen/list ${r.status}`);
    const js = await r.json();

    const list: any[] = Array.isArray(js?.items) ? js.items : (Array.isArray(js) ? js : []);
    const items: OutItem[] = list.map((it: any, idx: number) => {
      const id  = String(it.id ?? it.baustelle_id ?? idx);
      const nr  = it.nummer ?? it.projekt_nr ?? null;
      const name = it.name ?? it.titel ?? null;
      const adr  = it.adresse ?? it.strasse ?? null;
      const plz  = it.plz ?? null;
      const ort  = it.ort ?? it.stadt ?? null;
      const knr  = it.kundennummer ?? it.kunden_nr ?? null;
      const rhythm = Number.isFinite(it.rhythmus_tage) ? Number(it.rhythmus_tage) : null;

      return {
        baustelle_id: id,
        nummer: (typeof nr === "number") ? nr : (nr!=null ? Number(nr) : null),
        name,
        adresse: adr,
        plz,
        ort,
        projekt_nr: it.projekt_nr ?? null,
        kunden_nr: knr,

        letzter_durchgang: null,
        erster_durchgang: null,
        rhythmus_tage: rhythm,
        naechster_faellig_am: null,           // echte Berechnung könnt ihr später ergänzen
        ueberfaellig_tage: 0,
        durchgaenge_gesamt: 0,
        sum_schnitt_m3_total: 0,

        work: { rs:0, hs:0, ss:0, bp:0, grau:0, l:0, wk:0, m:0 },
        arbeitstage: [],
      };
    });

    res.status(200).json({ ok: true, from, to, items });
  } catch (e: any) {
    res.status(200).json({ ok: true, from, to, items: [] }); // Fallback: leer, aber kein 500
  }
}
