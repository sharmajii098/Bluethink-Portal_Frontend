import { FormEvent, useEffect, useMemo, useState } from "react";
import { AddRounded, BlockRounded, CheckCircleOutlineRounded, EditRounded, FilterAltRounded, PeopleAltRounded, RefreshRounded, VisibilityRounded } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { api } from "../services/api";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type Row = Record<string, any>;
const text = (v:any) => v == null || v === "" ? "—" : String(v);
const statuses = ["ACTIVE", "INACTIVE"];

// Ready-to-use choices, while still allowing a department that is not in the catalogue.
// Names match the existing backend defaults where they already exist.
const departmentTemplates: Record<string, { description: string; designations: string[] }> = {
  "Human Resources": { description: "Recruitment, employee relations, policies and people operations.", designations: ["HR Manager", "Senior HR Manager", "HR Executive", "Recruiter", "HR Business Partner"] },
  "IT": { description: "Technology, application development and IT infrastructure.", designations: ["IT Manager", "Software Developer", "Senior Developer", "Tech Lead", "QA Engineer", "System Administrator"] },
  "Finance": { description: "Accounts, financial reporting, budgeting and compliance.", designations: ["Finance Manager", "Accountant", "Financial Analyst", "Accounts Executive"] },
  "Sales": { description: "Sales operations, customer acquisition and business growth.", designations: ["Sales Manager", "Sales Executive", "Business Development", "Sales Coordinator"] },
  "Marketing": { description: "Brand marketing, campaigns and digital communications.", designations: ["Marketing Manager", "Digital Marketing", "Content Writer", "SEO Executive", "Graphic Designer"] },
  "Operations": { description: "Daily business operations, delivery and process management.", designations: ["Operations Manager", "Operations Executive", "Team Lead", "Operations Associate"] },
  "Production": { description: "Production planning, manufacturing and quality standards.", designations: ["Production Manager", "Production Supervisor", "Production Executive", "Quality Inspector"] },
  "Dispatch": { description: "Order dispatch, packaging and shipment coordination.", designations: ["Dispatch Manager", "Dispatch Supervisor", "Dispatch Executive", "Packing Associate"] },
  "Customer Support": { description: "Customer enquiries, service and post-sale support.", designations: ["Support Manager", "Customer Support Executive", "Customer Success Associate"] },
  "Administration": { description: "Office administration, facilities and coordination.", designations: ["Administration Manager", "Office Administrator", "Admin Executive"] },
  "Design": { description: "Creative design, artwork and visual production.", designations: ["Design Manager", "Senior Designer", "Graphic Designer", "Product Designer"] },
  "Quality Assurance": { description: "Product and process quality checks and improvement.", designations: ["QA Manager", "QA Engineer", "Quality Inspector", "QA Executive"] },
  "Procurement": { description: "Vendor coordination, purchasing and sourcing.", designations: ["Procurement Manager", "Purchase Executive", "Sourcing Specialist"] },
  "Logistics": { description: "Transportation, warehousing and logistics operations.", designations: ["Logistics Manager", "Warehouse Supervisor", "Logistics Executive"] },
};
const fallbackDesignations = ["Manager", "Senior Manager", "Team Lead", "Executive", "Associate"];
const selectedDesignations = (value: unknown): string[] => String(value || "").split(",").map(x => x.trim()).filter(Boolean);


