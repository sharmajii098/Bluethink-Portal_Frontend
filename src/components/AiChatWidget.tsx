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
  const { messages, prompt, setPrompt, busy, error, elapsedSeconds, setError, sendMessage, resetChat, cancelMessage } = useAiChat();
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showFirstLoginHint, setShowFirstLoginHint] = useState(false);
  const checkedHintAccount = useRef<string | null>(null);
  const location = useLocation();
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const teamChat = location.pathname.endsWith("/team-chat");
  const fullPage = location.pathname.endsWith("/ai-assistant");

  useEffect(() => {
    if (open) bottom.current?.scrollIntoView({ block: "end" });
  }, [open, messages, busy, error]);

  // Show the nearby label once per signed-in account in this browser.
  // Store only a display preference, never the session token or conversation.
  useEffect(() => {
    const account = session?.userId?.trim();
    if (!session?.token || !account) {
      checkedHintAccount.current = null;
      setShowFirstLoginHint(false);
      return;
    }
    // The full-page assistant hides the launcher; do not consume the intro there.
    if (fullPage) return;
    const key = `bt-ai-launcher-hint-v1:${account}`;
    if (checkedHintAccount.current === key) return;
    checkedHintAccount.current = key;
    try {
      if (localStorage.getItem(key) === "seen") {
        setShowFirstLoginHint(false);
        return;
      }
      localStorage.setItem(key, "seen");
    } catch { /* Private browsing: show once for this mounted session. */ }
    setShowFirstLoginHint(true);
  }, [session?.token, session?.userId, fullPage]);

  useEffect(() => {
    if (!showFirstLoginHint) return;
    const timer = window.setTimeout(() => setShowFirstLoginHint(false), 6500);
    return () => window.clearTimeout(timer);
  }, [showFirstLoginHint]);

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
    <Portal>
      <Box className={`bt-ai-launcher-dock${showFirstLoginHint ? " bt-ai-intro-visible" : ""}`}
        sx={{ position: "fixed", right: { xs: 16, sm: 26 }, bottom: teamChat ? "max(100px, env(safe-area-inset-bottom))" : "max(22px, env(safe-area-inset-bottom))", zIndex: 1290 }}>
        <span className="bt-ai-launcher-label" aria-hidden="true">BlueThink AI Assistant</span>
        <Fab className={`bt-ai-launcher bt-ai-launcher-round bt-ai-role-${role.toLowerCase()}${teamChat ? " bt-ai-launcher-team-chat" : ""} bt-ai-animated-launcher`}
          color="primary" aria-label="Open Ask BlueThink AI chat" aria-haspopup="dialog"
          aria-expanded={open} aria-controls={open ? "bt-ai-popup" : undefined}
          onClick={() => { setShowFirstLoginHint(false); setOpen(true); }}
          sx={{ width: { xs: 56, sm: 64 }, height: { xs: 56, sm: 64 }, minHeight: 0, minWidth: 0, p: 0, borderRadius: "50%" }}>
          <span className="bt-ai-icon-track" aria-hidden="true">
            <span className="bt-ai-icon-face bt-ai-icon-face-brand">
              <img className="bt-ai-monogram" src="/bluethink-ai-b-pro.webp" alt="" />
            </span>
            <span className="bt-ai-icon-face bt-ai-icon-face-robot">
              <img className="bt-ai-robot-art" src="/bluethink-ai-robot-pro.webp" alt="" />
            </span>
          </span>
        </Fab>
      </Box>
    </Portal>
    <Dialog open={open} onClose={minimize} fullScreen={maximized} className={`bt-ai-dialog bt-ai-role-${role.toLowerCase()}`} maxWidth={false}
      aria-labelledby="bt-ai-popup-title" disableScrollLock
      TransitionProps={{ onEntered: () => input.current?.focus() }}
      sx={{ "& .MuiDialog-container": { alignItems: maximized ? "stretch" : "flex-end", justifyContent: maximized ? "stretch" : "flex-end", p: maximized ? 0 : { xs: 1, sm: 3 }, pb: maximized ? 0 : { xs: 10, sm: 11 } },
        "& .MuiBackdrop-root": { backgroundColor: "rgba(15, 38, 48, .15)" } }}
      PaperProps={{ id: "bt-ai-popup", className: "bt-ai-dialog-paper", sx: { m: 0, width: maximized ? "100%" : { xs: "calc(100vw - 16px)", sm: 410 }, maxWidth: maximized ? "100%" : "calc(100vw - 16px)", height: maximized ? "100dvh" : "min(580px, calc(100dvh - 112px))", maxHeight: maximized ? "100dvh" : "calc(100dvh - 112px)", borderRadius: maximized ? 0 : 3, display: "flex", flexDirection: "column", overflow: "hidden" } }}>
      <Stack className="bt-ai-dialog-header" direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, color: "white" }}>
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
      <Box className="bt-ai-dialog-conversation" role="log" aria-label="AI conversation" aria-live="polite" aria-relevant="additions text" sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: maximized ? 3 : 1.5, background: "background.default" }}>
        {/* A new conversation is intentionally blank until a question is sent. */}
        <Stack spacing={1.5} sx={{ maxWidth: maximized ? 940 : "none", mx: "auto", width: "100%" }}>
          {messages.map(message => <Box key={message.id} sx={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "92%" }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: .5 }}>{message.role === "user" ? "You" : "BlueThink AI"}</Typography>
            <Box sx={{ p: 1.3, borderRadius: 2, whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14, lineHeight: 1.6,
              bgcolor: message.role === "user" ? "primary.main" : "background.paper", color: message.role === "user" ? "primary.contrastText" : "text.primary", border: "1px solid", borderColor: "divider" }}>{message.text}</Box>
          </Box>)}
          {busy && <Stack direction="row" alignItems="center" spacing={1} role="status"><CircularProgress size={16} /><Typography variant="body2">{elapsedSeconds < 8 ? "Checking your question…" : `Still working · ${elapsedSeconds}s. You can stop and retry.`}</Typography><Button size="small" onClick={cancelMessage}>Stop</Button></Stack>}
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
