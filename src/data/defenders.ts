// Os Guardiões do Jardim: 13 originais preservados + catálogo expandido da Edição 3.0.
export type DefClass = "gerador" | "longo" | "curto" | "protecao" | "especial";
export type Rarity = "comum" | "raro" | "epico" | "lendario";
export type PlantForm = "flower" | "mushroom" | "crystal" | "cactus" | "vine" | "bulb" | "tree" | "orb" | "pumpkin" | "bell" | "fan" | "telescope" | "sun" | "root" | "shield";
export type PlantTag = "solar" | "aquatic" | "heat" | "electric" | "ice" | "fire" | "poison" | "explosive" | "protective" | "attacker" | "cosmic" | "support";

/** Habilidade executada pelo motor (todas têm implementação real em engine.abilityTick). */
export type Ability =
  | "solar" | "solarSmall" | "burst" | "store" | "eclipse" | "lunar" | "collective"
  | "dart" | "freeze" | "pierce" | "chain" | "lob" | "triple" | "spore" | "bigboom" | "boomerang" | "sniper" | "fire" | "poison" | "push" | "shards" | "meteor"
  | "whip" | "spin" | "wall" | "shield" | "thorns" | "barrier" | "heal" | "guardian"
  | "explode" | "stun" | "void" | "hypno" | "ghost" | "timeSlow" | "magnet" | "chaos" | "teleport" | "vampire" | "illusion" | "absoluteFreeze" | "cosmic" | "supreme";

export type Unlock = { kind: "start" } | { kind: "level"; n: number } | { kind: "achv"; id: string };

export interface DefDef {
  id: string;
  name: string;
  cls: DefClass;
  rarity: Rarity;
  tagline: string;
  cost: number;
  recharge: number;
  hp: number;
  dmg: number;
  interval: number;
  range: number;
  air: boolean;
  power: string;
  color: string;
  unlock: Unlock;
  ability: Ability;
  form: PlantForm;
  tags: PlantTag[];
}

export type DefId = string;

export const CLASS_INFO: Record<DefClass, { label: string; color: string; icon: string; desc: string }> = {
  gerador: { label: "Gerador", color: "#ffd45a", icon: "✦", desc: "Produz seiva para toda a equipe." },
  longo: { label: "Longo alcance", color: "#7bdc6b", icon: "➶", desc: "Ataca de longe pela linha." },
  curto: { label: "Curto alcance", color: "#ff8f6b", icon: "⚔", desc: "Dano alto contra quem chega perto." },
  protecao: { label: "Proteção", color: "#c9a26a", icon: "⛨", desc: "Segura a horda e protege aliados." },
  especial: { label: "Especial", color: "#a98bff", icon: "✧", desc: "Poderes que mudam a partida." },
};

export const RARITY_INFO: Record<Rarity, { label: string; color: string }> = {
  comum: { label: "Comum", color: "#9fb3a8" },
  raro: { label: "Raro", color: "#5ab8ff" },
  epico: { label: "Épico", color: "#c07bff" },
  lendario: { label: "Lendário", color: "#ffb43a" },
};

