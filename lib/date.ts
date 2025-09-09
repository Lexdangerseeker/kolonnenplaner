export function fmtEU(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d+"T00:00:00") : d;
  const y = dt.getFullYear();
  const m = (dt.getMonth()+1).toString().padStart(2,"0");
  const day = dt.getDate().toString().padStart(2,"0");
  return `${day}.${m}.${y}`;
}
export function todayISO(): string {
  const t = new Date();
  t.setHours(0,0,0,0);
  return t.toISOString().slice(0,10);
}
export function daysDiff(aISO: string, bISO: string): number {
  const a = new Date(aISO+"T00:00:00").getTime();
  const b = new Date(bISO+"T00:00:00").getTime();
  return Math.round((a-b) / (24*3600*1000));
}
