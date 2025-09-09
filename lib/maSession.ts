import crypto from "crypto";
const SECRET = process.env.MA_HMAC_SECRET || "dev-secret";
export type MaPayload = { id: string; n: string; ts: number };
function signRaw(s: string) { return crypto.createHmac("sha256", SECRET).update(s).digest("hex"); }
export function makeToken(payload: MaPayload) {
  const raw = JSON.stringify(payload); const sig = signRaw(raw);
  return Buffer.from(`${raw}.${sig}`).toString("base64");
}
export function verifyTokenCookie(b64: string){ try{
  const dec = Buffer.from(b64,"base64").toString("utf8"); const i=dec.lastIndexOf(".");
  if(i<0) return null; const raw=dec.slice(0,i), sig=dec.slice(i+1);
  if(signRaw(raw)!==sig) return null; return JSON.parse(raw);
}catch{return null} }
export function makeCookie(name:string,value:string,maxAgeSec:number){
  const secure=process.env.MA_COOKIE_SECURE==="1";
  return [`${name}=${encodeURIComponent(value)}`,"Path=/","HttpOnly","SameSite=Lax",`Max-Age=${maxAgeSec}`,secure?"Secure":null].filter(Boolean).join("; ");
}
