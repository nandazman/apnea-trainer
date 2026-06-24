import type { Mode } from "./types";

export interface Preset {
  id: string;
  mode: Mode;
  name: string;
  cfg: Record<string, number>;
}

export const presets: Preset[] = [
  { id: "co2-beginner", mode: "co2", name: "CO₂ — beginner (8×, hold 1:00, rest 2:00→0:45)", cfg: { hold: 60, rounds: 8, restStart: 120, restEnd: 45 } },
  { id: "co2-classic", mode: "co2", name: "CO₂ — classic (8×, hold 1:00, rest 2:00→0:15)", cfg: { hold: 60, rounds: 8, restStart: 120, restEnd: 15 } },
  { id: "co2-advanced", mode: "co2", name: "CO₂ — advanced (8×, hold 1:30, rest 1:45→0:15)", cfg: { hold: 90, rounds: 8, restStart: 105, restEnd: 15 } },
  { id: "o2-beginner", mode: "o2", name: "O₂ — beginner (8×, rest 2:00, hold 1:00→2:00)", cfg: { rest: 120, rounds: 8, holdStart: 60, holdEnd: 120 } },
  { id: "o2-classic", mode: "o2", name: "O₂ — classic (8×, rest 2:00, hold 1:00→2:30)", cfg: { rest: 120, rounds: 8, holdStart: 60, holdEnd: 150 } },
  { id: "o2-advanced", mode: "o2", name: "O₂ — advanced (8×, rest 2:00, hold 1:30→3:00)", cfg: { rest: 120, rounds: 8, holdStart: 90, holdEnd: 180 } },
];
