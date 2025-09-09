import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

function parseToISODate(s: string){
  const t = (s||"").trim();
  if (!t) return null;
  const m1 = t.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})$/); // dd-mm-yyyy / dd.mm.yyyy
  if (m1){ const [,dd,mm,yyyy] = m1; return `${yyyy}-${mm}-${dd}`; }
  const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);        // yyyy-mm-dd
  if (m2) return t.slice(0,10);
  return null;
}

function popUnknownColumnsFromError(err:any, payload:any): string[] {
  const msg = String(err?.message || "");
  const removed: string[] = [];
  const regs = [
    /Could not find the '([^']+)' column/i,
    /column ["']?([\w_]+)["']? does not exist/i
  ];
  for (const rx of regs){
    let m: RegExpExecArray | null;
    const rxg = new RegExp(rx, rx.flags.includes("g") ? rx.flags : rx.flags + "g");
    while ((m = rxg.exec(msg)) !== null) {
      const col = m[1];
      if (col && Object.prototype.hasOwnProperty.call(payload, col)) {
        delete payload[col];
        removed.push(col);
      }
    }
  }
  return removed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const b = (req.body||{}) as any;
  const id = (b.id||"").toString().trim();

  const fields = [
    "name","kunde",
    "strasse","hausnummer","plz","ort",
    "kontakt_name","kontakt_tel","kontakt_email",
    "auftragsnummer","ordnungsnummer",
    "status","notizen","farbe"
  ];

  const payload:any = {};
  for (const f of fields) if (f in b) payload[f] = b[f];

  if ("start_datum" in b){ const d = parseToISODate(String(b.start_datum)); if (d) payload.start_datum = d; }
  if ("ende_datum"  in b){ const d = parseToISODate(String(b.ende_datum));  if (d) payload.ende_datum  = d; }

  if (!payload.name || String(payload.name).trim()===""){
    return res.status(400).json({ ok:false, error:"name required" });
  }

  const sb = supabaseAdmin();
  const doUpsert = async (p:any) => {
    if (id) return sb.from("baustelle").update(p).eq("id", id).select().single();
    return sb.from("baustelle").insert(p).select().single();
  };

  let r = await doUpsert(payload);
  let attempts = 0;
  while (r.error && attempts < 3){
    const code = (r as any).error?.code;
    const removed = popUnknownColumnsFromError((r as any).error, payload);
    if (code !== "42703" && removed.length === 0) break;
    r = await doUpsert(payload);
    attempts++;
  }

  if (r.error){
    const code = (r as any).error?.code;
    if (code === "23505") return res.status(409).json({ ok:false, error:"duplicate constraint" });
    return res.status(500).json({ ok:false, error:r.error.message });
  }

  return res.json({ ok:true, item: r.data });
}
