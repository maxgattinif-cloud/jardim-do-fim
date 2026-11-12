import type { DefId } from "./defenders";
import { ENEMIES, type EnemyId } from "./enemies";
import { MOD_INFO, type Mod } from "./levels";
import { WORLD_AURAS } from "./cosmetics";
import type { MatchResult } from "../game/types";
import type { Save } from "../game/save";
import { availableDefs } from "../game/decks";

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const pickFrom = <T,>(arr: T[], seed: number, n: number): T[] => {
  const pool = [...arr];
  const out: T[] = [];
  let h = seed;
  while (out.length < n && pool.length) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
};

/* ----------------------------- Desafio diário ----------------------------- */
export interface DailyCfg {
  key: string;
  level: number;
  mods: Mod[];
  emphasis: EnemyId[];
  seed: number;
  title: string;
}
export function dailyConfig(key = todayKey()): DailyCfg {
  const seed = hashStr("jdf" + key);
  const level = 7 + (seed % 44);
  const mods = pickFrom(Object.keys(MOD_INFO) as Mod[], seed, 2);
  const emphasis = pickFrom(ENEMIES.filter((e) => e.kind !== "chefe" && e.intro <= level).map((e) => e.id), seed >>> 3, 1);
  return { key, level, mods, emphasis, seed, title: `${MOD_INFO[mods[0]].label} + ${MOD_INFO[mods[1]].label}` };
}

/* ----------------------------- Eventos especiais ----------------------------- */
export interface GameEvent {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rewardMul: number;
  emphasis: EnemyId[];
}
const EVENTS: GameEvent[] = [
  { id: "colheita", name: "Colheita Dourada", desc: "Todas as recompensas em sementes valem 50% a mais.", icon: "🌾", rewardMul: 1.5, emphasis: [] },
  { id: "asas", name: "Semana das Asas", desc: "Mariposas em maior número. Recompensa +25%.", icon: "❋", rewardMul: 1.25, emphasis: ["mariposa"] },
  { id: "ferro", name: "Maré de Ferrugem", desc: "Escudeiros e Colossos aparecem mais. Recompensa +25%.", icon: "🛡", rewardMul: 1.25, emphasis: ["escudeiro", "colosso"] },
];
export function currentEvent(d = new Date()): GameEvent {
  const week = Math.floor(d.getTime() / (7 * 86400000));
  return EVENTS[week % EVENTS.length];
}

/* ----------------------------- Missões diárias ----------------------------- */
export interface QuestDef {
  id: string;
  text: string;
  kind: "kills" | "seiva" | "wins" | "plants" | "air" | "classes" | "stars3";
  target: number;
  reward: number;
}
export const QUEST_POOL: QuestDef[] = [
  { id: "q_kills", text: "Derrote 60 inimigos", kind: "kills", target: 60, reward: 60 },
  { id: "q_seiva", text: "Colete 600 de seiva", kind: "seiva", target: 600, reward: 50 },
  { id: "q_wins", text: "Vença 2 fases", kind: "wins", target: 2, reward: 80 },
  { id: "q_plants", text: "Plante 30 defensores", kind: "plants", target: 30, reward: 50 },
  { id: "q_air", text: "Derrote 10 voadores", kind: "air", target: 10, reward: 70 },
  { id: "q_classes", text: "Vença usando 3+ classes", kind: "classes", target: 1, reward: 70 },
  { id: "q_stars3", text: "Consiga 3 estrelas numa fase", kind: "stars3", target: 1, reward: 90 },
];
export const QUEST_BY_ID = Object.fromEntries(QUEST_POOL.map((q) => [q.id, q])) as Record<string, QuestDef>;
export const pickQuests = (key: string) => pickFrom(QUEST_POOL, hashStr("q" + key), 3);

