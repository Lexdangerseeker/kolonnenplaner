import { useEffect } from "react";

export default function Page(){
  useEffect(()=>{
    (async ()=>{
      try { await fetch("/api/ma/logout"); } catch {}
      if (typeof window !== "undefined") window.location.href = "/";
    })();
  },[]);
  return <div className="p-6">Abmelden...</div>;
}
