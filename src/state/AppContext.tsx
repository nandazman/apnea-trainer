import { createContext, use, useState, type ReactNode } from "react";
import { useSettings, type SettingsApi } from "./useSettings";
import { useHistory, type HistoryApi } from "./useHistory";

interface AppCtx {
  settings: SettingsApi;
  history: HistoryApi;
  // True while a session is running, so Root can lift the particle layer above the focus backdrop.
  sessionActive: boolean;
  setSessionActive: (active: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const history = useHistory();
  const [sessionActive, setSessionActive] = useState(false);
  return (
    <Ctx.Provider value={{ settings, history, sessionActive, setSessionActive }}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const c = use(Ctx);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}
