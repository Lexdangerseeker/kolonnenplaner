import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import bcrypt from "bcryptjs";
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    const {id,pin} = (req.body||{}) as {id?:string;pin?:string};
    if(!id) return res.status(400).json({ok:false,error:"id fehlt"});
    const p=(pin||"").trim(); if(p.length<4||p.length>12) return res.status(400).json({ok:false,error:"PIN ungültig (4–12 Zeichen)"});
    const hash = await bcrypt.hash(p,12);
    const { error } = await supabaseAdmin.from("mitarbeiter").update({ pin_hash:hash, pin_updated_at:new Date(), pin:null }).eq("id",id);
    if(error) throw error; return res.status(200).json({ok:true});
  }catch(e:any){ return res.status(500).json({ok:false,error:e?.message||"Fehler"}) }
}
