import { useEffect, useMemo, useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { api } from "../services/api";

type Row = Record<string, any>;
type Tab = "types" | "policies" | "holidays" | "balances";

const tabs: { key: Tab; label: string }[] = [
  { key: "types", label: "Leave Types" },
  { key: "policies", label: "Policies" },
  { key: "holidays", label: "Holiday Calendar" },
  { key: "balances", label: "Leave Balances" },
];

export default function LeaveConfigurationPage() {
  const [tab, setTab] = useState<Tab>("types");
  const [rows, setRows] = useState<Row[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [form, setForm] = useState<Row>({});

  const endpoint = useMemo(() => ({ types: "/leave-types", policies: "/leave-policies", holidays: "/holidays", balances: null }[tab]), [tab]);

  async function load() {
    setLoading(true); setError("");
    try {
      const requests: Promise<any>[] = [api.get("/leave-types"), api.get("/employees")];
      if (endpoint) requests.push(api.get(endpoint));
      else if (form.employeeId) requests.push(api.get(`/leave-balances/${form.employeeId}`));
      const results = await Promise.all(requests);
      setLeaveTypes(Array.isArray(results[0].data) ? results[0].data : []);
      setEmployees(Array.isArray(results[1].data) ? results[1].data : []);
      if (endpoint) setRows(Array.isArray(results[2].data) ? results[2].data : []);
    } catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load leave configuration"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [tab]);

  const filtered = rows.filter(r => {
    const text = JSON.stringify(r).toLowerCase();
    const q = query.trim().toLowerCase();
    const active = tab === "types" && status !== "ALL" ? String(r.isActive) === status : true;
    return (!q || text.includes(q)) && active;
  });

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }
  function openForm(row: Row = {}) {
    setEditing(row.id ? row : null);
    if (tab === "types") setForm({ name: row.name || "", code: row.code || "", defaultDays: row.defaultDays ?? 0, isActive: row.isActive !== false });
    if (tab === "policies") setForm({ name: row.name || "", accrualRate: row.accrualRate ?? 0, maxCarryOver: row.maxCarryOver ?? 0, requiresApproval: row.requiresApproval !== false, leaveTypeId: row.leaveType?.id || "" });
    if (tab === "holidays") setForm({ holidayDate: row.holidayDate || "", holidayName: row.holidayName || "" });
    if (tab === "balances") setForm({ employeeId: "", leaveTypeId: "", year: new Date().getFullYear(), delta: 0, reason: "" });
    setOpen(true);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      if (tab === "types") await api.request({ method: editing ? "put" : "post", url: editing ? `/leave-types/${editing.id}` : "/leave-types", data: { ...form, defaultDays: Number(form.defaultDays), isActive: Boolean(form.isActive) } });
      if (tab === "policies") await api.request({ method: editing ? "put" : "post", url: editing ? `/leave-policies/${editing.id}` : "/leave-policies", data: { name: form.name, accrualRate: Number(form.accrualRate), maxCarryOver: Number(form.maxCarryOver), requiresApproval: Boolean(form.requiresApproval), leaveType: { id: Number(form.leaveTypeId) } } });
      if (tab === "holidays") await api.post("/holidays", { holidayDate: form.holidayDate, holidayName: form.holidayName });
      if (tab === "balances") await api.post("/leave-balance/adjust", { employeeId: Number(form.employeeId), leaveTypeId: Number(form.leaveTypeId), year: Number(form.year), delta: Number(form.delta), reason: form.reason });
      setOpen(false); setForm({}); setEditing(null); await load();
    } catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Save failed"); }
    finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!window.confirm(tab === "types" ? "Archive this leave type?" : "Delete this record?")) return;
    try {
      if (tab === "types") await api.put(`/leave-types/${id}`, { ...rows.find(r => r.id === id), isActive: false });
      if (tab === "policies") await api.delete(`/leave-policies/${id}`);
      if (tab === "holidays") await api.delete(`/holidays/${id}`);
      await load();
    } catch (e: any) { setError(e?.response?.data?.message || "Action failed"); }
  }

  return <div className="th-page">
    <div className="page-header"><div><h1>Leave Configuration</h1><p>Configure leave rules, holidays and employee balances.</p></div>{tab !== "balances" || true ? <button className="primary-btn" onClick={() => openForm()}>+ {tab === "balances" ? "Adjust Balance" : tab === "holidays" ? "Add Holiday" : tab === "policies" ? "Add Policy" : "Add Leave Type"}</button> : null}</div>
    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
    <div className="th-card" style={{ marginBottom: 16 }}><div className="tab-row">{tabs.map(t => <button key={t.key} className={tab === t.key ? "tab active" : "tab"} onClick={() => { setTab(t.key); setRows([]); setQuery(""); }}>{t.label}</button>)}</div></div>
    {tab !== "balances" && <div className="th-card table-card"><div className="table-toolbar"><div><strong>{tabs.find(t => t.key === tab)?.label}</strong><small>{filtered.length} record{filtered.length === 1 ? "" : "s"}</small></div><div className="toolbar-filters"><input placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} />{tab === "types" && <select value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>}</div></div>{loading ? <div className="th-loading"><CircularProgress size={26}/><span>Loading...</span></div> : <div className="table-scroll"><table><thead><tr>{tab === "types" ? <><th>Name</th><th>Code</th><th>Default Days</th><th>Status</th><th>Actions</th></> : tab === "policies" ? <><th>Name</th><th>Leave Type</th><th>Accrual/Year</th><th>Carry Over</th><th>Approval</th><th>Actions</th></> : <><th>Date</th><th>Holiday</th><th>Actions</th></>}</tr></thead><tbody>{filtered.map(r => <tr key={r.id}>{tab === "types" ? <><td>{r.name}</td><td>{r.code}</td><td>{r.defaultDays ?? 0}</td><td><span className={`status ${r.isActive === false ? "inactive" : "active"}`}>{r.isActive === false ? "Inactive" : "Active"}</span></td><td className="actions"><button onClick={() => openForm(r)}>Edit</button>{r.isActive !== false && <button className="danger" onClick={() => remove(r.id)}>Archive</button>}</td></> : tab === "policies" ? <><td>{r.name}</td><td>{r.leaveType?.name || "-"}</td><td>{r.accrualRate ?? 0}</td><td>{r.maxCarryOver ?? 0}</td><td>{r.requiresApproval === false ? "No" : "Yes"}</td><td className="actions"><button onClick={() => openForm(r)}>Edit</button><button className="danger" onClick={() => remove(r.id)}>Delete</button></td></> : <><td>{r.holidayDate}</td><td>{r.holidayName}</td><td className="actions"><button className="danger" onClick={() => remove(r.id)}>Delete</button></td></>}</tr>)}</tbody></table></div>}</div>}
    {tab === "balances" && <BalanceViewer employees={employees} leaveTypes={leaveTypes} />}
    {open && <div className="modal-backdrop"><div className="th-card modal-card"><div className="modal-header"><h2>{editing ? "Edit" : "Add"} {tab === "types" ? "Leave Type" : tab === "policies" ? "Leave Policy" : tab === "holidays" ? "Holiday" : "Leave Balance"}</h2><button onClick={() => setOpen(false)}>×</button></div><div className="form-grid">
      {tab === "types" && <><Field label="Name" value={form.name} onChange={v => set("name",v)} /><Field label="Code" value={form.code} onChange={v => set("code",v.toUpperCase())} /><Field label="Default Days" type="number" value={form.defaultDays} onChange={v => set("defaultDays",v)} /><label><span>Active</span><input type="checkbox" checked={form.isActive !== false} onChange={e => set("isActive",e.target.checked)} /></label></>}
      {tab === "policies" && <><Field label="Policy Name" value={form.name} onChange={v => set("name",v)} /><Select label="Leave Type" value={form.leaveTypeId} options={leaveTypes.map(x => ({value:x.id,label:`${x.name} (${x.code})`}))} onChange={v => set("leaveTypeId",v)} /><Field label="Accrual Days / Year" type="number" value={form.accrualRate} onChange={v => set("accrualRate",v)} /><Field label="Max Carry Over" type="number" value={form.maxCarryOver} onChange={v => set("maxCarryOver",v)} /><label><span>Requires Approval</span><input type="checkbox" checked={form.requiresApproval !== false} onChange={e => set("requiresApproval",e.target.checked)} /></label></>}
      {tab === "holidays" && <><Field label="Holiday Date" type="date" value={form.holidayDate} onChange={v => set("holidayDate",v)} /><Field label="Holiday Name" value={form.holidayName} onChange={v => set("holidayName",v)} /></>}
      {tab === "balances" && <><Select label="Employee" value={form.employeeId} options={employees.map(x => ({value:x.id,label:`${x.fullName || x.name || "Employee"} (${x.userId || x.email || ""})`}))} onChange={v => set("employeeId",v)} /><Select label="Leave Type" value={form.leaveTypeId} options={leaveTypes.map(x => ({value:x.id,label:`${x.name} (${x.code})`}))} onChange={v => set("leaveTypeId",v)} /><Field label="Year" type="number" value={form.year} onChange={v => set("year",v)} /><Field label="Adjustment (+/- days)" type="number" value={form.delta} onChange={v => set("delta",v)} /><Field label="Reason" value={form.reason} onChange={v => set("reason",v)} /></>}
    </div><div className="modal-actions"><button onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></div></div></div>}
  </div>;
}

