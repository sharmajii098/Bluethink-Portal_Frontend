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
  Divider,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

type Survey = {
  id: number;
  surveyNumber?: string;
  title: string;
  description?: string;
  question: string;
  category?: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | string;
  anonymous?: boolean;
  startAt?: string | null;
  endAt?: string | null;
};

type SurveyResponse = {
  id: number;
  employeeName?: string;
  rating: number;
  comment?: string;
  submittedAt?: string;
};

type SurveyForm = {
  title: string;
  description: string;
  question: string;
  category: string;
  anonymous: boolean;
  startAt: string;
  endAt: string;
};

const emptyForm: SurveyForm = {
  title: "",
  description: "",
  question: "",
  category: "Engagement",
  anonymous: true,
  startAt: "",
  endAt: "",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function SurveyPage() {
  const role = getCurrentRole();
  const mgmt = ["ADMIN", "HR"].includes(role);

  const [items, setItems] = useState<Survey[]>([]);
  const [msg, setMsg] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<Survey | null>(null);
  const [responsesSurvey, setResponsesSurvey] = useState<Survey | null>(null);
  const [analyticsSurvey, setAnalyticsSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [form, setForm] = useState<SurveyForm>(emptyForm);

  const load = async () => {
    try {
      const response = await api.get<Survey[]>(mgmt ? "/surveys" : "/surveys/my");
      setItems(response.data || []);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Unable to load surveys");
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const save = async () => {
    try {
      await api.post("/surveys", {
        ...form,
        startAt: form.startAt || null,
        endAt: form.endAt || null,
      });
      setOpenCreate(false);
      setMsg("Survey created as draft.");
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Unable to create survey");
    }
  };

  const action = async (id: number, actionName: "publish" | "close") => {
    try {
      await api.patch(`/surveys/${id}/${actionName}`);
      setMsg(actionName === "publish" ? "Survey published successfully." : "Survey closed successfully.");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Unable to update survey");
    }
  };

  const openResponses = async (survey: Survey) => {
    setResponsesSurvey(survey);
    setLoadingResponses(true);
    try {
      const response = await api.get<SurveyResponse[]>(`/surveys/${survey.id}/responses`);
      setResponses(response.data || []);
    } catch (e: any) {
      setResponses([]);
      setMsg(e?.response?.data?.message || "Unable to load survey responses");
    } finally {
      setLoadingResponses(false);
    }
  };

  const openAnalytics = async (survey: Survey) => {
    setAnalyticsSurvey(survey);
    setLoadingResponses(true);
    try {
      const response = await api.get<SurveyResponse[]>(`/surveys/${survey.id}/responses`);
      setResponses(response.data || []);
    } catch (e: any) {
      setResponses([]);
      setMsg(e?.response?.data?.message || "Unable to load survey analytics");
    } finally {
      setLoadingResponses(false);
    }
  };

  const respond = async () => {
    if (!selected) return;
    try {
      await api.post(`/surveys/${selected.id}/responses`, { rating, comment });
      setSelected(null);
      setMsg("Thank you. Your survey response was submitted.");
      await load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Unable to submit response");
    }
  };

  const averageRating = useMemo(() => {
    if (!responses.length) return 0;
    return responses.reduce((sum, response) => sum + Number(response.rating || 0), 0) / responses.length;
  }, [responses]);

  const distribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((value) => ({
      value,
      count: responses.filter((response) => Number(response.rating) === value).length,
    }));
  }, [responses]);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Employee Pulse Surveys</Typography>
          <Typography color="text.secondary">Collect structured employee feedback and measure engagement.</Typography>
        </Box>
        {mgmt && (
          <Button variant="contained" onClick={() => setOpenCreate(true)}>
            Create Survey
          </Button>
        )}
      </Stack>

      {msg && (
        <Alert sx={{ mb: 2 }} onClose={() => setMsg("")} severity="info">
          {msg}
        </Alert>
      )}

      <Stack spacing={2}>
        {items.map((survey) => (
          <Card key={survey.id} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                <Box flex={1}>
                  <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
                    <Chip label={survey.category || "Engagement"} size="small" />
                    <Chip
                      label={survey.status}
                      size="small"
                      color={survey.status === "PUBLISHED" ? "success" : survey.status === "CLOSED" ? "default" : "warning"}
                    />
                    {survey.anonymous && <Chip label="Anonymous" size="small" />}
                  </Stack>

                  <Typography variant="h6" fontWeight={800}>{survey.title}</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>{survey.description}</Typography>
                  <Typography>{survey.question}</Typography>

                  {(survey.startAt || survey.endAt) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Active: {formatDateTime(survey.startAt)} — {formatDateTime(survey.endAt)}
                    </Typography>
                  )}
                </Box>

                {mgmt ? (
                  <Stack direction={{ xs: "row", md: "column" }} spacing={1} alignItems={{ xs: "stretch", md: "flex-end" }}>
                    {survey.status === "DRAFT" ? (
                      <Button onClick={() => action(survey.id, "publish")}>Publish</Button>
                    ) : (
                      <Button disabled>Published</Button>
                    )}
                    <Button
                      startIcon={<VisibilityIcon />}
                      onClick={() => openResponses(survey)}
                      disabled={loadingResponses}
                    >
                      View Responses
                    </Button>
                    <Button
                      startIcon={<BarChartIcon />}
                      onClick={() => openAnalytics(survey)}
                      disabled={loadingResponses}
                    >
                      Analytics
                    </Button>
                    <Button
                      color="error"
                      disabled={survey.status !== "PUBLISHED"}
                      onClick={() => action(survey.id, "close")}
                    >
                      Close
                    </Button>
                  </Stack>
                ) : survey.status === "PUBLISHED" ? (
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSelected(survey);
                      setRating(5);
                      setComment("");
                    }}
                  >
                    Respond
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}

        {!items.length && <Typography color="text.secondary">No surveys available.</Typography>}
      </Stack>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Employee Survey</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField label="Description" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label="Question" multiline minRows={3} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <TextField select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Engagement", "Leadership", "Workplace", "Culture", "Wellbeing", "Other"].map((value) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </TextField>
            <TextField type="datetime-local" label="Start" InputLabelProps={{ shrink: true }} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            <TextField type="datetime-local" label="End" InputLabelProps={{ shrink: true }} value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" disabled={!form.title.trim() || !form.question.trim()} onClick={save}>Create Draft</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 3 }}>{selected?.question}</Typography>
          <Typography fontWeight={700} sx={{ mb: 1 }}>Your Rating</Typography>
          <Rating value={rating} onChange={(_, value) => setRating(value || 1)} size="large" />
          <TextField fullWidth multiline minRows={4} label="Comment" placeholder="Share your feedback..." sx={{ mt: 2 }} value={comment} onChange={(e) => setComment(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Cancel</Button>
          <Button variant="contained" onClick={respond}>Submit Response</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!responsesSurvey} onClose={() => setResponsesSurvey(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {responsesSurvey?.title}
          <Typography variant="body2" color="text.secondary">Survey Responses</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {loadingResponses ? (
            <Typography>Loading responses...</Typography>
          ) : responses.length === 0 ? (
            <Alert severity="info">No responses have been submitted yet.</Alert>
          ) : (
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Total Responses</Typography><Typography variant="h4" fontWeight={800}>{responses.length}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Average Rating</Typography><Typography variant="h4" fontWeight={800}>{averageRating.toFixed(1)} / 5</Typography></CardContent></Card>
              </Stack>
              {responses.map((response, index) => (
                <Card key={response.id ?? index} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                      <Typography fontWeight={700}>
                        {responsesSurvey?.anonymous ? `Response ${index + 1}` : (response.employeeName || `Response ${index + 1}`)}
                      </Typography>
                      <Rating value={Number(response.rating)} readOnly />
                    </Stack>
                    <Typography sx={{ mt: 1 }}>{response.comment?.trim() || "No comment provided."}</Typography>
                    <Typography variant="caption" color="text.secondary">Submitted: {formatDateTime(response.submittedAt)}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setResponsesSurvey(null)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={!!analyticsSurvey} onClose={() => setAnalyticsSurvey(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {analyticsSurvey?.title}
          <Typography variant="body2" color="text.secondary">Survey Analytics</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {loadingResponses ? (
            <Typography>Loading analytics...</Typography>
          ) : (
            <Stack spacing={3}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Responses</Typography><Typography variant="h4" fontWeight={800}>{responses.length}</Typography></CardContent></Card>
                <Card variant="outlined" sx={{ flex: 1 }}><CardContent><Typography color="text.secondary">Average Rating</Typography><Typography variant="h4" fontWeight={800}>{responses.length ? `${averageRating.toFixed(1)} / 5` : "—"}</Typography></CardContent></Card>
              </Stack>
              <Box>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Rating Distribution</Typography>
                <Stack spacing={1.25}>
                  {distribution.map((item) => {
                    const percentage = responses.length ? (item.count / responses.length) * 100 : 0;
                    return (
                      <Box key={item.value}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography>{item.value} ★</Typography>
                          <Typography color="text.secondary">{item.count} ({percentage.toFixed(0)}%)</Typography>
                        </Stack>
                        <Box sx={{ height: 9, bgcolor: "action.hover", borderRadius: 10, overflow: "hidden" }}>
                          <Box sx={{ width: `${percentage}%`, height: "100%", bgcolor: "primary.main" }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                {analyticsSurvey?.anonymous
                  ? "This survey is anonymous. Analytics do not expose employee names or IDs."
                  : "This survey is not anonymous. Employee names may be shown in the response details."}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAnalyticsSurvey(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
