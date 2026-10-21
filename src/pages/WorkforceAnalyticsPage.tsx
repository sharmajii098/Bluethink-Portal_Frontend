import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, CircularProgress, GridLegacy, Paper, Stack, TextField, Typography } from "@mui/material";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import PersonOffRoundedIcon from "@mui/icons-material/PersonOffRounded";
import { api } from "../services/api";

type Employee = Record<string, any>;
const text = (v: any) => String(v ?? "").trim();

export default function WorkforceAnalyticsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");

  useEffect(() => {
    api.get("/employees")
      .then(r => setEmployees(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .catch(e => setError(e.response?.data?.message || "Unable to load workforce data."))
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(() => Array.from(new Set(employees.map(e => text(e.departmentName || e.department?.departmentName || e.department)).filter(Boolean))).sort(), [employees]);
  const filtered = useMemo(() => employees.filter(e => {
    const name = text(e.fullName || e.employeeName || `${e.firstName || ""} ${e.lastName || ""}`).toLowerCase();
    const email = text(e.email).toLowerCase();
    const dept = text(e.departmentName || e.department?.departmentName || e.department);
    return (!search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase())) && (department === "ALL" || dept === department);
  }), [employees, search, department]);

  const active = employees.filter(e => !["INACTIVE", "TERMINATED", "RESIGNED", "EXITED"].includes(text(e.status || e.employeeStatus).toUpperCase())).length;
  const inactive = employees.length - active;
  const remote = employees.filter(e => ["REMOTE", "WORK_FROM_HOME", "WFH"].includes(text(e.workMode).toUpperCase())).length;

  const deptCounts = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => { const d = text(e.departmentName || e.department?.departmentName || e.department) || "Unassigned"; map.set(d, (map.get(d) || 0) + 1); });
    return [...map.entries()].sort((a,b) => b[1] - a[1]);
  }, [filtered]);

  return <Box>
    <Stack direction={{xs:"column",sm:"row"}} justifyContent="space-between" alignItems={{sm:"center"}} mb={2} gap={1}>
      <Box><Typography variant="h4" fontWeight={800}>Workforce Analytics</Typography><Typography color="text.secondary">Headcount, department distribution and work-mode visibility for HR planning.</Typography></Box>
      <Chip label={`${filtered.length} employees`} icon={<PeopleAltRoundedIcon />} />
    </Stack>
    {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    {loading ? <Stack alignItems="center" py={8}><CircularProgress /></Stack> : <>
      <GridLegacy container spacing={2} mb={2}>
        {[["Total Headcount", employees.length, PeopleAltRoundedIcon], ["Active", active, BusinessRoundedIcon], ["Inactive / Exited", inactive, PersonOffRoundedIcon], ["Remote / WFH", remote, HomeWorkRoundedIcon]].map(([label,value,Icon]: any)=><GridLegacy item xs={12} sm={6} md={3} key={label}><Paper sx={{p:2.2,height:"100%"}}><Stack direction="row" spacing={1.5} alignItems="center"><Icon color="primary"/><Box><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={800}>{value}</Typography></Box></Stack></Paper></GridLegacy>)}
      </GridLegacy>
      <Paper sx={{p:2,mb:2}}><Stack direction={{xs:"column",md:"row"}} spacing={2}><TextField fullWidth label="Search employee or email" value={search} onChange={e=>setSearch(e.target.value)} /><TextField select SelectProps={{native:true}} label="Department" value={department} onChange={e=>setDepartment(e.target.value)} sx={{minWidth:{md:260}}}><option value="ALL">All departments</option>{departments.map(d=><option key={d} value={d}>{d}</option>)}</TextField></Stack></Paper>
      <GridLegacy container spacing={2}>
        <GridLegacy item xs={12} md={5}><Paper sx={{p:2,height:"100%"}}><Typography variant="h6" fontWeight={750} mb={1.5}>Headcount by Department</Typography>{deptCounts.length ? deptCounts.map(([d,n])=><Stack key={d} direction="row" justifyContent="space-between" sx={{py:1,borderBottom:"1px solid",borderColor:"divider"}}><Typography>{d}</Typography><Chip size="small" label={n}/></Stack>) : <Typography color="text.secondary">No matching departments.</Typography>}</Paper></GridLegacy>
        <GridLegacy item xs={12} md={7}><Paper sx={{p:2}}><Typography variant="h6" fontWeight={750} mb={1.5}>Employee Snapshot</Typography>{filtered.length===0?<Typography color="text.secondary">No employees match the current filters.</Typography>:<Box sx={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={{textAlign:"left",padding:8}}>Employee</th><th style={{textAlign:"left",padding:8}}>Department</th><th style={{textAlign:"left",padding:8}}>Designation</th><th style={{textAlign:"left",padding:8}}>Work Mode</th><th style={{textAlign:"left",padding:8}}>Status</th></tr></thead><tbody>{filtered.map((e,i)=><tr key={e.id ?? i}>{[text(e.fullName || e.employeeName || `${e.firstName||""} ${e.lastName||""}`)||"Unnamed", text(e.departmentName || e.department?.departmentName || e.department)||"Unassigned", text(e.designation)||"—", text(e.workMode)||"—", text(e.status || e.employeeStatus)||"ACTIVE"].map((v,j)=><td key={j} style={{padding:8,borderTop:"1px solid #eee"}}>{v}</td>)}</tr>)}</tbody></table></Box>}</Paper></GridLegacy>
      </GridLegacy>
    </>}
  </Box>;
}
