import { RequestModeBar } from "../pages/MyRequestsPage";
import BlueThinkWordmark from "./BlueThinkWordmark";
import { AiChatProvider } from "../contexts/AiChatContext";
import AiChatWidget from "./AiChatWidget";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";

import { ROLE_NAVIGATION, flattenNavigation } from "../config/navigation";
import { api } from "../services/api";
import { logout as apiLogout } from "../services/authService";
import {
  getTodayWorkSession,
  resumeWork,
  signOffWorkday,
  type WorkSession,
} from "../services/workSessionService";
import { logout } from "../store/authSlice";
import type { RootState } from "../store";
import type { Role } from "../types/auth";
import { readUiSettings } from "../utils/uiPreferences";

const ROLE_PORTAL_NAME: Record<Role, string> = {
  ADMIN: "Admin Portal",
  HR: "HR Portal",
  MANAGER: "Manager Portal",
  EMPLOYEE: "Employee Portal",
};

const ROLE_MARKS = {
  ADMIN: AdminPanelSettingsRoundedIcon,
  MANAGER: SupervisorAccountRoundedIcon,
  HR: Diversity3RoundedIcon,
  EMPLOYEE: BadgeRoundedIcon,
} as const;

const ROLE_COPY: Record<Role, string> = {
  ADMIN: "System administration",
  HR: "People operations",
  MANAGER: "Team leadership",
  EMPLOYEE: "Employee self-service",
};


export default function AppLayout() {
  const session = useSelector((state: RootState) => state.auth.session);
  // Remount conversation state on logout/account/role/token changes.
  return <AiChatProvider key={`${session?.userId}:${session?.role}:${session?.token}`}><PortalLayout /></AiChatProvider>;
}

