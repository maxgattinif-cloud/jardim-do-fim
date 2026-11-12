// O Murchar: 14 inimigos originais preservados + catálogo expandido da Edição 3.0.
export type EnemyKind = "comum" | "rapido" | "resistente" | "voador" | "suporte" | "especial" | "elite" | "chefe";
export type EnemyId = string;
export type EnemyTrait =
  | "amphibious" | "camouflage" | "rear" | "armored" | "vampire" | "summon" | "freezeAura" | "weakenAura"
  | "ghost" | "magnet" | "ranged" | "demolish" | "shieldAura" | "dash" | "poisonAura" | "mutant"
  | "heatAura" | "radioactive" | "slowImmune" | "root" | "burrow" | "boss" | "flyby";
export type EnemyForm = "humanoid" | "beast" | "blob" | "insect" | "armored" | "spectral" | "colossal" | "fungal" | "aquatic" | "boss";

export interface BossSpec {
  thresholds: number[]; // frações de vida em que muda de etapa
  summons: EnemyId[];
  aura: string;
  enrageAt: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  kind: EnemyKind;
  cost: number;
  hp: number;
  armor: number;
  speed: number;
  dps: number;
  intro: number;
  scale: number;
  flying: boolean;
  power: string;
  traits: EnemyTrait[];
  form: EnemyForm;
  colors: [string, string, string]; // pele, sombra, brilho
  boss?: BossSpec;
}

export const KIND_INFO: Record<EnemyKind, { label: string; color: string }> = {
  comum: { label: "Comum", color: "#9fb3a8" },
  rapido: { label: "Rápido", color: "#ffd45a" },
  resistente: { label: "Resistente", color: "#c9a26a" },
  voador: { label: "Voador", color: "#7fd8ff" },
  suporte: { label: "Suporte", color: "#5fe08a" },
  especial: { label: "Especial", color: "#c07bff" },
  elite: { label: "Elite", color: "#ff9a52" },
  chefe: { label: "Chefe", color: "#ff4d5e" },
};

