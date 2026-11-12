/* Expansão 3.0 — sistemas novos ligados ao motor existente por ganchos pequenos. */
import { DEF_BY_ID, isAquatic, isHeatSafe, type DefId } from "../data/defenders";
import { ENEMIES, ENEMY_BY_ID, REGULAR_ENEMIES } from "../data/enemies";
import { COMBOS, comboFor } from "../data/combos";
import { EVENT_INFO, EVENT_WARN, boardFor, eventsFor, type EventKind, type TerrainKind } from "../data/worlds";
import { BIOMES } from "../data/levels";
import { roleOf } from "../data/roles";
import { threatBudget } from "../data/rules";
import { COLS, CW, GX, GY, W, cellX, cellY, clamp } from "./geometry";
import type { GardenEngine, Plant, Enemy, Proj, Snap } from "./engine";
import type { Hud, RoleId } from "./types";

const ORIGINAL_DEF = new Set(["luminia", "ambar", "espinheiro", "gelidea", "orquidea", "morteiro", "cipo", "cardo", "tronco", "musgo", "magma", "sino", "vazio"]);
const ORIGINAL_ENEMY = new Set(["cinzento", "escudeiro", "estilhaco", "mariposa", "sapo", "gafanhoto", "xama", "colosso", "verme", "bulbo", "ceifeira", "rainha", "titan", "murchar"]);

export const keyOf = (col: number, row: number) => `${col}:${row}`;
export const terrainAt = (e: GardenEngine, col: number, row: number): TerrainKind | undefined => e.terrain.get(keyOf(col, row));
export const plantAt = (e: GardenEngine, col: number, row: number) => e.plants.find((p) => p.col === col && p.row === row);
export const roleOfSeat = (e: GardenEngine, seat: number): RoleId => e.roles[seat] ?? roleOf(undefined, seat);

/* --------------------------------- SETUP --------------------------------- */
export function initExpansion(e: GardenEngine) {
  e.board = boardFor(e.cfg.level, e.cfg.seed);
  e.terrain = new Map(e.board.cells.map((c) => [keyOf(c.col, c.row), c.kind] as [string, TerrainKind]));
  e.levelEvents = eventsFor(e.cfg.level, e.cfg.seed);
  e.activeEvents = [];
  e.warnEvent = null;
  e.eventIdx = 0;
  e.warnedIdx = 0;
  e.growthActive = false;
  e.comboLinks = [];
  e.comboNames = [];
  e.bossPhase = 0;
  e.bossAura = "";
  e.finalWin = false;
  e.supremeUsed = false;
  e.lastPlanter = -1;
  e.lastPlantAt = -99;
  e.invertUntil = e.sandUntil = e.heatUntil = e.nightUntil = e.fogUntil = e.rainUntil = e.eclipseUntil = 0;
  e.roles = e.cfg.seats.map((s, i) => roleOf(s.role, i));
  e.sun += e.level.startBonus;
  recomputeCombos(e);
}

export function blockedByTerrain(e: GardenEngine, col: number, row: number, id?: DefId): boolean {
  const k = terrainAt(e, col, row);
  if (!k) return false;
  if (k === "rock") return true;
  if (k === "water") return id ? !isAquatic(id) : true;
  if (k === "lava") return id ? !isHeatSafe(id) : true;
  if (k === "growth") return e.growthActive;
  if (k === "bridge") return bridgeOpen(e);
  return false;
}

export function bridgeOpen(e: GardenEngine) {
  const p = e.board.bridgePeriod;
  return p > 0 && e.time % (p * 2) >= p;
}

