import type { NextApiRequest, NextApiResponse } from "next";
import { setSessionCookie } from "../../../lib/auth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  res.setHeader("Cache-Control","no-store");

  const superPin = (process.env.ADMIN_SUPER_PIN ?? "").toString().trim();
  const pin = (typeof (req.body as any)?.pin === "string" ? (req.body as any).pin : "").trim();
  const adminDisabled = String(process.env.ADMIN_AUTH_DISABLED||"0")==="1";

  if (adminDisabled) {
    setSessionCookie(res, { role:"admin", lastname:"ADMIN", ts: Date.now() });
    return res.json({ ok:true, via:"ADMIN_AUTH_DISABLED" });
  }
  if (superPin && pin === superPin) {
    setSessionCookie(res, { role:"admin", lastname:"ADMIN", ts: Date.now() });
    return res.json({ ok:true });
  }
  return res.status(401).json({ ok:false, error:"Login fehlgeschlagen" });
}
