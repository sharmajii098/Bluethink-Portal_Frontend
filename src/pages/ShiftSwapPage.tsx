import { useSelfService } from "../contexts/RequestViewContext";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { api } from "../services/api";

type ShiftSummary = { assignmentId: number; userId: string; employeeName: string; date: string; shiftId: number; shiftName: string; startTime: string; endTime: string; status: string };
type OwnAssignment = { id: number; shiftDate: string; status: string; shift?: { id: number; name: string; startTime: string; endTime: string } };
type Swap = { id: number; requestNumber: string; requesterUserId: string; requesterName: string; targetUserId: string; targetName: string; requesterDate: string; targetDate: string; requesterShift: string; targetShift: string; reason: string; status: string; targetConsentStatus?: string; targetConsentComment?: string; reviewerComment?: string };

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const blankForm = () => ({ targetUserId: "", requesterDate: "", targetDate: "", reason: "" });
const errorText = (e: any, fallback: string) => {
  const data = e?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  return data?.detail || data?.message || data?.error || fallback;
};

function asArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.content)) return payload.content as T[];
  if (Array.isArray(payload?.data)) return payload.data as T[];
  if (Array.isArray(payload?.data?.content)) return payload.data.content as T[];
  if (Array.isArray(payload?.rows)) return payload.rows as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.results)) return payload.results as T[];
  return [];
}

