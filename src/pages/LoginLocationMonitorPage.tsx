import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { api } from "../services/api";
import { businessToday, mapLinks, summarizeLocations, type LoginLocation, type LocationSummary } from "../utils/loginLocations";
import "../styles/login-locations.css";
const fmt = (v?: string) => !v || Number.isNaN(new Date(v).getTime()) ? "—" : new Date(v).toLocaleString("en-IN", {dateStyle:"medium", timeStyle:"short"});
export default function LoginLocationMonitorPage() {
  const [rows, setRows] = useState<LoginLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [day, setDay] = useState(businessToday);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("ALL");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loadedMap, setLoadedMap] = useState<string | null>(null);
  const [history, setHistory] = useState<LocationSummary | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    api.get<LoginLocation[]>("/login-locations/visible", {signal: controller.signal, params: {date: day}})
      .then(r => { if (!controller.signal.aborted) setRows(Array.isArray(r.data) ? r.data : []); })
      .catch(e => { if (!controller.signal.aborted) {setRows([]); setError(e?.response?.data?.message || "Unable to load login locations. Try again.");} })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, day]);
  const people = useMemo(() => summarizeLocations(rows, day, query, mode), [rows, day, query, mode]);
  const active = people.find(p => p.latest.employeeId === selected) || people[0];
  const links = active ? mapLinks(active.latest) : null;
  const mapKey = active ? `${active.latest.id}:${active.latest.loginTime}` : "";
  return <Box className="bt-location-page">
    <div className="th-page-header"><div><h1>Work locations</h1><p className="th-muted">One summary per person, per day. A sign-in snapshot, not live tracking.</p></div>
      <Button startIcon={<RefreshRoundedIcon/>} onClick={() => setRefresh(x => x + 1)} disabled={loading}>Refresh</Button></div>
    <Stack direction={{xs:"column",sm:"row"}} gap={2} sx={{mb:3}}>
      <TextField label="Search employee" value={query} onChange={e => setQuery(e.target.value)} sx={{flex:1}}/>
      <TextField label="Login date (India)" type="date" value={day} onChange={e => {if(e.target.value)setDay(e.target.value); setLoadedMap(null);}} slotProps={{inputLabel:{shrink:true}}}/>
      <TextField select label="Work mode" value={mode} onChange={e => setMode(e.target.value)} sx={{minWidth:150}}><MenuItem value="ALL">All locations</MenuItem><MenuItem value="WFO">Office</MenuItem><MenuItem value="WFH">Remote</MenuItem></TextField>
    </Stack>
    {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    {loading ? <Box role="status" sx={{p:5,textAlign:"center"}}><CircularProgress size={26}/><Typography>Loading work locations…</Typography></Box> : !people.length ? <div className="bt-location-empty"><LocationOnRoundedIcon/><h2>No matching sign-ins</h2><p>Choose another date or clear the filters.</p></div> :
      <div className="bt-location-grid"><section className="bt-location-list" aria-label="Employee sign-in summaries">
        <div className="bt-location-list-title"><strong>{people.length} {people.length === 1 ? "person" : "people"}</strong><span>First sign-in · latest work mode</span></div>
        {people.map(person => <button key={person.latest.employeeId} className={`bt-location-person ${active?.latest.employeeId === person.latest.employeeId ? "selected" : ""}`} aria-pressed={active?.latest.employeeId === person.latest.employeeId} onClick={() => {setSelected(person.latest.employeeId); setLoadedMap(null);}}>
          <span className="bt-location-avatar">{(person.latest.employeeName || person.latest.employeeId).charAt(0)}</span><span className="bt-location-person-copy"><strong>{person.latest.employeeName || person.latest.employeeId}</strong><small>{person.latest.employeeId} · {fmt(person.first.loginTime)}</small></span><Chip size="small" label={person.latest.workMode}/>
        </button>)}
      </section><section className="bt-location-detail" aria-label="Selected employee location">
        {active && <><Stack direction="row" justifyContent="space-between" gap={2}><div><Typography variant="h6" fontWeight={700}>{active.latest.employeeName || active.latest.employeeId}</Typography><Typography variant="body2" color="text.secondary">Last recorded sign-in: {fmt(active.latest.loginTime)}</Typography></div><LocationOnRoundedIcon color="primary"/></Stack>
          <div className="bt-location-map">{links && loadedMap === mapKey ? <iframe title={`Recorded login location for ${active.latest.employeeName || active.latest.employeeId}`} src={links.embed} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups"/> : <div className="bt-location-map-placeholder"><LocationOnRoundedIcon/><strong>{links ? "View recorded location" : "Location unavailable"}</strong><p>{links ? "Load OpenStreetMap to see this sign-in. Coordinates are sent to the map provider when you open it." : "This record has no valid coordinates."}</p>{links && <Button variant="contained" onClick={() => setLoadedMap(mapKey)}>Load map</Button>}</div>}</div>
          <div className="bt-location-facts"><div><small>First sign-in</small><strong>{fmt(active.first.loginTime)}</strong></div><div><small>Latest work mode</small><strong>{active.latest.workMode}</strong></div><div><small>Distance from office</small><strong>{typeof active.latest.distanceFromOffice === "number" && Number.isFinite(active.latest.distanceFromOffice) ? `${Math.round(active.latest.distanceFromOffice).toLocaleString()} m` : "Unknown"}</strong></div><div><small>Location accuracy</small><strong>{typeof active.latest.accuracyMeters === "number" ? `± ${Math.round(active.latest.accuracyMeters)} m` : "Not recorded"}</strong></div></div>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{mt:2}}><Button onClick={() => setHistory(active)}>View {active.count} sign-in{active.count === 1 ? "" : "s"}</Button>{links && <Button component="a" href={links.full} target="_blank" rel="noopener noreferrer">Open larger map ↗</Button>}</Stack>
        </>}
      </section></div>}
    <Dialog open={Boolean(history)} onClose={() => setHistory(null)} fullWidth maxWidth="sm"><DialogTitle>Sign-in history · {history?.latest.employeeName || history?.latest.employeeId}</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" sx={{mb:2}}>Audit events for {day}. Repeated sign-ins stay here instead of adding duplicate employee cards.</Typography>{rows.filter(row => row.employeeId === history?.latest.employeeId && (row.loginDate || row.loginTime.slice(0,10)) === day).sort((a,b) => b.loginTime.localeCompare(a.loginTime)).map(row => <Stack key={row.id} direction="row" justifyContent="space-between" gap={2} sx={{py:1.5,borderBottom:"1px solid",borderColor:"divider"}}><Typography>{fmt(row.loginTime)}</Typography><Chip size="small" label={row.workMode}/></Stack>)}<Button sx={{mt:2}} onClick={() => setHistory(null)}>Close history</Button></DialogContent></Dialog>
  </Box>;
}