/* --------------------------------- ONDAS --------------------------------- */
export function buildQueue(e: GardenEngine): boolean {
  const L = e.cfg.level;
  const rows = e.activeRows.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  const pickRow = () => rows[Math.floor(e.rng() * rows.length)];
  if (L === 0) {
    e.waves = 1;
    e.waveStarts = [0];
    e.queue = [4, 24, 44].map((t) => ({ t, type: "cinzento", row: 2 }));
    e.total = 3;
    return true;
  }
  const kind = e.level.waveKind;
  const budget = Math.round(threatBudget(L, e.seats.length) * (e.mods.has("enxame") ? 1.25 : 1) * (kind === "massive" ? 1.25 : 1));
  const waves = Math.max(2, e.level.waves);
  e.waves = waves;
  const ws = Array.from({ length: waves }, (_, i) => 1 + 0.35 * i);
  const sum = ws.reduce((a, b) => a + b, 0);
  const elig = REGULAR_ENEMIES.filter((z) => z.intro <= L);
  const emph = new Set<string>([...e.level.emphasis, ...e.cfg.emphasis]);
  const weight = (z: (typeof elig)[number]) =>
    (1 / Math.pow(Math.max(1, z.cost), 0.7)) * (emph.has(z.id) ? 2.6 : 1) * (L - z.intro < 4 ? 1.4 : 1) * (e.mods.has("enxame") && z.cost <= 2 ? 1.7 : 1);
  const portals = e.board.portals.length ? e.board.portals : [];
  const q: { t: number; type: string; row: number; x?: number }[] = [];
  e.waveStarts = [];
  const roll = () => {
    const list = elig.length ? elig : [ENEMIES[0]];
    const wts = list.map(weight);
    let r = e.rng() * wts.reduce((a, b) => a + b, 0);
    for (let k = 0; k < list.length; k++) {
      r -= wts[k];
      if (r <= 0) return list[k];
    }
    return list[0];
  };
  for (let i = 0; i < waves; i++) {
    let pts = Math.max(1, Math.round((budget * ws[i]) / sum));
    const start = 14 + i * 30;
    const span = kind === "massive" || kind === "coordinated" ? 10 : i === waves - 1 ? 22 : 18;
    e.waveStarts.push(start);
    while (pts > 0) {
      const z = roll();
      pts -= Math.max(1, z.cost);
      const t = start + e.rng() * span;
      let x: number | undefined;
      if (portals.length && (L > 40 || e.mods.has("portais")) && e.rng() < 0.28) {
        const p = portals[Math.floor(e.rng() * portals.length)];
        x = cellX(p.col);
        q.push({ t, type: z.id, row: p.row, x });
      } else if ((kind === "ambush" || z.traits.includes("rear")) && e.rng() < 0.25) {
        q.push({ t, type: z.id, row: pickRow(), x: GX + 2.4 * CW });
      } else q.push({ t, type: z.id, row: pickRow() });
    }
    // Esquadrões coordenados: mesmo instante, linhas diferentes, combinação de papéis
    if (i % 2 === 1 && L >= 6) {
      const t = start + 6 + e.rng() * 6;
      const squad = Math.floor(e.rng() * 3);
      if (squad === 0) {
        const r = pickRow();
        q.push({ t, type: "escudeiro_aura", row: r }, { t, type: "jardineiro", row: r + (r < 4 ? 1 : -1) }, { t, type: "jardineiro", row: r });
      } else if (squad === 1) {
        for (let k = 0; k < 3; k++) q.push({ t, type: "estilhaco", row: rows[k % rows.length] });
      } else {
        const r = pickRow();
        q.push({ t, type: "invocador", row: r }, { t, type: "escudeiro", row: r + (r < 4 ? 1 : -1) });
      }
    }
    if (kind === "elite" && i === waves - 1) q.push({ t: start + 8, type: "cavaleiro_ossos", row: pickRow() });
  }
  if (e.level.boss) {
    const t = e.waveStarts[waves - 1] + 4;
    q.push({ t, type: e.level.boss, row: rows.includes(2) ? 2 : rows[0] });
    if (e.level.boss === "devorador_mundos") {
      // Guardas do chefe final: exigem coordenação (linhas diferentes)
      q.push({ t: t + 2, type: "general", row: 0 }, { t: t + 2, type: "portais_senhor", row: 4 }, { t: t + 12, type: "colossal", row: 2 });
    }
  }
  q.sort((a, b) => a.t - b.t);
  e.queue = q;
  e.total = Math.max(1, q.length);
  return true;
}

export interface EnemyExtra {
  traits: string[]; charmedT: number; burnT: number; poisonT: number; dmgAccum: number;
  lastOwner: number; phaseT: number; shieldT: number; burrowed: boolean; jumped: boolean;
}
export function extraEnemyFields(_e: GardenEngine, type: string): EnemyExtra {
  const def = ENEMY_BY_ID[type];
  return {
    traits: def?.traits ?? [],
    charmedT: 0,
    burnT: 0,
    poisonT: 0,
    dmgAccum: 0,
    lastOwner: -1,
    phaseT: 0,
    shieldT: 0,
    burrowed: (def?.traits ?? []).includes("burrow"),
    jumped: false,
  };
}

/* ------------------------------- COMBINAÇÕES ------------------------------- */
export function recomputeCombos(e: GardenEngine) {
  const before = e.comboLinks.length;
  e.plants.forEach((p) => (p.combo = ""));
  const links: number[][] = [];
  const names: string[] = [];
  for (let i = 0; i < e.plants.length; i++) {
    for (let j = i + 1; j < e.plants.length; j++) {
      const a = e.plants[i], b = e.plants[j];
      if (Math.abs(a.col - b.col) + Math.abs(a.row - b.row) > 1) continue;
      const da = DEF_BY_ID[a.type], db = DEF_BY_ID[b.type];
      if (!da || !db) continue;
      const rule = comboFor(da.tags, db.tags);
      if (!rule) continue;
      a.combo = rule.effect;
      b.combo = rule.effect;
      links.push([cellX(a.col), cellY(a.row), cellX(b.col), cellY(b.row), COMBOS.indexOf(rule)]);
      if (!names.includes(rule.name)) names.push(rule.name);
    }
  }
  e.comboLinks = links;
  e.comboNames = names;
  if (links.length > before) {
    e.stats.combos = Math.min(99, e.stats.combos + (links.length - before));
    for (const l of links.slice(before)) e.addFx({ k: "ring", x: (l[0] + l[2]) / 2, y: (l[1] + l[3]) / 2, ttl: 0.8, a: 56, col: COMBOS[l[4]].color });
    e.snd("zap");
  }
}

