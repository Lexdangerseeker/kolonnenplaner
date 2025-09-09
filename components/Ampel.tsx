"use client";
import { useEffect, useState } from "react";

export default function Ampel(){
  const [state, setState] = useState<"unknown"|"on"|"off">("unknown");

  async function ping(){
    try{
      const r = await fetch("/api/heartbeat");
      const j = await r.json();
      if (r.ok && j?.ok) setState("on"); else setState("off");
    }catch{ setState("off"); }
  }

  useEffect(()=>{
    ping();
    const t = setInterval(ping, 30000);
    return ()=> clearInterval(t);
  },[]);

  const cls = state==="on" ? "bg-green-500" : state==="off" ? "bg-gray-400" : "bg-yellow-400";
  const label = state==="on" ? "online" : state==="off" ? "offline" : "checking";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={"inline-block w-3 h-3 rounded-full "+cls} />
      <span className="opacity-70">{label}</span>
    </div>
  );
}
