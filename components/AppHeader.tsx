import { useEffect, useState } from "react";

type User = { uid:string; name:string; role:"admin"|"ma" };
export default function AppHeader(){
  const [user,setUser] = useState<User|null>(null);
  const [online,setOnline] = useState(false);

  useEffect(()=>{
    let t: any;
    async function tick(){
      try{
        const s = await fetch("/api/ma/session").then(r=>r.json());
        if (s?.ok) setUser(s.user); else setUser(null);
        if (s?.ok) await fetch("/api/ma/presence/ping", { method:"POST" });
        setOnline(true);
      }catch{ setOnline(false); }
    }
    tick();
    t = setInterval(tick, 60000);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{display:"flex",alignItems:"center",gap:12, border:"1px solid #e5e7eb", background:"#fff", borderRadius:12, padding:"8px 10px", margin:"8px 0 12px"}}>
      <div style={{width:10,height:10,borderRadius:9999, background: online?"#22c55e":"#9ca3af"}}/>
      <div style={{fontWeight:600}}>{user ? `Angemeldet als: ${user.name} (${user.role})` : "Nicht angemeldet"}</div>
      <div style={{marginLeft:"auto"}}>
        {user ? <a href="/ma/logout" style={{textDecoration:"none",border:"1px solid #e5e7eb",padding:"6px 10px",borderRadius:8}}>Abmelden</a>
              : <a href="/ma/login" style={{textDecoration:"none",border:"1px solid #e5e7eb",padding:"6px 10px",borderRadius:8}}>Anmelden</a>}
      </div>
    </div>
  );
}