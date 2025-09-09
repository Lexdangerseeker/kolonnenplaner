import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { readSessionFromReq } from "../../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  res.setHeader("Cache-Control","no-store");
  // optional: nur Admins zulassen
  // const sess = readSessionFromReq(req);
  // if (!sess || sess.role !== "admin") return res.status(401).json({ ok:false, error:"unauthorized" });

  try{
    const sb = supabaseAdmin();

    const mitarbeiter = await sb
      .from("mitarbeiter")
      .select("id,nachname,name")
      .order("nachname", { ascending: true });

    if (mitarbeiter.error) {
      return res.status(500).json({ ok:false, error: mitarbeiter.error.message, where:"mitarbeiter" });
    }

    const baustellen = await sb
      .from("baustelle")
      .select("id,name,plz,ort,projekt_nr,kunden_nr")
      .order("name", { ascending: true });

    if (baustellen.error) {
      return res.status(500).json({ ok:false, error: baustellen.error.message, where:"baustelle" });
    }

    return res.json({
      ok: true,
      mitarbeiter: mitarbeiter.data || [],
      baustellen: baustellen.data || [],
    });
  } catch (e:any){
    return res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
}