export default function DepartmentManagementPage() {
  const role = useSelector((s: RootState) => s.auth.session?.role || "EMPLOYEE");
  const canManage = role === "ADMIN" || role === "HR";
  const [rows,setRows] = useState<Row[]>([]), [employees,setEmployees] = useState<Row[]>([]);
  const [loading,setLoading] = useState(true), [saving,setSaving] = useState(false), [error,setError] = useState("");
  const [query,setQuery] = useState(""), [status,setStatus] = useState("");
  const [open,setOpen] = useState(false), [view,setView] = useState<Row|null>(null), [editing,setEditing] = useState<Row|null>(null);
  const [form,setForm] = useState<Row>({departmentName:"",description:"",status:"ACTIVE",designationsText:""});
  const [departmentChoice,setDepartmentChoice] = useState("");
  const [descriptionMode,setDescriptionMode] = useState("suggested");
  const [designationChoice,setDesignationChoice] = useState("");
  const [customDesignation,setCustomDesignation] = useState("");
  const [customDesignationOpen,setCustomDesignationOpen] = useState(false);
  const [modalError,setModalError] = useState("");
  const designationOptions = useMemo(() => {
    const template = departmentTemplates[String(form.departmentName || "")]?.designations || fallbackDesignations;
    const saved = rows.find(d => String(d.departmentName).toLowerCase() === String(form.departmentName || "").toLowerCase());
    return [...new Set([...template, ...(saved?.designations || []), ...selectedDesignations(form.designationsText)])];
  }, [form.departmentName, form.designationsText, rows]);
  function addDesignation(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = selectedDesignations(form.designationsText);
    if (!current.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
      setForm(previous => ({...previous, designationsText: [...current, trimmed].join(", ")}));
    }
    setDesignationChoice("");
    setCustomDesignation("");
    setCustomDesignationOpen(false);
  }
  function removeDesignation(name: string) {
    setForm(previous => ({...previous, designationsText: selectedDesignations(previous.designationsText).filter(x => x !== name).join(", ")}));
  }
  function chooseDepartment(value: string) {
    setDepartmentChoice(value);
    const name = value === "CUSTOM" ? "" : value;
    setForm(previous => ({...previous, departmentName: name, description: departmentTemplates[name]?.description || "", designationsText: ""}));
    setDescriptionMode("suggested");
    setDesignationChoice("");
    setCustomDesignation("");
    setCustomDesignationOpen(false);
    setModalError("");
  }
  function chooseDescription(value: string) {
    setDescriptionMode(value);
    setForm(previous => ({...previous, description: value === "suggested" ? departmentTemplates[String(previous.departmentName)]?.description || "" : ""}));
  }

  async function load(){
    setLoading(true); setError("");
    try {
      const calls:[any,any?] = canManage ? [api.get("/departments"),api.get("/employees")] : [api.get("/departments"),undefined];
      const d=await calls[0]; setRows(Array.isArray(d.data)?d.data:[]);
      if(calls[1]) { const e=await calls[1]; setEmployees(Array.isArray(e.data)?e.data:[]); }
    } catch(e:any){ setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load departments"); }
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[canManage]);

  const counts=useMemo(()=>{
    const m=new Map<string,number>();
    employees.forEach(e=>{if(e.department)m.set(e.department,(m.get(e.department)||0)+1);});
    return m;
  },[employees]);
  const managers=useMemo(()=>{
    const m=new Map<string,string[]>();
    employees.filter(e=>String(e.role||"").toUpperCase()==="MANAGER" && e.department).forEach(e=>{const a=m.get(e.department)||[];a.push(e.fullName);m.set(e.department,a);});
    return m;
  },[employees]);
  const filtered=useMemo(()=>rows.filter(d=>{
    const q=query.trim().toLowerCase();
    return (!q || [d.departmentName,d.description,...(d.designations||[])].some(v=>String(v||"").toLowerCase().includes(q))) && (!status || String(d.status||"").toUpperCase()===status);
  }),[rows,query,status]);
  const stats=useMemo(()=>({total:rows.length,active:rows.filter(d=>String(d.status).toUpperCase()==="ACTIVE").length,inactive:rows.filter(d=>String(d.status).toUpperCase()==="INACTIVE").length,assigned:rows.filter(d=>(counts.get(d.departmentName)||0)>0).length}),[rows,counts]);

  function openCreate(){
    setEditing(null); setForm({departmentName:"",description:"",status:"ACTIVE",designationsText:""});
    setDepartmentChoice(""); setDescriptionMode("suggested"); setDesignationChoice("");
    setCustomDesignation(""); setCustomDesignationOpen(false); setModalError(""); setOpen(true);
  }
  function openEdit(d:Row){
    setEditing(d); setForm({...d,designationsText:Array.isArray(d.designations)?d.designations.join(", "):""});
    setDepartmentChoice(departmentTemplates[String(d.departmentName)] ? String(d.departmentName) : "CUSTOM");
    setDescriptionMode(!d.description ? "none" : d.description === departmentTemplates[String(d.departmentName)]?.description ? "suggested" : "custom");
    setDesignationChoice(""); setCustomDesignation(""); setCustomDesignationOpen(false); setModalError(""); setOpen(true);
  }
  async function save(e:FormEvent){e.preventDefault();setSaving(true);setModalError("");try{
    const payload={departmentName:String(form.departmentName||"").trim(),description:String(form.description||"").trim(),status:form.status||"ACTIVE",designations:selectedDesignations(form.designationsText)};
    if(!payload.departmentName) throw new Error("Please select a department name or enter a custom name.");
    if(rows.some(d => d.id !== editing?.id && String(d.departmentName).trim().toLowerCase() === payload.departmentName.toLowerCase())) throw new Error("This department already exists. Open it using Edit instead of creating a duplicate.");
    if(editing) await api.put(`/departments/${editing.id}`,payload); else await api.post("/departments",payload);
    setOpen(false);await load();
  }catch(e:any){setModalError(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Could not save department");}finally{setSaving(false);}}
  async function archive(d:Row){
    const used=counts.get(d.departmentName)||0;
    if(used>0){setError(`Cannot archive ${d.departmentName}: ${used} employee(s) are assigned. Reassign them first.`);return;}
    if(!window.confirm(`Archive ${d.departmentName}?`))return;
    try{await api.delete(`/departments/${d.id}`);await load();}catch(e:any){setError(e?.response?.data?.message||"Department archive failed");}
  }
  async function activate(d:Row){try{await api.put(`/departments/${d.id}`,{...d,status:"ACTIVE"});await load();}catch(e:any){setError(e?.response?.data?.message||"Department activation failed");}}

  return <div>
    <div className="th-page-header"><div><h1>Department Management</h1><div className="th-breadcrumb">Organization <span>/</span> {filtered.length} visible</div></div><div className="th-header-actions">{canManage&&<button className="th-primary" onClick={openCreate}><AddRounded fontSize="small"/> Add Department</button>}<button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button></div></div>
    {error&&<div className="role-alert"><b>Department operation failed</b><span>{error}</span></div>}
    <div className="stats-grid employee-stats"><div className="th-card stat-card"><span>Total Departments</span><strong>{stats.total}</strong></div><div className="th-card stat-card"><span>Active</span><strong>{stats.active}</strong></div><div className="th-card stat-card"><span>Inactive</span><strong>{stats.inactive}</strong></div><div className="th-card stat-card"><span>With Employees</span><strong>{stats.assigned}</strong></div></div>
    <div className="th-card report-filter-card"><div className="report-filter-title"><FilterAltRounded fontSize="small"/> Department Filters</div><div className="report-filters"><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Department, description, designation…"/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(x=><option key={x}>{x}</option>)}</select></label></div></div>
    <div className="th-card table-card">{loading?<div className="th-loading"><CircularProgress size={22}/> Loading departments…</div>:filtered.length===0?<div className="empty-state"><h3>No departments found</h3><p>Try changing the filters.</p></div>:<div className="table-scroll"><table><thead><tr><th>Department</th><th>Employees</th><th>Department Managers</th><th>Designations</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(d=><tr key={d.id}><td><b>{text(d.departmentName)}</b><small className="report-muted">{text(d.description)}</small></td><td><span className="status active"><PeopleAltRounded fontSize="small"/> {counts.get(d.departmentName)||0}</span></td><td>{(managers.get(d.departmentName)||[]).join(", ")||"—"}</td><td>{Array.isArray(d.designations)&&d.designations.length?d.designations.join(", "):"—"}</td><td><span className={`status ${String(d.status||"").toLowerCase()}`}>{text(d.status)}</span></td><td><div className="row-actions"><button className="icon-btn" title="View employees" onClick={()=>setView(d)}><VisibilityRounded fontSize="small"/></button>{canManage&&<button className="icon-btn" title="Edit department" onClick={()=>openEdit(d)}><EditRounded fontSize="small"/></button>}{canManage&&String(d.status).toUpperCase()==="ACTIVE"&&<button className="icon-btn danger" title="Archive" onClick={()=>archive(d)}><BlockRounded fontSize="small"/></button>}{canManage&&String(d.status).toUpperCase()==="INACTIVE"&&<button className="icon-btn" title="Activate" onClick={()=>activate(d)}><CheckCircleOutlineRounded fontSize="small"/></button>}</div></td></tr>)}</tbody></table></div>}</div>
    {view&&<div className="th-modal-backdrop"><div className="th-modal employee-detail-modal"><div className="th-modal-head"><div><h2>{view.departmentName}</h2><small className="th-muted">{text(view.description)}</small></div><button onClick={()=>setView(null)}>×</button></div><div className="detail-grid"><div className="detail-item"><small>Employees</small><strong>{counts.get(view.departmentName)||0}</strong></div><div className="detail-item"><small>Managers</small><strong>{(managers.get(view.departmentName)||[]).join(", ")||"—"}</strong></div><div className="detail-item"><small>Status</small><strong>{text(view.status)}</strong></div><div className="detail-item"><small>Designations</small><strong>{Array.isArray(view.designations)&&view.designations.length?view.designations.join(", "):"—"}</strong></div></div><h3>Department Employees</h3><div className="table-scroll"><table><thead><tr><th>Name</th><th>User ID</th><th>Designation</th><th>Role</th><th>Status</th></tr></thead><tbody>{employees.filter(e=>e.department===view.departmentName).map(e=><tr key={e.id}><td>{text(e.fullName)}</td><td>{text(e.userId)}</td><td>{text(e.designation)}</td><td>{text(e.role)}</td><td>{text(e.status)}</td></tr>)}{!employees.some(e=>e.department===view.departmentName)&&<tr><td colSpan={5}>No employees assigned.</td></tr>}</tbody></table></div><div className="th-modal-actions"><button className="th-outline" onClick={()=>setView(null)}>Close</button></div></div></div>}
    {open&&<div className="th-modal-backdrop"><form className="th-modal department-dropdown-modal" onSubmit={save}><div className="th-modal-head"><div><h2>{editing?"Edit Department":"Add Department"}</h2><small className="th-muted">Choose from dropdowns, or use Custom for a new option.</small></div><button type="button" aria-label="Close department form" onClick={()=>setOpen(false)}>×</button></div>
      {modalError&&<div role="alert" className="department-form-error">{modalError}</div>}
      <div className="th-form-grid">
        <label>Department Name *
          <select value={departmentChoice} onChange={e=>chooseDepartment(e.target.value)} required>
            <option value="" disabled>Select department</option>
            {Object.keys(departmentTemplates).map(name=><option key={name} value={name} disabled={rows.some(d=>d.id !== editing?.id && String(d.departmentName).trim().toLowerCase()===name.toLowerCase())}>{name}{rows.some(d=>d.id !== editing?.id && String(d.departmentName).trim().toLowerCase()===name.toLowerCase())?" (already created)":""}</option>)}
            <option value="CUSTOM">+ Other / Custom Department</option>
          </select>
          {departmentChoice==="CUSTOM"&&<input className="department-custom-input" value={form.departmentName??""} onChange={e=>setForm(prev=>({...prev,departmentName:e.target.value,description:descriptionMode==="suggested"?"":prev.description}))} placeholder="Enter department name" maxLength={120} aria-label="Custom department name" required/>}
        </label>
        <label>Status
          <select value={form.status??"ACTIVE"} onChange={e=>setForm(prev=>({...prev,status:e.target.value}))}>{statuses.map(x=><option key={x} value={x}>{x}</option>)}</select>
        </label>
        <label className="full-field">Description
          <select value={descriptionMode} onChange={e=>chooseDescription(e.target.value)}>
            <option value="suggested">Suggested department description</option>
            <option value="custom">Custom description</option>
            <option value="none">No description</option>
          </select>
          {descriptionMode==="suggested"&&<span className="department-description-preview">{form.description||"Choose a department to load its description. You can choose Custom description instead."}</span>}
          {descriptionMode==="custom"&&<textarea rows={3} value={form.description??""} onChange={e=>setForm(prev=>({...prev,description:e.target.value}))} placeholder="Enter a description"/>}
        </label>
        <div className="full-field department-designations-field">
          <label htmlFor="department-designation-select">Designations <small className="th-muted">Select as many as needed</small></label>
          <select id="department-designation-select" value={designationChoice} onChange={e=>{
            const value=e.target.value;setDesignationChoice("");
            if(value==="CUSTOM") {setCustomDesignationOpen(true);return;}
            if(value) addDesignation(value);
          }} disabled={!String(form.departmentName||"").trim()}>
            <option value="">Select designation to add</option>
            {designationOptions.filter(name=>!selectedDesignations(form.designationsText).some(selected=>selected.toLowerCase()===name.toLowerCase())).map(name=><option key={name} value={name}>{name}</option>)}
            <option value="CUSTOM">+ Other / Custom Designation</option>
          </select>
          {customDesignationOpen&&<div className="department-custom-designation"><input value={customDesignation} onChange={e=>setCustomDesignation(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addDesignation(customDesignation);}}} placeholder="Enter new designation" maxLength={120} aria-label="Custom designation"/><button className="th-outline" type="button" onClick={()=>addDesignation(customDesignation)} disabled={!customDesignation.trim()}>Add</button><button className="th-outline" type="button" onClick={()=>{setCustomDesignationOpen(false);setCustomDesignation("");}}>Cancel</button></div>}
          <div className="department-selected-designations" aria-label="Selected designations">{selectedDesignations(form.designationsText).length===0?<span className="department-no-designations">No designations selected. The existing backend will use its defaults if left empty.</span>:selectedDesignations(form.designationsText).map(name=><span className="department-designation-chip" key={name}>{name}<button type="button" aria-label={`Remove ${name}`} onClick={()=>removeDesignation(name)}>×</button></span>)}</div>
        </div>
      </div>
      <div className="th-modal-actions"><button type="button" className="th-outline" onClick={()=>setOpen(false)}>Cancel</button><button className="th-primary" disabled={saving}>{saving?"Saving…":editing?"Save Changes":"Create Department"}</button></div></form></div>}
  </div>;
}
