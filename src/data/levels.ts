import type { EnemyId } from "./enemies";
import type { MatchStats } from "../game/types";
import { WORLD_COUNT, LEVELS_PER_WORLD, FINAL_LEVEL, worldOf } from "./rules";
import { boardFor, eventsFor, type BoardSpec, type LevelEvent } from "./worlds";

export type Mod = "rochoso" | "estreito" | "chuva" | "noite" | "nevoa" | "enxame" | "calor" | "portais" | "inversao" | "surpresa";

export const MOD_INFO: Record<Mod, { label: string; icon: string; desc: string }> = {
  rochoso: { label: "Terreno rochoso", icon: "◆", desc: "Pedras bloqueiam casas e interceptam projéteis." },
  estreito: { label: "Corredor estreito", icon: "↕", desc: "Só 3 linhas estão ativas." },
  chuva: { label: "Chuva de seiva", icon: "☂", desc: "A seiva cai do céu com o dobro de frequência." },
  noite: { label: "Noite sem luz", icon: "☾", desc: "Nenhuma seiva cai do céu. Comece com +100." },
  nevoa: { label: "Névoa densa", icon: "≋", desc: "Inimigos distantes ficam quase invisíveis." },
  enxame: { label: "Enxame", icon: "✣", desc: "25% mais ameaça, com muitos inimigos pequenos." },
  calor: { label: "Calor intenso", icon: "▲", desc: "Casas de lava ferem defensores sem resistência." },
  portais: { label: "Portais ativos", icon: "◎", desc: "Inimigos podem surgir em casas do meio do tabuleiro." },
  inversao: { label: "Rotas instáveis", icon: "⇄", desc: "Eventos invertem temporariamente o avanço." },
  surpresa: { label: "Emboscadas", icon: "!", desc: "Grupos entram por trás, com aviso prévio." },
};

export type ObjSpec =
  | { k: "guardsMax"; n: number }
  | { k: "air"; n: number }
  | { k: "seiva"; n: number }
  | { k: "maxPlants"; n: number }
  | { k: "lostMax"; n: number }
  | { k: "classes"; n: number }
  | { k: "kills"; n: number }
  | { k: "combos"; n: number }
  | { k: "byClass"; n: number };

export function objectiveEval(o: ObjSpec, s: MatchStats): { met: boolean; text: string; label: string } {
  switch (o.k) {
    case "guardsMax":
      return { met: s.guardsUsed <= o.n, text: o.n === 0 ? "Não use nenhuma Runa de Guarda" : `Use no máximo ${o.n} Runa${o.n > 1 ? "s" : ""} de Guarda`, label: `${s.guardsUsed}/${o.n}` };
    case "air":
      return { met: s.airKills >= o.n, text: `Derrote ${o.n} inimigos voadores`, label: `${Math.min(s.airKills, o.n)}/${o.n}` };
    case "seiva":
      return { met: s.seivaCollected >= o.n, text: `Colete ${o.n} de seiva`, label: `${Math.min(s.seivaCollected, o.n)}/${o.n}` };
    case "maxPlants":
      return { met: s.planted <= o.n, text: `Plante no máximo ${o.n} defensores`, label: `${s.planted}/${o.n}` };
    case "lostMax":
      return { met: s.plantsLost <= o.n, text: `Perca no máximo ${o.n} defensores`, label: `${s.plantsLost}/${o.n}` };
    case "classes":
      return { met: s.classesUsed >= o.n, text: `Use ${o.n} classes de defensores`, label: `${Math.min(s.classesUsed, o.n)}/${o.n}` };
    case "kills":
      return { met: s.kills >= o.n, text: `Derrote ${o.n} inimigos`, label: `${Math.min(s.kills, o.n)}/${o.n}` };
    case "combos":
      return { met: s.combos >= o.n, text: `Ative ${o.n} combinação(ões) de plantas`, label: `${Math.min(s.combos, o.n)}/${o.n}` };
    case "byClass":
      return { met: s.plantedBy && Object.keys(s.plantedBy).length >= o.n, text: `Use ${o.n} defensores diferentes`, label: `${Object.keys(s.plantedBy || {}).length}/${o.n}` };
  }
}

