import { downloadBrandedCsv } from "../utils/brandedExport";
import { useEffect, useMemo, useRef, useState } from "react";
import { dateInZone } from "../utils/collaboration";
import { CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { api } from "../services/api";
import type { RootState } from "../store";
import PaginationBar from "../components/PaginationBar";

type Row = Record<string, any>;
type Scope = "MY" | "TEAM" | "ORG";

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = () => fmt(new Date());
const monthStart = () => `${today().slice(0, 8)}01`;
const csv = (rows: Row[]) => {
  const headers = ["date", "employeeName", "employeeEmail", "department", "checkInTime", "checkOutTime", "workingHours", "status", "workMode", "regularized", "regularizedByRequestId"];
  const esc = (v: any) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
};

export default function AttendancePage() {
  const session = useSelector((s: RootState) => s.auth.session);
  const role = session?.role || "EMPLOYEE";
  const [companyToday,setCompanyToday]=useState(dateInZone());
  const [timezone,setTimezone]=useState("Asia/Kolkata");
  const [holidays,setHolidays]=useState<Row[]>([]);
  const [leaves,setLeaves]=useState<Row[]>([]);
  const request=useRef(0),calendarRequest=useRef(0);
  const [scope, setScope] = useState<Scope>(() => role === "MANAGER" ? "TEAM" : role === "HR" || role === "ADMIN" ? "ORG" : "MY");
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [calendarRows, setCalendarRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [punchBusy, setPunchBusy] = useState(false);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState("ALL");
  const [workMode, setWorkMode] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [punchMode, setPunchMode] = useState("OFFICE");
  const [profileJoinDate, setProfileJoinDate] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const canManual = role === "ADMIN" || role === "HR";
  const [manualOpen, setManualOpen] = useState(false);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState({ employeeId: "", date: today(), checkInTime: "", checkOutTime: "", workingHours: "", reason: "", status: "PRESENT", workMode: "OFFICE" });

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let alive = true;
    api.get("/attendance/context").then(({data})=>{if(alive){setCompanyToday(data.today);setTimezone(data.timezone);}}).catch(()=>{});
    api.get("/holidays").then(({data})=>{if(alive)setHolidays(Array.isArray(data)?data:[])}).catch(()=>{});
    api.get("/leaves/my").then(({data})=>{if(alive)setLeaves(Array.isArray(data)?data.filter((x:Row)=>x.status==="APPROVED"):[])}).catch(()=>{});
    api.get("/profile/me").then(({data}) => {
      if (alive) setProfileJoinDate(data?.joiningDate || null);
    }).catch(() => { if (alive) setProfileJoinDate(null); });
    return () => { alive = false; };
  }, []);
  const personalView = scope === "MY";
  const scopedView = !personalView;
  const endpoint = personalView ? "/attendance/my" : role === "MANAGER" ? "/attendance/team" : "/attendance";

  useEffect(() => {
    if (role === "EMPLOYEE") setScope("MY");
    else if (role === "MANAGER" && scope === "ORG") setScope("TEAM");
    else if ((role === "HR" || role === "ADMIN") && scope === "TEAM") setScope("ORG");
  }, [role]);

  async function load() {
    const generation=++request.current;
    setLoading(true);
    setError("");
    try {
      const r = await api.get(endpoint);
      if(generation!==request.current)return;
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      if(generation!==request.current)return;
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load attendance");
      setRows([]);
    } finally {
      if(generation===request.current)setLoading(false);
    }
  }

  async function loadCalendar() {
    const generation=++calendarRequest.current;
    setCalendarLoading(true);
    setCalendarError("");
    try {
      if (personalView) {
        const r = await api.get("/attendance/my");
        if(generation!==calendarRequest.current)return;
        const source = Array.isArray(r.data) ? r.data : [];
        setCalendarRows(source.filter((x: Row) => {
          const d = String(x.date || "");
          return d.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`);
        }));
      } else {
        const r = await api.get("/attendance/calendar", { params: { year: month.getFullYear(), month: month.getMonth() + 1 } });
        if(generation!==calendarRequest.current)return;
        setCalendarRows(Array.isArray(r.data) ? r.data : []);
      }
    } catch {
      if(generation!==calendarRequest.current)return;
      setCalendarError("Calendar could not be loaded. Attendance has not been marked absent.");
      setCalendarRows([]);
    } finally {
      if(generation===calendarRequest.current)setCalendarLoading(false);
    }
  }

  useEffect(() => {setRows([]);load();return()=>{request.current++;};}, [endpoint]);
  useEffect(() => { if (!canManual) return; api.get("/employees").then(({data}) => setEmployees(Array.isArray(data) ? data : [])).catch(() => setEmployees([])); }, [canManual]);
  useEffect(() => {setCalendarRows([]);loadCalendar();return()=>{calendarRequest.current++;};}, [month.getFullYear(), month.getMonth(), scope]);

  const filtered = useMemo(() => rows.filter((r) => {
    const date = String(r.date || "");
    const q = keyword.trim().toLowerCase();
    return (!from || date >= from) && (!to || date <= to)
      && (status === "ALL" || String(r.status || "").toUpperCase() === status)
      && (workMode === "ALL" || String(r.workMode || "").toUpperCase() === workMode)
      && (!q || [r.employeeName, r.employeeEmail, r.department].some((v) => String(v || "").toLowerCase().includes(q)));
  }), [rows, from, to, status, workMode, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [from, to, status, workMode, keyword, scope]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginatedAttendance = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const summary = useMemo(() => ({
    total: filtered.length,
    present: filtered.filter((r) => ["PRESENT", "LATE"].includes(String(r.status || "").toUpperCase())).length,
    late: filtered.filter((r) => String(r.status || "").toUpperCase() === "LATE").length,
    leave: filtered.filter((r) => String(r.status || "").toUpperCase() === "LEAVE").length,
    hours: filtered.reduce((n, r) => n + Number(r.workingHours || 0), 0),
  }), [filtered]);

  const todayRecord = useMemo(() => personalView ? rows.find(r=>r.checkInTime&&!r.checkOutTime&&r.workingHours==null)||rows.find((r) => String(r.date || "") === companyToday) : undefined, [rows, personalView, companyToday]);
  const checkedIn = !!todayRecord?.checkInTime;
  const checkedOut = !!todayRecord?.checkOutTime;
  const expiredPunch = String(todayRecord?.status || "") === "UNVERIFIED";
  const ongoingMinutes = checkedIn && !checkedOut && !expiredPunch
    ? Math.max(0, Math.floor((clock - new Date(String(todayRecord?.checkInInstant||todayRecord?.checkInTime)).getTime()) / 60000)) : 0;
  const expiredToday = !!todayRecord?.checkInTime && !todayRecord?.checkOutTime && todayRecord?.workingHours === 0;
  const workingSeconds = useMemo(() => {
    if (!todayRecord?.checkInTime || todayRecord?.checkOutTime || expiredToday) return null;
    const started = new Date(todayRecord.checkInInstant||todayRecord.checkInTime).getTime();
    if (!Number.isFinite(started) || started > clock) return null;
    return Math.min(24 * 3600, Math.floor((clock - started) / 1000));
  }, [todayRecord, clock, expiredToday]);
  const workingClock = workingSeconds == null ? null : `${String(Math.floor(workingSeconds / 3600)).padStart(2,"0")}:${String(Math.floor((workingSeconds % 3600) / 60)).padStart(2,"0")}:${String(workingSeconds % 60).padStart(2,"0")}`;
  const calendarMap = useMemo(() => new Map(calendarRows.map((r) => [String(r.date), r])), [calendarRows]);
  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<{ date: string | null; weekend?: boolean }> = Array(offset).fill(null).map(() => ({ date: null }));
    for (let d = 1; d <= count; d++) {
      const dt = new Date(month.getFullYear(), month.getMonth(), d);
      cells.push({ date: fmt(dt), weekend: dt.getDay() === 0 || dt.getDay() === 6 });
    }
    while (cells.length % 7) cells.push({ date: null });
    return cells;
  }, [month]);

  async function punch(path: string) {
    if (punchBusy || loading) return;
    setPunchBusy(true);
    setError("");
    try {
      await api.post(path, path.endsWith("punch-in") ? { workMode: punchMode } : undefined);
      await Promise.all([load(), loadCalendar()]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Attendance action failed");
    } finally {
      setPunchBusy(false);
    }
  }

  async function saveManualAttendance() {
    if (!manualForm.employeeId || !manualForm.date) return;
    setManualSaving(true); setError("");
    try {
      await api.post("/attendance/manual", manualForm);
      setManualOpen(false);
      setManualForm({ employeeId: "", date: today(), checkInTime: "", checkOutTime: "", workingHours: "", reason: "", status: "PRESENT", workMode: "OFFICE" });
      await Promise.all([load(),loadCalendar()]);
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to save attendance"); }
    finally { setManualSaving(false); }
  }

  function exportCsv() {
    void downloadBrandedCsv(csv(filtered), `attendance-${scope.toLowerCase()}-${today()}.csv`);
  }

  const canPunch = role !== "ADMIN" && personalView;
  const title = personalView ? "My Attendance" : role === "MANAGER" ? "Team Attendance" : "Attendance Management";
  const showEmployeeColumns = scopedView;

  return <>
    <div className="th-page-header">
      <div><h1>{title}</h1><div className="th-breadcrumb">Dashboard <span>/</span> Attendance</div></div>
      <div className="th-header-actions">
        <button className="th-outline" disabled={loading || punchBusy} onClick={() => { load(); loadCalendar(); }}>Refresh</button>
        {scopedView && <button className="th-primary" onClick={exportCsv}>Export Excel</button>}
        {canManual && <button className="th-primary" onClick={() => setManualOpen(true)}>Add Attendance</button>}
      </div>
    </div>

    {(role === "MANAGER" || role === "HR") && <div className="portal-scope-tabs" role="tablist" aria-label="Attendance view">
      <button className={personalView ? "active" : ""} onClick={() => setScope("MY")}>My Attendance</button>
      <button className={!personalView ? "active" : ""} onClick={() => setScope(role === "MANAGER" ? "TEAM" : "ORG")}>{role === "MANAGER" ? "Team Attendance" : "Organization Attendance"}</button>
    </div>}

    {from&&to&&from>to&&<div className="th-alert error">From date must be on or before To date.</div>}
    {error && <div className="th-alert error" style={{ marginBottom: 14 }}>{error}</div>}

    {canPunch && <div className="th-card action-card">
      <div><strong>Attendance session · {timezone}</strong><small>{loading ? "Checking today’s attendance..." : todayRecord?.checkInTime ? `Punched in at ${formatDateTime(todayRecord.checkInTime)}${todayRecord.checkOutTime ? ` • Out at ${formatDateTime(todayRecord.checkOutTime)}` : expiredToday ? " • Session expired after 24h; request regularization" : ` • Still working${workingClock ? ` • ${workingClock}` : ""}`}` : "No punch-in recorded today."}</small></div>
      <select value={punchMode} onChange={(e) => setPunchMode(e.target.value)} disabled={loading || punchBusy || !!todayRecord?.checkInTime}>
        <option value="OFFICE">Work From Office (WFO)</option>
        <option value="WFH">Work From Home (WFH)</option>
        
      </select>
      <button className="th-primary" disabled={loading || punchBusy || !!todayRecord?.checkInTime} onClick={() => punch("/attendance/punch-in")}>Punch In</button>
      <button className="th-outline" disabled={loading || punchBusy || !todayRecord?.checkInTime || !!todayRecord?.checkOutTime || expiredToday} onClick={() => punch("/attendance/punch-out")}>Punch Out</button>
    </div>}

    <div className="th-card" style={{ marginBottom: 16 }}>
      <div className="table-toolbar">
        <div><strong>{personalView ? "My Monthly Attendance Calendar" : role === "MANAGER" ? "Team Attendance Calendar" : "Organization Attendance Calendar"}</strong><small>{month.toLocaleString(undefined, { month: "long", year: "numeric" })} • {personalView ? "Your daily attendance" : "Aggregated attendance for the selected scope"}</small></div>
        <div style={{ display: "flex", gap: 8 }}><button className="th-outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</button><button className="th-outline" onClick={() => setMonth(new Date())}>Today</button><button className="th-outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button></div>
      </div>
      {calendarLoading ? <div className="th-loading"><CircularProgress size={20} /> Loading calendar...</div> : calendarError ? <div className="th-alert error">{calendarError}</div> : <div className="attendance-calendar">
        <div className="attendance-calendar-head">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => <div key={x}>{x}</div>)}</div>
        <div className="attendance-calendar-grid">{calendarDays.map((cell, i) => {
          if (!cell.date) return <div className="attendance-day empty" key={i} />;
          const r = calendarMap.get(cell.date);
          // A missing attendance row is not proof of absence. Only explicit backend statuses count.
          const holiday=holidays.some(h=>h.holidayDate===cell.date&&h.active!==false&&!h.optionalHoliday);
          const leave=personalView&&leaves.some(l=>l.startDate<=cell.date!&&l.endDate>=cell.date!);
          const statusValue = r?.sessionExpired ? "EXPIRED" : String(r?.status || (holiday?"HOLIDAY":leave?"LEAVE":cell.date>companyToday?"UPCOMING":profileJoinDate&&cell.date<profileJoinDate?"NOT_JOINED":cell.weekend ? "WEEKEND" : "UNRECORDED")).toUpperCase();
          return <div className={`attendance-day ${statusValue.toLowerCase()}`} key={cell.date}><b>{Number(cell.date.slice(-2))}</b><span>{statusValue === "UNRECORDED" ? "—" : statusValue.replace("_", " ")}</span>{r?.employeeCount != null && scopedView && <small>{r.employeeCount} record(s)</small>}{r?.workingHours != null && <small>{Number(r.workingHours).toFixed(1)}h</small>}{r?.regularized && <small>Approved correction</small>}</div>;
        })}</div>
        <div className="attendance-legend"><span><i className="present" />Present</span><span><i className="late" />Late</span><span><i className="leave" />Leave</span><span><i className="absent" />Absent (confirmed record)</span><span>No record = unverified</span><span><i className="weekend" />Weekend</span></div>
      </div>}
    </div>

    <div className="th-card report-filter-card"><div className="report-filter-title">Attendance Filters</div><div className="report-filters">
      <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option>ALL</option><option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>LEAVE</option><option>UNVERIFIED</option></select></label>
      <label>Work Mode<select value={workMode} onChange={(e) => setWorkMode(e.target.value)}><option>ALL</option><option>OFFICE</option><option>WFH</option></select></label>
      <label>{showEmployeeColumns ? "Employee / Department" : "Search"}<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search..." /></label>
      <button className="th-outline report-apply" onClick={() => { setFrom(monthStart()); setTo(today()); setStatus("ALL"); setWorkMode("ALL"); setKeyword(""); }}>Reset</button>
    </div></div>

    <div className="th-stats-grid"><Stat title="Records" value={summary.total} sub="Filtered attendance entries" /><Stat title="Present" value={summary.present} sub="Present + late records" cls="green" /><Stat title="Late" value={summary.late} sub="Late attendance" cls="orange" /><Stat title="Working Hours" value={summary.hours.toFixed(1)} sub="Total recorded hours" cls="purple" /></div>

    {loading ? <div className="th-loading"><CircularProgress size={20} /> Loading attendance...</div> : <div className="th-card table-card">
      <div className="table-toolbar"><div><strong>{personalView ? "My Attendance History" : role === "MANAGER" ? "Team Attendance History" : "Organization Attendance History"}</strong><small>{filtered.length} record(s)</small></div></div>
      <div className="table-scroll"><table><thead><tr><th>Date</th>{showEmployeeColumns ? <><th>Employee</th><th>Department</th></> : null}<th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th><th>Work Mode</th>{canManual && <th>Correction</th>}</tr></thead><tbody>
        {filtered.length ? paginatedAttendance.map((r, i) => <tr key={r.id ?? `${r.date}-${i}`}><td>{r.date || "-"}{r.regularized && <small className="report-muted">Regularized #{r.regularizedByRequestId}</small>}{r.correctedBy&&<small className="report-muted" title={r.correctionReason}>Corrected by {r.correctedBy}</small>}</td>{showEmployeeColumns ? <><td><b>{r.employeeName || "-"}</b><small className="report-muted">{r.employeeEmail || ""}</small></td><td>{r.department || "-"}</td></> : null}<td>{formatDateTime(r.checkInTime)}</td><td>{formatDateTime(r.checkOutDateTime||r.checkOutTime)}</td><td>{r.workingHours == null ? "-" : Number(r.workingHours).toFixed(2)}</td><td><span className={`status ${r.sessionExpired ? "expired" : String(r.status || "").toLowerCase()}`}>{r.sessionExpired ? "EXPIRED" : r.status || "-"}</span></td><td>{r.workMode || "-"}</td>{canManual && <td><button className="th-outline small" onClick={() => {setManualForm({employeeId:String(r.employeeId),date:r.date,checkInTime:r.checkInTime?.slice(0,16)||"",checkOutTime:r.checkOutTime?.slice(0,5)||"",workingHours:"",reason:"",status:r.status||"PRESENT",workMode:r.workMode||"OFFICE"});setManualOpen(true);}}>Correct</button></td>}</tr>) : <tr><td colSpan={showEmployeeColumns ? (canManual ? 9 : 8) : (canManual ? 7 : 6)}><div className="empty-state">No attendance records match the selected filters.</div></td></tr>}
      </tbody></table></div>
      <PaginationBar page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
    </div>}
    {manualOpen && <div className="th-modal-backdrop"><form className="th-modal" onSubmit={(e) => { e.preventDefault(); void saveManualAttendance(); }}>
      <div className="th-modal-head"><div><h2>Add Attendance</h2><small className="th-muted">Admin/HR corrections require a reason. Hours are calculated from punch times.</small></div><button type="button" onClick={() => setManualOpen(false)}>×</button></div>
      <div className="th-form-grid">
        <label>Employee *<select required value={manualForm.employeeId} onChange={e => setManualForm(v => ({...v, employeeId: e.target.value}))}><option value="">Select employee</option>{employees.map(e => <option key={e.id} value={e.id}>{e.fullName || e.name || e.userId} {e.userId ? `(${e.userId})` : ""}</option>)}</select></label>
        <label>Date *<input type="date" required max={companyToday} value={manualForm.date} onChange={e => setManualForm(v => ({...v, date: e.target.value}))}/></label>
        <label>Check In<input type="datetime-local" value={manualForm.checkInTime} onChange={e => setManualForm(v => ({...v, checkInTime: e.target.value}))}/></label>
        <label>Check Out<input type="time" value={manualForm.checkOutTime} onChange={e => setManualForm(v => ({...v, checkOutTime: e.target.value}))}/></label>
        <label>Correction reason *<textarea required minLength={10} maxLength={1000} value={manualForm.reason} onChange={e=>setManualForm(v=>({...v,reason:e.target.value}))}/></label>
        <label>Status<select value={manualForm.status} onChange={e => setManualForm(v => ({...v, status: e.target.value}))}><option>PRESENT</option><option>LATE</option><option>ABSENT</option><option>LEAVE</option><option>UNVERIFIED</option></select></label>
        <label>Work Mode<select value={manualForm.workMode} onChange={e => setManualForm(v => ({...v, workMode: e.target.value}))}><option>OFFICE</option><option>WFH</option></select></label>
      </div>
      <div className="th-modal-actions"><button type="button" className="th-outline" onClick={() => setManualOpen(false)}>Cancel</button><button className="th-primary" disabled={manualSaving}>{manualSaving ? "Saving…" : "Save Attendance"}</button></div>
    </form></div>}

  </>;
}

function Stat({ title, value, sub, cls = "" }: { title: string; value: any; sub: string; cls?: string }) {
  return <div className={`th-card th-stat-card ${cls}`}><span className="th-card-title">{title}</span><div className="th-stat-value">{value}</div><div className="th-stat-sub">{sub}</div></div>;
}

function formatDateTime(value: any) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 19);
}