/* ----------------------------- Conquistas ----------------------------- */
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  reward: number;
  unlocks?: DefId;
  check: (s: Save) => boolean;
}
export const ACHIEVEMENTS: Achievement[] = [
  { id: "primeira", name: "Primeiro Orvalho", desc: "Vença sua primeira fase.", icon: "✿", reward: 30, check: (s) => s.stats.wins >= 1 },
  { id: "treino", name: "Aprendiz", desc: "Conclua o treino.", icon: "▤", reward: 30, check: (s) => s.tutorialDone },
  { id: "dez_vitorias", name: "Jardineiro", desc: "Vença 10 partidas.", icon: "🌿", reward: 80, check: (s) => s.stats.wins >= 10 },
  { id: "chefe1", name: "Guardião do Vale", desc: "Conclua o Vale das Sementes (fase 10).", icon: "✿", reward: 150, check: (s) => s.completed >= 10 },
  { id: "chefe2", name: "Rei Afundado", desc: "Conclua o Pântano das Sombras (fase 20).", icon: "❋", reward: 200, check: (s) => s.completed >= 20 },
  { id: "chefe3", name: "Raízes Cortadas", desc: "Conclua a Floresta Mutante (fase 30).", icon: "▲", reward: 300, check: (s) => s.completed >= 30 },
  { id: "chefe4", name: "Cinzas Vencidas", desc: "Conclua o Deserto das Cinzas (fase 40).", icon: "▲", reward: 400, check: (s) => s.completed >= 40 },
  { id: "rei", name: "Fim do Devorador", desc: "Conclua a fase 50 e assista ao encerramento.", icon: "★", reward: 1000, check: (s) => s.completed >= 50 },
  { id: "caca_asas", name: "Caçador de Asas", desc: "Derrote 30 voadores no total.", icon: "➶", reward: 120, unlocks: "orquidea", check: (s) => s.stats.airKills >= 30 },
  { id: "matador", name: "Colheita Sombria", desc: "Derrote 500 inimigos no total.", icon: "✕", reward: 150, check: (s) => s.stats.kills >= 500 },
  { id: "tres_estrelas", name: "Perfeccionista", desc: "Consiga 3 estrelas em uma fase.", icon: "★", reward: 100, check: (s) => Object.values(s.stars).some((v) => v >= 3) },
  { id: "coop", name: "Jardim em Equipe", desc: "Vença uma partida com 2+ participantes.", icon: "◇", reward: 100, check: (s) => s.stats.coopWins >= 1 },
  { id: "evolucao", name: "Raízes Fortes", desc: "Evolua um defensor ao nível 3.", icon: "↑", reward: 120, check: (s) => Object.values(s.defLevels).some((v) => (v ?? 1) >= 3) },
  { id: "diario", name: "Hábito Diário", desc: "Conclua um desafio diário.", icon: "▣", reward: 100, check: (s) => s.stats.dailies >= 1 },
  { id: "plantador", name: "Mão Verde", desc: "Plante 300 defensores no total.", icon: "♣", reward: 100, check: (s) => s.stats.planted >= 300 },
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>;

/* ----------------------------- Resultado de partida ----------------------------- */
export interface ResultSummary {
  coins: number;
  parts: { label: string; value: number }[];
  firstClear: boolean;
  newBest: boolean;
  newAch: string[];
  unlockedDefs: DefId[];
  questsDone: string[];
  stars: number;
  score: number;
}

export function applyResult(prev: Save, r: MatchResult): { save: Save; summary: ResultSummary } {
  const s: Save = JSON.parse(JSON.stringify(prev));
  const L = r.level;
  const worldIdx = L > 0 ? Math.min(4, Math.floor((L - 1) / 10)) : -1;
  const before = availableDefs(prev.completed, Object.keys(prev.achievements));
  const parts: { label: string; value: number }[] = [];
  const mul = r.rewardMul || 1;
  let firstClear = false;
  let newBest = false;
  const questsDone: string[] = [];

  s.stats.plays++;
  s.stats.kills += r.stats.kills;
  s.stats.airKills += r.stats.airKills;
  s.stats.seiva += r.stats.seivaCollected;
  s.stats.planted += r.stats.planted;

  if (r.win) {
    s.stats.wins++;
    if (r.seats >= 2) s.stats.coopWins++;
    if (r.stats.bossKilled) s.stats.bosses++;
    const base = L === 0 ? 50 : 20 + L * 10;
    parts.push({ label: "Fase concluída", value: Math.round(base * mul) });
    if (r.humans > 1) parts.push({ label: "Bônus de equipe", value: Math.round((r.humans - 1) * 15 * mul) });
    if (r.stars > 1) parts.push({ label: `Objetivos (${r.stars - 1})`, value: Math.round((r.stars - 1) * 15 * mul) });
    if (r.stats.bossKilled) parts.push({ label: "Chefe derrotado", value: Math.round(100 * mul) });
    if (r.mode === "campaign" && L > 0) {
      if (L > s.completed) {
        firstClear = true;
        s.completed = Math.min(50, L);
        parts.push({ label: "Primeira vez", value: 40 });
        if (L % 10 === 0 && worldIdx >= 0) {
          const aura = WORLD_AURAS[worldIdx];
          const bonus = 150 + worldIdx * 100 + (L === 50 ? 800 : 0);
          parts.push({ label: `Mundo ${worldIdx + 1} completo`, value: bonus });
          if (!s.cosmetics.owned.includes(aura)) {
            s.cosmetics.owned.push(aura);
            s.cosmetics.aura = aura;
          }
          s.stats.dailies += 0;
        }
      }
      s.stars[L] = Math.max(s.stars[L] ?? 0, r.stars);
      if (r.score > (s.best[L] ?? 0)) {
        s.best[L] = r.score;
        newBest = true;
      }
    }
    if (L === 0) s.tutorialDone = true;
    if (r.mode === "daily") {
      const first = !s.daily.done;
      s.daily.done = true;
      s.daily.best = Math.max(s.daily.best, r.score);
      if (first) {
        s.stats.dailies++;
        const yesterday = todayKey(new Date(Date.now() - 86400000));
        s.daily.streak = s.daily.lastDone === yesterday ? s.daily.streak + 1 : 1;
        s.daily.lastDone = todayKey();
        parts.push({ label: `Desafio diário (sequência ${s.daily.streak})`, value: 80 + Math.min(5, s.daily.streak) * 10 });
      }
    }
  } else {
    s.stats.losses++;
    if (L > 0) parts.push({ label: "Consolo", value: Math.max(5, Math.round((20 + L * 10) * 0.2 * mul)) });
  }

  // missões diárias
  for (const q of s.quests.list) {
    const def = QUEST_BY_ID[q.id];
    if (!def || q.claimed) continue;
    const before = q.progress;
    if (def.kind === "kills") q.progress += r.stats.kills;
    if (def.kind === "seiva") q.progress += r.stats.seivaCollected;
    if (def.kind === "plants") q.progress += r.stats.planted;
    if (def.kind === "air") q.progress += r.stats.airKills;
    if (def.kind === "wins" && r.win) q.progress += 1;
    if (def.kind === "classes" && r.win && r.stats.classesUsed >= 3) q.progress += 1;
    if (def.kind === "stars3" && r.stars >= 3) q.progress += 1;
    if (before < def.target && q.progress >= def.target) questsDone.push(def.text);
  }

  if (r.mode !== "tutorial" || r.win) {
    const total = parts.reduce((a, p) => a + p.value, 0);
    s.coins += total;
  }

  // ranking local
  if (r.win && L > 0) {
    s.ranking.push({ name: s.name, level: L, score: r.score, stars: r.stars, date: todayKey(), mode: r.mode, players: r.seats });
    s.ranking.sort((a, b) => b.score - a.score);
    s.ranking = s.ranking.slice(0, 30);
  }

  // conquistas
  const newAch: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.check(s)) {
      s.achievements[a.id] = Date.now();
      s.coins += a.reward;
      newAch.push(a.id);
    }
  }
  const after = availableDefs(s.completed, Object.keys(s.achievements));
  const unlockedDefs = after.filter((id) => !before.includes(id));
  return { save: s, summary: { coins: parts.reduce((a, p) => a + p.value, 0) + newAch.reduce((a, id) => a + ACH_BY_ID[id].reward, 0), parts, firstClear, newBest, newAch, unlockedDefs, questsDone, stars: r.stars, score: r.score } };
}