export interface BiomeDef {
  id: number;
  name: string;
  blurb: string;
  boss: string;
  levels: [number, number];
  sky: [string, string];
  ground: [string, string];
  line: string;
  accent: string;
  fog: string;
  prop: "trees" | "reeds" | "ruins" | "thorns" | "flowers" | "mushrooms" | "dunes" | "portals";
  body: "sun" | "swamp" | "ember" | "eclipse" | "cosmos";
  music: string;
}

export const BIOMES: BiomeDef[] = [
  { id: 0, name: "Vale das Sementes", blurb: "Flores gigantes, riachos e a primeira luz. Aqui se aprende a combinar.", boss: "Guardião Apodrecido", levels: [1, 10], sky: ["#0b2432", "#2a6a58"], ground: ["#2f7a46", "#235f38"], line: "rgba(190,255,190,.10)", accent: "#7be05a", fog: "rgba(220,255,200,.06)", prop: "flowers", body: "sun", music: "vale" },
  { id: 1, name: "Pântano das Sombras", blurb: "Águas paradas, árvores retorcidas e cogumelos que brilham. O solo muda.", boss: "Rei do Lodo", levels: [11, 20], sky: ["#041410", "#123b31"], ground: ["#25523a", "#1b4230"], line: "rgba(150,240,210,.09)", accent: "#4fd8b0", fog: "rgba(140,230,200,.12)", prop: "reeds", body: "swamp", music: "pantano" },
  { id: 2, name: "Floresta Mutante", blurb: "Noite permanente, raízes vivas e esporos luminosos. Nada fica onde estava.", boss: "Titã das Raízes", levels: [21, 30], sky: ["#0b0620", "#2b1c50"], ground: ["#263a4a", "#1c2c3b"], line: "rgba(200,130,255,.11)", accent: "#b98bff", fog: "rgba(160,110,230,.10)", prop: "mushrooms", body: "eclipse", music: "floresta" },
  { id: 3, name: "Deserto das Cinzas", blurb: "Dunas, ruínas e vulcões. O calor e a areia reescrevem o campo.", boss: "Colosso das Cinzas", levels: [31, 40], sky: ["#2a1010", "#7a3218"], ground: ["#6b5030", "#4a3826"], line: "rgba(255,210,140,.10)", accent: "#ffb347", fog: "rgba(255,180,110,.09)", prop: "dunes", body: "ember", music: "deserto" },
  { id: 4, name: "Dimensão do Caos", blurb: "Ilhas flutuantes, portais e um céu que não obedece à geometria.", boss: "Devorador dos Mundos", levels: [41, 50], sky: ["#0a0420", "#3b1768"], ground: ["#342650", "#241a3e"], line: "rgba(210,150,255,.14)", accent: "#ff7ae0", fog: "rgba(200,120,255,.10)", prop: "portals", body: "cosmos", music: "caos" },
];

export type WaveKind = "normal" | "survival" | "massive" | "protect" | "elite" | "coordinated" | "ambush" | "boss";

export interface LevelDef {
  n: number;
  name: string;
  world: number;
  biome: number;
  mods: Mod[];
  emphasis: EnemyId[];
  boss?: EnemyId;
  objectives: [ObjSpec, ObjSpec];
  intro: string;
  newEnemy?: EnemyId;
  board: BoardSpec;
  events: LevelEvent[];
  waves: number;
  waveKind: WaveKind;
  startBonus: number;
  reward: number;
}

