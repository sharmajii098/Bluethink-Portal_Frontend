import { useSelfService } from "../contexts/RequestViewContext";
import { downloadBrandedCsv } from "../utils/brandedExport";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import {
  AddRounded,
  CheckCircleOutlineRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  DownloadRounded,
  FilterAltRounded,
  HourglassTopRounded,
  RefreshRounded,
  ScheduleRounded,
  TableRowsRounded,
} from "@mui/icons-material";
import { RootState } from "../store";
import { api } from "../services/api";

type Row = Record<string, any>;
type Scope = "MY" | "TEAM" | "ORG" | "MENTEE";
type CalendarDay = {
  date: string;
  state: string;
  label: string;
  required?: boolean;
  canFill?: boolean;
  locked?: boolean;
  hours?: number;
  entryCount?: number;
  timesheetStatus?: string | null;
  cutoffDate?: string;
};

const number = (v: any) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const shortDate = (value: any) => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const isoToday = () => new Date().toISOString().slice(0, 10);
const blankForm = (date = isoToday()) => ({ date, hoursWorked: 8, taskDescription: "", workMode: "OFFICE", projectId: "", mentorshipId: "" });
const monthLabel = (date: Date) => date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const toYearMonth = (date: Date) => ({ year: date.getFullYear(), month: date.getMonth() + 1 });

