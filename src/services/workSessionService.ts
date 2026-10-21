import { api } from "./api";

export type WorkSegment = {
  id?: number | null;
  loginTime?: string | null;
  signoffTime?: string | null;
  workingHours?: number | null;
  workingMinutes?: number | null;
  workMode?: string | null;
  active?: boolean;
  unverified?: boolean;
  status?: string;
};

export type WorkSession = {
  id?: number | null;
  employeeId?: string | null;
  employeeName?: string | null;
  date?: string | null;
  loginTime?: string | null;
  firstLoginTime?: string | null;
  signoffTime?: string | null;
  logoutTime?: string | null;
  workingHours?: number | null;
  workingMinutes?: number | null;
  requiredMinutes?: number | null;
  remainingMinutes?: number | null;
  progressPercent?: number | null;
  workMode?: string | null;
  status?: string | null;
  active?: boolean;
  paused?: boolean;
  signedOff?: boolean;
  targetMet?: boolean;
  previousDayUnfinished?: boolean;
  expiredUnverified?: boolean;
  sessionCount?: number;
  completedSegments?: number;
  segments?: WorkSegment[];
  action?: string;
  lastSegmentMinutes?: number | null;
  success?: boolean;
  message?: string;
};

export async function getTodayWorkSession(): Promise<WorkSession> {
  const response = await api.get<WorkSession>("/auth/work-session/today");
  return response.data;
}

export async function signOffWorkday(): Promise<WorkSession> {
  const response = await api.post<WorkSession>("/auth/signoff");
  return response.data;
}

export async function resumeWork(): Promise<WorkSession> {
  const response = await api.post<WorkSession>("/auth/work-session/resume");
  return response.data;
}

export async function getWorkSessionHistory(): Promise<WorkSession[]> {
  const response = await api.get<WorkSession[]>("/auth/work-session/history");
  return Array.isArray(response.data) ? response.data : [];
}
