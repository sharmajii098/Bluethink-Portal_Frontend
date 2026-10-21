import { FormEvent, useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { AddRounded, DeleteOutlineRounded, EditRounded, FilterAltRounded, GroupRounded, RefreshRounded } from "@mui/icons-material";
import { api } from "../services/api";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

type Row = Record<string, any>;
const statuses = ["ACTIVE", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "INACTIVE", "CANCELLED"];
const money = (v: any) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const text = (v: any) => v == null || v === "" ? "—" : String(v);

export default function ProjectPage() {
  const role = useSelector((s: RootState) => s.auth.session?.role || "EMPLOYEE");
  const canEditProject = role === "ADMIN" || role === "HR";
  const canAssign = canEditProject || role === "MANAGER";
  const assignmentId = (employee: Row) => String(role === "MANAGER" ? employee.id : (employee.employeeId ?? employee.id));

  const [rows, setRows] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [managers, setManagers] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({ status: "ACTIVE" });
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState<Row | null>(null);
  const [assigned, setAssigned] = useState<string[]>([]);

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await api.get("/projects");
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Unable to load projects");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    if (canAssign) {
      const employeeEndpoint = role === "MANAGER" ? "/employees/team" : "/employees";
      api.get(employeeEndpoint).then(r => setEmployees(Array.isArray(r.data) ? r.data : [])).catch(() => setEmployees([]));
    }
    if (canEditProject) {
      Promise.allSettled([api.get("/departments"), api.get("/employees/reporting-managers")]).then(rs => {
        if (rs[0].status === "fulfilled") setDepartments(Array.isArray(rs[0].value.data) ? rs[0].value.data : []);
        if (rs[1].status === "fulfilled") setManagers((Array.isArray(rs[1].value.data) ? rs[1].value.data : []).filter((m: Row) => String(m.role || "").toUpperCase() === "MANAGER"));
      });
    }
  }, [canAssign, canEditProject, role]);

  const filtered = useMemo(() => rows.filter(r => {
    const q = keyword.trim().toLowerCase();
    const hit = !q || [r.projectName, r.clientName, r.clientRegion, r.technology, r.projectType, r.assignedEmployeeName, r.projectManagerName]
      .some(v => String(v || "").toLowerCase().includes(q));
    return hit && (!status || String(r.status || "") === status);
  }), [rows, keyword, status]);

  function openCreate() { setEditing(null); setForm({ status: "ACTIVE" }); setOpen(true); }
  function openEdit(r: Row) { setEditing(r); setForm({ ...r }); setOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload = {
        ...form,
        totalCost: form.totalCost === "" ? null : Number(form.totalCost || 0),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        employeeProfileId: form.employeeProfileId ? Number(form.employeeProfileId) : null,
        projectManagerId: form.projectManagerId ? Number(form.projectManagerId) : null,
      };
      if (editing) await api.put(`/projects/${editing.id}`, payload);
      else await api.post("/projects", payload);
      setOpen(false);
      setNotice(editing ? "Project updated." : "Project created.");
      await load();
    } catch (e: any) { setError(e?.response?.data?.message || "Could not save project"); }
    finally { setSaving(false); }
  }

  async function archive(id: number) {
    if (!window.confirm("Archive this project? Its history will be preserved.")) return;
    try { await api.delete(`/projects/${id}`); setNotice("Project archived."); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || "Could not archive project"); }
  }

  function openAssign(r: Row) {
    setAssigning(r);
    const allowed = new Set(employees.map(e => Number(assignmentId(e))));
    const selected = (Array.isArray(r.assignedEmployees) ? r.assignedEmployees : [])
      .filter((e: Row) => allowed.has(Number(e.id)))
      .map((e: Row) => String(e.id));
    setAssigned(selected);
    setError(""); setNotice("");
  }

  async function assign() {
    if (!assigning) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await api.post(`/projects/${assigning.id}/assign`, { employeeIds: assigned.map(Number) });
      setAssigning(null);
      setNotice(role === "MANAGER" ? "Project assignment updated for your team." : "Project assignments updated.");
      await load();
    } catch (e: any) { setError(e?.response?.data?.message || "Could not assign employees"); }
    finally { setSaving(false); }
  }

  const pageTitle = role === "EMPLOYEE" ? "My Projects" : role === "MANAGER" ? "Team Project Assignment" : "Project Management";
  const pageSubtitle = role === "MANAGER"
    ? "Assign only your direct-report employees to any active Bluethink project."
    : role === "EMPLOYEE"
      ? "Projects assigned to you by your reporting/project manager."
      : "Create projects, select a project manager and manage employee assignments.";

  return <div className="workflow-v7 project-v74">
    <div className="workflow-v7-head">
      <div><span className="workflow-v7-kicker">Projects</span><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
      <div className="workflow-v7-head-actions">
        {canEditProject && <button className="th-primary" onClick={openCreate}><AddRounded fontSize="small" /> New Project</button>}
        <button className="th-outline" onClick={load}><RefreshRounded fontSize="small" /> Refresh</button>
      </div>
    </div>

    {error && <div className="th-alert error">{error}</div>}
    {notice && <div className="th-alert success">{notice}</div>}

    <section className="workflow-v7-filter-card">
      <div className="workflow-v7-filter-title"><FilterAltRounded fontSize="small"/><div><strong>Filter projects</strong><span>Search project, client, manager, employee or technology.</span></div></div>
      <div className="workflow-v7-filters">
        <label className="wide"><span>Search</span><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Project, client, manager, employee..." /></label>
        <label><span>Status</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      </div>
    </section>

    <section className="workflow-v7-table-card">
      <div className="workflow-v7-table-head"><div><h2>Project Directory</h2><p>{filtered.length} project{filtered.length === 1 ? "" : "s"}</p></div></div>
      {loading ? <div className="workflow-v7-loading"><CircularProgress size={24}/> Loading projects…</div> : filtered.length === 0
        ? <div className="workflow-v7-empty"><GroupRounded/><h3>No projects found</h3><p>Try another filter{canEditProject ? " or create a new project." : "."}</p></div>
        : <div className="workflow-v7-table-scroll"><table className="workflow-v7-table"><thead><tr><th>Project</th><th>Client</th><th>Project Manager</th><th>Assigned Team</th><th>Technology</th><th>Status</th>{canEditProject && <th>Cost</th>}{canAssign && <th className="right">Actions</th>}</tr></thead><tbody>
          {filtered.map(r => <tr key={r.id}>
            <td><strong className="workflow-v7-primary-text">{text(r.projectName)}</strong><small className="report-muted">{text(r.description)}</small></td>
            <td>{text(r.clientName)}<small className="report-muted">{text(r.clientRegion)}</small></td>
            <td><strong>{text(r.projectManagerName)}</strong></td>
            <td><div className="project-v74-team">{Array.isArray(r.assignedEmployees) && r.assignedEmployees.length ? r.assignedEmployees.map((e: Row) => <strong key={e.id}>{e.fullName || e.userId}</strong>) : <span className="muted">Unassigned</span>}</div></td>
            <td>{text(r.technology)}</td>
            <td><span className={`status ${String(r.status || "").toLowerCase()}`}>{text(r.status)}</span></td>
            {canEditProject && <td>{money(r.totalCost)}</td>}
            {canAssign && <td className="right"><div className="workflow-v7-row-actions">
              {canEditProject && <button className="icon-btn" title="Edit" onClick={() => openEdit(r)}><EditRounded fontSize="small"/></button>}
              <button className="th-outline small" title="Assign employees" onClick={() => openAssign(r)}><GroupRounded fontSize="small"/> Assign Team</button>
              {canEditProject && r.status !== "INACTIVE" && <button className="icon-btn danger" title="Archive" onClick={() => archive(r.id)}><DeleteOutlineRounded fontSize="small"/></button>}
            </div></td>}
          </tr>)}
        </tbody></table></div>}
    </section>

    {open && canEditProject && <div className="th-modal-backdrop"><form className="th-modal workflow-v7-modal" onSubmit={save}>
      <div className="th-modal-head"><div><h2>{editing ? "Edit Project" : "Create Project"}</h2><p>Project Manager must be a user with the Manager role.</p></div><button type="button" onClick={() => setOpen(false)}>×</button></div>
      <div className="th-form-grid">
        {([['projectName','Project Name'],['clientName','Client Name'],['clientRegion','Client Region'],['technology','Technology'],['projectType','Project Type'],['totalCost','Total Cost'],['onboardingDate','Onboarding Date'],['endDate','End Date']] as const).map(([k,l]) => <label key={k}><span>{l}</span><input type={k === 'totalCost' ? 'number' : k.includes('Date') ? 'date' : 'text'} value={form[k] ?? ''} onChange={e => setForm({...form,[k]:e.target.value})} required={k === 'projectName' || k === 'clientName'} /></label>)}
        <label><span>Department</span><select value={form.departmentId ?? ''} onChange={e => setForm({...form, departmentId:e.target.value})}><option value="">Select Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}</select></label>
        <label><span>Project Manager</span><select value={form.projectManagerId ?? ''} onChange={e => setForm({...form, projectManagerId:e.target.value})}><option value="">Select Manager</option>{managers.map(m => <option key={m.id} value={m.id}>{m.fullName} ({m.userId})</option>)}</select></label>
        <label><span>Primary Employee</span><select value={form.employeeProfileId ?? ''} onChange={e => setForm({...form, employeeProfileId:e.target.value})}><option value="">Unassigned</option>{employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.userId})</option>)}</select></label>
        <label><span>Status</span><select value={form.status ?? 'ACTIVE'} onChange={e => setForm({...form,status:e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="full-width"><span>Description</span><textarea value={form.description ?? ''} onChange={e => setForm({...form,description:e.target.value})} rows={3}/></label>
      </div>
      <div className="th-modal-actions"><button type="button" className="th-outline" onClick={() => setOpen(false)}>Cancel</button><button className="th-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Project'}</button></div>
    </form></div>}

    {assigning && canAssign && <div className="th-modal-backdrop"><div className="th-modal workflow-v7-modal">
      <div className="th-modal-head"><div><h2>Assign Employees</h2><p>{role === "MANAGER" ? "Only your direct reports are available." : "Select employees assigned to this project."}</p></div><button type="button" onClick={() => setAssigning(null)}>×</button></div>
      <div className="project-v74-assignment-summary"><span>Project</span><strong>{assigning.projectName}</strong><span>Project Manager</span><strong>{assigning.projectManagerName || (role === "MANAGER" ? "You" : "Not assigned")}</strong></div>
      <div className="assign-list">{employees.length ? employees.map(e => { const aid = assignmentId(e); return <label key={aid} className="check-row"><input type="checkbox" checked={assigned.includes(aid)} onChange={ev => setAssigned(ev.target.checked ? [...assigned, aid] : assigned.filter(x => x !== aid))}/><span>{e.fullName}<small>{e.userId} · {e.designation || e.department || 'Employee'}</small></span></label>; }) : <div className="workflow-v7-empty compact"><p>No eligible employees found.</p></div>}</div>
      <div className="th-modal-actions"><button className="th-outline" onClick={() => setAssigning(null)}>Cancel</button><button className="th-primary" disabled={saving} onClick={assign}>{saving ? "Saving…" : "Save Assignments"}</button></div>
    </div></div>}
  </div>;
}
