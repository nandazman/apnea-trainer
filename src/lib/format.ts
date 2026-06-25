/** seconds -> "mm:ss" */
export function fmt(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Live input mask for an mm:ss field. Keeps the last 4 typed digits, right-aligned,
 * and always renders zero-padded mm:ss so the field reads the same shape while typing.
 *   "3" -> "00:03" · "30" -> "00:30" · "300" -> "03:00" · "1230" -> "12:30"
 * Returns "" for no digits so an optional field can stay blank.
 */
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(-4);
  if (!digits) return "";
  const padded = digits.padStart(4, "0");
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
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
