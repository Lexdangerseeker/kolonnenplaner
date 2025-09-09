import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
export function ensureDataDir(){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJson<T=any>(name: string, fallback: T): T {
  ensureDataDir();
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return fallback;
  const raw = fs.readFileSync(p, "utf8");
  try{ return JSON.parse(raw) as T; }catch{ return fallback; }
}

export function writeJson(name: string, obj: any){
  ensureDataDir();
  const p = path.join(DATA_DIR, name);
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, p);
}