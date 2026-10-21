import { useEffect, useMemo, useState } from "react";
import {
  Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Snackbar, TextField, Typography
} from "@mui/material";
import { CheckCircleOutlineRounded, CloseRounded, NotificationsNoneRounded, RefreshRounded } from "@mui/icons-material";
import { api } from "../services/api";
import PaginationBar from "../components/PaginationBar";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type Row = Record<string, any>;
type Milestone = { employeeId: number | string; userId?: string | null; employeeName?: string; type: "BIRTHDAY" | "WORK_ANNIVERSARY"; date: string; daysUntil: number };
const greetingFor = (type: string, name: string) => type === "BIRTHDAY"
  ? `Wishing you a wonderful birthday, ${name}, filled with happiness and success! 🎉`
  : `Congratulations on your work anniversary, ${name}! Thank you for all that you do. 🏆`;

export default function NotificationsPage() {
  const role = useSelector((s: RootState) => s.auth.session?.role || "EMPLOYEE");
  const currentUserId = useSelector((s: RootState) => s.auth.session?.userId || "");
  const currentUserName = useSelector((s: RootState) => s.auth.session?.fullName || "");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [wishMessage, setWishMessage] = useState("");
  const [wishError, setWishError] = useState("");
  const [openingWish, setOpeningWish] = useState(false);
  const [sendingWish, setSendingWish] = useState(false);
  const [toast, setToast] = useState("");
  const [sentWishKeys, setSentWishKeys] = useState<Set<string>>(new Set());
  const [sentReminderIds, setSentReminderIds] = useState<Set<string>>(new Set());
  const pageSize = 10;

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await api.get(role === "ADMIN" ? "/notifications" : "/notifications/my");
      const rawRows: Row[] = Array.isArray(r.data) ? r.data : [];
      // Hide historical duplicates in the UI; scheduler also prevents new duplicates.
      const seen = new Set<string>();
      const uniqueRows = rawRows.filter(item => {
        const msg = String(item.message || "");
        if (!/(birthday|work anniversary|anniversary)/i.test(msg) || /sent you (?:birthday|work anniversary) wishes/i.test(msg)) return true;
        const day = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : "";
        const key = `${String(item.recipientUserId || "")}|${msg.toLocaleLowerCase()}|${day}`;
        if (seen.has(key)) return false; seen.add(key); return true;
      });
      setRows(uniqueRows);
      try {
        const sent = await api.get<Row[]>("/wish/sent");
        const sentRows: Row[] = Array.isArray(sent.data) ? sent.data : [];
        const sentKeys = new Set<string>();
        for (const w of sentRows) {
          const receiver = String(w.receiverId || "").trim().toLocaleLowerCase();
          const type = String(w.type || "").trim().toUpperCase();
          if (!receiver || !type) continue;
          // Older records may use ANNIVERSARY while current milestones use WORK_ANNIVERSARY.
          const aliases = type === "ANNIVERSARY" || type === "WORK_ANNIVERSARY"
            ? ["ANNIVERSARY", "WORK_ANNIVERSARY"] : [type];
          aliases.forEach(alias => sentKeys.add(`${receiver}|${alias}`));
        }
        setSentWishKeys(sentKeys);
        try {
          const milestoneResponse = await api.get<Milestone[]>("/employee-milestones/upcoming", { params: { days: 366 } });
          const milestones = Array.isArray(milestoneResponse.data) ? milestoneResponse.data : [];
          const sentIds = new Set<string>();
          for (const item of uniqueRows) {
            const msg = String(item.message || "");
            if (/sent you (?:birthday|work anniversary) wishes/i.test(msg)) continue;
            const normalized = msg.replace(/^[^\p{L}\p{N}]+/u, "").replace(/^Today is\s+/i, "").trim();
            const match = normalized.match(/^(.+?)(?:'s birthday| is celebrating|'s work anniversary| has a work anniversary)(?:[.!].*)?$/i);
            const name = (match?.[1] || item.employeeName || "").trim().toLocaleLowerCase();
            const milestone = milestones.find(m => (m.employeeName || "").trim().toLocaleLowerCase() === name);
            if (milestone && (sentKeys.has(`${String(milestone.userId || "").trim().toLocaleLowerCase()}|${String(milestone.type).toUpperCase()}`) || sentKeys.has(`${String(milestone.employeeId).trim().toLocaleLowerCase()}|${String(milestone.type).toUpperCase()}`))) sentIds.add(String(item.id));
          }
          setSentReminderIds(sentIds);
        } catch { setSentReminderIds(new Set()); }
      } catch { setSentWishKeys(new Set()); setSentReminderIds(new Set()); }
    } catch (e: any) { setError(e?.response?.data?.message || "Unable to load notifications"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const onNotification = (event: Event) => {
      const payload = (event as CustomEvent<Row>).detail;
      if (!payload?.id) return;
      setRows(current => current.some(item => String(item.id) === String(payload.id)) ? current : [payload, ...current]);
    };
    window.addEventListener("hrms-notification-received", onNotification);
    return () => window.removeEventListener("hrms-notification-received", onNotification);
  }, [role]);

  const filtered = useMemo(() => filter === "UNREAD" ? rows.filter(r => !r.read) : rows, [rows, filter]);
  const unread = rows.filter(r => !r.read).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);
  useEffect(() => setPage(1), [filter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);


  async function markRead(id: string | number) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setRows(current => current.map(item => String(item.id) === String(id) ? { ...item, read: true } : item));
      window.dispatchEvent(new Event("hrms-notifications-count-refresh"));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to mark notification as read.");
    }
  }

  async function markAllRead() {
    try {
      await api.patch("/notifications/read-all");
      setRows(current => current.map(item => ({ ...item, read: true })));
      window.dispatchEvent(new Event("hrms-notifications-count-refresh"));
      setToast("All notifications marked as read.");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to mark notifications as read.");
    }
  }

  async function openWish(n: Row) {
    // Notification messages may start with emoji and phrases like "Today is".
    // Strip those prefixes before extracting the employee name so lookup matches the milestone API.
    const text = String(n.message || "").trim();
    const normalizedText = text.replace(/^[^\p{L}\p{N}]+/u, "").replace(/^Today is\s+/i, "").trim();
    const match = normalizedText.match(/^(.+?)(?:'s birthday| is celebrating|'s work anniversary| has a work anniversary| sent you (?:birthday|work anniversary) wishes)(?:[.!].*)?$/i);
    const name = (match?.[1] || n.employeeName || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    if (!name) { setError("Could not identify the employee from this notification."); return; }
    setOpeningWish(true); setWishError("");
    try {
      const response = await api.get<Milestone[]>("/employee-milestones/upcoming", { params: { days: 30 } });
      const list = Array.isArray(response.data) ? response.data : [];
      const target = list.find(m => (m.employeeName || "").trim().toLocaleLowerCase() === name.toLocaleLowerCase());
      if (!target) { setError(`Could not find ${name} in the upcoming celebrations list. Check that employee's DOB and account link are configured.`); return; }
      if (!target.userId) { setError(`${name}'s employee account is not linked, so a wish cannot be delivered.`); return; }
      const sentKey = `${String(target.userId).trim().toLocaleLowerCase()}|${String(target.type).toUpperCase()}`;
      if (sentWishKeys.has(sentKey)) { setToast(`You have already sent wishes to ${target.employeeName} for this celebration.`); return; }
      setSelected(target);
      setWishMessage(greetingFor(target.type, target.employeeName || name));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not load the employee celebration details.");
    } finally { setOpeningWish(false); }
  }

  async function sendWish() {
    if (!selected?.userId || !wishMessage.trim()) { setWishError("Please write a message before sending."); return; }
    setSendingWish(true); setWishError("");
    try {
      const response = await api.post("/wish/send", { receiverId: selected.userId, type: selected.type, message: wishMessage.trim() });
      const key = `${String(selected.userId).trim().toLocaleLowerCase()}|${String(selected.type).toUpperCase()}`;
      setSentWishKeys(previous => {
        const next = new Set(previous);
        next.add(key);
        if (selected.type === "WORK_ANNIVERSARY") {
          next.add(`${String(selected.userId).trim().toLocaleLowerCase()}|ANNIVERSARY`);
          next.add(`${String(selected.userId).trim().toLocaleLowerCase()}|WORK_ANNIVERSARY`);
        }
        return next;
      });
      // Update matching reminder cards immediately; the sent state is also reloaded from /wish/sent.
      const targetName = String(selected.employeeName || "").trim().toLocaleLowerCase();
      const targetType = String(selected.type).toUpperCase();
      setSentReminderIds(previous => {
        const next = new Set(previous);
        for (const row of rows) {
          const text = String(row.message || "").replace(/^[^\p{L}\p{N}]+/u, "").replace(/^Today is\s+/i, "").trim();
          const match = text.match(/^(.+?)(?:'s birthday| is celebrating|'s work anniversary| has a work anniversary)(?:[.!].*)?$/i);
          const rowName = (match?.[1] || row.employeeName || "").trim().toLocaleLowerCase();
          const rowType = /work anniversary|anniversary/i.test(text) ? "WORK_ANNIVERSARY" : /birthday/i.test(text) ? "BIRTHDAY" : "";
          if (rowName === targetName && rowType === targetType) next.add(String(row.id));
        }
        return next;
      });
      setSelected(null); setToast(response.data?.message || `Your wishes were sent to ${selected.employeeName}.`);
      // Refresh persistent server state; the UI must not depend only on component memory.
      void load();
    } catch (e: any) { setWishError(e?.response?.data?.message || "Unable to send your wish. Please try again."); }
    finally { setSendingWish(false); }
  }

  return <div>
    <div className="th-page-header"><div><h1><NotificationsNoneRounded sx={{ verticalAlign: "middle", mr: 1 }} />Notifications</h1><div className="th-breadcrumb">Notifications <span>›</span> {unread} unread</div></div><div className="th-header-actions">{unread > 0 && <button className="th-outline" onClick={() => void markAllRead()}>Mark all as read</button>}<button className="th-outline" onClick={() => void load()}><RefreshRounded fontSize="small" /> Refresh</button></div></div>
    {error && <div className="role-alert"><b>Notification operation failed</b><span>{error}</span><button className="th-outline" onClick={() => setError("")}>Dismiss</button></div>}
    <div className="th-card report-filter-card"><div className="report-filters"><label>View<select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">All notifications ({rows.length})</option><option value="UNREAD">Unread ({unread})</option></select></label></div></div>
    <div className="notification-list">{loading ? <div className="th-card th-loading"><CircularProgress size={22} /> Loading notifications…</div> : filtered.length === 0 ? <div className="th-card empty-state"><h3>No notifications</h3><p>You are all caught up.</p></div> : paginated.map(n => <div key={n.id} className={`th-card notification-card ${n.read ? "read" : "unread"}`}><div className="notification-icon"><NotificationsNoneRounded /></div><div className="notification-body"><div className="notification-message">{n.message || "Notification"}</div><small>{n.createdAt ? new Date(n.createdAt).toLocaleString("en-IN") : ""}{role === "ADMIN" && n.employeeName ? ` · ${n.employeeName}` : ""}</small></div><div className="notification-actions">{/(birthday|work anniversary|anniversary|celebrat)/i.test(String(n.message || "")) && !/sent you (?:birthday|work anniversary) wishes/i.test(String(n.message || "")) && (() => { const reminderText = String(n.message || "").replace(/^[^\p{L}\p{N}]+/u, "").replace(/^Today is\s+/i, "").trim(); const reminderMatch = reminderText.match(/^(.+?)(?:'s birthday| is celebrating|'s work anniversary| has a work anniversary)(?:[.!].*)?$/i); const reminderName = (reminderMatch?.[1] || n.employeeName || "").trim().toLocaleLowerCase(); const isSelf = reminderName && currentUserName.trim() && reminderName === currentUserName.trim().toLocaleLowerCase(); return isSelf ? <span className="status paid">Your celebration</span> : sentReminderIds.has(String(n.id)) ? <span className="status paid"><CheckCircleOutlineRounded fontSize="small" /> Wish sent</span> : <button className="th-primary" disabled={openingWish} onClick={() => void openWish(n)}>{openingWish ? "Loading…" : "🎉 Send wishes"}</button>; })()}{!n.read && <button className="th-outline" onClick={() => void markRead(n.id)}>Mark as read</button>}{n.read && <span className="status paid">Read</span>}</div></div>)}<PaginationBar page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} /></div>
    <Dialog open={Boolean(selected)} onClose={() => !sendingWish && setSelected(null)} fullWidth maxWidth="sm" aria-labelledby="birthday-wish-title"><DialogTitle id="birthday-wish-title">Send {selected?.type === "BIRTHDAY" ? "birthday wishes" : "work anniversary wishes"}<IconButton onClick={() => setSelected(null)} disabled={sendingWish} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Close"><CloseRounded /></IconButton></DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>To: <strong>{selected?.employeeName}</strong></Typography><TextField fullWidth multiline minRows={4} maxRows={8} label="Write your wish" value={wishMessage} onChange={e => setWishMessage(e.target.value.slice(0, 500))} inputProps={{ maxLength: 500 }} helperText={`${wishMessage.length}/500 characters`} error={Boolean(wishError)} />{wishError && <Alert severity="error" sx={{ mt: 2 }}>{wishError}</Alert>}</DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={() => setSelected(null)} disabled={sendingWish}>Cancel</Button><Button variant="contained" onClick={() => void sendWish()} disabled={sendingWish || !wishMessage.trim()} startIcon={sendingWish ? <CircularProgress size={16} color="inherit" /> : undefined}>{sendingWish ? "Sending…" : "Send wishes"}</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(toast)} autoHideDuration={5000} onClose={() => setToast("")} message={toast} />
  </div>;
}
