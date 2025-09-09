import type { NextApiRequest, NextApiResponse } from "next";

type Raw = Record<string, any>;

type Item = {
  id: string;
  name: string;
  adresse?: string;
  nummer?: number | null;
  kundennummer?: string | null;
  rhythmus_tage?: number | null;  // 0 = fester Termin
  start_datum?: string | null;
  next_date?: string | null;      // dd-MM-yyyy
  days_until?: number | null;
  statusColor: "red"|"yellow"|"green"|"pink"|"blue"|"yblue"|"gray";
  isFixed?: boolean;
  archiviert_am?: string | null;
};

function pad(n:number){ return String(n).padStart(2,"0"); }
function toYMD(y:number,m:number,d:number){ return `${y}-${pad(m)}-${pad(d)}`; }
function formatDE(y:number,m:number,d:number){ return `${pad(d)}-${pad(m)}-${y}`; }

function parseFlexible(v:any): {y:number,m:number,d:number}|null{
  if(!v) return null;
  const s=String(v).trim();
  let m=s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/); // yyyy-MM-dd
  if(m) return {y:+m[1],m:+m[2],d:+m[3]};
  m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);           // dd.MM.yyyy
  if(m) return {y:+m[3],m:+m[2],d:+m[1]};
  m=s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);             // dd-MM-yyyy
  if(m) return {y:+m[3],m:+m[2],d:+m[1]};
  return null;
}
function toUTCDate(y:number,m:number,d:number){ return new Date(Date.UTC(y,m-1,d,0,0,0,0)); }
function daysDiffUTC(a:Date,b:Date){
  return Math.round(
    (+toUTCDate(a.getUTCFullYear(),a.getUTCMonth()+1,a.getUTCDate()) - +toUTCDate(b.getUTCFullYear(),b.getUTCMonth()+1,b.getUTCDate()))
    / 86400000
  );
}
function addDaysUTC(y:number,m:number,d:number,plus:number){
  const t=toUTCDate(y,m,d); t.setUTCDate(t.getUTCDate()+plus);
  return {y:t.getUTCFullYear(),m:t.getUTCMonth()+1,d:t.getUTCDate()};
}

function firstDateFrom(src:Raw, keys:string[]): {y:number,m:number,d:number}|null{
  for(const k of keys){
    const p = parseFlexible(src?.[k]);
    if(p) return p;
  }
  return null;
}

function rollForwardToNext(start:{y:number,m:number,d:number}, stepDays:number, today:{y:number,m:number,d:number}){
  const startDt = toUTCDate(start.y,start.m,start.d);
  const todayDt = toUTCDate(today.y,today.m,today.d);
  const delta = -daysDiffUTC(todayDt, startDt); // Tage seit Start
  if (delta <= 0) return start; // Start liegt heute/ Zukunft
  const steps = Math.ceil(delta / stepDays);
  return addDaysUTC(start.y,start.m,start.d, steps*stepDays);
}

