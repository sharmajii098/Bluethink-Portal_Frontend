import { createTheme } from "@mui/material/styles";

export function createWorkspaceTheme(role = "EMPLOYEE") {
// Four distinct premium role identities. Security rules and routing are unchanged.
const tones: Record<string, {primary:string; tint:string; paper:string; ink:string; muted:string; line:string; highlight:string; contrast:string}> = {
  ADMIN:    {primary:"#194C7A", tint:"#E9EEF4", paper:"#F3F4F6", ink:"#192F46", muted:"#52667B", line:"#D6DFEA", highlight:"#C95C50", contrast:"#FFFFFF"},
  HR:       {primary:"#245740", tint:"#EEE7D8", paper:"#F5F0E6", ink:"#243E31", muted:"#566B5C", line:"#DBD2BF", highlight:"#987743", contrast:"#FFFFFF"},
  MANAGER:  {primary:"#523760", tint:"#EDE4F2", paper:"#F6F3F8", ink:"#33253F", muted:"#675775", line:"#DFD4E6", highlight:"#906AA6", contrast:"#FFFFFF"},
  EMPLOYEE: {primary:"#416A90", tint:"#E7ECF2", paper:"#F3F5F8", ink:"#273F58", muted:"#526980", line:"#D7E0EA", highlight:"#C86B61", contrast:"#FFFFFF"},
};
const tone = tones[role.toUpperCase()] ?? tones.EMPLOYEE;
const primary = tone.primary;
return createTheme({
  palette: {
    mode: "light",
    primary: {
      main: primary,
      contrastText: "#ffffff",
    },
    secondary: {
      main: tone.highlight,
      dark: tone.primary,
      light: tone.tint,
      contrastText: tone.contrast,
    },
    success: { main: "#16875a" },
    warning: { main: "#c77816" },
    error: { main: "#c93443" },
    background: {
      default: tone.paper,
      paper: "#ffffff",
    },
    text: {
      primary: tone.ink,
      secondary: tone.muted,
    },
    divider: tone.line,
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
          color: tone.ink,
          backgroundColor: tone.tint,
        },
        body: {
          fontSize: "0.78125rem",
          color: tone.ink,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${tone.line}`,
          boxShadow: "0 3px 14px rgba(57,43,33,.04)",
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
          backgroundColor: "#ffffff",
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
}
export const theme = createWorkspaceTheme();
