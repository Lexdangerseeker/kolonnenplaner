import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

function parseToISODate(s?: string|null){
  const t = (s||"").trim();
  if (!t) return null;
  const m1 = t.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})$/);
  if (m1){ const [,dd,mm,yy] = m1; return `${yy}-${mm}-${dd}`; }
  const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return t.slice(0,10);
  return null;
}
async function findByLastname(sb:any, who:string){
  let r = await sb.from("mitarbeiter").select("id,nachname,name,pin").eq("nachname", who).limit(1);
  if (!r.error && r.data && r.data[0]) return { row:r.data[0], by:"eq:nachname" };
  r = await sb.from("mitarbeiter").select("id,nachname,name,pin").ilike("nachname", `%${who}%`).limit(1);
  if (!r.error && r.data && r.data[0]) return { row:r.data[0], by:"ilike:nachname" };
  return { row:null, by:null };
}
export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"method not allowed" });

  const { from_lastname, to_lastname, copy_pin, dry, date_from, date_to } = (req.body||{}) as {
    from_lastname: string; to_lastname: string; copy_pin?: boolean; dry?: boolean;
    date_from?: string; date_to?: string;
  };
  if (!from_lastname || !to_lastname){
    return res.status(400).json({ ok:false, error:"from_lastname and to_lastname required" });
  }

  const sb = supabaseAdmin();
  const F = await findByLastname(sb, String(from_lastname));
  const T = await findByLastname(sb, String(to_lastname));
  if (!F.row?.id) return res.status(404).json({ ok:false, error:`Quelle '${from_lastname}' nicht gefunden` });
  if (!T.row?.id) return res.status(404).json({ ok:false, error:`Ziel '${to_lastname}' nicht gefunden` });

  const fromId = F.row.id as string;
  const toId   = T.row.id as string;
  const fromIso = parseToISODate(date_from||null);
  const toIso   = parseToISODate(date_to||null);

  let q = sb.from("arbeitszeit")
    .select("id, mitarbeiter_id, datum, time_von, time_bis, pause_min, art, note")
    .eq("mitarbeiter_id", fromId);
  if (fromIso) q = (q as any).gte("datum", fromIso);
  if (toIso)   q = (q as any).lte("datum", toIso);

  const rList = await (q as any);
  if (rList.error) return res.status(500).json({ ok:false, error:rList.error.message });

  const items:any[] = rList.data || [];
  if (dry) {
    return res.json({ ok:true, mode:"dry", from:{lastname:from_lastname, id:fromId}, to:{lastname:to_lastname, id:toId}, count:items.length });
  }

  let pinCopied = false;
  if (copy_pin){
    const pin = F.row.pin ?? null;
    if (pin!=null){
      const up = await sb.from("mitarbeiter").update({ pin }).eq("id", toId).select("id").single();
      if (!up.error) pinCopied = true;
    }
  }

  let moved = 0, conflicts = 0, failed = 0;
  for (const it of items){
    const up = await sb.from("arbeitszeit").update({ mitarbeiter_id: toId }).eq("id", it.id).select("id").single();
    if (up.error){
      const code = (up.error as any).code;
      if (code === "23505"){ conflicts++; continue; }
      failed++; continue;
    }
    moved++;
  }
  return res.json({
    ok:true,
    from:{ lastname:from_lastname, id:fromId, by:F.by },
    to:{ lastname:to_lastname, id:toId, by:T.by },
    total: items.length,
    moved, conflicts, failed,
    pinCopied
  });
}
