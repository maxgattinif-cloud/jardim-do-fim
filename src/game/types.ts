import type { DefId } from "../data/defenders";
import type { Mod } from "../data/levels";

export type Mode = "campaign" | "daily" | "tutorial";

export type Cmd =
  | { k: "plant"; d: DefId; col: number; row: number }
  | { k: "dig"; col: number; row: number }
  | { k: "sun"; id: number }
  | { k: "all" }
  | { k: "chat"; text: string }
  | { k: "ping"; row: number }
  | { k: "pause"; on: boolean }
  | { k: "speed"; v: number };

export interface SeatCfg {
  name: string;
  role?: RoleId;
  kind: "human" | "ai";
  color: string;
  loadout: DefId[];
  levels: Partial<Record<DefId, number>>;
  aura: string;
  shot: string;
}

export interface MatchCfg {
  mid: number; // identifica a partida (muda a cada início)
  level: number; // 0 = tutorial
  mode: Mode;
  seats: SeatCfg[];
  seed: number;
  mods: Mod[];
  emphasis: string[];
  rewardMul: number;
}

export interface MatchStats {
  kills: number;
  airKills: number;
  seivaCollected: number;
  sunClicks: number;
  planted: number;
  plantedBy: Partial<Record<DefId, number>>;
  classesUsed: number;
  plantsLost: number;
  guardsUsed: number;
  bossKilled: boolean;
  combos: number;
  events: number;
  bySeat: number[];
}

export interface MatchResult {
  win: boolean;
  level: number;
  mode: Mode;
  time: number;
  stats: MatchStats;
  objectives: boolean[];
  stars: number;
  score: number;
  seats: number;
  humans: number;
  rewardMul: number;
}

export interface SeedHud {
  id: DefId;
  ready: number;
  afford: boolean;
  cost: number;
}

export interface SeatHud {
  name: string;
  color: string;
  kind: "human" | "ai";
  connected: boolean;
  autopilot: boolean;
  speaking: boolean;
}

export type RoleId = "comandante" | "agricultor" | "atirador" | "curandeiro" | "guarda" | "tatico";

export interface Hud {
  sun: number;
  wave: number;
  waves: number;
  progress: number;
  alive: number;
  banner: string;
  seeds: SeedHud[];
  sel: DefId | null;
  shovel: boolean;
  paused: boolean;
  speed: number;
  bossHp: number | null;
  bossName: string;
  guards: number;
  time: number;
  stats: MatchStats;
  objectives: { text: string; met: boolean; label: string }[];
  seats: SeatHud[];
  status: 0 | 1 | 2;
  canPause: boolean;
  world: number;
  worldName: string;
  event: { label: string; color: string; icon: string; warn: boolean } | null;
  combos: string[];
  bossPhase: number;
  role: RoleId;
}

export interface ChatLine {
  who: number;
  text: string;
}