const ORIGINAL: EnemyDef[] = [
  { id: "cinzento", name: "Cinzento", kind: "comum", cost: 1, hp: 200, armor: 0, speed: 13, dps: 22, intro: 1, scale: 1, flying: false, power: "Casca seca e olhos de brasa. Avança devagar.", traits: [], form: "humanoid", colors: ["#5b5666", "#2c2833", "#ffb020"] },
  { id: "escudeiro", name: "Escudeiro de Ferrugem", kind: "resistente", cost: 2, hp: 200, armor: 260, speed: 13, dps: 22, intro: 2, scale: 1, flying: false, power: "Placa enferrujada absorve 260 de dano.", traits: ["armored"], form: "armored", colors: ["#5a5260", "#2c2833", "#ffb020"] },
  { id: "estilhaco", name: "Estilhaço", kind: "rapido", cost: 2, hp: 140, armor: 0, speed: 32, dps: 18, intro: 3, scale: 1, flying: false, power: "Lâminas de cinza. Corre 2,5× mais rápido.", traits: ["dash"], form: "humanoid", colors: ["#4a4452", "#2a2630", "#ffe14a"] },
  { id: "mariposa", name: "Mariposa Cinérea", kind: "voador", cost: 3, hp: 160, armor: 0, speed: 17, dps: 26, intro: 4, scale: 1, flying: true, power: "Voa sobre as defesas e drena Geradores.", traits: ["flyby"], form: "insect", colors: ["#7a6a90", "#4a3c60", "#ff6bd0"] },
  { id: "sapo", name: "Sapo-Pústula", kind: "especial", cost: 3, hp: 220, armor: 0, speed: 12, dps: 20, intro: 6, scale: 1, flying: false, power: "Cospe ácido à distância.", traits: ["ranged", "amphibious"], form: "beast", colors: ["#5c7a4a", "#2a3a1a", "#e6ff6a"] },
  { id: "gafanhoto", name: "Gafanhoto-Ruína", kind: "especial", cost: 3, hp: 210, armor: 0, speed: 20, dps: 22, intro: 7, scale: 1, flying: false, power: "Salta sobre o primeiro defensor.", traits: ["dash"], form: "insect", colors: ["#566a3a", "#2a3a22", "#ff4d4d"] },
  { id: "xama", name: "Xamã de Esporos", kind: "suporte", cost: 4, hp: 260, armor: 0, speed: 12, dps: 16, intro: 8, scale: 1.05, flying: false, power: "Cura aliados próximos.", traits: ["shieldAura"], form: "fungal", colors: ["#8a7aa0", "#2a2036", "#5fe08a"] },
  { id: "colosso", name: "Colosso Barrento", kind: "resistente", cost: 8, hp: 1500, armor: 0, speed: 8, dps: 55, intro: 9, scale: 1.0, flying: false, power: "Gigante de argila com golpes brutais.", traits: ["armored", "demolish"], form: "colossal", colors: ["#8a5a3a", "#3a2410", "#ff8a3a"] },
  { id: "verme", name: "Verme Escavador", kind: "especial", cost: 4, hp: 240, armor: 0, speed: 16, dps: 24, intro: 11, scale: 1, flying: false, power: "Anda sob a terra e surge atrás das defesas.", traits: ["burrow", "rear"], form: "beast", colors: ["#8a4a6a", "#3a1a2a", "#ff8fb1"] },
  { id: "bulbo", name: "Bulbo Explosivo", kind: "especial", cost: 4, hp: 180, armor: 0, speed: 18, dps: 22, intro: 12, scale: 1, flying: false, power: "Explode ao morrer e destrói plantas ao redor.", traits: ["heatAura"], form: "fungal", colors: ["#7a3a55", "#2a1020", "#ffb020"] },
  { id: "ceifeira", name: "Ceifeira de Cinzas", kind: "chefe", cost: 0, hp: 3200, armor: 0, speed: 6, dps: 80, intro: 5, scale: 1.15, flying: false, power: "CHEFE · Invoca Estilhaços e pisoteia em área.", traits: ["boss", "summon"], form: "boss", colors: ["#2e2a38", "#14101c", "#b45cff"], boss: { thresholds: [0.66, 0.33], summons: ["estilhaco", "cinzento"], aura: "#b45cff", enrageAt: 0.35 } },
  { id: "rainha", name: "Rainha Mariposa", kind: "chefe", cost: 0, hp: 2600, armor: 0, speed: 9, dps: 0, intro: 10, scale: 1.35, flying: true, power: "CHEFE VOADOR · Espalha esporos e chama enxames.", traits: ["boss", "summon", "flyby"], form: "boss", colors: ["#8a6aa8", "#3a2a48", "#ff6bd0"], boss: { thresholds: [0.6, 0.3], summons: ["mariposa", "mariposa"], aura: "#ff6bd0", enrageAt: 0.3 } },
  { id: "titan", name: "Colosso de Argila Viva", kind: "chefe", cost: 0, hp: 5600, armor: 1000, speed: 5, dps: 90, intro: 15, scale: 1.2, flying: false, power: "CHEFE · Armadura racha em etapas e chama reforços.", traits: ["boss", "armored", "summon"], form: "boss", colors: ["#7a5238", "#2a1810", "#ff8a3a"], boss: { thresholds: [0.66, 0.33], summons: ["escudeiro", "xama"], aura: "#ff8a3a", enrageAt: 0.33 } },
  { id: "murchar", name: "O Último Murchar", kind: "chefe", cost: 0, hp: 8000, armor: 0, speed: 6, dps: 110, intro: 20, scale: 1.2, flying: false, power: "CHEFE · Invoca hordas e enfurece com metade da vida.", traits: ["boss", "summon"], form: "boss", colors: ["#3a2248", "#0a0412", "#ff3a5a"], boss: { thresholds: [0.66, 0.33], summons: ["cinzento", "escudeiro", "estilhaco"], aura: "#ff3a5a", enrageAt: 0.5 } },
];

