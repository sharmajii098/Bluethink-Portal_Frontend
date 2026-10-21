import { downloadBrandedCsv } from "../utils/brandedExport";
import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { DownloadRounded, FilterAltRounded, RefreshRounded, WarningAmberRounded } from "@mui/icons-material";
import { api } from "../services/api";

type Doc = Record<string, any>;
const text = (v:any) => v == null || v === "" ? "—" : String(v);
const dayMs = 86400000;

export default function DocumentExpiryDashboardPage() {
  const [docs,setDocs] = useState<Doc[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [search,setSearch] = useState(""), [filter,setFilter] = useState("ALL"), [days,setDays] = useState("30");
  const load = async () => { setLoading(true); setError(""); try { const r=await api.get("/documents"); setDocs(Array.isArray(r.data)?r.data:[]); } catch(e:any) { setError(e?.response?.data?.message||"Unable to load document register."); } finally { setLoading(false); } };
  useEffect(()=>{load()},[]);

  const today = new Date(); today.setHours(0,0,0,0);
  const classify = (d:Doc) => {
    const s=String(d.status||"").toUpperCase();
    if(s==="EXPIRED") return "EXPIRED";
    if(!d.expiryDate) return s || "NO_EXPIRY";
    const expiry=new Date(d.expiryDate); expiry.setHours(0,0,0,0);
    const diff=Math.ceil((expiry.getTime()-today.getTime())/dayMs);
    if(diff<0) return "EXPIRED";
    if(diff<=Number(days)) return "EXPIRING";
    return s || "ACTIVE";
  };
  const shown=useMemo(()=>docs.filter(d=>{
    const q=search.trim().toLowerCase();
    const hit=!q || [d.originalFilename,d.employeeName,d.employeeId,d.category,d.status].some(v=>String(v||"").toLowerCase().includes(q));
    return hit && (filter==="ALL" || classify(d)===filter);
  }),[docs,search,filter,days]);
  const stats=useMemo(()=>({total:docs.length,expired:docs.filter(d=>classify(d)==="EXPIRED").length,expiring:docs.filter(d=>classify(d)==="EXPIRING").length,pending:docs.filter(d=>String(d.status||"").toUpperCase()==="PENDING").length,verified:docs.filter(d=>String(d.status||"").toUpperCase()==="VERIFIED").length}),[docs,days]);

  function exportCsv(){ const header=["Employee","Employee ID","Document","Category","Issue Date","Expiry Date","Status"]; const lines=shown.map(d=>[d.employeeName,d.employeeId,d.originalFilename,d.category,d.issueDate,d.expiryDate,d.status].map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")); void downloadBrandedCsv([header.join(","),...lines].join("\n"), "document-expiry-register.csv"); }

  return <div>
    <div className="th-page-header"><div><h1>Document Expiry Dashboard</h1><div className="th-breadcrumb">Compliance <span>/</span> {shown.length} visible records</div></div><div className="th-header-actions"><button className="th-outline" onClick={exportCsv}><DownloadRounded fontSize="small"/> Export Excel</button><button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button></div></div>
    {error&&<div className="role-alert"><b>Document dashboard failed</b><span>{error}</span></div>}
    <div className="stats-grid employee-stats"><div className="th-card stat-card"><span>Total Documents</span><strong>{stats.total}</strong></div><div className="th-card stat-card"><span>Expired</span><strong>{stats.expired}</strong></div><div className="th-card stat-card"><span>Expiring Soon</span><strong>{stats.expiring}</strong></div><div className="th-card stat-card"><span>Pending Review</span><strong>{stats.pending}</strong></div><div className="th-card stat-card"><span>Verified</span><strong>{stats.verified}</strong></div></div>
    <div className="th-card report-filter-card"><div className="report-filter-title"><FilterAltRounded fontSize="small"/> Expiry Filters</div><div className="report-filters"><label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Employee, ID, filename, category…"/></label><label>View<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All documents</option><option value="EXPIRED">Expired</option><option value="EXPIRING">Expiring soon</option><option value="PENDING">Pending review</option><option value="VERIFIED">Verified</option></select></label><label>Expiring window<select value={days} onChange={e=>setDays(e.target.value)}><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="60">Next 60 days</option><option value="90">Next 90 days</option></select></label></div></div>
    <div className="th-card table-card">{loading?<div className="th-loading"><CircularProgress size={22}/> Loading document register…</div>:shown.length===0?<div className="empty-state"><h3>No matching documents</h3><p>Try changing the filters or search terms.</p></div>:<div className="table-scroll"><table><thead><tr><th>Employee</th><th>Document</th><th>Category</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Risk</th></tr></thead><tbody>{shown.map(d=>{const state=classify(d); const risk=state==="EXPIRED"?"Critical":state==="EXPIRING"?"Attention":"Normal"; return <tr key={d.id}><td><b>{text(d.employeeName)}</b><small className="report-muted">{text(d.employeeId)}</small></td><td>{text(d.originalFilename)}</td><td>{text(d.category)}</td><td>{text(d.issueDate)}</td><td>{text(d.expiryDate)}</td><td><span className={`status ${String(d.status||"").toLowerCase()}`}>{text(d.status)}</span></td><td>{risk!=="Normal"&&<WarningAmberRounded fontSize="small"/>} {risk}</td></tr>})}</tbody></table></div>}</div>
  </div>;
}
