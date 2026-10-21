import { downloadBrandedCsv } from "../utils/brandedExport";
import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { AssessmentRounded, DownloadRounded, FilterAltRounded, RefreshRounded } from "@mui/icons-material";
import { api } from "../services/api";

type Row = Record<string, any>;
type Issue = { field: string; label: string; severity: "HIGH" | "MEDIUM"; detail: string };

const text = (v: any) => v == null || String(v).trim() === "" ? "" : String(v).trim();
const rules = (r: Row): Issue[] => {
  const out: Issue[] = [];
  if (!text(r.email)) out.push({ field: "email", label: "Email", severity: "HIGH", detail: "Missing work email" });
  if (!text(r.phoneNumber)) out.push({ field: "phoneNumber", label: "Phone", severity: "MEDIUM", detail: "Missing phone number" });
  if (!text(r.department)) out.push({ field: "department", label: "Department", severity: "HIGH", detail: "No department assigned" });
  if (!text(r.designation)) out.push({ field: "designation", label: "Designation", severity: "MEDIUM", detail: "Missing designation" });
  if (!text(r.joiningDate)) out.push({ field: "joiningDate", label: "Joining Date", severity: "HIGH", detail: "Missing joining date" });
  if (!text(r.dob)) out.push({ field: "dob", label: "Date of Birth", severity: "MEDIUM", detail: "Missing date of birth" });
  if (!text(r.reportingManagerId) && String(r.role || "").toUpperCase() === "EMPLOYEE") out.push({ field: "reportingManagerId", label: "Reporting Manager", severity: "MEDIUM", detail: "No reporting manager assigned" });
  if (!text(r.workMode)) out.push({ field: "workMode", label: "Work Mode", severity: "MEDIUM", detail: "Work mode is not defined" });
  if (!text(r.phoneNumber) || !/^\\+?[0-9 ()-]{8,20}$/.test(text(r.phoneNumber))) {
    if (text(r.phoneNumber)) out.push({ field: "phoneNumber-format", label: "Phone", severity: "MEDIUM", detail: "Phone number format looks invalid" });
  }
  if (text(r.email) && !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(text(r.email))) out.push({ field: "email-format", label: "Email", severity: "HIGH", detail: "Email format looks invalid" });
  return out;
};

export default function EmployeeDataQualityPage() {
  const [rows, setRows] = useState<Row[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [query, setQuery] = useState(""), [severity, setSeverity] = useState(""), [issue, setIssue] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const r = await api.get("/employees"); setRows(Array.isArray(r.data) ? r.data : []); }
    catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load employee master data"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const records = useMemo(() => rows.map(r => ({ employee: r, issues: rules(r) })), [rows]);
  const stats = useMemo(() => {
    const issueRecords = records.filter(x => x.issues.length);
    const issues = records.flatMap(x => x.issues);
    return { total: rows.length, clean: records.filter(x => !x.issues.length).length, impacted: issueRecords.length, high: issues.filter(x => x.severity === "HIGH").length, issues: issues.length };
  }, [records, rows.length]);
  const filtered = useMemo(() => records.filter(x => {
    const r = x.employee, q = query.trim().toLowerCase();
    const hit = !q || [r.fullName, r.userId, r.email, r.department, r.designation].some(v => text(v).toLowerCase().includes(q));
    return hit && (!severity || x.issues.some(i => i.severity === severity)) && (!issue || x.issues.some(i => i.field === issue));
  }), [records, query, severity, issue]);
  const issueTypes = useMemo(() => Array.from(new Map(records.flatMap(x => x.issues).map(i => [i.field, i.label])).entries()), [records]);

  function exportCsv() {
    const lines = [["Employee ID","Employee","Department","Designation","Status","Issue","Severity","Detail"], ...filtered.flatMap(x => x.issues.map(i => [x.employee.userId || x.employee.id, x.employee.fullName, x.employee.department, x.employee.designation, x.employee.status, i.label, i.severity, i.detail]))];
    const csv = lines.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    void downloadBrandedCsv(csv, "employee-data-quality.csv");
  }

  return <div>
    <div className="th-page-header"><div><h1>Employee Data Quality</h1><div className="th-breadcrumb">Master Data Validation <span>/</span> {filtered.length} visible</div></div><div className="th-header-actions"><button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button><button className="th-primary" onClick={exportCsv} disabled={!filtered.some(x => x.issues.length)}><DownloadRounded fontSize="small"/> Export Issues</button></div></div>
    {error && <div className="role-alert"><b>Data quality scan failed</b><span>{error}</span></div>}
    <div className="stats-grid employee-stats"><div className="th-card stat-card"><span>Total Employees</span><strong>{stats.total}</strong></div><div className="th-card stat-card"><span>Data Complete</span><strong>{stats.clean}</strong></div><div className="th-card stat-card"><span>Employees With Issues</span><strong>{stats.impacted}</strong></div><div className="th-card stat-card"><span>High-Severity Issues</span><strong>{stats.high}</strong></div></div>
    <div className="th-card report-filter-card"><div className="report-filter-title"><FilterAltRounded fontSize="small"/> Validation Filters</div><div className="report-filters"><label>Search<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, ID, email, department…"/></label><label>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">All severities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option></select></label><label>Issue Type<select value={issue} onChange={e=>setIssue(e.target.value)}><option value="">All issue types</option>{issueTypes.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div></div>
    <div className="th-card table-card">{loading ? <div className="th-loading"><CircularProgress size={22}/> Scanning employee master data…</div> : <div className="table-scroll"><table><thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Completeness</th><th>Issues</th><th>Risk</th></tr></thead><tbody>{filtered.map(x => { const total=8, score=Math.max(0, Math.round((1-x.issues.filter(i=>["email","department","joiningDate","designation","dob","phoneNumber","reportingManagerId","workMode"].includes(i.field)).length/total)*100)); const high=x.issues.some(i=>i.severity==="HIGH"); return <tr key={x.employee.id}><td><b>{text(x.employee.fullName)||"Unnamed"}</b><small className="report-muted">{text(x.employee.userId)||text(x.employee.email)}</small></td><td>{text(x.employee.department)||"—"}</td><td>{text(x.employee.designation)||"—"}</td><td><b>{score}%</b><small className="report-muted">{score===100?" Complete":" Needs cleanup"}</small></td><td>{x.issues.length ? <div className="row-actions" style={{flexWrap:"wrap"}}>{x.issues.map((i,n)=><span className={`status ${i.severity.toLowerCase()}`} key={i.field+n}>{i.label}</span>)}</div> : <span className="status active">Clean</span>}</td><td>{x.issues.length ? <span className={`status ${high?"inactive":"warning"}`}>{high?"HIGH":"MEDIUM"}</span> : <span className="status active">LOW</span>}</td></tr>})}</tbody></table>{!filtered.length&&<div className="empty-state"><AssessmentRounded/><h3>No matching records</h3><p>Try changing the validation filters.</p></div>}</div>}</div>
    <div className="th-card" style={{marginTop:16,padding:16}}><b>Validation coverage</b><p className="report-muted">{stats.issues} data-quality findings across email, phone, department, designation, joining date, date of birth, reporting manager and work mode. This dashboard is read-only and routes corrections through existing Employee Management.</p></div>
  </div>;
}
