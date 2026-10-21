import { passwordHelp, validPassword } from "../utils/passwordPolicy";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  DevicesRounded,
  KeyRounded,
  LockRounded,
  LogoutRounded,
  RefreshRounded,
  SecurityRounded,
  ShieldRounded,
  SmartphoneRounded,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import { logout } from "../store/authSlice";
import type { RootState } from "../store";

type Session = {
  id: number;
  employeeId: string;
  createdAt: string;
  expiresAt: string;
  logoutAt?: string;
  current: boolean;
  active: boolean;
};

function fmt(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SecuritySessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.session?.role || "EMPLOYEE");
  const monitorRole = role === "ADMIN" || role === "HR" || role === "MANAGER";

  const currentSession = useMemo(() => sessions.find((session) => session.current), [sessions]);
  const visibleEmployees = useMemo(
    () => new Set(sessions.map((session) => session.employeeId).filter(Boolean)).size,
    [sessions]
  );
  const otherOwnSessions = useMemo(
    () => sessions.filter((session) => !session.current),
    [sessions]
  );

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<Session[]>(
        monitorRole ? "/auth/session-monitor" : "/auth/sessions"
      );
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load active sessions.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [monitorRole]);

  async function revoke(id: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post(`/auth/sessions/${id}/revoke`);
      setMessage("Session revoked successfully.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to revoke session.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOthers() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post("/auth/sessions/revoke-others");
      setMessage(`${response.data?.revoked || 0} other session(s) signed out.`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to sign out other sessions.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setError("");
    setMessage("");

    if (!validPassword(newPassword)) {
      setError(passwordHelp);
      return;
    }
    if (newPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      dispatch(logout());
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="security-sessions-page security-sessions-page-v5">
      <div className="th-page-header security-page-header">
        <div>
          <h1><SecurityRounded /> Security & Sessions</h1>
          <div className="th-breadcrumb">Account <span>›</span> Security management</div>
          <p className="bt-page-description">
            Manage your password and review currently active portal sessions. Signed-out and expired sessions are not shown here.
          </p>
        </div>
        <div className="th-header-actions">
          <button className="th-outline" onClick={load} disabled={loading}>
            <RefreshRounded fontSize="small" /> Refresh
          </button>
        </div>
      </div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <div className="security-summary-grid">
        <section className="security-summary-card primary">
          <span className="security-summary-icon"><ShieldRounded /></span>
          <div>
            <small>Session Status</small>
            <strong>{currentSession ? "Protected & active" : monitorRole ? "Monitoring active sessions" : "Active session"}</strong>
            <p>{currentSession ? `Signed in ${fmt(currentSession.createdAt)}` : "JWT authentication is enabled for this account."}</p>
          </div>
        </section>

        <section className="security-summary-card">
          <span className="security-summary-icon"><DevicesRounded /></span>
          <div>
            <small>{monitorRole ? "Visible Active Sessions" : "Active Devices"}</small>
            <strong>{sessions.length}</strong>
            <p>{monitorRole ? `${visibleEmployees} employee(s) currently visible to your role.` : `${Math.max(0, sessions.length - 1)} other device(s) besides this session.`}</p>
          </div>
        </section>

        <section className="security-summary-card">
          <span className="security-summary-icon"><KeyRounded /></span>
          <div>
            <small>Password Security</small>
            <strong>Account protected</strong>
            <p>Changing your password revokes all existing portal sessions.</p>
          </div>
        </section>
      </div>

      <div className="security-main-grid">
        <section className="th-card security-password-card">
          <div className="security-section-head">
            <div>
              <span className="security-section-icon"><LockRounded /></span>
              <div>
                <h3>Password</h3>
                <p>Use a strong password and rotate it whenever you suspect account access from another device.</p>
              </div>
            </div>
            <span className="security-chip">Account security</span>
          </div>
          <button className="th-primary" onClick={() => setOpen(true)}>Change Password</button>
        </section>

        {!monitorRole && (
          <section className="th-card security-device-actions-card">
            <div className="security-section-head">
              <div>
                <span className="security-section-icon"><LogoutRounded /></span>
                <div>
                  <h3>Other devices</h3>
                  <p>Immediately revoke every other active login while keeping this browser signed in.</p>
                </div>
              </div>
              <span className="security-chip">{otherOwnSessions.length} other</span>
            </div>
            <button className="th-outline" onClick={revokeOthers} disabled={busy || otherOwnSessions.length === 0}>
              <LogoutRounded fontSize="small" /> Sign out other devices
            </button>
          </section>
        )}
      </div>

      <section className="th-card security-session-list-card">
        <div className="security-session-list-head">
          <div>
            <h3><SmartphoneRounded /> {monitorRole ? "Active Employee Sessions" : "Signed-in Devices"}</h3>
            <p>
              {monitorRole
                ? "Only live sessions permitted by your role are shown."
                : "Only your live sessions are shown. Expired and signed-out sessions are removed from this view."}
            </p>
          </div>
          <span className="security-chip strong">{sessions.length} active</span>
        </div>

        {loading ? (
          <div className="security-loading"><CircularProgress size={25} /> Loading active sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="security-empty-state">
            <DevicesRounded />
            <strong>No active sessions found</strong>
            <span>Refresh the page after signing in again if this looks unexpected.</span>
          </div>
        ) : (
          <div className="security-session-list">
            {sessions.map((session) => (
              <div className={`security-session-row ${session.current ? "current" : ""}`} key={session.id}>
                <div className="security-device-badge"><SmartphoneRounded /></div>
                <div className="security-session-main">
                  <div className="security-session-title-row">
                    <strong>
                      {session.current
                        ? "This device"
                        : monitorRole
                          ? `Employee ${session.employeeId}`
                          : "Other signed-in device"}
                    </strong>
                    {session.current && <span className="status active">CURRENT</span>}
                  </div>
                  <div className="security-session-meta">
                    <span>Signed in <b>{fmt(session.createdAt)}</b></span>
                    <span>Expires <b>{fmt(session.expiresAt)}</b></span>
                    {monitorRole && <span>User <b>{session.employeeId}</b></span>}
                  </div>
                </div>
                {!monitorRole && !session.current && (
                  <button className="th-outline security-revoke-btn" disabled={busy} onClick={() => revoke(session.id)}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <div style={{ display: "grid", gap: 16, paddingTop: 8 }}>
            <TextField label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} fullWidth />
            <TextField label="New password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} helperText={passwordHelp} fullWidth />
            <TextField label="Confirm new password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} fullWidth />
          </div>
          <Alert severity="info" sx={{ mt: 2 }}>After a successful password change, all active sessions are revoked and you must sign in again.</Alert>
        </DialogContent>
        <DialogActions>
          <button className="th-outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          <button className="th-primary" disabled={busy || !currentPassword || !newPassword || !confirm} onClick={changePassword}>
            {busy ? <CircularProgress size={18} /> : "Change Password"}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
