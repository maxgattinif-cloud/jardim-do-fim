// Regras globais de equilíbrio. Tudo que mexe em dificuldade fica aqui.
export const GAME_NAME = "Jardim do Fim";
export const GAME_VERSION = "3.0.0";
export const PROTOCOL_VERSION = 2;

export const MAX_PLAYERS = 6;
/** A escolha livre de defensores só abre quando a sala tem 2+ lugares ocupados. */
export const CHOICE_MIN_PLAYERS = 2;
export const FINAL_LEVEL = 50;
export const WORLD_COUNT = 5;
export const LEVELS_PER_WORLD = 10;
/** Curva suave: 50 fases não podem usar +20% lineares por fase (viraria ×10,8). */
export const LEVEL_STEP = 0.04;
export const PLAYER_STEP = 0.35; // +35% de ameaça por participante extra

export const levelMult = (level: number) => 1 + LEVEL_STEP * (Math.max(1, level) - 1);
export const playerMult = (n: number) => 1 + PLAYER_STEP * (Math.max(1, n) - 1);
export const playerHpMult = (n: number) => 1 + 0.1 * (Math.max(1, n) - 1);
export const slotsFor = (n: number) => Math.max(3, 7 - n);
export const startSeiva = (n: number) => 175 + 60 * (Math.max(1, n) - 1);
export const threatBudget = (level: number, n: number) => Math.round(8 * levelMult(level) * playerMult(n));
export const worldOf = (level: number) => Math.min(WORLD_COUNT - 1, Math.max(0, Math.floor((Math.max(1, level) - 1) / LEVELS_PER_WORLD)));

export const SEAT_COLORS = ["#2ee6c5", "#ff8fb1", "#ffd45a", "#a98bff", "#ff9a52", "#7bdc6b"];
export const AI_NAMES = ["Nina", "Kaique", "Duda", "Theo", "Bia"];
export const MAX_NAME = 16;

export const sanitizeName = (s: string, fallback = "Guardião") =>
  s.replace(/[^\p{L}\p{N} _.\\-]/gu, "").trim().slice(0, MAX_NAME) || fallback;
