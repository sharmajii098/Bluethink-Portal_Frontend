
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  CircularProgress,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { api } from "../services/api";
import type { RootState } from "../store";

export type Resource =
  | "employees"
  | "departments"
  | "attendance"
  | "leaves"
  | "timesheets"
  | "projects"
  | "salary"
  | "notifications"
  | "profile"
  | "team"
  | "reports"
  | "hierarchy"
  | "leaveTypes"
  | "leavePolicies"
  | "holidays"
  | "leaveBalances"
  | "salaryStructures"
  | "salaryGenerate"
  | "wfh";

const money = (value: unknown): string =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const labels: Record<Resource, string> = {
  employees: "Employee Management",
  departments: "Departments",
  attendance: "Attendance",
  leaves: "Leave Management",
  timesheets: "Timesheet Management",
  projects: "Project Management",
  salary: "Salary & Payroll",
  notifications: "Notifications",
  profile: "My Profile",
  team: "My Team",
  reports: "Reports & Analytics",
  hierarchy: "Employee Hierarchy",
  leaveTypes: "Leave Types",
  leavePolicies: "Leave Policies",
  holidays: "Holiday Calendar",
  leaveBalances: "Adjust Leave Balance",
  salaryStructures: "Salary Structures",
  salaryGenerate: "Generate Payroll",
  wfh: "Work From Home",
};

type Props = {
  resource: Resource;
  title: string;
  admin?: boolean;
};

type Row = Record<string, any>;

