import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline } from "@mui/material";

import { store } from "./store";
import WorkspaceTheme from "./components/WorkspaceTheme";
import App from "./App";
import SessionBoundary from "./components/SessionBoundary";
import AppErrorBoundary from "./components/AppErrorBoundary";

// Order matters: later role/UI layers intentionally refine the base theme.
import "./styles/portal.css";
import "./styles/studio.css";
import "./styles/workspace.css";
import "./styles/premium-roles.css";
import "./styles/refined-ux.css";
import "./styles/v18-premium-refresh.css";
import "./styles/v19-distinct-roles.css";
import "./styles/v25_3-role-identity.css";
import "./styles/enterprise-v26.css";
// V26.1: scoped final layout layer, overriding obsolete global !important widths.
import "./styles/ui-v26-1.css";
import "./styles/workspace-premium.css";
import "./styles/v28_5-signature-workspaces.css";
import "./styles/v28_6-palette-workspaces.css";
import "./styles/v28_6-wordmark.css";
import "./styles/v28_7-material-workspaces.css";
// Contrast hotfix: high-specificity scoped corrections after screenshot review.
import "./styles/v28_7_1-contrast-fix.css";
import "./styles/production.css";
import "./styles/ai-assistant-button.css";

const queryClient = new QueryClient({ defaultOptions: { queries: {
  retry: (count, error: any) => ![401, 403, 404].includes(error?.response?.status) && count < 1,
  staleTime: 30_000,
  refetchOnWindowFocus: false,
} } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WorkspaceTheme>
          <CssBaseline />
          <BrowserRouter>
            <AppErrorBoundary><SessionBoundary><App /></SessionBoundary></AppErrorBoundary>
          </BrowserRouter>
        </WorkspaceTheme>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
);
