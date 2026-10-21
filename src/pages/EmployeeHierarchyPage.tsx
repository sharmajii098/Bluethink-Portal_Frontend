import { useEffect, useMemo, useState } from "react";
import { AccountTreeRounded, ExpandLessRounded, ExpandMoreRounded, FilterAltRounded, RefreshRounded, SearchRounded } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { api } from "../services/api";

type Node = { id:number; userId?:string; name?:string; designation?:string; role?:string; departmentName?:string; children?:Node[] };

export default function EmployeeHierarchyPage(){
  const [roots,setRoots]=useState<Node[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [query,setQuery]=useState(""); const [department,setDepartment]=useState(""); const [expanded,setExpanded]=useState<Set<number>>(new Set());
  async function load(){setLoading(true);setError("");try{const r=await api.get("/employee-hierarchy");const data=Array.isArray(r.data)?r.data:[];setRoots(data);const ids:number[]=[];const walk=(n:Node)=>{if(n.children?.length){ids.push(n.id);n.children.forEach(walk)}};data.forEach(walk);setExpanded(new Set(ids));}catch(e:any){setError(e?.response?.data?.message||"Unable to load employee hierarchy");}finally{setLoading(false);}}
  useEffect(()=>{load()},[]);
  const departments=useMemo(()=>{const s=new Set<string>();const walk=(n:Node)=>{if(n.departmentName)s.add(n.departmentName);n.children?.forEach(walk)};roots.forEach(walk);return [...s].sort()},[roots]);
  const matches=(n:Node)=>{const q=query.trim().toLowerCase();const own=(!q||[n.name,n.userId,n.designation,n.role,n.departmentName].some(v=>String(v||"").toLowerCase().includes(q)))&&(!department||n.departmentName===department);return own||(n.children||[]).some(matches)};
  const filtered=useMemo(()=>roots.filter(matches),[roots,query,department]);
  const stats=useMemo(()=>{let total=0,managers=0,departments=new Set<string>();const walk=(n:Node)=>{total++;if(String(n.role).toUpperCase()==="MANAGER")managers++;if(n.departmentName)departments.add(n.departmentName);n.children?.forEach(walk)};roots.forEach(walk);return {total,managers,departments:departments.size,roots:roots.length}},[roots]);
  function toggle(id:number){setExpanded(v=>{const n=new Set(v);n.has(id)?n.delete(id):n.add(id);return n})}
  function expandAll(){const ids:number[]=[];const walk=(n:Node)=>{if(n.children?.length){ids.push(n.id);n.children.forEach(walk)}};roots.forEach(walk);setExpanded(new Set(ids));}
  function collapseAll(){setExpanded(new Set())}
  const render=(n:Node,level=0):any=>{if(!matches(n))return null;const children=n.children||[];const open=expanded.has(n.id);return <div className="hierarchy-node" key={n.id}><div className="hierarchy-row" style={{marginLeft:level*30}}><div className="hierarchy-connector"/><div className="hierarchy-avatar">{(n.name||"?").trim().charAt(0).toUpperCase()}</div><div className="hierarchy-main"><strong>{n.name||"Unnamed employee"}</strong><span>{n.designation||"Employee"} {n.role&&<em>{n.role}</em>}</span><small>{n.departmentName||"No department"} · {n.userId||"No user ID"}</small></div>{children.length>0&&<button className="hierarchy-toggle" onClick={()=>toggle(n.id)} aria-label={open?"Collapse":"Expand"}>{open?<ExpandLessRounded/>:<ExpandMoreRounded/>}<b>{children.length}</b></button>}</div>{open&&children.map(c=>render(c,level+1))}</div>};
  return <div><div className="th-page-header"><div><h1>Employee Hierarchy</h1><div className="th-breadcrumb">Organization <span>/</span> Reporting Structure</div></div><div className="th-header-actions"><button className="th-outline" onClick={collapseAll}>Collapse All</button><button className="th-outline" onClick={expandAll}>Expand All</button><button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button></div></div>
    {error&&<div className="role-alert"><b>Hierarchy unavailable</b><span>{error}</span></div>}
    <div className="stats-grid employee-stats"><div className="th-card stat-card"><span>Total Employees</span><strong>{stats.total}</strong></div><div className="th-card stat-card"><span>Top-level Employees</span><strong>{stats.roots}</strong></div><div className="th-card stat-card"><span>Managers</span><strong>{stats.managers}</strong></div><div className="th-card stat-card"><span>Departments</span><strong>{stats.departments}</strong></div></div>
    <div className="th-card report-filter-card"><div className="report-filter-title"><FilterAltRounded fontSize="small"/> Organization Filters</div><div className="report-filters"><label><SearchRounded fontSize="small"/> Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, user ID, role, designation…"/></label><label>Department<select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(d=><option key={d}>{d}</option>)}</select></label></div></div>
    <div className="th-card hierarchy-card">{loading?<div className="th-loading"><CircularProgress size={22}/> Loading organization structure…</div>:filtered.length===0?<div className="empty-state"><AccountTreeRounded fontSize="large"/><h3>No matching employees</h3><p>Try a different search or department filter.</p></div>:<div className="hierarchy-tree">{filtered.map(n=>render(n))}</div>}</div>
  </div>
}