/** Os 13 defensores da versão 1.0 — nomes, números e comportamentos preservados. */
const ORIGINAL: DefDef[] = [
  { id: "luminia", name: "Lumínia", cls: "gerador", rarity: "comum", tagline: "A lanterna viva do jardim", cost: 50, recharge: 5, hp: 100, dmg: 25, interval: 8, range: 0, air: false, power: "Gera 25 de seiva a cada 8 s para toda a equipe.", color: "#2ee6c5", unlock: { kind: "start" }, ability: "solar", form: "sun", tags: ["solar"] },
  { id: "ambar", name: "Fonte de Âmbar", cls: "gerador", rarity: "raro", tagline: "Cristal que sangra luz", cost: 125, recharge: 12, hp: 70, dmg: 50, interval: 16, range: 0, air: false, power: "Gera 50 de seiva a cada 16 s. Ao ser destruída, libera 40.", color: "#ffb020", unlock: { kind: "level", n: 7 }, ability: "burst", form: "crystal", tags: ["solar"] },
  { id: "espinheiro", name: "Espinheiro", cls: "longo", rarity: "comum", tagline: "Arqueiro das moitas", cost: 100, recharge: 5, hp: 120, dmg: 18, interval: 1.25, range: 9, air: true, power: "Dispara dardos pela linha. Acerta voadores.", color: "#7bdc6b", unlock: { kind: "start" }, ability: "dart", form: "bulb", tags: ["attacker"] },
  { id: "gelidea", name: "Gelídea", cls: "longo", rarity: "comum", tagline: "Lírio do inverno eterno", cost: 175, recharge: 6, hp: 120, dmg: 14, interval: 1.5, range: 9, air: true, power: "Estilhaços de gelo reduzem a velocidade em 50%.", color: "#7fd8ff", unlock: { kind: "level", n: 3 }, ability: "freeze", form: "crystal", tags: ["ice", "attacker"] },
  { id: "orquidea", name: "Orquídea Voltaica", cls: "longo", rarity: "epico", tagline: "Tempestade em pétalas", cost: 200, recharge: 8, hp: 110, dmg: 32, interval: 2.2, range: 5.5, air: true, power: "Raio em cadeia: até 3 inimigos, inclusive em linhas vizinhas.", color: "#c07bff", unlock: { kind: "achv", id: "caca_asas" }, ability: "chain", form: "flower", tags: ["electric", "attacker"] },
  { id: "morteiro", name: "Cacto-Morteiro", cls: "longo", rarity: "raro", tagline: "Artilharia do deserto", cost: 275, recharge: 8, hp: 110, dmg: 55, interval: 2.6, range: 9, air: false, power: "Arremessa frutos explosivos com dano em área.", color: "#4fd1a1", unlock: { kind: "level", n: 9 }, ability: "lob", form: "cactus", tags: ["explosive", "attacker"] },
  { id: "cipo", name: "Cipó-Chicote", cls: "curto", rarity: "comum", tagline: "Estala antes de você piscar", cost: 75, recharge: 6, hp: 140, dmg: 34, interval: 0.9, range: 2, air: false, power: "Chicoteia todos os terrestres nas 2 casas à frente.", color: "#b6e04a", unlock: { kind: "level", n: 2 }, ability: "whip", form: "vine", tags: ["attacker"] },
  { id: "cardo", name: "Cardo Ceifador", cls: "curto", rarity: "raro", tagline: "Foice em flor", cost: 150, recharge: 8, hp: 220, dmg: 28, interval: 0.8, range: 1, air: false, power: "Giro de foices numa área 3×3.", color: "#ff6b8a", unlock: { kind: "level", n: 5 }, ability: "spin", form: "flower", tags: ["attacker"] },
  { id: "tronco", name: "Tronco Ancestral", cls: "protecao", rarity: "comum", tagline: "Guardião com mil anos", cost: 50, recharge: 18, hp: 900, dmg: 0, interval: 0, range: 0, air: false, power: "Muralha de madeira rúnica.", color: "#c9a26a", unlock: { kind: "start" }, ability: "wall", form: "tree", tags: ["protective"] },
  { id: "musgo", name: "Musgo-Mãe", cls: "protecao", rarity: "raro", tagline: "Cuida de quem está por perto", cost: 100, recharge: 10, hp: 180, dmg: 6, interval: 1, range: 1, air: false, power: "Cura 6 de vida/s dos aliados numa área 3×3.", color: "#5fe08a", unlock: { kind: "level", n: 4 }, ability: "heal", form: "mushroom", tags: ["support", "protective"] },
  { id: "magma", name: "Fruta-Magma", cls: "especial", rarity: "comum", tagline: "Pequena, redonda e furiosa", cost: 150, recharge: 25, hp: 60, dmg: 700, interval: 0.7, range: 1.5, air: true, power: "Explode após 0,7 s causando 700 de dano em área.", color: "#ff5a2a", unlock: { kind: "start" }, ability: "explode", form: "orb", tags: ["fire", "explosive"] },
  { id: "sino", name: "Sino do Eclipse", cls: "especial", rarity: "epico", tagline: "Um toque e o tempo hesita", cost: 175, recharge: 15, hp: 110, dmg: 0, interval: 9, range: 3.5, air: true, power: "Onda sonora paralisa inimigos (chefes por 1,2 s).", color: "#7a8cff", unlock: { kind: "level", n: 12 }, ability: "stun", form: "bell", tags: ["support"] },
  { id: "vazio", name: "Semente do Vazio", cls: "especial", rarity: "lendario", tagline: "O que ela engole não volta", cost: 225, recharge: 30, hp: 80, dmg: 30, interval: 6, range: 2, air: true, power: "Vórtice por 6 s que puxa e fere inimigos próximos.", color: "#9b5cff", unlock: { kind: "level", n: 20 }, ability: "void", form: "orb", tags: ["cosmic"] },
];

