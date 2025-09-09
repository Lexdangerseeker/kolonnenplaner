import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie } from "../../../lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse){
  clearSessionCookie(res);
  return res.json({ ok:true });
}
