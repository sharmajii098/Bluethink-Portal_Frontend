import { useEffect, useState } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { NotificationsActiveRounded, RestartAltRounded, SettingsRounded, TimerRounded } from "@mui/icons-material";

const KEY="hrms_ui_settings";
type Settings={notificationPolling:boolean; pollingSeconds:number; confirmLogout:boolean; dateFormat:"IN"|"ISO"};
const defaults:Settings={notificationPolling:true,pollingSeconds:30,confirmLogout:false,dateFormat:"IN"};
export default function SettingsPage(){
 const [settings,setSettings]=useState<Settings>(defaults); const [saved,setSaved]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw)setSettings({...defaults,...JSON.parse(raw)});}catch{}},[]);
 function update<K extends keyof Settings>(k:K,v:Settings[K]){setSettings(s=>({...s,[k]:v}));setSaved(false);}
 function save(){localStorage.setItem(KEY,JSON.stringify(settings));window.dispatchEvent(new Event("hrms-settings-changed"));setSaved(true);}
 function reset(){setSettings(defaults);localStorage.setItem(KEY,JSON.stringify(defaults));window.dispatchEvent(new Event("hrms-settings-changed"));setSaved(true);}
 return <div><div className="th-page-header"><div><h1><SettingsRounded sx={{verticalAlign:"middle",mr:1}}/>Settings</h1><div className="th-breadcrumb">Preferences <span>›</span> Application settings</div></div></div>
 <div className="role-grid-2"><div className="th-card"><div className="role-card-head"><h3><NotificationsActiveRounded/> Notifications</h3><span>UI preference</span></div><FormControlLabel control={<Switch checked={settings.notificationPolling} onChange={e=>update("notificationPolling",e.target.checked)}/>} label="Refresh notification badge automatically"/><p className="th-muted">When enabled, the notification count is refreshed in the background.</p><label className="settings-field">Refresh interval<select disabled={!settings.notificationPolling} value={settings.pollingSeconds} onChange={e=>update("pollingSeconds",Number(e.target.value))}><option value={15}>Every 15 seconds</option><option value={30}>Every 30 seconds</option><option value={60}>Every 60 seconds</option><option value={120}>Every 2 minutes</option></select></label></div>
 <div className="th-card"><div className="role-card-head"><h3><TimerRounded/> Session & display</h3><span>Local preference</span></div><FormControlLabel control={<Switch checked={settings.confirmLogout} onChange={e=>update("confirmLogout",e.target.checked)}/>} label="Confirm before logout"/><label className="settings-field">Date format<select value={settings.dateFormat} onChange={e=>update("dateFormat",e.target.value as Settings["dateFormat"])}><option value="IN">Indian format</option><option value="ISO">ISO format</option></select></label></div></div>
 <div className="th-card"><div className="th-modal-actions" style={{justifyContent:"flex-start",gap:12}}><button className="th-primary" onClick={save}>Save Settings</button><button className="th-outline" onClick={reset}><RestartAltRounded fontSize="small"/> Reset Defaults</button>{saved&&<span className="status paid">Settings saved</span>}</div></div></div>;
}
