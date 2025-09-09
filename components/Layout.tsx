import Link from "next/link";
import Ampel from "./Ampel";

export default function Layout({ title, children }:{ title?: string; children: any }){
  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title || "Kolonnenplaner"}</h1>
        <nav className="text-sm flex items-center gap-4">
          <Link className="underline" href="/einsaetzeMH">MA Einsaetze</Link>
          <Link className="underline" href="/einsaetze_fest_preview">MA Feste Einsaetze</Link>
          <Link className="underline" href="/arbeitszeiten">MA Arbeitszeiten</Link>
          <Link className="underline" href="/admin">Admin</Link>
          <Ampel />
        </nav>
      </header>
      {children}
    </main>
  );
}
