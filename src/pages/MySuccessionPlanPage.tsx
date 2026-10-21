import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, Stack, TextField, Typography } from "@mui/material";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { api } from "../services/api";

type Plan = {
  id: number;
  planNumber: string;
  employeeUserId: string;
  employeeName?: string;
  currentDesignation?: string;
  currentDepartment?: string;
  targetRole: string;
  criticalRole?: string;
  readinessLevel: string;
  retentionRisk?: string;
  performancePotential?: string;
  developmentActions?: string;
  mentorUserId?: string;
  mentorName?: string;
  status?: string;
  nominatedByUserId?: string;
  nominatedByName?: string;
  reviewerComment?: string;
  reviewedAt?: string;
};

const readinessLabel = (value = "") => value.replaceAll("_", " ");

export default function MySuccessionPlanPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/talent-succession/employee/my");
      setItems(response.data || []);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Unable to load your succession plans.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.planNumber} ${item.targetRole} ${item.currentDesignation || ""} ${item.currentDepartment || ""} ${item.readinessLevel} ${item.status || ""} ${item.developmentActions || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <WorkspacePremiumRoundedIcon />
            <Typography variant="h4" fontWeight={800}>My Succession & Career Plan</Typography>
          </Stack>
          <Typography color="text.secondary">
            View succession plans created for you by your manager or HR.
          </Typography>
        </Box>
      </Stack>

      {message && <Alert sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

      <TextField
        fullWidth
        size="small"
        placeholder="Search target role, department, readiness or development action..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        sx={{ mb: 3 }}
      />

      <Stack spacing={2}>
        {filtered.map((plan) => (
          <Card key={plan.id}>
            <CardContent>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip size="small" label={plan.planNumber} />
                  <Chip
                    size="small"
                    label={plan.status || "ACTIVE"}
                    color={plan.status === "PROMOTED" ? "success" : plan.status === "ON_HOLD" ? "warning" : "default"}
                  />
                  <Chip
                    size="small"
                    label={readinessLabel(plan.readinessLevel)}
                    color={plan.readinessLevel === "READY_NOW" ? "success" : "primary"}
                  />
                  {plan.retentionRisk && (
                    <Chip
                      size="small"
                      label={`Retention Risk: ${plan.retentionRisk}`}
                      color={plan.retentionRisk === "HIGH" ? "error" : plan.retentionRisk === "MEDIUM" ? "warning" : "default"}
                    />
                  )}
                </Stack>

                {plan.employeeName && (
                  <Typography variant="subtitle1" fontWeight={800}>
                    {plan.employeeName} <Typography component="span" variant="subtitle1" color="text.secondary" fontWeight={700}>— {plan.employeeUserId}</Typography>
                  </Typography>
                )}
                <Typography variant="h6" fontWeight={800}>{plan.targetRole}</Typography>
                <Typography color="text.secondary">
                  Current role: {plan.currentDesignation || "Not specified"}
                  {plan.currentDepartment ? ` · ${plan.currentDepartment}` : ""}
                  {plan.criticalRole ? ` · Critical position: ${plan.criticalRole}` : ""}
                </Typography>

                {plan.performancePotential && (
                  <Typography>Performance potential: <b>{plan.performancePotential}</b></Typography>
                )}
                {plan.mentorUserId && (
                  <Typography>Mentor: <b>{plan.mentorName || plan.mentorUserId}</b>{plan.mentorUserId && <span> — {plan.mentorUserId}</span>}</Typography>
                )}
                {plan.developmentActions && (
                  <Box>
                    <Typography fontWeight={700}>Development Actions</Typography>
                    <Typography color="text.secondary">{plan.developmentActions}</Typography>
                  </Box>
                )}
                {plan.nominatedByUserId && (
                  <Typography variant="body2" color="text.secondary">
                    Plan created by: {plan.nominatedByName || plan.nominatedByUserId}{plan.nominatedByUserId ? ` — ${plan.nominatedByUserId}` : ""}
                  </Typography>
                )}
                {plan.reviewerComment && (
                  <Box>
                    <Typography fontWeight={700}>Latest Review</Typography>
                    <Typography color="text.secondary">{plan.reviewerComment}</Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        ))}

        {!filtered.length && (
          <Typography color="text.secondary">
            No succession plan has been assigned to you yet.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
