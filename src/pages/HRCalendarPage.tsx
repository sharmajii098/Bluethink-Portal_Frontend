import MeetingDeliveryDialog from "../components/MeetingDeliveryDialog";
import { Link } from "react-router-dom";
import { authIdentity, errorText } from "../utils/integrationForms";
import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography
} from "@mui/material";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

type Holiday = {
  id: number;
  holidayDate: string;
  name: string;
  description?: string;
  holidayType: string;
  location?: string;
  optionalHoliday?: boolean;
  active?: boolean;
};

type EventItem = { id: string; date: string; title: string; type: string; detail?: string };

const pad = (n: number) => String(n).padStart(2, "0");
const emptyHoliday = {
  holidayDate: "", name: "", description: "", holidayType: "PUBLIC", location: "ALL",
  optionalHoliday: false, active: true,
};

function monthKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function localDateText(value: string) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HRCalendarPage() {
  const role = getCurrentRole();
  const currentUser = authIdentity().userId;
  const [syncMeeting,setSyncMeeting] = useState<number|null>(null);
  const [syncProvider,setSyncProvider] = useState("google");
  const [actionBusy,setActionBusy] = useState(false);
  const canEdit = (m:any) => ["ADMIN","HR"].includes(role)||(role==="MANAGER"&&m.organizer===currentUser);
  const canManage = ["ADMIN", "HR"].includes(role);
  const canManageMeetings = ["ADMIN", "HR", "MANAGER"].includes(role);
  const today = new Date();
  const [month, setMonth] = useState(monthKey(today));
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [recurrence, setRecurrence] = useState("NONE");
  const [occurrences, setOccurrences] = useState(4);
  const [inviteOpen, setInviteOpen] = useState<number | null>(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [editingMeeting, setEditingMeeting] = useState<number | null>(null);
  const [meetingForm, setMeetingForm] = useState({title:"", startsAt:"", endsAt:"", meetingUrl:"", agenda:""});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState<any>(emptyHoliday);

  const load = async () => {
    setLoading(true); setMessage("");
    try {
      const holidayResponse = await api.get(canManage ? "/holidays/manage" : "/holidays");
      setHolidays(Array.isArray(holidayResponse.data) ? holidayResponse.data : []);
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "Unable to load organization holidays.");
      setHolidays([]);
    }
    const sources: [string, string, string[]][] = [
      ["MILESTONE", "/employee-milestones", ["milestoneDate", "date", "eventDate", "createdAt"]],
      ["LEAVE", canManage ? "/leaves" : role === "MANAGER" ? "/leaves/team" : "/leaves/my", ["startDate", "fromDate", "date"]],
      ["TRAINING", "/training", ["startDate", "trainingDate", "date"]],
    ];
    const out: EventItem[] = [];
    const results = await Promise.allSettled(sources.map(s => api.get(s[1])));
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      const raw = r.value.data;
      const rows = Array.isArray(raw) ? raw : (raw?.content || raw?.data || []);
      (Array.isArray(rows) ? rows : []).forEach((x: any, j: number) => {
        const date = sources[i][2].map(k => x?.[k]).find(Boolean);
        if (!date) return;
        const d = String(date).slice(0, 10);
        const title = x.name || x.title || x.milestoneType || x.trainingName || x.leaveType || sources[i][0];
        const detail = x.description || x.reason || x.employeeName || x.location || x.status || "";
        out.push({ id: `${sources[i][0]}-${x.id ?? j}-${d}`, date: d, title: String(title), type: sources[i][0], detail: String(detail) });
      });
    });
    setEvents(out); setLoading(false);
  };

  useEffect(() => { load(); }, [role]);
  useEffect(() => { let active=true; api.get(`/meetings?month=${month}`).then(r=>{if(active)setMeetings(Array.isArray(r.data)?r.data:[])}).catch(()=>{if(active)setMessage("Meeting calendar could not be loaded.")});return ()=>{active=false}; }, [month]);
  const refreshMeetings = async () => { const r=await api.get(`/meetings?month=${month}`);setMeetings(Array.isArray(r.data)?r.data:[]); };
  const saveMeeting = async () => { try {
    if (!meetingForm.title.trim() || !meetingForm.startsAt || !meetingForm.endsAt || !meetingForm.meetingUrl.trim()) {setMessage("Fill in the meeting title, start, end and URL.");return;}
    const data={...meetingForm,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,startsAt:new Date(meetingForm.startsAt).toISOString(),endsAt:new Date(meetingForm.endsAt).toISOString()};
    if(editingMeeting)await api.put(`/meetings/${editingMeeting}`,data);
    else if(recurrence!=="NONE") await api.post("/meetings/recurring",{meeting:data,frequency:recurrence,occurrences});
    else await api.post("/meetings",data);
    setMeetingOpen(false);setEditingMeeting(null);setRecurrence("NONE");setMessage("Meeting saved.");await refreshMeetings();
  }catch(e:any){setMessage(e?.response?.data?.message||"Unable to save meeting.");} };
  const editMeeting=(m:any)=>{setRecurrence("NONE");setEditingMeeting(m.id);setMeetingForm({title:m.title,startsAt:localInput(m.startsAt),endsAt:localInput(m.endsAt),meetingUrl:m.meetingUrl,agenda:m.agenda||""});setMeetingOpen(true);};
  const cancelMeeting=async(id:number)=>{if(!window.confirm("Cancel this meeting?"))return;try{await api.delete(`/meetings/${id}`);await refreshMeetings();}catch{setMessage("Could not cancel meeting.");}};
  const downloadInvite=async(id:number)=>{
    try { const response=await api.get(`/meetings/${id}/invite.ics`,{responseType:"blob"});
      const url=URL.createObjectURL(new Blob([response.data],{type:"text/calendar"}));
      const anchor=document.createElement("a");anchor.href=url;anchor.download=`bluethink-meeting-${id}.ics`;
      document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
    }catch{setMessage("Calendar invitation download failed.");}
  };
  const sendInvites=async()=>{
    if(inviteOpen===null)return;
    const recipients=Array.from(new Set(inviteEmails.split(/[;,\n]+/).map(e=>e.trim()).filter(Boolean)));
    if(recipients.length<1||recipients.length>30){setMessage("Enter 1 to 30 email addresses.");return;}
    try{const r=await api.post(`/meetings/${inviteOpen}/send-invitations`,{recipients});setMessage(`${r.data.queued} invitation(s) queued. Delivery is tracked separately.`);setInviteOpen(null);setInviteEmails("");}
    catch(e:any){setMessage(e?.response?.data?.message||"Could not send invitations. Check SMTP settings.");}
  };
  const selectSync=async()=>{if(syncMeeting===null)return;setActionBusy(true);try{await api.post(`/calendar-integrations/${syncProvider}/meetings/${syncMeeting}`);setSyncMeeting(null);setMessage("Synchronization queued. See Calendar Connections for the result.");}catch(e){setMessage(errorText(e));}finally{setActionBusy(false);}};
  const cancelSeries=async(seriesId:string)=>{if(!window.confirm("Cancel all upcoming occurrences in this meeting series?"))return;setActionBusy(true);try{const r=await api.delete(`/meetings/series/${seriesId}`);setMessage(`${r.data.cancelled} upcoming occurrence(s) cancelled.`);await refreshMeetings();}catch(e){setMessage(errorText(e));}finally{setActionBusy(false);}};
  function localInput(s:string){const d=new Date(s);const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}


  const [year, monthNumber] = month.split("-").map(Number);
  const monthHolidays = useMemo(() => holidays
    .filter(h => h.active !== false && h.holidayDate?.startsWith(month))
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)), [holidays, month]);
  const holidayMap = useMemo(() => {
    const map: Record<number, Holiday[]> = {};
    monthHolidays.forEach(h => { const d = Number(h.holidayDate.slice(8, 10)); (map[d] ??= []).push(h); });
    return map;
  }, [monthHolidays]);
  const meetingEvents:EventItem[] = useMemo(()=>meetings.filter(m=>m.status!=="CANCELLED").map(m=>({id:`MEETING-${m.id}`,date:localInput(m.startsAt).slice(0,10),title:m.title,type:"MEETING",detail:m.agenda||""})),[meetings]);
  const eventMap = useMemo(() => {
    const map: Record<number, EventItem[]> = {};
    [...events,...meetingEvents].filter(e => e.date.startsWith(month)).forEach(e => {
      const d = Number(e.date.slice(8, 10)); (map[d] ??= []).push(e);
    });
    return map;
  }, [events, meetingEvents, month]);
  const calendarCells = useMemo(() => {
    const first = new Date(year, monthNumber - 1, 1).getDay();
    const count = new Date(year, monthNumber, 0).getDate();
    return { first, count };
  }, [year, monthNumber]);
  const selectedHoliday = selectedDate ? holidays.filter(h => h.holidayDate === selectedDate && h.active !== false) : [];
  const selectedEvents = selectedDate ? [...events,...meetingEvents].filter(e => e.date === selectedDate) : [];

  const shift = (delta: number) => {
    const d = new Date(year, monthNumber - 1 + delta, 1);
    setMonth(monthKey(d)); setSelectedDate("");
  };
  const openCreate = (date = "") => {
    setEditing(null); setForm({ ...emptyHoliday, holidayDate: date }); setOpen(true);
  };
  const openEdit = (holiday: Holiday) => { setEditing(holiday); setForm({ ...emptyHoliday, ...holiday }); setOpen(true); };
  const saveHoliday = async () => {
    try {
      if (editing) await api.put(`/holidays/${editing.id}`, form);
      else await api.post("/holidays", form);
      setOpen(false); setEditing(null); setForm(emptyHoliday);
      setMessage(editing ? "Holiday updated successfully." : "Holiday added successfully.");
      await load();
    } catch (e: any) {
      setMessage(e?.response?.data?.message || "Unable to save holiday.");
    }
  };
  const removeHoliday = async (id: number) => {
    if (!window.confirm("Delete this holiday?")) return;
    try { await api.delete(`/holidays/${id}`); setMessage("Holiday deleted successfully."); await load(); }
    catch (e: any) { setMessage(e?.response?.data?.message || "Unable to delete holiday."); }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={2} mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthRoundedIcon />
            <Typography variant="h4" fontWeight={800}>Organization Calendar</Typography>
          </Stack>
          <Typography color="text.secondary">One live calendar for organization holidays, leave, milestones and learning events.</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {canManage && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openCreate()}>Add Holiday</Button>}
          {canManageMeetings && <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={()=>{setEditingMeeting(null);setRecurrence("NONE");setMeetingForm({title:"",startsAt:"",endsAt:"",meetingUrl:"",agenda:""});setMeetingOpen(true)}}>Schedule meeting</Button>}
          <Button variant="outlined" onClick={() => setMonth(monthKey(today))} startIcon={<TodayRoundedIcon />}>Today</Button>
          <Button component={Link} variant="outlined" to={`/${role.toLowerCase()}/calendar-connections`}>Calendar connections</Button><Button variant="outlined" onClick={load}>Refresh</Button>
        </Stack>
      </Stack>
      <Card sx={{mb:2}}><CardContent><Typography variant="h6" fontWeight={800} mb={1}>Scheduled meetings</Typography><Stack gap={1}>{meetings.filter(m=>m.status!=="CANCELLED").length===0?<Typography color="text.secondary">No meetings scheduled this month.</Typography>:meetings.filter(m=>m.status!=="CANCELLED").map(m=><Stack key={m.id} direction={{xs:"column",sm:"row"}} alignItems={{sm:"center"}} justifyContent="space-between" gap={1} sx={{py:1,borderBottom:"1px solid",borderColor:"divider"}}><Box><Typography fontWeight={700}>{m.title}</Typography><Typography variant="body2" color="text.secondary">{new Date(m.startsAt).toLocaleString("en-IN")} – {new Date(m.endsAt).toLocaleTimeString("en-IN")} · {m.organizer}</Typography></Box><Stack direction="row" gap={1} flexWrap="wrap"><Button size="small" component="a" href={m.meetingUrl} target="_blank" rel="noopener noreferrer">Join</Button><Button size="small" onClick={()=>void downloadInvite(m.id)}>Calendar (.ics)</Button><Button size="small" onClick={()=>setSyncMeeting(m.id)}>Sync to my calendar</Button>{canEdit(m)&&<><Button size="small" onClick={()=>{setInviteOpen(m.id);setInviteEmails("");}}>Invites / reminders</Button><Button size="small" onClick={()=>editMeeting(m)}>Edit</Button><Button size="small" color="error" onClick={()=>void cancelMeeting(m.id)}>Cancel</Button>{m.seriesId&&<Button size="small" color="error" disabled={actionBusy} onClick={()=>void cancelSeries(m.seriesId)}>Cancel future series</Button>}</>}</Stack></Stack>)}</Stack></CardContent></Card>
      <Dialog open={meetingOpen} onClose={()=>setMeetingOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editingMeeting?"Edit meeting":"Schedule meeting"}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}><TextField label="Meeting title" fullWidth value={meetingForm.title} inputProps={{maxLength:160}} onChange={e=>setMeetingForm(s=>({...s,title:e.target.value}))}/><TextField label="Start" type="datetime-local" InputLabelProps={{shrink:true}} value={meetingForm.startsAt} onChange={e=>setMeetingForm(s=>({...s,startsAt:e.target.value}))}/><TextField label="End" type="datetime-local" InputLabelProps={{shrink:true}} value={meetingForm.endsAt} onChange={e=>setMeetingForm(s=>({...s,endsAt:e.target.value}))}/><TextField label="HTTPS meeting link" value={meetingForm.meetingUrl} onChange={e=>setMeetingForm(s=>({...s,meetingUrl:e.target.value}))}/><TextField label="Agenda" multiline minRows={2} value={meetingForm.agenda} inputProps={{maxLength:1200}} onChange={e=>setMeetingForm(s=>({...s,agenda:e.target.value}))}/>{!editingMeeting&&<><TextField select label="Repeat" value={recurrence} onChange={e=>setRecurrence(e.target.value)}><MenuItem value="NONE">One time</MenuItem><MenuItem value="DAILY">Daily</MenuItem><MenuItem value="WEEKLY">Weekly</MenuItem><MenuItem value="MONTHLY">Monthly</MenuItem></TextField>{recurrence!=="NONE"&&<TextField label="Number of meetings (2–52)" type="number" value={occurrences} inputProps={{min:2,max:52}} onChange={e=>setOccurrences(Math.min(52,Math.max(2,Number(e.target.value)||2)))}/>}</>}</Stack></DialogContent><DialogActions><Button onClick={()=>setMeetingOpen(false)}>Close</Button><Button variant="contained" onClick={()=>void saveMeeting()}>Save meeting</Button></DialogActions></Dialog>
      <MeetingDeliveryDialog meetingId={inviteOpen} onClose={()=>setInviteOpen(null)}/>
      <Dialog open={syncMeeting!==null} onClose={()=>setSyncMeeting(null)} fullWidth maxWidth="sm"><DialogTitle>Sync this meeting to my calendar</DialogTitle><DialogContent><Stack spacing={2} mt={1}><Typography>Only this portal meeting is copied. Its future updates and cancellation are synchronized automatically. This does not send external guest invitations.</Typography><TextField select label="Connected provider" value={syncProvider} onChange={e=>setSyncProvider(e.target.value)}><MenuItem value="google">Google Calendar</MenuItem><MenuItem value="microsoft">Microsoft Outlook</MenuItem></TextField><Button component={Link} to={`/${role.toLowerCase()}/calendar-connections`}>Manage my calendar connections</Button></Stack></DialogContent><DialogActions><Button onClick={()=>setSyncMeeting(null)} disabled={actionBusy}>Cancel</Button><Button disabled={actionBusy} onClick={()=>void selectSync()}>Queue synchronization</Button></DialogActions></Dialog>
      {message && <Alert sx={{ mb: 2 }} severity="info" onClose={() => setMessage("")}>{message}</Alert>}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="stretch">
        <Card sx={{ flex: 1, minWidth: 0 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <IconButton onClick={() => shift(-1)}><ChevronLeftRoundedIcon /></IconButton>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight={800}>{monthLabel(month)}</Typography>
                <Typography variant="caption" color="text.secondary">Click a date to view holiday details</Typography>
              </Box>
              <IconButton onClick={() => shift(1)}><ChevronRightRoundedIcon /></IconButton>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 0.75 }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <Box key={day} sx={{ p: 1, textAlign: "center" }}><Typography variant="caption" fontWeight={800}>{day}</Typography></Box>
              ))}
              {Array.from({ length: calendarCells.first }).map((_, i) => <Box key={`blank-${i}`} sx={{ minHeight: { xs: 78, sm: 105 }, borderRadius: 2, bgcolor: "action.hover" }} />)}
              {Array.from({ length: calendarCells.count }, (_, i) => i + 1).map(day => {
                const date = `${month}-${pad(day)}`;
                const hs = holidayMap[day] || [];
                const es = eventMap[day] || [];
                const isToday = date === `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                const isSelected = date === selectedDate;
                const weekend = [0, 6].includes(new Date(year, monthNumber - 1, day).getDay());
                return (
                  <Box key={date} onClick={() => setSelectedDate(date)} sx={{
                    minHeight: { xs: 78, sm: 105 }, p: { xs: 0.75, sm: 1 }, border: "1px solid",
                    borderColor: isSelected ? "primary.main" : hs.length ? "success.light" : "divider",
                    borderRadius: 2, cursor: "pointer", bgcolor: isSelected ? "primary.50" : hs.length ? "success.50" : weekend ? "action.hover" : "background.paper",
                    position: "relative", overflow: "hidden", transition: "0.15s", "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" }
                  }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight={800}>{day}</Typography>
                      {isToday && <Chip size="small" label="Today" color="primary" sx={{ height: 20, fontSize: 10 }} />}
                    </Stack>
                    <Stack spacing={0.5} mt={0.6}>
                      {hs.slice(0, 2).map(h => <Chip key={h.id} size="small" color={h.optionalHoliday ? "warning" : "success"} label={h.name} sx={{ justifyContent: "flex-start", maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />)}
                      {es.slice(0, Math.max(0, 2 - hs.length)).map(e => <Chip key={e.id} size="small" variant="outlined" label={e.title} sx={{ justifyContent: "flex-start", maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />)}
                      {hs.length + es.length > 2 && <Typography variant="caption" color="text.secondary">+{hs.length + es.length - 2} more</Typography>}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
            <Stack direction="row" spacing={2} mt={2} flexWrap="wrap">
              <Chip size="small" color="success" label="Organization / Public Holiday" />
              <Chip size="small" color="warning" label="Optional Holiday" />
              <Chip size="small" variant="outlined" label="Other HR Event" />
              <Chip size="small" variant="outlined" label="Today" color="primary" />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ width: { xs: "100%", lg: 370 } }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box><Typography variant="h6" fontWeight={800}>Holidays</Typography><Typography variant="caption" color="text.secondary">{monthLabel(month)}</Typography></Box>
              <Chip label={`${monthHolidays.length}`} />
            </Stack>
            <Stack spacing={1.25}>
              {monthHolidays.map(h => (
                <Card key={h.id} variant="outlined" sx={{ cursor: "pointer" }} onClick={() => setSelectedDate(h.holidayDate)}>
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" gap={1}>
                      <Box>
                        <Typography fontWeight={750}>{h.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{localDateText(h.holidayDate)} • {h.location || "ALL"}</Typography>
                        {h.description && <Typography variant="caption" color="text.secondary">{h.description}</Typography>}
                      </Box>
                      <Chip size="small" color={h.optionalHoliday ? "warning" : "success"} label={h.optionalHoliday ? "Optional" : h.holidayType} />
                    </Stack>
                    {canManage && <Stack direction="row" spacing={1} mt={1}><Button size="small" onClick={(e) => { e.stopPropagation(); openEdit(h); }}>Edit</Button><Button size="small" color="error" onClick={(e) => { e.stopPropagation(); removeHoliday(h.id); }}>Delete</Button></Stack>}
                  </CardContent>
                </Card>
              ))}
              {!monthHolidays.length && <Typography color="text.secondary">No organization/public holidays in this month.</Typography>}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ mt: 2.5 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} mb={1}>Selected Date</Typography>
          {!selectedDate ? <Typography color="text.secondary">Select a date on the calendar.</Typography> : (
            <Stack spacing={1}>
              <Typography fontWeight={700}>{localDateText(selectedDate)}</Typography>
              {selectedHoliday.map(h => <Alert key={h.id} severity={h.optionalHoliday ? "warning" : "success"} action={canManage ? <Button color="inherit" size="small" onClick={() => openEdit(h)}>Edit</Button> : undefined}><strong>{h.name}</strong>{h.description ? ` — ${h.description}` : ""}</Alert>)}
              {selectedEvents.map(e => <Alert key={e.id} severity="info"><strong>{e.title}</strong>{e.detail ? ` — ${e.detail}` : ""}</Alert>)}
              {!selectedHoliday.length && !selectedEvents.length && <Typography color="text.secondary">No event recorded for this date.</Typography>}
              {canManage && <Button variant="outlined" startIcon={<AddRoundedIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => openCreate(selectedDate)}>Add Holiday on this date</Button>}
            </Stack>
          )}
        </CardContent>
      </Card>

      {loading && <Typography color="text.secondary" sx={{ mt: 2 }}>Loading calendar…</Typography>}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Organization Holiday" : "Add Organization Holiday"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Holiday Date" type="date" InputLabelProps={{ shrink: true }} value={form.holidayDate} onChange={e => setForm({ ...form, holidayDate: e.target.value })} />
          <TextField label="Holiday Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <TextField select label="Holiday Type" value={form.holidayType} onChange={e => setForm({ ...form, holidayType: e.target.value })}><MenuItem value="PUBLIC">Public</MenuItem><MenuItem value="COMPANY">Company / Organization</MenuItem><MenuItem value="OPTIONAL">Optional</MenuItem></TextField>
          <TextField label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} helperText="Use ALL for organization-wide holidays." />
          <TextField label="Description" multiline minRows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <FormControlLabel control={<Switch checked={!!form.optionalHoliday} onChange={e => setForm({ ...form, optionalHoliday: e.target.checked })} />} label="Optional holiday" />
          <FormControlLabel control={<Switch checked={form.active !== false} onChange={e => setForm({ ...form, active: e.target.checked })} />} label="Active" />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={saveHoliday} disabled={!form.holidayDate || !form.name}>Save Holiday</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
