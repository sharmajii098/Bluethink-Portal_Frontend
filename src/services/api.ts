import axios from "axios";

export const api = axios.create({
  timeout: 30000,
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Add JWT token to every API request.
 */
api.interceptors.request.use(
  (config) => {
    // Keep authentication tab-scoped so HR/Manager/Employee sessions do not leak
    // between tabs. Older saved sessions may have hrms_session but no separate
    // hrms_token key; recover the token from that same tab's session object.
    let token = sessionStorage.getItem("hrms_token");
    if (!token) {
      try {
        const savedSession = sessionStorage.getItem("hrms_session");
        const parsed = savedSession ? JSON.parse(savedSession) : null;
        const restoredToken = parsed?.token;
        if (typeof restoredToken === "string" && restoredToken.trim()) {
          token = restoredToken;
          sessionStorage.setItem("hrms_token", restoredToken);
        }
      } catch {
        // Leave token unset; protected endpoints should reject unauthenticated requests.
      }
    }

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Handle API responses.
 *
 * IMPORTANT:
 * We do NOT immediately remove the login session on every 401.
 * This prevents a single dashboard API failure from logging the
 * user out automatically.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);