type Row = [string, string, DefClass, Rarity, number, number, number, number, number, number, boolean, Ability, string, string, number, PlantForm, PlantTag[]];
// id, nome, classe, raridade, custo, recarga, vida, dano, intervalo, alcance, acerta ar, habilidade, descrição, cor, fase de desbloqueio, forma, tags
const EXPANSION: Row[] = [
  // ── Produção de energia ──────────────────────────────────────────────
  ["flor_solar", "Flor Solar", "gerador", "comum", 50, 5, 90, 20, 7, 0, false, "solarSmall", "Produz 20 de seiva a cada 7 s. Barata e confiável.", "#ffd45a", 2, "flower", ["solar"]],
  ["flor_lunar", "Flor Lunar", "gerador", "raro", 125, 9, 90, 30, 10, 0, false, "lunar", "Produz 30 de seiva; triplica durante noite/eclipse.", "#a9b8ff", 11, "flower", ["solar", "cosmic"]],
  ["cogumelo_dourado", "Cogumelo Dourado", "gerador", "raro", 125, 12, 80, 25, 12, 0, false, "burst", "Libera 3 orbes de 25 de uma vez, em ciclos.", "#e8b84a", 14, "mushroom", ["solar"]],
  ["raiz_cristalina", "Raiz Cristalina", "gerador", "epico", 200, 16, 130, 20, 3, 0, false, "store", "Acumula seiva e libera tudo de uma vez ao atingir 140.", "#7fd8ff", 22, "root", ["solar", "aquatic"]],
  ["flor_eclipse", "Flor do Eclipse", "gerador", "epico", 175, 14, 100, 75, 12, 0, false, "eclipse", "Produz 25 de seiva, mas 75 durante eventos especiais.", "#ffcf4a", 31, "sun", ["solar", "cosmic"]],
  ["trevo_energetico", "Trevo Energético", "gerador", "raro", 100, 10, 110, 15, 8, 1, false, "collective", "Gera 15 de seiva e turbina geradores vizinhos em 25%.", "#7bdc6b", 24, "flower", ["solar", "support"]],
  // ── Ataque ───────────────────────────────────────────────────────────
  ["ervilha_tripla", "Ervilha Tripla", "longo", "raro", 200, 8, 120, 16, 1.7, 9, true, "triple", "Dispara três projéteis: na própria linha e nas vizinhas.", "#8ee06a", 4, "bulb", ["attacker"]],
  ["cacto_perfurante", "Cacto Perfurante", "longo", "raro", 225, 9, 130, 30, 2.1, 9, false, "pierce", "Espinho que atravessa até 4 inimigos alinhados.", "#5fc98a", 12, "cactus", ["attacker"]],
  ["canhao_esporos", "Canhão de Esporos", "longo", "raro", 250, 10, 120, 40, 2.8, 9, true, "spore", "Dispara esporos em área que também envenenam.", "#9be37a", 16, "mushroom", ["poison", "attacker", "explosive"]],
  ["orquidea_explosiva", "Orquídea Explosiva", "longo", "epico", 300, 18, 90, 260, 3.4, 6, true, "bigboom", "Lança uma flor que explode em área de 2 casas.", "#ff8fb1", 26, "flower", ["explosive", "attacker"]],
  ["lirio_eletrico", "Lírio Elétrico", "longo", "epico", 225, 9, 110, 28, 2.2, 6, true, "chain", "Descarga em cadeia entre até 3 alvos, inclusive voadores.", "#c9a0ff", 21, "flower", ["electric", "attacker"]],
  ["flor_bumerangue", "Flor Bumerangue", "longo", "raro", 175, 8, 110, 18, 1.6, 7, true, "boomerang", "Projétil vai e volta, ferindo na ida e no retorno.", "#ffe27a", 18, "fan", ["attacker"]],
  ["trepadeira_arqueira", "Trepadeira Arqueira", "longo", "raro", 200, 9, 100, 60, 2.6, 9, true, "sniper", "Alvo único de longo alcance com dano alto.", "#6bd13b", 8, "vine", ["attacker"]],
  ["rosa_vulcanica", "Rosa Vulcânica", "longo", "epico", 225, 9, 130, 22, 1.4, 7, true, "fire", "Projéteis de fogo que causam queimadura contínua.", "#ff6a2a", 32, "flower", ["fire", "heat", "attacker"]],
  ["cogumelo_venenoso", "Cogumelo Venenoso", "longo", "raro", 150, 7, 100, 10, 1.5, 7, true, "poison", "Aplica veneno que continua causando dano.", "#a3e635", 13, "mushroom", ["poison", "attacker"]],
  ["planta_furacao", "Planta Furacão", "longo", "epico", 200, 12, 120, 12, 3.2, 5, true, "push", "Rajada empurra os inimigos da linha para trás.", "#9fe6ff", 29, "fan", ["attacker"]],
  ["flor_cristal", "Flor de Cristal", "longo", "epico", 250, 10, 110, 20, 2.2, 7, true, "shards", "Dispara fragmentos em três direções diferentes.", "#8fe6ff", 34, "crystal", ["ice", "attacker"]],
  ["planta_meteoro", "Planta Meteoro", "longo", "lendario", 350, 20, 100, 140, 5, 9, false, "meteor", "Invoca um meteoro sobre o grupo mais denso.", "#ff9a52", 38, "telescope", ["fire", "explosive", "attacker"]],
  // ── Defesa ───────────────────────────────────────────────────────────
  ["abobora_blindada", "Abóbora Blindada", "protecao", "raro", 75, 16, 1200, 0, 0, 0, false, "wall", "Muralha muito resistente com casca reforçada.", "#ff9a3a", 6, "pumpkin", ["protective"]],
  ["muralha_madeira", "Muralha de Madeira", "protecao", "comum", 50, 14, 800, 0, 0, 0, false, "wall", "Bloqueia corredores e compra tempo para os atacantes.", "#b98a52", 3, "tree", ["protective"]],
  ["escudo_cristal", "Escudo de Cristal", "protecao", "epico", 150, 14, 260, 0, 0, 1, false, "shield", "Reduz em 35% o dano sofrido por plantas vizinhas.", "#9fe6ff", 23, "shield", ["protective", "support"]],
  ["raiz_gigante", "Raiz Gigante", "protecao", "epico", 125, 22, 1800, 0, 0, 0, false, "wall", "Absorve enorme quantidade de dano.", "#a8794a", 36, "root", ["protective"]],
  ["planta_espinhosa", "Planta Espinhosa", "protecao", "raro", 100, 10, 300, 22, 0, 0, false, "thorns", "Causa dano a cada inimigo que a morde.", "#d6e04a", 19, "cactus", ["protective", "attacker"]],
  ["cogumelo_protetor", "Cogumelo Protetor", "protecao", "epico", 125, 14, 200, 0, 10, 1, false, "barrier", "Cria uma barreira temporária de 400 de vida à frente.", "#c9b0ff", 27, "mushroom", ["protective", "support"]],
  ["flor_curativa", "Flor Curativa", "protecao", "raro", 100, 9, 150, 10, 1, 1, false, "heal", "Recupera 10 de vida/s das plantas de uma área 3×3.", "#5fe08a", 17, "flower", ["support", "protective"]],
  ["guardia_natureza", "Guardiã da Natureza", "protecao", "lendario", 275, 24, 320, 3, 1, 5, false, "guardian", "Regenera 3 de vida/s de TODAS as plantas do tabuleiro.", "#2ee6c5", 40, "tree", ["protective", "support"]],
  // ── Habilidades especiais ────────────────────────────────────────────
  ["flor_hipnotica", "Flor Hipnótica", "especial", "epico", 200, 20, 100, 0, 10, 3, true, "hypno", "Converte um inimigo próximo por 8 s (chefes resistem).", "#ff8fb1", 25, "flower", ["support"]],
  ["cogumelo_fantasma", "Cogumelo Fantasma", "especial", "epico", 175, 12, 90, 40, 1.6, 2, true, "ghost", "Invisível aos inimigos; ataca de surpresa com dano extra.", "#c8d8e8", 30, "mushroom", ["attacker"]],
  ["rosa_temporal", "Rosa Temporal", "especial", "epico", 175, 13, 110, 0, 6, 3, true, "timeSlow", "Desacelera inimigos numa área de 3 linhas.", "#b98bff", 28, "flower", ["support"]],
  ["planta_magnetica", "Planta Magnética", "especial", "raro", 150, 12, 120, 0, 5, 9, true, "magnet", "Remove a armadura de todos os inimigos da linha.", "#7fd8ff", 33, "telescope", ["support"]],
  ["semente_caotica", "Semente Caótica", "especial", "lendario", 200, 18, 100, 0, 7, 5, true, "chaos", "A cada ciclo sorteado: seiva, dano em área, gelo ou cura.", "#ff7ae0", 42, "orb", ["cosmic", "support"]],
  ["planta_teletransportadora", "Planta Teletransportadora", "especial", "epico", 175, 16, 120, 0, 12, 9, false, "teleport", "Traz uma planta ameaçada da frente para uma casa segura.", "#a98bff", 35, "orb", ["support"]],
  ["flor_vampirica", "Flor Vampírica", "especial", "raro", 175, 10, 110, 22, 1.6, 6, true, "vampire", "Cada acerto devolve 5 de seiva à equipe.", "#d04a7a", 37, "flower", ["attacker", "support"]],
  ["orquidea_ilusoria", "Orquídea Ilusória", "especial", "epico", 200, 16, 100, 18, 1.5, 6, true, "illusion", "Cria uma cópia temporária que também dispara.", "#c07bff", 39, "flower", ["attacker", "cosmic"]],
  ["planta_congelante", "Planta Congelante Absoluta", "especial", "lendario", 275, 24, 120, 0, 14, 4, true, "absoluteFreeze", "Paralisa todos os inimigos em 2 linhas por 1,5 s.", "#9fe6ff", 44, "crystal", ["ice", "support"]],
  ["trevo_relampago", "Trevo Relâmpago", "especial", "epico", 225, 12, 110, 24, 2, 5, true, "chain", "Relâmpagos em cadeia com alcance ampliado.", "#ffe27a", 45, "flower", ["electric", "attacker"]],
  ["flor_cosmica", "Flor Cósmica", "especial", "lendario", 350, 26, 100, 90, 16, 9, true, "cosmic", "Pulso cósmico que fere todos os inimigos do tabuleiro.", "#ff7ae0", 46, "sun", ["cosmic", "attacker"]],
  ["guardia_suprema", "Guardiã Suprema", "especial", "lendario", 400, 30, 350, 0, 0, 9, true, "supreme", "Reduz 25% de todo dano sofrido; uma vez por partida restaura as Runas de Guarda.", "#ffe27a", 48, "tree", ["protective", "support"]],
];

