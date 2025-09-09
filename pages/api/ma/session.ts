import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Dev: immer ok -> kein Login nötig
  res.status(200).json({ ok: true, user: { name: "Mitarbeiter" }, role: "ma" });
}