import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(req: NextApiRequest, res: NextApiResponse){
  res.setHeader("Content-Type","application/json");
  res.status(200).json({ ok:true, method:req.method, url:req.url });
}
