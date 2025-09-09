import type { NextApiRequest, NextApiResponse } from "next";
function mask(v?:string){ if(!v) return null; const s=String(v); return s.slice(0,12)+"…("+s.length+")"; }
export default function handler(req:NextApiRequest,res:NextApiResponse){
  res.status(200).json({
    ok:true,
    env:{
      SUPABASE_URL: mask(process.env.SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
      SUPABASE_SERVICE_ROLE: mask(process.env.SUPABASE_SERVICE_ROLE),
      MA_HMAC_SECRET: mask(process.env.MA_HMAC_SECRET),
    }
  });
}
