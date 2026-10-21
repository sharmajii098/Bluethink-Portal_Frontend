import {useEffect,useMemo,useState} from "react";
import {Alert,Box,Card,CardContent,Chip,LinearProgress,Stack,Typography} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import {api} from "../services/api";
import { getCurrentRole } from "../utils/authRole";

export default function ProfileCompletionPage(){
 const role=getCurrentRole(); const mgmt=["ADMIN","HR","MANAGER"].includes(role);
 const [data,setData]=useState<any>(null),[msg,setMsg]=useState("");
 const load=async()=>{try{const r=await api.get(mgmt?"/profile-completion":"/profile-completion/my");setData(r.data)}catch(e:any){setMsg(e?.response?.data?.message||"Unable to load profile completion")}};
 useEffect(()=>{load()},[role]);
 const rows=useMemo(()=>mgmt?(data||[]):(data?[data]:[]),[data,mgmt]);
 return <Box><Typography variant="h4" fontWeight={800}>Profile Completion</Typography><Typography color="text.secondary" sx={{mb:3}}>Keep employee records complete, accurate and ready for HR operations.</Typography>{msg&&<Alert sx={{mb:2}} onClose={()=>setMsg("")}>{msg}</Alert>}
 <Stack spacing={2}>{rows.map((x:any)=><Card key={x.userId}><CardContent><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" gap={2}><Box sx={{minWidth:220}}><Typography variant="h6" fontWeight={800}>{x.employeeName||x.userId}</Typography><Typography color="text.secondary">{x.department||"Department not set"} · {x.designation||"Designation not set"}</Typography><Stack direction="row" spacing={1} sx={{mt:1}}><Chip label={`${x.completionPercent}% complete`} color={x.completionPercent===100?"success":x.completionPercent>=75?"primary":"warning"}/><Chip size="small" label={`${x.completedItems}/${x.totalItems} items`}/></Stack></Box><Box sx={{flex:1,maxWidth:520}}><LinearProgress variant="determinate" value={x.completionPercent||0} sx={{height:10,borderRadius:5,mb:2}}/><Stack spacing={1}>{(x.checks||[]).map((c:any)=>{const Icon=c.completed?CheckCircleRoundedIcon:RadioButtonUncheckedRoundedIcon; return <Stack key={c.label} direction="row" spacing={1} alignItems="center"><Icon fontSize="small"/><Typography variant="body2" color={c.completed?"text.primary":"text.secondary"}>{c.label}</Typography></Stack>})}</Stack></Box></Stack></CardContent></Card>)}{!rows.length&&<Typography color="text.secondary">No employee profile completion data found.</Typography>}</Stack></Box>;
}
