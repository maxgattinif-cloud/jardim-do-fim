import { DEF_BY_ID, type DefId } from "../data/defenders";
import { DEFAULT_AURA, DEFAULT_SHOT } from "../data/cosmetics";
import { sanitizeName } from "../data/rules";
import { pickQuests, todayKey } from "../data/progression";
import type { Mode } from "./types";
import type { Quality } from "./engine";

export interface Settings {
  master: number;
  music: number;
  sfx: number;
  quality: Quality;
  fps: 30 | 60;
  shake: boolean;
  hints: boolean;
  relayUrl: string;
}
export interface QuestProg {
  id: string;
  progress: number;
  claimed: boolean;
}
export interface RankEntry {
  name: string;
  level: number;
  score: number;
  stars: number;
  date: string;
  mode: Mode;
  players: number;
}
export interface Save {
  v: 2;
  name: string;
  profileReady: boolean;
  loadout: DefId[];
  coins: number;
  completed: number; // maior fase concluída (0..20)
  stars: Record<number, number>;
  best: Record<number, number>;
  defLevels: Partial<Record<DefId, number>>;
  achievements: Record<string, number>;
  stats: { kills: number; airKills: number; wins: number; losses: number; seiva: number; plays: number; planted: number; coopWins: number; bosses: number; dailies: number };
  quests: { date: string; list: QuestProg[] };
  daily: { date: string; done: boolean; best: number; streak: number; lastDone: string };
  cosmetics: { owned: string[]; aura: string; shot: string };
  settings: Settings;
  ranking: RankEntry[];
  tutorialDone: boolean;
  adsConsent: boolean | null;
}

export const SAVE_KEY = "jardim-do-fim-save-v2";
const OLD_PROGRESS = "jardim-maldito-progress-v1";
const OLD_SAVE = "nao-olhe-save-v1";

export const defaultSettings = (): Settings => ({ master: 0.8, music: 0.5, sfx: 0.8, quality: "high", fps: 60, shake: true, hints: true, relayUrl: "" });

export function defaultSave(): Save {
  const today = todayKey();
  return {
    v: 2,
    name: "Guardião",
    profileReady: false,
    loadout: ["luminia", "espinheiro", "tronco", "magma", "gelidea", "musgo"],
    coins: 120,
    completed: 0,
    stars: {},
    best: {},
    defLevels: {},
    achievements: {},
    stats: { kills: 0, airKills: 0, wins: 0, losses: 0, seiva: 0, plays: 0, planted: 0, coopWins: 0, bosses: 0, dailies: 0 },
    quests: { date: today, list: pickQuests(today).map((q) => ({ id: q.id, progress: 0, claimed: false })) },
    daily: { date: today, done: false, best: 0, streak: 0, lastDone: "" },
    cosmetics: { owned: [DEFAULT_AURA, DEFAULT_SHOT], aura: DEFAULT_AURA, shot: DEFAULT_SHOT },
    settings: defaultSettings(),
    ranking: [],
    tutorialDone: false,
    adsConsent: null,
  };
}

/** Garante que dados antigos/corrompidos não quebrem o jogo. */
export function normalize(raw: unknown): Save {
  const d = defaultSave();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<Save>;
  const num = (v: unknown, def: number, lo = 0, hi = 1e9) => (typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def);
  const s: Save = {
    ...d,
    ...r,
    v: 2,
    name: sanitizeName(typeof r.name === "string" ? r.name : d.name),
    profileReady: typeof r.profileReady === "boolean" ? r.profileReady : (typeof r.name === "string" && r.name !== "Guardião"),
    loadout: Array.isArray(r.loadout) ? r.loadout.filter((id): id is DefId => typeof id === "string" && !!DEF_BY_ID[id as DefId]).slice(0, 6) : d.loadout,
    coins: Math.floor(num(r.coins, d.coins)),
    completed: Math.floor(num(r.completed, 0, 0, 50)),
    stars: r.stars && typeof r.stars === "object" ? r.stars : {},
    best: r.best && typeof r.best === "object" ? r.best : {},
    defLevels: r.defLevels && typeof r.defLevels === "object" ? r.defLevels : {},
    achievements: r.achievements && typeof r.achievements === "object" ? r.achievements : {},
    stats: { ...d.stats, ...(r.stats ?? {}) },
    daily: { ...d.daily, ...(r.daily ?? {}) },
    cosmetics: { ...d.cosmetics, ...(r.cosmetics ?? {}) },
    settings: { ...d.settings, ...(r.settings ?? {}) },
    ranking: Array.isArray(r.ranking) ? r.ranking.slice(0, 30) : [],
    quests: r.quests && Array.isArray(r.quests.list) ? { date: String(r.quests.date), list: r.quests.list } : d.quests,
  };
  if (!s.cosmetics.owned.includes(DEFAULT_AURA)) s.cosmetics.owned.push(DEFAULT_AURA);
  if (!s.cosmetics.owned.includes(DEFAULT_SHOT)) s.cosmetics.owned.push(DEFAULT_SHOT);
  return s;
}

export function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    // migração dos dados salvos pelas versões anteriores
    const d = defaultSave();
    const oldLevel = Number(localStorage.getItem(OLD_PROGRESS));
    if (oldLevel >= 2) d.completed = Math.min(50, oldLevel - 1);
    const oldSave = localStorage.getItem(OLD_SAVE);
    if (oldSave) {
      const o = JSON.parse(oldSave) as { coins?: number; name?: string };
      if (typeof o.coins === "number") d.coins = Math.max(d.coins, Math.floor(o.coins));
      if (o.name && o.name !== "Jogador") d.name = sanitizeName(o.name);
    }
    return d;
  } catch {
    return defaultSave();
  }
}

export function persist(s: Save): boolean {
  try {
    const value = JSON.stringify(s);
    localStorage.setItem(SAVE_KEY, value);
    return localStorage.getItem(SAVE_KEY) === value;
  } catch {
    return false;
  }
}

/** Renova as missões diárias quando o dia muda. */
export function rollDaily(s: Save): Save {
  const today = todayKey();
  let out = s;
  if (s.quests.date !== today) out = { ...out, quests: { date: today, list: pickQuests(today).map((q) => ({ id: q.id, progress: 0, claimed: false })) } };
  if (s.daily.date !== today) out = { ...out, daily: { ...s.daily, date: today, done: false, best: 0 } };
  return out;
}
