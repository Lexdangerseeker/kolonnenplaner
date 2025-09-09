import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

export type SessionUser = { uid: string; name: string; role: "admin"|"ma"; routes?: string[] };
const COOKIE = "kp_session";

function b64url(v: Buffer|string){ return Buffer.from(v).toString("base64url"); }
function b64urlDecode(s: string){ return Buffer.from(s, "base64url").toString(); }

function sign(data: string, secret: string){
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function makeSessionValue(user: SessionUser, maxAgeSec = 60*60*24*7){
  const now = Math.floor(Date.now()/1000);
  const payload = { ...user, iat: now, exp: now + maxAgeSec };
  const body = b64url(JSON.stringify(payload));
  const sig  = sign(body, process.env.SESSION_SECRET || "dev");
  return body + "." + sig;
}

export function parseSessionValue(val: string|null): SessionUser|null {
  if (!val) return null;
  const [body, sig] = val.split(".");
  if (!body || !sig) return null;
  const good = sign(body, process.env.SESSION_SECRET || "dev");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try{
    const obj = JSON.parse(b64urlDecode(body));
    if (obj.exp && obj.exp < Math.floor(Date.now()/1000)) return null;
    return { uid: String(obj.uid), name: String(obj.name||""), role: obj.role==="admin"?"admin":"ma", routes: obj.routes||[] };
  }catch{ return null; }
}

export function getSessionFromReq(req: any): SessionUser|null {
  try{
    const cookie = (req?.cookies?.get ? req.cookies.get(COOKIE)?.value : req?.cookies?.[COOKIE]) || null;
    return parseSessionValue(cookie||null);
  }catch{ return null; }
}

export function setSessionCookie(res: any, user: SessionUser){
  const val = makeSessionValue(user);
  const cookie = `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*7};`;
  res.headers?.append?.("Set-Cookie", cookie);
  if (res.setHeader) {
    const prev = res.getHeader("Set-Cookie");
    if (!prev) res.setHeader("Set-Cookie", cookie);
    else if (Array.isArray(prev)) res.setHeader("Set-Cookie", [...prev, cookie]);
    else res.setHeader("Set-Cookie", [prev as string, cookie]);
  }
}

export function clearSessionCookie(res: any){
  const cookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;`;
  res.headers?.append?.("Set-Cookie", cookie);
  if (res.setHeader) res.setHeader("Set-Cookie", cookie);
}