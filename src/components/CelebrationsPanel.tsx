import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Collapse,
  Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Snackbar,
  Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import CakeRoundedIcon from "@mui/icons-material/CakeRounded";
import WorkHistoryRoundedIcon from "@mui/icons-material/WorkHistoryRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import type { RootState } from "../store";
import { api } from "../services/api";

type Milestone = {
  employeeId: number | string;
  userId?: string | null;
  employeeName?: string;
  department?: string | null;
  type: "BIRTHDAY" | "WORK_ANNIVERSARY";
  date: string;
  daysUntil: number;
  label: string;
  yearsCompleted?: number;
};
type Wish = { id: number; senderName?: string; message: string; type: string; createdAt: string };
const dateText = (value: string) => {
  const raw = String(value || "").slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return "Date to be confirmed";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const sampleWishes = [
  "Wishing you a wonderful birthday filled with happiness and success! 🎉",
  "Congratulations on your work anniversary. Thank you for all that you do! 🏆",
  "Many happy returns of the day! Keep shining and achieving great things. ✨",
];
const errorMessage = (error: any, fallback: string) => {
  const body = error?.response?.data;
  if (typeof body?.message === "string") return body.message;
  if (typeof body === "string" && body.trim()) return body;
  if (error?.response?.status === 401) return "Your session may have expired. Please sign in again.";
  if (error?.response?.status === 403) return "Your account does not have permission to view this information.";
  return fallback;
};

export default function CelebrationsPanel() {
  const session = useSelector((state: RootState) => state.auth.session);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [pendingWishName, setPendingWishName] = useState("");
  const [message, setMessage] = useState("");
  const [loadingMilestones, setLoadingMilestones] = useState(true);
  const [loadingWishes, setLoadingWishes] = useState(true);
  const [sending, setSending] = useState(false);
  const [milestoneError, setMilestoneError] = useState("");
  const [wishError, setWishError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  // Keep the dashboard compact by default; users can expand details when needed.
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("celebrations") === "1") setExpanded(true);
    const targetName = params.get("wishTo");
    if (targetName) {
      // The milestone list loads asynchronously; the matching effect below opens the composer.
      setPendingWishName(targetName);
      params.delete("wishTo");
    }
    if (params.has("celebrations")) params.delete("celebrations");
    if (location.search.includes("celebrations=") || location.search.includes("wishTo=")) {
      const next = `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}${location.hash}`;
      window.history.replaceState(window.history.state, "", next);
    }
  }, [location.pathname, location.search, location.hash]);

  // Build a local calendar date. ISO date-only strings must not be parsed as UTC here.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const loadMilestones = useCallback(async () => {
    setLoadingMilestones(true);
    try {
      const response = await api.get<Milestone[]>("/employee-milestones/upcoming", { params: { days: 30 } });
      setMilestones(Array.isArray(response.data) ? response.data : []);
      setMilestoneError("");
    } catch (error: any) {
      setMilestoneError(errorMessage(error, "We couldn't load celebrations. Please retry."));
    } finally {
      setLoadingMilestones(false);
    }
  }, []);

  const loadWishes = useCallback(async () => {
    setLoadingWishes(true);
    try {
      const response = await api.get<Wish[]>("/wish/received");
      setWishes(Array.isArray(response.data) ? response.data : []);
      setWishError("");
    } catch (error: any) {
      setWishError(errorMessage(error, "Received wishes are temporarily unavailable."));
    } finally {
      setLoadingWishes(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void Promise.allSettled([loadMilestones(), loadWishes()]);
  }, [loadMilestones, loadWishes]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!pendingWishName || milestones.length === 0) return;
    const target = milestones.find((item) => (item.employeeName || "").trim().toLocaleLowerCase() === pendingWishName.trim().toLocaleLowerCase());
    if (target) { setSelected(target); setMessage(""); setFormError(""); setPendingWishName(""); }
    // Keep the request pending briefly if milestone API is still loading; show a useful notice if no match exists.
    else if (!loadingMilestones) { setNotice(`Could not find a celebration for ${pendingWishName}. Please open Celebrations and choose the employee.`); setPendingWishName(""); }
  }, [pendingWishName, milestones, loadingMilestones]);

  const todaysCelebrations = useMemo(
    () => milestones.filter((item) => String(item.date).slice(0, 10) === today),
    [milestones, today],
  );
  const myCelebration = todaysCelebrations.find((item) => item.userId && item.userId === session?.userId);

  useEffect(() => {
    if (!myCelebration || !session?.userId) return;
    const key = `celebration-seen-v2-${session.userId}-${today}-${myCelebration.type}`;
    if (sessionStorage.getItem(key)) return;
    setShowCelebration(true);
    sessionStorage.setItem(key, "1");
    const timer = window.setTimeout(() => setShowCelebration(false), 9000);
    return () => window.clearTimeout(timer);
  }, [myCelebration, session?.userId, today]);

  const openWish = (item: Milestone) => {
    setSelected(item);
    setMessage(item.type === "BIRTHDAY" ? sampleWishes[0] : sampleWishes[1]);
    setFormError("");
  };

  const send = async () => {
    if (!selected?.userId || !message.trim()) {
      setFormError("Choose a recipient and enter a message before sending.");
      return;
    }
    if (message.trim().length > 500) {
      setFormError("Your message must be 500 characters or fewer.");
      return;
    }
    setSending(true);
    setFormError("");
    try {
      await api.post("/wish/send", {
        receiverId: selected.userId,
        type: selected.type,
        message: message.trim(),
      });
      setNotice(`Your wishes were sent to ${selected.employeeName || "your colleague"}.`);
      setSelected(null);
      // Refresh inbox and milestone list independently so one failing endpoint cannot hide the other.
      await Promise.allSettled([loadMilestones(), loadWishes()]);
    } catch (error: any) {
      setFormError(errorMessage(error, "Unable to send your wish. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return <>
    {showCelebration && <div className="bt-celebration-overlay" role="dialog" aria-modal="true" aria-labelledby="bt-celebration-title">
      <div className="bt-celebration-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 31) % 100}%`, animationDelay: `${(i % 9) * 0.16}s`, transform: `rotate(${i * 29}deg)` }} />)}</div>
      <div className="bt-celebration-message">
        <button className="bt-celebration-dismiss" type="button" onClick={() => setShowCelebration(false)} aria-label="Dismiss celebration">×</button>
        <span aria-hidden="true">🎉 🎈 ✨</span>
        <h2 id="bt-celebration-title">{myCelebration?.type === "BIRTHDAY" ? `Happy Birthday, ${(myCelebration.employeeName || session?.fullName || "there").split(" ")[0]}!` : `Happy Work Anniversary, ${(myCelebration?.employeeName || session?.fullName || "there").split(" ")[0]}!`}</h2>
        <p>{myCelebration?.type === "BIRTHDAY" ? "Today is all about you. Have a fantastic day!" : `Thank you for being part of our journey${myCelebration?.yearsCompleted ? ` for ${myCelebration.yearsCompleted} ${myCelebration.yearsCompleted === 1 ? "year" : "years"}` : ""}.`}</p>
        <Button variant="contained" onClick={() => setShowCelebration(false)} autoFocus>Thank you!</Button>
      </div>
    </div>}

    <Card className="bt-celebrations-card" sx={{ mb: 2, overflow: "hidden" }}>
      <Box className="bt-celebrations-heading bt-celebrations-heading-compact bt-celebrations-heading-premium">
        <Box>
          <Stack direction="row" spacing={1} alignItems="center"><CelebrationRoundedIcon /><Typography variant="subtitle1" fontWeight={800}>Celebrations</Typography></Stack>
          <Typography variant="caption" sx={{ opacity: .9, mt: .25, display: "block" }}>Birthdays and work anniversaries</Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={`${todaysCelebrations.length} today`} color={todaysCelebrations.length ? "success" : "default"} />
          <Tooltip title="Refresh celebrations and wishes"><IconButton size="small" aria-label="Refresh celebrations" onClick={refresh} sx={{ color: "inherit" }}><RefreshRoundedIcon fontSize="small" /></IconButton></Tooltip>
          <Button size="small" color="inherit" onClick={() => setExpanded((value) => !value)} endIcon={<ExpandMoreRoundedIcon sx={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />} aria-expanded={expanded} aria-controls="bt-celebrations-details" sx={{ whiteSpace: "nowrap", minWidth: 0 }}>{expanded ? "Hide" : "View"}</Button>
        </Stack>
      </Box>
      {!expanded && <Box className="bt-celebrations-summary" sx={{ px: 2, py: 1 }}>
        <Typography variant="body2" color="text.secondary">{loadingMilestones ? "Loading celebrations…" : milestoneError ? "Celebrations temporarily unavailable" : milestones.length === 0 ? "No upcoming celebrations in the next 30 days" : `${todaysCelebrations.length ? `${todaysCelebrations.length} today · ` : ""}${milestones.length} upcoming celebration${milestones.length === 1 ? "" : "s"} · Open to send wishes`}</Typography>
        {wishes.length > 0 && <Chip size="small" variant="outlined" label={`${wishes.length} wish${wishes.length === 1 ? "" : "es"} received`} sx={{ ml: 1, height: 24 }} />}
      </Box>}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
      <CardContent id="bt-celebrations-details" sx={{ pt: 2 }}>
        {milestoneError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={() => void loadMilestones()}>Retry</Button>}>{milestoneError}</Alert>}
        {todaysCelebrations.length > 0 && <Alert severity="success" icon={<CelebrationRoundedIcon />} sx={{ mb: 2 }}>{todaysCelebrations.length === 1 ? `${todaysCelebrations[0].employeeName} is celebrating today!` : `${todaysCelebrations.length} colleagues are celebrating today!`} Send them some good wishes.</Alert>}

        {loadingMilestones ? <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} aria-label="Loading celebrations" /></Box>
          : milestones.length === 0 && !milestoneError ? <Box sx={{ py: 3, textAlign: "center" }}><CelebrationRoundedIcon color="disabled" sx={{ fontSize: 38, mb: 1 }} /><Typography fontWeight={700}>No upcoming celebrations</Typography><Typography variant="body2" color="text.secondary">There are no birthdays or work anniversaries in the next 30 days.</Typography></Box>
          : milestones.length > 0 && <Box className="bt-celebration-grid">{milestones.slice(0, 8).map((item, index) => {
            const birthday = item.type === "BIRTHDAY";
            const todayItem = String(item.date).slice(0, 10) === today;
            const ownCard = Boolean(item.userId && item.userId === session?.userId);
            return <Box key={`${item.userId || item.employeeId}-${item.type}-${item.date}-${index}`} className={`bt-celebration-person ${todayItem ? "is-today" : ""}`}>
              <Avatar className={birthday ? "bt-avatar-birthday" : "bt-avatar-anniversary"} aria-hidden="true">{birthday ? <CakeRoundedIcon /> : <WorkHistoryRoundedIcon />}</Avatar>
              <Box className="bt-celebration-person-copy">
                <Typography fontWeight={750} noWrap title={item.employeeName || "Employee"}>{item.employeeName || "Employee"}</Typography>
                <Typography variant="body2" color="text.secondary">{birthday ? "Birthday" : `Work anniversary${item.yearsCompleted ? ` · ${item.yearsCompleted} ${item.yearsCompleted === 1 ? "year" : "years"}` : ""}`}</Typography>
                <Typography variant="caption" color="text.secondary">{todayItem ? "Today" : item.daysUntil === 1 ? "Tomorrow" : `In ${item.daysUntil} days`} · {dateText(item.date)}</Typography>
                {item.department && <Typography variant="caption" display="block" color="text.secondary" noWrap>{item.department}</Typography>}
              </Box>
              <Tooltip title={ownCard ? "You cannot send wishes to yourself" : !item.userId ? "This employee account is not linked yet" : "Send a greeting"}>
                <span><Button size="small" variant={todayItem ? "contained" : "outlined"} onClick={() => openWish(item)} disabled={!item.userId || ownCard} sx={{ alignSelf: "center", whiteSpace: "nowrap" }}>Wish</Button></span>
              </Tooltip>
            </Box>;
          })}</Box>}
        {milestones.length > 8 && !loadingMilestones && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Showing the next 8 celebrations. Open Milestones & Celebrations to see the full calendar.</Typography>}

        <Box sx={{ mt: 2.5, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}><Typography variant="subtitle1" fontWeight={800}>💌 Wishes for you</Typography><Chip size="small" label={wishes.length} /></Stack>
          {wishError && <Alert severity="info" sx={{ mb: 1.5 }} action={<Button color="inherit" size="small" onClick={() => void loadWishes()}>Retry</Button>}>{wishError}</Alert>}
          {loadingWishes ? <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}><CircularProgress size={18} /><Typography variant="body2" color="text.secondary">Loading your wishes…</Typography></Stack>
            : wishes.length === 0 && !wishError ? <Typography variant="body2" color="text.secondary">When colleagues send you wishes, they will appear here.</Typography>
            : <Stack spacing={1.25}>{wishes.slice(0, 2).map((wish) => <Box key={wish.id} className="bt-received-wish"><Avatar sx={{ width: 36, height: 36, bgcolor: "#eef8f4", color: "#46a87f" }}>{(wish.senderName || "C").slice(0, 1).toUpperCase()}</Avatar><Box><Typography variant="body2" fontWeight={750}>{wish.senderName || "Your colleague"}</Typography><Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{wish.message}</Typography><Typography variant="caption" color="text.secondary">{wish.createdAt ? new Date(wish.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recently"}</Typography></Box></Box>)}</Stack>}
        </Box>
      </CardContent>
      </Collapse>
    </Card>

    <Dialog open={Boolean(selected)} onClose={() => !sending && setSelected(null)} fullWidth maxWidth="sm" aria-labelledby="bt-send-wish-title">
      <DialogTitle id="bt-send-wish-title">Send {selected?.type === "BIRTHDAY" ? "birthday wishes" : "work anniversary wishes"}<IconButton onClick={() => setSelected(null)} disabled={sending} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Close wish dialog"><CloseRoundedIcon /></IconButton></DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>To: <strong>{selected?.employeeName}</strong></Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>{sampleWishes.map((preset, index) => <Button key={preset} size="small" variant="outlined" onClick={() => setMessage(preset)}>{["Warm wishes", "Congratulations", "Keep shining"][index]}</Button>)}</Stack>
        <TextField fullWidth multiline minRows={3} maxRows={6} label="Your message" value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} inputProps={{ maxLength: 500, "aria-label": "Your greeting message" }} helperText={`${message.length}/500 characters`} error={Boolean(formError)} />
        {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setSelected(null)} disabled={sending}>Cancel</Button><Button variant="contained" startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendRoundedIcon />} onClick={() => void send()} disabled={sending || !message.trim()}>{sending ? "Sending…" : "Send wishes"}</Button></DialogActions>
    </Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice("")} message={notice} />
  </>;
}
