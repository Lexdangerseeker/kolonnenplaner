import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { readSessionFromReq } from "../../../../lib/auth";

const FIELDS = ["datum","time_von","time_bis","pause_min","hours","art","fahrer","note"];

function toMin(hm: string){ const [h,m]=hm.split(":").map(n=>parseInt(n||"0",10)); return (h*60)+(m||0); }
function calcHours(time_von: string, time_bis: string, pause_min: number){
  let diff = toMin(time_bis) - toMin(time_von);
  if (diff < 0) diff += 24*60;
  const min = Math.max(0, diff - (pause_min||0));
  return Math.round((min/60)*100)/100;
}
function parseToISODate(s: string){
  const t = (s||"").trim();
  if (!t) return null;
  const m1 = t.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})$/);
  if (m1){ const [,dd,mm,yyyy] = m1; return `${yyyy}-${mm}-${dd}`; }
  const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return t.slice(0,10);
  return null;
}
function formatDE(iso: string){ const [y,m,d] = iso.slice(0,10).split("-"); return `${d}-${m}-${y}`; }
function toCsvField(v: any){ if (v==null) return ""; const s=String(v); return /[",;\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }
function toCsvRow(arr: any[]){ return arr.map(toCsvField).join(";"); }

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  const sess = readSessionFromReq(req);
  if (!sess) return res.status(401).json({ ok:false, error:"not logged in" });

  const sb = supabaseAdmin();
  const fromIso = parseToISODate((req.query.from||"").toString());
  const toIso   = parseToISODate((req.query.to||"").toString());

  let q = sb.from("arbeitszeit").select("id, datum, time_von, time_bis, pause_min, art, fahrer, note");
  if (fromIso) q = (q as any).gte("datum", fromIso);
  if (toIso)   q = (q as any).lte("datum", toIso);
  q = (q as any).order("datum", { ascending: true }).order("time_von", { ascending: true });

  const r = await (q as any);
  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });

  const rows:any[] = (r.data||[]).map((row:any)=>({
    ...row,
    datum: row.datum ? formatDE(String(row.datum)) : row.datum,
    hours: calcHours(String(row.time_von||""), String(row.time_bis||""), parseInt(row.pause_min||0,10))
  }));

  const header = toCsvRow(FIELDS);
  const body   = rows.map(row => toCsvRow(FIELDS.map(f => (row as any)[f]))).join("\r\n");
  const csv    = "\uFEFF" + header + "\r\n" + body;

  const fn = `arbeitszeiten_${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader("Content-Type","text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fn}"`);
  return res.send(csv);
}
