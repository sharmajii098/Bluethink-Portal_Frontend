import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { api } from "../services/api";

export type AiMessage = { id: string; role: "user" | "assistant"; text: string };
type AiChatState = {
  messages: AiMessage[];
  setMessages: Dispatch<SetStateAction<AiMessage[]>>;
  prompt: string;
  setPrompt: Dispatch<SetStateAction<string>>;
  busy: boolean;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  sendMessage: (value?: string) => Promise<void>;
  resetChat: () => void;
  cancelMessage: () => void;
};
const AiChatContext = createContext<AiChatState | null>(null);

/** One in-memory conversation for popup/full-page views, scoped to this signed-in session. */
export function AiChatProvider({ children }: { children: ReactNode }) {
  const session = useSelector((state: RootState) => state.auth.session);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const pendingText = useRef("");

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; request.current?.abort(); };
  }, []);

  // Never show a previous signed-in account's in-memory AI conversation to a
  // different user. Abort an old request when identity/session changes.
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    pending.current = false; pendingText.current = "";
    setBusy(false);
    setMessages([]);
    setPrompt("");
    setError("");
  }, [session?.token]);

  async function sendMessage(value = prompt) {
    const text = value.trim();
    if (!text || pending.current) return;
    if (text.length > 2000) { setError("Use no more than 2,000 characters."); return; }
    pending.current = true; pendingText.current = text;
    const controller = new AbortController();
    request.current = controller;
    const id = `${Date.now()}-${++sequence.current}`;
    setPrompt(""); setError(""); setBusy(true);
    setMessages(current => [...current, { id: `${id}-u`, role: "user", text }]);
    try {
      if (!session?.token) throw new Error("Your session has expired. Please sign in again.");
      // Only the current on-screen conversation may supply narrowly scoped follow-up context.
      // New Chat clears messages, so server follow-ups cannot inherit an older session.
      const contextQuestion = [...messages].reverse().find(item => item.role === "user")?.text;
      const response = await api.post("/ai/chat", { message: text, contextQuestion }, {
        headers: { Authorization: `Bearer ${session.token}` },
        signal: controller.signal,
        timeout: 150000, // Longer than server model read timeout to show its real error.
      });
      if (active.current && !controller.signal.aborted) {
        const answer = String(response.data?.answer ?? "No response received from server.");
        setMessages(current => [...current, { id: `${id}-a`, role: "assistant", text: answer }]);
      }
    } catch (failure: unknown) {
      if (!active.current || request.current !== controller || controller.signal.aborted) return;
      // A failed read-only chat request should be easy to retry without an orphan user bubble.
      // Do not overwrite a new draft typed while waiting for the response.
      setMessages(current => current.filter(item => item.id !== `${id}-u`));
      setPrompt(current => current.trim() ? current : text);
      const problem = failure as { code?: string; response?: { status?: number; data?: { error?: string; message?: string } } };
      const status = problem.response?.status;
      const detail = problem.response?.data?.error || problem.response?.data?.message;
      setError(status === 403
        ? "Access denied. You can only view employee records permitted by your HRMS role."
        : status === 401 ? "Your session has expired. Please sign in again."
        : status === 429 ? "Too many AI requests. Please wait a minute before retrying."
        : problem.code === "ECONNABORTED" ? "AI took too long. Your question is still in the input; try again or ask a shorter question. An administrator can check Ollama performance."
        : status === 502 || status === 503 || status === 504 ? "AI model is busy, offline, or taking too long. Your question is preserved; retry when the model is ready."
        : typeof detail === "string" ? detail
        : failure instanceof Error ? failure.message : "Unable to reach BlueThink AI. Please try again.");
    } finally {
      if (active.current && request.current === controller) {
        pending.current = false; pendingText.current = ""; setBusy(false); request.current = null;
      }
    }
  }

  function cancelMessage() {
    const controller = request.current;
    if (!controller || !pending.current) return;
    controller.abort();
    // Explicit cancel is not a failed server request; the user can edit/retry their draft.
    const text = pendingText.current;
    pending.current = false; pendingText.current = ""; request.current = null;
    setBusy(false);
    setMessages(current => current.filter(m => !(m.role === "user" && m.text === text && m.id === current[current.length - 1]?.id)));
    setPrompt(current => current.trim() ? current : text);
    setError("Request cancelled. Your question is preserved in the input.");
  }

  function resetChat() {
    if (pending.current) return;
    setMessages([]); setPrompt(""); setError("");
  }

  return <AiChatContext.Provider value={{ messages, setMessages, prompt, setPrompt, busy, error, setError, sendMessage, resetChat, cancelMessage }}>
    {children}
  </AiChatContext.Provider>;
}

export function useAiChat() {
  const value = useContext(AiChatContext);
  if (!value) throw new Error("AI chat must be rendered within AiChatProvider");
  return value;
}
