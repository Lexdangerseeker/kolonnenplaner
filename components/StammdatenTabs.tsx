import Link from "next/link";
import { useRouter } from "next/router";

export default function StammdatenTabs({ active }: { active?: "mitarbeiter" | "baustellen" }) {
  const r = useRouter();
  const path = r?.pathname || "";
  const isB = active ? active==="baustellen" : path.startsWith("/stammdaten/baustellen");
  const isM = !isB;

  return (
    <div style={{padding:"12px 16px 0"}}>
      <style>{`
        .tabs{ display:flex; gap:8px; border-bottom:1px solid #e5e7eb; }
        .tab{ padding:10px 14px; border:1px solid #e5e7eb; border-bottom:none;
              border-top-left-radius:10px; border-top-right-radius:10px;
              background:#f8fafc; color:#111827; text-decoration:none; }
        .tab.active{ background:#fff; font-weight:600; box-shadow:0 2px 6px rgba(0,0,0,.05); }
      `}</style>
      <div className="tabs">
        <Link href="/stammdaten" className={`tab ${isM ? "active":""}`}>Mitarbeiter</Link>
        <Link href="/stammdaten/baustellen" className={`tab ${isB ? "active":""}`}>Baustellen</Link>
      </div>
    </div>
  );
}
