import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

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
  const m1 = t.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})$/);      // dd-mm-yyyy | dd.mm.yyyy
  if (m1){ const [,dd,mm,yyyy] = m1; return `${yyyy}-${mm}-${dd}`; }
  const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);              // yyyy-mm-dd
  if (m2) return t.slice(0,10);
  return null;
}
function formatDE(iso: string){ const [y,m,d] = iso.slice(0,10).split("-"); return `${d}-${m}-${y}`; }

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const b = (req.body||{}) as any;

  const isoDatum = parseToISODate(String(b.datum||""));
  const time_von  = String(b.time_von||"");
  const time_bis  = String(b.time_bis||"");
  const pause_min = Math.max(0, parseInt(b.pause_min||"0", 10));
  const art       = (b.art||"").toString().trim();
  let   note      = (b.note||"").toString().trim();

  if (!isoDatum || !time_von || !time_bis){
    return res.status(400).json({ ok:false, error:"datum (dd-mm-yyyy), time_von, time_bis required" });
  }

  // --- Nur Nachname verwenden ---
  const who = (b.lastname || "").toString().trim();
  if (!who) return res.status(400).json({ ok:false, error:"lastname required" });

  const sb = supabaseAdmin();

  // Suche in "mitarbeiter": 1) nachname exakt -> 2) nachname ILIKE -> 3) name exakt -> 4) name ILIKE
  async function findBy(field: "nachname" | "name", val: string, fuzzy=false){
    const sel = sb.from("mitarbeiter").select("id,nachname,name").limit(1);
    return fuzzy ? sel.ilike(field, `%${val}%`) : sel.eq(field, val);
  }

  let row:any = null; let tried:any[] = [];
  for (const [field, fuzzy] of [["nachname",false],["nachname",true],["name",false],["name",true]] as const){
    const r = await findBy(field, who, fuzzy);
    tried.push({ field, mode: fuzzy?"ilike":"eq", count: r.data?.length||0, error: r.error?.message||null });
    if (!r.error && r.data && r.data.length){ row = r.data[0]; break; }
  }
  if (!row?.id){
    return res.status(404).json({ ok:false, error:`Mitarbeiter mit Nachname '${who}' nicht gefunden`, tried });
  }

  const payload:any = {
    mitarbeiter_id: row.id,
    datum: isoDatum,
    time_von,
    time_bis,
    pause_min,
    art: art || null,
    note: note || null
  };

  // fahrer: boolean in DB; String -> nur an note anhängen
  if (typeof b.fahrer === "boolean") {
    payload.fahrer = b.fahrer;
  } else if (typeof b.fahrer === "string" && b.fahrer.trim()) {
    note = [b.fahrer, note].filter(Boolean).join(" - ");
    payload.note = note;
  }

  const ins = await sb.from("arbeitszeit").insert(payload).select().single();
  if (ins.error){
    const code = (ins.error as any).code;
    if (code === "23505") return res.status(409).json({ ok:false, error:"Ein identischer Eintrag existiert bereits." });
    return res.status(500).json({ ok:false, error:ins.error.message });
  }

  const hours = calcHours(time_von, time_bis, pause_min);
  return res.json({ ok:true, item: { ...ins.data, datum: formatDE(isoDatum), hours } });
}
