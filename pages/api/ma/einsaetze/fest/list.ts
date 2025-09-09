import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromReq } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

type Item = { id:string; nummer?: number|null; name:string; farbe:"blau"|"blaugelb"|"pink"|"none"; label?:string; datum?:string; };

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  res.setHeader("Cache-Control", "no-store");
  const sess = readSessionFromReq(req);
  if (!sess) return res.status(401).json({ ok:false, error:"not logged in" });

  try{
    const today = new Date(); today.setHours(0,0,0,0);
    const sb = supabaseAdmin();

    const rE = await sb.from("einsatz")
      .select("id, baustelle_id, datum, time_von, time_bis")
      .gte("datum", today.toISOString().slice(0,10))
      .order("datum", { ascending: true });

    if (rE.error) return res.status(500).json({ ok:false, error:rE.error.message });
    const einsaetze = rE.data||[];

    // Baustellennamen nachladen (ohne ordnungsnummer)
    const ids = Array.from(new Set(einsaetze.map((e:any)=>e.baustelle_id).filter(Boolean)));
    const names = new Map<string,{name:string}>();
    if (ids.length){
      const rB = await sb.from("baustelle").select("id, name").in("id", ids);
      if (rB.error) return res.status(500).json({ ok:false, error:rB.error.message });
      for (const b of (rB.data||[])) names.set(b.id, { name: b.name||"—" });
    }

    function colorFor(dateStr:string): "blau"|"blaugelb"|"pink" {
      const d = new Date(dateStr+"T00:00:00"); d.setHours(0,0,0,0);
      const diff = Math.round((d.getTime()-today.getTime())/86400000);
      if (diff <= 0) return "pink";
      if (diff <= 2) return "blaugelb";
      return "blau";
    }

    const items: Item[] = einsaetze.map((e:any)=>{
      const meta = names.get(e.baustelle_id)||{name:"(Baustelle)"};
      const farbe = colorFor(e.datum);
      const label = `Termin ${e.datum}${e.time_von?` · ${e.time_von}-${e.time_bis||""}`:""}`;
      return { id: e.id, nummer: null, name: meta.name, farbe, label, datum: e.datum };
    }).sort((a,b)=> (a.datum||"") < (b.datum||"") ? -1 : (a.datum||"") > (b.datum||"") ? 1 : 0);

    return res.json({ ok:true, items });
  }catch(e:any){
    return res.status(500).json({ ok:false, error: e?.message||String(e) });
  }
}