const NEW: DefDef[] = EXPANSION.map((r) => ({
  id: r[0], name: r[1], cls: r[2], rarity: r[3], cost: r[4], recharge: r[5], hp: r[6], dmg: r[7], interval: r[8], range: r[9], air: r[10], ability: r[11], power: r[12], color: r[13], unlock: { kind: "level", n: r[14] }, form: r[15], tags: r[16], tagline: r[12].split(".")[0],
}));

export const DEFENDERS: DefDef[] = [...ORIGINAL, ...NEW];
export const DEF_BY_ID = Object.fromEntries(DEFENDERS.map((d) => [d.id, d])) as Record<DefId, DefDef>;
export const DEF_IDS = DEFENDERS.map((d) => d.id);
export const PLANT_COUNT = DEFENDERS.length;

export const MAX_DEF_LEVEL = 5;
/** Custo para subir do nível L para L+1. */
export const UPGRADE_COST = [0, 150, 350, 700, 1200];

export const lvMul = {
  dmg: (lv: number) => 1 + 0.15 * (lv - 1),
  hp: (lv: number) => 1 + 0.2 * (lv - 1),
  rate: (lv: number) => 1 - 0.07 * (lv - 1),
};

export function defStats(def: DefDef, lv: number) {
  const l = Math.max(1, Math.min(MAX_DEF_LEVEL, lv || 1));
  return { hp: Math.round(def.hp * lvMul.hp(l)), dmg: Math.round(def.dmg * lvMul.dmg(l)), interval: def.interval * (def.interval > 0 ? lvMul.rate(l) : 1) };
}

