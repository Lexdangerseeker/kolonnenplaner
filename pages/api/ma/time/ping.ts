import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromReq, setSessionCookie } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  res.setHeader("Cache-Control","no-store");
  const auto  = String(process.env.MA_DEV_AUTOLOGIN||"0")==="1";
  const debug = String(req.query.debug||"0")==="1";

  let sess:any = readSessionFromReq(req);

  // Dev-Autologin: leere Session befüllen
  if (!sess && auto){
    const who = (req.query.lastname||"Aninvatu").toString();
    sess = { role:"ma", lastname: who, ts: Date.now() };
  }

  const out:any = { ok:true, role: sess?.role||null, autologin:auto };

  // MA-Session ohne uid? -> aus "mitarbeiter" nachziehen (nur echte Spalten!)
  if (sess?.role==="ma" && !sess.uid){
    const who = String(req.query.lastname||sess.lastname||"").trim();
    out.lastname = who;
    if (who) {
      try{
        const sb  = supabaseAdmin();

        // 1) Exakter Treffer über OR (nachname oder name)
        const orEq = `nachname.eq.${who},name.eq.${who}`;
        let r = await sb.from("mitarbeiter").select("id").or(orEq).limit(1);
        out.tried = [{ kind:"or-eq", count:r.data?.length||0, error:r.error?.message||null }];

        // 2) Fallback: ILIKE %who%
        if (!r.error && (!r.data || r.data.length===0)){
          const orIlike = `nachname.ilike.%${who}%,name.ilike.%${who}%`;
          r = await sb.from("mitarbeiter").select("id").or(orIlike).limit(1);
          out.tried.push({ kind:"or-ilike", count:r.data?.length||0, error:r.error?.message||null });
        }

        const row = (!r.error && r.data && r.data[0]) ? r.data[0] : null;
        if (row?.id){
          sess = { ...sess, uid: row.id, lastname: who, ts: Date.now() };
          setSessionCookie(res, sess);
          out.uid = row.id;
        }
      }catch(e:any){
        out.ok = false; out.error = e?.message||String(e);
      }
    }
  }

  // Session (neu/aktualisiert) zurückgeben
  if (sess) setSessionCookie(res, sess);
  return res.json(out);
}
