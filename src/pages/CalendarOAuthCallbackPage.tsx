import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { authIdentity, errorText } from "../utils/integrationForms";
export default function CalendarOAuthCallbackPage() {
 const {provider} = useParams(); const started=useRef(false); const [busy,setBusy]=useState(true); const [error,setError]=useState("");
 const role=authIdentity().role.toLowerCase();
 useEffect(()=>{if(started.current)return;started.current=true;
  const query=new URLSearchParams(window.location.search);const state=query.get("state"),code=query.get("code"),denied=query.get("error");
  window.history.replaceState({},"",window.location.pathname); // OAuth values must not remain in browser URLs.
  const finish=async()=>{try{
   const flow=JSON.parse(sessionStorage.getItem("bt_calendar_flow")||"null");sessionStorage.removeItem("bt_calendar_flow");
   if(denied)throw new Error("Calendar consent was not granted. Return to connections and reconnect when ready.");
   if(!flow||!code||!state||flow.provider!==provider||flow.state!==state||Date.now()-flow.created>600000||flow.userId!==authIdentity().userId)throw new Error("Authorization expired or this tab changed accounts. Sign in and start the connection again.");
   await api.post(`/calendar-integrations/${provider}/complete`,{state,code});
  }catch(e){setError(errorText(e));}finally{setBusy(false);}};void finish();
 },[provider]);
 return <Box sx={{maxWidth:650,mx:"auto",my:8,p:2}}><Paper sx={{p:4}}><Stack spacing={2}><Typography variant="h5" fontWeight={800}>BlueThink calendar connection</Typography>{busy?<><CircularProgress/><Typography>Verifying authorization...</Typography></>:error?<Alert severity="error">{error}</Alert>:<Alert severity="success">Calendar connected. Choose portal meetings to synchronize.</Alert>}<Button component={Link} to={`/${role}/calendar-connections`} disabled={busy}>Return to calendar connections</Button></Stack></Paper></Box>;
}
