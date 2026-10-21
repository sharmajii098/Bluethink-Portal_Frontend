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
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

const stages = ["APPLIED", "SCREENING", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"];
const openingStatuses = ["OPEN", "PAUSED", "CLOSED"];
const onboardingCategories = ["HR", "IT", "DOCUMENTS", "MANAGER", "TRAINING", "GENERAL"];

const emptyJob = {
  title: "",
  department: "",
  location: "",
  employmentType: "FULL_TIME",
  experience: "",
  description: "",
  openingDate: new Date().toISOString().slice(0, 10),
  closingDate: "",
  status: "OPEN",
};

const emptyCandidate = {
  fullName: "",
  email: "",
  phone: "",
  currentCompany: "",
  experience: "",
  resumeUrl: "",
  stage: "APPLIED",
  source: "DIRECT",
  dob: "",
  interviewDate: "",
  interviewer: "",
  interviewScore: "",
  notes: "",
  offerDate: "",
  expectedJoiningDate: "",
  employeeId: null as number | null,
  jobOpening: null as any,
};

const emptyTask = {
  employeeId: "",
  employeeName: "",
  title: "",
  description: "",
  category: "GENERAL",
  dueDate: "",
  status: "PENDING",
  assignedTo: "",
};

const stageColor = (stage: string): "default" | "primary" | "success" | "error" | "warning" => {
  if (stage === "HIRED") return "success";
  if (stage === "REJECTED") return "error";
  if (stage === "OFFERED") return "warning";
  if (stage === "INTERVIEW") return "primary";
  return "default";
};

function addDays(dateText: string, days: number) {
  const base = dateText ? new Date(`${dateText}T00:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function RecruitmentPage() {
  const role = getCurrentRole();
  const mgmt = role === "ADMIN" || role === "HR";

  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [job, setJob] = useState<any>({ ...emptyJob });
  const [cand, setCand] = useState<any>({ ...emptyCandidate });
  const [task, setTask] = useState<any>({ ...emptyTask });
  const [jobOpen, setJobOpen] = useState(false);
  const [candOpen, setCandOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<number | null>(null);
  const [editingCand, setEditingCand] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [pipelineStage, setPipelineStage] = useState("ALL");
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalMode, setInternalMode] = useState<"APPLY" | "REFER">("APPLY");
  const [internalForm, setInternalForm] = useState<any>({ fullName: "", email: "", phone: "", experience: "", resumeUrl: "", dob: "", notes: "", jobOpening: null });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (mgmt) {
        const [j, c, e, t] = await Promise.all([
          api.get("/recruitment/openings/all"),
          api.get("/recruitment/candidates"),
          api.get("/employees"),
          api.get("/recruitment/onboarding/list/manage"),
        ]);
        setJobs(Array.isArray(j.data) ? j.data : []);
        setCandidates(Array.isArray(c.data) ? c.data : []);
        setEmployees(Array.isArray(e.data) ? e.data : []);
        setTasks(Array.isArray(t.data) ? t.data : []);
      } else {
        const requests: Promise<any>[] = [api.get("/recruitment/openings"), api.get("/recruitment/onboarding/list/my")];
        if (role === "MANAGER") {
          requests.push(api.get("/recruitment/candidates/relevant"));
          requests.push(api.get("/recruitment/onboarding/list/team"));
        }
        const results = await Promise.all(requests);
        setJobs(Array.isArray(results[0].data) ? results[0].data : []);
        const ownTasks = Array.isArray(results[1].data) ? results[1].data : [];
        const teamTasks = role === "MANAGER" && Array.isArray(results[3]?.data) ? results[3].data : [];
        setTasks(role === "MANAGER" ? [...teamTasks, ...ownTasks.filter((t: any) => !teamTasks.some((x: any) => x.id === t.id))] : ownTasks);
        setCandidates(role === "MANAGER" && Array.isArray(results[2]?.data) ? results[2].data : []);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to load recruitment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      const matchesSearch = !q || `${c.fullName} ${c.email} ${c.stage} ${c.jobOpening?.title || ""}`.toLowerCase().includes(q);
      const matchesStage = pipelineStage === "ALL" || c.stage === pipelineStage;
      return matchesSearch && matchesStage;
    });
  }, [candidates, search, pipelineStage]);

  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: candidates.length };
    stages.forEach((stage) => { counts[stage] = candidates.filter((c) => c.stage === stage).length; });
    return counts;
  }, [candidates]);

  const onboardingGroups = useMemo(() => {
    const map = new Map<number, { employeeId: number; name: string; tasks: any[] }>();
    tasks.forEach((t) => {
      const id = Number(t.employeeId);
      if (!id) return;
      if (!map.has(id)) map.set(id, { employeeId: id, name: t.employeeName || `Employee #${id}`, tasks: [] });
      map.get(id)!.tasks.push(t);
    });
    return Array.from(map.values()).map((g) => {
      const completed = g.tasks.filter((t) => t.status === "COMPLETED").length;
      return { ...g, completed, total: g.tasks.length, progress: g.tasks.length ? Math.round((completed / g.tasks.length) * 100) : 0 };
    });
  }, [tasks]);

  const openInternalApplication = (opening: any) => {
    setInternalMode("APPLY");
    setInternalForm({ fullName: "", email: "", phone: "", experience: "", resumeUrl: "", dob: "", notes: "", jobOpening: opening });
    setInternalOpen(true);
  };

  const openReferral = (opening: any) => {
    setInternalMode("REFER");
    setInternalForm({ fullName: "", email: "", phone: "", experience: "", resumeUrl: "", dob: "", notes: "", jobOpening: opening });
    setInternalOpen(true);
  };

  const submitInternal = async () => {
    try {
      setError(""); setSuccess("");
      const payload = { ...internalForm, jobOpening: internalForm.jobOpening?.id ? { id: internalForm.jobOpening.id } : null };
      const response = await api.post(internalMode === "APPLY" ? "/recruitment/candidates/internal/apply" : "/recruitment/candidates/internal/refer", payload);
      setInternalOpen(false);
      setSuccess(internalMode === "APPLY" ? "Your application has been submitted." : `Referral for ${response.data?.fullName || "candidate"} has been submitted.`);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to submit the request.");
    }
  };

  const saveJob = async () => {
    try {
      if (editingJob) await api.put(`/recruitment/openings/${editingJob}`, job);
      else await api.post("/recruitment/openings", job);
      setJobOpen(false); setEditingJob(null); setJob({ ...emptyJob }); await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to save job opening.");
    }
  };

  const createDefaultOnboarding = async (employeeId: number, employeeName: string, joiningDate: string) => {
    const base = joiningDate || new Date().toISOString().slice(0, 10);
    const defaults = [
      ["Submit identity and address documents", "Upload PAN, Aadhaar/address proof and required employee documents.", "DOCUMENTS", 0, "HR"],
      ["Complete HR induction", "Attend HR orientation and acknowledge company policies.", "HR", 1, "HR"],
      ["IT account and access setup", "Confirm email, application access and required system permissions.", "IT", 1, "IT Support"],
      ["Laptop / asset handover", "Complete company asset handover and acknowledgement.", "IT", 2, "IT Support"],
      ["Manager introduction", "Meet the reporting manager and review the first-week plan.", "MANAGER", 3, "Reporting Manager"],
      ["Security and compliance training", "Complete mandatory security, privacy and compliance training.", "TRAINING", 5, "HR"],
      ["30-day onboarding review", "Review onboarding progress and collect initial feedback.", "MANAGER", 30, "Reporting Manager"],
    ];
    await Promise.all(defaults.map(([title, description, category, offset, assignedTo]) =>
      api.post("/recruitment/onboarding", {
        employeeId,
        employeeName,
        title,
        description,
        category,
        dueDate: addDays(base, Number(offset)),
        status: "PENDING",
        assignedTo,
      })
    ));
  };

  const saveCand = async () => {
    let savedCandidate: any = null;
    try {
      setError("");
      setSuccess("");
      const body: any = {
        ...cand,
        interviewScore: cand.interviewScore ? Number(cand.interviewScore) : null,
        jobOpening: cand.jobOpening?.id ? { id: cand.jobOpening.id } : null,
        employeeId: cand.employeeId || null,
      };

      if (!body.jobOpening?.id) throw new Error("Select a job opening for the candidate.");
      if (body.stage === "HIRED" && !body.employeeId && !body.dob) {
        throw new Error("Date of birth is required before creating the employee account.");
      }

      // Save the candidate first. If employee creation fails, the candidate remains available for correction.
      if (editingCand) savedCandidate = (await api.put(`/recruitment/candidates/${editingCand}`, body)).data;
      else savedCandidate = (await api.post("/recruitment/candidates", body)).data;

      if (savedCandidate.stage === "HIRED" && !savedCandidate.employeeId) {
        const opening = savedCandidate.jobOpening || cand.jobOpening;
        const employeeResponse = await api.post("/employees", {
          fullName: savedCandidate.fullName,
          email: savedCandidate.email,
          phoneNumber: savedCandidate.phone || "",
          role: "EMPLOYEE",
          department: opening?.department || "",
          designation: opening?.title || "Employee",
          dob: savedCandidate.dob,
          joiningDate: savedCandidate.expectedJoiningDate || new Date().toISOString().slice(0, 10),
          status: "ACTIVE",
          workMode: "WFO",
        });
        const employeeId = Number(employeeResponse.data?.employeeId || employeeResponse.data?.employee?.id || employeeResponse.data?.id);
        if (!employeeId) throw new Error("Employee was created but the employee ID was not returned.");

        const linked = await api.put(`/recruitment/candidates/${savedCandidate.id}`, {
          ...body,
          stage: "HIRED",
          employeeId,
          jobOpening: opening?.id ? { id: opening.id } : null,
        });
        const employeeName = linked.data?.fullName || savedCandidate.fullName;
        await createDefaultOnboarding(employeeId, employeeName, savedCandidate.expectedJoiningDate);
        setSuccess(`Candidate hired. Employee ${employeeResponse.data?.userId || employeeId} created and the onboarding checklist was generated.`);
      } else if (savedCandidate.stage === "HIRED" && savedCandidate.employeeId) {
        setSuccess("Candidate is already linked to an employee.");
      } else {
        setSuccess("Candidate saved successfully.");
      }

      setCandOpen(false); setEditingCand(null); setCand({ ...emptyCandidate }); await load();
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Unable to save candidate.");
    }
  };

  const changeCandidateStage = async (candidate: any, stage: string) => {
    try {
      setError("");
      if (stage === "HIRED" && !candidate.employeeId) {
        setCand({ ...candidate, dob: candidate.dob || "", stage });
        setEditingCand(candidate.id);
        setCandOpen(true);
        setSuccess("Complete the candidate details, including date of birth, then save to create the employee and onboarding checklist.");
        return;
      }
      await api.put(`/recruitment/candidates/${candidate.id}`, {
        ...candidate,
        stage,
        jobOpening: candidate.jobOpening?.id ? { id: candidate.jobOpening.id } : null,
      });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to change candidate stage.");
    }
  };

  const saveTask = async () => {
    try {
      const emp = employees.find((e) => String(e.employeeId || e.id) === String(task.employeeId));
      const body = { ...task, employeeId: Number(task.employeeId), employeeName: emp?.fullName || task.employeeName };
      if (editingTask) await api.put(`/recruitment/onboarding/${editingTask}`, body);
      else await api.post("/recruitment/onboarding", body);
      setTaskOpen(false); setEditingTask(null); setTask({ ...emptyTask }); await load();
    } catch (e: any) {
      setError(e.response?.data?.message || "Unable to save onboarding task.");
    }
  };

  const remove = async (type: string, id: number) => {
    if (!window.confirm("Delete this record?")) return;
    try { await api.delete(`/recruitment/${type}/${id}`); await load(); }
    catch (e: any) { setError(e.response?.data?.message || "Delete failed."); }
  };

  const openTask = () => { setTask({ ...emptyTask }); setEditingTask(null); setTaskOpen(true); };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Recruitment & Onboarding</Typography>
          <Typography color="text.secondary">Manage hiring pipelines, offers, employee conversion and onboarding checklists.</Typography>
        </Box>
        {mgmt && <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button startIcon={<AddRoundedIcon />} variant="contained" onClick={() => { setJob({ ...emptyJob }); setEditingJob(null); setJobOpen(true); }}>Job Opening</Button>
          <Button startIcon={<AddRoundedIcon />} variant="outlined" onClick={() => { setCand({ ...emptyCandidate }); setEditingCand(null); setCandOpen(true); }}>Candidate</Button>
          <Button startIcon={<AddRoundedIcon />} variant="outlined" onClick={openTask}>Onboarding Task</Button>
        </Stack>}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      {mgmt ? <>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            ["Open Positions", jobs.filter((j) => j.status === "OPEN").length, <WorkOutlineRoundedIcon />],
            ["Candidates", candidates.length, <GroupsRoundedIcon />],
            ["Hired", pipelineCounts.HIRED || 0, <HowToRegRoundedIcon />],
            ["Onboarding", onboardingGroups.length, <RocketLaunchRoundedIcon />],
          ].map(([label, value, icon]) => <Grid key={String(label)} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, height: "100%" }}><Stack direction="row" spacing={1.5} alignItems="center"><Box sx={{ p: 1, borderRadius: 2, bgcolor: "action.hover", display: "flex" }}>{icon}</Box><Box><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={800}>{value}</Typography></Box></Stack></Paper>
          </Grid>)}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label={`Job Openings (${jobs.length})`} />
          <Tab label={`Candidate Pipeline (${candidates.length})`} />
          <Tab label={`Onboarding (${onboardingGroups.length})`} />
        </Tabs>

        {tab === 0 && <Grid container spacing={2}>
          {jobs.map((j) => <Grid size={{ xs: 12, md: 6 }} key={j.id}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography variant="h6" fontWeight={700}>{j.title}</Typography><Typography color="text.secondary">{j.department || "All departments"} · {j.location || "Remote"} · {j.employmentType}</Typography></Box><Chip label={j.status} color={j.status === "OPEN" ? "success" : "default"} /></Stack>
              <Typography sx={{ mt: 1 }}>{j.description || "No description"}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Experience: {j.experience || "Not specified"} · Closing: {j.closingDate || "Open-ended"}</Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}><Chip size="small" label={`${candidates.filter((c) => c.jobOpening?.id === j.id).length} candidate(s)`} /><Stack direction="row"><IconButton onClick={() => { setJob({ ...j, openingDate: j.openingDate || "", closingDate: j.closingDate || "" }); setEditingJob(j.id); setJobOpen(true); }}><EditRoundedIcon /></IconButton><IconButton onClick={() => remove("openings", j.id)}><DeleteRoundedIcon /></IconButton></Stack></Stack>
            </Paper>
          </Grid>)}
          {!loading && !jobs.length && <Grid size={{ xs: 12 }}><Alert severity="info">No job openings found. Create your first position to start the hiring pipeline.</Alert></Grid>}
        </Grid>}

        {tab === 1 && <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
              <TextField fullWidth size="small" placeholder="Search candidates, email, position..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <TextField select size="small" label="Stage" value={pipelineStage} onChange={(e) => setPipelineStage(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="ALL">All stages</MenuItem>{stages.map((s) => <MenuItem key={s} value={s}>{s} ({pipelineCounts[s] || 0})</MenuItem>)}</TextField>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: "auto", pb: 0.5 }}>
              {stages.map((s, index) => <Box key={s} sx={{ minWidth: 145, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}><Typography variant="caption" color="text.secondary">{index + 1}. {s}</Typography><Typography variant="h6" fontWeight={800}>{pipelineCounts[s] || 0}</Typography></Box>)}
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1.5 }}><Typography variant="body2" color="text.secondary">Workflow</Typography>{stages.slice(0, 5).map((s, i) => <Box key={s} sx={{ display: "flex", alignItems: "center" }}><Chip size="small" label={s} color={stageColor(s)} />{i < 4 && <ArrowForwardRoundedIcon fontSize="small" sx={{ mx: 0.3, color: "text.disabled" }} />}</Box>)}</Stack>
          </Paper>
          <Grid container spacing={2}>
            {filteredCandidates.map((c) => <Grid size={{ xs: 12, md: 6 }} key={c.id}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography variant="h6" fontWeight={700}>{c.fullName}</Typography><Typography color="text.secondary">{c.email} · {c.phone || "No phone"}</Typography></Box><Chip label={c.stage} color={stageColor(c.stage)} /></Stack>
                <Typography sx={{ mt: 1 }}>Position: {c.jobOpening?.title || "—"}</Typography>
                <Typography variant="body2" color="text.secondary">Experience: {c.experience || "—"} · Source: {c.source || "—"}</Typography>
                {c.employeeId && <Chip size="small" icon={<CheckCircleRoundedIcon />} label={`Employee #${c.employeeId}`} color="success" sx={{ mt: 1 }} />}
                <Divider sx={{ my: 1.5 }} />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                  <TextField select size="small" label="Move stage" value={c.stage || "APPLIED"} onChange={(e) => changeCandidateStage(c, e.target.value)} sx={{ minWidth: 160 }}>
                    {stages.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                  <Box sx={{ flex: 1 }} />
                  <IconButton onClick={() => { setCand({ ...c, jobOpening: c.jobOpening || null, interviewScore: c.interviewScore || "", dob: c.dob || "" }); setEditingCand(c.id); setCandOpen(true); }}><EditRoundedIcon /></IconButton>
                  <IconButton onClick={() => remove("candidates", c.id)}><DeleteRoundedIcon /></IconButton>
                </Stack>
              </Paper>
            </Grid>)}
            {!loading && !filteredCandidates.length && <Grid size={{ xs: 12 }}><Alert severity="info">No candidates match the selected stage/search.</Alert></Grid>}
          </Grid>
        </Box>}

        {tab === 2 && <Box>
          <Paper sx={{ p: 2, mb: 2 }}><Typography variant="h6" fontWeight={800}>Employee Onboarding Progress</Typography><Typography color="text.secondary">Every hired candidate can automatically receive the standard onboarding checklist. HR can add or edit individual tasks below.</Typography></Paper>
          <Grid container spacing={2}>
            {onboardingGroups.map((g) => <Grid size={{ xs: 12, md: 6 }} key={g.employeeId}>
              <Paper sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6" fontWeight={700}>{g.name}</Typography><Typography variant="body2" color="text.secondary">Employee #{g.employeeId}</Typography></Box><Chip label={`${g.progress}%`} color={g.progress === 100 ? "success" : "primary"} /></Stack>
                <LinearProgress variant="determinate" value={g.progress} sx={{ my: 1.5, height: 7, borderRadius: 4 }} />
                <Typography variant="body2" color="text.secondary">{g.completed} of {g.total} tasks completed</Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>{g.tasks.map((t) => <Stack key={t.id} direction="row" alignItems="center" justifyContent="space-between" gap={1}><Box><Typography variant="body2" fontWeight={600}>{t.title}</Typography><Typography variant="caption" color="text.secondary">{t.category} · Due {t.dueDate || "—"} · {t.assignedTo || "Unassigned"}</Typography></Box><Stack direction="row" alignItems="center" spacing={0.5}><Chip size="small" label={t.status} color={t.status === "COMPLETED" ? "success" : t.status === "IN_PROGRESS" ? "warning" : "default"} /><IconButton size="small" onClick={() => { setTask({ ...t, employeeId: String(t.employeeId), status: t.status || "PENDING" }); setEditingTask(t.id); setTaskOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton><IconButton size="small" onClick={() => remove("onboarding", t.id)}><DeleteRoundedIcon fontSize="small" /></IconButton></Stack></Stack>)}</Stack>
              </Paper>
            </Grid>)}
            {!loading && !onboardingGroups.length && <Grid size={{ xs: 12 }}><Alert severity="info">No onboarding tasks yet. Hiring a candidate creates the standard checklist automatically.</Alert></Grid>}
          </Grid>
        </Box>}
      </> : <>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>{role === "MANAGER" ? "Department Recruitment & Onboarding" : "Internal Job Openings"}</Typography>
          <Typography color="text.secondary">{role === "MANAGER" ? "View published openings for your department, refer candidates and review relevant candidates." : "Browse published internal opportunities, apply for a role or refer someone."}</Typography>
        </Paper>

        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Published Job Openings</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {jobs.map((j) => <Grid size={{ xs: 12, md: 6 }} key={j.id}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography variant="h6" fontWeight={700}>{j.title}</Typography><Typography color="text.secondary">{j.department || "All departments"} · {j.location || "Remote"} · {j.employmentType}</Typography></Box><Chip label="OPEN" color="success" size="small" /></Stack>
              <Typography sx={{ mt: 1 }}>{j.description || "No description"}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Experience: {j.experience || "Not specified"} · Apply by: {j.closingDate || "Open-ended"}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" size="small" onClick={() => openInternalApplication(j)}>Apply</Button>
                <Button variant="outlined" size="small" onClick={() => openReferral(j)}>Refer Someone</Button>
              </Stack>
            </Paper>
          </Grid>)}
          {!loading && !jobs.length && <Grid size={{ xs: 12 }}><Alert severity="info">No published job openings are available for you right now.</Alert></Grid>}
        </Grid>

        {role === "MANAGER" && <><Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Relevant Candidates</Typography><Grid container spacing={2} sx={{ mb: 3 }}>
          {candidates.map((c) => <Grid size={{ xs: 12, md: 6 }} key={c.id}><Paper sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6">{c.fullName}</Typography><Typography color="text.secondary">{c.jobOpening?.title || "—"} · {c.experience || "Experience not specified"}</Typography></Box><Chip label={c.stage} color={stageColor(c.stage)} size="small" /></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Source: {c.source || "—"}</Typography></Paper></Grid>)}
          {!loading && !candidates.length && <Grid size={{ xs: 12 }}><Alert severity="info">No candidates are currently assigned to your department openings.</Alert></Grid>}
        </Grid></>}

        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>{role === "MANAGER" ? "Team Onboarding Progress" : "My Onboarding"}</Typography>
        {role === "MANAGER" ? <Grid container spacing={2}>
          {onboardingGroups.map((g) => <Grid size={{ xs: 12, md: 6 }} key={g.employeeId}><Paper sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between"><Box><Typography variant="h6" fontWeight={700}>{g.name}</Typography><Typography variant="body2" color="text.secondary">Employee #{g.employeeId}</Typography></Box><Chip label={`${g.progress}%`} color={g.progress === 100 ? "success" : "primary"} /></Stack><LinearProgress variant="determinate" value={g.progress} sx={{ my: 1.5, height: 7, borderRadius: 4 }} /><Typography variant="body2" color="text.secondary">{g.completed} of {g.total} tasks completed</Typography></Paper></Grid>)}
          {!loading && !onboardingGroups.length && <Grid size={{ xs: 12 }}><Alert severity="info">No onboarding tasks are assigned to your team yet.</Alert></Grid>}
        </Grid> : <Grid container spacing={2}>
          {tasks.map((t) => <Grid size={{ xs: 12, md: 6 }} key={t.id}><Paper sx={{ p: 2 }}><Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography variant="h6">{t.title}</Typography><Typography color="text.secondary">{t.category} · Due {t.dueDate || "No due date"}</Typography></Box><Chip label={t.status} color={t.status === "COMPLETED" ? "success" : "warning"} /></Stack><Typography sx={{ my: 1 }}>{t.description || "No additional instructions."}</Typography>{t.status !== "COMPLETED" && <Button startIcon={<CheckCircleRoundedIcon />} variant="contained" size="small" onClick={async () => { try { await api.post(`/recruitment/onboarding/${t.id}/complete`); await load(); } catch (e: any) { setError(e.response?.data?.message || "Unable to complete task."); } }}>Mark Complete</Button>}</Paper></Grid>)}
          {!loading && !tasks.length && <Grid size={{ xs: 12 }}><Alert severity="info">No onboarding tasks have been assigned yet.</Alert></Grid>}
        </Grid>}
      </>}

      {loading && <Typography color="text.secondary" sx={{ mt: 2 }}>Loading...</Typography>}

      <Dialog open={internalOpen} onClose={() => setInternalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{internalMode === "APPLY" ? "Apply for Job Opening" : "Refer a Candidate"}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>Job: <strong>{internalForm.jobOpening?.title || "—"}</strong></Alert>
          <Grid container spacing={2} sx={{ mt: 0.2 }}>
            {internalMode === "REFER" && <>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth required label="Candidate full name" value={internalForm.fullName} onChange={(e) => setInternalForm({ ...internalForm, fullName: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth required type="email" label="Candidate email" value={internalForm.email} onChange={(e) => setInternalForm({ ...internalForm, email: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Phone" value={internalForm.phone} onChange={(e) => setInternalForm({ ...internalForm, phone: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Date of birth" InputLabelProps={{ shrink: true }} value={internalForm.dob} onChange={(e) => setInternalForm({ ...internalForm, dob: e.target.value })} /></Grid>
            </>}
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Experience" value={internalForm.experience} onChange={(e) => setInternalForm({ ...internalForm, experience: e.target.value })} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Resume URL" value={internalForm.resumeUrl} onChange={(e) => setInternalForm({ ...internalForm, resumeUrl: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Notes" value={internalForm.notes} onChange={(e) => setInternalForm({ ...internalForm, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setInternalOpen(false)}>Cancel</Button><Button variant="contained" onClick={submitInternal}>{internalMode === "APPLY" ? "Submit Application" : "Submit Referral"}</Button></DialogActions>
      </Dialog>

      <Dialog open={jobOpen} onClose={() => setJobOpen(false)} fullWidth maxWidth="md"><DialogTitle>{editingJob ? "Edit Job Opening" : "Create Job Opening"}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: 0.2 }}>
        {[['title','Job title'],['department','Department'],['location','Location'],['employmentType','Employment type'],['experience','Experience']].map(([k,l]) => <Grid size={{ xs: 12, md: 6 }} key={k}><TextField fullWidth label={l} value={job[k]} onChange={(e) => setJob({ ...job, [k]: e.target.value })} /></Grid>)}
        <Grid size={{ xs: 12 }}><TextField select fullWidth label="Status" value={job.status} onChange={(e) => setJob({ ...job, status: e.target.value })}>{openingStatuses.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Opening date" InputLabelProps={{ shrink: true }} value={job.openingDate} onChange={(e) => setJob({ ...job, openingDate: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Closing date" InputLabelProps={{ shrink: true }} value={job.closingDate} onChange={(e) => setJob({ ...job, closingDate: e.target.value })} /></Grid>
        <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={4} label="Description" value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} /></Grid>
      </Grid></DialogContent><DialogActions><Button onClick={() => setJobOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveJob}>Save</Button></DialogActions></Dialog>

      <Dialog open={candOpen} onClose={() => setCandOpen(false)} fullWidth maxWidth="md"><DialogTitle>{editingCand ? "Edit Candidate" : "Add Candidate"}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: 0.2 }}>
        {[['fullName','Full name'],['email','Email'],['phone','Phone'],['currentCompany','Current company'],['experience','Experience'],['resumeUrl','Resume URL'],['source','Source'],['interviewer','Interviewer']].map(([k,l]) => <Grid size={{ xs: 12, md: 6 }} key={k}><TextField fullWidth label={l} value={cand[k] || ""} onChange={(e) => setCand({ ...cand, [k]: e.target.value })} /></Grid>)}
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Date of birth" InputLabelProps={{ shrink: true }} value={cand.dob || ""} onChange={(e) => setCand({ ...cand, dob: e.target.value })} helperText={cand.stage === "HIRED" && !cand.employeeId ? "Required to create the employee account." : ""} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Interview date" InputLabelProps={{ shrink: true }} value={cand.interviewDate || ""} onChange={(e) => setCand({ ...cand, interviewDate: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="number" label="Interview score (0-100)" value={cand.interviewScore || ""} onChange={(e) => setCand({ ...cand, interviewScore: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Offer date" InputLabelProps={{ shrink: true }} value={cand.offerDate || ""} onChange={(e) => setCand({ ...cand, offerDate: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Expected joining date" InputLabelProps={{ shrink: true }} value={cand.expectedJoiningDate || ""} onChange={(e) => setCand({ ...cand, expectedJoiningDate: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth label="Job opening" value={cand.jobOpening?.id || ""} onChange={(e) => setCand({ ...cand, jobOpening: jobs.find((j) => String(j.id) === String(e.target.value)) || null })}>{jobs.map((j) => <MenuItem key={j.id} value={j.id}>{j.title}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth label="Stage" value={cand.stage || "APPLIED"} onChange={(e) => setCand({ ...cand, stage: e.target.value })}>{stages.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Notes" value={cand.notes || ""} onChange={(e) => setCand({ ...cand, notes: e.target.value })} /></Grid>
        {cand.employeeId && <Grid size={{ xs: 12 }}><Alert severity="success">This candidate is linked to Employee #{cand.employeeId}. Saving changes will not create another employee.</Alert></Grid>}
      </Grid></DialogContent><DialogActions><Button onClick={() => setCandOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveCand}>{cand.stage === "HIRED" && !cand.employeeId ? "Hire & Create Employee" : "Save"}</Button></DialogActions></Dialog>

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} fullWidth maxWidth="md"><DialogTitle>{editingTask ? "Edit Onboarding Task" : "Create Onboarding Task"}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: 0.2 }}>
        <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth label="Employee" value={task.employeeId} onChange={(e) => setTask({ ...task, employeeId: e.target.value })}>{employees.map((e) => <MenuItem key={e.employeeId || e.id} value={e.employeeId || e.id}>{e.fullName} {e.email ? `(${e.email})` : ""}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Task title" value={task.title || ""} onChange={(e) => setTask({ ...task, title: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth label="Category" value={task.category || "GENERAL"} onChange={(e) => setTask({ ...task, category: e.target.value })}>{onboardingCategories.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Assigned to" value={task.assignedTo || ""} onChange={(e) => setTask({ ...task, assignedTo: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth type="date" label="Due date" InputLabelProps={{ shrink: true }} value={task.dueDate || ""} onChange={(e) => setTask({ ...task, dueDate: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth label="Status" value={task.status || "PENDING"} onChange={(e) => setTask({ ...task, status: e.target.value })}><MenuItem value="PENDING">PENDING</MenuItem><MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem><MenuItem value="COMPLETED">COMPLETED</MenuItem></TextField></Grid>
        <Grid size={{ xs: 12 }}><TextField fullWidth multiline minRows={3} label="Description" value={task.description || ""} onChange={(e) => setTask({ ...task, description: e.target.value })} /></Grid>
      </Grid></DialogContent><DialogActions><Button onClick={() => setTaskOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveTask}>Save</Button></DialogActions></Dialog>
    </Box>
  );
}