const NAMES: string[][] = [
  ["Primeiro Orvalho", "Raízes Teimosas", "Trilha de Terra", "Chuva de Pétalas", "Pedras no Caminho", "O Jardim Acorda", "Coroa de Espinhos", "Vento nas Flores", "Véspera do Guardião", "O Guardião Apodrecido"],
  ["Água Turva", "Vitórias-Régias", "Névoa Baixa", "Lodo Vivo", "Ponte que Sobe", "Anfíbios", "Cogumelos da Margem", "Maré Invertida", "Olho do Pântano", "O Rei do Lodo"],
  ["Primeira Sombra", "Esporos Azuis", "Raiz que Cresce", "Camuflagem", "Ataque por Trás", "Copa Fechada", "Duas Frentes", "Fungos Mutantes", "Coração da Floresta", "O Titã das Raízes"],
  ["Areia Fina", "Pedra que Canta", "Duna Móvel", "Calor Branco", "Ruína Enterrada", "Tempestade", "Rio de Lava", "Blindados", "Cinzas do Céu", "O Colosso das Cinzas"],
  ["Primeiro Portal", "Ilha sem Chão", "Rotas Trocadas", "Eco de Mundos", "Enxame Coordenado", "Tempo Dobrado", "Três Portais", "Guardas do Devorador", "Antes do Fim", "O Devorador dos Mundos"],
];

const MOD_POOLS: Mod[][] = [
  ["rochoso", "chuva", "estreito", "enxame"],
  ["nevoa", "chuva", "estreito", "surpresa"],
  ["noite", "nevoa", "rochoso", "surpresa", "inversao"],
  ["calor", "rochoso", "noite", "enxame", "portais"],
  ["portais", "inversao", "surpresa", "enxame", "noite"],
];

const EMPHASIS: EnemyId[][] = [
  ["cinzento", "escudeiro", "estilhaco", "mariposa"],
  ["aquatico", "sapo", "profundezas", "verme"],
  ["ninja", "sombras", "mutante", "raizes"],
  ["areias", "vulcanico", "blindado_elite", "radioativo"],
  ["portais_senhor", "mutante", "general", "colossal"],
];

const BOSSES: EnemyId[] = ["guardiao_apodrecido", "rei_lodo", "tita_raizes", "colosso_cinzas", "devorador_mundos"];

const INTROS: string[][] = [
  ["Plante Geradoras e proteja o santuário.", "Combine ataque e defesa na mesma linha.", "Trilhas aceleram quem passa por elas.", "Aproveite a chuva para montar a economia.", "Pedras bloqueiam tiros: reposicione.", "Use classes diferentes para as sinergias.", "Espinhos e muralhas compram tempo.", "Inimigos rápidos chegam por várias linhas.", "Prepare tudo: o chefe vem a seguir.", "CHEFE: o Guardião Apodrecido desperta."],
  ["Casas alagadas só aceitam plantas aquáticas.", "A ponte abre e fecha em ciclos.", "Névoa esconde o que vem de longe.", "Anfíbios ignoram a água.", "Use a ponte móvel a seu favor.", "Ataques surgem da água.", "Cogumelos crescem no meio da partida.", "As rotas podem inverter por alguns segundos.", "O lodo começa a se mexer.", "CHEFE: o Rei do Lodo emerge."],
  ["Sombras camuflam alguns inimigos.", "Esporos luminosos revelam o perigo.", "Raízes bloqueiam casas no meio da luta.", "Ataque revelado só quando chega perto.", "Grupos entram por trás com aviso.", "Concentre fogo nas poucas linhas livres.", "Ataques simultâneos em várias linhas.", "Inimigos mudam de comportamento.", "A floresta inteira se contrai.", "CHEFE: o Titã das Raízes racha o solo."],
  ["Casas de lava exigem plantas resistentes.", "Pedras interceptam projéteis.", "Obstáculos surgem durante as ondas.", "Onda de calor fere plantas comuns.", "Ruínas guardam cristais de poder.", "Tempestade de areia encurta o alcance.", "Lava e gelo no mesmo tabuleiro.", "Blindados protegem os menores.", "O céu cai em cinzas.", "CHEFE: o Colosso das Cinzas se levanta."],
  ["Inimigos entram por portais no meio do campo.", "Ilhas flutuantes mudam as rotas.", "Inversão temporária: reaja rápido.", "Habilidades combinadas aparecem.", "Ondas coordenadas em todas as linhas.", "Eclipse turbina Geradoras de eclipse.", "Três portais ativos ao mesmo tempo.", "Destrua os guardas antes do chefe.", "Tudo que aprendeu, agora.", "EVENTO FINAL: o Devorador dos Mundos."],
];

