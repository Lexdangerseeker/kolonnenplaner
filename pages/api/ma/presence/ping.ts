import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionFromReq } from "../../../../lib/auth/session-node";

type Presence = { uid: string; name: string; role: "admin"|"ma"; last_seen: number };
const g: any = globalThis as any;
if (!g.__presence) g.__presence = new Map<string, Presence>();

export default function handler(req: NextApiRequest, res: NextApiResponse){
  const sess = getSessionFromReq(req);
  if (!sess) return res.status(401).json({ ok:false });
  const now = Date.now();
  g.__presence.set(sess.uid, { uid: sess.uid, name: sess.name, role: sess.role, last_seen: now });
  return res.status(200).json({ ok:true, now });
}