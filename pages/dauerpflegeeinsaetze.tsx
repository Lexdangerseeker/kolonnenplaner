import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/** Helpers (lokale Mitternacht) */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate()+n);
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function cmpISO(a: string, b: string): number {
  // a<b:-1, a=b:0, a>b:1  (string-Vergleich geht wegen YYYY-MM-DD)
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
function daysBetween(aISO: string, bISO: string): number {
  // (b - a) in Tagen
  const a = new Date(`${aISO}T00:00:00`).getTime();
  const b = new Date(`${bISO}T00:00:00`).getTime();
  return Math.round((b-a)/(24*3600*1000));
}
function fmtDE(iso?: string | null): string {
  if (!iso) return "-";
  const [y,m,d] = String(iso).split("-");
  return `${d}.${m}.${y}`;
}

/** Types (vereinfachter View) */
type SessionUser = { nachname: string } | null;

type BaustelleListItem = {
  id?: string;
  baustelle_id?: string;
  nummer?: number | null;
  name?: string | null;
  adresse?: string | null;
  plz?: string | null;
  ort?: string | null;
  projekt_nr?: string | null;
  kunden_nr?: string | null;
  naechster_faellig_am?: string | null;
  ueberfaellig_tage?: number;
  rhythmus_tage?: number | null;
  arbeitstage?: string[];
};

type GetDetailOk = {
  ok: true;
  item: {
    id: string;
    start_datum: string | null;
    rhythmus_tage: number | null;
    fixed_date?: string | null;
  }
} | { ok: false; error: string };

type ViewItem = BaustelleListItem & {
  _derived: {
    start_datum: string | null;
    rhythmus_tage: number | null;
    next_date: string | null;
    days_until: number | null;
    color: "green" | "yellow" | "red" | "gray";
  }
};

/** Regel: nächsten Termin aus Start + Rhythmus berechnen */
function computeNextFromStart(startISO: string, rhythm: number, today: string): string {
  let next = startISO;
  // Nur wenn in der Vergangenheit, Schrittweise addieren, bis >= heute
  while (cmpISO(next, today) < 0) {
    next = addDaysISO(next, rhythm);
  }
  return next; // kann == heute sein
}

export default function DauerpflegeEinsaetze() {
  const [user, setUser] = useState<SessionUser>(null);
  const [items, setItems] = useState<ViewItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const today = todayISO();
  const from = useMemo(() => addDaysISO(today, -180), [today]);
  const to = today;

  async function fetchSession() {
    try {
      const r = await fetch("/api/ma/session", { cache: "no-store" });
      if (r.ok) { const js = await r.json(); setUser(js?.user || null); } else { setUser(null); }
    } catch { setUser(null); }
  }

  async function load() {
    setErr(null); setBusy(true);
    try {
      const u = new URLSearchParams({ from, to, _t: String(Date.now()) });
      const r = await fetch(`/api/admin/statistik/baustellen?${u.toString()}`, { cache: "no-store" });
      const js = await r.json();
      if (!r.ok) throw new Error(js?.error || "Laden fehlgeschlagen.");

      // Grundliste
      const base: BaustelleListItem[] = (js.items || []).map((it: any) => ({
        ...it,
        arbeitstage: Array.isArray(it.arbeitstage) ? [...it.arbeitstage].sort() : [],
      }));

      // Details je Baustelle (start_datum/rhythmus) holen und ableiten
      const enriched: ViewItem[] = await Promise.all(base.map(async (it) => {
        const id = (it as any).id || (it as any).baustelle_id; // beide Varianten unterstützen
        let start_datum: string | null = null;
        let rhythm: number | null = (it.rhythmus_tage ?? null);
        try {
          if (id) {
            const r2 = await fetch(`/api/admin/baustellen/get?id=${id}`);
            if (r2.ok) {
              const d = await r2.json() as GetDetailOk;
              if ((d as any).ok) {
                start_datum = (d as any).item?.start_datum ?? null;
                rhythm = (d as any).item?.rhythmus_tage ?? rhythm;
              }
            }
          }
        } catch {}

        // Ableitung
        let next: string | null = it.naechster_faellig_am ?? null;
        if (!next && start_datum && rhythm && rhythm > 0) {
          next = computeNextFromStart(start_datum, rhythm, today);
        }
        let days_until: number | null = next ? daysBetween(today, next) : null;

        let color: ViewItem["_derived"]["color"] = "gray";
        if (next != null) {
          if (days_until != null && days_until <= 0) color = "red";
          else if (days_until != null && days_until <= 4) color = "yellow";
          else color = "green";
        } else {
          color = "gray";
        }

        return {
          ...it,
          _derived: {
            start_datum,
            rhythmus_tage: rhythm ?? null,
            next_date: next,
            days_until,
            color
          }
        };
      }));

      setItems(enriched);
    } catch (e: any) {
      setErr(e?.message || String(e)); setItems([]);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    fetchSession();
    const t = setTimeout(() => load(), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sortierung: nach nächstem Termin (aufsteigend), Null-Werte ans Ende
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const na = a._derived.next_date || "9999-12-31";
      const nb = b._derived.next_date || "9999-12-31";
      return na.localeCompare(nb);
    });
    return arr;
  }, [items]);

  function colorCls(i: ViewItem) {
    switch (i._derived.color) {
      case "red": return "border-red-500 bg-red-50";
      case "yellow": return "border-yellow-500 bg-yellow-50";
      case "green": return "border-green-500 bg-green-50";
      default: return "border-gray-400 bg-gray-50";
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dauerpflegeeinsätze (MA)</h1>
        <nav className="text-sm flex items-center gap-3">
          <Link className="underline" href="/einsaetzeMH">Einsätze (Rhythmus/Fest)</Link>
          <Link className="underline" href="/admin">Admin</Link>
        </nav>
      </header>

      {err && <div className="text-sm p-2 rounded border bg-red-50">{err}</div>}

      <section className="rounded-xl border p-4">
        <div className="mb-3 flex items-center gap-2">
          <button className="border rounded px-3 py-1 text-sm" onClick={load} disabled={busy}>
            {busy ? "Lädt…" : "Aktualisieren"}
          </button>
          <div className="text-xs opacity-70">
            Zeitraum: {fmtDE(from)} – {fmtDE(to)}
          </div>
        </div>

        {!sorted.length ? (
          <div className="text-sm opacity-70">Keine aktiven Baustellen gefunden.</div>
        ) : (
          <ul className="grid gap-3">
            {sorted.map((it) => {
              const wrapCls = `rounded-lg border-2 ${colorCls(it)} p-3`;
              return (
                <li key={(it as any).id || (it as any).baustelle_id} className={wrapCls}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {it.nummer != null ? `${it.nummer} · ` : ""}{it.name || "-"}
                      </div>
                      <div className="text-xs opacity-80 truncate">
                        {it.adresse ? `${it.adresse}, ` : ""}{it.plz || ""} {it.ort || ""}
                      </div>

                      <div className="text-xs mt-1 space-x-3">
                        <span>Starttermin: <strong>{fmtDE(it._derived.start_datum)}</strong></span>
                        <span>Rhythmus: <strong>{it._derived.rhythmus_tage ?? "-"}</strong> Tage</span>
                        <span>Nächster: <strong>{fmtDE(it._derived.next_date)}</strong></span>
                        {typeof it._derived.days_until === "number" ? (
                          it._derived.days_until <= 0
                            ? <span className="text-red-700 font-semibold">Überfällig {Math.abs(it._derived.days_until)} Tage</span>
                            : <span className="text-green-700">noch {it._derived.days_until} Tage</span>
                        ) : <span className="text-gray-500">ohne Termin</span>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
