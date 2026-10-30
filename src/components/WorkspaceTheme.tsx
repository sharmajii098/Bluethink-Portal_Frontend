import {useMemo, type ReactNode} from "react";
import {useSelector} from "react-redux";
import {ThemeProvider} from "@mui/material";
import type {RootState} from "../store";
import {createWorkspaceTheme} from "../theme";
export default function WorkspaceTheme({children}:{children:ReactNode}) {
 const role=useSelector((s:RootState)=>s.auth.session?.role || "EMPLOYEE");
 const theme=useMemo(()=>createWorkspaceTheme(role.replace(/^ROLE_/,"")),[role]);
 return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
