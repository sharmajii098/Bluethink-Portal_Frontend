import { FormEvent, useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { AccountTreeRounded, AddRounded, GroupsRounded, RefreshRounded, SchoolRounded } from "@mui/icons-material";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { api } from "../services/api";

type Row = Record<string, any>;
const today = () => new Date().toISOString().slice(0, 10);
const shortDate = (v: any) => !v ? "Open ended" : new Date(`${String(v).slice(0,10)}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const labelType = (v: any) => String(v || "SHADOWING").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export default function MentorshipPage() {
  const session = useSelector((s: RootState) => s.auth.session);
  const role = session?.role || "EMPLOYEE";
  const userId = session?.userId || "";
  const canAssign = role === "HR" || role === "MANAGER";
  const [rows, setRows] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>({ assignmentType: "SHADOWING", startDate: today(), endDate: "", mentorId: "", menteeId: "", projectId: "", learningGoal: "" });

  async function load() {
    setLoading(true); setError("");
    try {
      const requests: Promise<any>[] = [api.get("/mentorships")];
      if (canAssign) requests.push(api.get("/mentorships/eligible"));
      const result = await Promise.all(requests);
      setRows(Array.isArray(result[0].data) ? result[0].data : []);
      if (canAssign) {
        setEmployees(Array.isArray(result[1].data?.employees) ? result[1].data.employees : []);
        setProjects(Array.isArray(result[1].data?.projects) ? result[1].data.projects : []);
      }
    } catch (e: any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to load learning hierarchy"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [role]);

  const myLearning = useMemo(() => rows.filter(r => String(r.menteeUserId || "") === userId && String(r.status).toUpperCase() === "ACTIVE"), [rows, userId]);
  const myMentees = useMemo(() => rows.filter(r => String(r.mentorUserId || "") === userId && String(r.status).toUpperCase() === "ACTIVE"), [rows, userId]);
  const active = useMemo(() => rows.filter(r => String(r.status).toUpperCase() === "ACTIVE"), [rows]);
  const mentorProjects = useMemo(() => {
    const mentorId = Number(form.mentorId || 0);
    if (!mentorId) return [] as Row[];
    return projects.filter((p: Row) => Number(p.projectManagerId || 0) === mentorId || (Array.isArray(p.assignedEmployeeIds) && p.assignedEmployeeIds.map(Number).includes(mentorId)));
  }, [projects, form.mentorId]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await api.post("/mentorships", { mentorId:Number(form.mentorId), menteeId:Number(form.menteeId), projectId:form.projectId?Number(form.projectId):null, assignmentType:form.assignmentType, learningGoal:String(form.learningGoal||"").trim(), startDate:form.startDate, endDate:form.endDate||null });
      setOpen(false); setForm({ assignmentType:"SHADOWING", startDate:today(), endDate:"", mentorId:"", menteeId:"", projectId:"", learningGoal:"" });
      setNotice("Learning / shadow assignment created successfully."); await load();
    } catch (e:any) { setError(e?.response?.data?.message || e?.response?.data?.error || "Could not create learning assignment"); }
    finally { setSaving(false); }
  }

  async function changeStatus(id:number,status:string) {
    try { await api.patch(`/mentorships/${id}/status`, {status}); setNotice(status === "COMPLETED" ? "Learning assignment completed." : "Learning assignment cancelled."); await load(); }
    catch (e:any) { setError(e?.response?.data?.message || "Unable to update assignment"); }
  }

  const title = role === "EMPLOYEE" ? "My Mentor & Shadowing" : role === "MANAGER" ? "Team Learning Hierarchy" : "Learning & Shadow Hierarchy";
  const subtitle = role === "MANAGER" ? "Assign junior or trainee employees who report to you under a senior employee in the same department for guided project learning." : role === "EMPLOYEE" ? "See who you are learning from, which project you are shadowing, and employees assigned to you for mentoring." : "Connect reporting hierarchy with structured senior-junior mentoring and project shadowing.";

  return <div className="workflow-v7 mentorship-v82">
    <div className="workflow-v7-head">
      <div><span className="workflow-v7-kicker">People • Learning Hierarchy</span><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="workflow-v7-head-actions">
        {canAssign && <button className="th-primary" onClick={() => setOpen(true)}><AddRounded fontSize="small"/> New Assignment</button>}
        <button className="th-outline" onClick={load}><RefreshRounded fontSize="small"/> Refresh</button>
      </div>
    </div>
    {error && <div className="th-alert error">{error}</div>}
    {notice && <div className="th-alert success">{notice}</div>}

    <div className="workflow-v7-summary-grid">
      <Summary icon={<AccountTreeRounded/>} label="Active Assignments" value={active.length} caption="Current learning relationships"/>
      <Summary icon={<SchoolRounded/>} label="My Mentor Assignments" value={myLearning.length} caption="You are learning / shadowing" tone="violet"/>
      <Summary icon={<GroupsRounded/>} label="People I Mentor" value={myMentees.length} caption="Learners assigned to you" tone="green"/>
    </div>

    <section className="mentorship-flow-card">
      <div className="mentorship-flow-node"><small>HR</small><strong>Department + Reporting Manager</strong><span>Creates formal reporting structure</span></div><b>→</b>
      <div className="mentorship-flow-node"><small>Manager</small><strong>Senior Employee / Mentor</strong><span>Assigns direct-report junior or trainee</span></div><b>→</b>
      <div className="mentorship-flow-node"><small>Learner</small><strong>Project Shadowing</strong><span>Fills own timesheet against mentor/project</span></div><b>→</b>
      <div className="mentorship-flow-node"><small>Review</small><strong>Senior → Manager</strong><span>Mentor checks learning work, Manager gives final approval</span></div>
    </section>

    {loading ? <div className="workflow-v7-loading"><CircularProgress size={26}/> Loading learning hierarchy…</div> :
      <section className="workflow-v7-table-card">
        <div className="workflow-v7-table-head"><div><h2>Learning Relationships</h2><p>{rows.length} assignment{rows.length === 1 ? "" : "s"}</p></div></div>
        {rows.length === 0 ? <div className="workflow-v7-empty"><AccountTreeRounded/><h3>No learning hierarchy yet</h3><p>{canAssign ? "Create the first senior-junior shadow assignment." : "Your Manager has not assigned a mentor or learner yet."}</p></div> :
        <div className="workflow-v7-table-scroll"><table className="workflow-v7-table"><thead><tr><th>Manager</th><th>Senior / Mentor</th><th>Junior / Trainee</th><th>Project</th><th>Learning Type</th><th>Period</th><th>Goal</th><th>Status</th>{canAssign && <th className="right">Actions</th>}</tr></thead><tbody>
          {rows.map(r => <tr key={r.id}>
            <td><strong>{r.managerName || "—"}</strong><small className="report-muted">{r.departmentName || "Department"}</small></td>
            <td><strong className="workflow-v7-primary-text">{r.mentorName || "—"}</strong><small className="report-muted">{r.mentorDesignation || r.mentorUserId || "Senior employee"}</small></td>
            <td><strong>{r.menteeName || "—"}</strong><small className="report-muted">{r.menteeDesignation || r.menteeUserId || "Learner"}</small></td>
            <td>{r.projectName || "General Learning / No Project"}</td>
            <td><span className="mentorship-type-pill">{labelType(r.assignmentType)}</span></td>
            <td>{shortDate(r.startDate)}<small className="report-muted">to {shortDate(r.endDate)}</small></td>
            <td><div className="workflow-v7-reason">{r.learningGoal || "—"}</div></td>
            <td><span className={`status ${String(r.status || "").toLowerCase()}`}>{r.status}</span></td>
            {canAssign && <td className="right"><div className="workflow-v7-row-actions">{String(r.status).toUpperCase() === "ACTIVE" && <><button className="th-outline small" onClick={() => changeStatus(r.id, "COMPLETED")}>Complete</button><button className="th-danger small" onClick={() => changeStatus(r.id, "CANCELLED")}>Cancel</button></>}</div></td>}
          </tr>)}
        </tbody></table></div>}
      </section>}

    {open && canAssign && <div className="th-modal-backdrop"><form className="th-modal workflow-v7-modal" onSubmit={submit}>
      <div className="th-modal-head"><div><h2>Create Learning / Shadow Assignment</h2><p>Manager assignments are restricted to employees who directly report to that Manager in the same department.</p></div><button type="button" onClick={() => setOpen(false)}>×</button></div>
      <div className="th-form-grid">
        <label><span>Senior Employee / Mentor *</span><select required value={form.mentorId} onChange={e => setForm({...form, mentorId:e.target.value, projectId:""})}><option value="">Select senior employee</option>{employees.filter(e => String(e.id) !== String(form.menteeId)).map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.designation || e.userId}</option>)}</select></label>
        <label><span>Junior / Trainee *</span><select required value={form.menteeId} onChange={e => setForm({...form, menteeId:e.target.value})}><option value="">Select learner</option>{employees.filter(e => String(e.id) !== String(form.mentorId)).map(e => <option key={e.id} value={e.id}>{e.fullName} · {e.designation || e.userId}</option>)}</select></label>
        <label><span>Learning Type *</span><select value={form.assignmentType} onChange={e => setForm({...form, assignmentType:e.target.value})}><option value="SHADOWING">Project Shadowing</option><option value="MENTORING">Mentoring</option><option value="PAIR_LEARNING">Pair Learning</option><option value="TRAINING">On-the-job Training</option></select></label>
        <label><span>Senior's Project</span><select value={form.projectId} onChange={e => setForm({...form, projectId:e.target.value})}><option value="">General Learning / No Project</option>{mentorProjects.map(p => <option key={p.id} value={p.id}>{p.projectName}{p.projectManagerName ? ` · PM: ${p.projectManagerName}` : ""}</option>)}</select></label>
        <label><span>Start Date *</span><input type="date" required value={form.startDate} onChange={e => setForm({...form,startDate:e.target.value})}/></label>
        <label><span>End Date</span><input type="date" min={form.startDate} value={form.endDate} onChange={e => setForm({...form,endDate:e.target.value})}/></label>
        <label className="full-width"><span>Learning Goal / Responsibility</span><textarea rows={4} value={form.learningGoal} onChange={e => setForm({...form,learningGoal:e.target.value})} placeholder="Example: Shadow API development, understand code review process, assist with Spring Boot module testing..."/></label>
      </div>
      <div className="th-modal-actions"><button type="button" className="th-outline" onClick={() => setOpen(false)}>Cancel</button><button className="th-primary" disabled={saving}>{saving ? "Saving…" : "Create Assignment"}</button></div>
    </form></div>}
  </div>;
}

function Summary({icon,label,value,caption,tone="blue"}:{icon:any;label:string;value:any;caption:string;tone?:string}) {
  return <article className={`workflow-v7-summary-card ${tone}`}><span className="workflow-v7-summary-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{caption}</p></div></article>;
}