function BalanceViewer({ employees, leaveTypes }: { employees: Row[]; leaveTypes: Row[] }) {
  const [employeeId, setEmployeeId] = useState(""); const [year, setYear] = useState(String(new Date().getFullYear())); const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function load() { if (!employeeId) return; setLoading(true); setError(""); try { const r = await api.get(`/leave-balances/${employeeId}`); setRows(Array.isArray(r.data) ? r.data.filter((x:any) => String(x.year) === year) : []); } catch(e:any){ setError(e?.response?.data?.message || "Unable to load balance"); } finally {setLoading(false);} }
  return <div className="th-card"><div className="table-toolbar"><div><strong>Employee Leave Balance</strong><small>Review current-year balances before adjusting.</small></div><div className="toolbar-filters"><select value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.fullName || e.name} ({e.userId || e.email})</option>)}</select><input type="number" value={year} onChange={e=>setYear(e.target.value)} style={{width:100}}/><button onClick={load}>View</button></div></div>{error && <Alert severity="error">{error}</Alert>}{loading ? <div className="th-loading"><CircularProgress size={25}/></div> : <div className="leave-balance-grid">{rows.length ? rows.map(r=><div className="th-card leave-balance-card" key={r.id}><small>{r.leaveType?.name || r.leaveType || "Leave"} {r.leaveType?.code || r.code ? `(${r.leaveType?.code || r.code})` : ""}</small><strong>{r.balance ?? 0}</strong><span>Available • {r.year}</span></div>) : <div className="empty-state">Select an employee and click View.</div>}</div>}</div>;
}
function Field({label,value,onChange,type="text"}:{label:string;value:any;onChange:(v:string)=>void;type?:string}){return <label><span>{label}</span><input type={type} value={value ?? ""} onChange={e=>onChange(e.target.value)} /></label>}
function Select({label,value,options,onChange}:{label:string;value:any;options:{value:any;label:string}[];onChange:(v:string)=>void}){return <label><span>{label}</span><select value={value ?? ""} onChange={e=>onChange(e.target.value)}><option value="">Select...</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}
