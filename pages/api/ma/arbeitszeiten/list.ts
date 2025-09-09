import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromReq } from "../../../../lib/auth";

// Dummy in-memory storage (reset on server restart)
type Item = { id:string; user:string; date:string; hours:number; note?:string };
let dummy: Item[] = [
  { id:"1", user:"Aninwatu", date:"2025-09-07", hours:8, note:"Erster Testeintrag" }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sess = readSessionFromReq(req);
  if (!sess) return res.status(401).json({ ok:false, error:"no session" });

  if (req.method === "POST") {
    const { date, hours, note } = (req.body||{}) as { date?:string; hours?:number; note?:string };
    if (!date || typeof hours !== "number") {
      return res.status(400).json({ ok:false, error:"missing fields" });
    }
    const id = String(Date.now());
    const user = sess.lastname || (sess.role==="admin" ? "Admin" : "unknown");
    dummy.push({ id, user, date, hours, note });
    return res.json({ ok:true, id });
  }

  // GET list
  const items = (sess.role === "admin")
    ? dummy.slice().sort((a,b)=> (a.date<b.date?1:-1))
    : dummy.filter(d => d.user === (sess.lastname || "")).sort((a,b)=> (a.date<b.date?1:-1));

  return res.json({ ok:true, items });
}
