import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { AddTaskRounded, CheckCircleRounded } from "@mui/icons-material";
import { api } from "../services/api";
import { localDate } from "../utils/reportDates";
import type { RootState } from "../store";
import { useAiChat } from "../contexts/AiChatContext";
import { suggestActionFields } from "../utils/aiActionHints";
import { clearUnverifiedAiAction, hasUnverifiedAiAction, markUnverifiedAiAction } from "../utils/aiActionRecovery";

type ActionType = "SUPPORT_TICKET" | "LEAVE_REQUEST" | "TIMESHEET_ENTRY" | "EXPENSE_CLAIM" | "HR_SERVICE_REQUEST" | "OVERTIME_REQUEST" | "REVIEW_LEAVE" | "REVIEW_TIMESHEET";
type Preview = {token: string; type: ActionType; fields: Record<string,string>; summary: string; expiresAt: string};
type Result = {type: ActionType; status: string; reference: string; message: string};
type TokenStatus = {type: ActionType; state: "PREPARED" | "CONSUMED" | "COMMITTED" | "CANCELLED" | "EXPIRED"; expiresAt: string; guidance: string; reference?: string | null};
type RecentAction = {type: ActionType; state: "PREPARED" | "CONSUMED" | "COMMITTED" | "CANCELLED" | "EXPIRED"; createdAt: string; reference?: string | null};
type Monitor = {windowHours: number; activePreviews: number; expiredPreviews: number; consumedAttempts: number; cancelledPreviews: number; successfulCommitEvents: number; failedCommitEvents: number; recordedCommits: number; receiptUnverifiedEvents: number};
type AiOperationStat = {operation: string; requests: number; success: number; invalid: number; denied: number; errors: number; latencySamples: number; p50Ms: number; p95Ms: number; maxMs: number};
type AiDiagnostics = {processStartedAt: string; scope: string; maxSamplesPerOperation: number; operations: AiOperationStat[]};
type ModelHealth = {scope: string; circuit: {state: "CLOSED" | "OPEN" | "HALF_OPEN"; consecutiveFailures: number; failureThreshold: number; retryAfterSeconds: number; probeInProgress: boolean}; capacity: {limit: number; active: number; available: number}};
type ReviewItem = { type: "REVIEW_LEAVE" | "REVIEW_TIMESHEET"; id: string; employeeName: string; description: string };
const defaults = () => ({ subject: "", description: "", category: "IT SUPPORT", priority: "MEDIUM", startDate: localDate(), endDate: localDate(), leaveType: "Casual Leave", leaveDurationType: "FULL_DAY", reason: "", date: localDate(), hoursWorked: "8", taskDescription: "", workMode: "OFFICE", amount: "", expenseDate: localDate(), receiptName: "", workDate: localDate(), hours: "2", project: "", compensationMode: "PAYMENT", recordId: "", decision: "APPROVED", comment: "" });
const fieldsByType: Record<ActionType, readonly string[]> = {
  SUPPORT_TICKET: ["subject", "description", "category", "priority"],
  LEAVE_REQUEST: ["startDate", "endDate", "leaveType", "leaveDurationType", "reason"],
  TIMESHEET_ENTRY: ["date", "hoursWorked", "taskDescription", "workMode"],
  EXPENSE_CLAIM: ["category", "amount", "expenseDate", "description", "receiptName"],
  HR_SERVICE_REQUEST: ["category", "subject", "description", "priority"],
  OVERTIME_REQUEST: ["workDate", "hours", "project", "reason", "compensationMode"],
  REVIEW_LEAVE: ["recordId", "decision", "comment"],
  REVIEW_TIMESHEET: ["recordId", "decision", "comment"],
};
const categories = ["IT SUPPORT", "ACCESS & ACCOUNTS", "HARDWARE", "SOFTWARE", "NETWORK", "HR / PAYROLL", "OTHER"];
const expenseCategories = ["Travel", "Food", "Accommodation", "Medical", "Office Supplies", "Internet/Phone", "Other"];
const errorText = (failure: unknown): string => {
  const e = failure as {response?: { status?: number; data?: { detail?: string; message?: string; error?: string } }};
  if (e.response?.status === 401) return "Your session expired. Sign in again.";
  if (e.response?.status === 403) return "Your account does not have permission to perform this action.";
  if (e.response?.status === 409) return "This preview has expired or was already submitted. Prepare a new preview.";
  return e.response?.data?.detail || e.response?.data?.message || e.response?.data?.error || "Action could not be completed. Check the details and try again.";
};

