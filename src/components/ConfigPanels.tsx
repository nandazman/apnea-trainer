import { useEffect, useRef, useState } from "react";
import { fmt, maskTime, parseTime } from "../lib/format";
import { presets, type Preset } from "../lib/presets";
import type { SettingsApi } from "../state/useSettings";

const inputCls =
  "w-full rounded-lg bg-black/30 border border-glass-line px-3 py-2 text-ink outline-none focus:border-bio/50";
const labelCls = "flex flex-col gap-1 text-xs text-ink-dim lowercase tracking-wide";

/**
 * mm:ss field. Commits parsed seconds live, reformats on blur. Always supports:
 *   · select-all on focus  — the digit-mask is always typed fresh, no caret fights
 *   · Enter                — commit/blur
 *   · ↑/↓ (Shift = ×6)     — nudge by `step` seconds
 * With `withSteppers`, also renders −/+ buttons for pointer/touch users.
 */
function TimeInput({
  value,
  onCommit,
  placeholder,
  allowEmpty,
  step = 5,
  withSteppers = false,
}: {
  value: number;
  onCommit: (sec: number) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  step?: number;
  withSteppers?: boolean;
}) {
  const [text, setText] = useState(() => (allowEmpty && !value ? "" : fmt(value)));
  const focused = useRef(false);
  // Resync from external value changes (e.g. presets, steppers) only when not editing,
  // so live onCommit re-renders don't reformat the text mid-keystroke.
  useEffect(() => {
    if (focused.current) return;
    setText(allowEmpty && !value ? "" : fmt(value));
  }, [value, allowEmpty]);

  // Exact per-second values are preserved — a nudge just adds/subtracts `step`.
  const nudge = (delta: number) => onCommit(Math.max(0, parseTime(text || "0") + delta));

  // Press-and-hold the −/+ buttons to repeat (after a short delay). A local
  // accumulator drives the ticks so rapid repeats don't depend on the prop round-trip.
  const live = useRef(0);
  const delayId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatId = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopHold = () => {
    if (delayId.current != null) clearTimeout(delayId.current);
    if (repeatId.current != null) clearInterval(repeatId.current);
    delayId.current = repeatId.current = null;
  };
  const startHold = (delta: number) => {
    live.current = Math.max(0, parseTime(text || "0"));
    const tick = () => {
      live.current = Math.max(0, live.current + delta);
      onCommit(live.current);
    };
    tick(); // immediate first step
    delayId.current = setTimeout(() => {
      repeatId.current = setInterval(tick, 90);
    }, 400);
  };
  useEffect(() => stopHold, []); // clear timers if unmounted mid-press

  const input = (
    <input
      className={withSteppers ? "min-w-0 flex-1 bg-transparent px-2 py-2 text-center text-ink outline-none tabular-nums" : inputCls}
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const masked = maskTime(e.target.value);
        setText(masked);
        onCommit(parseTime(masked));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          nudge(e.shiftKey ? step * 6 : step);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          nudge(e.shiftKey ? -step * 6 : -step);
        }
      }}
      onBlur={() => {
        focused.current = false;
        setText(allowEmpty && !value ? "" : fmt(parseTime(text)));
      }}
    />
  );

  if (!withSteppers) return input;

  const stepBtn =
    "select-none px-3 text-lg leading-none text-ink-dim transition-colors hover:text-bio active:text-bio";
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-glass-line bg-black/30 focus-within:border-bio/50">
      <button
        type="button"
        tabIndex={-1}
        aria-label="decrease"
        className={stepBtn}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(-step);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        −
      </button>
      {input}
      <button
        type="button"
        tabIndex={-1}
        aria-label="increase"
        className={stepBtn}
        onPointerDown={(e) => {
          e.preventDefault();
          startHold(step);
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
      >
        +
      </button>
    </div>
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
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onChange={(e) => onCommit(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0)))}
    />
  );
}

