import type { Settings, SessionLog } from "./types";

export const SETTINGS_KEY = "apnea-trainer-settings-v1";
export const HISTORY_KEY = "apnea-trainer-history-v1";

export const defaultSettings: Settings = {
  mode: "co2",
  config: {
    co2: { hold: 60, rounds: 8, restStart: 120, restEnd: 15 },
    o2: { rest: 120, rounds: 8, holdStart: 60, holdEnd: 150 },
    free: { target: 0 },
    custom: {
      rounds: [
        { hold: 30, rest: 30 },
        { hold: 45, rest: 30 },
        { hold: 60, rest: 30 },
        { hold: 75, rest: 0 },
      ],
    },
  },
  prep: 10,
  soundOn: true,
  voiceOn: true,
  wakeOn: false,
  motion: "full",
};

/** Migration-safe load: deep-merge stored settings over defaults. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(defaultSettings);
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...structuredClone(defaultSettings),
      ...parsed,
      config: { ...structuredClone(defaultSettings.config), ...(parsed.config ?? {}) },
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadHistory(): SessionLog[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SessionLog[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(h: SessionLog[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

/** Download { settings, history } as a JSON file. */
export function exportData(settings: Settings, history: SessionLog[]): void {
  const blob = new Blob([JSON.stringify({ settings, history }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `apnea-trainer-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Validate + merge imported history by id (incoming wins). Returns merged list. */
export function mergeHistory(existing: SessionLog[], incoming: unknown): SessionLog[] {
  if (!Array.isArray(incoming)) throw new Error("history is not an array");
  const byId = new Map<string, SessionLog>();
  for (const e of existing) byId.set(e.id, e);
  for (const raw of incoming) {
    const e = raw as SessionLog;
    if (!e || typeof e.id !== "string" || typeof e.date !== "string") {
      throw new Error("invalid log entry");
    }
    byId.set(e.id, e);
  }
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
}
