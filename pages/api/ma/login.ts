import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";
import { makeCookie, makeToken } from "@/lib/maSession";
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    const { nachname, pin } = (req.body||{}) as { nachname?: string; pin?: string };
    if(!nachname||!pin) return res.status(400).json({ok:false,error:"nachname und pin erforderlich"});
    const { data: rows, error } = await supabaseAdmin
      .from("mitarbeiter")
      .select("id,nachname,pin_hash,aktiv,deleted_at")
      .ilike("nachname",nachname.trim())
      .limit(1);
    if(error) throw error;
    const row = rows?.[0];
    if(!row||row.deleted_at||row.aktiv===false||!row.pin_hash) return res.status(401).json({ok:false,error:"Login fehlgeschlagen"});
    const ok = await bcrypt.compare(pin.trim(), row.pin_hash);
    if(!ok) return res.status(401).json({ok:false,error:"Login fehlgeschlagen"});
    const token = makeToken({ id: row.id, n: row.nachname, ts: Date.now() });
    res.setHeader("Set-Cookie", makeCookie("ma_sess", token, 60*60*12));
    return res.status(200).json({ok:true});
  }catch(e:any){
    return res.status(500).json({ok:false,error:e?.message||"Fehler"});
  }
}
