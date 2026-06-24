export type Mode = "co2" | "o2" | "free" | "custom";

export interface Settings {
  mode: Mode;
  config: {
    co2: { hold: number; rounds: number; restStart: number; restEnd: number };
    o2: { rest: number; rounds: number; holdStart: number; holdEnd: number };
    free: { target: number };
    custom: { rounds: { hold: number; rest: number }[] };
  };
  prep: number;
  soundOn: boolean;
  voiceOn: boolean;
  wakeOn: boolean;
  motion: "full" | "reduced";
}

export interface SessionLog {
  id: string;
  date: string; // ISO 8601
  mode: Mode;
  rounds: number;
  totalSec: number;
  maxHoldSec: number;
  note: string;
  rpe: number | null; // 1–10
}

/** One round of a generated table. `free` marks the single count-up hold. */
export interface Round {
  hold: number;
  rest: number;
  free?: boolean;
}
