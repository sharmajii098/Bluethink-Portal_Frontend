import type { Role, UserSession } from "../types/auth";

const VALID_ROLES = new Set<Role>(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]);

/**
 * Read the authenticated role from the same per-tab session used by authSlice.
 * Legacy builds read `hrms_role` from localStorage even though login never wrote it,
 * causing management pages to silently behave like employee self-service pages.
 */
export function getCurrentRole(): Role {
  try {
    const raw = sessionStorage.getItem("hrms_session") || localStorage.getItem("hrms_session");
    if (!raw) return "EMPLOYEE";
    const session = JSON.parse(raw) as Partial<UserSession>;
    const role = String(session.role || "").replace(/^ROLE_/i, "").toUpperCase() as Role;
    return VALID_ROLES.has(role) ? role : "EMPLOYEE";
  } catch {
    return "EMPLOYEE";
  }
}

export function isManagementRole(role: string): boolean {
  return ["ADMIN", "HR", "MANAGER"].includes(String(role || "").replace(/^ROLE_/i, "").toUpperCase());
}
