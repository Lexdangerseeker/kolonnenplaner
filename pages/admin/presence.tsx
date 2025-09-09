import { useEffect, useState } from "react";
import AppHeader from "../../components/AppHeader";

type Row = { uid:string; name:string; role:"admin"|"ma"; last_seen:number };
export default function AdminPresence(){
  const [rows,setRows] = useState<Row[]>([]);
  const [err,setErr] = useState<string>("");

  async function load(){
    setErr("");
    try{
      const j = await fetch("/api/admin/presence/list?ts="+Date.now()).then(r=>r.json());
      if (j?.ok) setRows(j.items||[]); else setRows([]);
    }catch(e:any){ setErr(String(e?.message||e)); }
  }
  useEffect(()=>{ load(); const t=setInterval(load, 60000); return ()=>clearInterval(t); },[]);
  return (
    <div style={{padding:"12px 16px 16px"}}>
      <AppHeader/>
      <h1 style={{fontSize:20,fontWeight:700,margin:"4px 0 12px"}}>Präsenz (letzte 5 Minuten grün)</h1>
      <div style={{color:"#ef4444"}}>{err}</div>
      <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
        <thead><tr style={{background:"#f8fafc"}}>
          <th style={{textAlign:"left",padding:10}}>Status</th>
          <th style={{textAlign:"left",padding:10}}>Name</th>
          <th style={{textAlign:"left",padding:10}}>Rolle</th>
          <th style={{textAlign:"left",padding:10}}>Zuletzt gesehen</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>{
            const fresh = Date.now()-r.last_seen <= 5*60*1000;
            return (
              <tr key={r.uid} style={{borderTop:"1px solid #e5e7eb"}}>
                <td style={{padding:10}}><div style={{width:10,height:10,borderRadius:9999,background:fresh?"#22c55e":"#9ca3af"}}/></td>
                <td style={{padding:10}}>{r.name}</td>
                <td style={{padding:10}}>{r.role}</td>
                <td style={{padding:10}}>{new Date(r.last_seen).toLocaleString("de-DE")}</td>
              </tr>
            );
          })}
          {rows.length===0 && <tr><td colSpan={4} style={{padding:16,color:"#6b7280"}}>Niemand online.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}