/* --------------------------------- EVENTOS --------------------------------- */
export function expansionUpdate(e: GardenEngine, dt: number) {
  e.growthActive = e.time > e.board.growAt && e.time < e.board.growAt + 22;
  // avisos e ativação
  while (e.warnedIdx < e.levelEvents.length && e.levelEvents[e.warnedIdx].t - EVENT_WARN <= e.time) {
    const ev = e.levelEvents[e.warnedIdx++];
    e.warnEvent = { kind: ev.kind, t: ev.t, row: ev.row ?? 0, col: ev.col ?? 4 };
  }
  while (e.eventIdx < e.levelEvents.length && e.levelEvents[e.eventIdx].t <= e.time) {
    const ev = e.levelEvents[e.eventIdx++];
    activateEvent(e, ev.kind, ev.dur, ev.row ?? 0, ev.col ?? 4);
  }
  e.activeEvents = e.activeEvents.filter((a) => a.until > e.time);
  if (e.warnEvent && e.time > e.warnEvent.t + 0.5) e.warnEvent = null;

  // Anti-impasse ("murchar do tempo"): finda a última onda, quem sobra definha
  // e continua avançando. Nunca torna uma fase impossível e nunca trava a partida.
  const lastStart = e.waveStarts[e.waves - 1] ?? 0;
  const late = e.waveIdx >= e.waves && e.queue.length === 0 && e.cfg.level > 0 ? Math.max(0, e.time - (lastStart + 75)) : 0;
  if (late > 0) {
    const decay = (0.004 + Math.min(0.035, late / 900)) * dt;
    for (const z of e.enemies) {
      hitEnemy(e, z, z.maxHp * decay, -1, "void");
      if (z.attacking) z.x -= z.speed * dt * 0.8;
    }
  }
  // ambiente contínuo
  for (const p of e.plants) {
    const k = terrainAt(e, p.col, p.row);
    if (k === "lava" && !isHeatSafe(p.type)) p.hp -= 5 * dt;
    if (e.heatUntil > e.time && !isHeatSafe(p.type) && !(DEF_BY_ID[p.type]?.tags ?? []).includes("fire")) p.hp -= 3 * dt;
    if (p.combo === "warmth" && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 4 * dt);
    if (p.combo === "guard" && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 1 * dt);
  }
  for (const z of e.enemies) {
    if (z.burnT > e.time) hitEnemy(e, z, 10 * dt, z.lastOwner, "burn");
    if (z.poisonT > e.time) hitEnemy(e, z, 7 * dt, z.lastOwner, "poison");
    if (z.charmedT > e.time) {
      z.x += z.speed * dt;
      for (const o of e.enemies) if (o !== z && Math.abs(o.x - z.x) < 40) hitEnemy(e, o, 18 * dt, z.lastOwner, "melee");
    }
  }
  // chefes: etapas e fúria
  for (const z of e.enemies) {
    const spec = ENEMY_BY_ID[z.type]?.boss;
    if (!spec) continue;
    const f = z.hp / z.maxHp;
    e.bossPhase = z.phase;
    e.bossAura = spec.aura;
    if (z.phase < spec.thresholds.length && f <= spec.thresholds[z.phase]) {
      z.phase++;
      e.bossPhase = z.phase;
      e.banner = `ETAPA ${z.phase + 1} · ${ENEMY_BY_ID[z.type].name.toUpperCase()}`;
      e.bannerT = 3;
      e.shake = Math.max(e.shake, 1.2);
      e.snd("boss");
      e.addFx({ k: "ring", x: z.x, y: cellY(z.row), ttl: 1, a: 260, col: spec.aura });
      const rows = e.activeRows.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      spec.summons.forEach((s, i) => e.spawnEnemy(s, rows[(i + z.phase) % rows.length], Math.min(W + 20, z.x + 40)));
    }
    if (!z.enrage && f <= spec.enrageAt) {
      z.enrage = true;
      e.banner = "O CHEFE ENFURECEU!";
      e.bannerT = 2.5;
      e.snd("boss");
    }
  }
  // Guardiã Suprema: uma vez por partida, restaura as Runas de Guarda
  if (!e.supremeUsed && e.plants.some((p) => DEF_BY_ID[p.type]?.ability === "supreme") && e.guards.every((g) => g.state === 2)) {
    e.supremeUsed = true;
    e.guards.forEach((g) => { g.state = e.activeRows[g.row] ? 0 : 2; g.hit = false; g.x = GX - 52; });
    e.banner = "GUARDIÃ SUPREMA · RUNAS RESTAURADAS";
    e.bannerT = 3;
    e.snd("win");
  }
}

function activateEvent(e: GardenEngine, kind: EventKind, dur: number, row: number, col: number) {
  const info = EVENT_INFO[kind];
  const until = e.time + dur;
  e.activeEvents.push({ kind, until, row, col });
  e.stats.events++;
  e.banner = info.label.toUpperCase();
  e.bannerT = 2.4;
  e.snd(kind === "lightning" || kind === "surprise" ? "boom" : "wave");
  switch (kind) {
    case "rain": e.rainUntil = until; e.skyT = 0.5; break;
    case "sandstorm": e.sandUntil = until; break;
    case "night": e.nightUntil = until; break;
    case "fog": e.fogUntil = until; break;
    case "heat": e.heatUntil = until; break;
    case "eclipse": e.eclipseUntil = until; break;
    case "inversion": e.invertUntil = until; break;
    case "lightning": {
      const x = cellX(col), y = cellY(row);
      e.addFx({ k: "boom", x, y, ttl: 0.6, a: 110, col: "#ffe27a" });
      e.shake = Math.max(e.shake, 0.8);
      for (const p of e.plants) if (Math.abs(p.col - col) <= 1 && Math.abs(p.row - row) <= 1) damagePlant(e, p, 160);
      for (const z of e.enemies) if (z.row === row && Math.abs(z.x - x) < 130) { z.stunT = e.time + 1.5; hitEnemy(e, z, 120, -1, "bolt"); }
      break;
    }
    case "surprise": {
      const rows = e.activeRows.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      e.spawnEnemy("jardineiro", rows[row % rows.length], GX + 3.5 * CW);
      break;
    }
    case "portalSurge": {
      for (const p of e.board.portals.slice(0, 2)) e.spawnEnemy("jardineiro", p.row, cellX(p.col));
      break;
    }
  }
}

