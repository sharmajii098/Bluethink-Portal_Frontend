import { createContext, useContext } from "react";
export const RequestViewContext = createContext(false);
export const useSelfService = () => useContext(RequestViewContext);
