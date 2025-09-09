import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromReq } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

type Farbe = "gruen"|"gelb"|"rot"|"none";
type Item = { id:string; name:string; nummer?:number|null; farbe:Farbe; label?:string; naechster?:string; sortKey:number; };

function addDays(d:Date, n:number){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function ymd(d:Date){ return d.toISOString().slice(0,10); }

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  res.setHeader("Cache-Control","no-store");
  const sess = readSessionFromReq(req);
  if (!sess) return res.status(401).json({ ok:false, error:"not logged in" });

  try{
    const sb = supabaseAdmin();
    const rB = await sb.from("baustelle")
      .select("id, name, rhythmus_tage, start_date, aktiv")
      .order("name", { ascending: true });
    if (rB.error) return res.status(500).json({ ok:false, error:rB.error.message });

    const today = new Date(); today.setHours(0,0,0,0);

    const items: Item[] = (rB.data||[]).map((b:any)=>{
      const r = Number(b.rhythmus_tage||0);
      const sd = typeof b.start_date==="string" && b.start_date ? b.start_date : null;

      if (!r || r<=0 || !sd){
        // Kein Rhythmus oder ohne Startdatum: trotzdem anzeigen (Farbe neutral), weit hinten sortieren
        return { id:b.id, name:b.name||"—", nummer:null, farbe:"none", label: (!r||r<=0)?"Kein Rhythmus":"Ohne Startdatum", sortKey: Number.MAX_SAFE_INTEGER };
      }

      let d = new Date(sd+"T00:00:00"); d.setHours(0,0,0,0);
      while (d.getTime() < today.getTime()) d = addDays(d, r);
      const next = d;
      const diff = Math.round((next.getTime()-today.getTime())/86400000);

      const farbe: Farbe = diff < 0 ? "rot" : (diff <= 2 ? "gelb" : "gruen");
      const label = `Rhythmus ${r} Tage · Nächster: ${ymd(next)}`;
      return { id:b.id, name:b.name||"—", nummer:null, farbe, label, naechster: ymd(next), sortKey: next.getTime() };
    });

    items.sort((a,b)=> a.sortKey - b.sortKey);
    return res.json({ ok:true, items });
  }catch(e:any){
    return res.status(500).json({ ok:false, error: e?.message||String(e) });
  }
}