/* --------------------------------- DANO --------------------------------- */
export function hitEnemy(e: GardenEngine, z: Enemy, dmg: number, owner: number, kind = "proj") {
  if (owner >= 0) z.lastOwner = owner;
  e.hurtEnemy(z, dmg * expansionDamageFactor(e, z, kind), kind as never);
}

export function expansionDamageFactor(e: GardenEngine, z: Enemy, kind: string) {
  let f = 1;
  if (z.shieldT > e.time) f *= 0.72;
  if (z.traits.includes("ghost") && (kind === "proj" || kind === "splash")) f *= 0.6;
  if (z.traits.includes("slowImmune") && kind === "shard") f *= 1; // imune ao efeito, não ao dano
  if (z.type === "devorador_mundos" && e.enemies.some((o) => o.id !== z.id && (o.type === "general" || o.type === "portais_senhor"))) f *= 0.45;
  if (z.type === "murchar" && kind === "explode") f *= 0.5;
  return f;
}

export function damagePlant(e: GardenEngine, p: Plant, dmg: number, z?: Enemy) {
  let d = dmg;
  if (p.combo === "guard") d *= 0.8;
  if (e.plants.some((q) => DEF_BY_ID[q.type]?.ability === "supreme")) d *= 0.75;
  if (e.plants.some((q) => DEF_BY_ID[q.type]?.ability === "shield" && Math.abs(q.col - p.col) <= 1 && Math.abs(q.row - p.row) <= 1)) d *= 0.65;
  p.hp -= d;
  p.flash = 0.3;
  if (z && DEF_BY_ID[p.type]?.ability === "thorns") hitEnemy(e, z, p.dmg * 0.9, p.owner, "melee");
}

export function expansionDeath(e: GardenEngine, z: Enemy) {
  if (z.lastOwner >= 0 && e.stats.bySeat[z.lastOwner] !== undefined) e.stats.bySeat[z.lastOwner]++;
  if (ENEMY_BY_ID[z.type]?.kind === "chefe") {
    e.banner = "CHEFE DERROTADO!";
    e.bannerT = 4;
    e.shake = Math.max(e.shake, 1.4);
    for (let i = 0; i < 5; i++) e.addFx({ k: "boom", x: z.x + (i - 2) * 30, y: cellY(z.row) + (i % 2) * 20, ttl: 0.8 + i * 0.1, a: 130 });
    e.snd("win");
    if (z.type === "devorador_mundos") e.finalWin = true;
  }
}

export function expansionFinish(e: GardenEngine, win: boolean) {
  e.finalWin = win && e.cfg.level === 50;
}

/* --------------------------------- PLANTAS --------------------------------- */
const cd = (_e: GardenEngine, p: Plant) => Math.max(0, p.timer);
const hasCombo = (e: GardenEngine, p: Plant, effect: string) => p.combo === effect || (roleOfSeat(e, p.owner) === "tatico" && p.combo !== "");
const mult = (e: GardenEngine, p: Plant) => {
  const crystal = terrainAt(e, p.col, p.row) === "crystal" ? 1.2 : 1;
  const role = roleOfSeat(e, p.owner);
  const r = role === "atirador" ? 1.15 : 1;
  return crystal * r * (p.lv >= 3 ? 1.25 : 1) * (hasCombo(e, p, "poisonPierce") ? 1.1 : 1);
};
function addSeiva(e: GardenEngine, amount: number, isSun = false) {
  const v = Math.round(amount);
  e.sun += v;
  e.stats.seivaCollected += v;
  if (!isSun) e.addFx({ k: "text", x: GX + 120, y: 40, ttl: 1, text: `+${v} ✦`, col: "#ffe27a" });
}
function shoot(e: GardenEngine, p: Plant, mode: string, dmg: number, row = p.row, look: Proj["kind"] = "dart") {
  const x = cellX(p.col) + 28;
  e.projs.push({ kind: look, x, y: cellY(row) - 12, row, vx: 420, dmg: Math.round(dmg * mult(e, p)), x0: x, y0: cellY(row) - 12, tx: 0, t: 0, dur: 0, owner: p.owner, mode, hit: [], back: false, life: 0 });
  e.snd("dart");
}
function lob(e: GardenEngine, p: Plant, mode: string, dmg: number, tx: number) {
  const x = cellX(p.col), y = cellY(p.row) - 28;
  e.projs.push({ kind: "lob", x, y, row: p.row, vx: 0, dmg: Math.round(dmg * mult(e, p)), x0: x + 12, y0: y, tx, t: 0, dur: mode === "meteor" ? 1.1 : 0.9, owner: p.owner, mode, hit: [], back: false, life: 0 });
  e.snd("dart");
}
function near(e: GardenEngine, p: Plant, maxX: number, air = true, span = 0) {
  return e.enemies.filter((z) => !z.burrowed && z.jumpT <= 0 && Math.abs(z.row - p.row) <= span && z.x > cellX(p.col) - 20 && z.x < maxX && (air || !ENEMY_BY_ID[z.type].flying) && z.charmedT <= e.time);
}
function aoe(e: GardenEngine, x: number, y: number, radius: number, dmg: number, owner: number, opts: { slow?: boolean; burn?: boolean; poison?: boolean; fx?: string } = {}) {
  for (const z of e.enemies) {
    if (z.burrowed || Math.hypot(z.x - x, cellY(z.row) - y) > radius) continue;
    hitEnemy(e, z, dmg, owner, "explode");
    if (opts.slow) z.slowT = e.time + 3;
    if (opts.burn) z.burnT = e.time + 4;
    if (opts.poison) z.poisonT = e.time + 5;
  }
  e.addFx({ k: "boom", x, y, ttl: 0.55, a: radius, col: opts.fx ?? "#ffb347" });
  e.snd("boom");
}

