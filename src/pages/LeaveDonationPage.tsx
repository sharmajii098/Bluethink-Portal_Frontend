import { useSelfService } from "../contexts/RequestViewContext";
import { useEffect, useMemo, useState } from "react";
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
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

type LeaveTypeRow = {
  id?: number;
  name?: string;
  code?: string;
  defaultDays?: number;
  isActive?: boolean;
};

type DonationForm = {
  recipientUserId: string;
  leaveType: string;
  days: number;
  reason: string;
};

const FALLBACK_TYPES: LeaveTypeRow[] = [
  { name: "Casual Leave", code: "CASUAL_LEAVE", defaultDays: 10, isActive: true },
];

const NON_TRANSFERABLE = new Set(["PROJECT_OFF", "LEAVE_WITHOUT_PAY", "LWP", "SHORT_LEAVE"]);

function eligibleLeaveTypes(rows: unknown): LeaveTypeRow[] {
  if (!Array.isArray(rows)) return FALLBACK_TYPES;
  const filtered = rows.filter((row: LeaveTypeRow) => {
    const code = String(row?.code || "").trim().toUpperCase();
    return row?.isActive !== false && !!code && !NON_TRANSFERABLE.has(code);
  });
  return filtered.length ? filtered : FALLBACK_TYPES;
}

const emptyForm = (leaveType = "CASUAL_LEAVE"): DonationForm => ({
  recipientUserId: "",
  leaveType,
  days: 1,
  reason: "",
});

export default function LeaveDonationPage() {
 const selfService = useSelfService();
  const role = getCurrentRole();
  const mgmt=!selfService && ["ADMIN", "HR", "MANAGER"].includes(role);
  const [items, setItems] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>(FALLBACK_TYPES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DonationForm>(emptyForm());
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const typeLabels = useMemo(() => {
    const map: Record<string, string> = {
      PAID_LEAVE: "Paid Leave",
      CASUAL_LEAVE: "Casual Leave",
      SICK_LEAVE: "Sick Leave",
      ANNUAL_LEAVE: "Annual Leave",
      OTHER: "Other",
    };
    leaveTypes.forEach((row) => {
      if (row.code) map[row.code] = row.name || row.code;
    });
    return map;
  }, [leaveTypes]);

  const load = async () => {
    try {
      setError("");
      const [donationResponse, typeResponse] = await Promise.all([
        api.get(mgmt ? "/leave-donations" : "/leave-donations/my"),
        api.get("/leave-types"),
      ]);
      setItems(Array.isArray(donationResponse.data) ? donationResponse.data : []);
      const validTypes = eligibleLeaveTypes(typeResponse.data);
      setLeaveTypes(validTypes);
      setForm((current) => {
        const currentStillValid = validTypes.some((x) => x.code === current.leaveType);
        return currentStillValid ? current : { ...current, leaveType: validTypes[0]?.code || "CASUAL_LEAVE" };
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load leave donations");
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const filtered = useMemo(
    () =>
      items.filter((x) =>
        `${x.requestNumber} ${x.donorName || x.donorUserId} ${x.recipientName || x.recipientUserId} ${x.leaveType} ${x.status}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [items, q],
  );

  const save = async () => {
    try {
      setError("");
      await api.post("/leave-donations", form);
      setOpen(false);
      setForm(emptyForm(leaveTypes[0]?.code || "CASUAL_LEAVE"));
      setMsg("Leave donation request submitted successfully.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data || "Unable to submit request");
    }
  };

  const review = async (id: number, status: string) => {
    try {
      setError("");
      await api.patch(`/leave-donations/${id}/review`, {
        status,
        comment: `Request ${status.toLowerCase().replaceAll("_", " ")}`,
      });
      setMsg(status === "APPROVED" ? "Leave donation approved and balances transferred." : "Request updated successfully.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data || "Unable to update request");
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <VolunteerActivismRoundedIcon />
            <Typography variant="h4" fontWeight={800}>Leave Donation &amp; Transfer</Typography>
          </Stack>
          <Typography color="text.secondary">
            Support colleagues by requesting a transfer of eligible leave days through an auditable approval workflow.
          </Typography>
        </Box>
        {!mgmt && <Button variant="contained" onClick={() => setOpen(true)}>Donate Leave</Button>}
      </Stack>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

      <TextField
        fullWidth
        size="small"
        placeholder="Search donation requests..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        {filtered.map((x) => (
          <Card key={x.id}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                <Box>
                  <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
                    <Chip size="small" label={x.requestNumber} />
                    <Chip
                      size="small"
                      label={x.status}
                      color={x.status === "APPROVED" ? "success" : x.status === "REJECTED" ? "error" : "warning"}
                    />
                    {x.status === "APPROVED" && x.transferApplied === true && (
                      <Chip size="small" label="BALANCE TRANSFERRED" color="success" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="h6" fontWeight={800}>
                    {x.donorName || x.donorUserId} → {x.recipientName || x.recipientUserId}
                  </Typography>
                  <Typography color="text.secondary">
                    {typeLabels[x.leaveType] || x.leaveType} • {x.days} day(s)
                  </Typography>
                  {x.reason && <Typography sx={{ mt: 1 }}>{x.reason}</Typography>}
                  {x.reviewerComment && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Review: {x.reviewerComment}
                    </Typography>
                  )}
                </Box>

                {mgmt && !["APPROVED", "REJECTED", "CANCELLED"].includes(x.status) && (
                  <Stack direction={{ xs: "column", md: "row" }}>
                    <Button onClick={() => review(x.id, "UNDER_REVIEW")}>Review</Button>
                    <Button variant="contained" onClick={() => review(x.id, "APPROVED")}>Approve</Button>
                    <Button color="error" onClick={() => review(x.id, "REJECTED")}>Reject</Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}
        {!filtered.length && <Typography color="text.secondary">No leave donation requests found.</Typography>}
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Donate Leave</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Recipient Employee User ID"
              value={form.recipientUserId}
              onChange={(e) => setForm({ ...form, recipientUserId: e.target.value })}
            />
            <TextField
              select
              fullWidth
              label="Leave Type"
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            >
              {leaveTypes.map((type) => (
                <MenuItem key={type.id ?? type.code} value={type.code}>
                  {type.name || type.code}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="Days"
              inputProps={{ min: 1, max: 365 }}
              value={form.days}
              onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={!form.recipientUserId || !form.leaveType || !form.days || !form.reason}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
