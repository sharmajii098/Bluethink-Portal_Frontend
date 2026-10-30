import "./LoginPage.css";
import "./LoginPremium.css";
import "./LoginSignature.css";
import "./LoginPaletteV286.css";
import "./LoginMaterialsV287.css";
import BlueThinkWordmark from "../../components/BlueThinkWordmark";

import { FormEvent, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { login } from "../../services/authService";
import { setSession } from "../../store/authSlice";

import type { AppDispatch, RootState } from "../../store";
import type { Role } from "../../types/auth";


const normalizeRole = (value: string): Role => {
  const normalized = value.replace(/^ROLE_/i, "").trim().toUpperCase();
  if (!["ADMIN", "HR", "MANAGER", "EMPLOYEE"].includes(normalized)) {
    throw new Error(`Invalid role: ${value}`);
  }
  return normalized as Role;
};

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
const EyeIcon = ({ hidden = false }: { hidden?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {hidden ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6" />
        <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c7 0 10.5 8 10.5 8a16.7 16.7 0 0 1-3.1 4.1" />
        <path d="M6.2 6.2C3.3 8.3 1.5 12 1.5 12S5 20 12 20c1.5 0 2.9-.3 4.1-.8" />
      </>
    ) : (
      <>
        <path d="M1.5 12S5 4 12 4s10.5 8 10.5 8S19 20 12 20 1.5 12 1.5 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M14 7l5 5-5 5" />
  </svg>
);

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [stage, setStage] = useState("Verifying your sign-in…");

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = useSelector((state: RootState) => state.auth.sessionExpired);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");

    const cleanId = userId.trim();
    if (!cleanId) return setError("Please enter your Employee ID.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);
    setStage("Verifying work location…");
    try {
      if (!window.isSecureContext) throw new Error("Secure HTTPS is required for location verification. Open the HTTPS portal address.");
      if (!navigator.geolocation) {
        throw new Error("This browser does not support GPS location. Please use a supported browser and try again.");
      }

      // Desktop browsers may initially return a coarse Wi-Fi/IP estimate. Watch for
      // improved readings briefly and use the most accurate valid fix received.
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        let watchId: number | undefined;
        let bestPosition: GeolocationPosition | undefined;
        let settled = false;
        const finish = (result?: GeolocationPosition, error?: Error) => {
          if (settled) return;
          settled = true;
          if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
          window.clearTimeout(timer);
          if (result) resolve(result);
          else reject(error ?? new Error("Unable to detect your location. Please enable device location and retry."));
        };
        const timer = window.setTimeout(() => {
          if (bestPosition) finish(bestPosition);
          else finish(undefined, new Error("Location check timed out. Allow location access in your browser and Windows settings, then retry."));
        }, 25000);
        watchId = navigator.geolocation.watchPosition(
          (candidate) => {
            if (!Number.isFinite(candidate.coords.latitude) ||
                !Number.isFinite(candidate.coords.longitude) ||
                !Number.isFinite(candidate.coords.accuracy)) return;
            if (!bestPosition || candidate.coords.accuracy < bestPosition.coords.accuracy) {
              bestPosition = candidate;
            }
            if (candidate.coords.accuracy <= 150) finish(candidate);
          },
          (locationError) => {
            if (locationError.code === 1) {
              finish(undefined, new Error("Location permission is required. Allow location access for this site and desktop apps, then retry."));
            } else if (!bestPosition && locationError.code === 2) {
              finish(undefined, new Error("Your device could not determine a location. Enable Windows Location services and Wi-Fi, then retry."));
            }
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
      });

      if (position.coords.accuracy > 150) {
        throw new Error(`Location accuracy is still about ${Math.round(position.coords.accuracy)} meters after retrying. Enable Windows Location services and Wi-Fi, then try again near the office. A reliable location is required for attendance verification.`);
      }

      setStage("Signing you in…");
      const response = await login({
        userId: cleanId,
        password,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Invalid credentials.");
      }
      if (!response.token) {
        throw new Error("Authentication token was not returned by the server.");
      }
      if (!response.role) {
        throw new Error("User role was not returned by the server.");
      }

      const role = normalizeRole(response.role);
      dispatch(
        setSession({
          token: response.token,
          userId: response.userId || cleanId,
          role,
          fullName: response.fullName,
          designation: response.designation,
          permissions: response.permissions ?? [],
        }),
      );

      const from = location.state?.from;
      const prefix = `/${role.toLowerCase()}/`;
      const target = typeof from?.pathname === "string" && from.pathname.startsWith(prefix)
        ? from.pathname + (from.search || "") : `${prefix}dashboard`;
      navigate(target, { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bt-auth bt26-auth bt-premium-auth">
      <div className="bt-auth-background" aria-hidden="true" />
      <div className="bt-auth-frame">
        <section className="bt-auth-hero" aria-label="BlueThink workspace">
          <div className="bt-auth-hero-grain" aria-hidden="true" />
          <header className="bt-auth-hero-top">
            <span className="bt-auth-hero-bullet" aria-hidden="true" />
            <span>BLUETHINK INC. / WORKFORCE</span>
            <span className="bt-auth-hero-index">THINK BEYOND</span>
          </header>

          <div className="bt-login-art" aria-hidden="true">
            <div className="bt-login-orbit orbit-one"/><div className="bt-login-orbit orbit-two"/>
            <div className="bt-login-tile tile-back"/><div className="bt-login-tile tile-main"><span/><span/><span/></div>
            <div className="bt-login-float float-one">People <span>↗</span></div>
            <div className="bt-login-float float-two"><span>✦</span> Possibilities</div>
          </div>

          <div className="bt-login-role-palette" aria-label="BlueThink workspace color palette">
            <span className="bt-login-role-chip bt-login-role-admin">Admin <i /></span>
            <span className="bt-login-role-chip bt-login-role-hr">HR <i /></span>
            <span className="bt-login-role-chip bt-login-role-manager">Manager <i /></span>
            <span className="bt-login-role-chip bt-login-role-employee">Employee <i /></span>
          </div>

          <div className="bt-auth-hero-copy">
            <div className="bt-auth-hero-rule" aria-hidden="true"><span /></div>
            <p className="bt-auth-hero-eyebrow">PEOPLE. PURPOSE. PROGRESS.</p>
            <h1>Your next great day<br /><em>starts here.</em></h1>
            <p className="bt-auth-hero-description">A little more focus. A lot more possibility. One workspace for your team, your work and everything ahead.</p>
          </div>
          <footer className="bt-auth-hero-bottom">
            <span>BLUETHINK INC.</span>
            <span>THINK BEYOND <span aria-hidden="true">↗</span></span>
          </footer>
        </section>

        <section className="bt-auth-panel" aria-label="Employee sign in">
          <div className="bt-auth-panel-inner">
            <header className="bt-auth-panel-head">
              <BlueThinkWordmark />
              <div className="bt-auth-panel-head-tag"><span aria-hidden="true" /> WORKFORCE PORTAL</div>
            </header>

            <div className="bt-auth-form-wrap">
              <div className="bt-auth-intro">
                <p className="bt-auth-eyebrow"><span aria-hidden="true" /> YOUR COMPANY WORKSPACE</p>
                <h2>Welcome back<span>.</span></h2>
                <p>Sign in to continue to your BlueThink workspace.</p>
              </div>

              {sessionExpired && <p className="bt-auth-session-notice" role="status">Your session ended. Sign in again to continue.</p>}
              <form className="bt-auth-form" onSubmit={submit} aria-busy={loading}>
                {error && <div className="bt-auth-error" id="bt-login-error" role="alert">{error}</div>}

                <label className="bt-auth-field">
                  <span className="bt-auth-field-label">Employee ID</span>
                  <span className="bt-auth-input-wrap">
                    <UserIcon />
                    <input
                      value={userId}
                      onChange={(event) => setUserId(event.target.value)}
                      disabled={loading}
                      autoFocus
                      name="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-describedby={error ? "bt-login-error" : undefined}
                      autoComplete="username"
                      placeholder="Your employee ID"
                      aria-invalid={Boolean(error) && !userId.trim()}
                      required
                    />
                  </span>
                </label>

                <label className="bt-auth-field">
                  <span className="bt-auth-field-label">Password</span>
                  <span className="bt-auth-input-wrap">
                    <LockIcon />
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                      name="password"
                      aria-describedby={error ? "bt-login-error" : undefined}
                      autoComplete="current-password"
                      placeholder="Your password"
                      required
                    />
                    <button
                      className="bt-auth-reveal"
                      type="button"
                      onClick={() => setShowPass((value) => !value)}
                      disabled={loading}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      aria-pressed={showPass}
                    >
                      <EyeIcon hidden={showPass} />
                    </button>
                  </span>
                </label>

                <div className="bt-auth-actions"><Link to="/forgot-password">Forgot password?</Link></div>

                <button className="bt-auth-submit" type="submit" disabled={loading}>
                  {loading ? <><CircularProgress size={20} color="inherit" /><span role="status">{stage}</span></> : <><span>Sign in to workspace</span><span className="bt-auth-submit-icon"><ArrowIcon /></span></>}
                </button>

                <div className="bt-auth-location-note">
                  <span className="bt-auth-location-icon"><LockIcon /></span>
                  <p>Location is used at sign-in to verify your work mode. It is not tracked continuously.</p>
                </div>
              </form>
            </div>

            <footer className="bt-auth-panel-footer">
              <span>© {new Date().getFullYear()} BlueThink Inc.</span>
              <span>Authorized employees only</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
