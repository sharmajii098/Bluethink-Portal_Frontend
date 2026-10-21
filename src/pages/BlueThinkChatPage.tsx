import AiActionLauncher from "../components/AiActionLauncher";
import { useAiChat } from "../contexts/AiChatContext";
import { localDate, recentReportStart } from "../utils/reportDates";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { AddRounded, ArrowBackRounded, AutoAwesomeRounded, SendRounded, SmartToyRounded } from "@mui/icons-material";
import { Alert, Button, Chip, CircularProgress, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../store";
import { api } from "../services/api";

export default function BlueThinkChatPage() {
  const session = useSelector((s: RootState) => s.auth.session);
  const navigate = useNavigate();
  const { messages, setMessages, prompt, setPrompt, busy, error, setError, sendMessage, resetChat, cancelMessage } = useAiChat();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Array<{id:number;createdAt:string;question:string;answer:string}>>([]);
  const [exportBusy, setExportBusy] = useState(false);
  const [reportScope, setReportScope] = useState<"self" | "team">("self");
  const [reportFrom, setReportFrom] = useState(recentReportStart);
  const [reportTo, setReportTo] = useState(() => localDate());
  const [analytics, setAnalytics] = useState<{attendanceEntries:number;timesheetEntries:number;loggedHours:number;attendanceStatuses:Record<string,number>;timesheetStatuses:Record<string,number>} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyticsPending = useRef(false);
  // Prevent rapid repeat clicks even when the backend responds in milliseconds.
  const lastAnalyticsRequest = useRef<{ key: string; at: number } | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);
  const role = String(session?.role || "EMPLOYEE").replace(/^ROLE_/i, "").toUpperCase();
  const newChat = () => { resetChat(); setHistoryOpen(false); window.setTimeout(() => inputRef.current?.focus(), 0); };

  async function loadHistory() {
    try {
      const result = await api.get("/ai/history?limit=30");
      setHistory(result.data || []);
      setHistoryOpen(true);
    } catch { setError("Could not load chat history."); }
  }

  async function exportReport(format: "pdf" | "xlsx") {
    setExportBusy(true);
    try {
      const result = await api.get(`/ai/reports/overview.${format}`, { responseType: "blob" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(new Blob([result.data]));
      link.href = url;
      link.download = `Bluethink-HRMS-Overview.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { setError("Report export failed. Check your session and backend logs."); }
    finally { setExportBusy(false); }
  }

  async function loadAnalytics() {
    if (analyticsPending.current) return;
    const key = JSON.stringify([reportFrom, reportTo, reportScope, session?.token]);
    const now = Date.now();
    if (lastAnalyticsRequest.current?.key === key && now - lastAnalyticsRequest.current.at < 1500) return;
    lastAnalyticsRequest.current = { key, at: now };
    analyticsPending.current = true;
    setAnalyticsBusy(true);
    try {
      const params = {from: reportFrom,to: reportTo,scope:reportScope};
      const response = await api.get("/ai/v10/analytics", { params });
      setAnalytics(response.data);setError("");
    } catch {setAnalytics(null);setError("Analytics unavailable or access denied. Check dates (maximum 31 days) and permissions.");}
    finally { analyticsPending.current = false; setAnalyticsBusy(false); }
  }
  async function exportDetailed(format: "pdf" | "xlsx") {
    setExportBusy(true);
    try {
      const result=await api.get(`/ai/v10/reports/detailed.${format}`,{params:{from:reportFrom,to:reportTo,scope:reportScope},responseType:"blob"});
      const url=URL.createObjectURL(new Blob([result.data]));const link=document.createElement("a");
      link.href=url;link.download=`Bluethink-HRMS-Detailed.${format}`;link.click();URL.revokeObjectURL(url);
    } catch {setError("Detailed report unavailable or access denied.");}
    finally {setExportBusy(false);}
  }

  async function clearHistory() {
    if (!window.confirm("Delete all your saved AI messages?")) return;
    try { await api.delete("/ai/history"); setHistory([]); }
    catch { setError("Could not clear history."); }
  }


  return <div className="bt-ai-page">
    <div className="th-page-header">
      <div>
        <h1>BlueThink AI Assistant</h1>
        <div className="th-breadcrumb">BlueThink Portal <span>›</span> AI Assistant</div>
      </div>
      <div className="th-header-actions">
        <button className="th-outline" onClick={() => navigate(`/${role.toLowerCase()}/dashboard`)}><ArrowBackRounded fontSize="small" /> Dashboard</button>
        <button className="th-outline" onClick={() => navigate(`/${role.toLowerCase()}/policies`)}>Policies</button>
        <AiActionLauncher />
        <button className="th-outline" disabled={busy} onClick={() => void loadHistory()}>History</button>
        <button className="th-outline" disabled={exportBusy} onClick={() => void exportReport("pdf")}>PDF report</button>
        <button className="th-outline" disabled={exportBusy} onClick={() => void exportReport("xlsx")}>Excel report</button>
        <button className="th-primary" disabled={busy} onClick={newChat}><AddRounded fontSize="small" /> New Chat</button>
      </div>
    </div>

    <Paper elevation={0} className="th-card" sx={{ p: 2, mb: 2 }}>
      <Typography fontWeight={700} sx={{mb:1}}>Analytics · Attendance and timesheet reports</Typography>
      <Stack direction={{xs:"column",md:"row"}} spacing={1} alignItems="center">
        <TextField label="From" type="date" size="small" InputLabelProps={{shrink:true}} value={reportFrom} disabled={analyticsBusy} onChange={e=>{setReportFrom(e.target.value);setAnalytics(null);}}/>
        <TextField label="To" type="date" size="small" InputLabelProps={{shrink:true}} value={reportTo} disabled={analyticsBusy} onChange={e=>{setReportTo(e.target.value);setAnalytics(null);}}/>
        {role==="MANAGER" && <select aria-label="Report scope" value={reportScope} disabled={analyticsBusy} onChange={e=>{setReportScope(e.target.value as "self" | "team");setAnalytics(null);}}><option value="self">My records</option><option value="team">Direct reports</option></select>}
        <button className="th-outline" disabled={analyticsBusy} onClick={()=>void loadAnalytics()}>{analyticsBusy ? "Loading analytics…" : "Load analytics"}</button>
        <button className="th-outline" disabled={exportBusy} onClick={()=>void exportDetailed("pdf")}>Detailed PDF</button>
        <button className="th-outline" disabled={exportBusy} onClick={()=>void exportDetailed("xlsx")}>Detailed Excel</button>
      </Stack>
      {analytics && <Typography sx={{mt:1}}>Attendance: {analytics.attendanceEntries} · Timesheets: {analytics.timesheetEntries} · Hours: {analytics.loggedHours} · Attendance status: {JSON.stringify(analytics.attendanceStatuses)} · Timesheet status: {JSON.stringify(analytics.timesheetStatuses)}</Typography>}
    </Paper>
    <Paper elevation={0} className="th-card" sx={{ overflow: "hidden", minHeight: "68vh", display: "flex", flexDirection: "column", borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2, borderBottom: "1px solid rgba(120,130,150,.18)" }}>
        <Stack alignItems="center" justifyContent="center" sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "primary.main", color: "white" }}><AutoAwesomeRounded /></Stack>
        <div style={{ flex: 1 }}>
          <Typography fontWeight={800}>BlueThink Portal Copilot</Typography>
          <Typography variant="caption" color="text.secondary">Verified portal records · Role-aware · Confirmed self-service actions</Typography>
        </div>
        <Chip size="small" icon={<SmartToyRounded />} label={role} variant="outlined" />
      </Stack>

      {historyOpen && <Paper variant="outlined" sx={{ p: 2, m: 2, maxHeight: 260, overflowY: "auto" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography fontWeight={700}>Saved AI messages (your account only)</Typography>
          <Stack direction="row" spacing={1}><button onClick={() => void clearHistory()}>Clear</button><button onClick={() => setHistoryOpen(false)}>Close</button></Stack>
        </Stack>
        {history.length === 0 && <Typography variant="body2">No saved messages.</Typography>}
        {history.map(entry => <div key={entry.id} style={{ padding: 8, borderBottom: "1px solid #ddd" }}>
          <button disabled={busy} onClick={() => { setMessages([{ id: `${entry.id}-q`, role: "user", text: entry.question }, { id: `${entry.id}-a`, role: "assistant", text: entry.answer }]); setHistoryOpen(false); }}>
            {new Date(entry.createdAt).toLocaleString()} — {entry.question.slice(0,120)}
          </button>
        </div>)}
      </Paper>}
      {error && <Alert severity="error" sx={{ m: 2, mb: 0 }} onClose={() => setError("")}>{error}</Alert>}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <Stack spacing={2} sx={{ maxWidth: 900, mx: "auto" }}>
          {messages.map((message) => <div key={message.id} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "88%", whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: "13px 16px", borderRadius: 16, background: message.role === "user" ? "var(--primary, #1976d2)" : "var(--surface-soft, #f5f7fb)", color: message.role === "user" ? "#fff" : "inherit", border: message.role === "assistant" ? "1px solid rgba(120,130,150,.18)" : "none", lineHeight: 1.6 }}>
              {message.text}
            </div>
          </div>)}
          {busy && <Stack direction="row" spacing={1.2} alignItems="center" color="text.secondary"><CircularProgress size={18} /><Typography variant="body2">BlueThink AI is thinking…</Typography></Stack>}
        </Stack>
      </div>
      <div style={{ borderTop: "1px solid rgba(120,130,150,.18)", padding: 14 }}>
        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ maxWidth: 900, mx: "auto" }}>
          <TextField fullWidth inputRef={inputRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            placeholder="Ask BlueThink AI about your portal records…" multiline maxRows={5} disabled={busy}
            inputProps={{ maxLength: 2000 }} helperText={`${prompt.length}/2000`} />
          {busy && <Button size="small" color="inherit" onClick={cancelMessage}>Stop request</Button>}
          <IconButton color="primary" onClick={() => void sendMessage()} disabled={busy || !prompt.trim()} aria-label="Send message" sx={{ width: 48, height: 48, bgcolor: "action.hover" }}><SendRounded /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 1 }}>Portal record answers use permission-checked database queries. General AI explanations may be inaccurate. Only explicitly confirmed actions in the Actions panel can create your own records. Approvals remain with authorized reviewers.</Typography>
      </div>
    </Paper>
  </div>;
}
