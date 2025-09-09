import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse){
  const superPin = (process.env.ADMIN_SUPER_PIN ?? "").toString();
  const cookieName = process.env.MA_PRESENCE_COOKIE || "ma_sess";
  const secure = String(process.env.MA_COOKIE_SECURE||"false");
  const adminDisabled = String(process.env.ADMIN_AUTH_DISABLED||"0");
  const autoLogin = String(process.env.MA_DEV_AUTOLOGIN||"0");
  res.json({
    ok:true,
    hasSuperPin: superPin.trim().length>0,
    superPinLen: superPin.trim().length,   // nur Laenge, nicht der Wert
    cookieName, secure, adminDisabled, autoLogin,
  });
}
