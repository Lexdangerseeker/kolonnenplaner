import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const env = {
    DB_PROVIDER: process.env.DB_PROVIDER || "SUPABASE?",
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    MA_HMAC_SECRET: !!process.env.MA_HMAC_SECRET,
    MA_COOKIE_SECURE: process.env.MA_COOKIE_SECURE,
  };
  const runtime = process.env.VERCEL ? "vercel" : "local";
  res.status(200).json({ ok: true, runtime, env });
}