function PortalLayout() {
  const session = useSelector((state: RootState) => state.auth.session);
  const role = (session?.role ?? "EMPLOYEE") as Role;
  const RoleMark = ROLE_MARKS[role] || BadgeRoundedIcon;
  const base = `/${role.toLowerCase()}`;
  const sections = ROLE_NAVIGATION[role] ?? ROLE_NAVIGATION.EMPLOYEE;

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [uiPreferences, setUiPreferences] = useState(readUiSettings);
  useEffect(() => {
    const sync = () => setUiPreferences(readUiSettings());
    window.addEventListener("hrms-settings-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("hrms-settings-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationPolling, setNotificationPolling] = useState(true);
  const [pollingSeconds, setPollingSeconds] = useState(30);
  const [workSession, setWorkSession] = useState<WorkSession | null>(null);
  const [signoffBusy, setSignoffBusy] = useState(false);
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffError, setSignoffError] = useState("");
  const [profileIdentity, setProfileIdentity] = useState<any>({
    fullName: session?.fullName,
    designation: session?.designation,
  });
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const flatItems = useMemo(() => flattenNavigation(sections), [sections]);
  const currentRelativePath = location.pathname.startsWith(`${base}/`)
    ? location.pathname.slice(base.length + 1)
    : "dashboard";

  const currentItem = useMemo(
    () => flatItems.find((item) => item.path === currentRelativePath),
    [flatItems, currentRelativePath]
  );

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];
    return flatItems
      .filter((item) =>
        `${item.label} ${item.group}`.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [flatItems, search]);

  const go = (path: string) => {
    navigate(`${base}/${path}`);
    setMobileOpen(false);
    setSearch("");
    setSearchOpen(false);
  };

  const isActive = (path?: string) => Boolean(path && currentRelativePath === path);

  const toggle = (label: string) => {
    setExpanded((current) =>
      current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label]
    );
  };

  useEffect(() => {
    const activeGroup = sections.find((section) =>
      section.children?.some((child) => child.path === currentRelativePath)
    );
    if (activeGroup) {
      setExpanded((current) =>
        current.includes(activeGroup.label)
          ? current
          : [...current, activeGroup.label]
      );
    }
  }, [currentRelativePath, sections]);

  useEffect(() => {
    const readSettings = () => {
      try {
        const raw = localStorage.getItem("hrms_ui_settings");
        const settings = raw ? JSON.parse(raw) : {};
        setNotificationPolling(settings.notificationPolling !== false);
        setPollingSeconds(Math.max(10, Number(settings.pollingSeconds) || 30));
      } catch {
        setNotificationPolling(true);
        setPollingSeconds(30);
      }
    };

    readSettings();
    window.addEventListener("hrms-settings-changed", readSettings);
    return () => window.removeEventListener("hrms-settings-changed", readSettings);
  }, []);

  useEffect(() => {
    let active = true;
    let abortController: AbortController | null = null;
    let fallbackTimer: number | undefined;
    let reconnectTimer: number | undefined;
    let reconnectAttempt = 0;

    const loadUnread = async () => {
      try {
        const response = await api.get("/notifications/unread-count");
        const count = Number(response.data?.count ?? 0);
        if (active && Number.isFinite(count)) {
          setUnreadNotifications(Math.max(0, count));
        }
      } catch (error) {
        console.warn("Unable to refresh notification count", error);
      }
    };

    const onCountRefresh = () => { void loadUnread(); };
    window.addEventListener("hrms-notifications-count-refresh", onCountRefresh);

    const startFallbackPolling = () => {
      if (!active || !notificationPolling || fallbackTimer) return;
      fallbackTimer = window.setInterval(loadUnread, Math.max(10, pollingSeconds) * 1000);
    };

    const scheduleReconnect = () => {
      if (!active) return;
      reconnectAttempt = Math.min(reconnectAttempt + 1, 6);
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt - 1));
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => void connectSse(), delay);
    };

    const connectSse = async () => {
      if (!active) return;
      if (abortController) abortController.abort();
      abortController = new AbortController();

      const token = sessionStorage.getItem("hrms_token");
      if (!token) {
        startFallbackPolling();
        return;
      }

      const baseUrl = String(api.defaults.baseURL || "/api").replace(/\/$/, "");
      const streamUrl = baseUrl.startsWith("http")
        ? `${baseUrl}/notifications/stream`
        : `${window.location.origin}${baseUrl}/notifications/stream`;

      try {
        const response = await fetch(streamUrl, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE connection failed (${response.status})`);
        }

        reconnectAttempt = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventName = "message";
        let dataLines: string[] = [];

        const handleEvent = (rawEvent: string) => {
          if (!rawEvent.trim()) return;
          let name = eventName || "message";
          const data = dataLines.join("\n");
          eventName = "message";
          dataLines = [];

          if (name !== "notification" || !data) return;
          try {
            const payload = JSON.parse(data);
            if (!payload?.id) return;
            setUnreadNotifications((current) => current + (payload.read ? 0 : 1));
            window.dispatchEvent(new CustomEvent("hrms-notification-received", { detail: payload }));
          } catch (error) {
            console.warn("Unable to parse notification SSE event", error);
          }
        };

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() || "";

          for (const block of blocks) {
            for (const line of block.split(/\r?\n/)) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
            }
            handleEvent(block);
          }
        }

        if (active) scheduleReconnect();
      } catch (error: any) {
        if (error?.name === "AbortError" || !active) return;
        console.warn("Notification SSE disconnected; using reconnect/fallback polling", error);
        startFallbackPolling();
        scheduleReconnect();
      }
    };

    // Load the authoritative count once, then keep it current through SSE.
    void loadUnread();
    void connectSse();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadUnread();
    };
    const refreshOnFocus = () => void loadUnread();
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      if (abortController) abortController.abort();
      window.removeEventListener("hrms-notifications-count-refresh", onCountRefresh);
      if (fallbackTimer) window.clearInterval(fallbackTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [role, notificationPolling, pollingSeconds]);

  useEffect(() => {
    let mounted = true;

    const loadProfileIdentity = async () => {
      try {
        const response = await api.get("/profile/me");
        if (!mounted) return;
        const data = response.data || {};
        setProfileIdentity(data);

        if (data.photoAvailable) {
          try {
            const photo = await api.get("/profile/me/photo", { responseType: "blob" });
            if (!mounted) return;
            const nextUrl = URL.createObjectURL(photo.data);
            setProfilePhotoUrl((old) => {
              if (old) URL.revokeObjectURL(old);
              return nextUrl;
            });
          } catch {
            if (mounted) setProfilePhotoUrl("");
          }
        } else {
          setProfilePhotoUrl((old) => {
            if (old) URL.revokeObjectURL(old);
            return "";
          });
        }
      } catch {
        if (mounted) {
          setProfileIdentity({ fullName: session?.fullName, designation: session?.designation });
        }
      }
    };

    void loadProfileIdentity();
    window.addEventListener("hrms-profile-updated", loadProfileIdentity);
    return () => {
      mounted = false;
      window.removeEventListener("hrms-profile-updated", loadProfileIdentity);
    };
  }, [session?.userId, session?.fullName, session?.designation]);

  useEffect(() => {
    return () => {
      if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
    };
  }, [profilePhotoUrl]);

  useEffect(() => {
    let active = true;
    const loadWorkSession = async () => {
      try {
        const data = await getTodayWorkSession();
        if (active) setWorkSession(data);
      } catch {
        if (active) setWorkSession(null);
      }
    };
    loadWorkSession();
    return () => { active = false; };
  }, [session?.userId]);

  const displayName = profileIdentity?.fullName || session?.fullName || session?.userId || "User";
  const displayDesignation = profileIdentity?.designation || session?.designation || role;
  const initials = String(displayName).trim().slice(0, 1).toUpperCase() || "U";

  async function doWorkAction() {
    setSignoffError("");
    setSignoffBusy(true);

    const shouldResume = workSession?.active === false;

    try {
      const data = shouldResume ? await resumeWork() : await signOffWorkday();
      setWorkSession(data);
      window.dispatchEvent(new Event("hrms-work-session-changed"));
      setSignoffOpen(true);
    } catch (error: any) {
      const responseData = error?.response?.data;
      if (responseData && typeof responseData === "object") {
        setWorkSession((current) => ({ ...current, ...responseData }));
      }
      setSignoffError(
        responseData?.message ||
          responseData?.error ||
          (shouldResume ? "Unable to resume work." : "Unable to record sign off.")
      );
      setSignoffOpen(true);
    } finally {
      setSignoffBusy(false);
    }
  }

  async function doLogout() {
    try {
      const raw = localStorage.getItem("hrms_ui_settings");
      const settings = raw ? JSON.parse(raw) : {};
      if (settings.confirmLogout && !window.confirm("Are you sure you want to logout?")) {
        return;
      }
    } catch {
      // Keep logout usable even if local UI settings are malformed.
    }

    try {
      await apiLogout();
    } catch {
      // The local session is authoritative when the server is unavailable.
    }

    dispatch(logout());
    navigate("/login", { replace: true });
  }

  return (
    <div className={`th-app bt-studio bt-studio-${role.toLowerCase()} bt27-density-${uiPreferences.density} bt27-width-${uiPreferences.contentWidth} bt27-text-${uiPreferences.textSize} ${uiPreferences.sidebarCompact ? "bt27-sidebar-slim" : ""}`} data-ui-version="27.0">
      <a className="bt-skip-link" href="#main-content">Skip to content</a>
      <button
        className={`th-overlay ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Close navigation"
      />

      <aside className={`th-sidebar ${mobileOpen ? "open" : ""}`}>
        <button className="th-brand bt-official-brand bt-wordmark-brand" onClick={() => go("dashboard")} aria-label="BlueThink Inc. - open dashboard" title={`${ROLE_PORTAL_NAME[role]} · BlueThink Inc.`}>
          <BlueThinkWordmark compact />
        </button>

        <div className="th-profile th-profile-v6">
          <Avatar src={profilePhotoUrl || undefined} className="th-profile-avatar">{initials}</Avatar>
          <div className="th-profile-info">
            <strong title={displayName}>{displayName}</strong>
            <small className="th-profile-designation" title={displayDesignation}>{displayDesignation}</small>
            <div className="th-profile-meta"><span>{session?.userId || "User"}</span><span className={`th-role-badge th-role-${role.toLowerCase()} bt-inline-role-badge`}><RoleMark fontSize="inherit" aria-hidden="true" />{role}</span></div>
          </div>
        </div>

        <div className="th-menu-label"><span>Explore</span></div>
        <nav className="th-menu" aria-label={`${role} navigation`}>
          {sections.map((section) => {
            if (section.path) {
              return (
                <button
                  key={section.label}
                  className={`th-nav-button ${isActive(section.path) ? "active" : ""}`}
                  aria-current={isActive(section.path) ? "page" : undefined}
                  onClick={() => go(section.path!)}
                >
                  <span className="th-nav-left">
                    {section.icon}
                    <span>{section.label}</span>
                  </span>
                </button>
              );
            }

            const groupActive = section.children?.some((child) => isActive(child.path));
            const open = expanded.includes(section.label);

            return (
              <div className={`th-nav-group ${groupActive ? "active-group" : ""}`} key={section.label}>
                <button
                  className={`th-nav-button ${groupActive ? "active" : ""}`}
                  onClick={() => toggle(section.label)}
                  aria-expanded={open}
                >
                  <span className="th-nav-left">
                    {section.icon}
                    <span>{section.label}</span>
                  </span>
                  <span className="bt-nav-group-end">{open ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}</span>
                </button>

                {open && (
                  <div className="th-submenu">
                    {section.children?.map((child) => (
                      <button
                        key={`${section.label}-${child.path}`}
                        className={`th-subnav ${isActive(child.path) ? "active" : ""}`}
                        aria-current={isActive(child.path) ? "page" : undefined}
                        onClick={() => go(child.path)}
                      >
                        <span>{child.label}</span>
                        {isActive(child.path) && <KeyboardArrowRightRoundedIcon fontSize="small" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="th-sidebar-footer"><span className="bt-sidebar-signature"><span className="bt-sidebar-footer-dot" aria-hidden="true" />{ROLE_COPY[role]}</span></div>
      </aside>

      <main className="th-main" id="main-content">
        <header className="th-topbar">
          <div className="th-top-left">
            <IconButton className="th-mobile-btn" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>

            <div className="th-page-context" style={currentRelativePath === "team-chat" ? { display: "none" } : undefined}>
              <small>{ROLE_PORTAL_NAME[role]} · {ROLE_COPY[role]}</small>
              <strong>{currentItem?.label || "BlueThink Inc. Workforce Portal"}</strong>
            </div>

            <div className="th-search-wrap">
              <div className="th-search">
                <SearchRoundedIcon />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchResults[0]) {
                      go(searchResults[0].path);
                    }
                  }}
                  placeholder="Search features..."
                  aria-label="Search portal features"
                />
              </div>

              {searchOpen && search.trim().length >= 2 && (
                <div className="th-search-results">
                  {searchResults.length ? (
                    searchResults.map((result) => (
                      <button key={`${result.group}-${result.path}`} onMouseDown={() => go(result.path)}>
                        <span>
                          <strong>{result.label}</strong>
                          <small>{result.group || "Workspace"}</small>
                        </span>
                        <KeyboardArrowRightRoundedIcon fontSize="small" />
                      </button>
                    ))
                  ) : (
                    <div className="th-search-empty">No matching feature found.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="th-top-right">
            <div className="th-date">
              <CalendarTodayRoundedIcon />
              <span>
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <IconButton
              onClick={() => go("notifications")}
              className="th-icon-btn"
              aria-label={`Notifications${unreadNotifications ? ` (${unreadNotifications} unread)` : ""}`}
            >
              <NotificationsNoneRoundedIcon />
              {unreadNotifications > 0 && (
                <span className="th-notification-badge">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </IconButton>

            <button className="th-user th-user-v6" onClick={(event) => setAnchor(event.currentTarget)}>
              <Avatar src={profilePhotoUrl || undefined}>{initials}</Avatar>
              <span className="th-user-copy">
                <strong>{displayName}</strong>
                <small>{displayDesignation}</small>
              </span>
              <ExpandMoreRoundedIcon />
            </button>

            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); go("profile"); }}>
                <PersonRoundedIcon fontSize="small" sx={{ mr: 1.2 }} />
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  void doWorkAction();
                }}
                disabled={signoffBusy}
                sx={{
                  color: workSession?.active === false ? "success.main" : "error.main",
                  fontWeight: 700,
                }}
              >
                {signoffBusy ? (
                  <CircularProgress size={17} sx={{ mr: 1.2 }} color="inherit" />
                ) : workSession?.active === false ? (
                  <PlayArrowRoundedIcon fontSize="small" sx={{ mr: 1.2 }} />
                ) : (
                  <AccessTimeRoundedIcon fontSize="small" sx={{ mr: 1.2 }} />
                )}
                {workSession?.active === false
                  ? (Number(workSession?.sessionCount || 0) > 0 ? "Resume Work" : "Start Work")
                  : "Sign Off"}
              </MenuItem>
              <MenuItem onClick={() => { setAnchor(null); go("working-hours"); }}>
                <AccessTimeRoundedIcon fontSize="small" sx={{ mr: 1.2 }} />
                Working Hours
              </MenuItem>
              <MenuItem onClick={() => { setAnchor(null); go("settings"); }}>
                <SettingsRoundedIcon fontSize="small" sx={{ mr: 1.2 }} />
                Settings
              </MenuItem>
              <MenuItem onClick={doLogout}>
                <LogoutRoundedIcon fontSize="small" sx={{ mr: 1.2 }} />
                Logout
              </MenuItem>
            </Menu>
          </div>
        </header>

        <div className="bt-workspace-trail"><div><span>{ROLE_PORTAL_NAME[role]}</span><span aria-hidden="true">/</span><strong>{currentItem?.label || "Workspace"}</strong></div><span className="bt-workspace-trail-caption">A little more clarity. A better workday.</span></div>
        <section className={`th-content th-content-${role.toLowerCase()}`}>
          <div className="th-page-shell">
            <RequestModeBar /><Outlet key={location.pathname} />
          </div>
        </section>
      </main>

      <AiChatWidget />
      <Dialog
        open={signoffOpen}
        onClose={() => setSignoffOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ className: "th-signoff-dialog" }}
      >
        <DialogTitle>
          {signoffError
            ? "Work Session"
            : workSession?.active
              ? "Work Resumed"
              : "Work Paused"}
        </DialogTitle>
        <DialogContent>
          {signoffError ? (
            <Alert severity="error">{signoffError}</Alert>
          ) : (
            <>
              <Alert severity={workSession?.active ? "success" : "info"} sx={{ mb: 2 }}>
                {workSession?.message ||
                  (workSession?.active
                    ? "Your work session is active again."
                    : "This work interval has been saved. You are still logged in to the BlueThink Inc. Workforce Portal.")}
              </Alert>
              <div className="th-signoff-summary th-signoff-summary-v5">
                <div><small>First Login</small><strong>{formatPortalTime(workSession?.firstLoginTime || workSession?.loginTime)}</strong></div>
                <div><small>Latest Sign Off</small><strong>{formatPortalTime(workSession?.signoffTime)}</strong></div>
                <div><small>Today's Total</small><strong>{formatWorkDuration(workSession?.workingMinutes, workSession?.workingHours)}</strong></div>
                <div><small>Remaining to 9h</small><strong>{formatWorkDuration(workSession?.remainingMinutes)}</strong></div>
              </div>
              {workSession?.previousDayUnfinished && <Alert severity="warning" sx={{ mb: 2 }}>A previous day's interval is missing a sign-off. You can resume today's work; the old interval is unverified and will auto-close 24 hours after it started.</Alert>}
              {workSession?.expiredUnverified && <Alert severity="warning" sx={{ mb: 2 }}>An unsigned interval expired after 24 hours and is shown as zero unverified working minutes. Contact HR if your attendance needs correction.</Alert>}
              <p className="th-signoff-note">
                You can <b>Sign Off and Resume Work multiple times in the same day</b>. Only active work intervals are added together, so a 4-hour interval plus a later 5-hour interval becomes 9 working hours. Sign Off never logs you out of the portal.
              </p>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignoffOpen(false)}>Close</Button>
          {!signoffError && workSession?.active === false && (
            <Button
              variant="outlined"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() => {
                setSignoffOpen(false);
                void doWorkAction();
              }}
            >
              Resume Work
            </Button>
          )}
          {!signoffError && (
            <Button variant="contained" onClick={() => { setSignoffOpen(false); go("working-hours"); }}>
              View Working Hours
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}


function formatPortalTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ");
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatWorkDuration(minutes?: number | null, hours?: number | null) {
  let total = Number(minutes ?? 0);
  if (!total && Number(hours ?? 0) > 0) total = Math.round(Number(hours) * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
