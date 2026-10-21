import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { api } from "../services/api";

type Row = Record<string, any>;
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fields = ["basicSalary","hra","conveyance","medicalAllowance","specialAllowance","otherAllowance","pf","esi","professionalTax","tds","loanDeduction"];
const money = (v:any) => `₹${Number(v||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const text = (v:any) => v == null || v === "" ? "—" : String(v);

export default function PayrollManagementPage({mode="structures"}:{mode?:"structures"|"generate"}) {
 const session=useSelector((s:RootState)=>s.auth.session); const role=session?.role||"EMPLOYEE";
 const [tab,setTab]=useState(mode); const [structures,setStructures]=useState<Row[]>([]); const [employees,setEmployees]=useState<Row[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [editing,setEditing]=useState<Row|null>(null); const [modalOpen,setModalOpen]=useState(false); const emptyForm=()=>({employeeProfileId:"",effectiveFrom:new Date().toISOString().slice(0,10),...Object.fromEntries(fields.map(f=>[f,""]))});
 const [form,setForm]=useState<Row>(emptyForm());
 const [month,setMonth]=useState(months[new Date().getMonth()]); const [year,setYear]=useState(new Date().getFullYear()); const [generating,setGenerating]=useState(false); const [result,setResult]=useState<Row|null>(null);
 async function load(){setLoading(true);setError("");try{const [s,e]=await Promise.all([api.get("/salary-structures"),api.get("/employees")]);setStructures(Array.isArray(s.data)?s.data:[]);setEmployees(Array.isArray(e.data)?e.data:[]);}catch(e:any){setError(e?.response?.data?.message||"Unable to load payroll configuration");}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 const profileId=(r:Row)=>r.employeeProfileId ?? r.employeeProfile?.id; const employeeFor=(id:any)=>employees.find(e=>String(e.employeeProfileId??e.id)===String(id));
 const openEdit=(r?:Row)=>{setModalOpen(true);if(r){setEditing(r);setForm({id:r.id,employeeProfileId:profileId(r),effectiveFrom:r.effectiveFrom||"",...Object.fromEntries(fields.map(f=>[f,r[f] ?? ""]))})}else{setEditing(null);setForm(emptyForm())}};
 async function save(){
  setError("");
  try {
   if(!form.employeeProfileId){setError("Employee is required");return}
   const numericFields=Object.fromEntries(fields.map(f=>{
    const raw=form[f];
    const value=typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    return [f, Number.isFinite(value) ? value : 0];
   }));
   const earnings=fields.slice(0,6).reduce((n,f)=>n+Number(numericFields[f]||0),0);
   if(earnings<=0){setError("Enter a salary amount before saving. Basic Salary cannot be zero for a payroll salary structure.");return}
   const payload={
    ...(form.id ? {id:Number(form.id)} : {}),
    employeeProfileId:Number(form.employeeProfileId),
    effectiveFrom:form.effectiveFrom || null,
    ...numericFields
   };
   const response=editing
    ? await api.put(`/salary-structures/${editing.id}`,payload)
    : await api.post("/salary-structures",payload);

   // Keep the modal closed only after the server confirms the values it persisted.
   const saved=response.data || {};
   const persistedGross=fields.slice(0,6).reduce((n,f)=>n+Number(saved[f]||0),0);
   if(persistedGross<=0){
    setError("The server saved the salary structure with zero earnings. Please restart the HRMS backend and try again; no payroll record will be generated from this structure.");
    return;
   }
   setEditing(null);setModalOpen(false);
   await load();
  }catch(e:any){
   setError(e?.response?.data?.message||e?.response?.data?.error||e?.message||"Unable to save salary structure")
  }
 }
 async function archive(id:number){if(!window.confirm("Remove this salary structure? Existing generated salary records will remain."))return;try{await api.delete(`/salary-structures/${id}`);await load()}catch(e:any){setError(e?.response?.data?.message||"Unable to remove salary structure")}}
 async function generate(){if(!window.confirm(`Generate payroll for ${month} ${year}? Existing salary records will be skipped.`))return;setGenerating(true);setError("");setResult(null);try{const r=await api.post("/salaries/generate",{month,year});setResult(r.data);await load()}catch(e:any){setError(e?.response?.data?.message||"Unable to generate payroll")}finally{setGenerating(false)}}
 const totals=useMemo(()=>structures.reduce((a,r)=>{a.basic+=Number(r.basicSalary||0);a.gross+=Number(r.basicSalary||0)+Number(r.hra||0)+Number(r.conveyance||0)+Number(r.medicalAllowance||0)+Number(r.specialAllowance||0)+Number(r.otherAllowance||0);a.ded+=Number(r.pf||0)+Number(r.esi||0)+Number(r.professionalTax||0)+Number(r.tds||0)+Number(r.loanDeduction||0);return a},{basic:0,gross:0,ded:0}),[structures]);
 if(role!=="HR") return <Alert severity="error">Only HR can maintain salary structures or generate monthly payroll.</Alert>;
 return <div><div className="th-page-header"><div><h1>Payroll Management</h1><div className="th-breadcrumb">Dashboard <span>›</span> Payroll</div></div></div>{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
 <div className="th-card" style={{marginBottom:16}}><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className={tab==="structures"?"th-primary":"th-outline"} onClick={()=>setTab("structures")}>Salary Structures</button><button className={tab==="generate"?"th-primary":"th-outline"} onClick={()=>setTab("generate")}>Generate Payroll</button></div></div>
 {tab==="structures"?<><div className="th-grid th-stats-grid report-summary"><div className="th-card th-stat-card"><div className="th-card-title">Employees Configured</div><div className="th-stat-value">{structures.length}</div></div><div className="th-card th-stat-card"><div className="th-card-title">Monthly Gross</div><div className="th-stat-value">{money(totals.gross)}</div></div><div className="th-card th-stat-card"><div className="th-card-title">Monthly Deductions</div><div className="th-stat-value">{money(totals.ded)}</div></div><div className="th-card th-stat-card"><div className="th-card-title">Estimated Net</div><div className="th-stat-value">{money(totals.gross-totals.ded)}</div></div></div><div className="th-card table-card"><div className="table-toolbar"><div><strong>Salary Structures</strong><small>{structures.length} record{structures.length===1?"":"s"}</small></div><button className="th-primary" onClick={()=>openEdit()}>＋ Add Structure</button></div>{loading?<div className="th-loading"><CircularProgress size={22}/> Loading...</div>:<div className="table-scroll"><table><thead><tr><th>Employee</th><th>Basic</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Effective From</th><th>Action</th></tr></thead><tbody>{structures.map((r,i)=>{const ep=employeeFor(profileId(r));const gross=fields.slice(1,6).reduce((n,f)=>n+Number(r[f]||0),Number(r.basicSalary||0));const ded=fields.slice(6).reduce((n,f)=>n+Number(r[f]||0),0);return <tr key={r.id??i}><td><b>{text(ep?.fullName||r.employeeProfile?.fullName)}</b><small className="report-muted">{text(ep?.userId||r.employeeProfile?.userId)}</small></td><td>{money(r.basicSalary)}</td><td>{money(gross)}</td><td>{money(ded)}</td><td><b>{money(gross-ded)}</b></td><td>{text(r.effectiveFrom)}</td><td><button onClick={()=>openEdit(r)}>Edit</button><button className="danger" onClick={()=>archive(r.id)}>Remove</button></td></tr>})}</tbody></table></div>}</div></>:<div className="th-card" style={{padding:24}}><h2>Generate Monthly Payroll</h2><Link to={`/${role.toLowerCase()}/payroll-reconciliation`}>Open attendance and payroll reconciliation</Link><p className="th-muted">Generation requires a configured salary structure, an independently approved reconciliation and a reached payroll cutoff.</p><div className="report-filters"><label>Month<select value={month} onChange={e=>setMonth(e.target.value)}>{months.map(m=><option key={m}>{m}</option>)}</select></label><label>Year<input type="number" min="2000" max="2100" value={year} onChange={e=>setYear(Number(e.target.value))}/></label><button className="th-primary" onClick={generate} disabled={generating}>{generating?"Generating...":"Generate Payroll"}</button></div>{result&&<Alert severity="success" sx={{mt:2}}>Generated <b>{result.generated ?? 0}</b> salary records. Skipped <b>{result.skipped ?? 0}</b>.{result.errors?.length?` ${result.errors.length} records need attention.`:""}</Alert>}</div>}
 {modalOpen&&<div className="th-modal-backdrop" onClick={()=>{setModalOpen(false);setEditing(null)}}><div className="th-modal" onClick={e=>e.stopPropagation()}><div className="th-modal-header"><h2>{editing?.id?"Edit":"Add"} Salary Structure</h2><button className="th-outline" onClick={()=>{setModalOpen(false);setEditing(null)}}>Close</button></div><div className="th-form-grid"><label>Employee<select value={form.employeeProfileId??""} onChange={e=>setForm({...form,employeeProfileId:e.target.value})} disabled={!!editing}><option value="">Select Employee</option>{employees.filter(e=>e.profileId||e.employeeProfileId||e.id).map(e=><option key={e.employeeProfileId??e.profileId??e.id} value={e.employeeProfileId??e.profileId??e.id}>{e.fullName} ({e.userId})</option>)}</select></label>{fields.map(f=><label key={f}>{f.replace(/([A-Z])/g," $1")}<input type="number" min="0" step="0.01" value={form[f] ?? ""} onChange={e=>setForm(prev=>({...prev,[f]:e.target.value}))}/></label>)}<label>Effective From<input type="date" value={form.effectiveFrom||""} onChange={e=>setForm(prev=>({...prev,effectiveFrom:e.target.value}))}/></label></div><div className="th-card" style={{marginTop:12,padding:12}}><strong>Salary Preview</strong><small className="report-muted" style={{display:"block",marginTop:4}}>These are the exact values that will be sent to the payroll API.</small><div style={{display:"flex",gap:24,marginTop:8,flexWrap:"wrap"}}><span>Gross: <b>{money(fields.slice(0,6).reduce((n,f)=>n+Number(form[f]||0),0))}</b></span><span>Deductions: <b>{money(fields.slice(6).reduce((n,f)=>n+Number(form[f]||0),0))}</b></span><span>Net: <b>{money(fields.slice(0,6).reduce((n,f)=>n+Number(form[f]||0),0)-fields.slice(6).reduce((n,f)=>n+Number(form[f]||0),0))}</b></span></div></div><div className="th-header-actions"><button className="th-primary" onClick={save}>Save Structure</button></div></div></div>}</div>
}
