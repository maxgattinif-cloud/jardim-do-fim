// Utilidades de teste: canvas falso (sem navegador) e montagem de partidas.
import { GardenEngine, type EngineHooks, type EngineOpts } from "../src/game/engine";
import { aiLoadouts, availableDefs, soloDeck } from "../src/game/decks";
import { AI_NAMES, SEAT_COLORS, slotsFor } from "../src/data/rules";
import type { DefId } from "../src/data/defenders";
import type { MatchCfg, MatchResult, SeatCfg } from "../src/game/types";

const noop: any = new Proxy(function () {}, { get: (_t, k) => (k === "createRadialGradient" || k === "createLinearGradient" ? () => ({ addColorStop() {} }) : noop), apply: () => noop, set: () => true });
export function fakeCanvas(): any {
  return { width: 0, height: 0, style: {}, getContext: () => noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 600 }) };
}

export function makeCfg(level: number, seats: number, opts: { humans?: number; seed?: number; mods?: any[]; mid?: number } = {}): MatchCfg {
  const avail = availableDefs(Math.max(0, level - 1), ["caca_asas"]);
  const humans = opts.humans ?? 1;
  const humanPicks: DefId[][] = [];
  for (let i = 0; i < humans; i++) humanPicks.push(seats === 1 ? soloDeck(avail, level) : aiLoadouts([], 1, seats, avail)[0]);
  const ai = aiLoadouts(humanPicks, seats - humans, seats, avail);
  const list: SeatCfg[] = [];
  for (let i = 0; i < seats; i++) {
    const human = i < humans;
    list.push({ name: human ? `Humano${i}` : AI_NAMES[i % 5], kind: human ? "human" : "ai", color: SEAT_COLORS[i], loadout: (human ? humanPicks[i] : ai[i - humans]).slice(0, slotsFor(seats)), levels: {}, aura: "aura_esmeralda", shot: "shot_padrao" });
  }
  return { mid: opts.mid ?? 1, level, mode: level === 0 ? "tutorial" : "campaign", seats: list, seed: opts.seed ?? 12345 + level, mods: (opts.mods as any) ?? [], emphasis: [], rewardMul: 1 };
}

/** Roda uma partida inteira só com IA (todos os assentos em piloto automático). */
export function simulate(cfg: MatchCfg, maxSeconds = 700, hooks: EngineHooks = {}, opts: EngineOpts = {}) {
  const allAi: MatchCfg = { ...cfg, seats: cfg.seats.map((s) => ({ ...s, kind: "ai" as const })) };
  const e = new GardenEngine(fakeCanvas(), allAi, hooks, opts);
  let t = 0;
  while (e.status === 0 && t < maxSeconds) {
    e.update(0.05);
    t += 0.05;
  }
  return { e, t, result: e.result as MatchResult | null };
}
