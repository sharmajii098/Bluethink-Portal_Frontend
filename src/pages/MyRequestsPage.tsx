import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowForwardRounded, SearchRounded, ArrowBackRounded, VerifiedUserRounded } from "@mui/icons-material";
import { RequestViewContext } from "../contexts/RequestViewContext";
import { requestCatalog } from "../config/requestCatalog";
import { getCurrentRole } from "../utils/authRole";

export function SelfServiceLayout() { return <RequestViewContext.Provider value={true}><Outlet /></RequestViewContext.Provider>; }
export function RequestModeBar() {
 const role=getCurrentRole(),location=useLocation(),base=`/${role.toLowerCase()}`;
 const own=location.pathname.includes("/my-requests/");
 const canManageService=!(role==="MANAGER" && ["documents","tax-declarations"].some(path=>location.pathname.endsWith(`/`+path)));
 const item=requestCatalog.find(x=>location.pathname===`${base}/${x.path}`||location.pathname===`${base}/my-requests/${x.path}`);
 if(!item||!["HR","MANAGER"].includes(role))return null;
 return <div className="request-mode-bar"><div><span className="request-mode-label">{own?"PERSONAL WORKSPACE":"REVIEW WORKSPACE"}</span><strong>{own?"Your requests, in one place":"Requests awaiting your review"}</strong><small>{own?"Your personal requests are reviewed by Admin. You cannot approve your own request.":"HR and Manager personal requests are reviewed by Admin."}</small></div><div className="request-mode-links"><Link to={`${base}/my-requests/${item.path}`} aria-current={own?"page":undefined}>My requests</Link>{canManageService&&<Link to={`${base}/${item.path}`} aria-current={!own?"page":undefined}>Review requests</Link>}</div></div>;
}
export default function MyRequestsPage({review=false}:{review?:boolean}) {
 const role=getCurrentRole(),base=`/${role.toLowerCase()}`;
 const [query,setQuery]=useState(""),[group,setGroup]=useState("All services");
 const groups=["All services",...new Set(requestCatalog.map(x=>x.group))];
 const items=useMemo(()=>requestCatalog.filter(x=>(group==="All services"||x.group===group)&&`${x.title} ${x.description}`.toLowerCase().includes(query.toLowerCase())),[query,group]);
 return <div className="request-workspace"><div className="request-hero"><div><span className="workspace-eyebrow">{review?"ADMIN / APPROVALS":"YOUR WORKDAY / SELF SERVICE"}</span><h1>{review?"Staff approvals":"What can we help you with?"}</h1><p>{review?"Review HR and Manager requests from the relevant service. Personal staff requests require your decision; self-approval is blocked.":"Apply, follow up and keep your work life organized. Your personal requests are separate from the requests you manage."}</p><div className="request-approval-note"><VerifiedUserRounded fontSize="small"/><span>{review?"Open a service to see its authorized review queue.":["HR","MANAGER"].includes(role)?"Approval route: You → Admin":"Approval route: You → your authorized reviewer"}</span></div></div><div className="request-hero-mark" aria-hidden="true"><span>BT</span><small>PEOPLE FIRST</small></div></div>
 <div className="request-toolbar"><label className="request-search"><SearchRounded/><input aria-label="Find a request service" placeholder="Search leave, expenses, letters…" value={query} onChange={e=>setQuery(e.target.value)}/></label><span>{items.length} services</span></div>
 <div className="request-category-tabs" aria-label="Request categories">{groups.map(g=><button key={g} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g}</button>)}</div>
 <div className="request-card-grid">{items.map((x,i)=><Link className="request-service-card" key={x.path} to={`${base}/${review?"":"my-requests/"}${x.path}`}><span className="request-card-index">{String(i+1).padStart(2,"0")} <small>{x.group}</small></span><h2>{x.title}</h2><p>{x.description}</p><span className="request-card-action">{review?"Open review queue":"Open service"}<ArrowForwardRounded fontSize="small"/></span></Link>)}</div>
 {!items.length&&<div className="workspace-empty"><h2>No matching services</h2><p>Try a different term or choose another category.</p><button onClick={()=>{setQuery("");setGroup("All services");}}>Clear filters</button></div>}
 <Link className="workspace-back" to={`${base}/dashboard`}><ArrowBackRounded fontSize="small"/>Back to dashboard</Link></div>;
}
