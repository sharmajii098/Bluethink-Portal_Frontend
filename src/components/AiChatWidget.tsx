import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Dialog, Fab, IconButton, Portal, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { AddRounded, AutoAwesomeRounded, CloseFullscreenRounded, CloseRounded, OpenInFullRounded, SendRounded } from "@mui/icons-material";
import type { RootState } from "../store";
import { useAiChat } from "../contexts/AiChatContext";
import AiActionLauncher from "./AiActionLauncher";

export default function AiChatWidget() {
  const session = useSelector((state: RootState) => state.auth.session);
  const role = String(session?.role || "EMPLOYEE").replace(/^ROLE_/i, "").toUpperCase();
  const { messages, prompt, setPrompt, busy, error, setError, sendMessage, resetChat, cancelMessage } = useAiChat();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const location = useLocation();
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const teamChat = location.pathname.endsWith("/team-chat");
  const fullPage = location.pathname.endsWith("/ai-assistant");

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "end" });
  }, [open, messages, busy, error]);

  // Resize the existing dialog instead of navigating to a different page.
  // This keeps draft text, the in-flight request and the conversation intact.
  function toggleSize() {
    setMaximized(current => !current);
  }

  function minimize() {
    setOpen(false);
    setMaximized(false);
  }

  // The full AI page already provides this conversation and composer.
  if (!session?.token || fullPage) return null;

  return <>
    <Portal><Tooltip title="Ask BlueThink AI" placement="left">
      <Fab className={`bt-ai-launcher${teamChat ? " bt-ai-launcher-team-chat" : ""}`} variant="extended" color="primary" aria-label="Open BlueThink AI chat" aria-haspopup="dialog"
        aria-expanded={open} aria-controls={open ? "bt-ai-popup" : undefined}
        onClick={() => setOpen(true)}
        sx={{ position: "fixed", right: { xs: 16, sm: 24 }, bottom: teamChat ? "max(100px, env(safe-area-inset-bottom))" : "max(20px, env(safe-area-inset-bottom))", zIndex: 1290, gap: 1, px: teamChat ? 0 : 2.5, minWidth: teamChat ? 44 : undefined, width: teamChat ? 44 : undefined, height: teamChat ? 44 : 52, color: "white",
          background: "linear-gradient(135deg, #135b63, #169e95)", boxShadow: "0 8px 28px #0c5f6540", "&:hover": { background: "#116e72" } }}>
        <AutoAwesomeRounded />{!teamChat && <span>Ask BlueThink</span>}
      </Fab>
    </Tooltip></Portal>
    <Dialog open={open} onClose={minimize} fullScreen={maximized} maxWidth={false}
      aria-labelledby="bt-ai-popup-title" disableScrollLock
      TransitionProps={{ onEntered: () => input.current?.focus() }}
      sx={{ "& .MuiDialog-container": { alignItems: maximized ? "stretch" : "flex-end", justifyContent: maximized ? "stretch" : "flex-end", p: maximized ? 0 : { xs: 1, sm: 3 }, pb: maximized ? 0 : { xs: 10, sm: 11 } },
        "& .MuiBackdrop-root": { backgroundColor: "rgba(15, 38, 48, .15)" } }}
      PaperProps={{ id: "bt-ai-popup", sx: { m: 0, width: maximized ? "100%" : { xs: "calc(100vw - 16px)", sm: 410 }, maxWidth: maximized ? "100%" : "calc(100vw - 16px)", height: maximized ? "100dvh" : "min(580px, calc(100dvh - 112px))", maxHeight: maximized ? "100dvh" : "calc(100dvh - 112px)", borderRadius: maximized ? 0 : 3, display: "flex", flexDirection: "column", overflow: "hidden" } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, color: "white", background: "linear-gradient(120deg, #244a45, #3d7465)" }}>
        <AutoAwesomeRounded />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="bt-ai-popup-title" fontWeight={800}>BlueThink AI</Typography>
          <Typography variant="caption" sx={{ opacity: .85 }}>Portal Copilot · {role}</Typography>
        </Box>
        <AiActionLauncher compact />
        <Tooltip title={maximized ? "Restore chat size" : "Maximize chat"}><IconButton color="inherit" aria-label={maximized ? "Restore AI chat size" : "Maximize AI chat"} aria-pressed={maximized} onClick={toggleSize}>{maximized ? <CloseFullscreenRounded fontSize="small" /> : <OpenInFullRounded fontSize="small" />}</IconButton></Tooltip>
        <Tooltip title="Minimize chat"><IconButton color="inherit" aria-label="Minimize AI chat" onClick={minimize}><CloseRounded fontSize="small" /></IconButton></Tooltip>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: .7, borderBottom: "1px solid #e5ecec" }}>
        <Typography variant="caption" color="text.secondary">Ask about your permitted portal records</Typography>
        <Button size="small" startIcon={<AddRounded />} disabled={busy} onClick={resetChat}>New chat</Button>
      </Stack>
      <Box role="log" aria-label="AI conversation" aria-live="polite" aria-relevant="additions text" sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: maximized ? 3 : 1.5, background: "#f7fafb" }}>
        {/* A new conversation is intentionally blank until a question is sent. */}
        <Stack spacing={1.5} sx={{ maxWidth: maximized ? 940 : "none", mx: "auto", width: "100%" }}>
          {messages.map(message => <Box key={message.id} sx={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: .5 }}>{message.role === "user" ? "You" : "BlueThink AI"}</Typography>
            <Box sx={{ p: 1.3, borderRadius: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14, lineHeight: 1.6,
              bgcolor: message.role === "user" ? "#136f73" : "white", color: message.role === "user" ? "white" : "#213b46", border: "1px solid #dce8e9" }}>{message.text}</Box>
          </Box>)}
          {busy && <Stack direction="row" alignItems="center" spacing={1} role="status"><CircularProgress size={16} /><Typography variant="body2">Working on your question…</Typography><Button size="small" onClick={cancelMessage}>Stop</Button></Stack>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          <div ref={bottom} />
        </Stack>
      </Box>
      <Box component="form" onSubmit={event => { event.preventDefault(); void sendMessage(); }} sx={{ p: maximized ? 2.5 : 1.5, borderTop: "1px solid #e5ecec" }}>
        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ maxWidth: maximized ? 940 : "none", mx: "auto" }}>
          <TextField inputRef={input} fullWidth size="small" label="Ask BlueThink AI" multiline maxRows={4}
            value={prompt} onChange={event => setPrompt(event.target.value)} disabled={busy}
            inputProps={{ maxLength: 2000 }}
            onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(); } }} />
          <IconButton type="submit" color="primary" disabled={busy || !prompt.trim()} aria-label="Send AI message"><SendRounded /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: maximized ? 940 : "none", mx: "auto", mt: 1 }}>Verified record lookup · Self-service actions require a separate confirmation.</Typography>
      </Box>
    </Dialog>
  </>;
}
