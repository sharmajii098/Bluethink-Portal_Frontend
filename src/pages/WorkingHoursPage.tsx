import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import PauseCircleOutlineRoundedIcon from "@mui/icons-material/PauseCircleOutlineRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";

import {
  getTodayWorkSession,
  getWorkSessionHistory,
  type WorkSession,
  type WorkSegment,
} from "../services/workSessionService";

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ");
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(minutes?: number | null, hours?: number | null) {
  let total = Math.max(0, Number(minutes ?? 0));
  if (!total && Number(hours ?? 0) > 0) total = Math.round(Number(hours) * 60);
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function dayStatus(row?: WorkSession | null) {
  if (!row || !Number(row.sessionCount || 0)) return { label: "NOT STARTED", cls: "neutral" };
  if (row.active) return { label: "WORKING", cls: "active" };
  if (row.targetMet) return { label: "TARGET MET", cls: "completed" };
  return { label: "PAUSED", cls: "pending" };
}

export default function WorkingHoursPage() {
  const [today, setToday] = useState<WorkSession | null>(null);
  const [history, setHistory] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [todayData, historyData] = await Promise.all([
        getTodayWorkSession(),
        getWorkSessionHistory(),
      ]);
      setToday(todayData);
      setHistory(historyData);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load working-hours history."
      );
      if (!silent) {
        setToday(null);
        setHistory([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const refresh = () => load(true);
    const timer = window.setInterval(() => load(true), 60_000);
    window.addEventListener("hrms-work-session-changed", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("hrms-work-session-changed", refresh);
    };
  }, []);

  const totalMinutes = useMemo(
    () => history.reduce((sum, row) => sum + Number(row.workingMinutes || 0), 0),
    [history]
  );

  const segments = (today?.segments || []) as WorkSegment[];
  const status = dayStatus(today);
  const progress = Math.min(100, Math.max(0, Number(today?.progressPercent || 0)));
  const requiredMinutes = Number(today?.requiredMinutes || 540);

  return (
    <div className="working-hours-page v5-working-hours-page">
      <div className="th-page-header">
        <div>
          <h1>Working Hours</h1>
          <div className="th-breadcrumb">
            Account <span>›</span> Attendance & work sessions
          </div>
          <p className="bt-page-description">
            Sign Off pauses your working time. Resume Work starts a new interval, and all intervals are added together for the day.
          </p>
        </div>
        <div className="th-header-actions">
          <button className="th-outline" onClick={() => load()} disabled={loading}>Refresh</button>
        </div>
      </div>

      {error && <div className="th-alert error">{error}</div>}

      <section className="workday-progress-card">
        <div className="workday-progress-copy">
          <div className={`workday-live-dot ${today?.active ? "is-live" : "is-paused"}`} />
          <div>
            <strong>{today?.active ? "Work session active" : Number(today?.sessionCount || 0) ? "Work currently paused" : "Workday not started"}</strong>
            <small>
              {formatDuration(today?.workingMinutes)} worked today · {formatDuration(today?.remainingMinutes)} remaining to the 9-hour target
            </small>
          </div>
        </div>
        <div className="workday-progress-side">
          <span>{formatDuration(today?.workingMinutes)} / {formatDuration(requiredMinutes)}</span>
          <b>{progress}%</b>
        </div>
        <div className="workday-progress-track"><i style={{ width: `${progress}%` }} /></div>
      </section>

      <div className="work-session-kpis work-session-kpis-v5">
        <div className="work-session-kpi">
          <span className="work-session-icon blue"><LoginRoundedIcon /></span>
          <div><small>First Login</small><strong>{formatTime(today?.firstLoginTime || today?.loginTime)}</strong></div>
        </div>
        <div className="work-session-kpi">
          <span className={`work-session-icon ${today?.active ? "green" : "orange"}`}>
            {today?.active ? <PlayCircleOutlineRoundedIcon /> : <PauseCircleOutlineRoundedIcon />}
          </span>
          <div><small>Current Status</small><strong>{status.label}</strong></div>
        </div>
        <div className="work-session-kpi">
          <span className="work-session-icon purple"><AccessTimeRoundedIcon /></span>
          <div><small>Today's Total</small><strong>{formatDuration(today?.workingMinutes, today?.workingHours)}</strong></div>
        </div>
        <div className="work-session-kpi">
          <span className="work-session-icon orange"><TrackChangesRoundedIcon /></span>
          <div><small>Remaining to 9h</small><strong>{formatDuration(today?.remainingMinutes)}</strong></div>
        </div>
      </div>

      <div className="th-card table-card work-intervals-card">
        <div className="table-toolbar">
          <div>
            <strong>Today's Work Intervals</strong>
            <small>{segments.length} interval(s) · Sign Off and Resume can be used multiple times</small>
          </div>
        </div>
        {loading && !today ? (
          <div className="th-loading"><CircularProgress size={22} /> Loading today's work sessions...</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Start Time</th>
                  <th>Sign Off Time</th>
                  <th>Duration</th>
                  <th>Work Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {segments.length ? segments.map((segment, index) => (
                  <tr key={segment.id ?? index}>
                    <td>{index + 1}</td>
                    <td><b>{formatTime(segment.loginTime)}</b></td>
                    <td>{segment.active ? "—" : formatTime(segment.signoffTime)}</td>
                    <td><b>{formatDuration(segment.workingMinutes, segment.workingHours)}</b></td>
                    <td>{segment.workMode || "—"}</td>
                    <td><span className={`status ${segment.active ? "active" : "completed"}`}>{segment.active ? "WORKING" : "SIGNED OFF"}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><div className="empty-state compact">No work interval recorded today.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="th-card table-card working-hours-table-card">
        <div className="table-toolbar">
          <div>
            <strong>Daily Working Hours</strong>
            <small>{history.length} day(s) recorded · {formatDuration(totalMinutes)} total across displayed days</small>
          </div>
        </div>

        {loading ? (
          <div className="th-loading"><CircularProgress size={22} /> Loading working hours...</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Date</th>
                  <th>Intervals</th>
                  <th>First Login</th>
                  <th>Latest Sign Off</th>
                  <th>Total Time</th>
                  <th>Target</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length ? history.map((row, index) => {
                  const rowStatus = dayStatus(row);
                  return (
                    <tr key={row.date ?? index}>
                      <td>{index + 1}</td>
                      <td><b>{formatDate(row.date)}</b></td>
                      <td>{row.sessionCount || 0}</td>
                      <td>{formatTime(row.firstLoginTime || row.loginTime)}</td>
                      <td>{formatTime(row.signoffTime)}</td>
                      <td><b>{formatDuration(row.workingMinutes, row.workingHours)}</b></td>
                      <td>{row.targetMet ? "9h met" : `${formatDuration(row.remainingMinutes)} left`}</td>
                      <td><span className={`status ${rowStatus.cls}`}>{rowStatus.label}</span></td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={8}><div className="empty-state compact">No working-hours records are available yet.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
