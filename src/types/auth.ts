export type Role =
  | "ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE";

export interface LoginRequest {
  userId: string;
  password: string;
  workMode?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  userId?: string;
  role?: string;
  fullName?: string;
  designation?: string;
  workMode?: string;
  permissions?: string[];
}

export interface UserSession {
  token: string;
  userId: string;
  role: Role;
  fullName?: string;
  designation?: string;
  permissions: string[];
}