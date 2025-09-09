import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromReq } from "../../../lib/auth";
export default function handler(req: NextApiRequest, res: NextApiResponse){
  const sess = readSessionFromReq(req);
  res.setHeader("Cache-Control","no-store");
  res.json({ ok: !!sess, sess });
}
