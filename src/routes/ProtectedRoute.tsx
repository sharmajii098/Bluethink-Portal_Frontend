import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useSelector,
} from "react-redux";

import type {
  RootState,
} from "../store";

import type {
  Role,
} from "../types/auth";

interface ProtectedRouteProps {
  roles?: Role[];
}

export default function ProtectedRoute({
  roles = [],
}: ProtectedRouteProps) {

  const location = useLocation();

  const session = useSelector(
    (state: RootState) =>
      state.auth.session
  );

  if (!session?.token) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  const sessionRole =
    session.role.toUpperCase() as Role;

  if (
    roles.length > 0 &&
    !roles.includes(sessionRole)
  ) {

    return (
      <Navigate
        to={`/${sessionRole.toLowerCase()}/dashboard`}
        replace
      />
    );
  }

  return <Outlet />;
}