import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#255ec1",
      dark: "#1d4894",
      light: "#83a9ec",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9c7765",
      dark: "#785749",
      light: "#c5a595",
      contrastText: "#ffffff",
    },
    success: { main: "#16875a" },
    warning: { main: "#c77816" },
    error: { main: "#c93443" },
    background: {
      default: "#f4f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#263e45",
      secondary: "#586c80",
    },
    divider: "#e5e9e1",
  },
  shape: {
    borderRadius: 9,
  },
  typography: {
    fontFamily:
      'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 600, letterSpacing: "-0.035em" },
    h2: { fontWeight: 600, letterSpacing: "-0.03em" },
    h3: { fontWeight: 600, letterSpacing: "-0.02em" },
    h4: { fontWeight: 600, letterSpacing: "-0.025em" },
    body1: { fontSize: "0.875rem", lineHeight: 1.55 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600, fontSize: "0.8125rem" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          minHeight: 40,
          paddingInline: 14,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: "none",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: "#607687",
          backgroundColor: "#f5f9fb",
        },
        body: {
          fontSize: "0.78125rem",
          color: "#3f5667",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e3e8df",
          boxShadow: "0 3px 14px rgba(25,44,49,.035)",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "#fcfdfb",
          "&.Mui-focused": {
            backgroundColor: "#ffffff",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
  },
});