export function expansionAbility(e: GardenEngine, p: Plant, dt: number, x: number, y: number): boolean {
  const def = DEF_BY_ID[p.type];
  if (!def || ORIGINAL_DEF.has(p.type)) return false;
  const ab = def.ability;
  const interval = p.interval || 1;
  const eventActive = e.activeEvents.length > 0;
  p.timer = cd(e, p) - dt;
  p.charge = 0;
  if (ab === "wall" || ab === "shield" || ab === "thorns" || ab === "supreme" || ab === "ghost") {
    // passivas / tratadas em outros pontos; ghost ainda ataca
    if (ab !== "ghost") return true;
  }
  const ready = p.timer <= 0;
  const enemies = near(e, p, x + Math.max(2, def.range) * CW, def.air, ab === "cosmic" ? 4 : 0);
  p.charge = enemies.length ? clamp(1 - p.timer / interval, 0, 1) : 0;

  if (!ready) return true;
  const reset = () => { p.timer = interval; };
  switch (ab) {
    case "solarSmall": reset(); e.spawnSun(x, y - 20, p.dmg * (roleOfSeat(e, p.owner) === "agricultor" ? 1.2 : 1) * (p.combo === "energy" ? 1.25 : 1)); break;
    case "eclipse": case "lunar": {
      reset();
      const boost = (ab === "lunar" && (e.nightUntil > e.time || e.eclipseUntil > e.time)) || (ab === "eclipse" && (e.eclipseUntil > e.time || eventActive)) ? 3 : 1;
      e.spawnSun(x, y - 20, p.dmg * boost * (p.combo === "energy" ? 1.25 : 1));
      break;
    }
    case "burst": reset(); for (let i = 0; i < 3; i++) e.spawnSun(x + (i - 1) * 22, y - 20 - i * 10, p.dmg); break;
    case "store": {
      reset();
      p.stored += p.dmg;
      p.charge = clamp(p.stored / 140, 0, 1);
      if (p.stored >= 140) { e.spawnSun(x, y - 24, p.stored); p.stored = 0; e.snd("sun"); }
      break;
    }
    case "collective": {
      reset();
      addSeiva(e, p.dmg * (roleOfSeat(e, p.owner) === "agricultor" ? 1.2 : 1));
      for (const q of e.plants) if (q !== p && DEF_BY_ID[q.type]?.cls === "gerador" && Math.abs(q.col - p.col) + Math.abs(q.row - p.row) <= 1) q.timer = Math.max(0, q.timer - 2.5);
      e.addFx({ k: "ring", x, y, ttl: 0.7, a: 70, col: "#7bdc6b" });
      break;
    }
    case "dart": case "freeze": case "pierce": case "sniper": case "fire": case "poison": case "vampire": case "boomerang": case "ghost": {
      if (!enemies.length) return true;
      reset();
      let dmg = p.dmg;
      if (ab === "ghost") dmg *= 1.6;
      if (ab === "sniper") dmg *= 2;
      if (p.lv >= 5) shoot(e, p, ab, dmg * 0.6, p.row, "shard");
      shoot(e, p, ab, dmg, p.row, ab === "freeze" ? "shard" : "dart");
      break;
    }
    case "triple": case "shards": {
      if (!enemies.length) return true;
      reset();
      for (const r of [p.row - 1, p.row, p.row + 1]) if (r >= 0 && r < 5 && e.activeRows[r]) shoot(e, p, ab, p.dmg * (ab === "shards" ? 0.8 : 1), r, ab === "shards" ? "shard" : "dart");
      break;
    }
    case "chain": {
      const hit = enemies.slice(0, 3 + (hasCombo(e, p, "chain") ? 2 : 0));
      if (!hit.length) return true;
      reset();
      const pts: number[][] = [[x, y - 16]];
      hit.forEach((z, i) => { hitEnemy(e, z, p.dmg * (i ? 0.7 : 1), p.owner, "bolt"); pts.push([z.x - 8, cellY(z.row) - 14]); });
      e.addFx({ k: "bolt", x, y, ttl: 0.3, pts });
      e.snd("zap");
      break;
    }
    case "lob": case "spore": case "bigboom": case "meteor": {
      if (!enemies.length) return true;
      reset();
      const z = ab === "meteor" ? enemies.reduce((a, b) => (b.x > a.x ? b : a)) : enemies[0];
      lob(e, p, ab, p.dmg, Math.max(x + CW, z.x - z.speed));
      break;
    }
    case "whip": case "spin": case "push": {
      const list = near(e, p, x + (ab === "spin" ? 1.6 : 2) * CW, false, ab === "spin" ? 1 : 0);
      if (!list.length) return true;
      reset();
      p.charge = 1;
      for (const z of list) {
        hitEnemy(e, z, p.dmg, p.owner, "melee");
        if (ab === "push") z.x = Math.min(W + 20, z.x + CW * 0.8);
      }
      e.addFx({ k: ab === "spin" ? "ring" : "slash", x: x + 10, y: y - 6, ttl: 0.3, a: 90, col: "#e0ff6a" });
      e.snd("whip");
      break;
    }
    case "heal": case "guardian": {
      reset();
      let any = false;
      for (const q of e.plants) {
        if (q === p || q.hp >= q.maxHp) continue;
        if (ab === "guardian" || Math.abs(q.col - p.col) <= 1 && Math.abs(q.row - p.row) <= 1) {
          q.hp = Math.min(q.maxHp, q.hp + p.dmg * (q.combo === "bloom" ? 1.3 : 1) * (roleOfSeat(e, p.owner) === "curandeiro" ? 1.3 : 1));
          any = true;
        }
      }
      if (any) e.addFx({ k: "ring", x, y, ttl: 0.7, a: ab === "guardian" ? 260 : 80, col: "#5fe08a" });
      break;
    }
    case "barrier": {
      reset();
      const col = p.col + 1;
      if (col < COLS && !e.isBlocked(col, p.row) && !plantAt(e, col, p.row)) {
        e.plants.push({ id: e.nid++, type: "muralha_madeira", col, row: p.row, hp: 400, maxHp: 400, timer: 10, state: 2, charge: 0, flash: 0, owner: p.owner, born: e.time, lv: 1, dmg: 0, interval: 0, spent: true, combo: "", slowT: 0, ghostT: 0, stored: 0 });
        e.addFx({ k: "ring", x: cellX(col), y, ttl: 0.6, a: 60, col: "#c9b0ff" });
        recomputeCombos(e);
      }
      break;
    }
    case "explode": case "void": case "stun": case "absoluteFreeze": case "timeSlow": case "magnet": case "cosmic": case "hypno": case "teleport": case "illusion": case "chaos": {
      reset();
      if (ab === "explode") { aoe(e, x, y, def.range * CW, p.dmg, p.owner, { slow: hasCombo(e, p, "freezeBoom"), fx: "#ff5a2a" }); p.hp = 0; p.spent = true; }
      else if (ab === "void") { for (const z of near(e, p, x + def.range * CW, true, 1)) { z.x = Math.max(GX, z.x - 20); hitEnemy(e, z, p.dmg, p.owner, "void"); } }
      else if (ab === "stun" || ab === "absoluteFreeze") { const span = ab === "absoluteFreeze" ? 2 : 1; for (const z of e.enemies) if (!z.burrowed && Math.abs(z.row - p.row) <= span) z.stunT = e.time + (ENEMY_BY_ID[z.type].kind === "chefe" ? 1.2 : ab === "absoluteFreeze" ? 1.6 : 2.5); e.addFx({ k: "ring", x, y, ttl: 0.7, a: 4 * CW, col: "#aab8ff" }); e.snd("bell"); }
      else if (ab === "timeSlow") { for (const z of near(e, p, x + def.range * CW, true, 1)) z.slowT = e.time + 3; e.addFx({ k: "ring", x, y, ttl: 0.8, a: def.range * CW, col: "#b98bff" }); e.snd("bell"); }
      else if (ab === "magnet") { for (const z of near(e, p, W, true)) z.armor = 0; e.addFx({ k: "ring", x, y, ttl: 0.6, a: 300, col: "#7fd8ff" }); e.snd("zap"); }
      else if (ab === "cosmic") { for (const z of e.enemies) if (!z.burrowed) hitEnemy(e, z, p.dmg, p.owner, "bolt"); e.addFx({ k: "ring", x: W / 2, y: GY + 200, ttl: 1, a: 600, col: "#ff7ae0" }); e.shake = Math.max(e.shake, 0.8); e.snd("zap"); }
      else if (ab === "hypno") { const z = near(e, p, x + def.range * CW, true).find((q) => ENEMY_BY_ID[q.type].kind !== "chefe"); if (z) { z.charmedT = e.time + 8; z.lastOwner = p.owner; e.addFx({ k: "ring", x: z.x, y: cellY(z.row), ttl: 0.8, a: 60, col: "#ff8fb1" }); e.snd("bell"); } }
      else if (ab === "teleport") { const threatened = e.plants.filter((q) => q.col >= 4 && q.hp < q.maxHp * 0.5 && !q.spent).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (threatened) { for (let c = 0; c < 3; c++) if (!e.isBlocked(c, threatened.row) && !plantAt(e, c, threatened.row)) { e.addFx({ k: "poof", x: cellX(threatened.col), y: cellY(threatened.row), ttl: 0.4, col: "#a98bff" }); threatened.col = c; e.addFx({ k: "poof", x: cellX(c), y: cellY(threatened.row), ttl: 0.4, col: "#a98bff" }); e.snd("ping"); recomputeCombos(e); break; } } e.snd("ping"); }
      else if (ab === "illusion") { if (!p.spent) { for (let r = p.row - 1; r <= p.row + 1; r++) if (r >= 0 && r < 5 && !e.isBlocked(p.col, r) && !plantAt(e, p.col, r)) { e.plants.push({ ...p, id: e.nid++, row: r, hp: 80, maxHp: 80, timer: interval, spent: true, state: 2, combo: "", born: e.time }); e.snd("plant"); recomputeCombos(e); break; } } }
      else if (ab === "chaos") { const n = Math.floor(e.rng() * 4); if (n === 0) addSeiva(e, 60); else if (n === 1) aoe(e, x + 2 * CW, y, 130, 90, p.owner, { fx: "#ff7ae0" }); else if (n === 2) { for (const z of e.enemies) z.slowT = e.time + 2; e.addFx({ k: "ring", x, y, ttl: 0.7, a: 300, col: "#9fe6ff" }); } else { for (const q of e.plants) q.hp = Math.min(q.maxHp, q.hp + 60); e.addFx({ k: "ring", x, y, ttl: 0.7, a: 300, col: "#5fe08a" }); } e.snd("bell"); }
      break;
    }
    default: return true;
  }
  return true;
}