/** Custom dropdown for mode-specific presets — styled to match the glass UI. */
function PresetSelect({ presets, onPick }: { presets: Preset[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-glass-line bg-black/30 px-3 py-2 text-sm text-ink-dim transition-colors hover:border-bio/40 hover:text-ink"
      >
        <span>load preset…</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="glass animate-surface absolute z-10 mt-1 w-full overflow-hidden p-1"
        >
          {presets.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onPick(p.id);
                  setOpen(false);
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-dim transition-colors hover:bg-bio/10 hover:text-bio"
              >
                {p.name.replace(/^(CO₂|O₂)\s—\s/, "")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ConfigPanels({ api }: { api: SettingsApi }) {
  const { settings, updateConfig, setSettings } = api;
  const { mode, config } = settings;
  const modePresets = presets.filter((p) => p.mode === mode);

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
    <div className="glass relative z-20 flex flex-col gap-4 p-4">
      <div key={mode} className="animate-surface flex flex-col gap-4">
      {mode === "co2" && (
        <>
          <p className="text-xs text-ink-dim">Fixed hold, rest shrinks each round — CO₂ tolerance.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>hold
              <TimeInput value={config.co2.hold} onCommit={(v) => updateConfig("co2", { hold: v })} placeholder="1:00" withSteppers />
            </label>
            <label className={labelCls}>rounds
              <NumberInput value={config.co2.rounds} onCommit={(v) => updateConfig("co2", { rounds: v })} />
            </label>
            <label className={labelCls}>rest start
              <TimeInput value={config.co2.restStart} onCommit={(v) => updateConfig("co2", { restStart: v })} placeholder="2:00" withSteppers />
            </label>
            <label className={labelCls}>rest end
              <TimeInput value={config.co2.restEnd} onCommit={(v) => updateConfig("co2", { restEnd: v })} placeholder="0:15" withSteppers />
            </label>
          </div>
        </>
      )}

      {mode === "o2" && (
        <>
          <p className="text-xs text-ink-dim">Fixed rest, hold grows each round — hypoxia tolerance.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>rest
              <TimeInput value={config.o2.rest} onCommit={(v) => updateConfig("o2", { rest: v })} placeholder="2:00" withSteppers />
            </label>
            <label className={labelCls}>rounds
              <NumberInput value={config.o2.rounds} onCommit={(v) => updateConfig("o2", { rounds: v })} />
            </label>
            <label className={labelCls}>hold start
              <TimeInput value={config.o2.holdStart} onCommit={(v) => updateConfig("o2", { holdStart: v })} placeholder="1:00" withSteppers />
            </label>
            <label className={labelCls}>hold end
              <TimeInput value={config.o2.holdEnd} onCommit={(v) => updateConfig("o2", { holdEnd: v })} placeholder="2:30" withSteppers />
            </label>
          </div>
        </>
      )}

      {mode === "free" && (
        <>
          <p className="text-xs text-ink-dim">Single count-up hold. Skip/stop when you surface.</p>
          <label className={labelCls}>target (optional)
            <TimeInput value={config.free.target} onCommit={(v) => updateConfig("free", { target: v })} placeholder="e.g. 3:00 or blank" allowEmpty withSteppers />
          </label>
        </>
      )}

      {mode === "custom" && (
        <>
          <p className="text-xs text-ink-dim">Define each round. Last round's rest is ignored.</p>
          <div className="flex flex-col gap-2">
            {config.custom.rounds.map((r, i) => (
              <div key={i} className="rounded-lg border border-glass-line bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-ink-dim lowercase">round #{i + 1}</span>
                  <button
                    className="rounded px-1 text-ink-dim hover:text-phase-hold"
                    title="Remove"
                    aria-label={`Remove round ${i + 1}`}
                    onClick={() => updateConfig("custom", { rounds: config.custom.rounds.filter((_, j) => j !== i) })}
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className={labelCls}>hold
                    <TimeInput value={r.hold} placeholder="1:00" withSteppers onCommit={(v) => {
                      const rounds = config.custom.rounds.map((x, j) => (j === i ? { ...x, hold: v } : x));
                      updateConfig("custom", { rounds });
                    }} />
                  </label>
                  <label className={labelCls}>rest
                    <TimeInput value={r.rest} placeholder="0:30" withSteppers onCommit={(v) => {
                      const rounds = config.custom.rounds.map((x, j) => (j === i ? { ...x, rest: v } : x));
                      updateConfig("custom", { rounds });
                    }} />
                  </label>
                </div>
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

      {modePresets.length > 0 && <PresetSelect presets={modePresets} onPick={applyPreset} />}
    </div>
  );
}