function colorFor(rhythm:number|null|undefined, days:number|null|undefined): Item["statusColor"]{
  if(days==null) return "gray";
  if(days===0) return "pink";        // akut heute
  if(rhythm===0){                    // fester Termin
    if(days<0)  return "red";        // überfällig
    if(days<=3) return "blue";       // 1–3 Tage
    if(days===4) return "yblue";     // exakt 4 Tage: gelbblau
    if(days<=7) return "yellow";     // 5–7 Tage
    return "green";                  // >7
  }else{                             // Rhythmus
    if(days<0)  return "red";
    if(days<=4) return "yellow";     // bald
    return "green";
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try{
    const proto = (req.headers["x-forwarded-proto"] as string) ?? "http";
    const host  = req.headers.host!;
    const base  = `${proto}://${host}`;

    const r = await fetch(`${base}/api/admin/baustellen/list?status=alle&q=`, { cache:"no-store" });
    if(!r.ok) throw new Error(`Upstream baustellen/list ${r.status}`);
    const j = await r.json();
    const list: Raw[] = j?.items ?? j?.data ?? j ?? [];

    const now=new Date();
    const today={ y:now.getUTCFullYear(), m:now.getUTCMonth()+1, d:now.getUTCDate() };

    // Feldsynonyme
    const KEY_LAST_LIKE  = ["letzter_durchgang","letzterTermin","letzter_termin","erster_durchgang","start_datum","ersterTermin","startTermin"];
    const KEY_NEXT_LIKE  = ["naechster_durchgang","naechsterTermin","naechster","next_date","naechste_faelligkeit"];
    const KEY_FIXED_LIKE = ["fester_termin","festerTermin","festtermin","fest_termin"];

    const items: Item[] = list.map((src)=>{
      const rhythm: number|null = (typeof src?.rhythmus_tage==="number" ? src.rhythmus_tage : src?.rhythmus_tage==null ? null : Number(src.rhythmus_tage));
      const isFixed = rhythm===0;

      const fixedDate = firstDateFrom(src, KEY_FIXED_LIKE);
      const lastLike  = firstDateFrom(src, KEY_LAST_LIKE);
      const nextLike  = firstDateFrom(src, KEY_NEXT_LIKE);

      let nxt: {y:number,m:number,d:number} | null = null;

      if(isFixed){
        nxt = fixedDate ?? lastLike ?? nextLike ?? null;
      }else if(typeof rhythm==="number" && rhythm>0){
        if(lastLike) nxt = rollForwardToNext(lastLike, rhythm, today);
        else nxt = nextLike ?? null;
      }else{
        nxt = nextLike ?? lastLike ?? null;
      }

      let days: number | null = null;
      let nextStr: string | null = null;
      if(nxt){
        const dDelta = daysDiffUTC(toUTCDate(nxt.y,nxt.m,nxt.d), toUTCDate(today.y,today.m,today.d));
        days = dDelta;
        nextStr = formatDE(nxt.y,nxt.m,nxt.d);
      }

      let color: Item["statusColor"] = "gray";
      if(src?.archiviert_am){
        color = "gray"; days = null; nextStr = null;
      }else{
        color = colorFor(rhythm ?? null, days);
      }

      return {
        id: String(src.id ?? src._id ?? crypto.randomUUID()),
        name: String(src.name ?? src.titel ?? "—"),
        adresse: src.adresse ?? src.anschrift ?? undefined,
        nummer: (src.nummer ?? src.projektnummer) ?? null,
        kundennummer: (src.kundennummer ?? src.kdnr) ?? null,
        rhythmus_tage: rhythm ?? null,
        start_datum: lastLike ? toYMD(lastLike.y,lastLike.m,lastLike.d) : null,
        next_date: nextStr,
        days_until: days,
        statusColor: color,
        isFixed,
        archiviert_am: src.archiviert_am ?? null,
      };
    });

    // Sortierung: Feste Termine zuerst; innerhalb nach Dringlichkeit
    const urgencyRank = (d:number|null|undefined, fixed:boolean)=>{
      if(d==null) return 99;
      if(d<0) return 0;
      if(d===0) return 1;
      if(fixed){
        if(d<=3) return 2;  // blau
        if(d===4) return 3; // yblue
        if(d<=7) return 4;  // gelb
        return 5;
      }else{
        if(d<=4) return 2;  // rhythmus-bald
        return 5;
      }
    };
    items.sort((a,b)=>{
      const A=[a.isFixed?0:1, urgencyRank(a.days_until,a.isFixed||false), a.days_until ?? 999];
      const B=[b.isFixed?0:1, urgencyRank(b.days_until,b.isFixed||false), b.days_until ?? 999];
      return A[0]-B[0] || A[1]-B[1] || A[2]-B[2];
    });

    res.status(200).json({ ok:true, items });
  }catch(e:any){
    res.status(500).json({ ok:false, error: e?.message || String(e) });
  }
}
