import { downloadBrandedCsv } from "../utils/brandedExport";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  DownloadRounded,
  RefreshRounded,
} from "@mui/icons-material";
import { api } from "../services/api";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
type RiskFilter = "ALL" | RiskLevel;

interface AttendanceRecord {
  employeeId?: string | number;
  employeeName?: string;
  department?: string;
  date?: string;
  status?: string;
}

interface LeaveRecord {
  employeeId?: string | number;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number | string;
  status?: string;
}

interface RiskRow {
  employeeName: string;
  department: string;
  attendanceDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  pendingLeaves: number;
  attendanceRate: number;
  risk: RiskLevel;
}

interface EmployeeRiskData {
  employeeName: string;
  department: string;
  attendanceDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  pendingLeaves: number;
}

interface Summary {
  employees: number;
  high: number;
  medium: number;
  absent: number;
  leave: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const num = (
  value: number | string | undefined
): number => {
  return Number(value || 0);
};

const dateOnly = (
  value: string | undefined
): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const exportCsv = (rows: RiskRow[]): void => {
  if (rows.length === 0) {
    return;
  }

  const keys: Array<keyof RiskRow> = [
    "employeeName",
    "department",
    "attendanceDays",
    "presentDays",
    "absentDays",
    "leaveDays",
    "pendingLeaves",
    "attendanceRate",
    "risk",
  ];

  const header = keys.map(String);

  const data = rows.map((row) =>
    keys.map((key) => {
      const value = row[key];

      return `"${String(value ?? "").replaceAll(
        '"',
        '""'
      )}"`;
    })
  );

  const csvContent = [header, ...data]
    .map((row) => row.join(","))
    .join("\n");

  void downloadBrandedCsv(csvContent, "attendance-leave-risk.csv");
};

export default function AttendanceLeaveRiskPage() {
  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  const [leaves, setLeaves] =
    useState<LeaveRecord[]>([]);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const [days, setDays] =
    useState<number>(90);

  const [search, setSearch] =
    useState<string>("");

  const [risk, setRisk] =
    useState<RiskFilter>("ALL");

  const load = async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      const [
        attendanceResponse,
        leavesResponse,
      ] = await Promise.all([
        api.get<AttendanceRecord[]>(
          "/reports/attendance"
        ),
        api.get<LeaveRecord[]>(
          "/reports/leaves"
        ),
      ]);

      setAttendance(
        Array.isArray(attendanceResponse.data)
          ? attendanceResponse.data
          : []
      );

      setLeaves(
        Array.isArray(leavesResponse.data)
          ? leavesResponse.data
          : []
      );
    } catch (errorObject: unknown) {
      const apiError =
        errorObject as ApiError;

      setError(
        apiError.response?.data?.message ||
          "Unable to load attendance and leave risk data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo<RiskRow[]>(() => {
    const cutoff = new Date();

    cutoff.setDate(
      cutoff.getDate() - days
    );

    const employeeMap =
      new Map<string, EmployeeRiskData>();

    /*
     * Process attendance
     */
    attendance.forEach(
      (attendanceRecord) => {
        const attendanceDate = dateOnly(
          attendanceRecord.date
        );

        if (
          !attendanceDate ||
          attendanceDate < cutoff
        ) {
          return;
        }

        const employeeId = String(
          attendanceRecord.employeeId ||
            attendanceRecord.employeeName ||
            "Unknown"
        );

        let employee =
          employeeMap.get(employeeId);

        if (!employee) {
          employee = {
            employeeName:
              attendanceRecord.employeeName ||
              "Unknown",

            department:
              attendanceRecord.department ||
              "Unassigned",

            attendanceDays: 0,
            presentDays: 0,
            absentDays: 0,
            leaveDays: 0,
            pendingLeaves: 0,
          };

          employeeMap.set(
            employeeId,
            employee
          );
        }

        employee.attendanceDays += 1;

        const status = String(
          attendanceRecord.status || ""
        ).toUpperCase();

        if (
          status.includes("PRESENT") ||
          status === "P"
        ) {
          employee.presentDays += 1;
        }

        if (
          status.includes("ABSENT") ||
          status === "A"
        ) {
          employee.absentDays += 1;
        }
      }
    );

    /*
     * Process leaves
     */
    leaves.forEach((leave) => {
      const startDate = dateOnly(
        leave.startDate
      );

      const endDate = dateOnly(
        leave.endDate
      );

      if (
        !startDate ||
        !endDate ||
        endDate < cutoff
      ) {
        return;
      }

      const employeeId = String(
        leave.employeeId ||
          leave.employeeName ||
          "Unknown"
      );

      let employee =
        employeeMap.get(employeeId);

      if (!employee) {
        employee = {
          employeeName:
            leave.employeeName ||
            "Unknown",

          department: "Unassigned",

          attendanceDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          pendingLeaves: 0,
        };

        employeeMap.set(
          employeeId,
          employee
        );
      }

      employee.leaveDays += num(
        leave.totalDays
      );

      const leaveStatus = String(
        leave.status || ""
      ).toUpperCase();

      if (
        leaveStatus === "PENDING" ||
        leaveStatus === "SUBMITTED" ||
        leaveStatus === "UNDER_REVIEW"
      ) {
        employee.pendingLeaves += 1;
      }
    });

    /*
     * Risk priority
     */
    const riskOrder: Record<
      RiskLevel,
      number
    > = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    };

    /*
     * Calculate risk
     */
    const calculatedRows: RiskRow[] =
      Array.from(
        employeeMap.values()
      ).map((employee) => {
        const attendanceRate =
          employee.attendanceDays > 0
            ? (employee.presentDays /
                employee.attendanceDays) *
              100
            : 100;

        let score = 0;

        /*
         * Absent days
         */
        if (
          employee.absentDays >= 5
        ) {
          score += 2;
        }

        /*
         * Attendance percentage
         */
        if (attendanceRate < 85) {
          score += 2;
        } else if (
          attendanceRate < 92
        ) {
          score += 1;
        }

        /*
         * Pending leaves
         */
        if (
          employee.pendingLeaves >= 2
        ) {
          score += 1;
        }

        /*
         * Total leave days
         */
        if (
          employee.leaveDays >= 15
        ) {
          score += 1;
        }

        let employeeRisk: RiskLevel =
          "LOW";

        if (score >= 4) {
          employeeRisk = "HIGH";
        } else if (score >= 2) {
          employeeRisk = "MEDIUM";
        }

        return {
          employeeName:
            employee.employeeName,

          department:
            employee.department,

          attendanceDays:
            employee.attendanceDays,

          presentDays:
            employee.presentDays,

          absentDays:
            employee.absentDays,

          leaveDays:
            employee.leaveDays,

          pendingLeaves:
            employee.pendingLeaves,

          attendanceRate,

          risk: employeeRisk,
        };
      });

    /*
     * Search and risk filter
     */
    const filteredRows =
      calculatedRows.filter(
        (employee) => {
          const query =
            search.trim().toLowerCase();

          const matchesSearch =
            query === "" ||
            `${employee.employeeName} ${employee.department}`
              .toLowerCase()
              .includes(query);

          const matchesRisk =
            risk === "ALL" ||
            employee.risk === risk;

          return (
            matchesSearch &&
            matchesRisk
          );
        }
      );

    /*
     * Sort:
     * HIGH -> MEDIUM -> LOW
     * Then highest absent days first
     */
    filteredRows.sort((a, b) => {
      const riskDifference =
        riskOrder[a.risk] -
        riskOrder[b.risk];

      if (riskDifference !== 0) {
        return riskDifference;
      }

      return (
        b.absentDays -
        a.absentDays
      );
    });

    return filteredRows;
  }, [
    attendance,
    leaves,
    days,
    search,
    risk,
  ]);

  /*
   * Summary
   */
  const summary =
    useMemo<Summary>(() => {
      return {
        employees: rows.length,

        high: rows.filter(
          (row) =>
            row.risk === "HIGH"
        ).length,

        medium: rows.filter(
          (row) =>
            row.risk === "MEDIUM"
        ).length,

        absent: rows.reduce(
          (total, row) =>
            total + row.absentDays,
          0
        ),

        leave: rows.reduce(
          (total, row) =>
            total + row.leaveDays,
          0
        ),
      };
    }, [rows]);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="th-page-header">
        <div>
          <h1>
            Attendance & Leave Risk Dashboard
          </h1>

          <div className="th-breadcrumb">
            Dashboard{" "}
            <span>›</span>{" "}
            Attendance & Leave Risk
          </div>
        </div>

        <div className="th-header-actions">
          <button
            className="th-outline"
            disabled={rows.length === 0}
            onClick={() =>
              exportCsv(rows)
            }
          >
            <DownloadRounded fontSize="small" />
            Export Excel
          </button>

          <button
            className="th-outline"
            onClick={() =>
              void load()
            }
          >
            <RefreshRounded fontSize="small" />
            Refresh
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* FILTERS */}
      <div className="th-card report-filter-card">
        <div className="report-filter-title">
          Risk Analysis Filters
        </div>

        <div className="report-filters">
          <label>
            Window

            <select
              value={days}
              onChange={(event) =>
                setDays(
                  Number(
                    event.target.value
                  )
                )
              }
            >
              <option value={30}>
                Last 30 days
              </option>

              <option value={60}>
                Last 60 days
              </option>

              <option value={90}>
                Last 90 days
              </option>

              <option value={180}>
                Last 180 days
              </option>
            </select>
          </label>

          <label>
            Search

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Employee or department"
            />
          </label>

          <label>
            Risk

            <select
              value={risk}
              onChange={(event) => {
                setRisk(
                  event.target.value as RiskFilter
                );
              }}
            >
              <option value="ALL">
                ALL
              </option>

              <option value="HIGH">
                HIGH
              </option>

              <option value="MEDIUM">
                MEDIUM
              </option>

              <option value="LOW">
                LOW
              </option>
            </select>
          </label>
        </div>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="th-loading">
          <CircularProgress size={22} />
          Loading attendance and leave risk...
        </div>
      ) : (
        <>
          {/* SUMMARY */}
          <div className="th-grid th-stats-grid report-summary">
            {[
              [
                "Employees analyzed",
                summary.employees,
              ],
              [
                "High risk",
                summary.high,
              ],
              [
                "Medium risk",
                summary.medium,
              ],
              [
                "Absent days",
                summary.absent,
              ],
              [
                "Leave days",
                summary.leave,
              ],
            ].map(
              ([title, value]) => (
                <div
                  className="th-card th-stat-card"
                  key={String(title)}
                >
                  <div className="th-card-title">
                    {title}
                  </div>

                  <div className="th-stat-value">
                    {value}
                  </div>
                </div>
              )
            )}
          </div>

          {/* TABLE */}
          <div className="th-card table-card">
            <div className="table-toolbar">
              <div>
                <strong>
                  Employee Risk Register
                </strong>

                <small>
                  Attendance absence + leave
                  pressure indicators
                </small>
              </div>
            </div>

            {rows.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Employee
                      </th>

                      <th>
                        Department
                      </th>

                      <th>
                        Attendance Days
                      </th>

                      <th>
                        Present
                      </th>

                      <th>
                        Absent
                      </th>

                      <th>
                        Leave Days
                      </th>

                      <th>
                        Attendance Rate
                      </th>

                      <th>
                        Risk
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(
                      (row, index) => (
                        <tr
                          key={`${row.employeeName}-${index}`}
                        >
                          <td>
                            <b>
                              {
                                row.employeeName
                              }
                            </b>
                          </td>

                          <td>
                            {
                              row.department
                            }
                          </td>

                          <td>
                            {
                              row.attendanceDays
                            }
                          </td>

                          <td>
                            {
                              row.presentDays
                            }
                          </td>

                          <td>
                            {
                              row.absentDays
                            }
                          </td>

                          <td>
                            {
                              row.leaveDays
                            }
                          </td>

                          <td>
                            {row.attendanceRate.toFixed(
                              1
                            )}
                            %
                          </td>

                          <td>
                            <span
                              className={`status-pill ${row.risk.toLowerCase()}`}
                            >
                              {
                                row.risk
                              }
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h3>
                  No risk records found
                </h3>

                <p>
                  Adjust the analysis window
                  or filters.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
