/**
 * Bluethink Studio V11: role-specific, API-backed dashboards.
 * Dashboard action links route to existing permission-controlled pages. No
 * approval is performed from the dashboard itself; server rules remain final.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../store";
import { api } from "../services/api";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ApprovalRoundedIcon from "@mui/icons-material/ApprovalRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import CoffeeRoundedIcon from "@mui/icons-material/CoffeeRounded";
import { getTodayWorkSession, resumeWork, signOffWorkday, type WorkSession } from "../services/workSessionService";
type DashboardIcon = typeof PeopleAltRoundedIcon;

type Row = Record<string, any>;
type Tone = "blue" | "violet" | "green" | "amber";
type Action = { label: string; path: string; icon: DashboardIcon };
interface Stats {
  totalEmployees?: number; departments?: number; attendanceRate?: number;
  totalPayrollCost?: number; paidSalary?: number; pendingSalary?: number;
  joined?: number[]; left?: number[]; attendanceTrend?: number[];
  departmentNames?: string[]; departmentPayroll?: number[];
  payrollMonths?: string[]; monthlyPayroll?: number[];
  averageSalary?: number; highestSalary?: number; lowestSalary?: number;
  paidEmployees?: number; pendingEmployees?: number;
}
const pending = (row: Row) => String(row.status ?? "").toUpperCase() === "PENDING";
const display = (v: unknown) => v == null || String(v).trim() === "" ? "—" : String(v);
const nameOf = (row: Row) => display(row.employeeName || row.fullName || row.name || row.projectName || row.title || row.message || row.taskDescription || row.employeeId || "Record");
const niceDate = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};
const niceTime = (value: unknown) => {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};
const dateLabel = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

async function getRows(path: string, signal?: AbortSignal): Promise<Row[]> {
  const response = await api.get(path, { signal });
  if (Array.isArray(response.data)) return response.data;
  return response.data ? [response.data] : [];
}
function useDashboardData(paths: string[]) {
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const pathKey = paths.join("|");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      const result = await Promise.all(paths.map(async path => {
        try {
          if (path === "/dashboard/stats") {
            const response = await api.get<Stats>(path, { signal: controller.signal });
            return { path, success: true, value: response.data };
          }
          return { path, success: true, value: await getRows(path, controller.signal) };
        } catch {
          return { path, success: false, value: null };
        }
      }));
      if (!active) return;
      const nextData: Record<string, Row[]> = {};
      result.forEach(entry => { if (entry.success && entry.path !== "/dashboard/stats") nextData[entry.path] = entry.value as Row[]; });
      const summary = result.find(entry => entry.path === "/dashboard/stats");
      setData(nextData);
      setStats(summary?.success ? summary.value as Stats : null);
      setErrors(result.filter(entry => !entry.success).map(entry => entry.path));
      setUpdatedAt(result.some(entry => entry.success) ? new Date() : null);
      setLoading(false);
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [pathKey, refreshIndex]);
  return { data, stats, errors, loading, updatedAt, refresh: () => setRefreshIndex(index => index + 1) };
}

function DashboardCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bt9-card ${className}`}>{children}</section>;
}
function CardHeading({ title, caption, path, action = "View all", icon: Icon }: { title: string; caption?: string; path?: string; action?: string; icon?: DashboardIcon }) {
  const navigate = useNavigate();
  return <div className="bt9-card-heading"><div className="bt9-card-heading-text">{Icon && <span className="bt9-card-icon"><Icon fontSize="small" /></span>}<div><h2>{title}</h2>{caption && <p>{caption}</p>}</div></div>{path && <button className="bt9-text-link" onClick={() => navigate(path)}>{action}<ArrowForwardRoundedIcon fontSize="small" /></button>}</div>;
}
/** A compact actionable heading, instead of two repeated titles and a large hero. */
function DashboardToolbar({ role, name, primary, secondary, updatedAt, refresh, loading }: {
  role: string; name?: string; primary: Action; secondary: Action; updatedAt: Date | null; refresh: () => void; loading: boolean;
}) {
  const navigate = useNavigate();
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const title: Record<string,string> = { ADMIN:"Operations overview", HR:"People & culture", MANAGER:"Your team, at a glance", EMPLOYEE:`${greeting}, ${firstName}` };
  const section: Record<string,string> = { ADMIN:"Administration", HR:"People operations", MANAGER:"Leadership", EMPLOYEE:"My workday" };
  const symbol: Record<string,string> = { ADMIN:"⌘", HR:"✦", MANAGER:"↗", EMPLOYEE:"✳" };
  return <header className={`bt-compact-dashboard-top bt19-toolbar-${role.toLowerCase()}`}>
    <div className="bt19-dashboard-identity" aria-hidden="true"><span>{symbol[role] || "✦"}</span></div>
    <div className="bt-compact-dashboard-heading">
      <span className="bt-compact-dashboard-kicker">{section[role] || "Workspace"} <span aria-hidden="true">·</span> {dateLabel()}</span>
      <h1>{title[role] || "Dashboard"}</h1>
      <span className="bt19-refresh-status" role="status">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Live workspace"}</span>
    </div>
    <div className="bt-compact-dashboard-actions">
      <button type="button" className="bt-compact-dashboard-secondary" onClick={() => navigate(secondary.path)}>{secondary.label}</button>
      <button type="button" className="bt-compact-dashboard-primary" onClick={() => navigate(primary.path)}><primary.icon fontSize="small" />{primary.label}</button>
      <button type="button" className="bt-compact-dashboard-refresh" onClick={refresh} disabled={loading} aria-label={loading ? "Refreshing dashboard data" : "Refresh dashboard data"} title="Refresh dashboard data"><RefreshRoundedIcon fontSize="small" /></button>
    </div>
    <span className="bt10-sr-only" aria-live="polite">{updatedAt && `Data updated at ${updatedAt.toLocaleTimeString("en-IN")}`}</span>
  </header>;
}

