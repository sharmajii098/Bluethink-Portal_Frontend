import { downloadBrandedCsv } from "../utils/brandedExport";
import { useEffect, useMemo, useState } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { DownloadRounded, RefreshRounded } from "@mui/icons-material";
import { api } from "../services/api";

type Row = Record<string, any>;
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const money = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const num = (v: any) => Number(v || 0);

function csvDownload(rows: any[], name: string) {
  if (!rows.length) return;
  const keys = ["month","employees","basic","hra","allowance","bonus","deductions","gross","net"];
  const csv = [keys, ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replaceAll('"','""')}"`))].map(r => r.join(",")).join("\n");
  void downloadBrandedCsv(csv, name);
}

export default function CompensationAnalyticsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const responses = await Promise.all(months.map(month => api.get("/salaries/monthly", { params: { month, year } })));
      const all = responses.flatMap((r, i) => (Array.isArray(r.data) ? r.data : []).map(x => ({ ...x, _month: months[i] })));
      setRows(all);
    } catch (e: any) {
      setRows([]); setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load compensation analytics");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [year]);

  const summary = useMemo(() => {
    const gross = rows.reduce((n,r) => n + num(r.grossSalary), 0);
    const net = rows.reduce((n,r) => n + num(r.netSalary), 0);
    const deductions = rows.reduce((n,r) => n + num(r.deductions), 0);
    const employees = new Set(rows.map(r => String(r.employeeCode || r.employeeName || r.id))).size;
    return { gross, net, deductions, employees, avg: employees ? gross / employees / Math.max(1, new Set(rows.map(r => r._month)).size) : 0 };
  }, [rows]);

  const monthly = useMemo(() => months.map(month => {
    const rs = rows.filter(r => r._month === month);
    return { month, employees: new Set(rs.map(r => String(r.employeeCode || r.employeeName || r.id))).size,
      basic: rs.reduce((n,r)=>n+num(r.basicSalary),0), hra: rs.reduce((n,r)=>n+num(r.hra),0), allowance: rs.reduce((n,r)=>n+num(r.allowance),0),
      bonus: rs.reduce((n,r)=>n+num(r.bonus),0), deductions: rs.reduce((n,r)=>n+num(r.deductions),0), gross: rs.reduce((n,r)=>n+num(r.grossSalary),0), net: rs.reduce((n,r)=>n+num(r.netSalary),0) };
  }), [rows]);

  const departments = useMemo(() => {
    const map = new Map<string, { employees: Set<string>; gross: number; net: number }>();
    rows.forEach(r => { const d = String(r.department || "Unassigned"); const x = map.get(d) || { employees: new Set<string>(), gross: 0, net: 0 }; x.employees.add(String(r.employeeCode || r.employeeName || r.id)); x.gross += num(r.grossSalary); x.net += num(r.netSalary); map.set(d,x); });
    return [...map.entries()].map(([department,x]) => ({ department, employees:x.employees.size, gross:x.gross, net:x.net })).sort((a,b)=>b.gross-a.gross);
  }, [rows]);

  return <div>
    <div className="th-page-header"><div><h1>Compensation Analytics</h1><div className="th-breadcrumb">Dashboard <span>›</span> Compensation Analytics</div></div><div className="th-header-actions"><button className="th-outline" disabled={!monthly.some(x=>x.gross)} onClick={()=>csvDownload(monthly,`compensation-${year}.csv`)}><DownloadRounded fontSize="small"/> Export Excel</button><button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button></div></div>
    {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    <div className="th-card report-filter-card"><div className="report-filter-title">Analysis Period</div><div className="report-filters"><label>Year<input type="number" min="2000" max="2100" value={year} onChange={e=>setYear(Number(e.target.value))}/></label></div></div>
    {loading ? <div className="th-loading"><CircularProgress size={22}/> Loading compensation data...</div> : <>
      <div className="th-grid th-stats-grid report-summary">{[["Employees",summary.employees],["Annual Gross Payroll",money(summary.gross)],["Annual Net Payroll",money(summary.net)],["Total Deductions",money(summary.deductions)],["Avg Monthly Gross / Employee",money(summary.avg)]].map(([k,v])=><div className="th-card th-stat-card" key={String(k)}><div className="th-card-title">{k}</div><div className="th-stat-value">{v}</div></div>)}</div>
      <div className="th-card table-card"><div className="table-toolbar"><div><strong>Monthly Compensation Trend</strong><small>{year}</small></div></div><div className="table-scroll"><table><thead><tr><th>Month</th><th>Employees</th><th>Basic</th><th>HRA</th><th>Allowance</th><th>Bonus</th><th>Deductions</th><th>Gross</th><th>Net</th></tr></thead><tbody>{monthly.map(r=><tr key={r.month}><td><b>{r.month}</b></td><td>{r.employees}</td><td>{money(r.basic)}</td><td>{money(r.hra)}</td><td>{money(r.allowance)}</td><td>{money(r.bonus)}</td><td>{money(r.deductions)}</td><td><b>{money(r.gross)}</b></td><td><b>{money(r.net)}</b></td></tr>)}</tbody></table></div></div>
      <div className="th-card table-card"><div className="table-toolbar"><div><strong>Department Compensation</strong><small>{departments.length} department{departments.length===1?"":"s"}</small></div></div>{departments.length ? <div className="table-scroll"><table><thead><tr><th>Department</th><th>Employees</th><th>Gross Payroll</th><th>Net Payroll</th><th>Avg Gross / Employee</th></tr></thead><tbody>{departments.map(r=><tr key={r.department}><td><b>{r.department}</b></td><td>{r.employees}</td><td>{money(r.gross)}</td><td>{money(r.net)}</td><td>{money(r.employees ? r.gross/r.employees : 0)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>No compensation data</h3><p>Generate payroll for the selected year to populate this analysis.</p></div>}</div>
    </>}
  </div>;
}