export default function TimesheetPage({ adminAll = false }: { adminAll?: boolean }) {
 const selfService = useSelfService();
  const session = useSelector((s: RootState) => s.auth.session);
  const role = session?.role || "EMPLOYEE";
  const currentUserId = session?.userId || "";
  const canSubmitOwn = role === "EMPLOYEE" || role === "MANAGER" || role === "HR";
  const [scope, setScope] = useState<Scope>(() => selfService ? "MY" : role === "MANAGER" ? "TEAM" : role === "HR" || role === "ADMIN" ? "ORG" : "MY");
  const personalView = scope === "MY" && role !== "ADMIN";
  const mentorView = scope === "MENTEE";
  const canReview = !personalView && !mentorView && (role === "ADMIN" || role === "HR" || role === "MANAGER");
  const endpoint = mentorView ? "/timesheets/mentee" : adminAll || role === "ADMIN" ? "/timesheets" : personalView ? "/timesheets/my" : role === "MANAGER" ? "/timesheets/team" : "/timesheets";

  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [learningAssignments, setLearningAssignments] = useState<Row[]>([]);
  const [mentorAssignments, setMentorAssignments] = useState<Row[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [context, setContext] = useState<Row>({});
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState<Row | null>(null);
  const [reviewMode, setReviewMode] = useState<"MANAGER" | "MENTOR">("MANAGER");
  const [reviewComment, setReviewComment] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [form, setForm] = useState<Row>(blankForm());

  async function loadRows() {
    setLoading(true); setError("");
    try {
      const r = await api.get(endpoint);
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load timesheets");
      setRows([]);
    } finally { setLoading(false); }
  }

  async function loadMentorships() {
    try {
      const r = await api.get("/mentorships/my");
      const data = Array.isArray(r.data) ? r.data : [];
      setLearningAssignments(data.filter((x: Row) => String(x.menteeUserId || "") === currentUserId && String(x.status || "").toUpperCase() === "ACTIVE"));
      setMentorAssignments(data.filter((x: Row) => String(x.mentorUserId || "") === currentUserId && String(x.status || "").toUpperCase() !== "CANCELLED"));
    } catch {
      setLearningAssignments([]); setMentorAssignments([]);
    }
  }

  async function loadCalendar() {
    if (!canSubmitOwn || !personalView) { setCalendar([]); setContext({}); setProjects([]); return; }
    setCalendarLoading(true);
    const { year, month } = toYearMonth(calendarMonth);
    try {
      const [cal, ctx, proj] = await Promise.all([
        api.get("/timesheets/calendar", { params: { year, month } }),
        api.get("/timesheets/context", { params: { year, month } }),
        api.get("/projects/my"),
      ]);
      setCalendar(Array.isArray(cal.data) ? cal.data : []);
      setContext(ctx.data || {});
      setProjects(Array.isArray(proj.data) ? proj.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load timesheet calendar");
      setCalendar([]);
    } finally { setCalendarLoading(false); }
  }

  async function loadAll() {
    await Promise.all([loadRows(), loadCalendar(), loadMentorships()]);
  }

  useEffect(() => { loadRows(); }, [endpoint]);
  useEffect(() => { loadCalendar(); }, [calendarMonth.getFullYear(), calendarMonth.getMonth(), canSubmitOwn, personalView]);
  useEffect(() => { loadMentorships(); }, [currentUserId, role]);

  const filtered = useMemo(() => rows.filter((r) =>
    (!statusFilter || String(r.status || "").toUpperCase() === statusFilter)
    && (!employeeFilter || `${r.employeeName || ""} ${r.employeeId || ""} ${r.projectName || ""} ${r.taskDescription || ""}`.toLowerCase().includes(employeeFilter.toLowerCase()))
    && (!fromDate || String(r.date || "") >= fromDate)
    && (!toDate || String(r.date || "") <= toDate)
  ), [rows, statusFilter, employeeFilter, fromDate, toDate]);

  const stats = useMemo(() => ({
    entries: filtered.length,
    hours: filtered.reduce((n, r) => n + Number(r.hoursWorked || 0), 0),
    pending: filtered.filter((r) => String(r.status).toUpperCase() === "PENDING").length,
    approved: filtered.filter((r) => String(r.status).toUpperCase() === "APPROVED").length,
  }), [filtered]);

  const calendarStats = useMemo(() => ({
    present: calendar.filter(d => d.state === "PRESENT").length,
    absent: calendar.filter(d => d.state === "ABSENT").length,
    leave: calendar.filter(d => d.state === "LEAVE" || d.state === "PROJECT_OFF").length,
    required: calendar.filter(d => d.required && !["FUTURE"].includes(d.state)).length,
  }), [calendar]);

  const calendarCells = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const blanks = Array.from({ length: first.getDay() }, () => null as CalendarDay | null);
    return [...blanks, ...calendar];
  }, [calendar, calendarMonth]);

  const ownEntryForDate = (date: string) => rows
    .filter(r => String(r.employeeId || "") === currentUserId && String(r.date || "").slice(0, 10) === date)
    .filter(r => ["PENDING", "REJECTED"].includes(String(r.status || "").toUpperCase()))
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];

  function openCreate(date = isoToday()) {
    if (!canSubmitOwn) return;
    setEditing(null);
    setForm(blankForm(date));
    setError(""); setNotice("");
    setFormOpen(true);
  }

  function edit(row: Row) {
    setEditing(row);
    setForm({ date: row.date || "", hoursWorked: row.hoursWorked || "", taskDescription: row.taskDescription || "", workMode: row.workMode || "OFFICE", projectId: row.projectId || "", mentorshipId: row.mentorshipId || "" });
    setError(""); setNotice("");
    setFormOpen(true);
  }

  function openCalendarDay(day: CalendarDay) {
    if (!canSubmitOwn || !day.canFill) return;
    const existing = ownEntryForDate(day.date);
    if (existing && ["PENDING", "REJECTED"].includes(String(existing.status || "").toUpperCase())) edit(existing);
    else if (!existing) openCreate(day.date);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...form, hoursWorked: Number(form.hoursWorked), projectId: form.projectId || undefined, mentorshipId: form.mentorshipId || undefined };
      if (editing) await api.put(`/timesheets/${editing.id}`, payload);
      else await api.post("/timesheets", payload);
      setNotice(editing ? "Timesheet updated successfully." : "Timesheet submitted successfully.");
      setEditing(null); setFormOpen(false); setForm(blankForm());
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to save timesheet");
    } finally { setSaving(false); }
  }

  async function changeStatus(id: number, status: string, comment = "") {
    setSaving(true); setError(""); setNotice("");
    try {
      await api.patch(`/timesheets/${id}/status`, { status, comment });
      setNotice(`Timesheet ${status.toLowerCase()} successfully.`);
      setReviewing(null); setReviewComment("");
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Unable to update timesheet status");
    } finally { setSaving(false); }
  }

  async function mentorReview(id: number, status: string, comment = "") {
    setSaving(true); setError(""); setNotice("");
    try {
      await api.patch(`/timesheets/${id}/mentor-review`, { status, comment });
      setNotice(status === "APPROVED" ? "Learning timesheet checked by senior mentor." : "Changes requested from learner.");
      setReviewing(null); setReviewComment("");
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Unable to review learner timesheet");
    } finally { setSaving(false); }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this pending timesheet entry?")) return;
    try {
      await api.delete(`/timesheets/${id}`);
      setNotice("Timesheet deleted.");
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to delete timesheet");
    }
  }

  function exportCsv() {
    if (!filtered.length) return;
    const headers = ["Date", "Employee ID", "Employee", "Project", "Hours", "Work Mode", "Task", "Status", "Review Comment"];
    const lines = [headers, ...filtered.map((r) => [r.date, r.employeeId, r.employeeName, r.projectName || "General / Non-Project Work", r.hoursWorked, r.workMode, r.taskDescription, r.status, r.approvalComment])]
      .map((a) => a.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","));
    void downloadBrandedCsv(lines.join("\n"), "timesheets.csv");
  }

  const title = mentorView ? "Mentee Timesheet Reviews" : personalView ? "My Timesheets" : role === "MANAGER" ? "Team Timesheets" : role === "HR" ? "Employee Timesheets" : "Timesheet Management";
  const subtitle = mentorView
    ? "Check work submitted by junior / trainee employees assigned to you for learning or project shadowing before Manager approval."
    : personalView
      ? "Fill your own daily timesheet. If you are shadowing a senior employee, link the learning assignment so both Senior and Manager can review your work."
      : role === "MANAGER"
        ? "Review work logs submitted by employees who report to you. Learning timesheets are first checked by the assigned senior mentor."
        : role === "HR"
          ? "Monitor organization timesheets used for attendance and monthly payroll."
          : "Review Manager and HR timesheets only. Employee timesheets are handled by HR and Managers.";

  return <div className="workflow-v7 timesheet-v7 timesheet-v74">
    <div className="workflow-v7-head">
      <div><span className="workflow-v7-kicker">Work Logs & Payroll Attendance</span><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="workflow-v7-head-actions">
        <button className="th-outline" onClick={exportCsv}><DownloadRounded fontSize="small" /> Export Excel</button>
        <button className="th-outline" onClick={loadAll}><RefreshRounded fontSize="small" /> Refresh</button>
        {canSubmitOwn && personalView && <button className="th-primary" onClick={() => openCreate()}><AddRounded fontSize="small" /> Fill Timesheet</button>}
      </div>
    </div>

    {!selfService && (role === "MANAGER" || role === "HR" || mentorAssignments.length > 0) && <div className="portal-scope-tabs" role="tablist" aria-label="Timesheet view">
      {role !== "ADMIN" && <button className={personalView ? "active" : ""} onClick={() => setScope("MY")}>My Timesheet</button>}
      {(role === "MANAGER" || role === "HR") && <button className={scope === (role === "MANAGER" ? "TEAM" : "ORG") ? "active" : ""} onClick={() => setScope(role === "MANAGER" ? "TEAM" : "ORG")}>{role === "MANAGER" ? "Team Timesheets" : "Employee Timesheets"}</button>}
      {mentorAssignments.length > 0 && <button className={mentorView ? "active" : ""} onClick={() => setScope("MENTEE")}>Mentee Reviews ({mentorAssignments.length})</button>}
    </div>}

    {error && <div className="th-alert error">{error}</div>}
    {notice && <div className="th-alert success">{notice}</div>}

    {canSubmitOwn && personalView && <section className="timesheet-calendar-card">
      <div className="timesheet-calendar-toolbar">
        <div>
          <span className="workflow-v7-kicker">My Monthly Calendar</span>
          <h2>{monthLabel(calendarMonth)}</h2>
          <p>{context.managerName ? <>Reporting / project manager: <strong>{context.managerName}</strong> · </> : null}Timesheet cutoff: <strong>{context.cutoffDate ? shortDate(context.cutoffDate) : "2nd of next month"}</strong></p>
        </div>
        <div className="timesheet-month-nav">
          <button className="th-outline icon-only" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><ChevronLeftRounded /></button>
          <button className="th-outline" onClick={() => setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
          <button className="th-outline icon-only" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><ChevronRightRounded /></button>
        </div>
      </div>

      <div className={`timesheet-cutoff-banner ${context.cutoffPassed ? "locked" : "open"}`}>
        <strong>{context.cutoffPassed ? "Month locked for employee edits" : "Timesheet submission window open"}</strong>
        <span>{context.message || "Complete every required working day before payroll cutoff."}</span>
      </div>

      <div className="timesheet-calendar-summary">
        <span><b>{calendarStats.present}</b> Present / filled</span>
        <span><b>{calendarStats.absent}</b> Missing / absent</span>
        <span><b>{calendarStats.leave}</b> Paid leave / project off</span>
        <span><b>{calendarStats.required}</b> Required elapsed days</span>
      </div>

      <div className="timesheet-calendar-legend">
        <span><i className="present"/>Present</span><span><i className="absent"/>Missing / Absent</span><span><i className="leave"/>Casual Leave</span><span><i className="project-off"/>Project Off</span><span><i className="lwp"/>LWP</span><span><i className="holiday"/>Holiday</span><span><i className="weekend"/>Weekend</span>
      </div>

      {calendarLoading ? <div className="workflow-v7-loading"><CircularProgress size={24}/> Loading calendar…</div> : <div className="timesheet-calendar-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div className="timesheet-calendar-weekday" key={d}>{d}</div>)}
        {calendarCells.map((day, i) => day === null ? <div className="timesheet-calendar-day blank" key={`blank-${i}`}/> :
          <button key={day.date} type="button" className={`timesheet-calendar-day state-${String(day.state || "").toLowerCase().replaceAll("_","-")} ${day.canFill ? "clickable" : ""}`} onClick={() => openCalendarDay(day)} disabled={!day.canFill}>
            <span className="day-number">{Number(String(day.date).slice(-2))}</span>
            <strong>{day.label}</strong>
            {Number(day.hours || 0) > 0 && <small>{number(day.hours)}h logged</small>}
            {day.canFill && <em>{day.state === "PRESENT" ? "Edit" : "Fill timesheet"}</em>}
          </button>)}
      </div>}
    </section>}

    <div className="workflow-v7-summary-grid">
      <SummaryCard icon={<TableRowsRounded />} label="Entries" value={stats.entries} caption="Matching current filters" />
      <SummaryCard icon={<ScheduleRounded />} label="Total Hours" value={number(stats.hours)} caption="Logged work hours" tone="violet" />
      <SummaryCard icon={<HourglassTopRounded />} label="Pending" value={stats.pending} caption="Awaiting approval" tone="amber" />
      <SummaryCard icon={<CheckCircleOutlineRounded />} label="Approved" value={stats.approved} caption="Approved work logs" tone="green" />
    </div>

    <section className="workflow-v7-filter-card">
      <div className="workflow-v7-filter-title"><FilterAltRounded fontSize="small" /><div><strong>Filter timesheets</strong><span>Search work logs by employee, project, task or date.</span></div></div>
      <div className="workflow-v7-filters">
        <label className="wide"><span>Search</span><input placeholder={personalView ? "Project or task description..." : "Employee, ID, project or task..."} value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} /></label>
        <label><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
        <label><span>From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
        <label><span>To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        <button className="th-outline workflow-v7-clear" onClick={() => { setStatusFilter(""); setEmployeeFilter(""); setFromDate(""); setToDate(""); }}><RefreshRounded fontSize="small" /> Clear</button>
      </div>
    </section>

    {loading ? <div className="workflow-v7-loading"><CircularProgress size={28} /><span>Loading timesheets...</span></div> : <section className="workflow-v7-table-card">
      <div className="workflow-v7-table-head"><div><h2>{mentorView ? "Learner Work Log" : personalView ? "My Work Log" : role === "MANAGER" ? "Team Work Log" : role === "HR" ? "Organization Work Log" : "Manager & HR Work Log"}</h2><p>{filtered.length} record{filtered.length === 1 ? "" : "s"} · {number(stats.hours)} total hours</p></div></div>
      <div className="workflow-v7-table-scroll"><table className="workflow-v7-table"><thead><tr><th>Date</th>{!personalView && <th>Employee</th>}<th>Project</th><th>Learning / Mentor</th><th>Hours</th><th>Mode</th><th>Task Description</th><th>Status</th><th>Reviews</th><th className="right">Actions</th></tr></thead><tbody>
        {filtered.map((r) => {
          const own = String(r.employeeId || "") === currentUserId;
          return <tr key={r.id}>
            <td><strong className="workflow-v7-primary-text">{shortDate(r.date)}</strong></td>
            {!personalView && <td><div className="workflow-v7-person"><span>{String(r.employeeName || r.employeeId || "E").slice(0, 1).toUpperCase()}</span><div><strong>{r.employeeName || "—"}</strong><small>{r.employeeId || "—"}{r.employeeRole ? ` · ${r.employeeRole}` : ""}{own ? " · You" : ""}</small></div></div></td>}
            <td><strong className="workflow-v7-project">{r.projectName || "General / Non-Project Work"}</strong></td>
            <td>{r.entrySource === "STANDUP" && <span className="timesheet-source-tag" title="Created from daily stand-up; you can edit before approval">Stand-up auto-filled · </span>}{r.mentorshipId ? <div className="timesheet-learning-cell"><strong>{r.mentorName || "Senior Mentor"}</strong><small>{String(r.assignmentType || "SHADOWING").replaceAll("_", " ")}{r.learningManagerName ? ` · Manager: ${r.learningManagerName}` : ""}</small></div> : <span className="th-muted">Normal work</span>}</td>
            <td><span className="workflow-v7-hours">{number(r.hoursWorked)}h</span></td>
            <td><span className={`workflow-v7-mode ${String(r.workMode || "OFFICE").toLowerCase()}`}>{r.workMode || "OFFICE"}</span></td>
            <td><div className="workflow-v7-reason" title={r.taskDescription || ""}>{r.taskDescription || "—"}</div></td>
            <td><span className={`status ${String(r.status || "").toLowerCase()}`}>{r.status || "—"}</span></td>
            <td><div className="timesheet-review-stack">{r.mentorshipId && <span className={`review-chip ${String(r.mentorReviewStatus || "pending").toLowerCase()}`}>Senior: {r.mentorReviewStatus || "PENDING"}</span>}<span className={`review-chip ${String(r.status || "pending").toLowerCase()}`}>Manager: {r.status || "PENDING"}</span>{(r.mentorReviewComment || r.approvalComment) && <small>{r.mentorReviewComment || r.approvalComment}</small>}</div></td>
            <td className="right"><div className="workflow-v7-row-actions">
              {mentorView && String(r.status).toUpperCase() === "PENDING" && <><button className="th-outline small" onClick={() => { setReviewMode("MENTOR"); setReviewing(r); setReviewComment(""); setError(""); }}>Request Changes</button>{String(r.mentorReviewStatus || "").toUpperCase() !== "APPROVED" && <button className="th-primary small" onClick={() => mentorReview(r.id, "APPROVED")}>Senior Approve</button>}</>}
              {canReview && r.canReview === true && !own && String(r.status).toUpperCase() === "PENDING" && <><button className="th-outline small" onClick={() => { setReviewMode("MANAGER"); setReviewing(r); setReviewComment(""); setError(""); }}>Reject</button><button className="th-primary small" disabled={Boolean(r.mentorshipId) && String(r.mentorReviewStatus || "").toUpperCase() !== "APPROVED"} title={Boolean(r.mentorshipId) && String(r.mentorReviewStatus || "").toUpperCase() !== "APPROVED" ? "Waiting for senior mentor review" : "Approve"} onClick={() => changeStatus(r.id, "APPROVED")}>{Boolean(r.mentorshipId) && String(r.mentorReviewStatus || "").toUpperCase() !== "APPROVED" ? "Waiting for Senior" : "Approve"}</button></>}
              {personalView && canSubmitOwn && own && ["PENDING", "REJECTED"].includes(String(r.status).toUpperCase()) && <>
                <button className="th-outline small" onClick={() => edit(r)}>{String(r.status).toUpperCase() === "REJECTED" ? "Edit & Resubmit" : "Edit"}</button>
                {String(r.status).toUpperCase() === "PENDING" && <button className="th-danger small" onClick={() => remove(r.id)}>Delete</button>}
              </>}
            </div></td>
          </tr>;
        })}
      </tbody></table></div>
      {!filtered.length && <div className="workflow-v7-empty"><ScheduleRounded /><h3>No timesheet entries found</h3><p>{personalView && canSubmitOwn ? "Click a working day in the calendar to fill a timesheet." : "Change the filters to view more records."}</p></div>}
    </section>}

    {personalView && canSubmitOwn && formOpen && <TimesheetModal form={form} setForm={setForm} projects={projects} learningAssignments={learningAssignments} context={context} editing={Boolean(editing)} saving={saving} onClose={() => { setFormOpen(false); setEditing(null); }} onSubmit={submit} />}

    {reviewing && <div className="th-modal-backdrop"><div className="th-modal workflow-v7-modal review-modal">
      <div className="th-modal-head"><div><h2>{reviewMode === "MENTOR" ? "Request Learning Timesheet Changes" : "Reject Timesheet"}</h2><p>{reviewing.employeeName || reviewing.employeeId} · {shortDate(reviewing.date)}{reviewing.mentorName ? ` · Senior: ${reviewing.mentorName}` : ""}</p></div><button type="button" onClick={() => setReviewing(null)}>×</button></div>
      <div className="workflow-v7-review-body"><div className="workflow-v7-review-summary"><div><span>Project</span><strong>{reviewing.projectName || "General / Non-Project Work"}</strong></div><div><span>Hours</span><strong>{number(reviewing.hoursWorked)}h</strong></div><div className="wide"><span>Task</span><strong>{reviewing.taskDescription || "—"}</strong></div></div><label><span>Rejection reason</span><textarea autoFocus required minLength={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Explain what the employee needs to correct..." /></label></div>
      {error && <div className="th-alert error" role="alert">{error}</div>}
      <div className="th-modal-actions"><button className="th-outline" onClick={() => setReviewing(null)}>Cancel</button><button className="th-danger" disabled={saving || reviewComment.trim().length < 3} onClick={() => reviewMode === "MENTOR" ? mentorReview(reviewing.id, "REJECTED", reviewComment.trim()) : changeStatus(reviewing.id, "REJECTED", reviewComment.trim())}>{saving ? "Saving..." : reviewMode === "MENTOR" ? "Request Changes" : "Reject Timesheet"}</button></div>
    </div></div>}
  </div>;
}