/* -------------------------------- PROJÉTEIS -------------------------------- */
export function expansionProjTick(e: GardenEngine, p: Proj, dt: number): boolean | null {
  if (!p.mode) return null;
  p.life = (p.life ?? 0) + dt;
  if (p.life > 9) return false;
  const mode = p.mode;
  const isLob = mode === "lob" || mode === "spore" || mode === "bigboom" || mode === "meteor";
  if (isLob) {
    p.t += dt / p.dur;
    const k = Math.min(1, p.t);
    p.x = p.x0 + (p.tx - p.x0) * k;
    p.y = p.y0 + (cellY(p.row) - 10 - p.y0) * k - Math.sin(Math.PI * k) * 90;
    if (p.t >= 1) {
      const radius = mode === "bigboom" ? 2 * CW : mode === "meteor" ? 2.4 * CW : 100;
      const dmg = mode === "meteor" ? p.dmg * 2 : p.dmg;
      const owner = p.owner;
      for (const z of e.enemies) {
        if (z.burrowed || ENEMY_BY_ID[z.type].flying) continue;
        const dx = Math.abs(z.x - p.tx);
        if (dx > radius) continue;
        hitEnemy(e, z, dx < 48 ? dmg : dmg * 0.55, owner, "splash");
        if (mode === "spore") z.poisonT = e.time + 5;
        if (e.plants.some((q) => q.combo === "freezeBoom" && q.owner === owner)) z.slowT = e.time + 3;
      }
      e.addFx({ k: "boom", x: p.tx, y: cellY(p.row), ttl: 0.45, a: radius, col: mode === "meteor" ? "#ff6a2a" : "#9be37a" });
      e.snd("boom");
      return false;
    }
    return true;
  }
  // retorno do bumerangue
  if (mode === "boomerang" && !p.back && p.x > W - 30) { p.back = true; p.vx = -420; p.hit = []; }
  if (p.back && p.x < (p.x0 ?? 0) - 30) return false;
  p.x += p.vx * dt;
  const col = Math.floor((p.x - GX) / CW);
  if (col >= 0 && col < COLS && terrainAt(e, col, p.row) === "rock") {
    e.addFx({ k: "poof", x: p.x, y: p.y, ttl: 0.25, col: "#cfd6e0" });
    return false;
  }
  if (e.sandUntil > e.time && p.x > (p.x0 ?? 0) + 4 * CW) return false;
  const hitList = p.hit ?? (p.hit = []);
  const targets = e.enemies.filter((z) => z.row === p.row && !z.burrowed && z.jumpT <= 0 && z.charmedT <= e.time && !hitList.includes(z.id) && p.x > z.x - 20 && p.x < z.x + 16);
  for (const z of targets) {
    hitList.push(z.id);
    hitEnemy(e, z, p.dmg, p.owner, mode === "shards" ? "shard" : "proj");
    if (mode === "freeze" || mode === "shards" || p.kind === "shard") z.slowT = e.time + 3;
    if (mode === "fire") z.burnT = e.time + 4;
    if (mode === "poison" || mode === "spore" || e.plants.some((q) => q.combo === "poisonPierce" && q.owner === p.owner)) z.poisonT = e.time + 5;
    if (mode === "vampire") addSeiva(e, 5);
    if (mode === "sniper") z.stunT = e.time + 0.3;
    e.addFx({ k: "poof", x: p.x, y: p.y, ttl: 0.22, col: mode === "fire" ? "#ff8a2a" : mode === "poison" ? "#a3ff5a" : "#9be37a" });
    if (mode === "pierce") { if (hitList.length >= 4) return false; }
    else return false;
  }
  return p.x < W + 30 && p.x > -40;
}

