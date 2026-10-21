import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { api } from "../services/api";
import type { RootState } from "../store";
import { useSelector } from "react-redux";

type Review = {
  id: number;
  employeeName: string;
  userId: string;
  cycle: string;
  goal: string;
  selfComment?: string;
  managerComment?: string;
  rating?: number;
  status: string;
  dueDate?: string;
};

const statuses = ["ALL", "DRAFT", "SUBMITTED", "REVIEWED", "ACKNOWLEDGED", "REJECTED"];

/**
 * The HRMS backend has had several response shapes during the V8 workflow
 * work. Always reduce the response to the actual performance-review array
 * before storing it in React state. This prevents `.filter is not a function`
 * and, more importantly, prevents a valid goal from disappearing just because
 * the API response is wrapped one level deeper.
 */
function extractReviewRecords(payload: unknown): unknown[] {
  if (typeof payload === "string") {
    try {
      return extractReviewRecords(JSON.parse(payload));
    } catch {
      return [];
    }
  }

  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const value = payload as Record<string, unknown>;
  const priorityKeys = [
    "data",
    "records",
    "items",
    "content",
    "reviews",
    "performanceReviews",
    "performance",
    "results",
    "result",
  ];

  for (const key of priorityKeys) {
    if (key in value) {
      const records = extractReviewRecords(value[key]);
      if (records.length) return records;
    }
  }

  // Some wrappers put the useful object inside another property.
  for (const child of Object.values(value)) {
    const records = extractReviewRecords(child);
    if (records.length && records.some((x) => isReviewLike(x))) return records;
  }

  // A single review object is also a valid response from POST/PUT actions.
  if (isReviewLike(value)) return [value];
  return [];
}

function isReviewLike(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return (
    "goal" in x ||
    ("status" in x && ("cycle" in x || "userId" in x || "employeeName" in x))
  );
}

function normalizeReview(value: unknown, index: number): Review | null {
  if (!isReviewLike(value)) return null;
  const x = value as Record<string, any>;
  const employee = x.employee && typeof x.employee === "object" ? x.employee : {};
  const employeeProfile = employee.employeeProfile && typeof employee.employeeProfile === "object"
    ? employee.employeeProfile
    : {};

  const id = Number(x.id ?? x.reviewId ?? index + 1);
  const goal = String(x.goal ?? x.objective ?? "").trim();
  if (!goal) return null;

  return {
    id: Number.isFinite(id) ? id : index + 1,
    employeeName: String(x.employeeName ?? employee.fullName ?? employee.name ?? "").trim(),
    userId: String(x.userId ?? employeeProfile.userId ?? "").trim(),
    cycle: String(x.cycle ?? x.reviewCycle ?? "").trim(),
    goal,
    selfComment: x.selfComment == null ? undefined : String(x.selfComment),
    managerComment: x.managerComment == null ? undefined : String(x.managerComment),
    rating: x.rating == null ? undefined : Number(x.rating),
    status: String(x.status ?? "DRAFT").toUpperCase(),
    dueDate: x.dueDate == null ? undefined : String(x.dueDate),
  };
}

function normalizeReviews(payload: unknown): Review[] {
  return extractReviewRecords(payload)
    .map((x, index) => normalizeReview(x, index))
    .filter((x): x is Review => Boolean(x));
}