/** Human-guided draft → server-generated preview → explicit one-time confirmation. */
export default function AiActionLauncher({ compact = false }: { compact?: boolean }) {
  const session = useSelector((state: RootState) => state.auth.session);
  const { messages } = useAiChat();
  const latestUserMessage = [...messages].reverse().find(message => message.role === "user")?.text || "";
  const role = String(session?.role || "EMPLOYEE").replace(/^ROLE_/i, "").toUpperCase();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActionType>("SUPPORT_TICKET");
  const [values, setValues] = useState(defaults);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [hintNote, setHintNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [recoveryRequired, setRecoveryRequired] = useState(() => hasUnverifiedAiAction(session?.userId));
  const [recoveryStatus, setRecoveryStatus] = useState<TokenStatus | null>(null);
  const [recentActions, setRecentActions] = useState<RecentAction[] | null>(null);
  const [recentLoading, setRecentLoading] = useState(false);
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AiDiagnostics | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [modelHealthLoading, setModelHealthLoading] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewGeneration = useRef(0);
  const operationPending = useRef(false);
  const sessionGeneration = useRef(0);
  useEffect(() => {
    // Never carry an action or confirmation token into another signed-in session.
    sessionGeneration.current += 1;
    operationPending.current = false; setBusy(false);
    reviewGeneration.current += 1; setReviewItems([]); setReviewLoading(false);
    setOpen(false); setPreview(null); setAcknowledged(false); setResult(null); setError(""); setHintNote("");
    setType("SUPPORT_TICKET"); setValues(defaults()); setRecoveryToken(null); setRecoveryStatus(null); setRecentActions(null); setRecentLoading(false); setRecoveryRequired(hasUnverifiedAiAction(session?.userId)); setMonitor(null); setMonitorLoading(false); setDiagnostics(null); setDiagnosticsLoading(false); setModelHealth(null); setModelHealthLoading(false);
  }, [session?.token, session?.userId]);
  useEffect(() => {
    if (!open || !["MANAGER", "HR", "ADMIN"].includes(role)) return;
    const request = ++reviewGeneration.current;
    setReviewLoading(true);
    api.get<ReviewItem[]>("/ai/actions/review-queue").then(response => {
      if (request === reviewGeneration.current) setReviewItems(response.data);
    }).catch(e => {
      if (request === reviewGeneration.current) setError(errorText(e));
    }).finally(() => {
      if (request === reviewGeneration.current) setReviewLoading(false);
    });
    return () => { reviewGeneration.current += 1; };
  }, [open, role, session?.token]);

  const releasePreview = (token?: string) => {
    if (!token) return;
    // Best-effort revocation; the server also expires abandoned previews after ten minutes.
    void api.post("/ai/actions/cancel", {token}).catch(() => undefined);
  };
  const reset = () => {
    if (operationPending.current) return;
    releasePreview(preview?.token);
    reviewGeneration.current += 1;
    // Closing the dialog must never erase an unresolved confirmation warning.
    setOpen(false); setPreview(null); setAcknowledged(false); setResult(null); setError(""); setHintNote("");
    setValues(type === "EXPENSE_CLAIM" ? {...defaults(), category: "Travel"} : type === "HR_SERVICE_REQUEST" ? {...defaults(), category: "OTHER"} : defaults());
  };
  const select = (next: ActionType) => {
    if (operationPending.current || recoveryRequired) return;
    releasePreview(preview?.token); setType(next); setValues(next === "EXPENSE_CLAIM" ? {...defaults(), category: "Travel"} : next === "HR_SERVICE_REQUEST" ? {...defaults(), category: "OTHER"} : defaults()); setPreview(null); setResult(null); setError(""); setAcknowledged(false); setHintNote("");
  };
  const edit = (key: keyof ReturnType<typeof defaults>, value: string) => {
    if (operationPending.current || recoveryRequired) return;
    releasePreview(preview?.token);
    setValues(previous => ({ ...previous, [key]: value }));
    setPreview(null); setAcknowledged(false); setError(""); setResult(null);
  };
  const suggestFromChat = () => {
    if (operationPending.current || preview || !latestUserMessage || type.startsWith("REVIEW_")) return;
    const hints = suggestActionFields(latestUserMessage, type);
    const keys = fieldsByType[type].filter(key => hints[key] !== undefined);
    if (keys.length === 0) {
      setHintNote("No recognizable fields in the last message. Enter the information manually."); return;
    }
    setValues(previous => ({ ...previous, ...hints }));
    setResult(null); setError(""); setAcknowledged(false);
    setHintNote(`Suggested ${keys.length} field${keys.length === 1 ? "" : "s"} from your latest message. Check the details and edit anything incorrect before previewing.`);
  };
  const prepare = async () => {
    if (operationPending.current || recoveryRequired) return;
    operationPending.current = true; const generation = sessionGeneration.current; setBusy(true); setError(""); setPreview(null); setAcknowledged(false);
    try {
      const fields = Object.fromEntries(fieldsByType[type].map(key => [key, values[key as keyof typeof values]]));
      const response = await api.post<Preview>("/ai/actions/preview", { type, fields });
      if (generation === sessionGeneration.current) setPreview(response.data);
    } catch (e) { if (generation === sessionGeneration.current) setError(errorText(e)); }
    finally { if (generation === sessionGeneration.current) { operationPending.current = false; setBusy(false); } }
  };
  const confirm = async () => {
    if (!preview || !acknowledged || operationPending.current) return;
    operationPending.current = true; const generation = sessionGeneration.current; setBusy(true); setError("");
    // Persist the uncertainty BEFORE the request leaves this tab. A reload or
    // navigation during an in-flight write otherwise bypasses the warning.
    // The marker contains no token or business details and is cleared on a
    // verified response or after the person reconciles the portal record.
    markUnverifiedAiAction(session?.userId);
    try {
      const response = await api.post<Result>("/ai/actions/confirm", { token: preview.token, confirmed: true });
      if (generation === sessionGeneration.current) { clearUnverifiedAiAction(session?.userId); setRecoveryRequired(false); setResult(response.data); setPreview(null); setAcknowledged(false); setRecoveryToken(null); setRecoveryStatus(null); }
    } catch (e) {
      if (generation === sessionGeneration.current) {
        // Confirmation may have committed even if the client lost its response.
        // Preserve a minimal marker across closes/reloads; never store the token.
        markUnverifiedAiAction(session?.userId);
        setRecoveryRequired(true); setPreview(null); setAcknowledged(false); setRecoveryToken(preview.token); setRecoveryStatus(null);
        setError(errorText(e) + " Do not submit another draft until you inspect the originating module.");
        try {
          const status = await api.post<TokenStatus>("/ai/actions/status", {token: preview.token});
          if (generation === sessionGeneration.current) setRecoveryStatus(status.data);
        } catch { /* Still preserve the unknown outcome; do not re-submit. */ }
      }
    } finally { if (generation === sessionGeneration.current) { operationPending.current = false; setBusy(false); } }
  };
  const acknowledgeReconciliation = () => {
    if (operationPending.current) return;
    clearUnverifiedAiAction(session?.userId);
    setRecoveryRequired(false); setRecoveryToken(null); setRecoveryStatus(null); setRecentActions(null); setError("");
  };
  const checkRecovery = async () => {
    if (!recoveryToken || operationPending.current) return;
    const generation = sessionGeneration.current;
    setBusy(true);
    try {
      const response = await api.post<TokenStatus>("/ai/actions/status", {token: recoveryToken});
      if (generation === sessionGeneration.current) { setRecoveryStatus(response.data); setError(""); }
    } catch (e) {
      if (generation === sessionGeneration.current) setError("Could not check preview status. Inspect the relevant portal records. " + errorText(e));
    } finally { if (generation === sessionGeneration.current) setBusy(false); }
  };
  const loadRecentActions = async () => {
    if (!recoveryRequired || recentLoading) return;
    const generation = sessionGeneration.current;
    setRecentLoading(true);
    setRecentActions(null);
    try {
      const response = await api.get<RecentAction[]>("/ai/actions/recent");
      if (generation === sessionGeneration.current) { setRecentActions(response.data); setError(""); }
    } catch (e) {
      if (generation === sessionGeneration.current) setError("Could not retrieve recent outcomes. Check the original portal record. " + errorText(e));
    } finally { if (generation === sessionGeneration.current) setRecentLoading(false); }
  };
  const loadMonitor = async (hours: 24 | 168) => {
    if (role !== "ADMIN") return;
    const generation = sessionGeneration.current;
    setMonitorLoading(true);
    try {
      const response = await api.get<Monitor>("/ai/actions/monitor", {params: {hours}});
      if (generation === sessionGeneration.current) setMonitor(response.data);
    } catch (e) { if (generation === sessionGeneration.current) setError(errorText(e)); }
    finally { if (generation === sessionGeneration.current) setMonitorLoading(false); }
  };
  const loadDiagnostics = async () => {
    if (role !== "ADMIN") return;
    const generation = sessionGeneration.current;
    setDiagnosticsLoading(true);
    try {
      const response = await api.get<AiDiagnostics>("/ai/actions/diagnostics");
      if (generation === sessionGeneration.current) setDiagnostics(response.data);
    } catch (e) { if (generation === sessionGeneration.current) setError(errorText(e)); }
    finally { if (generation === sessionGeneration.current) setDiagnosticsLoading(false); }
  };
  const loadModelHealth = async () => {
    if (role !== "ADMIN") return;
    const generation = sessionGeneration.current;
    setModelHealthLoading(true);
    try {
      const response = await api.get<ModelHealth>("/ai/model-health");
      if (generation === sessionGeneration.current) setModelHealth(response.data);
    } catch (e) { if (generation === sessionGeneration.current) setError(errorText(e)); }
    finally { if (generation === sessionGeneration.current) setModelHealthLoading(false); }
  };
  const form = () => {
    switch (type) {
      case "REVIEW_LEAVE":
      case "REVIEW_TIMESHEET": {
        const eligible = reviewItems.filter(item => item.type === type);
        const selected = eligible.find(item => item.id === values.recordId);
        return <>
          <Alert severity="info">You are responsible for the decision. Review the underlying request in its portal module before approving or rejecting it. The AI never chooses a decision for you.</Alert>
          <TextField select fullWidth label={type === "REVIEW_LEAVE" ? "Pending leave request" : "Pending timesheet"} value={values.recordId} onChange={e => edit("recordId", e.target.value)} disabled={reviewLoading}>
            <MenuItem value="">Select a request</MenuItem>
            {eligible.map(item => <MenuItem key={`${item.type}-${item.id}`} value={item.id}>#{item.id} · {item.employeeName} · {item.description}</MenuItem>)}
          </TextField>
          {reviewLoading ? <Typography variant="caption">Loading your authorized review queue…</Typography> : !eligible.length ? <Alert severity="info">No pending requests are available for this review type.</Alert> : null}
          {selected && <Box sx={{border: "1px solid", borderColor: "divider", p: 1.5, borderRadius: 2}}>
            <Typography variant="subtitle2">{selected.employeeName}</Typography><Typography variant="body2" color="text.secondary">{selected.description}</Typography>
            <Button size="small" component="a" target="_blank" rel="noopener noreferrer" href={`/${role.toLowerCase()}/${type === "REVIEW_LEAVE" ? "leave" : "timesheets"}`} sx={{mt:1}}>Open full record in a new tab</Button>
          </Box>}
          <TextField select label="Your decision" value={values.decision} onChange={e => edit("decision", e.target.value)}><MenuItem value="APPROVED">Approve</MenuItem><MenuItem value="REJECTED">Reject</MenuItem></TextField>
          <TextField required multiline minRows={2} label="Your review rationale (3–1000 characters)" value={values.comment} onChange={e => edit("comment", e.target.value)} inputProps={{maxLength:1000}} />
        </>;
      }
      case "SUPPORT_TICKET": return <>
        <TextField required label="Ticket subject" value={values.subject} inputProps={{maxLength:160}} onChange={e => edit("subject", e.target.value)} />
        <TextField required multiline minRows={3} label="Describe the issue" value={values.description} inputProps={{maxLength:2000}} onChange={e => edit("description", e.target.value)} />
        <Stack direction={{xs:"column",sm:"row"}} spacing={1.5}>
          <TextField select fullWidth label="Category" value={values.category} onChange={e => edit("category",e.target.value)}>{categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
          <TextField select fullWidth label="Priority" value={values.priority} onChange={e => edit("priority",e.target.value)}>{["LOW","MEDIUM","HIGH","URGENT"].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField>
        </Stack>
      </>;
      case "HR_SERVICE_REQUEST": return <>
        <Alert severity="info">This submits an HR service request for normal processing. AI cannot approve or resolve it.</Alert>
        <TextField required label="Request subject" value={values.subject} inputProps={{maxLength:160}} onChange={e => edit("subject",e.target.value)} />
        <TextField required multiline minRows={3} label="Request details" value={values.description} inputProps={{maxLength:2000}} onChange={e => edit("description",e.target.value)} />
        <Stack direction={{xs:"column",sm:"row"}} spacing={1.5}>
          <TextField select fullWidth label="HR category" value={values.category} onChange={e => edit("category",e.target.value)}>{["PAYROLL","BENEFITS","DOCUMENTS","ATTENDANCE","OTHER"].map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
          <TextField select fullWidth label="Priority" value={values.priority} onChange={e => edit("priority",e.target.value)}>{["LOW","MEDIUM","HIGH","URGENT"].map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
        </Stack>
      </>;
      case "OVERTIME_REQUEST": return <>
        <Alert severity="info">Overtime hours require review and approval in the normal portal workflow.</Alert>
        <Stack direction={{xs:"column",sm:"row"}} spacing={1.5}>
          <TextField type="date" fullWidth label="Work date" InputLabelProps={{shrink:true}} value={values.workDate} onChange={e=>edit("workDate",e.target.value)}/>
          <TextField type="number" fullWidth label="Overtime hours" inputProps={{min:0.01,max:24,step:0.25}} value={values.hours} onChange={e=>edit("hours",e.target.value)}/>
        </Stack>
        <TextField label="Project (optional)" value={values.project} inputProps={{maxLength:100}} onChange={e=>edit("project",e.target.value)}/>
        <TextField select label="Requested compensation" value={values.compensationMode} onChange={e=>edit("compensationMode",e.target.value)}><MenuItem value="PAYMENT">Payment</MenuItem><MenuItem value="COMP_OFF">Compensatory off</MenuItem></TextField>
        <TextField required multiline minRows={3} label="Overtime reason" value={values.reason} inputProps={{maxLength:1200}} onChange={e=>edit("reason",e.target.value)}/>
      </>;
      case "EXPENSE_CLAIM": return <>
        <Alert severity="info">Expense claims require normal approval. The receipt field records a name/reference only; it does not upload evidence.</Alert>
        <Stack direction={{xs:"column",sm:"row"}} spacing={1.5}>
          <TextField select fullWidth label="Expense category" value={expenseCategories.includes(values.category) ? values.category : "Travel"} onChange={e => edit("category",e.target.value)}>{expenseCategories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
          <TextField fullWidth required type="number" label="Amount (INR)" inputProps={{min:.01,max:1000000,step:.01}} value={values.amount} onChange={e => edit("amount",e.target.value)} />
        </Stack>
        <TextField type="date" label="Expense date" InputLabelProps={{shrink:true}} value={values.expenseDate} onChange={e => edit("expenseDate",e.target.value)} />
        <TextField required multiline minRows={3} label="Purpose and details" inputProps={{maxLength:1000}} value={values.description} onChange={e => edit("description",e.target.value)} />
        <TextField label="Receipt name/reference (optional, not a file upload)" inputProps={{maxLength:160}} value={values.receiptName} onChange={e => edit("receiptName",e.target.value)} />
      </>;
      case "LEAVE_REQUEST": return <>
        <Stack direction={{xs:"column",sm:"row"}} spacing={1.5}>
          <TextField type="date" label="From" fullWidth InputLabelProps={{shrink:true}} value={values.startDate} onChange={e => edit("startDate",e.target.value)} />
          <TextField type="date" label="To" fullWidth InputLabelProps={{shrink:true}} value={values.endDate} onChange={e => edit("endDate",e.target.value)} />
        </Stack>
        <TextField select label="Duration" value={values.leaveDurationType} onChange={e => edit("leaveDurationType", e.target.value)}>
          <MenuItem value="FULL_DAY">Full day</MenuItem><MenuItem value="FIRST_HALF">First half</MenuItem><MenuItem value="SECOND_HALF">Second half</MenuItem>
        </TextField>
        {values.leaveDurationType === "FULL_DAY" && <TextField label="Leave category (must match an active category in the portal)" value={values.leaveType} onChange={e => edit("leaveType",e.target.value)} />}
        <TextField required multiline minRows={3} label="Reason" value={values.reason} inputProps={{maxLength:900}} onChange={e => edit("reason",e.target.value)} />
        <Typography variant="caption" color="text.secondary">Your existing leave balances, category and overlap checks apply. Final approval is not automatic.</Typography>
      </>;
      case "TIMESHEET_ENTRY": return <>
        <Stack direction={{xs:"column",sm:"row"}} spacing={1.5}>
          <TextField type="date" label="Work date" fullWidth InputLabelProps={{shrink:true}} value={values.date} onChange={e => edit("date",e.target.value)} />
          <TextField type="number" fullWidth label="Hours worked" inputProps={{ min: .25, max: 24, step: .25 }} value={values.hoursWorked} onChange={e => edit("hoursWorked",e.target.value)} />
        </Stack>
        <TextField select label="Work mode" value={values.workMode} onChange={e => edit("workMode", e.target.value)}><MenuItem value="OFFICE">Office</MenuItem><MenuItem value="WFH">Work from home</MenuItem><MenuItem value="HYBRID">Hybrid</MenuItem></TextField>
        <TextField multiline minRows={3} required label="Work summary" value={values.taskDescription} inputProps={{maxLength:900}} onChange={e => edit("taskDescription",e.target.value)} />
        <Typography variant="caption" color="text.secondary">This creates a general/non-project timesheet. Use the Timesheets module to select an assigned project or learning mentor.</Typography>
      </>;
    }
  };
  return <>
    <Button variant={compact ? "text" : "contained"} size={compact ? "small" : "medium"} startIcon={<AddTaskRounded />} onClick={() => setOpen(true)} sx={compact ? {color:"inherit",minWidth:0} : undefined}>{compact ? "Actions" : "AI Actions"}</Button>
    <Dialog open={open} onClose={reset} fullWidth maxWidth="sm" aria-labelledby="bt-ai-action-title" keepMounted={false}>
      <DialogTitle id="bt-ai-action-title">BlueThink AI · Confirmed actions</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{pt:1}}>
          <Typography variant="body2" color="text.secondary">Prepare a request, verify every detail, then explicitly confirm. AI chat never submits actions automatically. Requests always use your signed-in account.</Typography>
          {role === "ADMIN" && <Box sx={{border: "1px solid", borderColor: "divider", p: 1.5, borderRadius: 2}}>
            <Typography variant="subtitle2">AI action operations · Admin only</Typography>
            <Stack direction="row" spacing={1} sx={{my: 1}}>
              <Button variant="outlined" size="small" disabled={monitorLoading} onClick={()=>void loadMonitor(24)}>Last 24 hours</Button>
              <Button variant="outlined" size="small" disabled={monitorLoading} onClick={()=>void loadMonitor(168)}>Last 7 days</Button>
              <Button variant="outlined" size="small" disabled={diagnosticsLoading} onClick={()=>void loadDiagnostics()}>Response timings</Button>
              <Button variant="outlined" size="small" disabled={modelHealthLoading} onClick={()=>void loadModelHealth()}>AI request status</Button>
            </Stack>
            {monitor && <Typography variant="body2">{monitor.windowHours}h · Active drafts: <strong>{monitor.activePreviews}</strong> · Expired: <strong>{monitor.expiredPreviews}</strong> · Consumed attempts: <strong>{monitor.consumedAttempts}</strong> · Cancelled: <strong>{monitor.cancelledPreviews}</strong> · Recorded commit receipts: <strong>{monitor.recordedCommits}</strong> · Commit-success audit events: <strong>{monitor.successfulCommitEvents}</strong> · Failure audit events: <strong>{monitor.failedCommitEvents}</strong> · Receipt warnings: <strong>{monitor.receiptUnverifiedEvents ?? 0}</strong>. Receipt warnings mean a business commit may have succeeded without a durable confirmation receipt; investigate before retrying. Audit counts are events, not guaranteed distinct business operations.</Typography>}
            {modelHealth && <Alert severity={modelHealth.circuit.state === "CLOSED" ? "success" : "warning"} sx={{my:1}}>
              Model guard: <strong>{modelHealth.circuit.state}</strong> · Active calls {modelHealth.capacity.active}/{modelHealth.capacity.limit} · Consecutive failures {modelHealth.circuit.consecutiveFailures}/{modelHealth.circuit.failureThreshold}.
              {modelHealth.circuit.state === "OPEN" && ` Retry after approximately ${modelHealth.circuit.retryAfterSeconds}s.`}
              {modelHealth.circuit.probeInProgress && " Recovery probe in progress."}
              <Typography component="span" variant="caption" display="block">This is this backend process's request protection state, not a live Groq health check. Other backend instances may differ; status refreshes only when requested.</Typography>
            </Alert>}
            {diagnostics && <Box sx={{mt:1.5}}>
              <Typography variant="caption" color="text.secondary" display="block">Server-local metrics since {new Date(diagnostics.processStartedAt).toLocaleString()} (reset on restart; not fleet-wide). Latency is based on up to {diagnostics.maxSamplesPerOperation} most recent samples per endpoint. No employee or request content is collected.</Typography>
              <Stack spacing={0.5} sx={{mt:1}}>
                {diagnostics.operations.filter(item => item.requests > 0).map(item => <Typography key={item.operation} variant="caption">
                  <strong>{item.operation.replaceAll("_", " ")}</strong>: {item.requests} requests · P50 {item.p50Ms}ms · P95 {item.p95Ms}ms · errors {item.errors} · denied {item.denied}
                </Typography>)}
                {diagnostics.operations.every(item => item.requests === 0) && <Typography variant="caption">No AI requests measured on this server yet.</Typography>}
              </Stack>
            </Box>}
          </Box>}
          {recoveryRequired && <Alert severity={recoveryStatus?.state === "COMMITTED" ? "success" : "warning"}>
            <Typography variant="subtitle2">Previous confirmation needs verification</Typography>
            <Typography variant="body2">{recoveryStatus?.guidance || "The server response was unclear. Check the related portal module or ask an administrator to verify it before submitting again."}</Typography>
            {recoveryStatus?.state === "COMMITTED" && <Typography variant="body2" sx={{mt:1}}><strong>Committed receipt recorded</strong>{recoveryStatus.reference ? ` · Reference: ${recoveryStatus.reference}` : ""}. Review the record in the relevant portal module.</Typography>}
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{mt:1}}>
              {recoveryToken && <Button size="small" variant="outlined" disabled={busy} onClick={()=>void checkRecovery()}>Check preview status</Button>}
              <Button size="small" variant="outlined" disabled={busy || recentLoading} onClick={()=>void loadRecentActions()}>{recentLoading ? "Checking…" : "View recent action outcomes"}</Button>
              <Button size="small" variant="outlined" disabled={busy} onClick={acknowledgeReconciliation}>I checked the portal records</Button>
            </Stack>
            {recentActions && <Box sx={{mt:1.5}}>
              <Typography variant="caption" display="block">Your 12 most recent AI action previews from the past 24 hours. This is supporting evidence, not proof that a particular lost request matches a row. Verify the actual portal record before acknowledging.</Typography>
              {recentActions.length === 0 ? <Typography variant="body2">No recent action history available. Inspect the relevant module or contact an administrator.</Typography> :
                <Stack spacing={0.5} sx={{mt:1}}>
                  {recentActions.map((item,index) => <Typography key={`${item.createdAt}-${index}`} variant="body2">
                    {new Date(item.createdAt).toLocaleString()} · {item.type.replaceAll("_", " ")} · <strong>{item.state}</strong>
                    {item.state === "COMMITTED" && item.reference ? ` · Reference: ${item.reference}` : ""}
                    {item.state === "CONSUMED" ? " · Outcome unverified; do not resubmit without checking." : ""}
                  </Typography>)}
                </Stack>}
            </Box>}
          </Alert>}
          {result ? <Alert severity="success" icon={<CheckCircleRounded />}>{result.message} Reference: <strong>{result.reference || "Created"}</strong>. You can check the corresponding portal module.</Alert> : <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(["SUPPORT_TICKET","LEAVE_REQUEST","TIMESHEET_ENTRY","EXPENSE_CLAIM","HR_SERVICE_REQUEST","OVERTIME_REQUEST","REVIEW_LEAVE","REVIEW_TIMESHEET"] as ActionType[])
                .filter(t => (t!=="TIMESHEET_ENTRY" || role!=="ADMIN") && (!t.startsWith("REVIEW_") || ["MANAGER","HR","ADMIN"].includes(role))).map(t =>
                <Chip key={t} clickable disabled={busy || !!preview || recoveryRequired} label={t==="SUPPORT_TICKET"?"Support ticket":t==="LEAVE_REQUEST"?"Leave request":t==="TIMESHEET_ENTRY"?"Timesheet":t==="EXPENSE_CLAIM"?"Expense claim":t==="HR_SERVICE_REQUEST"?"HR request":t==="OVERTIME_REQUEST"?"Overtime":t==="REVIEW_LEAVE"?"Review leave":"Review timesheet"}
                  color={type===t?"primary":"default"} variant={type===t?"filled":"outlined"} onClick={()=>select(t)}/>) }
            </Stack>
            {!preview ? <Stack spacing={1.5}>
              {!!latestUserMessage && !type.startsWith("REVIEW_") && <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                <Typography variant="body2" fontWeight={700}>Draft assistance</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{mb:1}}>
                  Use recognizable details from your latest chat message to fill editable fields. Suggestions are local and never submit a request.
                </Typography>
                <Button variant="outlined" size="small" onClick={suggestFromChat} disabled={busy}>Suggest fields from last message</Button>
              </Box>}
              {hintNote && <Alert severity="info" onClose={() => setHintNote("")}>{hintNote}</Alert>}
              {form()}
            </Stack> : <Box sx={{p:2,border:"1px solid",borderColor:"divider",borderRadius:2,bgcolor:"action.hover"}}>
              <Typography variant="subtitle1" fontWeight={800}>Review before submitting</Typography>
              <Typography variant="body2" fontWeight={700} sx={{my:1}}>{preview.summary}</Typography>
              {Object.entries(preview.fields).map(([key,value]) => <Typography key={key} variant="body2" sx={{wordBreak:"break-word"}}><strong>{key.replace(/([A-Z])/g," $1")}:</strong> {value}</Typography>)}
              <Typography variant="caption" color="text.secondary" display="block" sx={{mt:1}}>Preview expires: {new Date(preview.expiresAt).toLocaleTimeString()}</Typography>
              <FormControlLabel control={<Checkbox checked={acknowledged} disabled={busy} onChange={e => setAcknowledged(e.target.checked)}/>} label={type.startsWith("REVIEW_") ? "I reviewed the underlying record, chose this decision myself, and authorize it." : "I have reviewed the details and authorize this submission."} />
            </Box>}
          </>}
          {error && <Alert severity="error" onClose={()=>setError("")}>{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{px:3,pb:2}}>
        <Button onClick={reset} disabled={busy}>{result?"Close":"Cancel"}</Button>
        {result ? <Button onClick={()=>{setResult(null);setPreview(null);setValues(type === "EXPENSE_CLAIM" ? {...defaults(), category: "Travel"} : type === "HR_SERVICE_REQUEST" ? {...defaults(), category: "OTHER"} : defaults());setHintNote("");}}>Another action</Button> : preview ? <>
          <Button disabled={busy} onClick={()=>{releasePreview(preview.token);setPreview(null);setAcknowledged(false);}}>Edit draft</Button>
          <Button variant="contained" color="primary" disabled={busy || !acknowledged} onClick={()=>void confirm()}>{busy?"Submitting…":type.startsWith("REVIEW_")?"Confirm decision":"Confirm & submit"}</Button>
        </> : <Button variant="contained" disabled={busy || recoveryRequired} onClick={()=>void prepare()}>{busy?"Preparing…":"Preview action"}</Button>}
      </DialogActions>
    </Dialog>
  </>;
}
