import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { authIdentity, errorText, periodToday } from "../utils/integrationForms";

type Policy = {reference:string;workingDays:string[];fullDayMinutes:number;halfDayMinutes:number;requireApprovedTimesheet:boolean;cutoffDay:number;leaveTreatment:Record<string,string>};
type Version = {id:number;reference:string;effectiveFrom:string;effectiveThrough?:string;status:string;createdBy:string;approvedBy?:string;policy:Policy};
const days=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];
const empty:Policy={reference:"",workingDays:[],fullDayMinutes:480,halfDayMinutes:240,requireApprovedTimesheet:true,cutoffDay:1,leaveTreatment:{}};
export default function PayrollPoliciesPage(){
 const [policy,setPolicy]=useState<Policy>(empty);const [from,setFrom]=useState(periodToday());const [through,setThrough]=useState("");
 const [rows,setRows]=useState<Version[]>([]);const [leaveKey,setLeaveKey]=useState("");const [leaveType,setLeaveType]=useState("PAID");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const role=authIdentity().role.toLowerCase();const me=authIdentity().userId;
 const refresh=async()=>{try{const {data}=await api.get<Version[]>("/payroll-policies");setRows(data);}catch(e){setMessage(errorText(e));}};
 useEffect(()=>{void refresh();},[]);
 const set=(patch:Partial<Policy>)=>setPolicy(v=>({...v,...patch}));
 const create=async()=>{setBusy(true);setMessage("");try{
  if(!policy.reference.trim())throw new Error("Enter the document number and version of the company-approved rules.");
  if(!policy.workingDays.length)throw new Error("Choose working days using your approved policy.");
  await api.post("/payroll-policies",{effectiveFrom:from,effectiveThrough:through||null,policy});
  setMessage("Draft created. A DIFFERENT HR/Admin must approve this exact version before it can be used in payroll.");
  setPolicy({...empty,reference:"",leaveTreatment:{}});await refresh();
 }catch(e){setMessage(errorText(e));}finally{setBusy(false);}};
 const approve=async(row:Version)=>{if(!window.confirm(`Confirm version ${row.reference} against the signed-off company policy and approve it? This cannot be edited afterward.`))return;
  setBusy(true);setMessage("");try{await api.post(`/payroll-policies/${row.id}/approve`);setMessage(`Policy ${row.reference} approved and locked.`);await refresh();}catch(e){setMessage(errorText(e));}finally{setBusy(false);}};
 return <Box><Stack direction={{xs:"column",sm:"row"}} gap={2} justifyContent="space-between" alignItems="center" mb={2}><Box><Typography variant="h4" fontWeight={800}>Company payroll policies</Typography><Typography color="text.secondary">HR-authored versions with independent approval and effective dates.</Typography></Box><Button component={Link} to={`/${role}/payroll-reconciliation`} variant="outlined">Back to payroll</Button></Stack>
 <Alert severity="warning" sx={{mb:2}}>These fields must be copied from signed-off BlueThink company policies. Example values are not approved. Do not enter invented PF, ESI, professional tax or TDS rates here: payroll uses the verified salary structure.</Alert>
 {message&&<Alert sx={{mb:2}} onClose={()=>setMessage("")}>{message}</Alert>}
 <Paper sx={{p:3,mb:3}}><Stack spacing={2}><Typography variant="h6">Create policy-version draft</Typography>
 <TextField label="Policy document reference / unique version" required value={policy.reference} inputProps={{maxLength:160}} onChange={e=>set({reference:e.target.value})} helperText="For any policy change, create a new reference (e.g. HR-ATTENDANCE-2026-V2)."/>
 <Stack direction={{xs:"column",sm:"row"}} gap={2}><TextField fullWidth type="month" label="Effective from" InputLabelProps={{shrink:true}} value={from} onChange={e=>setFrom(e.target.value)}/><TextField fullWidth type="month" label="Effective through (optional)" InputLabelProps={{shrink:true}} value={through} onChange={e=>setThrough(e.target.value)}/></Stack>
 <Box><Typography fontWeight={700}>Approved working days</Typography><Stack direction="row" flexWrap="wrap">{days.map(day=><FormControlLabel key={day} label={day.slice(0,3)} control={<Checkbox checked={policy.workingDays.includes(day)} onChange={e=>set({workingDays:e.target.checked?[...policy.workingDays,day]:policy.workingDays.filter(v=>v!==day)})}/>}/>)}</Stack></Box>
 <Stack direction={{xs:"column",md:"row"}} gap={2}>{([["fullDayMinutes","Full-day threshold (minutes)"],["halfDayMinutes","Half-day threshold (minutes)"],["cutoffDay","Payroll cutoff (day 1-28 of next month)"]] as const).map(([key,label])=><TextField key={key} fullWidth type="number" label={label} value={policy[key]} onChange={e=>set({[key]:Number(e.target.value)})}/>)}</Stack>
 <FormControlLabel control={<Checkbox checked={policy.requireApprovedTimesheet} onChange={e=>set({requireApprovedTimesheet:e.target.checked})}/>} label="Require approved timesheet in addition to attendance"/>
 <Typography fontWeight={700}>Leave treatments in company policy</Typography><Stack direction={{xs:"column",sm:"row"}} gap={1}><TextField label="Leave type code" value={leaveKey} onChange={e=>setLeaveKey(e.target.value.toUpperCase())} fullWidth/><TextField select label="Treatment" value={leaveType} onChange={e=>setLeaveType(e.target.value)} sx={{minWidth:170}}>{["PAID","UNPAID","PROJECT_OFF"].map(v=><MenuItem key={v} value={v}>{v}</MenuItem>)}</TextField><Button disabled={!leaveKey.trim()} onClick={()=>{set({leaveTreatment:{...policy.leaveTreatment,[leaveKey.trim()]:leaveType}});setLeaveKey("");}}>Add</Button></Stack>
 <Stack direction="row" gap={1} flexWrap="wrap">{Object.entries(policy.leaveTreatment).map(([k,v])=><Chip key={k} label={`${k}: ${v}`} onDelete={()=>{const next={...policy.leaveTreatment};delete next[k];set({leaveTreatment:next});}}/>)}</Stack>
 <Button disabled={busy||!policy.reference.trim()||!policy.workingDays.length} variant="contained" onClick={()=>void create()}>Save unapproved draft</Button></Stack></Paper>
 <Typography variant="h6" mb={2}>Policy version registry</Typography><Stack spacing={2}>{rows.map(row=><Paper key={row.id} sx={{p:2}}><Stack direction={{xs:"column",sm:"row"}} gap={2} justifyContent="space-between" alignItems={{sm:"center"}}><Box><Typography fontWeight={800}>{row.reference}</Typography><Typography variant="body2">Effective {row.effectiveFrom} to {row.effectiveThrough||"open ended"}</Typography><Typography variant="caption">Draft by {row.createdBy} · Approved by {row.approvedBy||"pending"}</Typography><Typography variant="caption" display="block">{row.policy.workingDays.join(", ")} · full {row.policy.fullDayMinutes} min · half {row.policy.halfDayMinutes} min · cutoff {row.policy.cutoffDay} · timesheet {row.policy.requireApprovedTimesheet?"required":"optional"} · leaves {JSON.stringify(row.policy.leaveTreatment)}</Typography></Box><Stack direction="row" gap={1} alignItems="center"><Chip label={row.status} size="small" color={row.status==="APPROVED"?"success":"warning"}/>{row.status==="DRAFT"&&<Button disabled={busy||row.createdBy===me} onClick={()=>void approve(row)}>Approve</Button>}</Stack></Stack></Paper>)}</Stack>
 {!rows.length&&<Alert severity="info">No payroll policy versions registered yet.</Alert>}
 </Box>;
}
