import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Divider, GridLegacy, LinearProgress, Stack, Typography } from "@mui/material";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

type Item = { id: string | number; title: string; status: string; date?: string; detail?: string };
const arr = (v: any) => Array.isArray(v) ? v : Array.isArray(v?.content) ? v.content : Array.isArray(v?.data) ? v.data : [];
const dateOf = (x: any) => String(x?.effectiveDate || x?.startDate || x?.joiningDate || x?.createdAt || x?.date || "").slice(0, 10);
const statusOf = (x: any) => String(x?.status || x?.employmentStatus || "ACTIVE").replaceAll("_", " ");

export default function EmployeeLifecyclePage() {
  const role = getCurrentRole();
  const management = role === "ADMIN" || role === "HR" || role === "MANAGER";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({ profile: 0, contracts: 0, probation: 0, separation: 0 });

  const load = async () => {
    setLoading(true); setError("");
    const sources = [
      { key: "profile", path: management ? "/profile-completion" : "/profile-completion/my", title: "Profile completion" },
      { key: "contracts", path: management ? "/employment-contracts" : "/employment-contracts/my", title: "Employment contract" },
      { key: "probation", path: management ? "/probation-reviews" : "/probation-reviews/my", title: "Probation review" },
      { key: "separation", path: management ? "/separations" : "/separations/my", title: "Separation" },
    ];
    const results = await Promise.allSettled(sources.map(s => api.get(s.path)));
    const next: Item[] = [];
    const counts = { profile: 0, contracts: 0, probation: 0, separation: 0 };
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      const rows = arr(r.value.data);
      counts[sources[i].key as keyof typeof counts] = rows.length;
      rows.slice(0, 20).forEach((x: any, j: number) => next.push({
        id: `${sources[i].key}-${x?.id ?? j}`,
        title: String(x?.employeeName || x?.employee?.fullName || sources[i].title),
        status: statusOf(x),
        date: dateOf(x),
        detail: String(x?.targetRole || x?.contractType || x?.reviewType || x?.reason || x?.comment || "")
      }));
    });
    if (!results.some(r => r.status === "fulfilled")) setError("Unable to load lifecycle data from the available HR workflows.");
    setStats(counts); setItems(next.sort((a, b) => (b.date || "").localeCompare(a.date || ""))); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pending = useMemo(() => items.filter(x => /PENDING|REVIEW|SUBMITTED|UNDER|ACTION|PROBATION/.test(x.status)).length, [items]);
  const active = useMemo(() => items.filter(x => /ACTIVE|APPROVED|CONFIRMED|COMPLETED/.test(x.status)).length, [items]);

  if (loading) return <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}><CircularProgress /><Typography mt={2} color="text.secondary">Loading employee lifecycle…</Typography></Stack>;

  return <Box>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={2} mb={3}>
      <Box><Stack direction="row" spacing={1} alignItems="center"><TimelineRoundedIcon /><Typography variant="h4" fontWeight={800}>Employee Lifecycle</Typography></Stack><Typography color="text.secondary">A single view of key employee journey milestones, reviews and employment events.</Typography></Box>
      <Chip label={management ? "Management view" : "My lifecycle"} />
    </Stack>
    {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
    <GridLegacy container spacing={2} mb={3}>
      {[["Profile Records", stats.profile, CheckCircleRoundedIcon], ["Contracts", stats.contracts, TimelineRoundedIcon], ["Probation Reviews", stats.probation, PendingActionsRoundedIcon], ["Separation Records", stats.separation, WarningAmberRoundedIcon]].map(([label, value, Icon]: any) => <GridLegacy item xs={12} sm={6} md={3} key={label as string}><Card><CardContent><Stack direction="row" justifyContent="space-between"><Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4" fontWeight={800}>{value}</Typography></Box><Icon /></Stack></CardContent></Card></GridLegacy>)}
    </GridLegacy>
    <GridLegacy container spacing={2}>
      <GridLegacy item xs={12} md={4}><Card><CardContent><Typography variant="h6" fontWeight={800}>Lifecycle health</Typography><Typography variant="body2" color="text.secondary" mb={2}>Based on currently returned workflow records.</Typography><Stack spacing={2}><Box><Stack direction="row" justifyContent="space-between"><Typography variant="body2">Active / completed</Typography><Typography variant="body2">{active}</Typography></Stack><LinearProgress variant="determinate" value={items.length ? Math.min(100, active / items.length * 100) : 0} sx={{ mt: .5 }} /></Box><Box><Stack direction="row" justifyContent="space-between"><Typography variant="body2">Needs attention</Typography><Typography variant="body2">{pending}</Typography></Stack><LinearProgress variant="determinate" value={items.length ? Math.min(100, pending / items.length * 100) : 0} sx={{ mt: .5 }} /></Box></Stack></CardContent></Card></GridLegacy>
      <GridLegacy item xs={12} md={8}><Card><CardContent><Typography variant="h6" fontWeight={800} mb={1}>Recent lifecycle events</Typography><Divider />{items.length ? <Stack divider={<Divider />} >{items.slice(0, 12).map(x => <Box key={x.id} py={1.5}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}><Box><Typography fontWeight={700}>{x.title}</Typography><Typography variant="body2" color="text.secondary">{x.date || "Date not available"}{x.detail ? ` • ${x.detail}` : ""}</Typography></Box><Chip size="small" label={x.status} /></Stack></Box>)}</Stack> : <Typography color="text.secondary" py={3}>No lifecycle records are currently available.</Typography>}</CardContent></Card></GridLegacy>
    </GridLegacy>
  </Box>;
}
