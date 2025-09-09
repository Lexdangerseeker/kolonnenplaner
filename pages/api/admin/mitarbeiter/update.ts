import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

function normArray(x:any){
  if (x == null) return null;
  if (Array.isArray(x)) return x;
  if (typeof x === "string"){
    // JSON-Array? -> parse, sonst CSV split
    try { const j = JSON.parse(x); if (Array.isArray(j)) return j; } catch{}
    return x.split(/[;,]\s*/).map(s=>s.trim()).filter(Boolean);
  }
  return [ String(x) ];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const b = (req.body||{}) as any;
  const id = (b.id||"").toString().trim();
  if (!id) return res.status(400).json({ ok:false, error:"id required" });

  const payload:any = {};
  const fields = [
    "steuernummer","iban","bic","bank_name","kontoinhaber",
    "fuehrerschein_gueltig_bis",
    "notfall_name","notfall_tel",
    "strasse","hausnummer","plz","ort",
    "geburtsdatum","telefon","email","name","nachname","notizen"
  ];
  for (const f of fields) if (f in b) payload[f] = b[f];

  if ("fuehrerschein_klassen" in b) payload.fuehrerschein_klassen = normArray(b.fuehrerschein_klassen);

  const sb = supabaseAdmin();
  const tryUpdate = async (p:any)=> sb.from("mitarbeiter").update(p).eq("id", id).select().single();

  let r = await tryUpdate(payload);

  if (r.error && ((r as any).error.code === "42703" || /column .* does not exist/i.test((r as any).error.message||""))){
    const p2 = { ...payload };
    // Fallback: seltene Felder entfernen, wenn Spalte fehlt
    delete p2.notizen;
    r = await tryUpdate(p2);
  }

  if (r.error) return res.status(500).json({ ok:false, error:r.error.message });
  return res.json({ ok:true, item: r.data });
}
