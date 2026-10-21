import { api } from "./api";

import type {
  LoginRequest,
  LoginResponse,
} from "../types/auth";

export async function login(
  request: LoginRequest
): Promise<LoginResponse> {

  const response = await api.post<LoginResponse>(
    "/auth/login",
    request
  );

  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");

  return response.data;
}
export async function logout() {
  const response = await api.post("/auth/logout");
  return response.data;
}
