import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import logo from "../../branding/bluethink-inc-official-master.png";
import "./PasswordRecovery.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await api.post("/public/password-reset/request", { email: email.trim() });
      setDone(true);
      setEmail("");
    } catch {
      setError("The request could not be completed. Please try again later or contact HR.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="recovery-page">
    <section className="recovery-panel" aria-label="Password recovery">
      <img className="recovery-logo" src={logo} alt="BlueThink Inc. — Think beyond" />
      <span className="recovery-kicker">ACCOUNT RECOVERY</span>
      <h1>Forgot your password?</h1>
      <p>Enter the email address registered with HR. We will send a secure, one-time password reset link if your account exists.</p>
      {done ? <div className="recovery-success" role="status">
        If this email belongs to an account, a reset link will be sent. Check your Inbox and Spam folder. The link expires in 30 minutes.
      </div> : <form onSubmit={submit} className="recovery-form">
        <label htmlFor="recovery-email">Registered email address</label>
        <input id="recovery-email" name="email" type="email" autoComplete="email" placeholder="name@company.com" maxLength={254} required
          value={email} disabled={busy} onChange={event => setEmail(event.target.value)} />
        {error && <div className="recovery-error" role="alert">{error}</div>}
        <button type="submit" disabled={busy}>{busy ? "Sending request…" : "Send reset link"}</button>
      </form>}
      <Link className="recovery-back" to="/login">← Back to login</Link>
      <p className="recovery-hint">Never share a password, Gmail App Password or reset link with anyone.</p>
    </section>
  </main>;
}