/* -------------------------------- INIMIGOS -------------------------------- */
export function applyEnemyAuras(e: GardenEngine, z: Enemy, dt: number) {
  const tr = z.traits;
  if (!tr.length) return;
  if (tr.includes("shieldAura")) for (const o of e.enemies) if (o !== z && Math.abs(o.x - z.x) < 2 * CW) o.shieldT = e.time + 0.4;
  if (tr.includes("freezeAura") || tr.includes("magnet") || tr.includes("weakenAura") || tr.includes("poisonAura") || tr.includes("radioactive") || tr.includes("heatAura")) {
    for (const p of e.plants) {
      if (Math.abs(cellX(p.col) - z.x) > 1.6 * CW || Math.abs(p.row - z.row) > 1) continue;
      if (tr.includes("freezeAura") || (tr.includes("magnet") && (DEF_BY_ID[p.type]?.tags ?? []).includes("electric"))) p.slowT = e.time + 0.5;
      if (tr.includes("weakenAura") || tr.includes("radioactive")) p.hp -= 3 * dt;
      if (tr.includes("poisonAura")) p.hp -= 4 * dt;
      if (tr.includes("heatAura")) p.hp -= 5 * dt;
    }
  }
}

export function expansionEnemy(e: GardenEngine, z: Enemy, dt: number): boolean {
  if (ORIGINAL_ENEMY.has(z.type)) return false;
  const def = ENEMY_BY_ID[z.type];
  const tr = z.traits;
  z.hurt = Math.max(0, z.hurt - dt);
  z.attacking = false;
  if (z.stunT > e.time || z.charmedT > e.time) return true;
  z.walk += dt * (z.speed * 0.13 + 3);
  let spd = z.speed * (z.enrage ? 1.5 : 1);
  if (z.slowT > e.time && !tr.includes("slowImmune")) spd *= 0.5;
  if (tr.includes("mutant") && z.hp < z.maxHp * 0.5) spd *= 1.5;
  const lStart = e.waveStarts[e.waves - 1] ?? 0;
  const lateMove = e.waveIdx >= e.waves && e.queue.length === 0 ? Math.max(0, e.time - (lStart + 75)) : 0;
  if (lateMove > 0) spd *= 1 + Math.min(1.5, lateMove / 60);
  if (tr.includes("dash") && Math.sin(e.time * 2 + z.id) > 0.7) spd *= 1.7;
  const col = Math.floor((z.x - GX) / CW);
  const terrain = col >= 0 && col < COLS ? terrainAt(e, col, z.row) : undefined;
  if (terrain === "ice") spd *= 0.7;
  else if (terrain === "trail") spd *= 1.15;
  else if (terrain === "water" && !tr.includes("amphibious") && !def.flying) spd *= 0.75;
  if (e.invertUntil > e.time) { z.x += spd * dt; return true; }
  if (z.burrowed) {
    if (z.x < GX + 4.2 * CW) {
      z.burrowed = false;
      for (const p of e.plants) if (p.row === z.row && Math.abs(cellX(p.col) - z.x) < CW) damagePlant(e, p, 150);
      e.addFx({ k: "boom", x: z.x, y: cellY(z.row) + 10, ttl: 0.4, a: 70 });
    }
    z.x -= spd * dt;
    return true;
  }
  if (tr.includes("summon") || tr.includes("boss")) {
    z.phaseT -= dt;
    if (z.phaseT <= 0) {
      z.phaseT = tr.includes("boss") ? 9 : 8;
      const spec = def.boss;
      const kinds = spec?.summons ?? ["jardineiro"];
      const rows = e.activeRows.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      const k = kinds[Math.floor(e.rng() * kinds.length)];
      e.spawnEnemy(k, rows[Math.floor(e.rng() * rows.length)], Math.min(W + 20, z.x + 40));
      e.addFx({ k: "ring", x: z.x, y: cellY(z.row), ttl: 0.7, a: 100, col: spec?.aura ?? "#5fe08a" });
    }
  }
  if (def.flying) { z.x -= spd * dt; return true; }
  if (!tr.includes("ghost")) {
    const target = e.plants.find((p) => p.row === z.row && Math.abs(cellX(p.col) - (z.x - 16)) < 34 && DEF_BY_ID[p.type]?.ability !== "ghost");
    if (target) {
      z.attacking = true;
      let dmg = def.dps * dt * (tr.includes("demolish") && DEF_BY_ID[target.type]?.cls === "protecao" ? 3 : 1);
      if (tr.includes("vampire")) z.hp = Math.min(z.maxHp, z.hp + def.dps * dt * 0.8);
      if (z.type === "devorador") dmg *= 6;
      damagePlant(e, target, dmg, z);
      return true;
    }
    if (tr.includes("ranged")) {
      const far = e.plants.find((p) => p.row === z.row && cellX(p.col) < z.x - 30 && z.x - cellX(p.col) < 340);
      if (far) {
        z.attacking = true;
        z.timer -= dt;
        if (z.timer <= 0) {
          z.timer = 2.2;
          e.projs.push({ kind: "acid", x: z.x - 30, y: cellY(z.row) - 20, row: z.row, vx: -230, dmg: 28, x0: 0, y0: 0, tx: 0, t: 0, dur: 0, owner: -1 });
        }
        return true;
      }
    }
  }
  z.x -= spd * dt;
  return true;
}