export default function ShiftSwapPage() {
 const selfService = useSelfService();
  const session = useSelector((state: RootState) => state.auth.session);
  const role = session?.role || "EMPLOYEE", userId = session?.userId || "";
  const management=!selfService && ["ADMIN","HR","MANAGER"].includes(role);
  const [items, setItems] = useState<Swap[]>([]);
  const [reviewableIds, setReviewableIds] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false), [q, setQ] = useState("");
  const [form, setForm] = useState(blankForm);
  const [ownAssignments, setOwnAssignments] = useState<OwnAssignment[]>([]);
  const [ownBusy, setOwnBusy] = useState(false);
  const [eligible, setEligible] = useState<ShiftSummary[]>([]);
  const [eligibleBusy, setEligibleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [preview, setPreview] = useState<{requester: ShiftSummary;target: ShiftSummary;sameDate?: boolean;swapMode?: string}|null>(null);

  const load = async () => {
    try {
      const mine = await api.get<Swap[]>("/shift-swaps/my");
      const visible = management ? await api.get<Swap[]>("/shift-swaps") : null;
      const mineRows = asArray<Swap>(mine.data);
      const visibleRows = asArray<Swap>(visible?.data);
      setReviewableIds(new Set(visibleRows.map(r => r.id)));
      const merged = new Map<number,Swap>();
      for(const request of [...mineRows, ...visibleRows]) merged.set(request.id,request);
      setItems([...merged.values()].sort((a,b)=>b.id-a.id));
    } catch(e:any) { setError(errorText(e,"Unable to load shift swap requests.")); }
  };
  useEffect(() => { void load(); }, [role]);

  useEffect(() => {
    if (!open || !userId) return;
    let active = true;
    setOwnBusy(true);
    setOwnAssignments([]);
    setEligible([]);
    setPreview(null);
    setScheduleError("");
    setForm(blankForm());
    void api.get<OwnAssignment[]>("/workforce/my")
      .then(r => {
        if (!active) return;
        const today = localDate();
        const future = asArray<OwnAssignment>(r.data)
          .filter(row => row?.shift && String(row.status || "").toUpperCase() === "SCHEDULED" && row.shiftDate >= today)
          .sort((a,b) => a.shiftDate.localeCompare(b.shiftDate));
        setOwnAssignments(future);
        if (!future.length) {
          setScheduleError("You do not have any upcoming scheduled shift to swap. HR/Manager must assign your shift in Workforce Scheduling first.");
        }
      })
      .catch(e => { if(active) setScheduleError(errorText(e,"Unable to load your scheduled shifts.")); })
      .finally(() => { if(active) setOwnBusy(false); });
    return () => { active = false; };
  }, [open, userId]);

  useEffect(() => {
    if (!open || !userId || !form.requesterDate || !form.targetDate) {
      setEligible([]);
      setPreview(null);
      return;
    }
    let active = true;
    setPreview(null); setEligible([]); setScheduleError(""); setEligibleBusy(true);
    setForm(previous => ({...previous,targetUserId:""}));
    void api.get<ShiftSummary[]>("/shift-swaps/eligible",{params:{requesterDate:form.requesterDate,targetDate:form.targetDate}})
      .then(r=>{
        if(active){
          const options = asArray<ShiftSummary>(r.data);
          setEligible(options);
          if(!options.length) setScheduleError("No compatible employee shift is assigned on the target date. Choose another date or ask HR/Manager to assign a compatible shift first.");
        }
      })
      .catch(e=>{if(active)setScheduleError(errorText(e,"No eligible shifts available for these dates."));})
      .finally(()=>{if(active)setEligibleBusy(false);});
    return ()=>{active=false;};
  }, [open, userId, form.requesterDate, form.targetDate]);

  useEffect(() => {
    if (!open || !form.targetUserId || !form.requesterDate || !form.targetDate) {setPreview(null);return;}
    let active = true;
    void api.get<{requester: ShiftSummary;target: ShiftSummary}>("/shift-swaps/preview", {params:form})
      .then(r=>{if(active)setPreview(r.data);})
      .catch(e=>{if(active){setPreview(null);setScheduleError(errorText(e,"Unable to preview both assigned shifts."));}});
    return ()=>{active=false;};
  }, [open,form.targetUserId,form.requesterDate,form.targetDate]);

  const filtered = useMemo(()=>items.filter(x=>`${x.requestNumber} ${x.requesterName} ${x.targetName} ${x.status}`.toLowerCase().includes(q.toLowerCase())),[items,q]);
  const submit = async()=>{
    if(busy || !preview || !form.reason.trim())return;
    setBusy(true);setError("");setMsg("");
    try {await api.post("/shift-swaps",form);setOpen(false);setForm(blankForm());setMsg("Request sent to the other employee. Approval is possible after their consent.");await load();}
    catch(e:any){setError(errorText(e,"Unable to submit request."));}finally{setBusy(false);}
  };
  const consent = async(id:number,accept:boolean)=>{
    if(busy)return;
    const comment = accept ? "" : window.prompt("Reason for declining the swap:","");
    if(comment === null || (!accept && !comment.trim()))return;
    setBusy(true);setError("");setMsg("");
    try {await api.patch(`/shift-swaps/${id}/consent`,{accept,comment});setMsg(accept?"Accepted. Waiting for Manager/HR approval.":"Shift swap declined.");await load();}
    catch(e:any){setError(errorText(e,"Unable to respond to the request."));}finally{setBusy(false);}
  };
  const review = async(id:number,status:"APPROVED"|"REJECTED")=>{
    if(busy)return;
    const comment = status === "REJECTED" ? window.prompt("Rejection reason:","") : window.confirm("Approve and exchange BOTH scheduled shifts? This cannot be repeated.") ? "Shift exchange approved." : null;
    if(comment===null || (status==="REJECTED"&&!comment.trim()))return;
    setBusy(true);setError("");setMsg("");
    try {await api.patch(`/shift-swaps/${id}/review`,{status,comment});setMsg(status==="APPROVED"?"Both shift assignments updated successfully.":"Request rejected; schedules unchanged.");await load();}
    catch(e:any){setError(errorText(e,"Unable to review request."));}finally{setBusy(false);}
  };

  const describe = (s:ShiftSummary) => `${s.employeeName} (${s.userId}) — ${s.shiftName}, ${s.startTime}–${s.endTime}`;
  const describeOwn = (a:OwnAssignment) => `${a.shiftDate} — ${a.shift?.name || "Assigned shift"}, ${a.shift?.startTime || ""}–${a.shift?.endTime || ""}`;
  const selectedOwn = ownAssignments.find(row => row.shiftDate === form.requesterDate) || null;

  return <Box>
    <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" gap={2} mb={3}>
      <Box><Typography variant="h4" fontWeight={800}>Shift Swap Requests</Typography><Typography color="text.secondary">{management ? "Review shift exchanges after the target employee gives consent." : "Exchange an assigned shift with another employee after consent and Manager/HR approval."}</Typography></Box>
      {!management && <Button variant="contained" onClick={()=>{setError("");setScheduleError("");setOpen(true);}}>Request Shift Swap</Button>}
    </Stack>
    {error&&<Alert severity="error" sx={{mb:2}} onClose={()=>setError("")}>{error}</Alert>}
    {msg&&<Alert severity="success" sx={{mb:2}} onClose={()=>setMsg("")}>{msg}</Alert>}
    <TextField fullWidth size="small" placeholder="Search requests..." value={q} onChange={e=>setQ(e.target.value)} sx={{mb:3}}/>
    <Stack spacing={2}>{filtered.map(x=>{
      const awaitingConsent = x.status==="SUBMITTED" && (x.targetConsentStatus||"PENDING")==="PENDING";
      const canReview = management && reviewableIds.has(x.id) && ["SUBMITTED","UNDER_REVIEW"].includes(x.status);
      return <Card key={x.id}><CardContent><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" gap={2}>
        <Box flex={1}>
          <Stack direction="row" spacing={1} mb={1} flexWrap="wrap"><Chip size="small" label={x.requestNumber}/><Chip size="small" label={x.status} color={x.status==="APPROVED"?"success":x.status==="REJECTED"?"error":"warning"}/><Chip size="small" label={`Target consent: ${x.targetConsentStatus||"PENDING"}`}/></Stack>
          <Typography variant="h6" fontWeight={800}>{x.requesterName||x.requesterUserId} ↔ {x.targetName||x.targetUserId}</Typography>
          <Typography variant="body2" color="text.secondary">{x.requesterDate}: {x.requesterShift||"Assigned shift"} ↔ {x.targetDate}: {x.targetShift||"Assigned shift"}</Typography>
          <Typography sx={{mt:1}}>{x.reason}</Typography>
          {x.targetConsentComment&&<Typography variant="body2">Employee response: {x.targetConsentComment}</Typography>}
          {x.reviewerComment&&<Typography variant="body2" color="text.secondary">Review: {x.reviewerComment}</Typography>}
        </Box>
        <Stack direction="row" gap={1} alignSelf={{xs:"stretch",md:"center"}} flexWrap="wrap">
          {userId===x.targetUserId&&awaitingConsent&&<><Button disabled={busy} color="error" onClick={()=>consent(x.id,false)}>Decline</Button><Button disabled={busy} variant="contained" color="success" onClick={()=>consent(x.id,true)}>Accept swap</Button></>}
          {canReview&&<><Button disabled={busy} color="error" onClick={()=>review(x.id,"REJECTED")}>Reject</Button><Button disabled={busy||x.targetConsentStatus!=="ACCEPTED"} variant="contained" onClick={()=>review(x.id,"APPROVED")}>Approve & Swap</Button></>}
        </Stack>
      </Stack></CardContent></Card>;
    })}{!filtered.length&&<Typography color="text.secondary">No shift swap requests found.</Typography>}</Stack>

    <Dialog open={open} onClose={()=>{if(!busy)setOpen(false);}} fullWidth maxWidth="sm"><DialogTitle>Request Shift Swap</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{pt:1}}>
        <Autocomplete
          options={ownAssignments}
          loading={ownBusy}
          value={selectedOwn}
          isOptionEqualToValue={(option,value)=>option.id===value.id}
          getOptionLabel={describeOwn}
          onChange={(_,row)=>{
            setScheduleError(""); setPreview(null); setEligible([]);
            setForm(p=>({...p, requesterDate:row?.shiftDate||"", targetDate:row?.shiftDate||"", targetUserId:""}));
          }}
          renderInput={(params)=><TextField {...params} label="Your Assigned Shift" helperText="Only your actual upcoming scheduled shifts are shown." InputProps={{...params.InputProps,endAdornment:<>{ownBusy?<CircularProgress size={18}/>:null}{params.InputProps.endAdornment}</>}}/>}
        />
        <TextField disabled={!form.requesterDate} type="date" label="Target Employee Shift Date" InputLabelProps={{shrink:true}} value={form.targetDate} inputProps={{min:localDate()}} onChange={e=>setForm(p=>({...p,targetDate:e.target.value,targetUserId:""}))}/>
        <Autocomplete
          disabled={!form.requesterDate || !form.targetDate}
          options={eligible}
          loading={eligibleBusy}
          value={eligible.find(row=>row.userId===form.targetUserId) || null}
          isOptionEqualToValue={(option,value)=>option.assignmentId===value.assignmentId}
          getOptionLabel={describe}
          onChange={(_,row)=>{setScheduleError("");setForm(p=>({...p,targetUserId:row?.userId||""}));}}
          renderInput={(params)=><TextField {...params} label="Choose Employee / Assigned Shift" helperText={form.requesterDate?"Search by employee name, ID or assigned shift.":"First choose one of your assigned shifts."} InputProps={{...params.InputProps,endAdornment:<>{eligibleBusy?<CircularProgress size={18}/>:null}{params.InputProps.endAdornment}</>}}/>}
        />
        {scheduleError&&<Alert severity="warning">{scheduleError}</Alert>}
        {preview&&<Alert severity="info"><strong>Your shift:</strong> {describe(preview.requester)}<br/><strong>Employee shift:</strong> {describe(preview.target)}<br/>{preview.sameDate?"On approval, the shift timings will be exchanged for this date.":"On approval, both scheduled assignment slots (date + shift) will be exchanged."}<br/>The exchange happens only after the other employee accepts and Manager/HR approves.</Alert>}
        <TextField label="Reason" multiline minRows={3} value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))}/>
      </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy||ownBusy||eligibleBusy||!preview||!form.reason.trim()} variant="contained" onClick={submit}>Submit Request</Button></DialogActions>
    </Dialog>
  </Box>;
}
