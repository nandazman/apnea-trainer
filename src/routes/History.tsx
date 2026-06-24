import { useRef } from "react";
import { HistoryList } from "../components/HistoryList";
import { fmt } from "../lib/format";
import { exportData } from "../lib/storage";
import { useApp } from "../state/AppContext";

const btn = "rounded-lg border border-glass-line px-3 py-2 text-sm lowercase text-ink-dim hover:text-bio";

export function History() {
  const { settings, history } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (data.history) history.importHistory(data.history);
      if (data.settings) settings.setSettings(data.settings);
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="glass flex items-center justify-between p-4">
        <div>
          <div className="text-xs text-ink-dim lowercase">personal best (free hold)</div>
          <div className="tabular-nums font-thin leading-none tracking-[0.04em] text-4xl text-bio">{fmt(history.personalBest)}</div>
        </div>
        <div className="flex gap-2">
          <button className={btn} onClick={() => exportData(settings.settings, history.history)}>export</button>
          <button className={btn} onClick={() => fileRef.current?.click()}>import</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <HistoryList api={history} />
    </div>
  );
}