function StatCard({ icon: Icon, label, value, note, tone = "blue", path }: { icon: DashboardIcon; label: string; value: ReactNode; note: string; tone?: Tone; path?: string }) {
  const navigate = useNavigate();
  return <div className={`bt9-stat bt9-${tone}`}>
    <div className="bt9-stat-top"><span className="bt9-stat-icon"><Icon /></span>{path && <button aria-label={`Open ${label}`} onClick={() => navigate(path)}><ArrowForwardRoundedIcon fontSize="small" /></button>}</div>
    <div className="bt10-stat-content"><span className="bt9-stat-label">{label}</span><strong className="bt9-stat-value">{value}</strong><span className="bt9-stat-note">{note}</span></div>
  </div>;
}
function Status({ value }: { value: unknown }) {
  if (!value) return null;
  const status = String(value).toUpperCase();
  const tone = ["APPROVED", "COMPLETED", "PAID", "PRESENT", "ACTIVE"].includes(status) ? "good" :
    ["REJECTED", "ABSENT", "FAILED", "CANCELLED"].includes(status) ? "bad" :
    ["PENDING", "LATE", "IN_PROGRESS"].includes(status) ? "waiting" : "neutral";
  return <span className={`bt9-status bt9-status-${tone}`}>{String(value).replaceAll("_", " ")}</span>;
}
function Records({ title, caption, data, path, empty, icon, kind = "generic", action }: {
  title: string; caption: string; data: Row[] | undefined; path: string; empty: string; icon: DashboardIcon;
  kind?: "leave" | "timesheet" | "attendance" | "employee" | "project" | "notification" | "generic";
  action?: string;
}) {
  const navigate = useNavigate();
  return <DashboardCard><CardHeading title={title} caption={caption} path={path} action={action} icon={icon} />
    {!data ? <div className="bt9-empty">Unable to load this section. Try Refresh overview.</div> : data.length === 0 ? <div className="bt9-empty"><TaskAltRoundedIcon /><strong>All clear</strong><span>{empty}</span></div> :
      <div className="bt9-record-list">{data.slice(0, 5).map((row, index) => {
        const meta = kind === "leave" ? `${display(row.leaveType || "Short leave")} · ${niceDate(row.startDate)}` :
          kind === "timesheet" ? `${niceDate(row.date)}${row.hoursWorked != null ? ` · ${row.hoursWorked} hrs` : ""}` :
          kind === "attendance" ? `${niceDate(row.date || row.attendanceDate)} · ${display(row.workMode || "Attendance")}` :
          kind === "employee" ? display(row.designation || row.departmentName || row.department || row.employeeId) :
          kind === "notification" ? niceDate(row.createdAt || row.date) :
          display(row.department || row.projectStatus || row.date || row.taskDescription);
        return <button className="bt9-record" key={String(row.id ?? row.employeeId ?? index)} onClick={() => navigate(path)}>
          <span className="bt9-record-avatar">{kind === "notification" ? <NotificationsNoneRoundedIcon fontSize="small" /> : nameOf(row).charAt(0).toUpperCase()}</span>
          <span className="bt9-record-copy"><strong>{nameOf(row)}</strong><small>{meta}</small></span>
          <span className="bt9-record-right"><Status value={row.status} /><ArrowForwardRoundedIcon fontSize="small" /></span>
        </button>;
      })}</div>}
  </DashboardCard>;
}
function Actions({ title, caption, actions }: { title: string; caption: string; actions: Action[] }) {
  const navigate = useNavigate();
  return <DashboardCard><CardHeading title={title} caption={caption} icon={BoltRoundedIcon} /><div className="bt9-action-list">{actions.map(({ icon: Icon, label, path }) =>
    <button key={path} className="bt9-action-row" onClick={() => navigate(path)}><span><Icon fontSize="small" /></span><strong>{label}</strong><ArrowForwardRoundedIcon fontSize="small" /></button>)}</div></DashboardCard>;
}

