import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { api } from "../services/api";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};

const blank = () => ({
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  standardHours: "8",
  description: "",
  overnight: false,
  active: true,
});

/**
 * Several APIs in this project return a raw array, while some endpoints can be
 * wrapped by pagination/response objects. Keep the scheduling page resilient
 * to both shapes so array operations never receive an object.
 */
function asArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.content)) return payload.content as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.content)) return payload.data.content as T[];
  if (Array.isArray(payload?.rows)) return payload.rows as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  return [];
}

type EmployeeOption = {
  id?: number | string;
  employeeId?: number | string | null;
  fullName?: string;
  email?: string;
  userId?: string;
  status?: string;
};

export default function WorkforceSchedulingPage() {
  const navigate = useNavigate();
  const session = useSelector((state: RootState) => state.auth.session);
  const role = session?.role || "EMPLOYEE";
  const management = ["ADMIN", "HR", "MANAGER"].includes(role);

  const [shifts, setShifts] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [edit, setEdit] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [af, setAf] = useState<any>({
    employeeId: "",
    shiftId: "",
    shiftDate: localDate(),
    notes: "",
  });
  const [review, setReview] = useState<any>(null);

  const load = async () => {
    setMsg("");

    try {
      const sr = await api.get("/workforce/shifts");
      setShifts(asArray(sr.data));
    } catch (e: any) {
      setShifts([]);
      setMsg(e?.response?.data?.message || e?.response?.data?.detail || "Unable to load shift definitions");
    }

    try {
      const rr = await api.get(
        management
          ? `/workforce/all?from=${localDate()}&to=${addDays(30)}`
          : "/workforce/my",
      );
      setRows(asArray(rr.data));
    } catch (e: any) {
      setRows([]);
      setMsg(e?.response?.data?.message || e?.response?.data?.detail || "Unable to load workforce schedule");
    }

    if (management) {
      try {
        // Managers are allowed to access only their reporting team.
        // HR/Admin can use the full employee directory.
        // /api/employees/team returns real Employee ids, which /workforce/assign requires.
        const employeeUrl = role === "MANAGER" ? "/employees/team" : "/employees?size=500";
        const er = await api.get(employeeUrl);
        const list = asArray<EmployeeOption>(er.data);

        if (role === "MANAGER") {
          setEmployees(list.filter((employee) => employee?.id != null));
        } else {
          // /api/employees returns EmployeeProfile rows. Workforce assignment,
          // however, requires the real Employee entity id exposed as employeeId.
          setEmployees(list.filter((employee) => employee?.employeeId != null));
        }
      } catch (e: any) {
        setEmployees([]);
        setMsg(e?.response?.data?.message || e?.response?.data?.detail || "Unable to load employees for shift assignment");
      }
    } else {
      setEmployees([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const filtered = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const query = q.trim().toLowerCase();

    if (!query) return safeRows;

    return safeRows.filter((x) =>
      `${x?.employee?.fullName || ""} ${x?.employee?.email || ""} ${x?.shift?.name || ""} ${x?.shiftDate || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [rows, q]);

  const saveShift = async () => {
    try {
      const payload = { ...form, standardHours: Number(form.standardHours) };
      if (edit) await api.put(`/workforce/shifts/${edit.id}`, payload);
      else await api.post("/workforce/shifts", payload);

      setOpen(false);
      setEdit(null);
      setForm(blank());
      setMsg("Shift saved");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.response?.data?.detail || "Unable to save shift");
    }
  };

  const assign = async () => {
    try {
      await api.post("/workforce/assign", {
        ...af,
        employeeId: String(af.employeeId),
        shiftId: String(af.shiftId),
      });
      setAssignOpen(false);
      setAf({ employeeId: "", shiftId: "", shiftDate: localDate(), notes: "" });
      setMsg("Shift assigned");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.response?.data?.detail || "Unable to assign shift");
    }
  };

  const patch = async (status: string) => {
    if (!review) return;

    try {
      await api.patch(`/workforce/${review.id}`, {
        status,
        overtimeHours: Number(review.overtimeHours || 0),
        notes: review.notes,
      });
      setReview(null);
      setMsg("Schedule updated");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || e?.response?.data?.detail || "Unable to update schedule");
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            {management ? "Shift & Workforce Scheduling" : "My Shift & Schedule"}
          </Typography>
          <Typography color="text.secondary">
            {management
              ? "Plan rosters, assign shifts, manage swaps and track overtime."
              : "View your assigned shifts, timings, overtime and shift swap options."}
          </Typography>
        </Box>

        {management && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => {
                setEdit(null);
                setForm(blank());
                setOpen(true);
              }}
            >
              Manage Shifts
            </Button>
            <Button variant="contained" onClick={() => setAssignOpen(true)}>
              Assign Shift
            </Button>
          </Stack>
        )}
      </Stack>

      {msg && (
        <Alert sx={{ mb: 2 }} onClose={() => setMsg("")}>
          {msg}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={3}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search employee or shift..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Chip label={`${filtered.length} scheduled`} sx={{ alignSelf: "center" }} />
      </Stack>

      <Stack spacing={2}>
        {filtered.map((x) => (
          <Card key={x.id}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                <Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={x.shift?.name || "Assigned Shift"} />
                    <Chip
                      label={x.status || "SCHEDULED"}
                      color={x.status === "COMPLETED" ? "success" : x.status === "CANCELLED" ? "error" : "warning"}
                    />
                    {x.swapStatus && x.swapStatus !== "NONE" && <Chip label={`Swap ${x.swapStatus}`} />}
                  </Stack>
                  <Typography variant="h6" mt={1}>
                    {x.employee?.fullName || x.employee?.email || "My Shift"}
                  </Typography>
                  <Typography color="text.secondary">
                    {x.shiftDate} • {x.shift?.startTime || "--:--"} - {x.shift?.endTime || "--:--"}
                  </Typography>
                  <Typography variant="body2" mt={1}>
                    Standard {x.shift?.standardHours || 8}h • Overtime {x.overtimeHours || 0}h
                    {x.notes ? ` • ${x.notes}` : ""}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  {management && (
                    <Button variant="outlined" onClick={() => setReview({ ...x })}>
                      Update
                    </Button>
                  )}
                  {!management && x.status === "SCHEDULED" && (
                    <Button variant="outlined" onClick={() => navigate(`/${role.toLowerCase()}/shift-swaps`)}>
                      Open Shift Swap
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {!filtered.length && <Typography color="text.secondary">No schedules found.</Typography>}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{edit ? "Edit Shift" : "Manage Shift"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Shift Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Stack direction="row" spacing={2}>
              <TextField
                type="time"
                label="Start"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <TextField
                type="time"
                label="End"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </Stack>
            <TextField
              type="number"
              label="Standard Hours"
              value={form.standardHours}
              onChange={(e) => setForm({ ...form, standardHours: e.target.value })}
            />
            <TextField
              multiline
              minRows={2}
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Stack>

          <Stack spacing={1} mt={2}>
            {shifts.map((s) => (
              <Card key={s.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                    <Typography>
                      {s.name} • {s.startTime}-{s.endTime}
                    </Typography>
                    <Button
                      onClick={() => {
                        setEdit(s);
                        setForm({ ...s, standardHours: s.standardHours || 8 });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {!edit && (
            <Button variant="contained" onClick={saveShift} disabled={!form.name?.trim()}>
              Create
            </Button>
          )}
          {edit && (
            <Button variant="contained" onClick={saveShift} disabled={!form.name?.trim()}>
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Assign Shift</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Employee"
              value={af.employeeId}
              onChange={(e) => setAf({ ...af, employeeId: e.target.value })}
              helperText={employees.length ? "Select an active employee record." : "No assignable employee records found."}
            >
              {employees.map((e) => (
                <MenuItem key={String(e.employeeId)} value={String(e.employeeId)}>
                  {e.fullName || e.email || e.userId || `Employee ${e.employeeId}`}
                </MenuItem>
              ))}
            </TextField>

            <TextField select label="Shift" value={af.shiftId} onChange={(e) => setAf({ ...af, shiftId: e.target.value })}>
              {shifts
                .filter((s) => s.active !== false)
                .map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: localDate() }}
              value={af.shiftDate}
              onChange={(e) => setAf({ ...af, shiftDate: e.target.value })}
            />
            <TextField label="Notes" value={af.notes} onChange={(e) => setAf({ ...af, notes: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={assign}
            disabled={!af.employeeId || !af.shiftId || !af.shiftDate}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!review} onClose={() => setReview(null)} fullWidth maxWidth="sm">
        <DialogTitle>Update Schedule</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Status"
              value={review?.status || "SCHEDULED"}
              onChange={(e) => setReview({ ...review, status: e.target.value })}
            >
              {["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((x) => (
                <MenuItem key={x} value={x}>
                  {x}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Overtime Hours"
              value={review?.overtimeHours || 0}
              onChange={(e) => setReview({ ...review, overtimeHours: e.target.value })}
            />
            <TextField
              multiline
              label="Notes"
              value={review?.notes || ""}
              onChange={(e) => setReview({ ...review, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReview(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => patch(review?.status || "SCHEDULED")}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
