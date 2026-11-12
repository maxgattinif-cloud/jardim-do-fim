// Tabuleiros e eventos dinâmicos. Tudo determinístico a partir da semente da fase,
// para que anfitrião e convidados (e os testes) reproduzam exatamente o mesmo cenário.
import { mulberry32 } from "../game/geometry";
import { worldOf } from "./rules";

export type TerrainKind = "water" | "lava" | "ice" | "shadow" | "growth" | "bridge" | "rock" | "portal" | "trail" | "crystal";

export interface CellSpec {
  col: number;
  row: number;
  kind: TerrainKind;
}
export interface BoardSpec {
  id: string;
  world: number;
  level: number;
  name: string;
  cells: CellSpec[];
  portals: { col: number; row: number }[];
  activeRows: boolean[];
  growAt: number; // instante em que raízes/brotos crescem e bloqueiam casas
  bridgePeriod: number; // 0 = sem ponte móvel
  pathVariant: number;
}

export const TERRAIN_INFO: Record<TerrainKind, { label: string; color: string; desc: string }> = {
  water: { label: "Água", color: "#3fa9d8", desc: "Só defensores aquáticos podem ser plantados aqui." },
  lava: { label: "Lava", color: "#ff6a2a", desc: "Casa quente: só defensores resistentes ao calor sobrevivem." },
  ice: { label: "Gelo", color: "#9fe6ff", desc: "Inimigos terrestres deslizam mais devagar." },
  shadow: { label: "Sombra", color: "#8a6ab0", desc: "Inimigos camuflados ficam quase invisíveis." },
  growth: { label: "Raiz viva", color: "#6bdc6b", desc: "Brotos crescem no meio da partida e bloqueiam a casa." },
  bridge: { label: "Ponte móvel", color: "#c9a26a", desc: "A passagem abre e fecha em ciclos." },
  rock: { label: "Pedra", color: "#9a9aa2", desc: "Bloqueia o plantio e intercepta projéteis." },
  portal: { label: "Portal", color: "#c07bff", desc: "Inimigos podem surgir por aqui." },
  trail: { label: "Trilha", color: "#d8b878", desc: "Terra batida: inimigos avançam 15% mais rápido." },
  crystal: { label: "Cristal", color: "#7fd8ff", desc: "Defensores aqui causam 20% mais dano." },
};

const NAMES = [
  "Jardim das Sementes",
  "Águas Profundas",
  "Copa Mutante",
  "Dunas em Chamas",
  "Ilhas Impossíveis",
];

/** Gera um tabuleiro justo: nunca mais de 3 casas bloqueadas por linha e sempre deixa as colunas 0–1 livres. */
export function boardFor(level: number, seed: number): BoardSpec {
  const L = Math.max(1, Math.min(50, level));
  const world = worldOf(L);
  const rng = mulberry32((seed ^ (L * 2654435761)) >>> 0);
  const cells: CellSpec[] = [];
  const portals: { col: number; row: number }[] = [];
  const used = new Set<string>();
  const put = (col: number, row: number, kind: TerrainKind) => {
    const k = col + ":" + row;
    if (col < 2 || col > 8 || row < 0 || row > 4 || used.has(k)) return;
    used.add(k);
    cells.push({ col, row, kind });
  };
  const variant = L % 4;
  const growAt = 40 + (L % 5) * 6;
  const bridgePeriod = world === 1 || world === 4 ? 11 + (L % 3) * 3 : 0;

  if (world === 0) {
    // Vale: trilhas, pedras e flores que crescem
    for (let r = 0; r < 5; r++) {
      put(2 + ((r + variant) % 3), r, "trail");
      put(5 + ((r + variant) % 3), r, "trail");
    }
    for (let i = 0; i < 2 + (L % 3); i++) put(3 + Math.floor(rng() * 5), Math.floor(rng() * 5), "rock");
    for (let i = 0; i < 2; i++) put(4 + Math.floor(rng() * 3), Math.floor(rng() * 5), "growth");
    for (let i = 0; i < 2 && L >= 6; i++) put(3 + Math.floor(rng() * 4), Math.floor(rng() * 5), "crystal");
  } else if (world === 1) {
    // Pântano: água em cada linha, pontes móveis, vitórias-régias
    for (let r = 0; r < 5; r++) {
      put(3 + ((r + variant) % 3), r, "water");
      if (L % 2 === 0) put(6 + (r % 2), r, "water");
      put(2 + (r % 2), r, "bridge");
    }
    for (let i = 0; i < 2; i++) put(5 + Math.floor(rng() * 3), Math.floor(rng() * 5), "growth");
    for (let i = 0; i < 2; i++) put(4 + Math.floor(rng() * 4), Math.floor(rng() * 5), "shadow");
  } else if (world === 2) {
    // Floresta mutante: sombras, raízes que crescem, cogumelos luminosos
    for (let r = 0; r < 5; r++) {
      put(3 + ((r + variant) % 3), r, "shadow");
      put(5 + ((r + 1) % 3), r, "growth");
    }
    for (let i = 0; i < 2; i++) put(6 + Math.floor(rng() * 2), Math.floor(rng() * 5), "rock");
    for (let i = 0; i < 2; i++) put(2 + Math.floor(rng() * 2), Math.floor(rng() * 5), "crystal");
  } else if (world === 3) {
    // Deserto das cinzas: lava, pedras que bloqueiam tiros, calor
    for (let r = 0; r < 5; r++) {
      put(4 + ((r + variant) % 3), r, r % 2 === 0 ? "lava" : "trail");
      put(6 + (r % 2), r, "rock");
    }
    for (let i = 0; i < 2; i++) put(3 + Math.floor(rng() * 3), Math.floor(rng() * 5), "ice");
    for (let i = 0; i < 2; i++) put(5 + Math.floor(rng() * 3), Math.floor(rng() * 5), "growth");
  } else {
    // Dimensão do Caos: portais, pontes, cristais, inversão de rotas
    for (let r = 0; r < 5; r++) {
      const c = 3 + ((r + variant) % 4);
      put(c, r, "portal");
      portals.push({ col: c, row: r });
      if (L % 2 === 0) {
        const c2 = 2 + ((r * 2 + variant) % 3);
        put(c2, r, "portal");
        portals.push({ col: c2, row: r });
      }
    }
    for (let i = 0; i < 3; i++) put(5 + Math.floor(rng() * 3), Math.floor(rng() * 5), "bridge");
    for (let i = 0; i < 3; i++) put(2 + Math.floor(rng() * 4), Math.floor(rng() * 5), "crystal");
    for (let i = 0; i < 2; i++) put(4 + Math.floor(rng() * 4), Math.floor(rng() * 5), "ice");
  }

  // Justiça: no máximo 3 casas 'duras' por linha e pelo menos 4 casas plantáveis
  const hard = new Set<TerrainKind>(["rock", "lava", "water", "growth", "bridge"]);
  for (let r = 0; r < 5; r++) {
    const row = cells.filter((c) => c.row === r && hard.has(c.kind));
    while (row.length > 3) {
      const c = row.pop()!;
      cells.splice(cells.indexOf(c), 1);
      const pi = portals.findIndex((p) => p.col === c.col && p.row === c.row);
      if (pi >= 0) portals.splice(pi, 1);
    }
  }

  return { id: `w${world}-l${L}-v${variant}`, world, level: L, name: NAMES[world], cells, portals, activeRows: [true, true, true, true, true], growAt, bridgePeriod, pathVariant: variant };
}