const OBJ_POOL: ObjSpec[] = [
  { k: "guardsMax", n: 0 }, { k: "seiva", n: 400 }, { k: "classes", n: 3 }, { k: "lostMax", n: 3 },
  { k: "combos", n: 2 }, { k: "kills", n: 20 }, { k: "maxPlants", n: 22 }, { k: "byClass", n: 6 },
  { k: "air", n: 6 }, { k: "guardsMax", n: 1 }, { k: "lostMax", n: 5 }, { k: "seiva", n: 650 },
];
const WAVE_KINDS: WaveKind[] = ["normal", "survival", "coordinated", "massive", "protect", "elite", "ambush", "normal", "elite", "boss"];

const NEW_ENEMY: Record<number, EnemyId> = {
  1: "cinzento", 2: "escudeiro", 3: "estilhaco", 4: "mariposa", 6: "sapo", 7: "gafanhoto", 8: "xama", 9: "colosso",
  11: "aquatico", 13: "profundezas", 15: "verme", 17: "bulbo", 21: "ninja", 23: "sombras", 25: "raizes", 27: "mutante",
  31: "areias", 33: "vulcanico", 35: "radioativo", 37: "blindado_elite", 41: "portais_senhor", 43: "general", 45: "colossal", 47: "devorador",
};

function buildLevel(n: number): LevelDef {
  const w = worldOf(n);
  const i = (n - 1) % LEVELS_PER_WORLD;
  const seed = 9000 + n;
  const pool = MOD_POOLS[w];
  const mods: Mod[] = [pool[i % pool.length]];
  if (i >= 5 && i % 3 === 0) mods.push(pool[(i + 2) % pool.length]);
  if (i === 9) mods.push("enxame");
  const boss = i === 9 ? BOSSES[w] : undefined;
  const emphasis = EMPHASIS[w].slice(0, Math.min(4, 1 + Math.floor(i / 3)));
  const objectives: [ObjSpec, ObjSpec] = [OBJ_POOL[(n * 2) % OBJ_POOL.length], OBJ_POOL[(n * 3 + 5) % OBJ_POOL.length]];
  if (objectives[0].k === objectives[1].k) objectives[1] = OBJ_POOL[(n * 3 + 7) % OBJ_POOL.length];
  return {
    n,
    name: NAMES[w][i],
    world: w,
    biome: w,
    mods,
    emphasis,
    boss,
    objectives,
    intro: INTROS[w][i],
    newEnemy: NEW_ENEMY[n],
    board: boardFor(n, seed),
    events: eventsFor(n, seed),
    waves: Math.min(7, 2 + Math.floor(n / 9) + (boss ? 1 : 0)),
    waveKind: boss ? "boss" : WAVE_KINDS[i],
    startBonus: i === 9 ? 100 : i >= 6 ? 50 : 0,
    reward: 20 + n * 9 + (boss ? 120 + w * 80 : 0),
  };
}

/** Exatamente 50 fases jogáveis, 5 mundos × 10 fases. */
export const LEVELS: LevelDef[] = Array.from({ length: FINAL_LEVEL }, (_, i) => buildLevel(i + 1));

export const TUTORIAL: LevelDef = {
  n: 0,
  name: "Treino no Jardim",
  world: 0,
  biome: 0,
  mods: [],
  emphasis: [],
  objectives: [{ k: "guardsMax", n: 5 }, { k: "kills", n: 3 }],
  intro: "Aprenda o básico em poucos minutos.",
  board: boardFor(1, 9000),
  events: [],
  waves: 1,
  waveKind: "normal",
  startBonus: 75,
  reward: 50,
};

export const getLevel = (n: number): LevelDef => (n <= 0 ? TUTORIAL : LEVELS[Math.min(FINAL_LEVEL, n) - 1]);
export const biomeOf = (n: number) => BIOMES[getLevel(n).biome];
export const worldCompleted = (completed: number, w: number) => completed >= (w + 1) * LEVELS_PER_WORLD;
export const WORLD_COUNT_CONST = WORLD_COUNT;
