import Link from "next/link";
import LoginForm from "../components/LoginForm";
import Layout from "../components/Layout";

export default function Home(){
  return (
    <Layout title="Kolonnenplaner">
      <section className="rounded border p-4">
        <div className="font-semibold mb-2">Schnellstart</div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" href="/einsaetzeMH">MA Einsaetze</Link>
          <Link className="underline" href="/einsaetze_fest_preview">MA Feste Einsaetze</Link>
          <Link className="underline" href="/arbeitszeiten">MA Arbeitszeiten</Link>
          <Link className="underline" href="/admin">Admin</Link>
        </div>
      </section>

      <section className="rounded border p-4">
        <div className="font-semibold mb-2">Login</div>
        <LoginForm />
      </section>
    </Layout>
  );
}