/* --------------------------------- EVENTOS --------------------------------- */
export type EventKind = "rain" | "sandstorm" | "lightning" | "night" | "fog" | "surprise" | "inversion" | "heat" | "eclipse" | "portalSurge";

export interface LevelEvent {
  t: number; // instante de início (s da partida)
  dur: number;
  kind: EventKind;
  row?: number;
  col?: number;
}
export const EVENT_INFO: Record<EventKind, { label: string; icon: string; color: string; warn: string; desc: string }> = {
  rain: { label: "Chuva de seiva", icon: "☂", color: "#7fd8ff", warn: "Nuvens se formando", desc: "Cai mais seiva do céu e o gelo dura mais." },
  sandstorm: { label: "Tempestade de areia", icon: "≋", color: "#ffb347", warn: "Areia se levantando", desc: "Projéteis têm alcance reduzido por alguns segundos." },
  lightning: { label: "Raio", icon: "✦", color: "#ffe27a", warn: "RAIO NA LINHA MARCADA!", desc: "Atinge a casa sinalizada: fere plantas e atordoa inimigos." },
  night: { label: "Noite densa", icon: "☾", color: "#8a9cff", warn: "A luz está caindo", desc: "Visibilidade reduzida; Flor Lunar produz mais." },
  fog: { label: "Névoa misteriosa", icon: "≋", color: "#c8d8e8", warn: "Névoa se aproximando", desc: "Inimigos distantes ficam obscurecidos." },
  surprise: { label: "Invasão surpresa", icon: "!", color: "#ff6b7a", warn: "INVASÃO SURPRESA!", desc: "Um pequeno grupo entra por trás." },
  inversion: { label: "Inversão de rota", icon: "⇄", color: "#c07bff", warn: "AS ROTAS VÃO INVERTER!", desc: "Os inimigos recuam brevemente antes de avançar." },
  heat: { label: "Onda de calor", icon: "▲", color: "#ff7a3a", warn: "O solo está esquentando", desc: "Defensores sem resistência ao calor perdem vida lentamente." },
  eclipse: { label: "Eclipse", icon: "◐", color: "#ffcf4a", warn: "UM ECLIPSE SE APROXIMA", desc: "Geradores deeclipse produzem o triplo." },
  portalSurge: { label: "Surto de portais", icon: "◎", color: "#c07bff", warn: "PORTAL INSTÁVEL!", desc: "Inimigos surgem direto nos portais do tabuleiro." },
};

const POOLS: Record<number, EventKind[]> = {
  0: ["rain", "lightning", "rain"],
  1: ["fog", "surprise", "rain", "inversion"],
  2: ["night", "surprise", "fog", "inversion"],
  3: ["sandstorm", "heat", "lightning", "sandstorm"],
  4: ["portalSurge", "inversion", "eclipse", "lightning", "night"],
};

export function eventsFor(level: number, seed: number): LevelEvent[] {
  const L = Math.max(1, Math.min(50, level));
  const world = worldOf(L);
  const rng = mulberry32((seed ^ 0x51ed270b ^ (L * 97)) >>> 0);
  const pool = POOLS[world];
  const out: LevelEvent[] = [];
  if (L < 4) return out;
  const count = Math.min(5, 1 + Math.floor((L - 6) / 12));
  for (let i = 0; i < count; i++) {
    const kind = pool[Math.floor(rng() * pool.length)];
    const t = 30 + i * 40 + Math.floor(rng() * 8);
    out.push({ t, dur: kind === "lightning" || kind === "surprise" || kind === "portalSurge" ? 4 : 10 + Math.floor(rng() * 6), kind, row: Math.floor(rng() * 5), col: 2 + Math.floor(rng() * 6) });
  }
  return out;
}

/** Aviso prévio de 3 s: todo evento perigoso é anunciado antes de acontecer. */
export const EVENT_WARN = 3;
