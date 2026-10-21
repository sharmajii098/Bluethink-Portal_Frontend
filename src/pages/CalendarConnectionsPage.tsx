import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { authIdentity, errorText, safeProviderUrl } from "../utils/integrationForms";
type Connection = { provider: string; configured: boolean; status: string; lastSyncedAt?: string; message?: string };
type EventLink = { id: number; meetingId: number; provider: string; status: string; lastError?: string; syncedAt?: string };
export default function CalendarConnectionsPage() {
  const [connections,setConnections] = useState<Connection[]>([]); const [links,setLinks] = useState<EventLink[]>([]);
  const [message,setMessage] = useState(""); const [busy,setBusy] = useState(false); const [connecting,setConnecting] = useState(""); const role = authIdentity().role.toLowerCase();
  const load = async () => { try { const [a,b] = await Promise.all([api.get<Connection[]>("/calendar-integrations"),api.get<EventLink[]>("/calendar-integrations/events")]);setConnections(a.data);setLinks(b.data); } catch(e) {setMessage(errorText(e));} };
  useEffect(() => { void load(); }, []);
  const connect = async (provider:string, configured:boolean) => {
    setMessage("");
    if(!configured){setMessage(`Cannot connect ${provider} yet: an administrator must set its OAuth client ID, client secret, callback URL and calendar encryption key in the backend. See CALENDAR_CONNECTION_SETUP.md.`);return;}
    setBusy(true);setConnecting(provider);
    try {
    const {data} = await api.post<{authorizationUrl:string}>(`/calendar-integrations/${provider}/connect`, {}, {timeout: 15000});
    const url = safeProviderUrl(data.authorizationUrl); const state = url.searchParams.get("state");
    if (!state) throw new Error("Missing authorization state.");
    sessionStorage.setItem("bt_calendar_flow", JSON.stringify({state,provider,created:Date.now(),userId:authIdentity().userId}));
    window.location.assign(url.toString());
  } catch(e) {setMessage(`Could not start ${provider} connection: ${errorText(e)}. Check API connectivity, backend calendar settings and the provider callback URL.`);setBusy(false);setConnecting("");} };
  const disconnect = async (provider:string) => { if(!window.confirm("Disconnect this calendar? Existing copies in the external calendar will remain. You can revoke account consent in the provider settings."))return;setBusy(true);try{await api.delete(`/calendar-integrations/${provider}`);await load();}catch(e){setMessage(errorText(e));}finally{setBusy(false);} };
  const unselect=async(id:number)=>{if(!window.confirm("Stop syncing this meeting and remove only its BlueThink-managed calendar copy? Personal calendar entries will not be touched."))return;setBusy(true);setMessage("");try{await api.delete(`/calendar-integrations/events/${id}`);setMessage("Removal queued. Refresh to verify the copy was removed.");await load();}catch(e){setMessage(errorText(e));}finally{setBusy(false);}};
  const retry = async (id:number) => {setBusy(true);try{await api.post(`/calendar-integrations/events/${id}/retry`);setMessage("Synchronization queued. Refresh to see the worker result.");await load();}catch(e){setMessage(errorText(e));}finally{setBusy(false);} };
  return <Box><Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" gap={2} mb={3}><Box><Typography variant="h4" fontWeight={800}>Calendar connections</Typography><Typography color="text.secondary">Your own Google or Microsoft calendar, connected with your explicit consent.</Typography></Box><Button component={Link} to={`/${role}/hr-calendar`} variant="outlined">Organization calendar</Button></Stack>
    <Alert severity="info" sx={{mb:2}}>Connect a calendar with your consent, then choose a meeting in Organization Calendar. Only selected meetings sync one way; changes and cancellations update those copies. You can stop syncing an individual meeting below. No unrelated personal events are imported.</Alert>
    {message&&<Alert severity="warning" role="alert" sx={{mb:2}} onClose={()=>setMessage("")}>{message}</Alert>}{connecting&&<Alert severity="info" role="status" sx={{mb:2}}>Opening {connecting} authorization. If you are not redirected, check your browser and backend configuration.</Alert>}
    {!connections.length && <Alert severity="warning">Calendar provider status is unavailable. Check the backend service and refresh.</Alert>}
    <Stack spacing={2}>{connections.map(c=><Paper key={c.provider} sx={{p:3}}><Stack direction={{xs:"column",sm:"row"}} gap={2} justifyContent="space-between"><Box><Typography variant="h6" textTransform="capitalize">{c.provider}</Typography><Chip size="small" label={!c.configured?"ADMIN CONFIGURATION REQUIRED":c.status}/><Typography variant="body2" sx={{mt:1}}>{c.message||(!c.configured?"Ask your administrator to configure the provider registration and callback URI.":"Connect using the provider consent page. No provider password is collected here.")}</Typography>{c.lastSyncedAt&&<Typography variant="caption">Last successful sync: {new Date(c.lastSyncedAt).toLocaleString()}</Typography>}</Box><Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Button disabled={busy} variant="contained" onClick={()=>void connect(c.provider,c.configured)}>{busy&&connecting===c.provider?"Opening…":c.status==="CONNECTED"?"Reconnect":"Connect"}</Button>{c.status!=="DISCONNECTED"&&<Button disabled={busy} color="error" onClick={()=>void disconnect(c.provider)}>Disconnect</Button>}</Stack></Stack></Paper>)}</Stack>
    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3} mb={1}><Typography variant="h6">Selected meeting copies</Typography><Button onClick={()=>void load()} disabled={busy}>Refresh status</Button></Stack>
    {!links.length&&<Typography color="text.secondary">No meetings selected for synchronization.</Typography>}
    <Stack spacing={1}>{links.map(l=><Paper key={l.id} sx={{p:2}}><Stack direction={{xs:"column",sm:"row"}} gap={1} justifyContent="space-between"><Box><Typography>Meeting #{l.meetingId} / {l.provider}</Typography><Typography variant="body2">{l.lastError||l.status}</Typography></Box><Stack direction="row" gap={1} alignItems="center"><Chip label={l.status} size="small"/>{!["UNSUBSCRIBED","UNSUBSCRIBE_PENDING"].includes(l.status)&&<Button disabled={busy} color="error" onClick={()=>void unselect(l.id)}>Stop sync / remove copy</Button>}{["FAILED","RETRY","UNSUBSCRIBE_FAILED","UNSUBSCRIBE_RETRY"].includes(l.status)&&<Button disabled={busy} onClick={()=>void retry(l.id)}>Retry</Button>}</Stack></Stack></Paper>)}</Stack>
  </Box>;
}
