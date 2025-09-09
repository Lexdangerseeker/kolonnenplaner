import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

function toDate(iso:string){ return new Date(iso.slice(0,10)+"T00:00:00Z"); }
function toIso(d:Date){ return d.toISOString().slice(0,10); }
const DAY = 24*60*60*1000;

function nextOccurrence(start_iso: string | null, rhythmus: number | null){
  const todayIso = toIso(new Date());
  if (!start_iso) return { next_date: null, is_fixed: rhythmus === 0, today: todayIso };
  if (rhythmus == null) return { next_date: start_iso, is_fixed: false, today: todayIso };
  if (rhythmus === 0){
    const start = toDate(start_iso);
    const today = toDate(todayIso);
    if (start < today) return { next_date: todayIso, is_fixed: true, today: todayIso };
    return { next_date: start_iso, is_fixed: true, today: todayIso };
  }
  const start = toDate(start_iso);
  let next = start;
  const today = toDate(todayIso);
  while (next < today) next = new Date(next.getTime() + rhythmus*DAY);
  return { next_date: toIso(next), is_fixed: false, today: todayIso };
}

type BaustelleMinimal = {
  start_datum: string | null;
  rhythmus_tage: number | null;
  [key: string]: any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const id = (req.query.id||"").toString().trim();
  if (!id) return res.status(400).json({ ok:false, error:"id required" });

  const sb = supabaseAdmin();
  const sel = "id,name,start_datum,rhythmus_tage,aktiv,archiviert_am";
  const r = await sb.from("baustelle").select(sel).eq("id", id).limit(1).single();
  if (r.error) return res.status(r.status===406?404:500).json({ ok:false, error:r.error.message });

  const b = (r.data ?? {}) as BaustelleMinimal;
  const calc = nextOccurrence(b.start_datum ?? null, b.rhythmus_tage ?? null);
  return res.json({ ok:true, item:{ ...b, ...calc } });
}
