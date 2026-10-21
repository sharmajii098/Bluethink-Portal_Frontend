import { Link } from "react-router-dom";
import { downloadBrandedCsv } from "../utils/brandedExport";
import { useEffect, useMemo, useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { DownloadRounded, RefreshRounded } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { api } from "../services/api";
import type { RootState } from "../store";
import PaginationBar from "../components/PaginationBar";

type Row = Record<string, any>;
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const money = (v: any) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const text = (v: any) => v === null || v === undefined || v === "" ? "—" : String(v);

function csvDownload(rows: Row[], name: string) {
  if (!rows.length) return;
  const keys = ["employeeCode","employeeName","department","designation","month","year","basicSalary","hra","allowance","bonus","deductions","grossSalary","netSalary","paymentStatus","paymentDate"];
  const csv = [keys, ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replaceAll('"','""')}"`))].map(r => r.join(",")).join("\n");
  void downloadBrandedCsv(csv, name);
}

export default function SalaryPage() {
  const session = useSelector((s: RootState) => s.auth.session);
  const role = session?.role || "EMPLOYEE";
  const managementView = role === "ADMIN" || role === "HR";
  const managerView = role === "MANAGER";
  const canGenerate = role === "HR";
  const canManual = false; // Financial records are immutable; use Payroll Reconciliation.
  const now = new Date();
  const [month, setMonth] = useState(now.toLocaleString("en-US", { month: "long" }));
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [manualRows, setManualRows] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEditing, setManualEditing] = useState<Row | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const blankManual = () => ({ employeeId: "", basicSalary: "", hra: "", allowance: "", bonus: "", deductions: "", month, year: String(year), paymentStatus: "PENDING" });
  const [manualForm, setManualForm] = useState<any>(blankManual());

  async function load() {
    setLoading(true); setError("");
    try {
      if (managementView) {
        const response = await api.get("/salaries/monthly", { params: { month, year } });
        setRows(Array.isArray(response.data) ? response.data : []);
      } else if (managerView) {
        const [mine, team] = await Promise.all([
          api.get("/salaries/my"),
          api.get("/salaries/team", { params: { month, year } })
        ]);
        const ownRows = Array.isArray(mine.data) ? mine.data.filter(r => String(r.month).toLowerCase() === month.toLowerCase() && Number(r.year) === Number(year)) : [];
        const teamRows = Array.isArray(team.data) ? team.data : [];
        const byId = new Map<number | string, Row>();
        [...ownRows, ...teamRows].forEach(r => byId.set(r.id, r));
        setRows([...byId.values()]);
      } else {
        const response = await api.get("/salaries/my");
        const data = Array.isArray(response.data) ? response.data : [];
        setRows(data.filter(r => String(r.month).toLowerCase() === month.toLowerCase() && Number(r.year) === Number(year)));
      }
      setSelected(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load salary records"); setRows([]);
    } finally { setLoading(false); }
  }

  async function loadManual() {
    if (!canManual) return;
    try { const r = await api.get("/salaries/manual"); setManualRows(Array.isArray(r.data) ? r.data : []); } catch { setManualRows([]); }
  }

  useEffect(() => { load(); loadManual(); }, [managementView, managerView, month, year]);
  useEffect(() => { if (!canManual) return; api.get("/employees").then(({data}) => setEmployees(Array.isArray(data) ? data : [])).catch(() => setEmployees([])); }, [canManual]);
  useEffect(() => { setPage(1); }, [month, year, managementView, managerView]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginatedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);

  const summary = useMemo(() => {
    const gross = rows.reduce((n,r) => n + Number(r.grossSalary || 0), 0);
    const net = rows.reduce((n,r) => n + Number(r.netSalary || 0), 0);
    const paid = rows.filter(r => String(r.paymentStatus).toUpperCase() === "PAID");
    const pending = rows.filter(r => String(r.paymentStatus).toUpperCase() !== "PAID");
    return [
      { label: managementView ? "Employees" : managerView ? "My + Team Records" : "Salary Records", value: rows.length },
      { label: "Gross Payroll", value: money(gross) },
      { label: "Net Payroll", value: money(net) },
      { label: "Paid", value: managementView ? `${paid.length} / ${rows.length}` : (paid.length ? "Paid" : pending.length ? "Pending" : "—") }
    ];
  }, [rows, managementView]);

  async function generateAll() {
    if (!window.confirm(`Generate salaries for all active employees for ${month} ${year}?`)) return;
    setGenerating(true); setError("");
    try { await api.post("/salaries/generate", { month, year }); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to generate payroll"); }
    finally { setGenerating(false); }
  }

  async function updateStatus(id: number, paymentStatus: string) {
    try { await api.patch(`/salaries/${id}/payment-status`, { paymentStatus }); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || "Unable to update payment status"); }
  }

  function openManual(row?: Row) {
    setManualEditing(row || null);
    setManualForm(row ? { employeeId: row.employeeId || "", basicSalary: row.basicSalary ?? "", hra: row.hra ?? "", allowance: row.allowance ?? "", bonus: row.bonus ?? "", deductions: row.deductions ?? "", month: row.month || month, year: String(row.year || year), paymentStatus: row.paymentStatus || "PENDING" } : blankManual());
    setManualOpen(true);
  }

  async function saveManual() {
    if (!manualForm.employeeId) return;
    setManualSaving(true); setError("");
    try {
      const payload = { ...manualForm, employeeId: Number(manualForm.employeeId), year: Number(manualForm.year), basicSalary: Number(manualForm.basicSalary || 0), hra: Number(manualForm.hra || 0), allowance: Number(manualForm.allowance || 0), bonus: Number(manualForm.bonus || 0), deductions: Number(manualForm.deductions || 0) };
      if (manualEditing) await api.put(`/salaries/manual/${manualEditing.id}`, payload); else await api.post("/salaries/manual", payload);
      setManualOpen(false); setManualEditing(null); await loadManual(); await load();
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to save manual salary record"); }
    finally { setManualSaving(false); }
  }

  async function deleteManual(id: number) {
    if (!window.confirm("Delete this manual salary record?")) return;
    try { await api.delete(`/salaries/manual/${id}`); await loadManual(); await load(); } catch (e: any) { setError(e?.response?.data?.message || "Unable to delete salary record"); }
  }

  return <div>
    <div className="th-page-header">
      <div><h1>{managementView ? "Salary & Payroll" : managerView ? "My & Team Salary" : "My Salary"}</h1><div className="th-breadcrumb">Dashboard <span>›</span> Salary & Payroll</div></div>
      <div className="th-header-actions">
        <button className="th-outline" onClick={() => csvDownload(rows, `salary-${month}-${year}.csv`)} disabled={!rows.length}><DownloadRounded fontSize="small" /> Export Excel</button>
        <button className="th-outline" onClick={load}><RefreshRounded fontSize="small" /> Refresh</button>
        {managementView && <Link className="th-outline" to={`/${role.toLowerCase()}/payroll-reconciliation`}>Review reconciliation</Link>}
        {canGenerate && <button className="th-primary" onClick={generateAll} disabled={generating}>{generating ? "Generating..." : "Generate Payroll"}</button>}
        {canManual && <button className="th-primary" onClick={() => openManual()}>Add Salary Record</button>}
      </div>
    </div>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

    <div className="th-card report-filter-card"><div className="report-filter-title">Payroll Period</div><div className="report-filters">
      <label>Month<select value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m}>{m}</option>)}</select></label>
      <label>Year<input type="number" min="2000" max="2100" value={year} onChange={e => setYear(Number(e.target.value))} /></label>
      <button className="th-primary report-apply" onClick={load}>Apply</button>
    </div></div>

    <div className="th-grid th-stats-grid report-summary">{summary.map(s => <div className="th-card th-stat-card" key={s.label}><div className="th-card-title">{s.label}</div><div className="th-stat-value">{s.value}</div></div>)}</div>

    <div className="th-card table-card">
      <div className="table-toolbar"><div><strong>{managementView ? `${month} ${year} Payroll` : managerView ? `${month} ${year} My & Team Salary` : `${month} ${year} Salary`}</strong><small>{rows.length} record{rows.length === 1 ? "" : "s"}</small></div></div>
      {loading ? <div className="th-loading"><CircularProgress size={22} /> Loading salary...</div> : !rows.length ? <div className="empty-state"><h3>No salary generated</h3><p>{canGenerate ? "Prepare and independently approve payroll reconciliation before generating this month." : managementView ? "No payroll has been generated by HR for this month." : managerView ? "No salary record is available for you or your direct reports for the selected month." : "No salary record is available for the selected month."}</p></div> :
      <>
      <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Basic</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Payment</th><th>Payment Date</th><th>Action</th></tr></thead><tbody>
        {paginatedRows.map((r,i) => <tr key={r.id ?? i}><td><b>{text(r.employeeName)}</b><small className="report-muted">{text(r.employeeCode)}</small></td><td>{text(r.department)}</td><td>{money(r.basicSalary)}</td><td>{money(r.grossSalary)}</td><td>{money(r.deductions)}</td><td><b>{money(r.netSalary)}</b></td><td>{canGenerate ? <select value={r.paymentStatus || "PENDING"} onChange={e => updateStatus(r.id, e.target.value)}><option>PENDING</option><option>PROCESSING</option><option>PAID</option><option>FAILED</option></select> : <span className={`status ${String(r.paymentStatus || "").toLowerCase()}`}>{text(r.paymentStatus)}</span>}</td><td>{text(r.paymentDate)}</td><td><button onClick={() => setSelected(r)}>View</button></td></tr>)}
      </tbody></table></div>
      <PaginationBar page={page} pageSize={pageSize} total={rows.length} onChange={setPage} />
      </>}
    </div>

    {canManual && <div className="th-card table-card" style={{ marginTop: 16 }}>
      <div className="table-toolbar"><div><strong>Manual Salary Records</strong><small>{manualRows.length} record{manualRows.length === 1 ? "" : "s"}</small></div></div>
      <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Month</th><th>Basic</th><th>Gross</th><th>Net</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {manualRows.filter(r => !r.month || String(r.month).toLowerCase() === month.toLowerCase() && Number(r.year) === Number(year)).map((r, i) => <tr key={r.id ?? i}><td><b>{text(r.employeeName)}</b><small className="report-muted">{text(r.employeeCode)}</small></td><td>{text(r.month)} {text(r.year)}</td><td>{money(r.basicSalary)}</td><td>{money(r.grossSalary)}</td><td>{money(r.netSalary)}</td><td>{text(r.paymentStatus)}</td><td><div className="row-actions"><button className="th-outline small" onClick={() => openManual(r)}>Edit</button><button className="th-outline small" onClick={() => deleteManual(r.id)}>Delete</button></div></td></tr>)}
        {!manualRows.length && <tr><td colSpan={7}><div className="empty-state">No manual salary records.</div></td></tr>}
      </tbody></table></div>
    </div>}

    {manualOpen && <div className="th-modal-backdrop"><form className="th-modal" onSubmit={(e) => { e.preventDefault(); void saveManual(); }}>
      <div className="th-modal-head"><div><h2>{manualEditing ? "Edit Salary Record" : "Add Salary Record"}</h2><small className="th-muted">Legacy manual salary entry migrated to React.</small></div><button type="button" onClick={() => setManualOpen(false)}>×</button></div>
      <div className="th-form-grid">
        <label>Employee *<select required value={manualForm.employeeId} onChange={e => setManualForm((v:any)=>({...v,employeeId:e.target.value}))}><option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.fullName || e.name || e.userId} {e.userId ? `(${e.userId})` : ""}</option>)}</select></label>
        <label>Month<select value={manualForm.month} onChange={e=>setManualForm((v:any)=>({...v,month:e.target.value}))}>{months.map(m=><option key={m}>{m}</option>)}</select></label>
        <label>Year<input type="number" min="2000" max="2100" value={manualForm.year} onChange={e=>setManualForm((v:any)=>({...v,year:e.target.value}))}/></label>
        <label>Basic Salary<input type="number" min="0" step="0.01" value={manualForm.basicSalary} onChange={e=>setManualForm((v:any)=>({...v,basicSalary:e.target.value}))}/></label>
        <label>HRA<input type="number" min="0" step="0.01" value={manualForm.hra} onChange={e=>setManualForm((v:any)=>({...v,hra:e.target.value}))}/></label>
        <label>Allowance<input type="number" min="0" step="0.01" value={manualForm.allowance} onChange={e=>setManualForm((v:any)=>({...v,allowance:e.target.value}))}/></label>
        <label>Bonus<input type="number" min="0" step="0.01" value={manualForm.bonus} onChange={e=>setManualForm((v:any)=>({...v,bonus:e.target.value}))}/></label>
        <label>Deductions<input type="number" min="0" step="0.01" value={manualForm.deductions} onChange={e=>setManualForm((v:any)=>({...v,deductions:e.target.value}))}/></label>
        <label>Payment Status<select value={manualForm.paymentStatus} onChange={e=>setManualForm((v:any)=>({...v,paymentStatus:e.target.value}))}><option>PENDING</option><option>PROCESSING</option><option>PAID</option><option>FAILED</option></select></label>
      </div>
      <div className="th-modal-actions"><button type="button" className="th-outline" onClick={()=>setManualOpen(false)}>Cancel</button><button className="th-primary" disabled={manualSaving}>{manualSaving ? "Saving…" : manualEditing ? "Update Salary" : "Save Salary"}</button></div>
    </form></div>}

    {selected && <div className="th-modal-backdrop" onClick={() => setSelected(null)}><div className="th-modal" onClick={e => e.stopPropagation()}><div className="th-modal-header"><div><h2>Salary Details</h2><p>{text(selected.employeeName)} · {text(selected.month)} {text(selected.year)}</p></div><button className="th-outline" onClick={() => setSelected(null)}>Close</button></div><div className="th-form-grid salary-detail-grid">
      {[["Employee Code",selected.employeeCode],["Department",selected.department],["Designation",selected.designation],["Basic Salary",money(selected.basicSalary)],["HRA",money(selected.hra)],["Allowance",money(selected.allowance)],["Bonus",money(selected.bonus)],["Deductions",money(selected.deductions)],["Gross Salary",money(selected.grossSalary)],["Net Salary",money(selected.netSalary)],["Payment Status",selected.paymentStatus],["Payment Date",selected.paymentDate]].map(([k,v]) => <div className="salary-detail-item" key={String(k)}><small>{k}</small><strong>{text(v)}</strong></div>)}
    </div></div></div>}
  </div>;
}
