import { useCallback, useState } from "react";
import type { SessionLog } from "../lib/types";
import { loadHistory, mergeHistory, saveHistory } from "../lib/storage";

/** Persisted session log. */
export function useHistory() {
  const [history, setHistory] = useState<SessionLog[]>(loadHistory);

  const write = useCallback((next: SessionLog[]) => {
    saveHistory(next);
    setHistory(next);
  }, []);

  const append = useCallback(
    (entry: SessionLog) => {
      setHistory((prev) => {
        const next = [entry, ...prev];
        saveHistory(next);
        return next;
      });
    },
    [],
  );

  const update = useCallback((id: string, patch: Partial<SessionLog>) => {
    setHistory((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      saveHistory(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const importHistory = useCallback(
    (incoming: unknown) => {
      setHistory((prev) => {
        const next = mergeHistory(prev, incoming);
        saveHistory(next);
        return next;
      });
    },
    [],
  );

  /** Best free-mode hold across all logs. */
  const personalBest = history.reduce(
    (max, e) => (e.mode === "free" ? Math.max(max, e.maxHoldSec) : max),
    0,
  );

  return { history, append, update, remove, importHistory, write, personalBest };
}

export type HistoryApi = ReturnType<typeof useHistory>;
