import {
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type {
  UserSession,
} from "../types/auth";

interface AuthState {
  session: UserSession | null;
  isAuthenticated: boolean;
}

function loadSession(): UserSession | null {

  try {

    // Each tab must keep its own identity when testing Employee, Manager and HR.
    // Migrate a pre-V8.5.2 session once, without continuing shared-token writes.
    const saved =
      sessionStorage.getItem("hrms_session") || localStorage.getItem("hrms_session");
    if (saved && !sessionStorage.getItem("hrms_session")) {
      sessionStorage.setItem("hrms_session", saved);
      const previousToken = localStorage.getItem("hrms_token");
      if (previousToken) sessionStorage.setItem("hrms_token", previousToken);
      localStorage.removeItem("hrms_session");
      localStorage.removeItem("hrms_token");
    }

    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved) as UserSession;
    // Repair older tab sessions where the serialized session survived but the
    // dedicated token key was absent. Never migrate another tab's token.
    if (parsed?.token && !sessionStorage.getItem("hrms_token")) {
      sessionStorage.setItem("hrms_token", parsed.token);
    }
    return parsed;

  } catch (error) {

    console.error(
      "Unable to load saved session:",
      error
    );

    sessionStorage.removeItem("hrms_session");
    sessionStorage.removeItem("hrms_token");
    localStorage.removeItem("hrms_session");
    localStorage.removeItem("hrms_token");

    return null;
  }
}

const session = loadSession();

const initialState: AuthState = {
  session,
  isAuthenticated: Boolean(session?.token),
};

const authSlice = createSlice({

  name: "auth",

  initialState,

  reducers: {

    setSession: (
      state,
      action: PayloadAction<UserSession>
    ) => {

      state.session = action.payload;
      state.isAuthenticated = true;

      sessionStorage.setItem(
        "hrms_session",
        JSON.stringify(action.payload)
      );

      sessionStorage.setItem(
        "hrms_token",
        action.payload.token
      );
      // Prevent a new tab inheriting an obsolete account via legacy storage.
      localStorage.removeItem("hrms_session");
      localStorage.removeItem("hrms_token");
    },

    logout: (state) => {

      state.session = null;
      state.isAuthenticated = false;

      sessionStorage.removeItem("hrms_session");
      sessionStorage.removeItem("hrms_token");
      localStorage.removeItem("hrms_session");
      localStorage.removeItem("hrms_token");
    },
  },
});

export const {
  setSession,
  logout,
} = authSlice.actions;

export default authSlice.reducer;