type Row = [string, string, EnemyKind, number, number, number, number, number, number, number, boolean, string, string[], EnemyForm, [string, string, string], BossSpec?];
// id, nome, classe, ameaça, vida, armadura, velocidade, dps, fase, escala, voador, poder, traços, forma, cores
const NEW: Row[] = [
  ["jardineiro", "Zumbi Jardineiro", "comum", 1, 210, 0, 14, 22, 1, 1, false, "Arrasta o ancinho e devora mudas.", [], "humanoid", ["#6b7a5a", "#2c3320", "#a3ff5a"]],
  ["aquatico", "Zumbi Aquático", "especial", 2, 230, 0, 17, 24, 11, 1, false, "Nasce na água e ignora casas alagadas.", ["amphibious"], "aquatic", ["#3f8a9a", "#14323c", "#7fe6ff"]],
  ["profundezas", "Zumbi das Profundezas", "resistente", 4, 480, 180, 11, 30, 13, 1.15, false, "Couraça de lodo; surge pelas casas de água.", ["amphibious", "armored", "rear"], "aquatic", ["#2a5a70", "#0d2430", "#4fd8b0"]],
  ["ninja", "Zumbi Ninja", "rapido", 3, 190, 0, 34, 20, 21, 1, false, "Camuflado até chegar perto; muda de linha.", ["camouflage", "dash", "root"], "humanoid", ["#3a3450", "#141020", "#ff7ae0"]],
  ["sombras", "Zumbi das Sombras", "especial", 3, 260, 0, 15, 26, 23, 1, false, "Quase invisível nas casas de sombra.", ["camouflage", "slowImmune"], "spectral", ["#4a3a68", "#160d28", "#b98bff"]],
  ["raizes", "Zumbi das Raízes", "especial", 3, 300, 0, 13, 28, 25, 1.1, false, "Entra por trás quando as raízes crescem.", ["rear", "root"], "fungal", ["#5a6a3a", "#222c14", "#9be37a"]],
  ["mutante", "Zumbi Mutante", "elite", 5, 520, 0, 15, 28, 27, 1.15, false, "Ao perder metade da vida, muda de comportamento e acelera.", ["mutant"], "beast", ["#7a4a8a", "#2c1438", "#ff7ae0"]],
  ["areias", "Zumbi das Areias", "resistente", 3, 340, 160, 18, 24, 31, 1, false, "Placas de areia endurecida; resiste ao calor.", ["armored", "heatAura"], "armored", ["#a8844a", "#4a3418", "#ffd45a"]],
  ["vulcanico", "Zumbi Vulcânico", "especial", 4, 380, 0, 14, 30, 33, 1.1, false, "Aura de calor que fere plantas próximas.", ["heatAura"], "colossal", ["#8a3a24", "#301008", "#ff7a3a"]],
  ["radioativo", "Zumbi Radioativo", "elite", 5, 460, 120, 13, 26, 35, 1.15, false, "Irradia e enfraquece defensores ao redor.", ["radioactive", "weakenAura"], "spectral", ["#7a9a3a", "#243010", "#d4ff5a"]],
  ["blindado_elite", "Titã Blindado", "elite", 9, 900, 900, 7, 55, 37, 1.2, false, "Blindagem pesada e esmagamento de muralhas.", ["armored", "demolish"], "armored", ["#8a8a92", "#2a2a30", "#9fe6ff"]],
  ["portais_senhor", "Senhor dos Portais", "elite", 6, 520, 0, 12, 26, 41, 1.2, false, "Abre portais e traz reforços para outras linhas.", ["summon", "root", "boss"], "spectral", ["#6a3a9a", "#1c0c30", "#c07bff"]],
  ["general", "General dos Mortos", "elite", 7, 700, 200, 10, 40, 43, 1.25, false, "Protege aliados próximos com aura de comando.", ["shieldAura", "summon"], "armored", ["#5a4a6a", "#201828", "#ff9a52"]],
  ["colossal", "Zumbi Colossal", "elite", 10, 2200, 0, 6, 85, 45, 1.35, false, "Passos que fazem o tabuleiro tremer.", ["demolish", "armored"], "colossal", ["#6a5a4a", "#241a14", "#ffb347"]],
  ["devorador", "Devorador de Plantas", "elite", 5, 620, 0, 16, 45, 47, 1.2, false, "Consome um defensor inteiro de uma vez.", ["demolish", "vampire"], "beast", ["#8a3a4a", "#2c1018", "#ff6b7a"]],
  ["escavador", "Zumbi Escavador", "especial", 3, 250, 0, 17, 24, 11, 1, false, "Escava sob o terreno e reaparece atrás das linhas.", ["burrow", "rear"], "beast", ["#6a5038", "#241a10", "#d8b878"]],
  ["vampiro", "Zumbi Vampiro", "especial", 4, 340, 0, 18, 26, 22, 1, false, "Recupera vida ao morder defensores.", ["vampire"], "humanoid", ["#6a2a4a", "#240a18", "#ff4d7a"]],
  ["magico", "Zumbi Mágico", "suporte", 5, 340, 0, 12, 18, 24, 1.1, false, "Altera temporariamente as condições do tabuleiro.", ["weakenAura", "root"], "spectral", ["#4a3a8a", "#160e38", "#c07bff"]],
  ["invocador", "Zumbi Invocador", "suporte", 5, 380, 0, 11, 20, 26, 1.05, false, "Chama reforços periodicamente.", ["summon"], "fungal", ["#3a6a5a", "#102820", "#5fe08a"]],
  ["congelante", "Zumbi Congelante", "especial", 4, 360, 0, 13, 22, 28, 1, false, "Aura fria reduz a cadência de tiro das plantas próximas.", ["freezeAura", "slowImmune"], "spectral", ["#6a8ab0", "#1c3040", "#9fe6ff"]],
  ["parasita", "Zumbi Parasita", "suporte", 4, 300, 0, 16, 18, 29, 1, false, "Enfraquece defensores próximos progressivamente.", ["weakenAura"], "insect", ["#6a8a3a", "#203010", "#d4ff5a"]],
  ["fantasma", "Zumbi Fantasma", "especial", 4, 280, 0, 16, 22, 30, 1, false, "Atravessa muralhas e recebe menos dano de projéteis.", ["ghost"], "spectral", ["#a9c7e6", "#4a5d7d", "#ffffff"]],
  ["magnetico", "Zumbi Magnético", "especial", 4, 340, 0, 13, 22, 34, 1, false, "Desativa plantas elétricas próximas.", ["magnet"], "armored", ["#6a6a8a", "#22223a", "#9fe6ff"]],
  ["arqueiro", "Zumbi Arqueiro", "especial", 3, 260, 0, 13, 20, 18, 1, false, "Ataca defensores à distância.", ["ranged"], "humanoid", ["#6a5a4a", "#241c14", "#ff9a52"]],
  ["demolidor", "Zumbi Demolidor", "resistente", 5, 500, 200, 12, 50, 32, 1.15, false, "Dano dobrado contra muralhas e barreiras.", ["demolish", "armored"], "colossal", ["#7a4a3a", "#28140c", "#ff6a2a"]],
  ["escudeiro_aura", "Zumbi Escudeiro", "suporte", 4, 300, 150, 12, 18, 19, 1.05, false, "Protege inimigos próximos com um escudo shared.", ["shieldAura", "armored"], "armored", ["#7a7060", "#28241c", "#ffd45a"]],
  ["tempestade", "Zumbi da Tempestade", "rapido", 4, 280, 0, 26, 24, 36, 1, false, "Dispara em rajadas curtas com aviso de raio.", ["dash", "camouflage"], "spectral", ["#4a5a8a", "#161c38", "#9fe6ff"]],
  ["venenoso", "Zumbi Venenoso", "especial", 4, 330, 0, 14, 22, 14, 1, false, "Nuvem tóxica fere plantas próximas.", ["poisonAura"], "fungal", ["#5a8a3a", "#1c3010", "#a3ff5a"]],
  ["congelado", "Zumbi Congelado", "resistente", 3, 400, 100, 10, 26, 20, 1.05, false, "Imune a gelo e a lentidão.", ["slowImmune", "armored"], "armored", ["#7fa8c0", "#244050", "#d8f6ff"]],
  ["cavaleiro_ossos", "Cavaleiro de Ossos", "elite", 6, 640, 240, 18, 38, 39, 1.2, false, "Carga rápida que rompe a primeira linha.", ["dash", "armored", "demolish"], "armored", ["#cfc8b0", "#3a3428", "#ff9a52"]],
  // ── Chefes dos cinco mundos ────────────────────────────────────────
  ["guardiao_apodrecido", "Guardião Apodrecido", "chefe", 0, 4200, 300, 6, 70, 10, 1.4, false, "CHEFE DO VALE · Raízes que bloqueiam casas e esporos que curam aliados.", ["boss", "summon", "root"], "boss", ["#5a6a3a", "#1c2410", "#a3ff5a"], { thresholds: [0.7, 0.4, 0.18], summons: ["jardineiro", "estilhaco"], aura: "#7be05a", enrageAt: 0.4 }],
  ["rei_lodo", "Rei do Lodo", "chefe", 0, 5600, 400, 7, 75, 20, 1.5, false, "CHEFE DO PÂNTANO · Inunda casas e invoca anfíbios em três etapas.", ["boss", "summon", "amphibious"], "boss", ["#3a6a58", "#102820", "#4fd8b0"], { thresholds: [0.7, 0.4, 0.2], summons: ["aquatico", "profundezas"], aura: "#4fd8b0", enrageAt: 0.4 }],
  ["tita_raizes", "Titã das Raízes", "chefe", 0, 7200, 600, 6, 85, 30, 1.55, false, "CHEFE DA FLORESTA · Raízes crescem, inimigos entram por trás, muda de linha.", ["boss", "summon", "root", "rear"], "boss", ["#4a3a68", "#160d28", "#b98bff"], { thresholds: [0.72, 0.45, 0.2], summons: ["raizes", "ninja"], aura: "#b98bff", enrageAt: 0.45 }],
  ["colosso_cinzas", "Colosso das Cinzas", "chefe", 0, 9000, 1000, 5, 95, 40, 1.6, false, "CHEFE DO DESERTO · Armadura em camadas, tempestades e lava.", ["boss", "summon", "armored", "heatAura"], "boss", ["#8a4a28", "#2a1008", "#ffb347"], { thresholds: [0.75, 0.5, 0.25], summons: ["areias", "blindado_elite"], aura: "#ffb347", enrageAt: 0.5 }],
  ["devorador_mundos", "Devorador dos Mundos", "chefe", 0, 12000, 0, 6, 110, 50, 1.7, false, "EVENTO FINAL · 4 etapas, portais, guardas coordenados e inversão de rotas.", ["boss", "summon", "root", "radioactive", "shieldAura"], "boss", ["#4a1d68", "#0a0412", "#ff7ae0"], { thresholds: [0.8, 0.6, 0.4, 0.2], summons: ["jardineiro", "estilhaco"], aura: "#ff7ae0", enrageAt: 0.4 }],
];
const normalized = (t: string): EnemyTrait => t as EnemyTrait;

