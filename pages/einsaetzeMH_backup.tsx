import React, { useEffect, useState } from "react";

// Hilfsfunktionen für Datum (Berliner Zeitmodell)
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Akzeptiert yyyy-MM-dd, dd-MM-yyyy, dd.MM.yyyy
function deToDate(str: string | null | undefined): Date | null {
  if (!str) return null;

  // ISO yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
  }

  // dd-MM-yyyy
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
  }

  // dd.MM.yyyy
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    const [d, m, y] = str.split(".").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
  }

  return null;
}

function dateToDe(d: Date | null): string {
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function diffDays(a: Date, b: Date): number {
  const ms = atMidnight(a).getTime() - atMidnight(b).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Typen
type Einsatz = {
  id: string;
  name: string;
  rhythmus_tage: number | null;
  start_date: string | null;
  fixed_date: string | null;
  // weitere Felder ...
};

type Derived = {
  next_date: Date | null;
  days_until: number | null;
  statusColor: string; // rot, gelb, grün, pink, blau, grau
  kind: "rhythmus" | "fest" | "ignoriert";
};

export default function EinsaetzeMH() {
  const [items, setItems] = useState<(Einsatz & { _derived: Derived })[]>([]);
  const [now, setNow] = useState(new Date());

  // Timer für Uhrzeit (prüft jede Minute auf 10:00)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/ma/einsaetzeMH/list")
      .then((r) => r.json())
      .then((data) => {
        const today = atMidnight(new Date());

        const mapped = data.items.map((it: Einsatz) => {
          const start = deToDate(it.start_date);
          const fixed = deToDate(it.fixed_date);
          const rythm = it.rhythmus_tage ? Number(it.rhythmus_tage) : 0;

          let next: Date | null = null;
          let days: number | null = null;
          let kind: Derived["kind"] = "ignoriert";
          let color = "gray";

          if (rythm > 0 && start) {
            // Rhythmus-Logik
            if (atMidnight(start) <= today) {
              next = new Date(start);
              while (next <= today) {
                next.setDate(next.getDate() + rythm);
              }
            } else {
              next = start;
            }
            days = diffDays(next, today);
            kind = "rhythmus";

            if (days <= 0) color = "red";
            else if (days <= 4) color = "yellow";
            else color = "green";
          } else if (fixed) {
            // Fester Termin
            next = fixed;
            days = diffDays(next, today);
            kind = "fest";

            if (days < 0) color = "red";
            else if (days === 0) color = "pink";
            else if (days <= 4) color = "yellow-blue";
            else color = "blue";
          } else {
            // Ignoriert / Grau
            color = "gray";
            kind = "ignoriert";
          }

          return { ...it, _derived: { next_date: next, days_until: days, statusColor: color, kind } };
        });

        setItems(mapped);
      });
  }, []);

  return (
    <div className="p-4 grid grid-cols-2 gap-6">
      {/* Rhythmus-Spalte */}
      <div>
        <h2 className="text-xl font-bold mb-2">Pflege (Rhythmus)</h2>
        {items
          .filter((i) => i._derived.kind === "rhythmus")
          .map((i) => {
            const c = i._derived.statusColor;
            return (
              <div key={i.id} className={`p-4 mb-3 border-2 rounded-lg bg-${c}-50`}>
                <div className="font-bold">{i.name}</div>
                <div>Nächster Durchgang: {dateToDe(i._derived.next_date)}</div>
                <div>
                  {i._derived.days_until !== null
                    ? `Noch ${i._derived.days_until} Tage`
                    : "Kein Termin berechnet"}
                </div>
              </div>
            );
          })}
      </div>

      {/* Feste Termine */}
      <div>
        <h2 className="text-xl font-bold mb-2">Feste Termine</h2>
        {items
          .filter((i) => i._derived.kind === "fest")
          .map((i) => {
            const c = i._derived.statusColor;
            const isBlink =
              c === "pink" &&
              i._derived.days_until === 0 &&
              now.getHours() >= 10;
            return (
              <div
                key={i.id}
                className={`p-4 mb-3 border-2 rounded-lg bg-${c}-50 ${
                  isBlink ? "animate-pulse" : ""
                }`}
              >
                <div className="font-bold">{i.name}</div>
                <div>Fester Termin: {dateToDe(i._derived.next_date)}</div>
                <div>
                  {i._derived.days_until !== null
                    ? `Noch ${i._derived.days_until} Tage`
                    : "Kein Termin berechnet"}
                </div>
                {isBlink && (
                  <div className="mt-2 text-red-700 font-bold">
                    ‼ In Bearbeitung? Sonst anrufen!
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
