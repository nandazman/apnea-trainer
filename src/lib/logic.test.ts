import { test, expect } from "bun:test";
import { parseTime, fmt, maskTime } from "./format";
import { buildTable, nextPhase } from "./timer";
import { defaultSettings } from "./storage";
import type { Settings } from "./types";

const withMode = (mode: Settings["mode"]): Settings => ({ ...defaultSettings, mode });

test("parseTime handles mm:ss, h:mm:ss, plain and empty", () => {
  expect(parseTime("1:30")).toBe(90);
  expect(parseTime("90")).toBe(90);
  expect(parseTime("1:00:00")).toBe(3600);
  expect(parseTime("")).toBe(0);
  expect(parseTime(null)).toBe(0);
  expect(parseTime(45)).toBe(45);
});

test("fmt is the inverse for whole minutes/seconds", () => {
  expect(fmt(90)).toBe("01:30");
  expect(fmt(0)).toBe("00:00");
  expect(fmt(-5)).toBe("00:00");
});

test("maskTime right-aligns digits into mm:ss as you type", () => {
  expect(maskTime("")).toBe("");
  expect(maskTime("3")).toBe("00:03");
  expect(maskTime("30")).toBe("00:30");
  expect(maskTime("300")).toBe("03:00");
  expect(maskTime("3000")).toBe("30:00");
  expect(maskTime("1230")).toBe("12:30");
});

test("maskTime ignores non-digits and keeps the last 4 digits", () => {
  expect(maskTime("a3b0c0")).toBe("03:00"); // strips letters
  expect(maskTime("3:00")).toBe("03:00"); // re-masking its own output is stable
  expect(maskTime("123456")).toBe("34:56"); // most recent digits win (right-aligned)
});

test("maskTime output round-trips through parseTime to the typed seconds", () => {
  expect(parseTime(maskTime("300"))).toBe(180); // 3:00
  expect(parseTime(maskTime("30"))).toBe(30); // 0:30
  expect(parseTime(maskTime("130"))).toBe(90); // 1:30
});

test("co2 table: fixed hold, rest interpolates start→end, last rest 0", () => {
  const t = buildTable({ ...withMode("co2") });
  const c = defaultSettings.config.co2;
  expect(t.length).toBe(c.rounds);
  expect(t.every((r) => r.hold === c.hold)).toBe(true);
  expect(t[0].rest).toBe(c.restStart);
  expect(t[t.length - 1].rest).toBe(0);
});

test("o2 table: fixed rest, hold interpolates, last rest 0", () => {
  const t = buildTable({ ...withMode("o2") });
  const c = defaultSettings.config.o2;
  expect(t[0].hold).toBe(c.holdStart);
  expect(t[t.length - 1].hold).toBe(c.holdEnd);
  expect(t.slice(0, -1).every((r) => r.rest === c.rest)).toBe(true);
  expect(t[t.length - 1].rest).toBe(0);
});

test("free table is a single count-up hold", () => {
  const t = buildTable(withMode("free"));
  expect(t).toEqual([{ hold: 0, rest: 0, free: true }]);
});

test("custom table drops zero-hold rows and zeroes last rest", () => {
  const s = withMode("custom");
  s.config = { ...s.config, custom: { rounds: [{ hold: 30, rest: 30 }, { hold: 0, rest: 99 }, { hold: 45, rest: 30 }] } };
  const t = buildTable(s);
  expect(t.map((r) => r.hold)).toEqual([30, 45]);
  expect(t[t.length - 1].rest).toBe(0);
});

test("nextPhase advances prep→hold→rest→hold→…→done", () => {
  const t = [{ hold: 60, rest: 30 }, { hold: 60, rest: 0 }];
  expect(nextPhase("prep", 0, t, false)).toEqual({ phase: "hold", roundIdx: 0 });
  expect(nextPhase("hold", 0, t, false)).toEqual({ phase: "rest", roundIdx: 0 });
  expect(nextPhase("rest", 0, t, false)).toEqual({ phase: "hold", roundIdx: 1 });
  expect(nextPhase("hold", 1, t, false)).toEqual({ phase: "done", roundIdx: 1 }); // rest 0 → skip
});

test("nextPhase: free hold collapses straight to done", () => {
  expect(nextPhase("hold", 0, [{ hold: 0, rest: 0, free: true }], true)).toEqual({ phase: "done", roundIdx: 0 });
});
