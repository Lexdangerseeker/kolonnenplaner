import React, { useEffect, useMemo, useState } from "react";

/**
 * Admin → Statistiken
 * Bindet /api/admin/statistik/baustellen an und zeigt:
 * - KPI-Tabelle pro Baustelle (z. B. Gesamtstunden, Durchgänge, nächster Termin)
 * - Monats-Selector (YYYY-MM), default = aktueller Monat
 * - Export-Button (CSV), falls die API einen CSV-Link oder raw-Daten liefert
 *
 * Keine neuen Abhängigkeiten, nur React/Fetch. Build-fähig.
 */

type BaustellenKPI = {
  id: string;
  name: string;
  kunde?: string | null;
  projekt_nummern?: string[] | null;

  // Beispiele möglicher Felder aus deiner API:
  gesamt_stunden?: number | null;
  durchgaenge?: number | null;
  naechster_termin?: string | null; // yyyy-MM-dd o.ä.
  letzte_bearbeitung?: string | null;
  extras_count?: number | null;
};

type ApiResponse =
  | { ok: true; items: BaustellenKPI[]; csv_url?: string | null }
  | { ok: false; error: string };

function firstDayOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function toYyyyMm(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}
function deDate(str: string | null | undefined): string {
  if (!str) return "";
  // akzeptiert yyyy-MM-dd und wandelt in dd.MM.yyyy
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return str; // sonst roh anzeigen
}

export default function AdminStatistiken() {
  const [month, setMonth] = useState<string>(toYyyyMm(firstDayOfMonth()));
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<BaustellenKPI[]>([]);
  const [csvUrl, setCsvUrl] = useState<string | null>(null);

  const query = useMemo(() => {
    // API kann optional ?month=YYYY-MM verstehen; wenn nicht, ignoriert sie es.
    const q = new URLSearchParams();
    if (month) q.set("month", month);
    return q.toString();
  }, [month]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    fetch(`/api/admin/statistik/baustellen?${query}`, { method: "GET" })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(text || `HTTP ${r.status}`);
        }
        return r.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data && (data as any).ok === false) {
          setErr((data as any).error || "Unbekannter API-Fehler");
          setRows([]);
          setCsvUrl(null);
        } else {
          const okData = data as Extract<ApiResponse, { ok: true }>;
          setRows(okData.items || []);
          setCsvUrl(okData.csv_url || null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(
          "Konnte /api/admin/statistik/baustellen nicht laden. " +
            "Bitte prüfe Backend/Route. Detail: " +
            (e?.message || e)
        );
        setRows([]);
        setCsvUrl(null);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query]);

  const sumStunden = useMemo(
    () =>
      rows.reduce(
        (acc, r) => acc + (typeof r.gesamt_stunden === "number" ? r.gesamt_stunden : 0),
        0
      ),
    [rows]
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Statistiken</h1>

      {/* Filterleiste */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium">Monat</label>
          <input
            type="month"
            className="border rounded px-2 py-1"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        <button
          className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
          onClick={() => {
            // einfach refetchen durch setMonth auf sich selbst triggern
            setMonth((m) => m);
          }}
          disabled={loading}
        >
          Aktualisieren
        </button>

        {csvUrl && (
          <a
            className="bg-green-600 text-white px-3 py-2 rounded"
            href={csvUrl}
            target="_blank"
            rel="noreferrer"
          >
            CSV herunterladen
          </a>
        )}
      </div>

      {/* Hinweise / Fehler */}
      {loading && <div className="text-gray-600">Lade Daten…</div>}
      {err && (
        <div className="text-red-700">
          {err}
          <div className="text-sm text-gray-600">
            (Die Seite bleibt buildfähig. Falls deine API andere Feldnamen liefert,
            passen wir nur die Spaltenbezeichnungen unten an.)
          </div>
        </div>
      )}

      {/* KPI-Übersicht */}
      <div className="grid grid-cols-1 gap-4">
        {/* Kennzahlen oben */}
        <div className="p-3 border rounded bg-gray-50 flex flex-wrap gap-6">
          <div>
            <div className="text-sm text-gray-600">Anzahl Baustellen</div>
            <div className="text-xl font-semibold">{rows.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Gesamtstunden (Summe)</div>
            <div className="text-xl font-semibold">{sumStunden.toFixed(2)}</div>
          </div>
        </div>

        {/* Tabelle */}
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Baustelle</th>
                <th className="text-left p-2">Kunde</th>
                <th className="text-left p-2">Projekt-Nr.</th>
                <th className="text-right p-2">Gesamtstunden</th>
                <th className="text-right p-2">Durchgänge</th>
                <th className="text-left p-2">Nächster Termin</th>
                <th className="text-left p-2">Letzte Bearbeitung</th>
                <th className="text-right p-2">Extras</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.kunde || ""}</td>
                  <td className="p-2">
                    {Array.isArray(r.projekt_nummern) && r.projekt_nummern.length > 0
                      ? r.projekt_nummern.join(", ")
                      : ""}
                  </td>
                  <td className="p-2 text-right">
                    {typeof r.gesamt_stunden === "number" ? r.gesamt_stunden.toFixed(2) : ""}
                  </td>
                  <td className="p-2 text-right">
                    {typeof r.durchgaenge === "number" ? r.durchgaenge : ""}
                  </td>
                  <td className="p-2">{deDate(r.naechster_termin)}</td>
                  <td className="p-2">{deDate(r.letzte_bearbeitung)}</td>
                  <td className="p-2 text-right">
                    {typeof r.extras_count === "number" ? r.extras_count : ""}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && !err && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={8}>
                    Keine Daten gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