const EXPANSION: EnemyDef[] = NEW.map((r) => ({
  id: r[0], name: r[1], kind: r[2], cost: r[3], hp: r[4], armor: r[5], speed: r[6], dps: r[7], intro: r[8], scale: r[9], flying: r[10],
  power: r[11], traits: r[12].map(normalized), form: r[13], colors: r[14],
}));
// especificações de chefe (thresholds / summons / aura) para os 5 chefes de mundo
const BOSS_SPECS: Record<string, BossSpec> = {
  guardiao_apodrecido: { thresholds: [0.7, 0.4, 0.18], summons: ["jardineiro", "estilhaco"], aura: "#7be05a", enrageAt: 0.4 },
  rei_lodo: { thresholds: [0.7, 0.4, 0.2], summons: ["aquatico", "profundezas"], aura: "#4fd8b0", enrageAt: 0.4 },
  tita_raizes: { thresholds: [0.72, 0.45, 0.2], summons: ["raizes", "ninja"], aura: "#b98bff", enrageAt: 0.45 },
  colosso_cinzas: { thresholds: [0.75, 0.5, 0.25], summons: ["areias", "blindado_elite"], aura: "#ffb347", enrageAt: 0.5 },
  devorador_mundos: { thresholds: [0.8, 0.6, 0.4, 0.2], summons: ["jardineiro", "estilhaco"], aura: "#ff7ae0", enrageAt: 0.4 },
};
EXPANSION.forEach((e) => { if (BOSS_SPECS[e.id]) e.boss = BOSS_SPECS[e.id]; });

export const ENEMIES: EnemyDef[] = [...ORIGINAL, ...EXPANSION];
export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e])) as Record<EnemyId, EnemyDef>;
export const ENEMY_IDS = ENEMIES.map((e) => e.id);
export const REGULAR_ENEMIES = ENEMIES.filter((e) => e.kind !== "chefe");
export const ENEMY_COUNT = ENEMIES.length;
export const WORLD_BOSSES = ["guardiao_apodrecido", "rei_lodo", "tita_raizes", "colosso_cinzas", "devorador_mundos"];
