import { useSelfService } from "../contexts/RequestViewContext";
import { downloadBrandedCsv } from "../utils/brandedExport";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import {
  AddRounded,
  CalendarMonthRounded,
  CheckCircleOutlineRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  DownloadRounded,
  EventAvailableRounded,
  FilterAltRounded,
  HourglassTopRounded,
  RefreshRounded,
  ReplayRounded,
} from "@mui/icons-material";
import { RootState } from "../store";
import { api } from "../services/api";
import PaginationBar from "../components/PaginationBar";

type Row = Record<string, any>;
type Scope = "MY" | "TEAM" | "ORG";
type ReviewState = { row: Row; action: "approve" | "reject" } | null;
type CalendarCell = { date: Date | null; key: string };

const text = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));
const todayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDate = (value: any) => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const fullDayCount = (a: any, b: any) => {
  if (!a || !b) return 0;
  const start = new Date(`${String(a).slice(0, 10)}T00:00:00`).getTime();
  const end = new Date(`${String(b).slice(0, 10)}T00:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
};
const durationDays = (row: Row) => {
  const duration = String(row.leaveDurationType || "FULL_DAY").toUpperCase();
  return duration === "FIRST_HALF" || duration === "SECOND_HALF" ? 0.5 : fullDayCount(row.startDate, row.endDate);
};
const formatNumber = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 });
const durationLabel = (value: any) => {
  const v = String(value || "FULL_DAY").toUpperCase();
  if (v === "FIRST_HALF") return "First Half";
  if (v === "SECOND_HALF") return "Second Half";
  return "Full Day";
};

function downloadCsv(rows: Row[]) {
  if (!rows.length) return;
  const keys = ["employeeName", "employeeId", "leaveType", "leaveDurationType", "startDate", "endDate", "totalDays", "status", "reason", "approvalComment"];
  const csv = [keys, ...rows.map((r) => keys.map((k) => {
    const value = k === "totalDays" ? durationDays(r) : r[k];
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }))].map((r) => r.join(",")).join("\n");
  void downloadBrandedCsv(csv, "leave-report.csv");
}

function monthCells(month: Date): CalendarCell[] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const count = new Date(y, m + 1, 0).getDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push({ date: null, key: `blank-start-${i}` });
  for (let d = 1; d <= count; d++) {
    const date = new Date(y, m, d);
    cells.push({ date, key: isoDate(date) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, key: `blank-end-${cells.length}` });
  return cells;
}

export default function LeavePage() {
 const selfService = useSelfService();
  const location = useLocation();
  const navigate = useNavigate();
  const role = useSelector((s: RootState) => s.auth.session?.role || "EMPLOYEE");
  const employee = role === "EMPLOYEE";
  const manager = role === "MANAGER";
  const [scope, setScope] = useState<Scope>(() => selfService ? "MY" : manager ? "TEAM" : role === "HR" || role === "ADMIN" ? "ORG" : "MY");
  const personalView = scope === "MY" && role !== "ADMIN";
  const canApplyOwn = role !== "ADMIN" && personalView;
  const canReview = !personalView && ["ADMIN", "HR", "MANAGER"].includes(role);

  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [balances, setBalances] = useState<Row[]>([]);
  const [types, setTypes] = useState<Row[]>([]);
  const [holidays, setHolidays] = useState<Row[]>([]);
  const [context, setContext] = useState<Row>({});
  const [attendance, setAttendance] = useState<Row[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveFlow, setLeaveFlow] = useState<"REGULAR" | "SHORT">("REGULAR");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [review, setReview] = useState<ReviewState>(null);
  const [comment, setComment] = useState("");
  const [form, setForm] = useState<Row>({
    startDate: todayIso(),
    endDate: todayIso(),
    leaveType: "",
    leaveDurationType: "FULL_DAY",
    ccEmailTo: "",
    managerNotificationEmail: "",
    reason: "",
  });

  const endpoint = personalView ? "/leaves/my" : manager ? "/leaves/team" : "/leaves";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const requests: Promise<any>[] = [api.get(endpoint), api.get("/leave-types/active")];
      if (personalView) {
        requests.push(api.get("/leave-balances/my"));
        requests.push(api.get("/leaves/context"));
        requests.push(api.get("/holidays"));
      }
      const results = await Promise.all(requests);
      const leaveRows = Array.isArray(results[0].data) ? results[0].data : [];
      const activeTypes = Array.isArray(results[1].data) ? results[1].data.filter((x: Row) => x.isActive !== false) : [];
      setRows(leaveRows);
      setTypes(activeTypes);
      if (personalView) {
        setBalances(Array.isArray(results[2]?.data) ? results[2].data : []);
        setContext(results[3]?.data || {});
        setForm((current: Row) => ({ ...current, managerNotificationEmail:
          role === "EMPLOYEE" ? (current.managerNotificationEmail || results[3]?.data?.projectManagerEmail || "") : "" }));
        setHolidays(Array.isArray(results[4]?.data) ? results[4].data : []);
      } else {
        setBalances([]); setContext({}); setHolidays([]); setAttendance([]);
      }
      setForm((current: Row) => ({ ...current, leaveType: current.leaveType || activeTypes[0]?.name || "" }));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data || "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendar() {
    if (!personalView) { setAttendance([]); return; }
    setCalendarLoading(true);
    try {
      const response = await api.get("/attendance/my");
      const prefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
      const ownRows = Array.isArray(response.data) ? response.data : [];
      setAttendance(ownRows.filter((row: Row) => String(row.date || row.attendanceDate || "").startsWith(prefix)));
    } catch {
      setAttendance([]);
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => { load(); }, [endpoint, personalView]);
  useEffect(() => { loadCalendar(); }, [personalView, calendarMonth.getFullYear(), calendarMonth.getMonth()]);

  const filtered = useMemo(() => rows.filter((r) => {
    const q = search.trim().toLowerCase();
    const start = String(r.startDate || "");
    const end = String(r.endDate || "");
    return (!q || [r.employeeName, r.employeeId, r.leaveType, r.reason].some((v) => String(v ?? "").toLowerCase().includes(q)))
      && (status === "ALL" || String(r.status).toUpperCase() === status)
      && (!from || end >= from)
      && (!to || start <= to);
  }), [rows, search, status, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [search, status, from, to, personalView]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginatedLeaves = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => String(r.status).toUpperCase() === "PENDING").length,
    approved: rows.filter((r) => String(r.status).toUpperCase() === "APPROVED").length,
    days: rows.reduce((n, r) => n + durationDays(r), 0),
  }), [rows]);

  const calendar = useMemo(() => monthCells(calendarMonth), [calendarMonth]);
  const attendanceByDate = useMemo(() => new Map(attendance.map((a) => [String(a.date || a.attendanceDate || "").slice(0, 10), a])), [attendance]);
  const holidayByDate = useMemo(() => new Map(holidays.filter((h) => h.active !== false).map((h) => [String(h.holidayDate || "").slice(0, 10), h])), [holidays]);
  const approvedLeaveDates = useMemo(() => {
    const result = new Set<string>();
    rows.filter((r) => String(r.status).toUpperCase() === "APPROVED").forEach((r) => {
      if (!r.startDate || !r.endDate) return;
      let d = new Date(`${String(r.startDate).slice(0, 10)}T00:00:00`);
      const end = new Date(`${String(r.endDate).slice(0, 10)}T00:00:00`);
      while (d <= end) {
        result.add(isoDate(d));
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
    });
    return result;
  }, [rows]);

  const yearHolidays = useMemo(() => holidays
    .filter((h) => h.active !== false && String(h.holidayDate || "").startsWith(String(calendarMonth.getFullYear())))
    .sort((a, b) => String(a.holidayDate).localeCompare(String(b.holidayDate))), [holidays, calendarMonth]);

  function dayState(date: Date) {
    const key = isoDate(date);
    const holiday = holidayByDate.get(key);
    if (holiday) return { type: "holiday", label: holiday.name || "Holiday" };
    if (date.getDay() === 0 || date.getDay() === 6) return { type: "weekend", label: "Weekend" };
    if (approvedLeaveDates.has(key)) return { type: "leave", label: "Leave" };
    const record = attendanceByDate.get(key);
    if (record) {
      const status = String(record.status || "").toUpperCase();
      if (status === "ABSENT") return { type: "absent", label: "Absent" };
      if (status === "LEAVE") return { type: "leave", label: "Leave" };
      if (status === "PRESENT" || status === "LATE") return { type: "present", label: status === "LATE" ? "Present · Late" : "Present" };
    }
    return { type: "empty", label: "" };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      // Short Leave has no category. The API assigns its internal "Short Leave" label.
      const payload = leaveFlow === "SHORT"
        ? { ...form, leaveType: "", endDate: form.startDate }
        : { ...form, leaveDurationType: "FULL_DAY" };
      const response = await api.post("/leaves", payload);
      setApplyOpen(false);
      setNotice("Leave request submitted. The assigned reviewers have been notified in the portal; email delivery depends on SMTP configuration.");
      const managerPhone = String(context.projectManagerPhone || "").replace(/[^\d+]/g, "");
      const normalizedPhone = /^\d{10}$/.test(managerPhone) ? `91${managerPhone}` : managerPhone.replace(/^\+/, "");
      setWhatsappUrl(/^\d{8,15}$/.test(normalizedPhone)
        ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Bluethink HRMS leave request #${response.data?.id || ""} submitted for ${form.startDate}. Please check your portal for review.`)}`
        : "");
      setForm((f: Row) => ({ ...f, reason: "", ccEmailTo: "" }));
      await load();
      await loadCalendar();
    } catch (x: any) {
      setError(x?.response?.data?.message || x?.response?.data || "Unable to submit leave request");
    } finally { setSaving(false); }
  }

  async function cancel(id: number) {
    if (!window.confirm("Cancel this leave request?")) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await api.patch(`/leaves/${id}/cancel`);
      setNotice("Leave request cancelled.");
      await load();
      await loadCalendar();
    } catch (x: any) {
      setError(x?.response?.data?.message || x?.response?.data || "Unable to cancel leave request");
    } finally { setSaving(false); }
  }

  async function reviewAction() {
    if (!review) return;
    if (review.action === "reject" && comment.trim().length < 3) {
      setError("Please provide a rejection reason.");
      return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await api.patch(`/leaves/${review.row.id}/status`, {
        status: review.action === "approve" ? "APPROVED" : "REJECTED",
        approvalComment: comment.trim(),
      });
      setNotice(review.action === "approve" ? "Leave approved and balance updated." : "Leave request rejected.");
      setReview(null); setComment("");
      await load();
    } catch (x: any) {
      setError(x?.response?.data?.message || x?.response?.data?.detail || x?.response?.data?.error || x?.message || "Unable to update leave request");
    } finally { setSaving(false); }
  }

  function setDurationType(value: string) {
    setForm((current: Row) => ({
      ...current,
      leaveDurationType: value,
      endDate: value === "FULL_DAY" ? current.endDate : current.startDate,
    }));
  }

  // Dashboard shortcuts select the real existing leave form; clear the query to
  // prevent reopening it after a refresh, back-navigation or unrelated state change.
  useEffect(() => {
    const flow = new URLSearchParams(location.search).get("apply");
    if (!canApplyOwn || !["regular", "short"].includes(String(flow))) return;
    openLeaveForm(flow === "short" ? "SHORT" : "REGULAR");
    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, canApplyOwn, navigate]);

  function openLeaveForm(flow: "REGULAR" | "SHORT") {
    setLeaveFlow(flow);
    setWhatsappUrl("");
    setForm((current: Row) => {
      const startDate = current.startDate >= todayIso() ? current.startDate : todayIso();
      return { ...current,
        leaveType: flow === "SHORT" ? "" :
          (["Casual Leave", "Leave Without Pay", "Project Off"].includes(current.leaveType) ? current.leaveType : "Casual Leave"),
        startDate,
        leaveDurationType: flow === "SHORT" ? "FIRST_HALF" : "FULL_DAY",
        endDate: flow === "SHORT" || current.endDate < startDate ? startDate : current.endDate,
        managerNotificationEmail: role === "EMPLOYEE" ? (context.projectManagerEmail || "") : "",
      };
    });
    setApplyOpen(true);
  }

  const requested = durationDays(form);
  const title = personalView ? "My Leave" : manager ? "Team Leave Approvals" : "Leave Management";
  const subtitle = personalView
    ? "Check your own leave balance, attendance calendar, holidays and submit leave requests."
    : manager
      ? "Review leave requests submitted by employees who report to you."
      : "Review organization leave requests and approval activity from one workspace.";

  return <div className="workflow-v7 leave-v7 leave-v72">
    <div className="workflow-v7-head">
      <div>
        <span className="workflow-v7-kicker">Time & Attendance</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="workflow-v7-head-actions">
        <button className="th-outline" onClick={() => downloadCsv(filtered)}><DownloadRounded fontSize="small" /> Export Excel</button>
        <button className="th-outline" onClick={load}><RefreshRounded fontSize="small" /> Refresh</button>
        {canApplyOwn && <><button className="th-primary" onClick={() => openLeaveForm("REGULAR")}><AddRounded fontSize="small" /> Regular Leave</button>
        <button className="th-outline" onClick={() => openLeaveForm("SHORT")}><CalendarMonthRounded fontSize="small" /> Short Leave</button></>}
      </div>
    </div>

    {!selfService && (role === "MANAGER" || role === "HR") && <div className="portal-scope-tabs" role="tablist" aria-label="Leave view">
      <button className={personalView ? "active" : ""} onClick={() => setScope("MY")}>My Leave</button>
      <button className={!personalView ? "active" : ""} onClick={() => setScope(manager ? "TEAM" : "ORG")}>{manager ? "Team Leave Approvals" : "Employee Leave Management"}</button>
    </div>}

    {error && <div className="th-alert error">{error}</div>}
    {notice && <div className="th-alert success">{notice}{whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="leave-whatsapp-link">Share with manager on WhatsApp (optional)</a>}</div>}

    {personalView && <>
      <section className="leave-v7-balances">
        <div className="workflow-v7-section-title"><div><h2>Leave Balance</h2><p>Available and availed leave for {new Date().getFullYear()}.</p></div></div>
        <div className="leave-v7-balance-grid">
          {balances.length ? balances.map((b, i) => <article className="leave-v7-balance-card leave-v72-balance" key={b.id ?? i}>
            <div className="leave-v72-balance-head"><span>{text(b.leaveType)}</span>{b.code && <small>{b.code}</small>}</div>
            <div className="leave-v72-balance-values">
              <div><strong>{formatNumber(b.available ?? b.balance)}</strong><span>Available</span></div>
              <div><strong>{formatNumber(b.availed)}</strong><span>Availed</span></div>
            </div>
            <p>Entitlement: {formatNumber(b.entitlement ?? Number(b.balance || 0) + Number(b.availed || 0))} days · {b.year}</p>
          </article>) : <article className="leave-v7-balance-card muted"><div><span>Leave Balance</span></div><strong>—</strong><p>No balance configured yet</p></article>}
        </div>
      </section>

      <section className="leave-v72-calendar-shell">
        <div className="leave-v72-calendar-card">
          <div className="leave-v72-calendar-head">
            <div><h2>Holiday & Attendance Calendar</h2><p>Daily attendance, weekends, approved leave and company holidays.</p></div>
            <span className="leave-calendar-help">Use Regular Leave or Short Leave above to apply.</span>
          </div>
          <div className="leave-v72-legend">
            <span><i className="present" />Present</span>
            <span><i className="absent" />Absent</span>
            <span><i className="weekend" />Weekend</span>
            <span><i className="holiday" />Holiday</span>
            <span><i className="leave" />Leave</span>
          </div>
          <div className="leave-v72-calendar-toolbar">
            <div className="leave-v72-calendar-nav">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeftRounded fontSize="small" /></button>
              <button className="today" onClick={() => setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRightRounded fontSize="small" /></button>
            </div>
            <strong>{calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" }).toUpperCase()}</strong>
            <span className="leave-v72-calendar-mode">Month</span>
          </div>
          <div className="leave-v72-calendar-weekdays">{["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => <span key={d}>{d}</span>)}</div>
          <div className={`leave-v72-calendar-grid ${calendarLoading ? "loading" : ""}`}>
            {calendar.map((cell) => {
              if (!cell.date) return <div className="leave-v72-day blank" key={cell.key} />;
              const state = dayState(cell.date);
              const isToday = isoDate(cell.date) === todayIso();
              return <div key={cell.key} className={`leave-v72-day ${state.type} ${isToday ? "today" : ""}`}>
                <span className="number">{cell.date.getDate()}</span>
                {state.label && <span className="state">{state.label}</span>}
              </div>;
            })}
          </div>
        </div>

        <aside className="leave-v72-holiday-list">
          <div className="leave-v72-holiday-title"><EventAvailableRounded fontSize="small" /><div><h3>{calendarMonth.getFullYear()} Holidays</h3><p>Organization holiday list</p></div></div>
          <div className="leave-v72-holiday-items">
            {yearHolidays.map((h) => <div key={h.id ?? `${h.holidayDate}-${h.name}`}><time>{shortDate(h.holidayDate)}</time><strong>{h.name}</strong></div>)}
            {!yearHolidays.length && <p className="leave-v72-no-holiday">No holidays configured for this year.</p>}
          </div>
        </aside>
      </section>
    </>}

    <div className="workflow-v7-summary-grid">
      <SummaryCard icon={<CalendarMonthRounded />} label="Total Requests" value={stats.total} caption="All visible requests" />
      <SummaryCard icon={<HourglassTopRounded />} label="Pending" value={stats.pending} caption="Awaiting review" tone="amber" />
      <SummaryCard icon={<CheckCircleOutlineRounded />} label="Approved" value={stats.approved} caption="Approved requests" tone="green" />
      <SummaryCard icon={<ReplayRounded />} label="Requested Days" value={formatNumber(stats.days)} caption="Across visible history" tone="violet" />
    </div>

    <section className="workflow-v7-filter-card">
      <div className="workflow-v7-filter-title"><FilterAltRounded fontSize="small" /><div><strong>Filter leave records</strong><span>Narrow results without leaving the page.</span></div></div>
      <div className="workflow-v7-filters">
        {!personalView && <label><span>Employee / leave type</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, ID, type..." /></label>}
        {personalView && <label className="wide"><span>Search</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leave type or reason..." /></label>}
        <label><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option></select></label>
        <label><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="th-outline workflow-v7-clear" onClick={() => { setSearch(""); setStatus("ALL"); setFrom(""); setTo(""); }}><RefreshRounded fontSize="small" /> Clear</button>
      </div>
    </section>

    {loading ? <div className="workflow-v7-loading"><CircularProgress size={28} /><span>Loading leave requests...</span></div> : <section className="workflow-v7-table-card">
      <div className="workflow-v7-table-head"><div><h2>Leave Requests</h2><p>{filtered.length} record{filtered.length === 1 ? "" : "s"} found{role === "ADMIN" ? " · Employee leave: view only · Manager and HR leave: approval enabled" : ""}</p></div></div>
      <div className="workflow-v7-table-scroll"><table className="workflow-v7-table"><thead><tr>{!personalView && <th>Employee</th>}{!personalView && <th>Role</th>}<th>Category</th><th>Leave Type</th><th>Period</th><th>Days</th><th>Reason</th><th>Status</th><th>Review Note</th><th className="right">Action</th></tr></thead><tbody>
        {paginatedLeaves.map((r, i) => <tr key={r.id ?? i}>
          {!personalView && <td><div className="workflow-v7-person"><span>{String(r.employeeName || r.employeeId || "E").slice(0, 1).toUpperCase()}</span><div><strong>{text(r.employeeName)}</strong><small>{text(r.employeeId)}</small></div></div></td>}
          {!personalView && <td>{text(r.employeeRole)}</td>}<td><strong className="workflow-v7-primary-text">{text(r.leaveType)}</strong></td>
          <td><span className="workflow-v7-mode">{durationLabel(r.leaveDurationType)}</span></td>
          <td><div className="workflow-v7-period"><strong>{shortDate(r.startDate)}</strong><span>to {shortDate(r.endDate)}</span></div></td>
          <td><span className="workflow-v7-days">{formatNumber(durationDays(r))}</span></td>
          <td><div className="workflow-v7-reason" title={text(r.reason)}>{text(r.reason)}</div></td>
          <td><span className={`status ${String(r.status || "").toLowerCase()}`}>{text(r.status)}</span></td>
          <td><div className="workflow-v7-note">{text(r.approvalComment)}</div></td>
          <td className="right"><div className="workflow-v7-row-actions">
            {personalView && String(r.status).toUpperCase() === "PENDING" && <button className="th-danger small" disabled={saving} onClick={() => cancel(r.id)}>Cancel</button>}
            {canReview && r.canReview === true && String(r.status).toUpperCase() === "PENDING" && <><button className="th-outline small" onClick={() => { setReview({ row: r, action: "reject" }); setComment(""); setError(""); }}>Reject</button><button className="th-primary small" onClick={() => { setReview({ row: r, action: "approve" }); setComment(""); setError(""); }}>Approve</button></>}
          </div></td>
        </tr>)}
      </tbody></table></div>
      <PaginationBar page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
      {!filtered.length && <div className="workflow-v7-empty"><CalendarMonthRounded /><h3>No leave requests found</h3><p>Try changing your filters{personalView ? " or submit a new leave request" : ""}.</p></div>}
    </section>}

    {canApplyOwn && applyOpen && <div className="th-modal-backdrop"><form className="th-modal workflow-v7-modal leave-v72-apply" onSubmit={submit}>
      <div className="th-modal-head"><div><h2>{leaveFlow === "SHORT" ? "Apply Short Leave" : "Apply Regular Leave"}</h2><p>{leaveFlow === "SHORT" ? "Choose first or second half for a single day." : "Choose Casual Leave, Leave Without Pay or Project Off."}</p></div><button type="button" onClick={() => setApplyOpen(false)}>×</button></div>
      <div className="th-form-grid leave-v72-form-grid">
        {leaveFlow === "REGULAR" && <label><span>Leave category *</span><select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} required><option value="">Select Leave</option>{types.filter((t) => ["CASUAL_LEAVE", "LEAVE_WITHOUT_PAY", "PROJECT_OFF"].includes(String(t.code || "").toUpperCase())).map((t) => <option key={t.id ?? t.name} value={t.name}>{t.name}</option>)}</select></label>}
        {role === "EMPLOYEE" ? <>
          <label><span>Assigned manager</span><input value={context.projectManager || "Not assigned"} readOnly className="read-only" /></label>
          <label className="full-width"><span>Assigned manager email (optional)</span><input type="email" value={form.managerNotificationEmail || ""} onChange={(e) => setForm({ ...form, managerNotificationEmail: e.target.value })} placeholder="manager@company.com" /><small className="leave-v72-help">Only the verified email of your assigned manager is accepted.</small></label>
        </> : <label className="full-width"><span>{role === "MANAGER" ? "Optional Admin reviewer" : "Optional Admin reviewer"}</span>
          <select value={form.managerNotificationEmail || ""} onChange={(e) => setForm({ ...form, managerNotificationEmail: e.target.value })}>
            <option value="">No reviewer selected — automatic notifications still apply</option>
            {(context.optionalReviewers || []).map((person: Row) => <option key={person.email} value={person.email}>{person.label} ({person.role}) · {person.email}</option>)}
          </select><small className="leave-v72-help">Optional extra email with SMTP configured. HR/Admin portal notifications happen automatically.</small>
        </label>}
        <label><span>{leaveFlow === "SHORT" ? "Short leave period *" : "Duration"}</span>{leaveFlow === "SHORT" ? <select value={form.leaveDurationType} onChange={(e) => setDurationType(e.target.value)} required><option value="FIRST_HALF">First Half</option><option value="SECOND_HALF">Second Half</option></select> : <input readOnly value="Full day" className="read-only" />}</label>
        <div className="workflow-v7-duration-preview"><span>Requested duration</span><strong>{formatNumber(requested)} day{requested === 1 ? "" : "s"}</strong></div>
        <label><span>{leaveFlow === "SHORT" ? "Date *" : "From *"}</span><input type="date" value={form.startDate} min={todayIso()} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.leaveDurationType === "FULL_DAY" ? (form.endDate < e.target.value ? e.target.value : form.endDate) : e.target.value })} required /></label>
        {leaveFlow === "REGULAR" && <label><span>To *</span><input type="date" value={form.endDate} min={form.startDate || todayIso()} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></label>}
        <label className="full-width"><span>Reason *</span><textarea value={form.reason} minLength={3} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Briefly explain the reason for your leave..." required /></label>
      </div>
      <div className="th-modal-actions"><button type="button" className="th-outline" onClick={() => setApplyOpen(false)}>Cancel</button><button className="th-primary" disabled={saving}>{saving ? "Submitting..." : "Submit Leave Request"}</button></div>
    </form></div>}

    {review && <div className="th-modal-backdrop"><div className="th-modal workflow-v7-modal review-modal">
      <div className="th-modal-head"><div><h2>{review.action === "approve" ? "Approve Leave" : "Reject Leave"}</h2><p>{review.row.employeeName || review.row.employeeId} · {shortDate(review.row.startDate)} to {shortDate(review.row.endDate)}</p></div><button type="button" onClick={() => setReview(null)}>×</button></div>
      <div className="workflow-v7-review-body"><div className="workflow-v7-review-summary"><div><span>{["FIRST_HALF", "SECOND_HALF"].includes(String(review.row.leaveDurationType || "").toUpperCase()) ? "Leave" : "Category"}</span><strong>{text(review.row.leaveType)}</strong></div><div><span>Leave Type</span><strong>{durationLabel(review.row.leaveDurationType)}</strong></div><div><span>Duration</span><strong>{formatNumber(durationDays(review.row))} day(s)</strong></div><div><span>Project Manager</span><strong>{text(review.row.reportingManagerName)}</strong></div><div className="wide"><span>Reason</span><strong>{text(review.row.reason)}</strong></div></div><label><span>{review.action === "reject" ? "Rejection reason" : "Approval note (optional)"}</span><textarea autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder={review.action === "reject" ? "Explain why this request is being rejected..." : "Add an optional note for the employee..."} /></label></div>
      {error && <div className="th-alert error" role="alert">{error}</div>}
      <div className="th-modal-actions"><button className="th-outline" onClick={() => setReview(null)}>Cancel</button><button className={review.action === "approve" ? "th-primary" : "th-danger"} disabled={saving || (review.action === "reject" && comment.trim().length < 3)} onClick={reviewAction}>{saving ? "Saving..." : review.action === "approve" ? "Approve Leave" : "Reject Leave"}</button></div>
    </div></div>}
  </div>;
}

function SummaryCard({ icon, label, value, caption, tone = "blue" }: { icon: any; label: string; value: any; caption: string; tone?: string }) {
  return <article className={`workflow-v7-summary-card ${tone}`}><span className="workflow-v7-summary-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{caption}</p></div></article>;
}
