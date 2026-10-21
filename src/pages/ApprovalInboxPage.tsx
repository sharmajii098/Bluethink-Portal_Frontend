import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import ApprovalRoundedIcon from "@mui/icons-material/ApprovalRounded";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { api } from "../services/api";

type ApprovalItem={id:string|number; requestNumber?:string; employeeName?:string; status?:string; title:string; detail?:string; path:string; source:string};
type Source={title:string; endpoint:(role:string)=>string|null; path:string};

const SOURCES:Source[]=[
 {title:"Leave Requests",endpoint:r=>r==="MANAGER"?"/leaves/team":"/leaves",path:"leave"},
 {title:"Timesheets",endpoint:r=>r==="MANAGER"?"/timesheets/team":"/timesheets",path:"timesheets"},
 {title:"Attendance Regularization",endpoint:()=>"/attendance-regularizations",path:"attendance-regularization"},
 {title:"Work From Home",endpoint:r=>r==="MANAGER"?"/wfh/team":"/wfh",path:"wfh"},
 {title:"Overtime & Comp-Off",endpoint:()=>"/overtime",path:"overtime"},
 {title:"Shift Swaps",endpoint:()=>"/shift-swaps",path:"shift-swaps"},
 {title:"Shift Preferences",endpoint:()=>"/shift-preferences",path:"shift-preferences"},
 {title:"Expenses",endpoint:()=>"/expenses",path:"expenses"},
 {title:"Travel",endpoint:()=>"/travel",path:"travel"},
 {title:"Loans & Advances",endpoint:()=>"/loans",path:"loans"},
 {title:"Grievances",endpoint:()=>"/grievances",path:"grievances"},
 {title:"Payroll / Bank Changes",endpoint:()=>"/payroll-change-requests",path:"payroll-change-requests"},
 {title:"Data Change Requests",endpoint:()=>"/data-change-requests",path:"data-change-requests"},
 {title:"HR Service Requests",endpoint:()=>"/hr-service-requests",path:"hr-service-requests"},
 {title:"Flexible Work",endpoint:()=>"/flexible-work-requests",path:"flexible-work-requests"},
 {title:"Employee Transfers",endpoint:()=>"/employee-transfers",path:"employee-transfers"},
 {title:"Access Card Requests",endpoint:()=>"/access-card-requests",path:"access-card-requests"},
 {title:"Asset Requests",endpoint:()=>"/asset-requests",path:"asset-requests"},
 {title:"Transport Requests",endpoint:()=>"/transport-requests",path:"transport-requests"},
 {title:"Leave Encashment",endpoint:()=>"/leave-encashments",path:"leave-encashments"},
 {title:"Leave Donation",endpoint:()=>"/leave-donations",path:"leave-donations"},
 {title:"Employee Referrals",endpoint:()=>"/referrals",path:"referrals"},
 {title:"Tax Declarations",endpoint:()=>"/tax-declarations",path:"tax-declarations"},
 {title:"Employment Contracts",endpoint:()=>"/employment-contracts",path:"employment-contracts"},
];
const PENDING=new Set(["PENDING","SUBMITTED","UNDER_REVIEW","REQUESTED","DRAFT_PENDING","REVIEW_REQUIRED","ACTION_REQUIRED","MANAGER_PENDING","HR_PENDING"]);
const norm=(x:any)=>String(x??"").toUpperCase();
const rows=(data:any)=>Array.isArray(data)?data:Array.isArray(data?.content)?data.content:Array.isArray(data?.data)?data.data:[];

