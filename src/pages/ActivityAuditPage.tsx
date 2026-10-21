import { downloadBrandedCsv } from "../utils/brandedExport";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadRounded, FilterAltRounded, HistoryRounded, RefreshRounded, SearchRounded } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { api } from "../services/api";

type Activity = { id:number; employeeName?:string; activity?:string; status?:string };
type PageData = { content:Activity[]; totalElements:number; totalPages:number; number:number; size:number };

const text=(v:any)=>v===null||v===undefined||v===""?"—":String(v);
function exportCsv(rows:Activity[]){
  if(!rows.length)return;
  const csv=[["ID","Employee","Activity","Status"],...rows.map(r=>[r.id,r.employeeName||"",r.activity||"",r.status||""])].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  void downloadBrandedCsv(csv, "hr-activity-feed.csv");
}

export default function ActivityAuditPage(){
  const [data,setData]=useState<PageData>({content:[],totalElements:0,totalPages:0,number:0,size:20});
  const [keyword,setKeyword]=useState(""); const [status,setStatus]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [page,setPage]=useState(0);
  const [lastRefresh,setLastRefresh]=useState(new Date());
  const load=useCallback(async(p=page)=>{setLoading(true);setError("");try{const r=await api.get("/activity-feed",{params:{page:p,size:20,keyword:keyword||undefined,status:status||undefined}});setData(r.data);setLastRefresh(new Date());}catch(e:any){setError(e?.response?.data?.message||"Unable to load activity feed");}finally{setLoading(false)}},[page,keyword,status]);
  useEffect(()=>{load(0);setPage(0);},[keyword,status]);
  useEffect(()=>{load(page);},[page]);
  const rows=useMemo(()=>data.content||[],[data]);
  return <div>
    <div className="th-page-header"><div><h1>HR Activity & Audit Feed</h1><div className="th-breadcrumb">HR Administration <span>/</span> Activity & Audit</div></div><div className="th-header-actions"><button className="th-outline" onClick={()=>exportCsv(rows)} disabled={!rows.length}><DownloadRounded fontSize="small"/> Export Excel</button><button className="th-outline" onClick={()=>load(page)}><RefreshRounded fontSize="small"/> Refresh</button></div></div>
    {error&&<div className="role-alert"><b>Activity feed unavailable</b><span>{error}</span></div>}
    <div className="th-grid th-stats-grid"><div className="th-card th-stat-card"><div className="th-card-title"><HistoryRounded fontSize="small"/> Visible Events</div><div className="th-stat-value">{data.totalElements}</div></div><div className="th-card th-stat-card"><div className="th-card-title">Page</div><div className="th-stat-value">{data.totalPages?data.number+1:0} / {data.totalPages}</div></div><div className="th-card th-stat-card"><div className="th-card-title">Last Refresh</div><div className="th-stat-value" style={{fontSize:20}}>{lastRefresh.toLocaleTimeString()}</div></div></div>
    <div className="th-card report-filter-card"><div className="report-filter-title"><FilterAltRounded fontSize="small"/> Activity Filters</div><div className="report-filters"><label>Search<input value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="Employee or activity"/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>SUCCESS</option><option>APPROVED</option><option>PENDING</option><option>REJECTED</option><option>FAILED</option></select></label><button className="th-outline" onClick={()=>{setKeyword("");setStatus("")}}>Reset</button></div></div>
    {loading?<div className="th-card th-loading"><CircularProgress size={22}/> Loading activity feed…</div>:<div className="th-card table-card"><div className="table-toolbar"><div><strong>Recent HR Activity</strong><small>{rows.length} event{rows.length===1?"":"s"} on this page</small></div><span className="th-muted"><SearchRounded fontSize="small"/> Newest first</span></div>{!rows.length?<div className="empty-state"><h3>No activity found</h3><p>Try changing the filters or refresh the feed.</p></div>:<div className="table-scroll"><table><thead><tr><th>ID</th><th>Employee</th><th>Activity</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>#{r.id}</td><td><b>{text(r.employeeName)}</b></td><td>{text(r.activity)}</td><td><span className={`status ${String(r.status||"").toLowerCase()}`}>{text(r.status)}</span></td></tr>)}</tbody></table></div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14}}><span className="th-muted">Page {data.totalPages?data.number+1:0} of {data.totalPages} · {data.totalElements} total events</span><div style={{display:"flex",gap:8}}><button className="th-outline" disabled={page<=0||loading} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="th-outline" disabled={page>=data.totalPages-1||loading} onClick={()=>setPage(p=>p+1)}>Next</button></div></div></div>}
  </div>
}
