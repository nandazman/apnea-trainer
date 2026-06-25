import { useApp } from "../state/AppContext";

const row = "flex items-center justify-between gap-3 py-2";

export function SettingsPage() {
  const { settings } = useApp();
  const s = settings.settings;
  const u = settings.update;

  return (
    <div className="glass flex flex-col divide-y divide-glass-line p-4">
      <label className={row}>
        <span className="lowercase text-ink-dim">beeps</span>
        <input type="checkbox" checked={s.soundOn} onChange={(e) => u({ soundOn: e.target.checked })} />
      </label>
      <label className={row}>
        <span className="lowercase text-ink-dim">voice countdown</span>
        <input type="checkbox" checked={s.voiceOn} onChange={(e) => u({ voiceOn: e.target.checked })} />
      </label>
      <label className={row}>
        <span className="lowercase text-ink-dim">prep seconds</span>
        <input
          type="number"
          min={0}
          max={60}
          value={s.prep}
          onChange={(e) => u({ prep: Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0)) })}
          className="w-20 rounded-lg bg-black/30 border border-glass-line px-2 py-1 text-ink outline-none focus:border-bio/50"
        />
      </label>
      <label className={row}>
        <span className="lowercase text-ink-dim">get-ready beep · sec left</span>
        <input
          type="number"
          min={0}
          max={60}
          value={s.prepCountdown}
          onChange={(e) => u({ prepCountdown: Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0)) })}
          className="w-20 rounded-lg bg-black/30 border border-glass-line px-2 py-1 text-ink outline-none focus:border-bio/50"
        />
      </label>
      <label className={row}>
        <span className="lowercase text-ink-dim">hold beep · sec left</span>
        <input
          type="number"
          min={0}
          max={300}
          value={s.holdCountdown}
          onChange={(e) => u({ holdCountdown: Math.max(0, Math.min(300, parseInt(e.target.value, 10) || 0)) })}
          className="w-20 rounded-lg bg-black/30 border border-glass-line px-2 py-1 text-ink outline-none focus:border-bio/50"
        />
      </label>
      <label className={row}>
        <span className="lowercase text-ink-dim">keep screen awake</span>
        <input type="checkbox" checked={s.wakeOn} onChange={(e) => u({ wakeOn: e.target.checked })} />
      </label>
      <label className={row}>
        <span className="lowercase text-ink-dim">ambient motion</span>
        <select
          value={s.motion}
          onChange={(e) => u({ motion: e.target.value as "full" | "reduced" })}
          className="rounded-lg bg-black/30 border border-glass-line px-2 py-1 text-ink outline-none focus:border-bio/50"
        >
          <option value="full">full</option>
          <option value="reduced">reduced</option>
        </select>
      </label>
    </div>
  );
}
