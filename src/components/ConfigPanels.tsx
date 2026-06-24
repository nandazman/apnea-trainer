import { useEffect, useState } from "react";
import { fmt, parseTime } from "../lib/format";
import { presets } from "../lib/presets";
import type { SettingsApi } from "../state/useSettings";

const inputCls =
  "w-full rounded-lg bg-black/30 border border-glass-line px-3 py-2 text-ink outline-none focus:border-bio/50";
const labelCls = "flex flex-col gap-1 text-xs text-ink-dim lowercase tracking-wide";

/** mm:ss text field that commits parsed seconds live and reformats on blur. */
function TimeInput({
  value,
  onCommit,
  placeholder,
  allowEmpty,
}: {
  value: number;
  onCommit: (sec: number) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(() => (allowEmpty && !value ? "" : fmt(value)));
  useEffect(() => {
    setText(allowEmpty && !value ? "" : fmt(value));
  }, [value, allowEmpty]);
  return (
    <input
      className={inputCls}
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onCommit(parseTime(e.target.value));
      }}
      onBlur={() => setText(allowEmpty && !value ? "" : fmt(parseTime(text)))}
    />
  );
}

function NumberInput({
  value,
  onCommit,
  min = 1,
  max = 30,
}: {
  value: number;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      className={inputCls}
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onCommit(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0)))}
    />
  );
}

export function ConfigPanels({ api }: { api: SettingsApi }) {
  const { settings, updateConfig, setSettings } = api;
  const { mode, config } = settings;

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setSettings((prev) => ({
      ...prev,
      mode: p.mode,
      config: { ...prev.config, [p.mode]: { ...prev.config[p.mode], ...p.cfg } },
    }));
  };

  return (
    <div className="glass flex flex-col gap-4 p-4">
      <div key={mode} className="animate-surface flex flex-col gap-4">
      {mode === "co2" && (
        <>
          <p className="text-xs text-ink-dim">Fixed hold, rest shrinks each round — CO₂ tolerance.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>hold
              <TimeInput value={config.co2.hold} onCommit={(v) => updateConfig("co2", { hold: v })} placeholder="1:00" />
            </label>
            <label className={labelCls}>rounds
              <NumberInput value={config.co2.rounds} onCommit={(v) => updateConfig("co2", { rounds: v })} />
            </label>
            <label className={labelCls}>rest start
              <TimeInput value={config.co2.restStart} onCommit={(v) => updateConfig("co2", { restStart: v })} placeholder="2:00" />
            </label>
            <label className={labelCls}>rest end
              <TimeInput value={config.co2.restEnd} onCommit={(v) => updateConfig("co2", { restEnd: v })} placeholder="0:15" />
            </label>
          </div>
        </>
      )}

      {mode === "o2" && (
        <>
          <p className="text-xs text-ink-dim">Fixed rest, hold grows each round — hypoxia tolerance.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>rest
              <TimeInput value={config.o2.rest} onCommit={(v) => updateConfig("o2", { rest: v })} placeholder="2:00" />
            </label>
            <label className={labelCls}>rounds
              <NumberInput value={config.o2.rounds} onCommit={(v) => updateConfig("o2", { rounds: v })} />
            </label>
            <label className={labelCls}>hold start
              <TimeInput value={config.o2.holdStart} onCommit={(v) => updateConfig("o2", { holdStart: v })} placeholder="1:00" />
            </label>
            <label className={labelCls}>hold end
              <TimeInput value={config.o2.holdEnd} onCommit={(v) => updateConfig("o2", { holdEnd: v })} placeholder="2:30" />
            </label>
          </div>
        </>
      )}

      {mode === "free" && (
        <>
          <p className="text-xs text-ink-dim">Single count-up hold. Skip/stop when you surface.</p>
          <label className={labelCls}>target (optional)
            <TimeInput value={config.free.target} onCommit={(v) => updateConfig("free", { target: v })} placeholder="e.g. 3:00 or blank" allowEmpty />
          </label>
        </>
      )}

      {mode === "custom" && (
        <>
          <p className="text-xs text-ink-dim">Define each round. Last round's rest is ignored.</p>
          <div className="flex flex-col gap-2">
            {config.custom.rounds.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-7 text-xs text-ink-dim">#{i + 1}</span>
                <TimeInput value={r.hold} onCommit={(v) => {
                  const rounds = config.custom.rounds.map((x, j) => (j === i ? { ...x, hold: v } : x));
                  updateConfig("custom", { rounds });
                }} placeholder="hold" />
                <TimeInput value={r.rest} onCommit={(v) => {
                  const rounds = config.custom.rounds.map((x, j) => (j === i ? { ...x, rest: v } : x));
                  updateConfig("custom", { rounds });
                }} placeholder="rest" />
                <button
                  className="rounded-lg px-2 py-2 text-ink-dim hover:text-phase-hold"
                  title="Remove"
                  aria-label={`Remove round ${i + 1}`}
                  onClick={() => updateConfig("custom", { rounds: config.custom.rounds.filter((_, j) => j !== i) })}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            className="self-start rounded-lg border border-glass-line px-3 py-2 text-sm text-ink-dim hover:text-bio"
            onClick={() => updateConfig("custom", { rounds: [...config.custom.rounds, { hold: 30, rest: 30 }] })}
          >
            + add round
          </button>
        </>
      )}
      </div>

      <div className="flex items-center gap-2">
        <select
          className={inputCls + " flex-1"}
          aria-label="Load preset"
          defaultValue=""
          onChange={(e) => e.target.value && applyPreset(e.target.value)}
        >
          <option value="" disabled>load preset…</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
