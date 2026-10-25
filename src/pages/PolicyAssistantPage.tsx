import { useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../services/api";
import { authIdentity, errorText } from "../utils/integrationForms";

type ChatResponse = {
  answer: string;
  sources: string[];
};

type IngestionResponse = {
  indexedPolicies: number;
  pdfPages: number;
  indexedChunks: number;
  indexedAt: string;
};

type Message = {
  question: string;
  answer: string;
  sources: string[];
};

export default function PolicyAssistantPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const role = authIdentity().role.toUpperCase().replace(/^ROLE_/, "");
  const canIngest = role === "ADMIN" || role === "HR";

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post<ChatResponse>("/rag/chat", { question: text });
      if (!data || typeof data.answer !== "string") {
        throw new Error("The policy assistant returned an invalid response.");
      }
      setMessages(current => [...current, {
        question: text,
        answer: data.answer,
        sources: Array.isArray(data.sources) ? data.sources : [],
      }]);
      setQuestion("");
    } catch (requestError) {
      setError(errorText(
        requestError,
        "Could not reach the policy assistant. Check that RAG is enabled and configured on the backend.",
      ));
    } finally {
      setBusy(false);
    }
  };

  const ingest = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const body = new FormData();
      if (file) body.append("file", file);
      const { data } = await api.post<IngestionResponse>("/rag/ingest", body, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      });
      setNotice(
        `Indexed ${data.indexedPolicies} portal policies and ${data.pdfPages} PDF pages into ${data.indexedChunks} searchable chunks.`,
      );
      setFile(null);
    } catch (requestError) {
      setError(errorText(
        requestError,
        "Could not index policies. Check the backend configuration and uploaded PDF.",
      ));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Policy Assistant
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ask questions about current employee policies. Answers are grounded in indexed policy content.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      {canIngest && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>Refresh policy knowledge</Typography>
              <Typography variant="body2" color="text.secondary">
                Indexes effective policies already stored in the portal. You may also include one PDF (maximum 10 MB).
              </Typography>
            </Box>
            <Button component="label" variant="outlined" disabled={busy}>
              {file ? file.name : "Choose PDF (optional)"}
              <input
                hidden
                type="file"
                accept="application/pdf,.pdf"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <Button variant="contained" onClick={() => void ingest()} disabled={busy}>
              {busy ? "Working…" : "Index policies"}
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2} sx={{ mb: 3, maxHeight: "55vh", overflowY: "auto" }}>
          {!messages.length && (
            <Typography color="text.secondary">
              Ask about leave, benefits, or another indexed employee policy.
            </Typography>
          )}
          {messages.map((message, index) => (
            <Box key={`${index}-${message.question}`}>
              <Typography fontWeight={700}>You</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", mb: 1 }}>{message.question}</Typography>
              <Typography fontWeight={700}>Policy Assistant</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{message.answer}</Typography>
              {!!message.sources.length && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Sources: {message.sources.join(", ")}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>

        <Box component="form" onSubmit={event => void ask(event)}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              label="Ask a policy question"
              value={question}
              onChange={event => setQuestion(event.target.value)}
              inputProps={{ maxLength: 2000 }}
              disabled={busy}
            />
            <Button type="submit" variant="contained" disabled={busy || !question.trim()}>
              {busy ? "Working…" : "Ask"}
            </Button>
          </Stack>
        </Box>
      </Paper>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
        Do not use this assistant as a substitute for HR guidance. If no indexed policy supports an answer, it should say so.
      </Typography>
    </Box>
  );
}
