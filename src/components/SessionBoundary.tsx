import { type ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { logout } from "../store/authSlice";
import type { RootState } from "../store";

/** Keep private query data and in-flight responses scoped to one identity. */
export default function SessionBoundary({ children }: { children: ReactNode }) {
  const token = useSelector((state: RootState) => state.auth.session?.token);
  const dispatch = useDispatch();
  const client = useQueryClient();

  useEffect(() => {
    client.clear();
    const controller = new AbortController();
    const expire = (event: Event) => {
      if (!token || (event as CustomEvent<string>).detail !== token) return;
      client.clear();
      dispatch(logout(true));
    };
    window.addEventListener("hrms-session-expired", expire);
    if (token) {
      // Server verifies signature, current role, account status and revocation.
      // Temporary network failures retain the session; 401 is handled centrally.
      void api.get("/auth/me", { signal: controller.signal }).catch(() => undefined);
    }
    return () => {
      controller.abort();
      window.removeEventListener("hrms-session-expired", expire);
      client.clear();
    };
  }, [token, client, dispatch]);

  return <>{children}</>;
}
