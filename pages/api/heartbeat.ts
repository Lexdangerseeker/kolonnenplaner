import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromReq, touchPresence } from "../../lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse){
  res.setHeader("Cache-Control", "no-store");
  const sess = readSessionFromReq(req);
  if (sess) touchPresence(res, sess);
  return res.json({ ok:true, loggedIn: !!sess, role: sess?.role||null });
}
