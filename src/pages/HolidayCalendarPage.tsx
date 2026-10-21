import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField,
  Tooltip, Typography
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { api } from "../services/api";
import { getCurrentRole } from "../utils/authRole";

type Holiday = {
  id: number; holidayDate: string; name: string; description?: string;
  holidayType: string; location?: string; optionalHoliday?: boolean; active?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const labelOf = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const dateLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const emptyHoliday = { holidayDate: "", name: "", description: "", holidayType: "PUBLIC", location: "ALL", optionalHoliday: false, active: true };

function typeLabel(h: Holiday) {
  return h.optionalHoliday ? "OPTIONAL" : (h.holidayType || "PUBLIC").toUpperCase();
}
function chipColor(h: Holiday): "success" | "warning" | "info" {
  return h.optionalHoliday ? "warning" : h.holidayType === "COMPANY" ? "info" : "success";
}

export default function HolidayCalendarPage() {
  const role = getCurrentRole();
  const canManage = ["ADMIN", "HR"].includes(role);
  const today = new Date();
  const [month, setMonth] = useState(keyOf(today));
  const [items, setItems] = useState<Holiday[]>([]);
  const [selected, setSelected] = useState("");
  const [details, setDetails] = useState<Holiday | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState<any>(emptyHoliday);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const r = await api.get(canManage ? "/holidays/manage" : "/holidays");
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Unable to load holidays.");
    }
  };
  useEffect(() => { load(); }, [canManage]);

  const [year, monthNo] = month.split("-").map(Number);
  const yearItems = useMemo(() => items.filter(x => x.active !== false && String(x.holidayDate).startsWith(String(year))).sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)), [items, year]);
  const monthItems = useMemo(() => yearItems.filter(x => x.holidayDate?.startsWith(month)), [yearItems, month]);
  const map = useMemo(() => {
    const m: Record<number, Holiday[]> = {};
    monthItems.forEach(x => { const d = Number(x.holidayDate.slice(8, 10)); (m[d] ??= []).push(x); });
    return m;
  }, [monthItems]);
  const selectedItems = selected ? items.filter(x => x.holidayDate === selected && x.active !== false) : [];
  const first = new Date(year, monthNo - 1, 1).getDay();
  const count = new Date(year, monthNo, 0).getDate();
  const shift = (delta: number) => { const d = new Date(year, monthNo - 1 + delta, 1); setMonth(keyOf(d)); setSelected(""); };

  const openCreate = (date = "") => { setEditing(null); setForm({ ...emptyHoliday, holidayDate: date }); setOpen(true); };
  const openEdit = (h: Holiday) => { setEditing(h); setForm({ ...emptyHoliday, ...h }); setOpen(true); };
  const save = async () => {
    try {
      if (editing) await api.put(`/holidays/${editing.id}`, form);
      else await api.post("/holidays", form);
      setOpen(false); setEditing(null); setForm(emptyHoliday);
      setMsg(editing ? "Holiday updated successfully." : "Holiday added successfully.");
      await load();
    } catch (e: any) { setMsg(e?.response?.data?.message || "Unable to save holiday."); }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete this holiday?")) return;
    try { await api.delete(`/holidays/${id}`); setMsg("Holiday deleted successfully."); await load(); }
    catch (e: any) { setMsg(e?.response?.data?.message || "Unable to delete holiday."); }
  };

  return <Box>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={2} mb={3}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center"><CalendarMonthRoundedIcon/><Typography variant="h4" fontWeight={800}>Holiday Calendar</Typography></Stack>
        <Typography color="text.secondary">Organization holidays and optional holidays for employees.</Typography>
      </Box>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {canManage && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => openCreate()}>Add Holiday</Button>}
        <Button variant="outlined" startIcon={<TodayRoundedIcon />} onClick={() => setMonth(keyOf(today))}>Today</Button>
        <Button variant="outlined" onClick={load}>Refresh</Button>
      </Stack>
    </Stack>
    {msg && <Alert sx={{ mb: 2 }} severity="info" onClose={() => setMsg("")}>{msg}</Alert>}

    <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="stretch">
      <Card sx={{ flex: 1, minWidth: 0 }}><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <IconButton onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeftRoundedIcon/></IconButton>
          <Box textAlign="center"><Typography variant="h5" fontWeight={800}>{labelOf(month)}</Typography><Typography variant="caption" color="text.secondary">Click a holiday for full details</Typography></Box>
          <IconButton onClick={() => shift(1)} aria-label="Next month"><ChevronRightRoundedIcon/></IconButton>
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: .75 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x => <Box key={x} sx={{ p: 1, textAlign: "center" }}><Typography variant="caption" fontWeight={800}>{x}</Typography></Box>)}
          {Array.from({ length: first }).map((_, i) => <Box key={`b${i}`} sx={{ minHeight: { xs: 78, sm: 105 }, bgcolor: "action.hover", borderRadius: 2 }} />)}
          {Array.from({ length: count }, (_, i) => i + 1).map(d => {
            const date = `${month}-${pad(d)}`;
            const hs = map[d] || [];
            const isToday = date === `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
            const isSelected = date === selected;
            const weekend = [0,6].includes(new Date(year, monthNo - 1, d).getDay());
            return <Box key={date} onClick={() => { setSelected(date); if (hs[0]) setDetails(hs[0]); }} sx={{ minHeight: { xs: 78, sm: 105 }, p: { xs: .75, sm: 1 }, border: "1px solid", borderColor: isSelected ? "primary.main" : hs.length ? "success.light" : "divider", borderRadius: 2, cursor: "pointer", bgcolor: isSelected ? "primary.50" : hs.length ? "success.50" : weekend ? "action.hover" : "background.paper", transition: ".15s", "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2" fontWeight={800}>{d}</Typography>{isToday && <Chip size="small" color="primary" label="Today" sx={{ height: 20, fontSize: 10 }}/>}</Stack>
              <Stack spacing={.5} mt={.6}>{hs.slice(0,2).map(h => <Tooltip key={h.id} title={`${h.name} • ${typeLabel(h)} • ${h.location || "ALL"}`}><Chip size="small" color={chipColor(h)} label={h.name} onClick={(e) => { e.stopPropagation(); setDetails(h); }} sx={{ justifyContent:"flex-start", maxWidth:"100%", cursor:"pointer", "& .MuiChip-label": { overflow:"hidden", textOverflow:"ellipsis" } }}/></Tooltip>)}{hs.length>2 && <Typography variant="caption" color="text.secondary">+{hs.length-2} more</Typography>}</Stack>
            </Box>;
          })}
        </Box>
        <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap"><Chip size="small" color="success" label="Public"/><Chip size="small" color="info" label="Company"/><Chip size="small" color="warning" label="Optional"/><Chip size="small" variant="outlined" color="primary" label="Today"/></Stack>
      </CardContent></Card>

      <Card sx={{ width: { xs: "100%", lg: 390 } }}><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Box><Typography variant="h6" fontWeight={800}>All Holidays — {year}</Typography><Typography variant="caption" color="text.secondary">Complete organization holiday list</Typography></Box><Chip label={`${yearItems.length}`} /></Stack>
        <Stack spacing={1} sx={{ maxHeight: { lg: 520 }, overflowY: "auto", pr: .5 }}>
          {yearItems.map(h => <Card key={h.id} variant="outlined" onClick={() => { setMonth(h.holidayDate.slice(0,7)); setSelected(h.holidayDate); setDetails(h); }} sx={{ cursor:"pointer", "&:hover": { boxShadow: 2 } }}><CardContent sx={{ p:1.5, "&:last-child": { pb:1.5 } }}>
            <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start"><Box minWidth={0}><Typography fontWeight={750}>{h.name}</Typography><Typography variant="body2" color="text.secondary">{dateLabel(h.holidayDate)} • {h.location || "ALL"}</Typography>{h.description && <Typography variant="caption" color="text.secondary" sx={{ display:"block", mt:.25 }}>{h.description}</Typography>}</Box><Chip size="small" color={chipColor(h)} label={typeLabel(h)} /></Stack>
            {canManage && <Stack direction="row" spacing={1} mt={1}><Button size="small" startIcon={<EditRoundedIcon/>} onClick={e => { e.stopPropagation(); openEdit(h); }}>Edit</Button><Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon/>} onClick={e => { e.stopPropagation(); remove(h.id); }}>Delete</Button></Stack>}
          </CardContent></Card>)}
          {!yearItems.length && <Typography color="text.secondary">No holidays found for {year}.</Typography>}
        </Stack>
      </CardContent></Card>
    </Stack>

    <Card sx={{ mt: 2.5 }}><CardContent><Typography variant="h6" fontWeight={800}>Selected Date</Typography>{!selected ? <Typography color="text.secondary" mt={1}>Select a date on the calendar.</Typography> : <Stack spacing={1} mt={1}><Typography fontWeight={700}>{dateLabel(selected)}</Typography>{selectedItems.map(h => <Alert key={h.id} severity={h.optionalHoliday ? "warning" : "success"} action={canManage ? <Button color="inherit" size="small" onClick={() => openEdit(h)}>Edit</Button> : undefined}><strong>{h.name}</strong> — {typeLabel(h)} — {h.location || "ALL"}{h.description ? ` — ${h.description}` : ""}</Alert>)}{!selectedItems.length && <Typography color="text.secondary">No holiday on this date.</Typography>}{canManage && <Button variant="outlined" startIcon={<AddRoundedIcon/>} sx={{ alignSelf:"flex-start" }} onClick={() => openCreate(selected)}>Add Holiday on this date</Button>}</Stack>}</CardContent></Card>

    <Dialog open={!!details} onClose={() => setDetails(null)} fullWidth maxWidth="xs"><DialogTitle>Holiday Details</DialogTitle><DialogContent>{details && <Stack spacing={1.25} sx={{ pt: .5 }}><Typography variant="h6" fontWeight={800}>{details.name}</Typography><Typography><strong>Date:</strong> {dateLabel(details.holidayDate)}</Typography><Typography><strong>Type:</strong> {typeLabel(details)}</Typography><Typography><strong>Applicable To:</strong> {details.location || "ALL"}</Typography><Typography><strong>Status:</strong> {details.active === false ? "Inactive" : "Active"}</Typography>{details.description && <Typography><strong>Description:</strong> {details.description}</Typography>}</Stack>}</DialogContent><DialogActions><Button onClick={() => setDetails(null)}>Close</Button>{details && canManage && <Button variant="contained" startIcon={<EditRoundedIcon/>} onClick={() => { setDetails(null); openEdit(details); }}>Edit</Button>}</DialogActions></Dialog>

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editing ? "Edit Organization Holiday" : "Add Organization Holiday"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Holiday Date" type="date" InputLabelProps={{ shrink:true }} value={form.holidayDate} onChange={e=>setForm({...form,holidayDate:e.target.value})}/><TextField label="Holiday Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><TextField select label="Holiday Type" value={form.holidayType} onChange={e=>setForm({...form,holidayType:e.target.value})}><MenuItem value="PUBLIC">Public</MenuItem><MenuItem value="COMPANY">Company / Organization</MenuItem><MenuItem value="OPTIONAL">Optional</MenuItem></TextField><TextField label="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} helperText="Use ALL for organization-wide holidays."/><TextField label="Description" multiline minRows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><FormControlLabel control={<Switch checked={!!form.optionalHoliday} onChange={e=>setForm({...form,optionalHoliday:e.target.checked})}/>} label="Optional holiday"/><FormControlLabel control={<Switch checked={form.active!==false} onChange={e=>setForm({...form,active:e.target.checked})}/>} label="Active"/></Stack></DialogContent><DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={save} disabled={!form.holidayDate || !form.name.trim()}>Save Holiday</Button></DialogActions></Dialog>
  </Box>;
}
