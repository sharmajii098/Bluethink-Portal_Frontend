import { passwordHelp, validPassword } from "../../utils/passwordPolicy";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import logo from "../../branding/bluethink-inc-official-master.png";
import "./PasswordRecovery.css";

export default function ActivateAccountPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") || "");
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
    let active = true;
    api.get("/public/invitations/validate", {params: {token}})
      .then(r => {if (active) setValid(Boolean(r.data.valid));})
      .catch(() => {if (active) setValid(false);});
    return () => {active = false;};
  }, [token]);
  async function activate(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!validPassword(password)) {
      setError(passwordHelp); return;
    }
    if (password !== confirm) {setError("Passwords do not match."); return;}
    setLoading(true);
    try {
      await api.post("/public/invitations/activate", {token, password});
      setSuccess(true); setPassword(""); setConfirm("");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Activation failed or link expired. Ask HR to resend your invitation.");
    } finally {setLoading(false);}
  }
  return <main className="recovery-page">
    <section className="recovery-panel" aria-label="Activate your BlueThink Inc. account">
      <img className="recovery-logo" src={logo} alt="BlueThink Inc. — Think beyond" />
      <span className="recovery-kicker">WELCOME TO BLUETHINK INC.</span>
      <h1>Set up your account</h1>
      {valid === null && <p role="status">Checking your invitation…</p>}
      {valid === false && <div className="recovery-error" role="alert">This invitation is invalid or expired. Ask HR to select Resend invite on your employee record.</div>}
      {success && <div className="recovery-success" role="status">Your password is set. <Link to="/login">Sign in</Link>.</div>}
      {valid && !success && <form onSubmit={activate} className="recovery-form">
        <p>Choose your own password. This one-time link expires after 24 hours.</p>
        <label htmlFor="activation-password">New password</label>
        <input id="activation-password" required autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={12} />
        <label htmlFor="activation-confirm">Confirm password</label>
        <input id="activation-confirm" required autoComplete="new-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={12} />
        {error && <div className="recovery-error" role="alert">{error}</div>}
        <button type="submit" disabled={loading}>{loading ? "Setting password…" : "Activate account"}</button>
      </form>}
      <Link className="recovery-back" to="/login">← Back to login</Link>
    </section>
  </main>;
}