export default function PerformancePage() {
  const session = useSelector((s: RootState) => s.auth.session);
  const role = String(session?.role || "EMPLOYEE").replace(/^ROLE_/, "").toUpperCase();
  const management = role === "ADMIN" || role === "HR";
  const manager = role === "MANAGER";

  const [items, setItems] = useState<Review[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState<Review | null>(null);
  const [form, setForm] = useState({
    cycle: "2026 Annual Review",
    goal: "",
    dueDate: "",
  });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      // Use role-specific endpoints so employee self-service and manager team
      // review never depend on a generic response shape.
      const endpoint = management ? "/performance" : manager ? "/performance/team" : "/performance/my";
      const response = await api.get(endpoint);
      const records = normalizeReviews(response.data);
      setItems(records);
      setError("");
      return records;
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load performance data.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [role]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((x) => {
      const statusMatch = filter === "ALL" || String(x.status).toUpperCase() === filter;
      const text = `${x.employeeName} ${x.userId} ${x.goal} ${x.cycle}`.toLowerCase();
      return statusMatch && (!q || text.includes(q));
    });
  }, [items, filter, search]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { ALL: items.length };
    for (const status of statuses.slice(1)) {
      result[status] = items.filter((x) => String(x.status).toUpperCase() === status).length;
    }
    return result;
  }, [items]);

  const save = async () => {
    const goal = form.goal.trim();
    if (!goal || saving) return;

    setSaving(true);
    setError("");
    try {
      const response = await api.post("/performance", {
        cycle: form.cycle,
        goal,
        dueDate: form.dueDate || null,
      });

      // Immediately render the server-created goal. This keeps the UX correct
      // even if the follow-up GET is served from a stale cache or old backend.
      const created = normalizeReviews(response.data)[0];
      if (created) {
        setItems((current) => [created, ...current.filter((x) => x.id !== created.id)]);
      }

      setOpen(false);
      setForm({ cycle: "2026 Annual Review", goal: "", dueDate: "" });

      const refreshed = await load();
      if (!refreshed.length && created) {
        setItems((current) => [created, ...current.filter((x) => x.id !== created.id)]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to save goal.");
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<any>) => {
    try {
      await fn();
      await load();
      setReviewOpen(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Action failed.");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>Performance &amp; Goals</Typography>
          <Typography color="text.secondary">
            Set goals, submit self-review, and complete manager evaluations.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </Button>
          {!management && !manager && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setOpen(true)}
            >
              Add Goal
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        {statuses.map((status) => (
          <Chip
            key={status}
            label={`${status} ${counts[status] ?? 0}`}
            variant={filter === status ? "filled" : "outlined"}
            onClick={() => setFilter(status)}
          />
        ))}
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder={management || manager ? "Search employee, user ID or goal" : "Search goals"}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Stack spacing={2}>
        {visible.map((x) => (
          <Box
            key={`${x.id}-${x.status}`}
            sx={{
              p: 2.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 3,
              background: "background.paper",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
                  <Typography fontWeight={800}>{x.goal}</Typography>
                  <Chip size="small" label={x.status} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {x.employeeName || x.userId || "Employee"}
                  {x.userId ? ` · ${x.userId}` : ""}
                  {x.cycle ? ` · ${x.cycle}` : ""}
                  {x.dueDate ? ` · Due ${x.dueDate}` : ""}
                </Typography>
                {x.selfComment && (
                  <Typography sx={{ mt: 1 }}><b>Self:</b> {x.selfComment}</Typography>
                )}
                {x.managerComment && (
                  <Typography sx={{ mt: 1 }}><b>Manager:</b> {x.managerComment}</Typography>
                )}
                {x.rating != null && Number.isFinite(x.rating) && (
                  <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                    <Rating value={x.rating} readOnly size="small" />
                    <Typography variant="caption">{x.rating}/5</Typography>
                  </Stack>
                )}
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                {x.status === "DRAFT" && !management && !manager && x.userId === session?.userId && (
                  <Button size="small" onClick={() => void act(() => api.post(`/performance/${x.id}/submit`))}>
                    Submit
                  </Button>
                )}
                {x.status === "REVIEWED" && x.userId === session?.userId && (
                  <Button
                    size="small"
                    startIcon={<CheckCircleRoundedIcon />}
                    onClick={() => void act(() => api.post(`/performance/${x.id}/acknowledge`))}
                  >
                    Acknowledge
                  </Button>
                )}
                {manager && x.status === "SUBMITTED" && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setReviewOpen(x);
                      setRating(x.rating || 0);
                      setComment(x.managerComment || "");
                    }}
                  >
                    Review
                  </Button>
                )}
                {(x.status === "DRAFT" || x.status === "REJECTED") &&
                  (x.userId === session?.userId || management) && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => void act(() => api.delete(`/performance/${x.id}`))}
                    >
                      Delete
                    </Button>
                  )}
              </Stack>
            </Stack>
          </Box>
        ))}

        {!visible.length && (
          <Typography color="text.secondary" sx={{ py: 5, textAlign: "center" }}>
            {loading ? "Loading performance records..." : "No performance records found."}
          </Typography>
        )}
      </Stack>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Performance Goal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Review Cycle"
              value={form.cycle}
              onChange={(e) => setForm({ ...form, cycle: e.target.value })}
            >
              <MenuItem value="2026 Annual Review">2026 Annual Review</MenuItem>
              <MenuItem value="2026 Mid-Year Review">2026 Mid-Year Review</MenuItem>
              <MenuItem value="Q1 2026">Q1 2026</MenuItem>
              <MenuItem value="Q2 2026">Q2 2026</MenuItem>
              <MenuItem value="Q3 2026">Q3 2026</MenuItem>
              <MenuItem value="Q4 2026">Q4 2026</MenuItem>
            </TextField>
            <TextField
              required
              multiline
              minRows={3}
              label="Goal / Objective"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            />
            <TextField
              type="date"
              label="Due Date"
              InputLabelProps={{ shrink: true }}
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()} disabled={!form.goal.trim() || saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!reviewOpen} onClose={() => setReviewOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>Manager Review</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{reviewOpen?.goal}</Typography>
          <Stack spacing={2}>
            <Rating value={rating} onChange={(_, value) => setRating(value || 0)} size="large" />
            <TextField
              multiline
              minRows={4}
              label="Manager Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!rating}
            onClick={() => reviewOpen && void act(() => api.post(`/performance/${reviewOpen.id}/review`, {
              rating,
              managerComment: comment,
            }))}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