/** Kit fixo do modo solo, em ordem de prioridade. */
const CORE: DefId[] = ["luminia", "espinheiro", "tronco", "magma"];

const rank = (d: DefDef) => (d.unlock.kind === "start" ? 0 : d.unlock.kind === "level" ? d.unlock.n : 8);

/** Kit fixo do solo: 4 base + 2 destaques que mudam a cada fase (variedade real). */
export function soloDeck(avail: DefId[], level = 1): DefId[] {
  const core = CORE.filter((id) => avail.includes(id));
  const others = DEFENDERS.filter((d) => avail.includes(d.id) && !CORE.includes(d.id)).sort((a, b) => rank(b) - rank(a)).map((d) => d.id);
  const feat: DefId[] = [];
  if (others[0]) feat.push(others[0]);
  const rest = others.slice(1);
  for (let i = 0; feat.length < 2 && rest.length && i < 20; i++) {
    const pick = rest[(level * 3 + i) % rest.length];
    if (!feat.includes(pick)) feat.push(pick);
  }
  return [...core, ...feat].slice(0, 6);
}

/** Prioridade dos aliados IA: primeiro o essencial, depois as novidades desbloqueadas. */
export const AI_PRIORITY: DefId[] = [
  "luminia", "espinheiro", "tronco", "gelidea", "magma", "flor_solar", "ervilha_tripla", "musgo", "cipo", "morteiro",
  "cogumelo_dourado", "cardo", "abobora_blindada", "flor_lunar", "cacto_perfurante", "canhao_esporos", "rosa_vulcanica",
  "flor_curativa", "escudo_cristal", "trevo_energetico", "lirio_eletrico", "flor_cosmica", "guardia_suprema",
  "vazio", "sino", "orquidea", "flor_bumerangue", "trepadeira_arqueira", "cogumelo_venenoso", "planta_furacao",
  "flor_cristal", "planta_meteoro", "raiz_cristalina", "flor_eclipse", "muralha_madeira", "escudo_cristal",
  "raiz_gigante", "planta_espinhosa", "cogumelo_protetor", "guardia_natureza", "flor_hipnotica", "cogumelo_fantasma",
  "rosa_temporal", "planta_magnetica", "semente_caotica", "planta_teletransportadora", "flor_vampirica",
  "orquidea_ilusoria", "planta_congelante", "trevo_relampago",
];

export function isAquatic(id: DefId) { return !!DEF_BY_ID[id]?.tags.includes("aquatic") || id === "raiz_cristalina"; }
export function isHeatSafe(id: DefId) { return !!DEF_BY_ID[id]?.tags.includes("heat") || DEF_BY_ID[id]?.cls === "gerador"; }