/* --------------------------------- SNAPSHOT --------------------------------- */
export function expansionSnap(e: GardenEngine, s: Snap) {
  s.cm = e.comboLinks;
  s.ev = e.activeEvents.map((a) => [Object.keys(EVENT_INFO).indexOf(a.kind), Math.round(a.until * 10) / 10, a.row, a.col]);
  s.wn = e.warnEvent ? [Object.keys(EVENT_INFO).indexOf(e.warnEvent.kind), e.warnEvent.row, e.warnEvent.col] : [];
  s.bp = e.bossPhase;
  s.fw = e.finalWin ? 1 : 0;
}
export function expansionApplySnap(e: GardenEngine, s: Snap) {
  e.comboLinks = s.cm ?? [];
  e.comboNames = [...new Set((s.cm ?? []).map((l) => COMBOS[l[4]]?.name ?? ""))].filter(Boolean);
  e.activeEvents = (s.ev ?? []).map((a) => ({ kind: Object.keys(EVENT_INFO)[a[0]] as EventKind, until: a[1], row: a[2], col: a[3] }));
  e.warnEvent = s.wn?.length ? { kind: Object.keys(EVENT_INFO)[s.wn[0]] as EventKind, t: e.time, row: s.wn[1], col: s.wn[2] } : null;
  e.bossPhase = s.bp ?? 0;
  e.finalWin = !!s.fw;
}

export function expansionHud(e: GardenEngine): Partial<Hud> {
  const ev = e.activeEvents[0];
  const warn = e.warnEvent;
  const info = ev ? EVENT_INFO[ev.kind] : warn ? EVENT_INFO[warn.kind] : null;
  return {
    world: e.level.world,
    worldName: BIOMES[e.level.biome]?.name ?? "Jardim",
    event: info ? { label: info.label, color: info.color, icon: info.icon, warn: !ev } : null,
    combos: e.comboNames,
    bossPhase: e.bossPhase,
    role: roleOfSeat(e, e.mySeat),
  };
}


