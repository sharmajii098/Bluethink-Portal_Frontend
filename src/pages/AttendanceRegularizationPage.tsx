import { useSelfService } from "../contexts/RequestViewContext";
import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { api } from "../services/api";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type Request = {
  id: number; requestNumber: string; employeeName?: string; attendanceDate?: string;
  requestedCheckIn?: string; requestedCheckOut?: string; reason?: string;
  status: string; reviewerComment?: string; reviewerName?: string;
  appliedAt?: string | null; appliedAttendanceId?: number | null;
};
const management = new Set(["ADMIN", "HR", "MANAGER"]);
const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.detail || error?.response?.data?.error || fallback;

export default function AttendanceRegularizationPage() {
 const selfService = useSelfService();
  const role = useSelector((state: RootState) => state.auth.session?.role || "EMPLOYEE");
  const isReviewer=!selfService && management.has(role);
  const [rows, setRows] = useState<Request[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Request | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await api.get<Request[]>(isReviewer ? "/attendance-regularizations" : "/attendance-regularizations/my");
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (e: any) {
      setError(errorMessage(e, "Unable to load requests."));
    }
  }
  useEffect(() => { void load(); }, [role]);

  async function submit() {
    if (busy) return;
    setError(""); setSuccess(""); setBusy(true);
    try {
      await api.post("/attendance-regularizations", form);
      setOpen(false); setForm({});
      setSuccess("Correction request submitted. Attendance will change only after approval.");
      await load();
    } catch (e: any) { setError(errorMessage(e, "Unable to submit the request.")); }
    finally { setBusy(false); }
  }

  async function review() {
    if (!selected || busy) return;
    setError(""); setSuccess(""); setBusy(true);
    try {
      const response = await api.patch<Request>(`/attendance-regularizations/${selected.id}/review`, form);
      setRows(previous => previous.map(row => row.id === selected.id ? response.data : row));
      setSelected(null); setForm({});
      setSuccess(response.data.status === "APPROVED"
        ? `Approved and updated attendance record #${response.data.appliedAttendanceId}. Employee's calendar and attendance reports will show the correction on refresh.`
        : response.data.status === "REJECTED" ? "Request rejected. Attendance was not changed." : "Request marked under review.");
      await load();
    } catch (e: any) { setError(errorMessage(e, "Review was not completed. Attendance has not been confirmed updated.")); }
    finally { setBusy(false); }
  }

  async function applyLegacy(row: Request) {
    if (busy || row.status !== "APPROVED" || row.appliedAt) return;
    if (!window.confirm("Apply this older approved correction to the attendance record? Verify its times and date before continuing. Raw punch logs will remain unchanged.")) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await api.post<Request>(`/attendance-regularizations/${row.id}/apply-approved`);
      setRows(previous => previous.map(item => item.id === row.id ? response.data : item));
      setSuccess(`Approved correction applied to attendance record #${response.data.appliedAttendanceId}. Refresh the employee attendance page to see it.`);
      await load();
    } catch (e: any) { setError(errorMessage(e, "The older approval could not be applied. No correction has been confirmed.")); }
    finally { setBusy(false); }
  }

  return <Box sx={{ p: { xs: 2, md: 4 } }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} mb={3}>
      <Box><Typography variant="h4" fontWeight={800}>Attendance Regularization</Typography>
        <Typography color="text.secondary">Request corrections for missed punches and incorrect timings.</Typography></Box>
      {!isReviewer && <Button variant="contained" onClick={() => { setError(""); setOpen(true); }}>Request Correction</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
    {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success} <Button size="small" href={`/${role.toLowerCase()}/attendance`}>View attendance</Button></Alert>}
    <Stack spacing={2}>
      {rows.map(row => <Paper key={row.id} sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography fontWeight={800}>{row.employeeName || "My Request"}</Typography>
            <Typography variant="body2" color="text.secondary">{row.requestNumber} · {row.attendanceDate || "—"}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Requested: {row.requestedCheckIn || "—"} → {row.requestedCheckOut || "—"}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>{row.reason}</Typography>
            {row.reviewerComment && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Reviewer: {row.reviewerComment}</Typography>}
            {row.appliedAt && <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              Attendance updated · Record #{row.appliedAttendanceId} · {row.appliedAt.replace("T", " ").slice(0, 16)}
            </Typography>}
            {row.status === "APPROVED" && !row.appliedAt && <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
              Older approval: attendance update not verified. A reviewer can apply it explicitly.
            </Typography>}
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" gap={1}>
            <Chip label={row.status} color={row.status === "APPROVED" ? "success" : row.status === "REJECTED" ? "error" : "warning"}/>
            {isReviewer && ["SUBMITTED", "UNDER_REVIEW"].includes(row.status) &&
              <Button variant="outlined" disabled={busy} onClick={() => { setError(""); setSelected(row); setForm({ status: "UNDER_REVIEW", comment: "" }); }}>Review</Button>}
            {isReviewer && row.status === "APPROVED" && !row.appliedAt &&
              <Button color="warning" variant="outlined" disabled={busy} onClick={() => void applyLegacy(row)}>Apply approved correction</Button>}
          </Stack>
        </Stack>
      </Paper>)}
      {!rows.length && <Paper sx={{ p: 5, textAlign: "center" }}><Typography color="text.secondary">No attendance regularization requests found.</Typography></Paper>}
    </Stack>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} fullWidth maxWidth="sm">
      <DialogTitle>Request Attendance Correction</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        <TextField required label="Attendance Date" type="date" InputLabelProps={{ shrink: true }} value={form.attendanceDate || ""} onChange={e => setForm({ ...form, attendanceDate: e.target.value })}/>
        <TextField required label="Requested Check-In" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.requestedCheckIn || ""} onChange={e => setForm({ ...form, requestedCheckIn: e.target.value })}/>
        <TextField required label="Requested Check-Out" type="time" InputLabelProps={{ shrink: true }} value={form.requestedCheckOut || ""} onChange={e => setForm({ ...form, requestedCheckOut: e.target.value })}/>
        <TextField required label="Reason" multiline minRows={4} value={form.reason || ""} onChange={e => setForm({ ...form, reason: e.target.value })}/>
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={busy || !form.attendanceDate || !form.requestedCheckIn || !form.requestedCheckOut || !form.reason?.trim()} onClick={() => void submit()}>Submit</Button></DialogActions>
    </Dialog>
    <Dialog open={!!selected} onClose={() => { if (!busy) setSelected(null); }} fullWidth maxWidth="sm">
      <DialogTitle>Review {selected?.requestNumber}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        <TextField select label="Status" value={form.status || "UNDER_REVIEW"} onChange={e => setForm({ ...form, status: e.target.value })}>
          {["UNDER_REVIEW", "APPROVED", "REJECTED"].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
        </TextField>
        <TextField required={form.status === "REJECTED"} label="Reviewer Comment" multiline minRows={4} value={form.comment || ""} onChange={e => setForm({ ...form, comment: e.target.value })}/>
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setSelected(null)}>Cancel</Button>
        <Button variant="contained" disabled={busy || (form.status === "REJECTED" && !form.comment?.trim())} onClick={() => void review()}>Save</Button></DialogActions>
    </Dialog>
  </Box>;
}