export default function ResourcePage({
  resource,
  title,
  admin = false,
}: Props) {
  const location = useLocation();

  const session = useSelector(
    (state: RootState) => state.auth.session
  );

  const role = session?.role || "EMPLOYEE";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] =
    useState<number | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] =
    useState<Row[]>([]);

  const [managers, setManagers] =
    useState<Row[]>([]);

  const [employees, setEmployees] =
    useState<Row[]>([]);

  const [leaveTypes, setLeaveTypes] =
    useState<Row[]>([]);

  const [projects, setProjects] =
    useState<Row[]>([]);

  const [allRows, setAllRows] =
    useState<Row[]>([]);

  const endpoint = useMemo(() => {
    if (resource === "employees") {
      return "/employees";
    }

    if (resource === "team") {
      return "/employees/team";
    }

    if (resource === "departments") {
      return "/departments";
    }

    if (resource === "attendance") {
      if (
        role === "ADMIN" ||
        role === "HR"
      ) {
        return "/attendance";
      }

      if (role === "MANAGER") {
        return "/attendance/team";
      }

      return "/attendance/my";
    }

    if (resource === "leaves") {
      if (
        admin ||
        role === "HR"
      ) {
        return "/leaves";
      }

      if (role === "MANAGER") {
        return "/leaves/team";
      }

      return "/leaves/my";
    }

    if (resource === "timesheets") {
      if (
        admin ||
        role === "HR"
      ) {
        return "/timesheets";
      }

      if (role === "MANAGER") {
        return "/timesheets/team";
      }

      return "/timesheets/my";
    }

    if (resource === "projects") {
      return "/projects";
    }

    if (resource === "salary") {
      return admin || role === "HR"
        ? "/salaries"
        : "/salaries/my";
    }

    if (resource === "wfh") {
      if (
        admin ||
        role === "HR"
      ) {
        return "/wfh";
      }

      if (role === "MANAGER") {
        return "/wfh/team";
      }

      return "/wfh/my";
    }

    if (resource === "notifications") {
      return admin
        ? "/notifications"
        : "/notifications/my";
    }

    if (resource === "profile") {
      return "/profile/me";
    }

    if (resource === "hierarchy") {
      return "/employee-hierarchy";
    }

    if (resource === "leaveTypes") {
      return "/leave-types";
    }

    if (resource === "leavePolicies") {
      return "/leave-policies";
    }

    if (resource === "holidays") {
      return "/holidays";
    }

    if (resource === "leaveBalances") {
      return null;
    }

    if (resource === "salaryStructures") {
      return "/salary-structures";
    }

    if (resource === "salaryGenerate") {
      return null;
    }

    if (resource === "reports") {
      const path = location.pathname;

      if (
        path.includes("reports/attendance")
      ) {
        return "/reports/attendance";
      }

      if (
        path.includes("reports/payroll")
      ) {
        return "/reports/payroll";
      }

      if (
        path.includes("reports/projects")
      ) {
        return "/reports/projects";
      }

      return "/reports/employees";
    }

    return null;
  }, [
    resource,
    admin,
    role,
    location.pathname,
  ]);

  async function load(): Promise<void> {
    if (!endpoint) {
      setRows([]);
      setAllRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await api.get(endpoint);

      const data = Array.isArray(
        response.data
      )
        ? response.data
        : response.data
          ? [response.data]
          : [];

      setAllRows(data);
      setRows(data);
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
              error?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data
          ?.message ||
          errorResponse.response?.data
            ?.error ||
          `Unable to load ${title}`
      );

      setRows([]);
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [endpoint]);

  useEffect(() => {
    const requests: Promise<any>[] = [];

    if (
      resource === "employees" ||
      resource === "projects" ||
      resource === "salaryStructures" ||
      resource === "leaveBalances" ||
      resource === "timesheets"
    ) {
      requests.push(
        api.get("/employees")
      );
    }

    if (
      resource === "employees" ||
      resource === "projects"
    ) {
      requests.push(
        api.get("/departments")
      );
    }

    if (
      resource === "timesheets" ||
      resource === "wfh"
    ) {
      requests.push(
        api.get("/projects")
      );
    }

    if (resource === "employees") {
      requests.push(
        api.get(
          "/employees/reporting-managers"
        )
      );
    }

    if (
      resource === "leavePolicies" ||
      resource === "leaveBalances" ||
      resource === "leaves"
    ) {
      requests.push(
        api.get("/leave-types")
      );
    }

    Promise.allSettled(requests).then(
      (results) => {
        for (const result of results) {
          if (
            result.status !==
            "fulfilled"
          ) {
            continue;
          }

          const data = Array.isArray(
            result.value.data
          )
            ? result.value.data
            : [];

          const url = String(
            result.value.config?.url ||
              ""
          );

          if (
            url.endsWith(
              "/departments"
            )
          ) {
            setDepartments(data);
          } else if (
            url.endsWith(
              "/reporting-managers"
            )
          ) {
            setManagers(data);
          } else if (
            url.endsWith(
              "/leave-types"
            )
          ) {
            setLeaveTypes(data);
          } else if (
            url.endsWith(
              "/employees"
            )
          ) {
            setEmployees(data);
          } else if (
            url.endsWith("/projects")
          ) {
            setProjects(data);
          }
        }
      }
    );
  }, [resource, role]);

  const fields = getFields(
    resource,
    location.pathname
  );

  const canAdd =
    resource === "employees" ||
    resource === "departments"
      ? role === "ADMIN" ||
        role === "HR"
      : resource === "projects"
        ? role === "ADMIN" ||
          role === "HR"
        : resource === "leaves" ||
            resource ===
              "timesheets" ||
            resource === "wfh"
          ? role === "EMPLOYEE"
          : [
                "leaveTypes",
                "leavePolicies",
                "holidays",
                "salaryStructures",
                "salaryGenerate",
                "leaveBalances",
              ].includes(resource)
            ? role === "ADMIN"
            : false;

  const headers = getHeaders(
    resource,
    rows
  );

  async function save(
    event: FormEvent
  ): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      let path = endpoint || "";

      let method:
        | "post"
        | "put" = "post";

      const payload: Row = {
        ...form,
      };

      if (resource === "employees") {
        path = editingId
          ? `/employees/${editingId}`
          : "/employees";

        method = editingId
          ? "put"
          : "post";
      } else if (
        resource === "departments"
      ) {
        path = editingId
          ? `/departments/${editingId}`
          : "/departments";

        method = editingId
          ? "put"
          : "post";
      } else if (
        resource === "leaves"
      ) {
        path = "/leaves";
      } else if (
        resource === "timesheets"
      ) {
        path = "/timesheets";
        payload.hoursWorked =
          Number(
            payload.hoursWorked || 0
          );
      } else if (
        resource === "projects"
      ) {
        path = editingId
          ? `/projects/${editingId}`
          : "/projects";

        method = editingId
          ? "put"
          : "post";

        if (payload.departmentId) {
          payload.departmentId =
            Number(
              payload.departmentId
            );
        }

        if (
          payload.employeeProfileId
        ) {
          payload.employeeProfileId =
            Number(
              payload.employeeProfileId
            );
        }
      } else if (
        resource === "leaveTypes"
      ) {
        path = editingId
          ? `/leave-types/${editingId}`
          : "/leave-types";

        method = editingId
          ? "put"
          : "post";

        if (editingId) {
          payload.id = editingId;
        }
      } else if (
        resource === "leavePolicies"
      ) {
        path = editingId
          ? `/leave-policies/${editingId}`
          : "/leave-policies";

        method = editingId
          ? "put"
          : "post";

        payload.leaveType = {
          id: Number(
            payload.leaveTypeId
          ),
        };

        delete payload.leaveTypeId;
      } else if (
        resource === "holidays"
      ) {
        path = "/holidays";
      } else if (
        resource === "salaryStructures"
      ) {
        path = editingId
          ? `/salary-structures/${editingId}`
          : "/salary-structures";

        method = editingId
          ? "put"
          : "post";

        payload.employeeProfileId =
          Number(
            payload.employeeProfileId
          );
      } else if (
        resource === "salaryGenerate"
      ) {
        path = "/salaries/generate";

        payload.year = Number(
          payload.year
        );
      } else if (
        resource === "leaveBalances"
      ) {
        path = "/leave-balance/adjust";

        payload.employeeId =
          Number(
            payload.employeeId
          );

        payload.leaveTypeId =
          Number(
            payload.leaveTypeId
          );

        payload.year = Number(
          payload.year
        );

        payload.delta = Number(
          payload.delta
        );
      } else if (
        resource === "profile"
      ) {
        path = "/profile/me";
        method = "put";
      }

      if (method === "put") {
        await api.put(
          path,
          payload
        );
      } else {
        await api.post(
          path,
          payload
        );
      }

      setOpen(false);
      setForm({});
      setEditingId(null);

      await load();
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
              error?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data
          ?.message ||
          errorResponse.response?.data
            ?.error ||
          "Save failed"
      );
    } finally {
      setSaving(false);
    }
  }

  async function statusAction(
    path: string,
    body: Row
  ): Promise<void> {
    try {
      await api.patch(
        path,
        body
      );

      await load();
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data
          ?.message ||
          "Action failed"
      );
    }
  }

  async function remove(
    id: number
  ): Promise<void> {
    if (
      !window.confirm(
        "Delete this record?"
      )
    ) {
      return;
    }

    try {
      let path = "";

      if (
        resource === "employees"
      ) {
        path = `/employees/${id}`;
      } else if (
        resource === "departments"
      ) {
        path = `/departments/${id}`;
      } else if (
        resource === "projects"
      ) {
        path = `/projects/${id}`;
      } else if (
        resource === "leaveTypes"
      ) {
        path = `/leave-types/${id}`;
      } else if (
        resource === "leavePolicies"
      ) {
        path = `/leave-policies/${id}`;
      } else if (
        resource === "holidays"
      ) {
        path = `/holidays/${id}`;
      } else if (
        resource === "salaryStructures"
      ) {
        path = `/salary-structures/${id}`;
      }

      if (!path) {
        return;
      }

      await api.delete(path);
      await load();
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data
          ?.message ||
          "Delete failed"
      );
    }
  }

  function openForm(): void {
    const defaults: Row =
      resource === "employees"
        ? {
            role: "EMPLOYEE",
            status: "ACTIVE",
          }
        : resource ===
            "salaryGenerate"
          ? {
              month:
                new Date().toLocaleString(
                  "en-US",
                  {
                    month: "long",
                  }
                ),
              year:
                new Date().getFullYear(),
            }
          : {};

    setForm(defaults);
    setEditingId(null);
    setError("");
    setOpen(true);
  }

  function openEdit(
    row: Row
  ): void {
    setEditingId(
      Number(row.id)
    );

    setForm({
      ...row,
    });

    setError("");
    setOpen(true);
  }

  const canEdit =
    [
      "employees",
      "departments",
      "projects",
      "leaveTypes",
      "leavePolicies",
      "salaryStructures",
    ].includes(resource) &&
    (role === "ADMIN" ||
      role === "HR");

  const isProfile =
    resource === "profile";

  return (
    <div>
      {/* Page Header */}
      <div className="th-page-header">
        <div>
          <h1>{title}</h1>

          <div className="th-breadcrumb">
            Dashboard{" "}
            <span>›</span>{" "}
            {title}
          </div>
        </div>

        <div className="th-header-actions">
          <button
            className="th-outline"
            onClick={() =>
              void load()
            }
          >
            ↻ Refresh
          </button>

          {canAdd && (
            <button
              className="th-primary"
              onClick={openForm}
            >
              ＋{" "}
              {resource ===
              "salaryGenerate"
                ? "Generate"
                : "Add New"}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Attendance Actions */}
      {resource === "attendance" &&
        (role === "EMPLOYEE" ||
          role === "MANAGER") && (
          <div className="th-card action-card">
            <div>
              <strong>
                Today's Attendance
              </strong>

              <small>
                Use the controls to record
                your work day.
              </small>
            </div>

            <select id="workMode">
              <option value="OFFICE">
                Office
              </option>

              <option value="WFH">
                Work From Home
              </option>

              <option value="HYBRID">
                Hybrid
              </option>
            </select>

            <button
              className="th-primary"
              onClick={() => {
                const workMode =
                  (
                    document.getElementById(
                      "workMode"
                    ) as HTMLSelectElement
                  )?.value;

                void api
                  .post(
                    "/attendance/punch-in",
                    {
                      workMode,
                    }
                  )
                  .then(() => load())
                  .catch(
                    (
                      errorObject: any
                    ) =>
                      setError(
                        errorObject
                          ?.response?.data
                          ?.message ||
                          "Punch in failed"
                      )
                  );
              }}
            >
              Punch In
            </button>

            <button
              className="th-outline"
              onClick={() => {
                void api
                  .post(
                    "/attendance/punch-out"
                  )
                  .then(() => load())
                  .catch(
                    (
                      errorObject: any
                    ) =>
                      setError(
                        errorObject
                          ?.response?.data
                          ?.message ||
                          "Punch out failed"
                      )
                  );
              }}
            >
              Punch Out
            </button>
          </div>
        )}

      {/* Main Content */}
      {isProfile ? (
        <ProfileEditor
          data={
            rows[0] || {}
          }
          onSaved={load}
        />
      ) : resource ===
        "hierarchy" ? (
        <Hierarchy data={rows} />
      ) : loading ? (
        <div className="th-loading">
          <CircularProgress
            size={28}
          />

          <span>
            Loading{" "}
            {labels[
              resource
            ].toLowerCase()}
            ...
          </span>
        </div>
      ) : rows.length === 0 ? (
        <div className="th-card empty-state">
          <div className="empty-icon">
            ◎
          </div>

          <h3>
            No records found
          </h3>

          <p>
            No data is available
            for this module yet.
          </p>
        </div>
      ) : (
        <div className="th-card table-card">
          {/* Table Toolbar */}
          <div className="table-toolbar">
            <div>
              <strong>
                {title}
              </strong>

              <small>
                {rows.length} record
                {rows.length === 1
                  ? ""
                  : "s"}
              </small>
            </div>

            <input
              placeholder="Search records..."
              onChange={(event) => {
                const query =
                  event.target.value
                    .trim()
                    .toLowerCase();

                if (!query) {
                  setRows(allRows);
                  return;
                }

                setRows(
                  allRows.filter(
                    (row) =>
                      Object.values(
                        row
                      ).some(
                        (value) =>
                          String(
                            value ?? ""
                          )
                            .toLowerCase()
                            .includes(
                              query
                            )
                      )
                  )
                );
              }}
            />
          </div>

          {/* Table */}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {headers.map(
                    (header) => (
                      <th
                        key={header}
                      >
                        {format(
                          header
                        )}
                      </th>
                    )
                  )}

                  {(admin ||
                    resource ===
                      "notifications" ||
                    resource ===
                      "leaves" ||
                    resource ===
                      "timesheets" ||
                    resource ===
                      "wfh") && (
                    <th>
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (row, index) => (
                    <tr
                      key={
                        row.id ??
                        index
                      }
                    >
                      {headers.map(
                        (header) => (
                          <td
                            key={
                              header
                            }
                          >
                            {renderValue(
                              header,
                              row[
                                header
                              ]
                            )}
                          </td>
                        )
                      )}

                      {(admin ||
                        canEdit ||
                        resource ===
                          "notifications" ||
                        resource ===
                          "leaves" ||
                        resource ===
                          "timesheets" ||
                        resource ===
                          "wfh") && (
                        <td className="actions">
                          {/* Leave Actions */}
                          {resource ===
                            "leaves" &&
                          String(
                            row.status
                          ).toUpperCase() ===
                            "PENDING" &&
                          row.canReview === true ? (
                            <>
                              <button
                                onClick={() =>
                                  void statusAction(
                                    `/leaves/${row.id}/status`,
                                    {
                                      status:
                                        "APPROVED",
                                    }
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                className="danger"
                                onClick={() =>
                                  void statusAction(
                                    `/leaves/${row.id}/status`,
                                    {
                                      status:
                                        "REJECTED",
                                    }
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          ) : resource ===
                              "timesheets" &&
                            String(
                              row.status
                            ).toUpperCase() ===
                              "PENDING" &&
                            row.canReview === true ? (
                            <>
                              <button
                                onClick={() =>
                                  void statusAction(
                                    `/timesheets/${row.id}/status`,
                                    {
                                      status:
                                        "APPROVED",
                                    }
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                className="danger"
                                onClick={() =>
                                  void statusAction(
                                    `/timesheets/${row.id}/status`,
                                    {
                                      status:
                                        "REJECTED",
                                    }
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          ) : resource ===
                              "wfh" &&
                            String(
                              row.status
                            ).toUpperCase() ===
                              "PENDING" &&
                            row.canReview === true ? (
                            <>
                              <button
                                onClick={() =>
                                  void statusAction(
                                    `/wfh/${row.id}/status`,
                                    {
                                      status:
                                        "APPROVED",
                                    }
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                className="danger"
                                onClick={() =>
                                  void statusAction(
                                    `/wfh/${row.id}/status`,
                                    {
                                      status:
                                        "REJECTED",
                                    }
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          ) : resource ===
                              "salary" &&
                            (role ===
                              "ADMIN" ||
                              role ===
                                "HR") ? (
                            <select
                              value={
                                row.paymentStatus ??
                                "PENDING"
                              }
                              onChange={(
                                event
                              ) =>
                                void statusAction(
                                  `/salaries/${row.id}/payment-status`,
                                  {
                                    paymentStatus:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            >
                              <option value="PENDING">
                                Pending
                              </option>

                              <option value="PROCESSING">
                                Processing
                              </option>

                              <option value="PAID">
                                Paid
                              </option>

                              <option value="FAILED">
                                Failed
                              </option>
                            </select>
                          ) : resource ===
                            "notifications" ? (
                            row.read ? (
                              <span className="status paid">
                                Read
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  void statusAction(
                                    `/notifications/${row.id}/read`,
                                    {}
                                  )
                                }
                              >
                                Mark read
                              </button>
                            )
                          ) : canEdit ||
                            (admin &&
                              [
                                "leaveTypes",
                                "leavePolicies",
                                "holidays",
                                "salaryStructures",
                              ].includes(
                                resource
                              )) ? (
                            <>
                              {canEdit && (
                                <button
                                  onClick={() =>
                                    openEdit(
                                      row
                                    )
                                  }
                                >
                                  Edit
                                </button>
                              )}

                              {admin &&
                                [
                                  "employees",
                                  "departments",
                                  "projects",
                                  "leaveTypes",
                                  "leavePolicies",
                                  "holidays",
                                  "salaryStructures",
                                ].includes(
                                  resource
                                ) && (
                                  <button
                                    className="danger"
                                    onClick={() =>
                                      void remove(
                                        Number(
                                          row.id
                                        )
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                )}
                            </>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {open && (
        <FormModal
          resource={resource}
          fields={fields}
          form={form}
          setForm={setForm}
          editingId={editingId}
          departments={
            departments
          }
          managers={managers}
          leaveTypes={
            leaveTypes
          }
          employees={
            employees
          }
          projects={projects}
          onClose={() =>
            setOpen(false)
          }
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}

function ProfileEditor({
  data,
  onSaved,
}: {
  data: Row;
  onSaved: () => void;
}) {
  const [form, setForm] =
    useState<Row>(data);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setForm(data);
  }, [data]);

  const save = async (): Promise<void> => {
    setSaving(true);
    setError("");

    try {
      await api.put(
        "/profile/me",
        form
      );

      onSaved();
    } catch (errorObject: unknown) {
      const errorResponse =
        errorObject as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      setError(
        errorResponse.response?.data
          ?.message ||
          "Unable to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const profileFields = [
    "fullName",
    "email",
    "phoneNumber",
    "dob",
    "gender",
    "bloodGroup",
    "maritalStatus",
    "currentAddress",
    "permanentAddress",
  ];

  return (
    <div
      className="th-card"
      style={{
        marginBottom: 16,
      }}
    >
      <h3 className="role-section-title">
        Personal Information
      </h3>

      <p className="th-muted">
        You can update personal
        contact and demographic
        information. Role,
        department and designation
        are managed by HR/Admin.
      </p>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      <div className="th-form-grid">
        {profileFields.map(
          (field) => (
            <label key={field}>
              {format(field)}

              <input
                type={
                  field === "dob"
                    ? "date"
                    : "text"
                }
                value={
                  form[field] ?? ""
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    [field]:
                      event.target
                        .value,
                  })
                }
              />
            </label>
          )
        )}
      </div>

      <div className="th-modal-actions">
        <button
          className="th-primary"
          disabled={saving}
          onClick={() =>
            void save()
          }
        >
          {saving
            ? "Saving..."
            : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function FormModal({
  resource,
  fields,
  form,
  setForm,
  editingId,
  departments,
  managers,
  leaveTypes,
  employees,
  projects,
  onClose,
  onSave,
  saving,
}: {
  resource: Resource;
  fields: string[];
  form: Row;
  setForm: (value: Row) => void;
  editingId: number | null;
  departments: Row[];
  managers: Row[];
  leaveTypes: Row[];
  employees: Row[];
  projects: Row[];
  onClose: () => void;
  onSave: (
    event: FormEvent
  ) => void;
  saving: boolean;
}) {
  return (
    <div className="th-modal-backdrop">
      <form
        className="th-modal"
        onSubmit={onSave}
      >
        <div className="th-modal-head">
          <h2>
            {resource ===
            "leaves"
              ? "Apply Leave"
              : editingId
                ? `Edit ${labels[resource]}`
                : labels[resource]}
          </h2>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="th-form-grid">
          {fields.map((field) => {
            if (
              resource ===
                "employees" &&
              field === "role"
            ) {
              return (
                <label key={field}>
                  Role

                  <select
                    value={
                      form.role ??
                      "EMPLOYEE"
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        role: event
                          .target
                          .value,
                      })
                    }
                    required
                  >
                    <option value="EMPLOYEE">
                      Employee
                    </option>

                    <option value="MANAGER">
                      Manager
                    </option>

                    <option value="HR">
                      HR
                    </option>

                    <option value="ADMIN">
                      Admin
                    </option>
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "employees" &&
              field ===
                "department"
            ) {
              return (
                <label key={field}>
                  Department

                  <select
                    value={
                      form.department ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        department:
                          event
                            .target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      Select Department
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.departmentName
                          }
                        >
                          {
                            department.departmentName
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "employees" &&
              field ===
                "reportingManagerId"
            ) {
              return (
                <label key={field}>
                  Reporting Manager

                  <select
                    value={
                      form.reportingManagerId ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        reportingManagerId:
                          event
                            .target
                            .value ||
                          undefined,
                      })
                    }
                  >
                    <option value="">
                      No reporting manager
                    </option>

                    {managers.map(
                      (manager) => (
                        <option
                          key={
                            manager.id
                          }
                          value={
                            manager.id
                          }
                        >
                          {
                            manager.fullName
                          }{" "}
                          (
                          {
                            manager.role
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              (
                resource ===
                  "leavePolicies" ||
                resource ===
                  "leaveBalances"
              ) &&
              field ===
                "leaveTypeId"
            ) {
              return (
                <label key={field}>
                  Leave Type

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field]:
                          event
                            .target
                            .value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Select Leave Type
                    </option>

                    {leaveTypes.map(
                      (type) => (
                        <option
                          key={type.id}
                          value={
                            type.id
                          }
                        >
                          {type.name} (
                          {type.code})
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              (
                resource ===
                  "salaryStructures" ||
                resource ===
                  "leaveBalances"
              ) &&
              (
                field ===
                  "employeeProfileId" ||
                field ===
                  "employeeId"
              )
            ) {
              return (
                <label key={field}>
                  Employee

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field]:
                          event
                            .target
                            .value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Select Employee
                    </option>

                    {employees.map(
                      (employee) => (
                        <option
                          key={
                            employee.id
                          }
                          value={
                            employee.id
                          }
                        >
                          {
                            employee.fullName
                          }{" "}
                          (
                          {
                            employee.userId
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "projects" &&
              field ===
                "departmentId"
            ) {
              return (
                <label key={field}>
                  Department

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field]:
                          event
                            .target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      Select Department
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {
                            department.departmentName
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "projects" &&
              field ===
                "employeeProfileId"
            ) {
              return (
                <label key={field}>
                  Employee

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [field]:
                          event
                            .target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      Select Employee
                    </option>

                    {employees.map(
                      (employee) => (
                        <option
                          key={
                            employee.id
                          }
                          value={
                            employee.id
                          }
                        >
                          {
                            employee.fullName
                          }{" "}
                          (
                          {
                            employee.userId
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "timesheets" &&
              field ===
                "workMode"
            ) {
              return (
                <label key={field}>
                  Work Mode

                  <select
                    value={
                      form[field] ??
                      "OFFICE"
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        workMode:
                          event
                            .target
                            .value,
                      })
                    }
                  >
                    <option value="OFFICE">
                      Office
                    </option>

                    <option value="WFH">
                      Work From Home
                    </option>

                    <option value="HYBRID">
                      Hybrid
                    </option>
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "timesheets" &&
              field ===
                "projectName"
            ) {
              return (
                <label key={field}>
                  Project

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        projectName:
                          event
                            .target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      Select Project
                    </option>

                    {projects.map(
                      (project) => (
                        <option
                          key={
                            project.id
                          }
                          value={
                            project.projectName
                          }
                        >
                          {
                            project.projectName
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              resource === "wfh" &&
              field ===
                "projectName"
            ) {
              return (
                <label key={field}>
                  Project

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        projectName:
                          event
                            .target
                            .value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Select Project
                    </option>

                    {projects.map(
                      (project) => (
                        <option
                          key={
                            project.id
                          }
                          value={
                            project.projectName
                          }
                        >
                          {
                            project.projectName
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            if (
              resource ===
                "leaves" &&
              field ===
                "leaveType"
            ) {
              return (
                <label key={field}>
                  Leave Type

                  <select
                    value={
                      form[field] ??
                      ""
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        leaveType:
                          event
                            .target
                            .value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Select Leave Type
                    </option>

                    {leaveTypes.map(
                      (type) => (
                        <option
                          key={type.id}
                          value={
                            type.name
                          }
                        >
                          {type.name} (
                          {type.code})
                        </option>
                      )
                    )}
                  </select>
                </label>
              );
            }

            return (
              <label key={field}>
                {format(field)}

                <input
                  type={
                    field
                      .toLowerCase()
                      .includes(
                        "password"
                      )
                      ? "password"
                      : [
                            "dob",
                            "joiningDate",
                            "startDate",
                            "endDate",
                            "holidayDate",
                            "effectiveFrom",
                          ].includes(
                            field
                          )
                        ? "date"
                        : [
                              "basicSalary",
                              "hra",
                              "conveyance",
                              "medicalAllowance",
                              "specialAllowance",
                              "otherAllowance",
                              "pf",
                              "esi",
                              "professionalTax",
                              "tds",
                              "loanDeduction",
                              "hoursWorked",
                              "totalCost",
                              "year",
                              "delta",
                              "employeeProfileId",
                              "employeeId",
                            ].includes(
                            field
                          )
                          ? "number"
                          : "text"
                  }
                  value={
                    form[field] ??
                    ""
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      [field]:
                        event.target
                          .value,
                    })
                  }
                  required={requiredField(
                    resource,
                    field,
                    editingId
                  )}
                />
              </label>
            );
          })}
        </div>

        <div className="th-modal-actions">
          <button
            type="button"
            className="th-outline"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="th-primary"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function getFields(
  resource: Resource,
  _path: string
): string[] {
  if (resource === "employees") {
    return [
      "userId",
      "fullName",
      "email",
      "phoneNumber",
      "dob",
      "joiningDate",
      "gender",
      "bloodGroup",
      "maritalStatus",
      "department",
      "designation",
      "role",
      "password",
      "reportingManagerId",
      "status",
    ];
  }

  if (resource === "departments") {
    return [
      "departmentName",
      "description",
      "status",
    ];
  }

  if (resource === "leaves") {
    return [
      "startDate",
      "endDate",
      "leaveType",
      "reason",
    ];
  }

  if (resource === "timesheets") {
    return [
      "date",
      "hoursWorked",
      "taskDescription",
      "workMode",
      "projectName",
    ];
  }

  if (resource === "projects") {
    return [
      "projectName",
      "clientName",
      "clientRegion",
      "departmentId",
      "employeeProfileId",
      "technology",
      "projectType",
      "totalCost",
      "onboardingDate",
      "endDate",
      "status",
      "description",
    ];
  }

  if (resource === "leaveTypes") {
    return [
      "name",
      "code",
      "defaultDays",
      "isActive",
    ];
  }

  if (
    resource ===
    "leavePolicies"
  ) {
    return [
      "name",
      "accrualRate",
      "maxCarryOver",
      "requiresApproval",
      "leaveTypeId",
    ];
  }

  if (resource === "holidays") {
    return [
      "holidayDate",
      "holidayName",
    ];
  }

  if (
    resource ===
    "leaveBalances"
  ) {
    return [
      "employeeId",
      "leaveTypeId",
      "year",
      "delta",
      "reason",
    ];
  }

  if (
    resource ===
    "salaryStructures"
  ) {
    return [
      "employeeProfileId",
      "basicSalary",
      "hra",
      "conveyance",
      "medicalAllowance",
      "specialAllowance",
      "otherAllowance",
      "pf",
      "esi",
      "professionalTax",
      "tds",
      "loanDeduction",
      "effectiveFrom",
    ];
  }

  if (
    resource ===
    "salaryGenerate"
  ) {
    return [
      "month",
      "year",
    ];
  }

  if (resource === "wfh") {
    return [
      "startDate",
      "endDate",
      "projectName",
      "reason",
    ];
  }

  if (resource === "profile") {
    return [
      "fullName",
      "email",
      "phoneNumber",
      "dob",
    ];
  }

  return [];
}

function getHeaders(
  resource: Resource,
  rows: Row[]
): string[] {
  if (rows.length) {
    return Object.keys(
      rows[0]
    )
      .filter(
        (key) =>
          ![
            "password",
            "photo",
            "children",
          ].includes(key)
      )
      .slice(0, 10);
  }

  if (
    resource === "attendance"
  ) {
    return [
      "date",
      "employeeName",
      "department",
      "checkInTime",
      "checkOutTime",
      "workingHours",
      "status",
      "workMode",
    ];
  }

  if (
    resource ===
    "notifications"
  ) {
    return [
      "employeeName",
      "message",
      "createdAt",
      "read",
    ];
  }

  return [
    "name",
    "status",
  ];
}

function renderValue(
  key: string,
  value: unknown
) {
  if (
    value == null ||
    value === ""
  ) {
    return "-";
  }

  if (
    [
      "basicSalary",
      "grossSalary",
      "netSalary",
      "totalCost",
      "amount",
    ].includes(key)
  ) {
    return money(value);
  }

  if (
    key === "status" ||
    key === "paymentStatus" ||
    key === "role"
  ) {
    return (
      <span
        className={`status ${String(
          value
        ).toLowerCase()}`}
      >
        {String(value)}
      </span>
    );
  }

  if (
    typeof value ===
    "object"
  ) {
    return JSON.stringify(
      value
    );
  }

  return String(value);
}

function requiredField(
  resource: Resource,
  field: string,
  editingId: number | null = null
): boolean {
  if (
    resource === "employees"
  ) {
    return (
      [
        "fullName",
        "email",
        "dob",
      ].includes(field) ||
      (field === "password" &&
        !editingId)
    );
  }

  if (resource === "leaves") {
    return [
      "startDate",
      "endDate",
      "leaveType",
    ].includes(field);
  }

  if (resource === "wfh") {
    return [
      "startDate",
      "endDate",
      "projectName",
      "reason",
    ].includes(field);
  }

  if (
    resource === "timesheets"
  ) {
    return [
      "date",
      "hoursWorked",
      "taskDescription",
    ].includes(field);
  }

  if (
    resource === "leaveTypes"
  ) {
    return [
      "name",
      "code",
    ].includes(field);
  }

  if (
    resource ===
    "leavePolicies"
  ) {
    return [
      "name",
      "leaveTypeId",
    ].includes(field);
  }

  if (
    resource === "holidays"
  ) {
    return [
      "holidayDate",
      "holidayName",
    ].includes(field);
  }

  if (
    resource ===
    "salaryStructures"
  ) {
    return [
      "employeeProfileId",
      "basicSalary",
    ].includes(field);
  }

  return false;
}

function format(
  key: string
): string {
  return key
    .replace(
      /([A-Z])/g,
      " $1"
    )
    .replace(
      /^./,
      (value) =>
        value.toUpperCase()
    );
}

function Hierarchy({
  data,
}: {
  data: Row[];
}) {
  const render = (
    items: Row[],
    level = 0
  ): React.ReactNode =>
    items.map(
      (item, index) => (
        <div
          key={`${item.id}-${index}`}
          style={{
            marginLeft:
              level * 24,
            marginBottom: 10,
          }}
        >
          <div
            className="th-card"
            style={{
              padding: 12,
            }}
          >
            <strong>
              {item.name}
            </strong>

            <small
              style={{
                display:
                  "block",
                color:
                  "#648b7b",
                marginTop: 3,
              }}
            >
              {item.designation ||
                ""}
            </small>
          </div>

          {Array.isArray(
            item.children
          ) &&
            render(
              item.children,
              level + 1
            )}
        </div>
      )
    );

  return (
    <div>
      {data.length ? (
        render(data)
      ) : (
        <div className="th-card empty-state">
          No hierarchy data
          found.
        </div>
      )}
    </div>
  );
}

