import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionFromReq } from "../../../../lib/auth/session-node";

const g: any = globalThis as any;
if (!g.__presence) g.__presence = new Map();

export default function handler(req: NextApiRequest, res: NextApiResponse){
  const sess = getSessionFromReq(req);
  if (!sess || sess.role!=="admin") return res.status(403).json({ ok:false, error:"forbidden" });
  const items = Array.from(g.__presence.values());
  return res.status(200).json({ ok:true, items });
}