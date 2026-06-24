import { useCallback, useState } from "react";
import type { Mode, Settings } from "../lib/types";
import { loadSettings, saveSettings } from "../lib/storage";

/** Persisted settings. Any update writes through to localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setMode = useCallback((mode: Mode) => update({ mode }), [update]);

  // Patch one mode's config block. `keyof` keeps callers honest per mode.
  const updateConfig = useCallback(
    <M extends Mode>(mode: M, cfg: Partial<Settings["config"][M]>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          config: { ...prev.config, [mode]: { ...prev.config[mode], ...cfg } },
        };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  return { settings, update, setMode, updateConfig, setSettings };
}

export type SettingsApi = ReturnType<typeof useSettings>;
