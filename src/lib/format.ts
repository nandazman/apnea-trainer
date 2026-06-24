/** seconds -> "mm:ss" */
export function fmt(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** "mm:ss" | "h:mm:ss" | number-ish -> integer seconds */
export function parseTime(str: string | number | null | undefined): number {
  if (str == null) return 0;
  if (typeof str === "number") return Math.max(0, Math.round(str));
  const t = String(str).trim();
  if (!t) return 0;
  if (t.includes(":")) {
    const parts = t.split(":").map((s) => parseInt(s, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const n = parseFloat(t);
  return isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}
