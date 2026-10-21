import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { store } from "./store";
import { theme } from "./theme";
import App from "./App";

// Order matters: later role/UI layers intentionally refine the base theme.
import "./styles/portal.css";
import "./styles/studio.css";
import "./styles/workspace.css";
import "./styles/premium-roles.css";
import "./styles/refined-ux.css";
import "./styles/v18-premium-refresh.css";
import "./styles/v19-distinct-roles.css";
import "./styles/v25_3-role-identity.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
);
