import { useEffect, useState } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import {
  NotificationsActiveRounded, RestartAltRounded, SettingsRounded,
  TimerRounded, TuneRounded,
} from "@mui/icons-material";
import { defaultUiSettings, readUiSettings, saveUiSettings, type UiSettings } from "../utils/uiPreferences";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UiSettings>(readUiSettings);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => { setSettings(readUiSettings()); setSaved(false); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function update<K extends keyof UiSettings>(key: K, value: UiSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }
  function save() { saveUiSettings(settings); setSaved(true); }
  function reset() { setSettings({ ...defaultUiSettings }); saveUiSettings(defaultUiSettings); setSaved(true); }

  return <div className="bt27-settings">
    <div className="th-page-header"><div>
      <h1><SettingsRounded sx={{ verticalAlign: "middle", mr: 1 }} />Settings</h1>
      <div className="th-breadcrumb">Preferences <span>›</span> Application settings</div>
    </div></div>
    <div className="bt27-settings-grid">
      <section className="th-card bt27-settings-card" aria-labelledby="bt-ui-title">
        <div className="role-card-head"><h3 id="bt-ui-title"><TuneRounded /> Display & layout</h3><span>Saved on this device</span></div>
        <p className="th-muted">Choose how spacious the portal feels. These options apply to Admin, HR, Manager and Employee pages without changing your data.</p>
        <label className="settings-field">Content width
          <select value={settings.contentWidth} onChange={(e) => update("contentWidth", e.target.value as UiSettings["contentWidth"])}>
            <option value="standard">Comfortable (recommended)</option><option value="wide">Wide dashboard</option>
          </select>
        </label>
        <label className="settings-field">Page density
          <select value={settings.density} onChange={(e) => update("density", e.target.value as UiSettings["density"])}>
            <option value="comfortable">Comfortable spacing</option><option value="compact">Compact spacing</option>
          </select>
        </label>
        <label className="settings-field">Text size
          <select value={settings.textSize} onChange={(e) => update("textSize", e.target.value as UiSettings["textSize"])}>
            <option value="normal">Standard</option><option value="large">Larger text</option>
          </select>
        </label>
        <FormControlLabel control={<Switch checked={settings.sidebarCompact} onChange={(e) => update("sidebarCompact", e.target.checked)} />} label="Use a narrower desktop sidebar" />
        <p className="th-muted">The BlueThink Inc. logo stays visible. On phones the menu always opens as a drawer.</p>
      </section>
      <section className="th-card bt27-settings-card" aria-labelledby="bt-notif-title">
        <div className="role-card-head"><h3 id="bt-notif-title"><NotificationsActiveRounded /> Notifications</h3><span>UI preference</span></div>
        <FormControlLabel control={<Switch checked={settings.notificationPolling} onChange={(e) => update("notificationPolling", e.target.checked)} />} label="Refresh notification badge automatically" />
        <p className="th-muted">When enabled, refresh the notification count in the background.</p>
        <label className="settings-field">Refresh interval
          <select disabled={!settings.notificationPolling} value={settings.pollingSeconds} onChange={(e) => update("pollingSeconds", Number(e.target.value))}>
            <option value={15}>Every 15 seconds</option><option value={30}>Every 30 seconds</option>
            <option value={60}>Every 60 seconds</option><option value={120}>Every 2 minutes</option>
          </select>
        </label>
      </section>
      <section className="th-card bt27-settings-card" aria-labelledby="bt-session-title">
        <div className="role-card-head"><h3 id="bt-session-title"><TimerRounded /> Session & display</h3><span>Local preference</span></div>
        <FormControlLabel control={<Switch checked={settings.confirmLogout} onChange={(e) => update("confirmLogout", e.target.checked)} />} label="Confirm before logout" />
        <label className="settings-field">Date format
          <select value={settings.dateFormat} onChange={(e) => update("dateFormat", e.target.value as UiSettings["dateFormat"])}>
            <option value="IN">Indian format</option><option value="ISO">ISO format</option>
          </select>
        </label>
      </section>
    </div>
    <div className="th-card bt27-settings-actions">
      <button className="th-primary" onClick={save}>Save Settings</button>
      <button className="th-outline" onClick={reset}><RestartAltRounded fontSize="small" /> Reset Defaults</button>
      {saved && <span className="status approved" role="status">Settings saved</span>}
    </div>
  </div>;
}
