import { passwordHelp, validPassword } from "../../utils/passwordPolicy";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import BlueThinkWordmark from "../../components/BlueThinkWordmark";
import "./PasswordRecovery.css";

export default function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Remove the secret from the address bar/history after capturing it in component state.
    window.history.replaceState(window.history.state, "", window.location.pathname);
    let alive = true;
    if (!token) { setValid(false); return; }
    api.post("/public/password-reset/validate", { token })
      .then(response => { if (alive) setValid(Boolean(response.data.valid)); })
      .catch(() => { if (alive) setValid(false); });
    return () => { alive = false; };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!validPassword(password)) {
      setError(passwordHelp); return;
    }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/public/password-reset/confirm", { token, password });
      setSuccess(true);
      setPassword(""); setConfirm("");
    } catch (failure: any) {
      const responseMessage = failure?.response?.data?.message;
      setError(typeof responseMessage === "string" ? responseMessage : "Reset failed. The link may have expired; request a new one.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="recovery-page">
    <section className="recovery-panel" aria-label="Set a new password">
      <BlueThinkWordmark />
      <span className="recovery-kicker">SECURE PASSWORD RESET</span>
      <h1>Set your new password</h1>
      {valid === null && <p role="status">Checking your reset link…</p>}
      {valid === false && <div className="recovery-error" role="alert">This reset link is invalid, expired or has already been used. <Link to="/forgot-password">Request a new link</Link>.</div>}
      {success && <div className="recovery-success" role="status">Password updated. All previous login sessions were revoked. <Link to="/login">Sign in again</Link>.</div>}
      {valid && !success && <form onSubmit={submit} className="recovery-form">
        <p>This one-time link expires in 30 minutes. Use a password that you don't use elsewhere.</p>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" autoComplete="new-password" type="password" required minLength={12} maxLength={72}
          value={password} disabled={busy} onChange={event => setPassword(event.target.value)} />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" autoComplete="new-password" type="password" required minLength={12} maxLength={72}
          value={confirm} disabled={busy} onChange={event => setConfirm(event.target.value)} />
        {error && <div className="recovery-error" role="alert">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}</button>
      </form>}
      <Link className="recovery-back" to="/login">← Back to login</Link>
    </section>
  </main>;
}
