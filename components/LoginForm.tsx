"use client";
import { useState } from "react";

export default function LoginForm({ onSuccess }:{ onSuccess?:()=>void }){
  const [lastname, setLastname] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function submit(e: React.FormEvent){
    e.preventDefault();
    setErr(null); setBusy(true);
    try{
      // if only super pin used in lastname field, we still call /api/ma/login
      const r = await fetch("/api/ma/login", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ lastname, pin })
      });
      const j = await r.json().catch(()=>null);
      if(!r.ok || !j?.ok) throw new Error(j?.error || "Login failed");
      onSuccess?.();
      if (typeof window !== "undefined") window.location.reload();
    }catch(e:any){ setErr(e.message||String(e)); }
    finally{ setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {err && <div className="p-2 rounded border bg-red-50 text-sm">{err}</div>}
      <div className="grid md:grid-cols-3 gap-3">
        <label className="grid text-sm">
          <span className="text-xs opacity-70">Nachname oder SuperPIN</span>
          <input className="border rounded px-2 py-1" value={lastname} onChange={e=>setLastname(e.target.value)} />
        </label>
        <label className="grid text-sm">
          <span className="text-xs opacity-70">PIN (leer lassen bei SuperPIN)</span>
          <input className="border rounded px-2 py-1" type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button className="border rounded px-3 py-1 text-sm" disabled={busy} type="submit">{busy?"...":"Anmelden"}</button>
        </div>
      </div>
    </form>
  );
}
