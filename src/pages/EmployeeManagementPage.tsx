
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import {
  AddRounded,
  BlockRounded,
  CheckCircleOutlineRounded,
  EditRounded,
  FilterAltRounded,
  RefreshRounded,
  VisibilityRounded,
} from "@mui/icons-material";
import { useSelector } from "react-redux";

import { api } from "../services/api";
import type { RootState } from "../store";
import PaginationBar from "../components/PaginationBar";

type Row = Record<string, any>;

type EmployeeForm = {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  department: string;
  designation: string;
  employeeBand: string;
  panNumber: string;

  userId: string;
  password: string;

  dob: string;
  joiningDate: string;
  status: string;
  workMode: string;
  reportingManagerId: string;

  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  currentAddress: string;
  permanentAddress: string;
};

const statuses = ["ACTIVE", "INACTIVE"];
const workModes = ["WFO", "WFH"];
const roleOptions = ["HR", "MANAGER", "EMPLOYEE"];
const designationOptions: Record<string, string[]> = {
  EMPLOYEE: ["Intern", "Trainee", "Junior Software Engineer", "Software Engineer", "Senior Software Engineer", "Lead Software Engineer", "Team Lead", "Project Coordinator", "Business Analyst", "Senior Business Analyst", "QA Engineer", "Senior QA Engineer", "Designer", "Senior Designer", "Executive", "Senior Executive", "Associate", "Senior Associate"],
  MANAGER: ["Assistant Manager", "Manager", "Senior Manager", "Project Manager", "Senior Project Manager", "IT Manager", "HR Manager", "Operations Manager", "Delivery Manager", "General Manager"],
  HR: ["HR Executive", "Senior HR Executive", "HR Generalist", "HR Business Partner", "HR Manager", "Senior HR Manager", "Head of HR"],
  ADMIN: ["Administrator", "System Administrator", "Head of Operations"]
};
const genderOptions = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const maritalStatusOptions = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "SEPARATED"];
const employeeBandOptions = [
  "INTERN", "TRAINEE", "E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8",
  "M1", "M2", "M3", "M4", "M5"
];

const emptyForm: EmployeeForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  role: "EMPLOYEE",
  department: "",
  designation: "",
  employeeBand: "",
  panNumber: "",

  // Only used when editing an existing account; creation generates credentials server-side
  userId: "",
  password: "",

  dob: "",
  joiningDate: "",
  status: "ACTIVE",
  workMode: "WFO",
  reportingManagerId: "",

  gender: "",
  bloodGroup: "",
  maritalStatus: "",
  currentAddress: "",
  permanentAddress: "",
};

const text = (value: any): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
};

