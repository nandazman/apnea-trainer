import { createContext, useContext, type ReactNode } from "react";
import { useSettings, type SettingsApi } from "./useSettings";
import { useHistory, type HistoryApi } from "./useHistory";

interface AppCtx {
  settings: SettingsApi;
  history: HistoryApi;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const history = useHistory();
  return <Ctx.Provider value={{ settings, history }}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}