export default function ApprovalInboxPage(){
 const navigate=useNavigate();
 const role=useSelector((s:RootState)=>s.auth.session?.role||"EMPLOYEE");
 const [items,setItems]=useState<ApprovalItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[q,setQ]=useState(""),[source,setSource]=useState("ALL");
 const load=async()=>{
   setLoading(true);setError("");const out:ApprovalItem[]=[];
   const active=SOURCES.map(s=>({source:s,endpoint:s.endpoint(role)})).filter(x=>x.endpoint);
   const results=await Promise.allSettled(active.map(x=>api.get(x.endpoint!)));
   results.forEach((r,i)=>{
     if(r.status!=="fulfilled")return;
     const s=active[i].source;
     rows(r.value.data).filter((x:any)=>PENDING.has(norm(x.status))||!x.status).forEach((x:any,j:number)=>out.push({
       id:x.id??`${i}-${j}`,
       requestNumber:x.requestNumber||x.leaveRequestNumber||x.ticketNumber||x.id,
       employeeName:x.employeeName||x.requesterName||x.applicantName||x.userName||x.userId||x.employeeId,
       title:s.title,
       detail:x.reason||x.description||x.purpose||x.requestType||x.leaveType||x.projectName||x.status,
       status:x.status||"PENDING",path:s.path,source:s.title
     }));
   });
   setItems(out.sort((a,b)=>String(a.source).localeCompare(String(b.source))));
   if(!out.length)setError("No pending approvals are currently visible for your role.");
   setLoading(false);
 };
 useEffect(()=>{void load()},[role]);
 const filtered=useMemo(()=>items.filter(x=>(source==="ALL"||x.source===source)&&`${x.requestNumber} ${x.employeeName} ${x.title} ${x.detail} ${x.status}`.toLowerCase().includes(q.toLowerCase())),[items,q,source]);
 const counts=useMemo(()=>({total:items.length,high:items.filter(x=>["ACTION_REQUIRED","REVIEW_REQUIRED"].includes(norm(x.status))).length}),[items]);
 const heading=role==="MANAGER"?"Team Approval Inbox":role==="ADMIN"?"Admin Approval Inbox":"HR Approval Inbox";
 return <Box><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" alignItems={{md:"center"}} gap={2} mb={3}><Box><Stack direction="row" spacing={1} alignItems="center"><ApprovalRoundedIcon/><Typography variant="h4" fontWeight={800}>{heading}</Typography></Stack><Typography color="text.secondary">One role-aware queue for pending requests across connected HR workflows.</Typography></Box><Button variant="outlined" onClick={()=>void load()}>Refresh</Button></Stack>
 <Stack direction={{xs:"column",sm:"row"}} spacing={2} mb={3}><Card sx={{flex:1}}><CardContent><Typography color="text.secondary">Pending approvals</Typography><Typography variant="h4" fontWeight={800}>{counts.total}</Typography></CardContent></Card><Card sx={{flex:1}}><CardContent><Typography color="text.secondary">Needs attention</Typography><Typography variant="h4" fontWeight={800}>{counts.high}</Typography></CardContent></Card></Stack>
 {error&&<Alert sx={{mb:2}} severity={items.length?"info":"warning"}>{error}</Alert>}
 <Stack direction={{xs:"column",md:"row"}} spacing={2} mb={3}><TextField fullWidth size="small" label="Search approvals" value={q} onChange={e=>setQ(e.target.value)}/><TextField select fullWidth size="small" label="Workflow" SelectProps={{native:true}} value={source} onChange={e=>setSource(e.target.value)} sx={{minWidth:{md:280}}}><option value="ALL">All workflows</option>{SOURCES.map(s=><option key={s.title} value={s.title}>{s.title}</option>)}</TextField></Stack>
 {loading?<Stack alignItems="center" py={6}><CircularProgress/><Typography sx={{mt:2}} color="text.secondary">Loading approval inbox…</Typography></Stack>:<Stack spacing={2}>{filtered.map(x=><Card key={`${x.source}-${x.id}`}><CardContent><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" gap={2}><Box flex={1}><Stack direction="row" spacing={1} flexWrap="wrap" mb={1}><Chip size="small" label={x.source}/><Chip size="small" label={x.status} color={["ACTION_REQUIRED","REVIEW_REQUIRED"].includes(norm(x.status))?"error":"warning"}/><Chip size="small" label={x.requestNumber}/></Stack><Typography variant="h6" fontWeight={800}>{x.employeeName||"Employee"}</Typography><Typography color="text.secondary">{x.detail||x.title}</Typography></Box><Button variant="contained" onClick={()=>navigate(`/${role.toLowerCase()}/${x.path}`)}>Open & Review</Button></Stack></CardContent></Card>)}{!filtered.length&&!loading&&<Typography color="text.secondary">No matching pending approvals.</Typography>}</Stack>}
 </Box>
}