export default function EmployeeManagementPage() {
  const role = useSelector(
    (state: RootState) => state.auth.session?.role || "EMPLOYEE"
  );

  const canManage = role === "ADMIN" || role === "HR";

  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [departments, setDepartments] = useState<Row[]>([]);
  const [managers, setManagers] = useState<Row[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);

  const [form, setForm] = useState<EmployeeForm>({
    ...emptyForm,
  });

  function updateForm<K extends keyof EmployeeForm>(
    field: K,
    value: EmployeeForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/employees");

      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Unable to load employees"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    if (!canManage) {
      return;
    }

    Promise.allSettled([
      api.get("/departments"),
      api.get("/employees/reporting-managers"),
    ]).then((results) => {
      const departmentsResult = results[0];
      const managersResult = results[1];

      if (departmentsResult.status === "fulfilled") {
        setDepartments(
          Array.isArray(departmentsResult.value.data)
            ? departmentsResult.value.data
            : []
        );
      }

      if (managersResult.status === "fulfilled") {
        setManagers(
          Array.isArray(managersResult.value.data)
            ? managersResult.value.data
            : []
        );
      }
    });
  }, [canManage]);

  const filtered = useMemo(() => {
    return rows.filter((employee) => {
      const q = query.trim().toLowerCase();

      const matchesSearch =
        !q ||
        [
          employee.fullName,
          employee.userId,
          employee.email,
          employee.phoneNumber,
          employee.designation,
          employee.department,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(q)
        );

      const matchesDepartment =
        !department || employee.department === department;

      const matchesStatus =
        !status ||
        String(employee.status || "").toUpperCase() === status;

      const matchesRole =
        !roleFilter ||
        String(employee.role || "").toUpperCase() === roleFilter;

  return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [rows, query, department, status, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage(1); }, [query, department, status, roleFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginatedEmployees = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const stats = useMemo(
    () => ({
      total: rows.length,

      active: rows.filter(
        (employee) =>
          String(employee.status || "").toUpperCase() === "ACTIVE"
      ).length,

      inactive: rows.filter(
        (employee) =>
          String(employee.status || "").toUpperCase() === "INACTIVE"
      ).length,

      managers: rows.filter(
        (employee) =>
          String(employee.role || "").toUpperCase() === "MANAGER"
      ).length,
    }),
    [rows]
  );

  function openCreate() {
    setEditing(null);

    setForm({
      ...emptyForm,
      role: "EMPLOYEE",
      status: "ACTIVE",
      workMode: "WFO",
    });

    setError("");
    setOpen(true);
  }

  function openEdit(employee: Row) {
    setEditing(employee);

    setForm({
      fullName: employee.fullName ?? "",
      email: employee.email ?? "",
      phoneNumber: employee.phoneNumber ?? "",
      role: employee.role ?? "EMPLOYEE",
      department: employee.department ?? "",
      designation: employee.designation ?? "",
      employeeBand: String(employee.employeeBand ?? "").toUpperCase(),
      panNumber: employee.panNumber ?? "",

      userId: employee.userId ?? "",
      password: "",

      dob: employee.dob ?? "",
      joiningDate: employee.joiningDate ?? "",
      status: employee.status ?? "ACTIVE",
      workMode: employee.workMode ?? "WFO",

      reportingManagerId:
        employee.reportingManagerId !== null &&
        employee.reportingManagerId !== undefined
          ? String(employee.reportingManagerId)
          : "",

      gender: String(employee.gender ?? "").trim().toUpperCase().replaceAll(" ", "_"),
      bloodGroup: String(employee.bloodGroup ?? "").trim().toUpperCase(),
      maritalStatus: String(employee.maritalStatus ?? "").trim().toUpperCase().replaceAll(" ", "_"),
      currentAddress: employee.currentAddress ?? "",
      permanentAddress: employee.permanentAddress ?? "",
    });

    setError("");
    setOpen(true);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canManage) {
      setError("You do not have permission to manage employees.");
      return;
    }

    setError("");

    // ---------------------------------------------------------
    // CREATE VALIDATION
    // ---------------------------------------------------------

    // Backend generates unique login ID and temporary password on creation.
    if (!form.designation.trim()) {
      setError("Select a designation before saving this employee.");
      return;
    }
    setSaving(true);

    try {
      setSuccess("");
      // -------------------------------------------------------
      // BASE EMPLOYEE PAYLOAD
      // -------------------------------------------------------

      const payload: Record<string, any> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),

        role: form.role.trim().toUpperCase(),

        department: form.department.trim(),
        designation: form.designation.trim(),
        employeeBand: form.employeeBand.trim(),
        panNumber: form.panNumber.trim().toUpperCase(),

        // Credentials are generated by the backend for new employees.
        userId: editing ? form.userId.trim() : undefined,

        dob: form.dob || "",
        joiningDate: form.joiningDate || "",

        status: form.status.trim().toUpperCase(),
        workMode: form.workMode.trim().toUpperCase(),

        gender: form.gender.trim(),
        bloodGroup: form.bloodGroup.trim(),
        maritalStatus: form.maritalStatus.trim(),

        currentAddress: form.currentAddress.trim(),
        permanentAddress: form.permanentAddress.trim(),
      };

      // -------------------------------------------------------
      // REPORTING MANAGER
      // -------------------------------------------------------

      // Send the empty value on edits too, so an assigned manager can be removed.
      if (editing || form.reportingManagerId.trim()) {
        payload.reportingManagerId = form.reportingManagerId.trim()
          ? Number(form.reportingManagerId) : null;
      }

      // -------------------------------------------------------
      // CREATE
      // -------------------------------------------------------
      //
      // Backend contract:
      //
      // POST /api/employees
      //
      // User ID and temporary password are generated server-side.
      //
      // -------------------------------------------------------

      if (!editing) {
        const result = await api.post("/employees", payload);
        setSuccess(`Created ${result.data.userId}. ${result.data.message || "Check Gmail invitation status."} Status: ${result.data.deliveryStatus || "PENDING"}. SMS: not configured.`);
      }

      // -------------------------------------------------------
      // UPDATE
      // -------------------------------------------------------

      if (editing) {
        // Password is optional while editing.
        // Only send it when Admin/HR entered a new password.
        if (form.password.trim()) {
          payload.password = form.password;
        }

        console.log(
          "Updating employee payload:",
          {
            ...payload,
            password: payload.password
              ? "********"
              : undefined,
          }
        );

        await api.put(
          `/employees/${editing.id}`,
          payload
        );
        setSuccess("Employee updated successfully.");
      }

      // -------------------------------------------------------
      // SUCCESS
      // -------------------------------------------------------

      setOpen(false);
      setEditing(null);
      setForm({
        ...emptyForm,
      });

      await load();
    } catch (e: any) {
      console.error("Employee save error:", e);

      const backendMessage =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message;

      setError(
        backendMessage ||
          (editing
            ? "Could not update employee."
            : "Could not create employee.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function setStatusFor(
    employee: Row,
    nextStatus: string
  ) {
    const action =
      nextStatus === "ACTIVE"
        ? "Activate"
        : "Deactivate";

    if (
      !window.confirm(
        `${action} ${
          employee.fullName || "this employee"
        }?`
      )
    ) {
      return;
    }

    try {
      setError("");

      await api.patch(
        `/employees/${employee.id}/status`,
        {
          status: nextStatus,
        }
      );

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Status update failed."
      );
    }
  }

  async function resendInvitation(employee: Row) {
    if (!window.confirm(`Send a new secure password setup link to ${employee.email}? This invalidates previous invitation links.`)) return;
    setError(""); setSuccess("");
    try {
      const response = await api.post(`/employees/${employee.id}/resend-invitation`);
      setSuccess(`${employee.userId}: ${response.data.message} Status: ${response.data.deliveryStatus}.`);
    } catch (failure: any) {
      setError(failure?.response?.data?.message || "Could not resend invitation. Check SMTP settings and try again.");
    }
  }

  return (
    <div>
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="th-page-header">
        <div>
          <h1>Employee Management</h1>

          <div className="th-breadcrumb">
            Employees <span>/</span> {filtered.length} visible
          </div>
        </div>

        <div className="th-header-actions">
          {canManage && (
            <button
              type="button"
              className="th-primary"
              onClick={openCreate}
            >
              <AddRounded fontSize="small" />
              Add Employee
            </button>
          )}

          <button
            type="button"
            className="th-outline"
            onClick={load}
          >
            <RefreshRounded fontSize="small" />
            Refresh
          </button>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {success && <div className="th-alert success" role="status">{success}</div>}
      {error && (
        <div className="role-alert">
          <b>Employee operation failed</b>
          <span>{error}</span>
        </div>
      )}

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <div className="stats-grid employee-stats">
        <div className="th-card stat-card">
          <span>Total Employees</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="th-card stat-card">
          <span>Active</span>
          <strong>{stats.active}</strong>
        </div>

        <div className="th-card stat-card">
          <span>Inactive</span>
          <strong>{stats.inactive}</strong>
        </div>

        <div className="th-card stat-card">
          <span>Managers</span>
          <strong>{stats.managers}</strong>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div className="th-card report-filter-card">
        <div className="report-filter-title">
          <FilterAltRounded fontSize="small" />
          Employee Filters
        </div>

        <div className="report-filters">
          <label>
            Search

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Name, ID, email, designation…"
            />
          </label>

          <label>
            Department

            <select
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
            >
              <option value="">
                All departments
              </option>

              {departments.map((item) => (
                <option
                  key={item.id}
                  value={item.departmentName}
                >
                  {item.departmentName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Role

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value)
              }
            >
              <option value="">
                All roles
              </option>

              {roleOptions.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option value="">
                All statuses
              </option>

              {statuses.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* =====================================================
          EMPLOYEE TABLE
      ====================================================== */}

      <div className="th-card table-card">
        {loading ? (
          <div className="th-loading">
            <CircularProgress size={22} />
            Loading employees…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>No employees found</h3>
            <p>
              Try changing the filters.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contact</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <b>
                        {text(employee.fullName)}
                      </b>

                      <small className="report-muted">
                        {text(employee.userId)}
                      </small>
                    </td>

                    <td>
                      {text(employee.email)}

                      <small className="report-muted">
                        {text(employee.phoneNumber)}
                      </small>
                    </td>

                    <td>
                      {text(employee.department)}
                    </td>

                    <td>
                      {text(employee.designation)}
                    </td>

                    <td>
                      <span
                        className={`status ${String(
                          employee.role || ""
                        ).toLowerCase()}`}
                      >
                        {text(employee.role)}
                      </span>
                    </td>

                    <td>
                      {text(employee.joiningDate)}
                    </td>

                    <td>
                      <span
                        className={`status ${String(
                          employee.status || ""
                        ).toLowerCase()}`}
                      >
                        {text(employee.status)}
                      </span>
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="View details"
                          onClick={() =>
                            setView(employee)
                          }
                        >
                          <VisibilityRounded fontSize="small" />
                        </button>

                        {canManage && (
                          <button type="button" className="icon-btn" title="Resend secure invitation"
                            aria-label={`Resend invitation to ${employee.fullName}`}
                            onClick={() => resendInvitation(employee)}>
                            Resend invite
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit employee"
                            onClick={() =>
                              openEdit(employee)
                            }
                          >
                            <EditRounded fontSize="small" />
                          </button>
                        )}

                        {canManage &&
                          String(
                            employee.status || ""
                          ).toUpperCase() !==
                            "INACTIVE" && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              title="Deactivate"
                              onClick={() =>
                                setStatusFor(
                                  employee,
                                  "INACTIVE"
                                )
                              }
                            >
                              <BlockRounded fontSize="small" />
                            </button>
                          )}

                        {canManage &&
                          String(
                            employee.status || ""
                          ).toUpperCase() ===
                            "INACTIVE" && (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Activate"
                              onClick={() =>
                                setStatusFor(
                                  employee,
                                  "ACTIVE"
                                )
                              }
                            >
                              <CheckCircleOutlineRounded fontSize="small" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar page={page} pageSize={pageSize} total={filtered.length} onChange={setPage} />
          </div>
        )}
      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ====================================================== */}

      {open && (
        <div className="th-modal-backdrop">
          <form
            className="th-modal"
            onSubmit={save}
          >
            <div className="th-modal-head">
              <div>
                <h2>
                  {editing
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <small className="th-muted">
                  {editing
                    ? "Update employment and access details."
                    : "Create the account, employee and profile together."}
                </small>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {error && <div className="th-alert error" role="alert" style={{ margin: "12px 20px" }}>{error}</div>}
            <div className="th-form-grid">
              {/* =================================================
                  PERSONAL INFORMATION
              ================================================== */}

              <label>
                Full Name

                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    updateForm(
                      "fullName",
                      e.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Email

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateForm(
                      "email",
                      e.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Phone

                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    updateForm(
                      "phoneNumber",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Date of Birth

                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) =>
                    updateForm(
                      "dob",
                      e.target.value
                    )
                  }
                  required
                />
              </label>

              <label>
                Joining Date

                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) =>
                    updateForm(
                      "joiningDate",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Designation

                <select
                  value={form.designation}
                  required
                  onChange={(e) => updateForm("designation", e.target.value)}
                >
                  <option value="">Select designation</option>
                  {[...new Set([...(designationOptions[form.role] || designationOptions.EMPLOYEE),
                    ...(form.designation && !(designationOptions[form.role] || []).includes(form.designation) ? [form.designation] : [])])]
                    .map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                </select>
              </label>

              <label>
                Employee Band

                <select
                  value={form.employeeBand}
                  onChange={(e) => updateForm("employeeBand", e.target.value)}
                >
                  <option value="">Select employee band</option>
                  {employeeBandOptions.map((band) => (
                    <option key={band} value={band}>{band}</option>
                  ))}
                </select>
              </label>

              <label>
                PAN Number

                <input
                  type="text"
                  value={form.panNumber}
                  onChange={(e) => updateForm("panNumber", e.target.value.toUpperCase())}
                  placeholder="Example: ABCDE1234F"
                  maxLength={10}
                />
              </label>

              {/* =================================================
                  LOGIN CREDENTIALS
              ================================================== */}

              {editing ? <>
                <label>User ID<input type="text" value={form.userId} readOnly className="read-only" /></label>
                <label>New Password (optional)<input type="password" value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="Leave blank to keep existing password" autoComplete="new-password" /></label>
              </> : <div className="full-width th-alert success" role="note">
                The system will automatically generate the login ID and temporary password, email them to the new user,
                and optionally send an SMS if the SMS gateway is configured. Confirm the email address and mobile number above.
              </div>}

              {/* =================================================
                  EMPLOYMENT
              ================================================== */}

              <label>
                Role

                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((previous) => ({ ...previous, role: e.target.value,
                      designation: previous.role === e.target.value ? previous.designation : "" }))
                  }
                >
                  {(role === "HR" ? roleOptions.filter((item) => item !== "HR") : roleOptions).map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status

                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm(
                      "status",
                      e.target.value
                    )
                  }
                >
                  {statuses.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Work Mode

                <select
                  value={form.workMode}
                  onChange={(e) =>
                    updateForm(
                      "workMode",
                      e.target.value
                    )
                  }
                >
                  {workModes.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Department

                <select
                  value={form.department}
                  onChange={(e) => {
                    const nextDepartment = e.target.value;
                    updateForm("department", nextDepartment);
                    const currentManager = managers.find((m) => String(m.id) === String(form.reportingManagerId));
                    if (currentManager && nextDepartment && currentManager.department !== nextDepartment) {
                      updateForm("reportingManagerId", "");
                    }
                  }}
                >
                  <option value="">
                    No department
                  </option>

                  {departments.map((item) => (
                    <option
                      key={item.id}
                      value={item.departmentName}
                    >
                      {item.departmentName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Reporting Manager

                <select
                  value={form.reportingManagerId}
                  onChange={(e) =>
                    updateForm(
                      "reportingManagerId",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    No reporting manager
                  </option>

                  {managers.filter((manager) => !form.department || manager.department === form.department).map((manager) => (
                    <option
                      key={manager.id}
                      value={manager.id}
                    >
                      {manager.fullName} (
                      {manager.designation ||
                        manager.role}
                      )
                    </option>
                  ))}
                </select>
              </label>

              {/* =================================================
                  PROFILE
              ================================================== */}

              <label>
                Gender

                <select
                  value={form.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((value) => (
                    <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </label>

              <label>
                Blood Group

                <select
                  value={form.bloodGroup}
                  onChange={(e) => updateForm("bloodGroup", e.target.value)}
                >
                  <option value="">Select blood group</option>
                  {bloodGroupOptions.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>

              <label>
                Marital Status

                <select
                  value={form.maritalStatus}
                  onChange={(e) => updateForm("maritalStatus", e.target.value)}
                >
                  <option value="">Select marital status</option>
                  {maritalStatusOptions.map((value) => (
                    <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </label>

              <label className="full-field">
                Current Address

                <textarea
                  rows={2}
                  value={form.currentAddress}
                  onChange={(e) =>
                    updateForm(
                      "currentAddress",
                      e.target.value
                    )
                  }
                />
              </label>

              <label className="full-field">
                Permanent Address

                <textarea
                  rows={2}
                  value={form.permanentAddress}
                  onChange={(e) =>
                    updateForm(
                      "permanentAddress",
                      e.target.value
                    )
                  }
                />
              </label>
            </div>

            {/* =================================================
                ACTIONS
            ================================================== */}

            <div className="th-modal-actions">
              <button
                type="button"
                className="th-outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="th-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Save Changes"
                  : "Create Employee"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================
          VIEW EMPLOYEE
      ====================================================== */}

      {view && (
        <div className="th-modal-backdrop">
          <div className="th-modal employee-detail-modal">
            <div className="th-modal-head">
              <div>
                <h2>
                  {text(view.fullName)}
                </h2>

                <small className="th-muted">
                  {text(view.userId)} ·{" "}
                  {text(view.designation)}
                </small>
              </div>

              <button
                type="button"
                onClick={() => setView(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="detail-grid">
              {[
                ["Email", view.email],
                ["Phone", view.phoneNumber],
                ["Department", view.department],
                ["Designation", view.designation],
                ["Employee Band", view.employeeBand],
                ["PAN Number", view.panNumber],
                ["Role", view.role],
                ["Status", view.status],
                ["Work Mode", view.workMode],
                ["Date of Birth", view.dob],
                ["Joining Date", view.joiningDate],
                ["Gender", view.gender],
                ["Blood Group", view.bloodGroup],
                ["Marital Status", view.maritalStatus],
                ["Current Address", view.currentAddress],
                ["Permanent Address", view.permanentAddress],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="detail-item"
                >
                  <small>{label}</small>
                  <strong>
                    {text(value)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="th-modal-actions">
              <button
                type="button"
                className="th-outline"
                onClick={() => setView(null)}
              >
                Close
              </button>

              {canManage && (
                <button
                  type="button"
                  className="th-primary"
                  onClick={() => {
                    setView(null);
                    openEdit(view);
                  }}
                >
                  <EditRounded fontSize="small" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}