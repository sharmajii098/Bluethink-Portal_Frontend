import { downloadBrandedCsv } from "../utils/brandedExport";
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { DownloadRounded, RefreshRounded, AccountBalanceWalletRounded } from "@mui/icons-material";
import { api } from "../services/api";

type Row = Record<string, any>;
const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const n = (v:any) => Number(v || 0);
const money = (v:any) => `₹${n(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const keyOf = (r:Row) => String(r.employeeCode || r.employeeName || r.employeeId || r.id || "unknown");
const deptOf = (r:Row) => String(r.department || r.departmentName || "Unassigned");

function exportCsv(rows:Row[], year:number) {
  const keys = ["department","employees","grossCost","netCost","deductions","variableCost","avgCostPerEmployee"];
  const csv = [keys, ...rows.map(r=>keys.map(k=>`"${String(r[k] ?? "").replaceAll('"','""')}"`))].map(x=>x.join(",")).join("\n");
  void downloadBrandedCsv(csv, `employee-cost-${year}.csv`);
}

export default function EmployeeCostAnalyticsPage() {
  const now = new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [rows,setRows]=useState<Row[]>([]);
  const [employees,setEmployees]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [department,setDepartment]=useState("ALL");

  async function load(){
    setLoading(true); setError("");
    try {
      const [salaryResponses, employeeResponse] = await Promise.all([
        Promise.all(months.map(month=>api.get("/salaries/monthly",{params:{month,year}}))),
        api.get("/employees")
      ]);
      const salaryRows = salaryResponses.flatMap((r,i)=>(Array.isArray(r.data)?r.data:[]).map(x=>({...x,_month:months[i]})));
      setRows(salaryRows); setEmployees(Array.isArray(employeeResponse.data)?employeeResponse.data:(employeeResponse.data?.content||[]));
    } catch(e:any){ setRows([]); setEmployees([]); setError(e?.response?.data?.message||e?.response?.data?.error||"Unable to load employee cost analytics"); }
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[year]);

  const departments=useMemo(()=>Array.from(new Set(rows.map(deptOf).filter(Boolean))).sort(),[rows]);
  const filtered=useMemo(()=>rows.filter(r=>{
    const q=search.toLowerCase();
    const text=`${r.employeeName||""} ${r.employeeCode||""} ${deptOf(r)}`.toLowerCase();
    return (!q||text.includes(q))&&(department==="ALL"||deptOf(r)===department);
  }),[rows,search,department]);

  const summary=useMemo(()=>{
    const gross=rows.reduce((x,r)=>x+n(r.grossSalary),0), net=rows.reduce((x,r)=>x+n(r.netSalary),0), deductions=rows.reduce((x,r)=>x+n(r.deductions),0);
    const variable=rows.reduce((x,r)=>x+n(r.allowance)+n(r.bonus),0);
    const payrollEmployees=new Set(rows.map(keyOf)).size;
    const active=employees.filter(e=>!["INACTIVE","TERMINATED","RESIGNED","EXITED"].includes(String(e.status||e.employeeStatus||"").toUpperCase())).length;
    return {gross,net,deductions,variable,payrollEmployees,active,monthlyAvg:gross/Math.max(1,new Set(rows.map(r=>r._month)).size)};
  },[rows,employees]);

  const monthly=useMemo(()=>months.map(month=>{const rs=rows.filter(r=>r._month===month);const ids=new Set(rs.map(keyOf));const gross=rs.reduce((x,r)=>x+n(r.grossSalary),0);return {month,employees:ids.size,gross,net:rs.reduce((x,r)=>x+n(r.netSalary),0),variable:rs.reduce((x,r)=>x+n(r.allowance)+n(r.bonus),0),avg:ids.size?gross/ids.size:0};}),[rows]);
  const departmentsData=useMemo(()=>{const map=new Map<string,{ids:Set<string>,gross:number,net:number,deductions:number,variable:number}>();filtered.forEach(r=>{const d=deptOf(r);const x=map.get(d)||{ids:new Set<string>(),gross:0,net:0,deductions:0,variable:0};x.ids.add(keyOf(r));x.gross+=n(r.grossSalary);x.net+=n(r.netSalary);x.deductions+=n(r.deductions);x.variable+=n(r.allowance)+n(r.bonus);map.set(d,x);});return [...map.entries()].map(([department,x])=>({department,employees:x.ids.size,grossCost:x.gross,netCost:x.net,deductions:x.deductions,variableCost:x.variable,avgCostPerEmployee:x.ids.size?x.gross/x.ids.size:0})).sort((a,b)=>b.grossCost-a.grossCost);},[filtered]);

  return <Box>
    <div className="th-page-header"><div><h1>Employee Cost Analytics</h1><div className="th-breadcrumb">Dashboard <span>›</span> Employee Cost Analytics</div></div><div className="th-header-actions"><button className="th-outline" disabled={!departmentsData.length} onClick={()=>exportCsv(departmentsData,year)}><DownloadRounded fontSize="small"/> Export Excel</button><button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button></div></div>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
    <Paper sx={{p:2,mb:2}}><Stack direction={{xs:"column",md:"row"}} spacing={2} alignItems={{md:"center"}}><TextField label="Year" type="number" value={year} onChange={e=>setYear(Number(e.target.value))} sx={{width:{md:150}}}/><TextField fullWidth label="Search employee, code or department" value={search} onChange={e=>setSearch(e.target.value)}/><TextField select SelectProps={{native:true}} label="Department" value={department} onChange={e=>setDepartment(e.target.value)} sx={{minWidth:{md:250}}}><option value="ALL">All departments</option>{departments.map(d=><option key={d} value={d}>{d}</option>)}</TextField></Stack></Paper>
    {loading?<Stack alignItems="center" py={8}><CircularProgress/></Stack>:<>
      <Stack direction={{xs:"column",sm:"row"}} spacing={2} mb={2}>{[["Annual Employment Cost",money(summary.gross)], ["Monthly Avg Cost",money(summary.monthlyAvg)], ["Cost / Payroll Employee",money(summary.payrollEmployees?summary.gross/summary.payrollEmployees:0)], ["Variable Cost",money(summary.variable)], ["Active Workforce",summary.active||employees.length]].map(([label,value])=><Paper key={String(label)} sx={{p:2,flex:1,minWidth:160,border:1,borderColor:"divider"}}><Stack direction="row" spacing={1.2} alignItems="center"><AccountBalanceWalletRounded color="primary"/><Box><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h5" fontWeight={800}>{value}</Typography></Box></Stack></Paper>)}</Stack>
      <Paper sx={{p:2,mb:2}}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}><Box><Typography variant="h6" fontWeight={750}>Monthly Cost Trend</Typography><Typography variant="body2" color="text.secondary">Gross payroll cost and workforce-normalized cost for {year}</Typography></Box><Chip size="small" label={`${summary.payrollEmployees} payroll employees`}/></Stack><Box sx={{overflowX:"auto"}}><table className="th-table"><thead><tr><th>Month</th><th>Employees</th><th>Gross Cost</th><th>Net Pay</th><th>Variable Cost</th><th>Avg Cost / Employee</th></tr></thead><tbody>{monthly.map(r=><tr key={r.month}><td><b>{r.month}</b></td><td>{r.employees}</td><td><b>{money(r.gross)}</b></td><td>{money(r.net)}</td><td>{money(r.variable)}</td><td>{money(r.avg)}</td></tr>)}</tbody></table></Box></Paper>
      <Paper sx={{p:2}}><Typography variant="h6" fontWeight={750}>Department Cost Allocation</Typography><Typography variant="body2" color="text.secondary" mb={1.5}>Use cost-per-head and variable-cost mix for workforce budgeting.</Typography>{departmentsData.length?<Box sx={{overflowX:"auto"}}><table className="th-table"><thead><tr><th>Department</th><th>Employees</th><th>Gross Cost</th><th>Net Pay</th><th>Deductions</th><th>Variable Cost</th><th>Avg Cost / Employee</th></tr></thead><tbody>{departmentsData.map(r=><tr key={r.department}><td><b>{r.department}</b></td><td>{r.employees}</td><td>{money(r.grossCost)}</td><td>{money(r.netCost)}</td><td>{money(r.deductions)}</td><td>{money(r.variableCost)}</td><td>{money(r.avgCostPerEmployee)}</td></tr>)}</tbody></table></Box>:<Box py={5} textAlign="center"><Typography color="text.secondary">No payroll data matches the current filters.</Typography></Box>}</Paper>
    </>}
  </Box>;
}
