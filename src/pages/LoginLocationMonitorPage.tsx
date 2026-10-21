import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import { api } from "../services/api";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type LocationRow = { id:number; employeeId:string; employeeName?:string; latitude:number; longitude:number; distanceFromOffice:number; workMode:string; loginStatus:string; loginTime:string; };
const fmt=(v?:string)=>v?new Date(v).toLocaleString():"—";
export default function LoginLocationMonitorPage(){
 const role=useSelector((s:RootState)=>s.auth.session?.role||"EMPLOYEE");
 const [rows,setRows]=useState<LocationRow[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 useEffect(()=>{api.get<LocationRow[]>("/login-locations/visible").then(r=>setRows(r.data||[])).catch(e=>setError(e?.response?.data?.message||"Unable to load login locations.")).finally(()=>setLoading(false));},[]);
 return <Box><Typography variant="h4" fontWeight={800}>Login Location Monitor</Typography><Typography color="text.secondary" sx={{mb:3}}>Work mode is detected automatically from GPS at successful login. HR/Admin can view organization-wide records; managers can view their teams.</Typography>{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}{loading?<CircularProgress/>:<Stack spacing={2}>{rows.map(x=><Card key={x.id}><CardContent><Stack direction={{xs:"column",md:"row"}} justifyContent="space-between" gap={2}><Box><Typography variant="h6" fontWeight={800}><LocationOnRoundedIcon sx={{verticalAlign:"middle",mr:.5}}/>{x.employeeName || x.employeeId}</Typography><Typography variant="body2" color="text.secondary">{x.employeeId}</Typography><Typography color="text.secondary">{fmt(x.loginTime)}</Typography><Typography variant="body2" sx={{mt:1}}>Coordinates: {x.latitude.toFixed(6)}, {x.longitude.toFixed(6)}</Typography></Box><Stack direction="row" spacing={1} alignItems="center"><Chip label={x.workMode}/><Chip label={`${Math.round(x.distanceFromOffice)} m from office`} color={x.distanceFromOffice<=200?"success":"error"}/><Chip label={x.loginStatus} color="success"/></Stack></Stack></CardContent></Card>)}{!rows.length&&<Typography color="text.secondary">No login-location records found.</Typography>}</Stack>}</Box>;
}