function SummaryCard({ icon, label, value, caption, tone = "blue" }: { icon: any; label: string; value: any; caption: string; tone?: string }) {
  return <article className={`workflow-v7-summary-card ${tone}`}><span className="workflow-v7-summary-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{caption}</p></div></article>;
}

function TimesheetModal({ form, setForm, projects, learningAssignments, context, editing, saving, onClose, onSubmit }: any) {
  return <div className="th-modal-backdrop"><form className="th-modal workflow-v7-modal" onSubmit={onSubmit}>
    <div className="th-modal-head"><div><h2>{editing ? "Edit Timesheet" : "Fill Timesheet"}</h2><p>{shortDate(form.date)}{context.managerName ? ` · Reporting manager: ${context.managerName}` : ""}</p></div><button type="button" onClick={onClose}>×</button></div>
    <div className="timesheet-v74-form-note"><strong>Project & learning rule</strong><span>For normal work, choose your assigned project. For shadowing/learning, choose the Senior Mentor assignment; the linked project is selected automatically and the Senior reviews before Manager approval.</span></div>
    <div className="th-form-grid">
      <label><span>Date</span><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
      <label><span>Hours Worked</span><input type="number" min="0.25" max="24" step="0.25" required value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })} /></label>
      <label><span>Work Mode</span><select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}><option value="OFFICE">Office</option><option value="WFH">Work From Home</option><option value="HYBRID">Hybrid</option></select></label>
      <label><span>Learning / Shadow Assignment</span><select value={form.mentorshipId || ""} onChange={(e) => { const a = learningAssignments.find((x: Row) => String(x.id) === e.target.value); setForm({ ...form, mentorshipId:e.target.value, projectId:a?.projectId || form.projectId }); }}><option value="">Normal Work / No Mentor</option>{learningAssignments.filter((a: Row) => (!a.startDate || form.date >= a.startDate) && (!a.endDate || form.date <= a.endDate)).map((a: Row) => <option key={a.id} value={a.id}>{a.mentorName} · {String(a.assignmentType || "SHADOWING").replaceAll("_", " ")}{a.projectName ? ` · ${a.projectName}` : ""}</option>)}</select></label>
      <label><span>Assigned Project</span><select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} disabled={Boolean(form.mentorshipId && learningAssignments.find((a: Row) => String(a.id) === String(form.mentorshipId))?.projectId)}><option value="">General / Non-Project Work</option>{projects.map((p: Row) => <option key={p.id} value={p.id}>{p.projectName}{p.projectManagerName ? ` · ${p.projectManagerName}` : ""}</option>)}</select></label>
      <label className="full-width"><span>Task Description</span><textarea required minLength={3} value={form.taskDescription} onChange={(e) => setForm({ ...form, taskDescription: e.target.value })} placeholder="What did you work on? Include enough detail for your reviewer." /></label>
    </div>
    <div className="th-modal-actions"><button type="button" className="th-outline" onClick={onClose}>Cancel</button><button className="th-primary" disabled={saving}>{saving ? "Saving..." : editing ? "Update Timesheet" : "Submit Timesheet"}</button></div>
  </form></div>;
}