function DashboardCelebrations() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.session?.role || "EMPLOYEE");
  const notificationsPath = `/${String(role).toLowerCase()}/notifications`;
  const load = async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const response = await api.get<Row[]>("/employee-milestones/upcoming", { params: { days: 30 } });
      const rows = Array.isArray(response.data) ? response.data : [];
      // Stable identity dedupe: employee + milestone type + occurrence date.
      const unique = new Map<string, Row>();
      rows.forEach(row => {
        const date = String(row.date || "").slice(0, 10);
        const type = String(row.type || "").toUpperCase();
        const id = String(row.employeeId ?? row.userId ?? row.employeeName ?? "").trim().toLowerCase();
        if (!id || !date || !["BIRTHDAY", "WORK_ANNIVERSARY"].includes(type)) return;
        const key = `${id}|${type}|${date}`;
        if (!unique.has(key)) unique.set(key, row);
      });
      setItems(Array.from(unique.values()).sort((a, b) => String(a.date).localeCompare(String(b.date))));
      setError("");
    } catch {
      setError("Celebrations could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => { void load(); }, []);
  const today = todayKey();
  const todays = items.filter(item => String(item.date || "").slice(0, 10) === today);
  const birthdays = items.filter(item => String(item.type).toUpperCase() === "BIRTHDAY").slice(0, 6);
  const anniversaries = items.filter(item => String(item.type).toUpperCase() === "WORK_ANNIVERSARY").slice(0, 6);
  const remaining = (item: Row) => {
    const date = new Date(`${String(item.date || "").slice(0, 10)}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    const days = Math.max(0, Math.round((date.getTime() - now.getTime()) / 86400000));
    return `${days} ${days === 1 ? "day" : "days"}`;
  };
  const date = (value: unknown) => {
    const raw = String(value || "").slice(0, 10);
    const parsed = new Date(`${raw}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
  };
  const Table = ({ title, type, rows }: { title: string; type: "BIRTHDAY" | "WORK_ANNIVERSARY"; rows: Row[] }) => <section className="bt-celebration-table-card">
    <header className="bt-celebration-table-heading">
      <span className={`bt-celebration-table-icon ${type === "BIRTHDAY" ? "birthday" : "anniversary"}`}>{type === "BIRTHDAY" ? <CakeRoundedIcon /> : <CardGiftcardRoundedIcon />}</span>
      <div className="bt-celebration-table-title"><h3>{title}</h3><p>{type === "BIRTHDAY" ? "Stay connected and wish your team members." : "Recognize and celebrate their journey."}</p></div>
      <button className="bt-celebration-refresh" onClick={() => void load(true)} disabled={refreshing} aria-label={`Refresh ${title}`} title="Refresh">↻</button>
      <button className="bt-celebration-view-notifications" onClick={() => navigate(notificationsPath)}>♧ <span>View Notifications</span> ›</button>
    </header>
    {loading ? <div className="bt-celebration-table-empty">Loading celebrations…</div> : error ? <div className="bt-celebration-table-empty error">{error}</div> : rows.length === 0 ? <div className="bt-celebration-table-empty">No upcoming {type === "BIRTHDAY" ? "birthdays" : "work anniversaries"} in the next 30 days.</div> : <div className="bt-celebration-table-scroll"><table className="bt-celebration-table"><thead><tr><th>No</th><th>Employee Name</th><th>{type === "BIRTHDAY" ? "Date of Birth" : "Joining Date"}</th><th>Days Remaining</th></tr></thead><tbody>{rows.map((item, index) => <tr key={`${item.employeeId ?? item.userId ?? item.employeeName}-${type}-${String(item.date).slice(0, 10)}`}><td>{index + 1}</td><td title={String(item.employeeName || "Employee")}>{item.employeeName || "Employee"}</td><td>{date(item.date)}</td><td><span className={`bt-celebration-days ${Number(item.daysUntil) <= 3 ? "soon" : Number(item.daysUntil) <= 14 ? "near" : "later"}`}>{item.daysUntil != null ? `${item.daysUntil} ${Number(item.daysUntil) === 1 ? "day" : "days"}` : remaining(item)}</span></td></tr>)}</tbody></table></div>}
  </section>;
  return <section className="bt-dashboard-celebrations">
    <div className="bt-todays-celebrations">
      <div className="bt-todays-heading"><div><span className="bt-todays-emoji"><CelebrationRoundedIcon /></span><div><h2>Today’s Celebrations</h2><p>Let’s make them feel special!</p></div></div><button onClick={() => navigate(notificationsPath)}>♧ View Notifications ›</button></div>
      {loading ? <p className="bt-todays-empty">Checking today’s celebrations…</p> : todays.length > 0 ? <div className="bt-todays-list">{todays.map(item => { const birthday = String(item.type).toUpperCase() === "BIRTHDAY"; const name = String(item.employeeName || "Team member"); return <article className={`bt-todays-person ${birthday ? "birthday" : "anniversary"}`} key={`${item.employeeId ?? item.userId ?? name}-${item.type}-${item.date}`}><span className="bt-todays-person-icon">{birthday ? <CakeRoundedIcon /> : <CardGiftcardRoundedIcon />}</span><div><strong>{birthday ? `Happy Birthday, ${name}!` : `Happy Work Anniversary, ${name}!`}</strong><p>{birthday ? "Wishing you a day filled with happiness and success!" : "Thank you for your hard work and dedication!"}</p></div><time>{date(item.date).split(",")[0]}</time></article>; })}</div> : !error ? <p className="bt-todays-empty">No birthdays or work anniversaries today.</p> : null}
    </div>
    {error && <Alert severity="warning" sx={{ mb: 1.5 }} action={<button className="bt-celebration-inline-retry" onClick={() => void load(true)}>Retry</button>}>{error}</Alert>}
    <div className="bt-celebration-tables"><Table title="Upcoming Birthdays" type="BIRTHDAY" rows={birthdays} /><Table title="Upcoming Work Anniversaries" type="WORK_ANNIVERSARY" rows={anniversaries} /></div>
  </section>;
}

function DashboardLayout({ children, role, name, description, primary, secondary, dashboard }: {
  children: ReactNode; role: string; name?: string; description: string; primary: Action; secondary: Action;
  dashboard: ReturnType<typeof useDashboardData>;
}) {
  return <div className={`bt9-dashboard bt-studio-dashboard bt-studio-dashboard-${role.toLowerCase()}`}>
    <DashboardToolbar role={role} name={name} primary={primary} secondary={secondary} updatedAt={dashboard.updatedAt} refresh={dashboard.refresh} loading={dashboard.loading} />
    <div className="bt-dashboard-subhead"><p>{description}</p></div>
    {dashboard.errors.length > 0 && <Alert severity="warning" className="bt9-api-warning">Some live data could not be loaded. Unavailable metrics show “—”. Refresh to try again.</Alert>}
    <div className="bt-studio-dashboard-body">{children}</div>
    <DashboardCelebrations />
  </div>;
}

function Loading() { return <div className="bt9-loader" role="status"><CircularProgress size={28} /><span>Preparing your workspace…</span></div>; }

export default function RoleDashboard() {
  const role = useSelector((state: RootState) => state.auth.session?.role || "EMPLOYEE");
  const name = useSelector((state: RootState) => state.auth.session?.fullName);
  if (role === "ADMIN") return <AdminDashboard name={name} />;
  if (role === "HR") return <HrDashboard name={name} />;
  if (role === "MANAGER") return <ManagerDashboard name={name} />;
  return <EmployeeDashboard name={name} />;
}
/* V8.5.8: reference-aligned charts use only real API records. */
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const isOnLeaveToday = (row: Row) => String(row.status).toUpperCase() === "APPROVED" &&
  Boolean(row.startDate && row.endDate && String(row.startDate).slice(0, 10) <= todayKey() && String(row.endDate).slice(0, 10) >= todayKey());
function monthSeries(rows: Row[] | undefined, categories: { label: string; match: (row: Row) => boolean }[]) {
  const dates = Array.from({ length: 5 }, (_, index) => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() - 4 + index, 1); });
  return { labels: dates.map(date => date.toLocaleDateString("en-IN", { month: "short" })),
    series: categories.map(category => ({ label: category.label, values: dates.map(date => (rows || []).filter(row => {
      const value = row.startDate || row.date || row.createdAt;
      if (!value || !category.match(row)) return false;
      const parsed = new Date(String(value));
      return !Number.isNaN(parsed.getTime()) && parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth();
    }).length) })) };
}
function weeklyAttendance(rows: Row[] | undefined) {
  const startOfWeek = (value: Date) => { const date = new Date(value.getFullYear(), value.getMonth(), value.getDate()); date.setDate(date.getDate() - (date.getDay() + 6) % 7); return date; };
  const start = startOfWeek(new Date());
  const weeks = Array.from({ length: 4 }, (_, index) => { const date = new Date(start); date.setDate(date.getDate() - 7 * (3 - index)); return date; });
  const count = (week: Date, statuses: string[]) => (rows || []).filter(row => {
    const date = new Date(`${String(row.date || row.attendanceDate || "").slice(0, 10)}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date >= week && date < new Date(week.getFullYear(), week.getMonth(), week.getDate() + 7)
      && statuses.includes(String(row.status || "").toUpperCase());
  }).length;
  return { labels: weeks.map(week => week.toLocaleDateString("en-IN", { day: "numeric", month: "short" })),
    series: [{ label: "Present", values: weeks.map(week => count(week, ["PRESENT", "LATE"])) },
      { label: "On leave", values: weeks.map(week => count(week, ["LEAVE", "ON_LEAVE"])) },
      { label: "Absent", values: weeks.map(week => count(week, ["ABSENT"])) }] };
}
const CHART_COLORS = [
  "var(--bt19-chart-one, #4f8c73)", "var(--bt19-chart-two, #a28caa)",
  "var(--bt19-chart-three, #c5a579)", "var(--bt19-chart-four, #789b81)",
  "var(--bt19-chart-five, #b78175)", "var(--bt19-chart-six, #87af9e)",
];
function GroupedChart({ title, caption, labels, series, unavailable = false }: {
  title: string; caption: string; labels: string[]; series: { label: string; values: number[] }[]; unavailable?: boolean;
}) {
  const max = Math.max(1, ...series.flatMap(item => item.values));
  const total = series.reduce((sum, item) => sum + item.values.reduce((a, b) => a + b, 0), 0);
  return <DashboardCard className="bt10-analytics"><CardHeading title={title} caption={caption} icon={TrendingUpRoundedIcon} />
    {unavailable ? <div className="bt9-empty">Chart data could not be loaded.</div> : total === 0 ? <div className="bt9-empty">No records available for this period.</div> : <>
      <div className="bt10-grouped-chart" role="img" aria-label={`${title}: ${series.map(item => `${item.label}: ${item.values.join(', ')}`).join('; ')}`}>
        {labels.map((label, index) => <div className="bt10-group" key={`${label}-${index}`}><div className="bt10-group-bars">{series.map((item, seriesIndex) =>
          <span key={item.label} title={`${label} · ${item.label}: ${item.values[index] ?? 0}`} style={{ height: `${Math.max(0, (item.values[index] || 0) / max * 100)}%`, background: CHART_COLORS[seriesIndex % CHART_COLORS.length] }} />)}</div><small>{label}</small></div>)}
      </div><div className="bt10-chart-legend">{series.map((item, index) => <span key={item.label}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />{item.label}</span>)}</div>
    </>}
  </DashboardCard>;
}
function DonutChart({ title, caption, items, unavailable = false, empty = "No records available yet." }: {
  title: string; caption: string; items: { label: string; value: number }[]; unavailable?: boolean; empty?: string;
}) {
  const sorted = items.filter(item => Number.isFinite(item.value) && item.value > 0);
  const clean = sorted.length > 6 ? [...sorted.slice(0, 5), { label: "Other", value: sorted.slice(5).reduce((sum, item) => sum + item.value, 0) }] : sorted;
  const total = clean.reduce((sum, item) => sum + item.value, 0);
  let progress = 0;
  const gradient = clean.map((item, index) => { const start = progress; progress += item.value / total * 100; return `${CHART_COLORS[index]} ${start}% ${progress}%`; }).join(", ");
  return <DashboardCard className="bt10-analytics"><CardHeading title={title} caption={caption} icon={InsightsRoundedIcon} />
    {unavailable ? <div className="bt9-empty">Chart data could not be loaded.</div> : !total ? <div className="bt9-empty">{empty}</div> :
      <div className="bt10-donut-layout"><div className="bt10-donut" role="img" aria-label={`${title}: ${clean.map(item => `${item.label} ${item.value}`).join(', ')}`} style={{ background: `conic-gradient(${gradient})` }}><div><strong>{total.toLocaleString("en-IN")}</strong><small>Total</small></div></div>
      <div className="bt10-donut-legend">{clean.map((item, index) => <div key={item.label}><span><i style={{ background: CHART_COLORS[index] }} />{item.label}</span><strong>{item.value}</strong></div>)}</div></div>}
  </DashboardCard>;
}
function EmployeeQuickActions() {
  const navigate = useNavigate();
  const actions: (Action & { color: string })[] = [
    { label: "Apply Leave", path: "/employee/leave?apply=regular", icon: CalendarMonthRoundedIcon, color: "blue" },
    { label: "Apply Short Leave", path: "/employee/leave?apply=short", icon: BeachAccessRoundedIcon, color: "purple" },
    { label: "My Timesheet", path: "/employee/timesheets", icon: AccessTimeRoundedIcon, color: "green" },
    { label: "Update Profile", path: "/employee/profile", icon: AccountCircleRoundedIcon, color: "orange" },
  ];
  return <div className="bt10-quick-actions" aria-label="Employee quick actions">{actions.map(({ label, path, icon: Icon, color }) => <button key={path} className={`bt10-quick bt10-quick-${color}`} onClick={() => navigate(path)}><Icon fontSize="small" />{label}<ArrowForwardRoundedIcon className="bt10-quick-arrow" fontSize="small" /></button>)}</div>;
}
function EmployeeBalances({ balances }: { balances: Row[] | undefined }) {
  return <DashboardCard><CardHeading title="My leave balance" caption="Available days in the current leave year" icon={BeachAccessRoundedIcon} path="/employee/leave" />
    {balances === undefined ? <div className="bt9-empty">Unable to load leave balances.</div> : balances.length === 0 ? <div className="bt9-empty">No leave balances configured.</div> :
    <div className="bt10-balance-list">{balances.filter(item => !item.year || Number(item.year) === new Date().getFullYear()).slice(0, 4).map((item, index) => <div key={String(item.id ?? index)}><span>{display(item.leaveType)}</span><strong>{Number(item.available ?? item.balance ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })}<small>days</small></strong></div>)}</div>}
  </DashboardCard>;
}

type LoginWorkModeRow = { id: number; employeeId: string; employeeName?: string; workMode: string; loginTime: string; distanceFromOffice: number; loginStatus: string };

function LoginWorkModePanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LoginWorkModeRow[]>([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get<LoginWorkModeRow[]>("/login-locations/visible");
        if (active) { setRows(Array.isArray(response.data) ? response.data : []); setLoadError(""); }
      } catch {
        if (active) setLoadError("Login work-mode information is temporarily unavailable.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const todayRows = rows.filter(row => String(row.loginTime || "").slice(0, 10) === today);
  const latestPerEmployee = new Map<string, LoginWorkModeRow>();
  [...todayRows].sort((a,b) => new Date(a.loginTime).getTime() - new Date(b.loginTime).getTime()).forEach(row => latestPerEmployee.set(row.employeeId, row));
  const currentRows = [...latestPerEmployee.values()].sort((a,b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
  const wfo = currentRows.filter(row => row.workMode === "WFO").length;
  const wfh = currentRows.filter(row => row.workMode === "WFH").length;
  const latest = currentRows.slice(0, 5);
  return <section className="bt9-card bt-studio-workmode" style={{ marginBottom: 20, padding: 20 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><h2 style={{ margin: 0, fontSize: 18 }}>Today's Work Mode</h2><p style={{ margin: "5px 0 0", color: "var(--text-secondary, #648b7b)" }}>Automatically detected from GPS at login · refreshes every minute</p></div>
      <button type="button" className="bt10-work-action secondary" onClick={() => navigate("/" + (window.location.pathname.split("/")[1] || "admin") + "/login-locations")}>View login locations</button>
    </div>
    {loadError && <Alert severity="warning" sx={{ mt: 2 }}>{loadError}</Alert>}
    <div className="bt9-kpis" style={{ marginTop: 16, marginBottom: 16 }}>
      <div className="bt9-stat"><span>WFO logins today</span><strong>{wfo}</strong></div>
      <div className="bt9-stat"><span>WFH logins today</span><strong>{wfh}</strong></div>
      <div className="bt9-stat"><span>Employees detected today</span><strong>{currentRows.length}</strong></div>
    </div>
    {!latest.length ? <div className="bt9-empty">No login location records are available for today yet.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr><th style={{ padding: 9 }}>Employee</th><th style={{ padding: 9 }}>Work mode</th><th style={{ padding: 9 }}>Login time</th><th style={{ padding: 9 }}>Distance</th></tr></thead><tbody>{latest.map(row => <tr key={row.id}><td style={{ padding: 9, borderTop: "1px solid var(--border, #e2f0ea)" }}><strong>{row.employeeName || row.employeeId}</strong><div style={{ fontSize: 12, color: "var(--text-secondary, #648b7b)" }}>{row.employeeId}</div></td><td style={{ padding: 9, borderTop: "1px solid var(--border, #e2f0ea)" }}><span className={`bt9-status ${row.workMode === "WFO" ? "bt9-status-good" : "bt9-status-neutral"}`}>{row.workMode}</span></td><td style={{ padding: 9, borderTop: "1px solid var(--border, #e2f0ea)" }}>{niceTime(row.loginTime)}</td><td style={{ padding: 9, borderTop: "1px solid var(--border, #e2f0ea)" }}>{Math.round(Number(row.distanceFromOffice) || 0)} m</td></tr>)}</tbody></table></div>}
  </section>;
}

function AdminDashboard({ name }: { name?: string }) {
  const paths = useMemo(() => ["/employees", "/projects", "/notifications", "/leaves", "/timesheets"], []);
  const dash = useDashboardData(paths);
  const { data } = dash;
  const leaves = data["/leaves"]?.filter(row => row.canReview === true && pending(row) && ["MANAGER", "HR"].includes(String(row.employeeRole).toUpperCase()));
  const times = data["/timesheets"]?.filter(row => row.canReview === true && pending(row) && ["MANAGER", "HR"].includes(String(row.employeeRole).toUpperCase()));
  const employees = data["/employees"];
  const trend = monthSeries(data["/leaves"]?.filter(row => ["MANAGER", "HR"].includes(String(row.employeeRole).toUpperCase())), [
    { label: "Managers", match: row => String(row.employeeRole).toUpperCase() === "MANAGER" },
    { label: "HR", match: row => String(row.employeeRole).toUpperCase() === "HR" },
  ]);
  const allLeaves = data["/leaves"]?.filter(row => ["MANAGER", "HR"].includes(String(row.employeeRole).toUpperCase()));
  if (dash.loading && !dash.updatedAt) return <Loading />;
  return <DashboardLayout role="ADMIN" name={name} description="Overview of Manager and HR activities" primary={{ label: "Review leave", path: "/admin/leave", icon: ApprovalRoundedIcon }} secondary={{ label: "Review timesheets", path: "/admin/timesheets", icon: AccessTimeRoundedIcon }} dashboard={dash}>
    <div className="bt9-kpis bt10-first-kpis">
      <StatCard icon={GroupsRoundedIcon} label="Total Managers" value={employees ? employees.filter(row => String(row.role).toUpperCase() === "MANAGER").length : "—"} note="Management accounts" path="/admin/employees" />
      <StatCard icon={PeopleAltRoundedIcon} label="Total HR" value={employees ? employees.filter(row => String(row.role).toUpperCase() === "HR").length : "—"} note="HR accounts" tone="violet" path="/admin/employees" />
      <StatCard icon={BeachAccessRoundedIcon} label="Pending Leave" value={leaves?.length ?? "—"} note="Manager & HR only" tone="amber" path="/admin/leave" />
      <StatCard icon={AccessTimeRoundedIcon} label="Pending Timesheets" value={times?.length ?? "—"} note="Manager & HR only" tone="violet" path="/admin/timesheets" />
    </div>
    <div className="bt9-grid-two bt-studio-row-1"><Records title="Leave Requests (Manager & HR)" caption="Requests you are permitted to review" data={leaves} path="/admin/leave" icon={BeachAccessRoundedIcon} kind="leave" empty="No Manager or HR leave requests pending." />
      <Records title="Timesheet Submissions (Manager & HR)" caption="Pending approvals" data={times} path="/admin/timesheets" icon={AccessTimeRoundedIcon} kind="timesheet" empty="No Manager or HR timesheets pending." /></div>
    <div className="bt9-grid-two bt-studio-row-2"><GroupedChart title="Manager & HR Leave Trends" caption="Requests submitted in the past five months" labels={trend.labels} series={trend.series} unavailable={!data["/leaves"]} />
      <DonutChart title="Request Status" caption="Manager and HR leave, all visible statuses" unavailable={!data["/leaves"]} items={[
        { label: "Approved", value: allLeaves?.filter(row => String(row.status).toUpperCase() === "APPROVED").length ?? 0 },
        { label: "Pending", value: allLeaves?.filter(pending).length ?? 0 },
        { label: "Rejected", value: allLeaves?.filter(row => String(row.status).toUpperCase() === "REJECTED").length ?? 0 },
        { label: "Cancelled", value: allLeaves?.filter(row => String(row.status).toUpperCase() === "CANCELLED").length ?? 0 },
      ]} /></div>
    <LoginWorkModePanel />
    <div className="bt9-grid-two bt-studio-row-3"><Records title="Employee Leave · View Only" caption="Employee requests cannot be approved by Admin" data={data["/leaves"]?.filter(row => String(row.employeeRole).toUpperCase() === "EMPLOYEE")} path="/admin/leave" icon={BeachAccessRoundedIcon} kind="leave" empty="No employee leave records." />
      <Actions title="Administration" caption="Your authorized tools" actions={[{ label: "Employee directory", path: "/admin/employees", icon: PeopleAltRoundedIcon }, { label: "Manager & HR leave", path: "/admin/leave", icon: BeachAccessRoundedIcon }, { label: "Manager & HR timesheets", path: "/admin/timesheets", icon: AccessTimeRoundedIcon }, { label: "Reports", path: "/admin/reports/employee", icon: InsightsRoundedIcon }]} /></div>
  </DashboardLayout>;
}
function HrDashboard({ name }: { name?: string }) {
  const paths = useMemo(() => ["/employees", "/leaves", "/timesheets", "/attendance", "/notifications/my"], []);
  const dash = useDashboardData(paths);
  const { data } = dash;
  const leaves = data["/leaves"]?.filter(row => row.canReview === true && pending(row));
  const times = data["/timesheets"]?.filter(row => row.canReview === true && pending(row));
  const employees = data["/employees"];
  const trend = monthSeries(data["/leaves"]?.filter(row => String(row.employeeRole).toUpperCase() === "EMPLOYEE"), [
    { label: "Casual Leave", match: row => /casual/i.test(String(row.leaveType || "")) },
    { label: "Project Off", match: row => /project/i.test(String(row.leaveType || "")) },
    { label: "Without Pay", match: row => /without pay|unpaid|lwp/i.test(String(row.leaveType || "")) },
  ]);
  const distribution = Object.entries((employees || []).reduce<Record<string, number>>((acc, row) => { const department = String(row.department || "Unassigned"); acc[department] = (acc[department] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  if (dash.loading && !dash.updatedAt) return <Loading />;
  return <DashboardLayout role="HR" name={name} description="Manage your team, leave requests and employee data" primary={{ label: "Review leave", path: "/hr/leave", icon: ApprovalRoundedIcon }} secondary={{ label: "Manage employees", path: "/hr/employees", icon: PeopleAltRoundedIcon }} dashboard={dash}>
    <div className="bt9-kpis bt10-first-kpis"><StatCard icon={PeopleAltRoundedIcon} label="Total Employees" value={employees?.length ?? "—"} note="All employees" path="/hr/employees" />
      <StatCard icon={BeachAccessRoundedIcon} label="Pending Leave" value={leaves?.length ?? "—"} note="Requests assigned to HR" tone="amber" path="/hr/leave" />
      <StatCard icon={AccessTimeRoundedIcon} label="Pending Timesheets" value={times?.length ?? "—"} note="Requests assigned to HR" tone="violet" path="/hr/timesheets" />
      <StatCard icon={EventAvailableRoundedIcon} label="Active Employees" value={employees ? employees.filter(row => ["ACTIVE", "ENABLED"].includes(String(row.status).toUpperCase())).length : "—"} note="Active employee profiles" tone="green" path="/hr/employees" /></div>
    <div className="bt9-grid-two bt-studio-row-1"><Records title="Recent Leave Requests (Employees & Managers)" caption="Pending HR reviews" data={leaves} path="/hr/leave" icon={BeachAccessRoundedIcon} kind="leave" empty="No pending leave requests." />
      <Records title="Recent Timesheets" caption="Pending HR reviews" data={times} path="/hr/timesheets" icon={AccessTimeRoundedIcon} kind="timesheet" empty="No pending timesheets." /></div>
    <div className="bt9-grid-two bt-studio-row-2"><GroupedChart title="Employee Leave Overview" caption="Employee requests over the past five months" labels={trend.labels} series={trend.series} unavailable={!data["/leaves"]} />
      <DonutChart title="Employee Distribution" caption="Headcount by department" items={distribution} unavailable={!employees} /></div>
    <LoginWorkModePanel />
    <div className="bt9-grid-two bt-studio-row-3"><Records title="Employee Directory" caption="Current employee profiles" data={employees} path="/hr/employees" icon={GroupsRoundedIcon} kind="employee" empty="No employee profiles available." />
      <Actions title="HR Shortcuts" caption="People operations" actions={[{ label: "Manage employees", path: "/hr/employees", icon: PeopleAltRoundedIcon }, { label: "Leave management", path: "/hr/leave", icon: BeachAccessRoundedIcon }, { label: "Timesheet management", path: "/hr/timesheets", icon: AccessTimeRoundedIcon }, { label: "Attendance", path: "/hr/attendance", icon: EventAvailableRoundedIcon }]} /></div>
  </DashboardLayout>;
}
function ManagerDashboard({ name }: { name?: string }) {
  const paths = useMemo(() => ["/employees/team", "/leaves/team", "/timesheets/team", "/attendance/team", "/projects", "/notifications/my"], []);
  const dash = useDashboardData(paths);
  const { data } = dash;
  const leaves = data["/leaves/team"]?.filter(row => row.canReview === true && pending(row));
  const times = data["/timesheets/team"]?.filter(row => row.canReview === true && pending(row));
  const attendance = weeklyAttendance(data["/attendance/team"]);
  const leaveTypes = Object.entries((data["/leaves/team"] || []).reduce<Record<string, number>>((acc, row) => { const label = String(row.leaveType || "Short Leave"); acc[label] = (acc[label] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  if (dash.loading && !dash.updatedAt) return <Loading />;
  return <DashboardLayout role="MANAGER" name={name} description="Manage your team and track their performance" primary={{ label: "Review team leave", path: "/manager/leave", icon: ApprovalRoundedIcon }} secondary={{ label: "Review timesheets", path: "/manager/timesheets", icon: AccessTimeRoundedIcon }} dashboard={dash}>
    <div className="bt9-kpis bt10-first-kpis"><StatCard icon={GroupsRoundedIcon} label="My Team" value={data["/employees/team"]?.length ?? "—"} note="Direct reports" path="/manager/team" />
      <StatCard icon={BeachAccessRoundedIcon} label="Pending Leave" value={leaves?.length ?? "—"} note="Team approvals" tone="amber" path="/manager/leave" />
      <StatCard icon={AccessTimeRoundedIcon} label="Pending Timesheets" value={times?.length ?? "—"} note="Team approvals" tone="violet" path="/manager/timesheets" />
      <StatCard icon={PeopleAltRoundedIcon} label="Team on Leave Today" value={data["/leaves/team"]?.filter(isOnLeaveToday).length ?? "—"} note="Approved leave today" tone="green" path="/manager/leave" /></div>
    <div className="bt9-grid-two bt-studio-row-1"><Records title="Team Leave Requests" caption="Direct reports awaiting approval" data={leaves} path="/manager/leave" icon={BeachAccessRoundedIcon} kind="leave" empty="No leave requests awaiting review." />
      <Records title="Team Timesheets" caption="Work logs awaiting approval" data={times} path="/manager/timesheets" icon={AccessTimeRoundedIcon} kind="timesheet" empty="No timesheets awaiting review." /></div>
    <div className="bt9-grid-two bt-studio-row-2"><GroupedChart title="Team Attendance (Last 4 Weeks)" caption="Attendance statuses reported by the backend" labels={attendance.labels} series={attendance.series} unavailable={!data["/attendance/team"]} />
      <DonutChart title="Leave Type Distribution" caption="Leave requests from your direct reports" items={leaveTypes} unavailable={!data["/leaves/team"]} /></div>
    <LoginWorkModePanel />
    <div className="bt9-grid-two bt-studio-row-3"><Records title="My Team" caption="Your direct-report directory" data={data["/employees/team"]} path="/manager/team" icon={GroupsRoundedIcon} kind="employee" empty="No direct reports assigned." />
      <Actions title="Manager Shortcuts" caption="Team management" actions={[{ label: "Team leave", path: "/manager/leave", icon: BeachAccessRoundedIcon }, { label: "Team timesheets", path: "/manager/timesheets", icon: AccessTimeRoundedIcon }, { label: "Team attendance", path: "/manager/attendance", icon: EventAvailableRoundedIcon }, { label: "Projects", path: "/manager/projects", icon: WorkOutlineRoundedIcon }]} /></div>
  </DashboardLayout>;
}

function formatWorkDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutes(totalMinutes: number) {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function WorkTimerCard() {
  const [session, setSession] = useState<WorkSession | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const next = await getTodayWorkSession();
      setSession(next);
      setFetchedAt(Date.now());
      setError("");
    } catch {
      setError("Live work timer is temporarily unavailable.");
    }
  };

  useEffect(() => {
    void load();

    // The dashboard timer is display-only. The server is the source of truth.
    // Refresh immediately whenever Sign Off / Resume changes the work-session
    // state elsewhere in the layout, so a signed-off interval freezes at its
    // saved total instead of continuing to tick in the browser.
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const sync = window.setInterval(() => void load(), 60000);
    const refreshFromWorkSessionChange = () => void load();

    window.addEventListener("hrms-work-session-changed", refreshFromWorkSessionChange);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(sync);
      window.removeEventListener("hrms-work-session-changed", refreshFromWorkSessionChange);
    };
  }, []);

  const active = Boolean(session?.active);
  const baseMinutes = Number(session?.workingMinutes ?? 0);
  const liveExtraSeconds = active ? Math.max(0, Math.floor((now - fetchedAt) / 1000)) : 0;
  const totalSeconds = Math.max(0, baseMinutes * 60 + liveExtraSeconds);
  const requiredMinutes = Number(session?.requiredMinutes ?? 540);
  const totalMinutesForProgress = totalSeconds / 60;
  const remainingMinutes = Math.max(0, requiredMinutes - totalMinutesForProgress);
  const progress = Math.min(100, (totalMinutesForProgress / Math.max(1, requiredMinutes)) * 100);
  const status = String(session?.status ?? "NOT_STARTED").toUpperCase();
  const started = Boolean(session?.loginTime);
  const completed = Boolean(session?.targetMet);
  const paused = Boolean(session?.paused) && !active;

  const changeWorkState = async (action: "pause" | "resume") => {
    setBusy(true);
    setError("");
    try {
      const next = action === "pause" ? await signOffWorkday() : await resumeWork();
      const timestamp = Date.now();
      setSession(next);
      setFetchedAt(timestamp);
      setNow(timestamp);
      window.dispatchEvent(new Event("hrms-work-session-changed"));
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Unable to update your work session.";
      setError(String(message));
      await load();
    } finally {
      setBusy(false);
    }
  };

  return <DashboardCard className={`bt10-work-timer bt10-work-timer-compact ${active ? "is-active" : paused ? "is-paused" : "is-idle"}`}>
    <div className="bt10-work-compact-row">
      <div className="bt10-work-compact-status">
        <span className="bt10-work-status-dot" />
        <div><strong>{active ? "Working" : paused ? "Signed Off" : completed ? "Work Completed" : "Not Checked In"}</strong><small>{active ? "Live work session" : completed ? "Today's required time is complete" : paused ? "Timer stopped · Resume when ready" : "Start work to begin your timer"}</small></div>
      </div>
      <div className="bt10-work-compact-clock"><span><AccessTimeRoundedIcon fontSize="small" /></span><strong>{formatWorkDuration(totalSeconds)}</strong><small>{active ? "Running" : paused ? "Stopped" : completed ? "Completed" : "Waiting"}</small></div>
      {session?.loginTime && <div className="bt10-work-compact-item"><small>Check-in</small><strong>{niceTime(session.loginTime)}</strong></div>}
      <div className="bt10-work-compact-item"><small>Expected</small><strong>{formatMinutes(requiredMinutes)}</strong></div>
      <div className="bt10-work-compact-item"><small>{remainingMinutes > 0 ? "Remaining" : "Overtime"}</small><strong>{formatMinutes(remainingMinutes > 0 ? remainingMinutes : Math.max(0, totalMinutesForProgress - requiredMinutes))}</strong></div>
      <div className="bt10-work-compact-action">
        {active ? <button onClick={() => void changeWorkState("pause")} disabled={busy} className="bt10-work-action secondary"><CoffeeRoundedIcon fontSize="small" />{busy ? "Updating…" : "Sign Off"}</button>
          : <button onClick={() => void changeWorkState("resume")} disabled={busy || completed} className="bt10-work-action primary"><PlayArrowRoundedIcon fontSize="small" />{busy ? "Updating…" : "Resume Work"}</button>}
      </div>
    </div>
    <div className="bt10-work-compact-progress"><div><span>{Math.round(progress)}% completed</span><span>{formatMinutes(totalMinutesForProgress)} / {formatMinutes(requiredMinutes)}</span></div><span className="bt10-work-progress-track"><span style={{ width: `${progress}%` }} /></span></div>
    {error && <div className="bt10-work-error" role="alert">{error}</div>}
    {status === "AUTO_CLOSED_UNVERIFIED" && <div className="bt10-work-error">This session was auto-closed and is not counted as verified work time.</div>}
  </DashboardCard>;
}

function EmployeeDashboard({ name }: { name?: string }) {
  const paths = useMemo(() => ["/attendance/my", "/leaves/my", "/leave-balances/my", "/timesheets/my", "/projects", "/notifications/my"], []);
  const dash = useDashboardData(paths);
  const { data } = dash;
  const attendance = data["/attendance/my"];
  const leaves = data["/leaves/my"];
  const times = data["/timesheets/my"];
  const todayAttendance = attendance?.find(row => String(row.date || row.attendanceDate || "").slice(0, 10) === todayKey());
  if (dash.loading && !dash.updatedAt) return <Loading />;
  return <DashboardLayout role="EMPLOYEE" name={name} description="Small steps every day lead to big results." primary={{ label: "Apply leave", path: "/employee/leave?apply=regular", icon: BeachAccessRoundedIcon }} secondary={{ label: "My timesheets", path: "/employee/timesheets", icon: AccessTimeRoundedIcon }} dashboard={dash}>
    <WorkTimerCard />
    <EmployeeQuickActions />
    <div className="bt9-grid-two bt10-employee-panels"><EmployeeBalances balances={data["/leave-balances/my"]} />
      <DashboardCard><CardHeading title="Today's Attendance" caption="Live work session and recorded attendance" icon={EventAvailableRoundedIcon} path="/employee/working-hours" action="View workday" />
        {attendance === undefined ? <div className="bt9-empty">Attendance is unavailable.</div> : !todayAttendance ? <div className="bt9-empty">No attendance record for today. Open Working Hours to check your session.</div> : <div className="bt10-attendance-card"><div><small>Check In</small><strong>{niceTime(todayAttendance.checkInTime || todayAttendance.loginTime)}</strong></div><div><small>Working Duration</small><strong>{todayAttendance.workingHours == null ? "—" : `${Number(todayAttendance.workingHours).toFixed(2)} h`}</strong></div><div><small>Status</small><strong><Status value={todayAttendance.status} /></strong></div></div>}
        <p className="bt9-session-footnote">Unverified sessions are not counted as worked hours. Use Take Break or Resume Work to control the live session.</p>
      </DashboardCard></div>
    <div className="bt9-grid-two"><Records title="Recent Leave Requests" caption="Your latest leave applications" data={leaves} path="/employee/leave" icon={BeachAccessRoundedIcon} kind="leave" empty="You have not requested leave yet." />
      <Records title="Recent Timesheets" caption="Your submitted work logs" data={times} path="/employee/timesheets" icon={AccessTimeRoundedIcon} kind="timesheet" empty="No timesheets submitted yet." /></div>
    <div className="bt9-grid-two"><Records title="My Projects" caption="Assigned and visible projects" data={data["/projects"]} path="/employee/projects" icon={WorkOutlineRoundedIcon} kind="project" empty="No projects available." />
      <Records title="Notifications" caption="Recent account messages" data={data["/notifications/my"]} path="/employee/notifications" icon={NotificationsNoneRoundedIcon} kind="notification" empty="You're all caught up." /></div>
  </DashboardLayout>;
}
