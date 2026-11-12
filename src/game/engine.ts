import { DEF_BY_ID, DEF_IDS, defStats, type DefClass, type DefId } from "../data/defenders";
import { ENEMIES, ENEMY_BY_ID, ENEMY_IDS, type EnemyId } from "../data/enemies";
import { getLevel, objectiveEval, type LevelDef, type Mod } from "../data/levels";
import { playerHpMult, startSeiva, threatBudget } from "../data/rules";
import { CURSORS, type CursorKind } from "../art/cursors";
import { type BoardSpec, type EventKind, type LevelEvent, type TerrainKind } from "../data/worlds";
import { roleOf } from "../data/roles";
import { MAX_DEF_LEVEL } from "../data/defenders";
import type { RoleId } from "./types";
import { initExpansion, buildQueue, extraEnemyFields, blockedByTerrain, recomputeCombos, expansionUpdate, expansionAbility, applyEnemyAuras, expansionEnemy, expansionProjTick, hitEnemy, damagePlant, expansionDeath, expansionFinish, expansionSnap, expansionApplySnap, expansionHud, roleOfSeat } from "./expansion";
import { setFlat } from "../art/art";
import { CH, COLS, CW, GX, GY, H, ROWS, W, cellX, cellY, clamp, mulberry32 } from "./geometry";
import { drawScene } from "./render";
import type { ChatLine, Cmd, Hud, MatchCfg, MatchResult, MatchStats, SeatCfg } from "./types";

export type Quality = "low" | "medium" | "high";

export interface Plant {
  id: number;
  type: DefId;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  timer: number;
  state: 0 | 1 | 2; // 0 normal, 1 pavio aceso, 2 ativo (vórtice)
  charge: number;
  flash: number;
  owner: number;
  born: number;
  lv: number;
  dmg: number;
  interval: number;
  spent: boolean;
  combo: string;
  slowT: number;
  ghostT: number;
  stored: number;
}
export interface Enemy {
  id: number;
  type: EnemyId;
  x: number;
  rx: number;
  row: number;
  hp: number;
  maxHp: number;
  armor: number;
  armorMax: number;
  speed: number;
  slowT: number;
  stunT: number;
  walk: number;
  hurt: number;
  timer: number;
  timer2: number;
  jumpT: number;
  jumpFrom: number;
  jumped: boolean;
  ofs: number;
  attacking: boolean;
  burrowed: boolean;
  enrage: boolean;
  phase: number;
  traits: string[];
  charmedT: number;
  burnT: number;
  poisonT: number;
  dmgAccum: number;
  lastOwner: number;
  phaseT: number;
  shieldT: number;
}
export interface Proj {
  kind: "dart" | "shard" | "lob" | "acid";
  x: number;
  y: number;
  row: number;
  vx: number;
  dmg: number;
  x0: number;
  y0: number;
  tx: number;
  t: number;
  dur: number;
  owner: number;
  mode?: string;
  hit?: number[];
  back?: boolean;
  life?: number;
}
export interface Sun {
  id: number;
  x: number;
  y: number;
  ty: number;
  value: number;
  age: number;
  botAt: number;
}
export interface Fx {
  k: "boom" | "bolt" | "ring" | "text" | "poof" | "slash";
  x: number;
  y: number;
  t: number;
  ttl: number;
  a: number;
  row: number;
  pts: number[][];
  text: string;
  col: string;
}
export interface Guard {
  row: number;
  x: number;
  state: 0 | 1 | 2;
  hit: boolean;
}
interface QItem {
  t: number;
  type: EnemyId;
  row: number;
  x?: number;
}
export interface RSeat extends SeatCfg {
  autopilot: boolean;
  connected: boolean;
  botNext: number;
  speakUntil: number;
}

export interface EngineHooks {
  onHud?: (h: Hud) => void;
  onChat?: (l: ChatLine) => void;
  onEnd?: (r: MatchResult) => void;
  onSound?: (name: string) => void;
}
export interface EngineOpts {
  mirror?: boolean;
  capture?: boolean;
  quality?: Quality;
  fps?: number;
  mySeat?: number;
  shake?: boolean;
}

export interface Snap {
  mid: number;
  tick: number;
  time: number;
  sun: number;
  wave: number;
  waves: number;
  prog: number;
  alive: number;
  banner: string;
  bannerT: number;
  status: 0 | 1 | 2;
  paused: boolean;
  pl: number[][];
  en: number[][];
  pj: number[][];
  su: number[][];
  gd: number[][];
  st: number[][];
  cd: Record<string, number>;
  fx: Fx[];
  snd: string[];
  chat: ChatLine[];
  stats: MatchStats;
  guards: number;
  bossHp: number | null;
  bossName: string;
  res?: MatchResult;
  cm: number[][];
  ev: number[][];
  wn: number[];
  bp: number;
  fw: number;
}

const PROJ_KINDS = ["dart", "shard", "lob", "acid"] as const;
type DmgKind = "proj" | "splash" | "explode" | "bite" | "bolt" | "stun" | "melee" | "void" | "guard";

const SAY: Record<DefClass, string[]> = {
  gerador: ["Mais seiva a caminho ✦", "Geradores plantados!"],
  longo: ["Reforço de tiro na linha {r}!", "Cobrindo a linha {r} ➶"],
  curto: ["Chicote na linha {r}!", "Guarda de perto na {r} ⚔"],
  protecao: ["Muralha na linha {r} ⛨", "Segurando a {r}!"],
  especial: ["Poder especial na {r}! ✧", "Usei um especial!"],
};

const newStats = (seats = 1): MatchStats => ({ kills: 0, airKills: 0, seivaCollected: 0, sunClicks: 0, planted: 0, plantedBy: {}, classesUsed: 0, plantsLost: 0, guardsUsed: 0, bossKilled: false, combos: 0, events: 0, bySeat: Array.from({ length: Math.max(1, seats) }, () => 0) });

export class GardenEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  hooks: EngineHooks;
  cfg: MatchCfg;
  level: LevelDef;
  mods: Set<Mod>;
  seats: RSeat[];
  mirror: boolean;
  capture: boolean;
  quality: Quality;
  fpsCap: number;
  mySeat: number;
  shakeOn: boolean;
  status: 0 | 1 | 2 = 0;
  paused = false;
  speed = 1;
  allowPause = false;
  time = 0;
  dirClock = 0;
  raf = 0;
  last = 0;
  running = false;
  sun: number;
  sel: DefId | null = null;
  shovel = false;
  hover: { col: number; row: number } | null = null;
  mouse: { x: number; y: number } | null = null;
  curKind: CursorKind | "" = "";
  plants: Plant[] = [];
  enemies: Enemy[] = [];
  projs: Proj[] = [];
  suns: Sun[] = [];
  fxs: Fx[] = [];
  guards: Guard[] = [];
  rocks: { col: number; row: number }[] = [];
  activeRows: boolean[] = [true, true, true, true, true];
  cd: Record<string, number> = {};
  cdLeft: Record<string, number> = {};
  cdAt = 0;
  queue: QItem[] = [];
  total = 1;
  waves = 3;
  waveStarts: number[] = [];
  waveIdx = 0;
  skyT = 3;
  banner = "";
  bannerT = 0;
  shake = 0;
  stats: MatchStats = newStats();
  nid = 1;
  hudT = 0;
  tick = 0;
  lastTick = -1;
  rng: () => number;
  outFx: Fx[] = [];
  outSnd: string[] = [];
  outChat: ChatLine[] = [];
  result: MatchResult | null = null;
  ended = false;
  bg: HTMLCanvasElement | null = null;
  bgDirty = true;
  mProg = 0;
  mAlive = 0;
  mGuards = 5;
  mBossHp: number | null = null;
  mBossName = "";
  lastFrame = 0;
  // ── Expansão 3.0 ──
  board!: BoardSpec;
  terrain: Map<string, TerrainKind> = new Map();
  levelEvents: LevelEvent[] = [];
  activeEvents: { kind: EventKind; until: number; row: number; col: number }[] = [];
  warnEvent: { kind: EventKind; t: number; row: number; col: number } | null = null;
  eventIdx = 0;
  warnedIdx = 0;
  growthActive = false;
  comboLinks: number[][] = [];
  comboNames: string[] = [];
  bossPhase = 0;
  bossAura = "";
  finalWin = false;
  supremeUsed = false;
  lastPlanter = -1;
  lastPlantAt = -99;
  invertUntil = 0;
  sandUntil = 0;
  heatUntil = 0;
  nightUntil = 0;
  fogUntil = 0;
  rainUntil = 0;
  eclipseUntil = 0;
  roles: RoleId[] = [];

  constructor(canvas: HTMLCanvasElement, cfg: MatchCfg, hooks: EngineHooks = {}, opts: EngineOpts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.hooks = hooks;
    this.cfg = cfg;
    this.level = getLevel(cfg.level);
    this.mods = new Set(cfg.mods);
    this.mirror = !!opts.mirror;
    this.capture = !!opts.capture;
    this.quality = opts.quality ?? "high";
    this.fpsCap = opts.fps ?? 60;
    this.mySeat = opts.mySeat ?? 0;
    this.shakeOn = opts.shake ?? true;
    this.rng = mulberry32(cfg.seed);
    this.stats = newStats(cfg.seats.length);
    this.seats = cfg.seats.map((s, i) => ({ ...s, autopilot: s.kind === "ai", connected: true, botNext: 3 + i * 0.7, speakUntil: 0 }));
    const n = this.seats.length;
    this.sun = cfg.level === 0 ? 250 : startSeiva(n) + Math.max(0, cfg.level - 1) * 3 + (this.mods.has("noite") ? 100 : 0);
    if (this.mods.has("estreito")) this.activeRows = [false, true, true, true, false];
    const r2 = mulberry32((cfg.seed ^ 0x9e3779b9) >>> 0);
    if (this.mods.has("rochoso")) {
      const rows = this.activeRows.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
      let guard = 0;
      while (this.rocks.length < 6 && guard++ < 60) {
        const col = 2 + Math.floor(r2() * 6);
        const row = rows[Math.floor(r2() * rows.length)];
        if (!this.rocks.some((k) => k.col === col && k.row === row)) this.rocks.push({ col, row });
      }
    }
    this.guards = Array.from({ length: ROWS }, (_, r) => ({ row: r, x: GX - 52, state: this.activeRows[r] ? 0 : 2, hit: false }) as Guard);
    initExpansion(this);
    this.applyQuality();
    if (!this.mirror) {
      this.makeQueue();
      this.banner = cfg.level === 0 ? "TREINO NO JARDIM" : `FASE ${cfg.level} · ${this.level.name.toUpperCase()}`;
      this.bannerT = 3.4;
    }
  }

  /* ------------------------------ configuração ------------------------------ */
  applyQuality() {
    setFlat(this.quality === "low");
    const cap = this.quality === "low" ? 1 : this.quality === "medium" ? 1.5 : 2;
    const raw = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.dpr = Math.min(cap, raw);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.bgDirty = true;
    this.canvas.style.cursor = CURSORS.aim;
    this.curKind = "aim";
  }
  setQuality(q: Quality, fps?: number) {
    this.quality = q;
    if (fps) this.fpsCap = fps;
    this.applyQuality();
  }

  snd(name: string) {
    if (this.capture) this.outSnd.push(name);
    this.hooks.onSound?.(name);
  }

  /* ------------------------------ DIRETOR ------------------------------ */
  activeRowList() {
    return this.activeRows.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  }

  makeQueue() {
    if (buildQueue(this)) return;
    const L = this.cfg.level;
    const rows = this.activeRowList();
    const pickRow = () => rows[Math.floor(this.rng() * rows.length)];
    const q: QItem[] = [];
    if (L === 0) {
      this.waves = 1;
      this.waveStarts = [0];
      for (const t of [4, 24, 44]) q.push({ t, type: "cinzento", row: 2 });
      this.queue = q;
      this.total = q.length;
      return;
    }
    const n = this.seats.length;
    const budget = Math.round(threatBudget(L, n) * (this.mods.has("enxame") ? 1.25 : 1));
    const waves = Math.min(6, 2 + Math.ceil(L / 5));
    this.waves = waves;
    const ws = Array.from({ length: waves }, (_, i) => 1 + 0.35 * i);
    const sum = ws.reduce((a, b) => a + b, 0);
    const elig = ENEMIES.filter((e) => e.kind !== "chefe" && e.intro <= L);
    const emph = new Set<string>([...this.level.emphasis, ...this.cfg.emphasis]);
    const weight = (e: (typeof elig)[number]) =>
      (1 / Math.pow(e.cost, 0.7)) * (emph.has(e.id) ? 3 : 1) * (L - e.intro < 3 ? 1.4 : 1) * (this.mods.has("enxame") && e.cost <= 2 ? 2 : 1);
    this.waveStarts = [];
    for (let i = 0; i < waves; i++) {
      let pts = Math.max(1, Math.round((budget * ws[i]) / sum));
      const start = 14 + i * 30;
      const span = i === waves - 1 ? 22 : 18;
      this.waveStarts.push(start);
      while (pts > 0) {
        const opts = elig.filter((e) => e.cost <= pts);
        const list = opts.length ? opts : [elig[0]];
        const wts = list.map(weight);
        let r = this.rng() * wts.reduce((a, b) => a + b, 0);
        let pick = list[0];
        for (let k = 0; k < list.length; k++) {
          r -= wts[k];
          if (r <= 0) {
            pick = list[k];
            break;
          }
        }
        pts -= pick.cost;
        q.push({ t: start + this.rng() * span, type: pick.id, row: pickRow() });
      }
    }
    if (this.level.boss) q.push({ t: this.waveStarts[waves - 1] + 4, type: this.level.boss, row: rows.includes(2) ? 2 : rows[0] });
    q.sort((a, b) => a.t - b.t);
    this.queue = q;
    this.total = Math.max(1, q.length);
  }

  spawnEnemy(type: EnemyId, row: number, x: number) {
    const d = ENEMY_BY_ID[type];
    const n = this.seats.length;
    const boss = d.kind === "chefe";
    const mul = boss ? 1 + 0.35 * (n - 1) : playerHpMult(n);
    const hp = d.hp * mul;
    this.enemies.push({
      id: this.nid++,
      type,
      x,
      rx: x,
      row,
      hp,
      maxHp: hp,
      armor: d.armor * (boss ? mul : 1),
      armorMax: d.armor * (boss ? mul : 1),
      speed: d.speed * (0.92 + this.rng() * 0.16),
      slowT: 0,
      stunT: 0,
      walk: this.rng() * 6,
      hurt: 0,
      timer: type === "xama" ? 1 : type === "ceifeira" ? 8 : type === "rainha" ? 6 : type === "titan" ? 12 : type === "murchar" ? 8 : type === "sapo" ? 1.2 : 0,
      timer2: type === "rainha" ? 12 : type === "ceifeira" ? 14 : type === "titan" ? 12 : type === "murchar" ? 12 : 0,
      jumpT: 0,
      jumpFrom: 0,
      ofs: (this.rng() - 0.5) * 10,
      attacking: false,
      enrage: false,
      phase: 0,
      ...extraEnemyFields(this, type),
    });
    if (boss) {
      this.banner = `CHEFE: ${d.name.toUpperCase()}`;
      this.bannerT = 4;
      this.snd("boss");
    }
  }

  /* ------------------------------ AÇÕES ------------------------------ */
  isBlocked(col: number, row: number, id?: DefId) {
    return !this.activeRows[row] || this.rocks.some((k) => k.col === col && k.row === row) || this.plants.some((p) => p.col === col && p.row === row) || (id === undefined && blockedByTerrain(this, col, row));
  }
  cdKey(seat: number, id: DefId) {
    return `${seat}:${id}`;
  }
  cdRemain(seat: number, id: DefId) {
    if (this.mirror) return Math.max(0, (this.cdLeft[this.cdKey(seat, id)] ?? 0) - (this.time - this.cdAt));
    return Math.max(0, (this.cd[this.cdKey(seat, id)] ?? 0) - this.time);
  }

  tryPlant(seat: number, type: DefId, col: number, row: number) {
    const s = this.seats[seat];
    if (!s || !s.loadout.includes(type)) return false;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS || this.isBlocked(col, row)) return false;
    const def = DEF_BY_ID[type];
    if (!def || blockedByTerrain(this, col, row, type)) return false;
    if (this.cdRemain(seat, type) > 0 || this.sun < def.cost) return false;
    const role = roleOfSeat(this, seat);
    const lv = clamp(Math.floor(s.levels[type] ?? 1), 1, MAX_DEF_LEVEL);
    const st = defStats(def, lv);
    this.sun -= def.cost;
    this.cd[this.cdKey(seat, type)] = this.time + def.recharge * (role === "comandante" ? 0.85 : 1);
    const timer = type === "luminia" ? Math.min(6, st.interval * 0.75) : type === "ambar" ? st.interval * 0.6 : type === "sino" ? 6 : type === "magma" ? def.interval : type === "vazio" ? def.interval : 1;
    const hpMul = (role === "guarda" ? 1.25 : 1) * (role === "curandeiro" ? 1.1 : 1);
    this.plants.push({ id: this.nid++, type, col, row, hp: Math.round(st.hp * hpMul), maxHp: Math.round(st.hp * hpMul), timer: timer || 1, state: type === "magma" ? 1 : type === "vazio" ? 2 : 0, charge: 0, flash: 0, owner: seat, born: this.time, lv, dmg: st.dmg, interval: st.interval * (lv >= 5 ? 0.85 : 1), spent: false, combo: "", slowT: 0, ghostT: 0, stored: 0 });
    this.stats.planted++;
    if (this.stats.bySeat[seat] !== undefined) this.stats.bySeat[seat]++;
    this.stats.plantedBy[type] = (this.stats.plantedBy[type] ?? 0) + 1;
    this.stats.classesUsed = new Set(Object.keys(this.stats.plantedBy).map((k) => DEF_BY_ID[k as DefId].cls)).size;
    if (!this.mirror && this.lastPlanter !== seat && this.lastPlanter >= 0 && this.time - this.lastPlantAt < 4 && this.seats.filter((q) => q.kind === "human").length > 1) {
      this.sun += 20;
      this.stats.seivaCollected += 20;
      this.addFx({ k: "text", x: cellX(col), y: cellY(row) - 40, ttl: 1, text: "COOP +20", col: "#2ee6c5" });
      this.snd("sun");
    }
    this.lastPlanter = seat;
    this.lastPlantAt = this.time;
    recomputeCombos(this);
    this.addFx({ k: "poof", x: cellX(col), y: cellY(row) + 20, ttl: 0.5, col: "#9be37a" });
    this.snd("plant");
    return true;
  }

  collectSun(s: Sun, byClick = false) {
    const bonus = this.plants.some((p) => p.combo === "energy") ? 1.25 : 1;
    const v = Math.round(s.value * bonus);
    this.sun += v;
    this.stats.seivaCollected += v;
    if (byClick) this.stats.sunClicks++;
    this.suns = this.suns.filter((x) => x !== s);
    this.addFx({ k: "text", x: s.x, y: s.y, ttl: 1, text: "+" + s.value, col: "#ffe27a" });
    this.snd("sun");
  }

  /** Único ponto de entrada de ações. Valida tudo (usado pelo jogador local e pela rede). */
  command(seat: number, c: Cmd): boolean {
    const s = this.seats[seat];
    if (!s || this.mirror) return false;
    switch (c.k) {
      case "chat": {
        if (typeof c.text !== "string") return false;
        const text = c.text.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
        if (!text) return false;
        this.say(seat, text);
        return true;
      }
      case "ping": {
        const row = c.row;
        if (!Number.isInteger(row) || row < 0 || row >= ROWS) return false;
        this.say(seat, `⚠ Atenção na linha ${row + 1}!`);
        this.addFx({ k: "ring", x: GX + CW * 2, y: cellY(row), ttl: 1, a: 90, col: s.color });
        this.snd("ping");
        return true;
      }
      case "pause":
        if (!this.allowPause) return false;
        this.paused = c.on === true;
        return true;
      case "speed":
        if (!this.allowPause) return false;
        this.speed = c.v === 2 ? 2 : 1;
        return true;
    }
    if (this.status !== 0 || this.paused) return false;
    switch (c.k) {
      case "plant": {
        const { col, row } = c;
        if (!Number.isInteger(col) || !Number.isInteger(row) || typeof c.d !== "string" || !DEF_BY_ID[c.d]) return false;
        const ok = this.tryPlant(seat, c.d, col, row);
        if (!ok) this.snd("error");
        return ok;
      }
      case "dig": {
        if (!Number.isInteger(c.col) || !Number.isInteger(c.row)) return false;
        const p = this.plants.find((q) => q.col === c.col && q.row === c.row);
        if (!p) return false;
        const owner = this.seats[p.owner];
        if (p.owner !== seat && owner && !owner.autopilot) return false;
        p.spent = true;
        this.plants = this.plants.filter((q) => q !== p);
        this.addFx({ k: "poof", x: cellX(p.col), y: cellY(p.row), ttl: 0.4, col: "#8a6a4a" });
        this.snd("dig");
        return true;
      }
      case "sun": {
        if (!Number.isInteger(c.id)) return false;
        const sun = this.suns.find((x) => x.id === c.id);
        if (!sun) return false;
        this.collectSun(sun, true);
        return true;
      }
      case "all":
        for (const x of [...this.suns]) this.collectSun(x, true);
        return true;
    }
    return false;
  }

  /** Traduz um toque/clique em comando (a seleção de carta é local a cada jogador). */
  pointerCmd(px: number, py: number): Cmd | null {
    if (this.status !== 0 || this.paused) return null;
    const sun = this.sunAt(px, py);
    if (sun) return { k: "sun", id: sun.id };
    const col = Math.floor((px - GX) / CW);
    const row = Math.floor((py - GY) / CH);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    if (this.shovel) {
      if (!this.plants.some((q) => q.col === col && q.row === row)) return null;
      this.shovel = false;
      return { k: "dig", col, row };
    }
    if (this.sel) return { k: "plant", d: this.sel, col, row };
    return null;
  }

  hoverAt(px: number, py: number) {
    const col = Math.floor((px - GX) / CW);
    const row = Math.floor((py - GY) / CH);
    this.hover = col >= 0 && col < COLS && row >= 0 && row < ROWS ? { col, row } : null;
    this.mouse = px >= 0 && py >= 0 && px <= W && py <= H ? { x: px, y: py } : null;
  }
  sunAt(px: number, py: number): Sun | null {
    let best: Sun | null = null;
    let bd = 52;
    for (const s of this.suns) {
      const d = Math.hypot(s.x - px, s.y - py);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }
  selectSeed(id: DefId | null) {
    this.sel = this.sel === id ? null : id;
    this.shovel = false;
    this.emit();
  }
  toggleShovel() {
    this.shovel = !this.shovel;
    this.sel = null;
    this.emit();
  }

  addFx(f: Partial<Fx> & { k: Fx["k"]; x: number; y: number; ttl: number }) {
    const fx: Fx = { a: 0, row: 0, pts: [], text: "", col: "#fff", t: 0, ...f };
    this.fxs.push(fx);
    if (this.capture) this.outFx.push(fx);
  }

  spawnSun(x: number, y: number, v: number, fall = false) {
    this.suns.push({ id: this.nid++, x, y: fall ? -20 : y, ty: fall ? 150 + this.rng() * 330 : y + 20, value: v, age: 0, botAt: this.time + 8 + this.rng() * 4 });
  }

  say(i: number, text: string) {
    const s = this.seats[i];
    if (s) s.speakUntil = this.time + 2.6;
    const line = { who: i, text };
    if (this.capture) this.outChat.push(line);
    this.hooks.onChat?.(line);
  }
  aiSeat() {
    const ids = this.seats.map((s, i) => (s.autopilot ? i : -1)).filter((i) => i >= 0);
    return ids.length ? ids[Math.floor(Math.random() * ids.length)] : -1;
  }
  setSeatState(i: number, connected: boolean, autopilot: boolean) {
    const s = this.seats[i];
    if (!s) return;
    s.connected = connected;
    s.autopilot = s.kind === "ai" ? true : autopilot;
  }

  /* ------------------------------ IA dos aliados ------------------------------ */
  botPick(type: DefId): { col: number; row: number } | null {
    const occ = (c: number, r: number) => this.isBlocked(c, r);
    const threat = (r: number) => this.enemies.filter((z) => z.row === r && z.x < W).reduce((a, z) => a + Math.max(1, ENEMY_BY_ID[z.type].cost), 0);
    const atk = (r: number) => this.plants.filter((p) => p.row === r && DEF_BY_ID[p.type].cls === "longo").length;
    const limit = (r: number) => {
      const xs = this.enemies.filter((z) => z.row === r && !ENEMY_BY_ID[z.type].flying).map((z) => z.x);
      if (!xs.length) return COLS - 1;
      return Math.min(COLS - 1, Math.floor((Math.min(...xs) - 30 - GX) / CW));
    };
    const first = (r: number, cols: number[]) => {
      for (const c of cols) if (!occ(c, r)) return c;
      return -1;
    };
    const firstL = (r: number, cols: number[]) => first(r, cols.filter((c) => c <= limit(r)));
    const rows = this.activeRowList();
    const n = this.seats.length;
    const cls = DEF_BY_ID[type].cls;
    const byThreat = () => [...rows].sort((a, b) => threat(b) - threat(a));
    if (cls === "gerador") {
      if (this.plants.filter((p) => DEF_BY_ID[p.type].cls === "gerador").length >= 4 + 2 * n) return null;
      const cnt = (r: number) => this.plants.filter((p) => p.row === r && DEF_BY_ID[p.type].cls === "gerador").length + Math.random() * 0.6;
      for (const r of [...rows].sort((a, b) => cnt(a) - cnt(b))) {
        const c = first(r, [0, 1, 2]);
        if (c >= 0) return { col: c, row: r };
      }
      return null;
    }
    if (cls === "longo") {
      const flyers = (r: number) => this.enemies.filter((z) => z.row === r && ENEMY_BY_ID[z.type].flying).length;
      for (const r of [...rows].sort((a, b) => threat(b) + flyers(b) * 3 - threat(a) - flyers(a) * 3 + (atk(a) - atk(b)) * 0.8 + (Math.random() - 0.5))) {
        if (atk(r) >= (threat(r) > 0 ? 6 : 2)) continue;
        const c = firstL(r, [1, 2, 3, 4, 5]);
        if (c >= 0) return { col: c, row: r };
      }
      return null;
    }
    if (cls === "curto") {
      for (const r of byThreat()) {
        if (threat(r) <= 0) continue;
        const c = firstL(r, [4, 3, 5, 6]);
        if (c >= 0) return { col: c, row: r };
      }
      return null;
    }
    if (type === "tronco") {
      for (const r of byThreat()) {
        if (threat(r) <= 0) continue;
        if (this.plants.filter((p) => p.row === r && p.type === "tronco").length >= 2) continue;
        const c = firstL(r, [5, 6, 4, 7, 3]);
        if (c >= 0) return { col: c, row: r };
      }
      return null;
    }
    if (type === "musgo") {
      if (this.plants.filter((p) => p.type === "musgo").length >= 2) return null;
      let best: { col: number; row: number } | null = null;
      let bestN = 1;
      for (const r of rows)
        for (let c = 0; c < COLS; c++) {
          if (occ(c, r)) continue;
          const k = this.plants.filter((p) => Math.abs(p.col - c) <= 1 && Math.abs(p.row - r) <= 1 && p.hp < p.maxHp * 0.95).length;
          if (k > bestN) {
            bestN = k;
            best = { col: c, row: r };
          }
        }
      if (best) return best;
      for (const r of rows)
        for (let c = 1; c < 5; c++) {
          if (occ(c, r)) continue;
          if (this.plants.filter((p) => Math.abs(p.col - c) <= 1 && Math.abs(p.row - r) <= 1).length >= 4) return { col: c, row: r };
        }
      return null;
    }
    if (type === "sino") {
      for (const r of byThreat()) {
        if (threat(r) < 2) continue;
        const c = firstL(r, [2, 3, 4]);
        if (c >= 0) return { col: c, row: r };
      }
      return null;
    }
    // plantas especiais novas: posiciona na linha mais ameaçada, atrás da frente
    if (DEF_BY_ID[type] && !["magma", "vazio"].includes(type)) {
      for (const r of byThreat()) {
        const c = firstL(r, [2, 3, 4, 1]);
        if (c >= 0) return { col: c, row: r };
      }
      return null;
    }
    // magma e vazio: área com mais inimigos
    let best: { col: number; row: number } | null = null;
    let bestN = type === "vazio" ? 3 : 1.5;
    for (const r of rows)
      for (let c = 1; c < COLS; c++) {
        if (occ(c, r)) continue;
        const k = this.enemies.reduce((a, z) => a + (!z.burrowed && Math.hypot(z.x - cellX(c), cellY(z.row) - cellY(r)) < 135 ? Math.max(1, ENEMY_BY_ID[z.type].cost / 2) * (z.attacking ? 2 : 1) : 0), 0);
        if (k > bestN) {
          bestN = k;
          best = { col: c, row: r };
        }
      }
    return best;
  }

  botAct(i: number) {
    const seat = this.seats[i];
    const opts = seat.loadout.filter((t) => this.cdRemain(i, t) <= 0 && DEF_BY_ID[t].cost <= this.sun);
    opts.sort(() => Math.random() - 0.5);
    for (const t of opts) {
      const cell = this.botPick(t);
      if (cell && this.tryPlant(i, t, cell.col, cell.row)) {
        if (Math.random() < 0.35 && seat.kind === "ai") {
          const lines = SAY[DEF_BY_ID[t].cls];
          this.say(i, lines[Math.floor(Math.random() * lines.length)].replace("{r}", String(cell.row + 1)));
        }
        return;
      }
    }
  }

  /* ------------------------------ DANO ------------------------------ */
  hurtEnemy(z: Enemy, dmg: number, kind: DmgKind) {
    if (z.burrowed) return;
    let d = dmg;
    if (z.type === "murchar" && kind === "explode") d *= 0.5;
    z.hurt = 0.15;
    if (z.armor > 0) {
      const a = Math.min(z.armor, d);
      z.armor -= a;
      d -= a;
    }
    z.hp -= d;
  }

  onEnemyDeath(z: Enemy) {
    expansionDeath(this, z);
    const def = ENEMY_BY_ID[z.type];
    this.stats.kills++;
    if (def.flying) this.stats.airKills++;
    if (def.kind === "chefe") this.stats.bossKilled = true;
    const y = cellY(z.row);
    this.addFx({ k: "poof", x: z.x, y: y + 10, ttl: 0.6, col: def.kind === "chefe" ? "#c07bff" : "#8a7aa0" });
    if (z.type === "bulbo") {
      this.addFx({ k: "boom", x: z.x, y, ttl: 0.5, a: 110 });
      this.shake = Math.max(this.shake, 0.5);
      this.snd("boom");
      for (const p of this.plants) if (Math.hypot(cellX(p.col) - z.x, cellY(p.row) - y) < CW * 1.3) p.hp -= 220;
    }
    if (def.kind === "chefe") {
      this.addFx({ k: "boom", x: z.x, y, ttl: 0.9, a: 170 });
      this.shake = Math.max(this.shake, 1);
    }
  }

  /* ------------------------------ ATUALIZAÇÃO ------------------------------ */
  update(dt: number) {
    if (this.mirror) {
      this.updateMirror(dt);
      return;
    }
    if (this.status !== 0 || this.paused) return;
    this.time += dt;
    this.tick++;
    expansionUpdate(this, dt);
    this.shake = Math.max(0, this.shake - dt * 2);
    this.bannerT = Math.max(0, this.bannerT - dt);
    const tutorial = this.cfg.level === 0;
    const gate = !tutorial || (this.stats.plantedBy.espinheiro ?? 0) > 0;
    if (gate) this.dirClock += dt;

    while (this.waveIdx < this.waves && this.dirClock >= this.waveStarts[this.waveIdx] && (this.waveIdx > 0 || !tutorial || gate)) {
      this.waveIdx++;
      const last = this.waveIdx === this.waves;
      if (!tutorial) {
        this.banner = last ? (this.level.boss ? "O CHEFE SE APROXIMA!" : "ÚLTIMA ONDA!") : `ONDA ${this.waveIdx}/${this.waves}`;
        this.bannerT = 3.2;
        this.snd("wave");
        const b = this.aiSeat();
        if (b >= 0 && this.seats[b].kind === "ai") this.say(b, last ? "É a última! Gastem tudo!" : ["Lá vêm eles! 😨", "Segurem as linhas!", "Preparem as defesas!"][Math.floor(Math.random() * 3)]);
      }
    }
    while (this.queue.length && this.queue[0].t <= this.dirClock && gate) {
      const q = this.queue.shift()!;
      this.spawnEnemy(q.type, q.row, q.x ?? W + 30);
      if (q.x !== undefined) this.addFx({ k: "ring", x: q.x, y: cellY(q.row), ttl: 0.7, a: 70, col: "#c07bff" });
    }

    this.skyT -= dt;
    if (this.skyT <= 0 && !this.mods.has("noite")) {
      this.skyT = tutorial ? 6 : this.mods.has("chuva") ? 4.5 : 9;
      this.spawnSun(GX + 40 + this.rng() * (COLS * CW - 80), 0, 25, true);
    } else if (this.skyT <= 0) this.skyT = 9;

    const helpers = this.seats.some((s) => s.autopilot);
    for (const s of [...this.suns]) {
      s.age += dt;
      if (s.y < s.ty) s.y = Math.min(s.ty, s.y + 60 * dt);
      if (s.age > 16) this.suns = this.suns.filter((x) => x !== s);
      else if (helpers && this.time >= s.botAt) this.collectSun(s);
    }

    if (!tutorial)
      this.seats.forEach((seat, i) => {
        if (!seat.autopilot) return;
        seat.botNext -= dt;
        if (seat.botNext <= 0) {
          seat.botNext = 1.4 + Math.random() * 1.4;
          this.botAct(i);
        }
      });

    for (const p of this.plants) this.updatePlant(p, dt);
    this.plants = this.plants.filter((p) => {
      if (p.hp > 0) return true;
      recomputeCombos(this);
      this.addFx({ k: "poof", x: cellX(p.col), y: cellY(p.row) + 10, ttl: 0.5, col: "#3a2a1a" });
      if (!p.spent) {
        this.stats.plantsLost++;
        if (p.type === "ambar") this.spawnSun(cellX(p.col), cellY(p.row) - 10, 40);
        const seat = this.seats[p.owner];
        if (seat && seat.kind === "ai" && Math.random() < 0.3) this.say(p.owner, `Perdi ${DEF_BY_ID[p.type].name}! 😭`);
      }
      return false;
    });

    for (const z of this.enemies) this.updateEnemy(z, dt);
    this.enemies = this.enemies.filter((z) => {
      if (z.hp > 0) return true;
      this.onEnemyDeath(z);
      return false;
    });

    this.updateProjs(dt);
    this.updateGuards(dt);
    for (const f of this.fxs) f.t += dt;
    this.fxs = this.fxs.filter((f) => f.t < f.ttl);

    if (this.status === 0 && this.waveIdx >= this.waves && this.queue.length === 0 && this.enemies.length === 0) this.finish(true);
  }

  buildResult(win: boolean): MatchResult {
    const L = this.cfg.level;
    const objectives = this.level.objectives.map((o) => objectiveEval(o, this.stats).met);
    const guardsLeft = this.guards.filter((g, i) => this.activeRows[i] && g.state !== 2).length;
    const met = objectives.filter(Boolean).length;
    const base = this.stats.kills * 10 + guardsLeft * 150 + Math.max(0, 480 - this.time) * 2 + met * 400 + (this.stats.bossKilled ? 1000 : 0);
    const score = Math.round((win ? base : base * 0.35) * (1 + 0.05 * Math.max(0, L - 1)) * (1 + 0.1 * (this.seats.length - 1)));
    return {
      win,
      level: L,
      mode: this.cfg.mode,
      time: Math.round(this.time),
      stats: { ...this.stats, plantedBy: { ...this.stats.plantedBy } },
      objectives,
      stars: win ? 1 + met : 0,
      score,
      seats: this.seats.length,
      humans: this.seats.filter((s) => s.kind === "human").length,
      rewardMul: this.cfg.rewardMul,
    };
  }

  finish(win: boolean) {
    if (this.status !== 0) return;
    expansionFinish(this, win);
    this.status = win ? 1 : 2;
    this.snd(win ? "win" : "lose");
    this.result = this.buildResult(win);
    this.ended = true;
    this.emit();
    this.hooks.onEnd?.(this.result);
  }

  foes(p: Plant, minX: number, maxX: number, air: boolean, span = 0) {
    return this.enemies.filter((z) => Math.abs(z.row - p.row) <= span && !z.burrowed && z.jumpT <= 0 && z.x > minX && z.x < maxX && (air || !ENEMY_BY_ID[z.type].flying));
  }

  updatePlant(p: Plant, dt: number) {
    if (p.slowT > this.time) dt *= 0.6;
    if (p.spent && p.state === 2) {
      p.timer -= dt;
      if (p.timer <= 0) p.hp = 0;
      return;
    }
    p.flash = Math.max(0, p.flash - dt * 3);
    const x = cellX(p.col);
    const y = cellY(p.row);
    if (expansionAbility(this, p, dt, x, y)) return;
    const def = DEF_BY_ID[p.type];
    const shot = (kind: Proj["kind"]) => {
      this.projs.push({ kind, x: x + 30, y: y - 12, row: p.row, vx: 420, dmg: p.dmg, x0: 0, y0: 0, tx: 0, t: 0, dur: 0, owner: p.owner });
      this.snd("dart");
    };
    switch (p.type) {
      case "luminia":
      case "ambar":
        p.timer -= dt;
        if (p.timer <= 0) {
          p.timer = p.interval;
          this.spawnSun(x + (Math.random() - 0.5) * 30, y - 22, p.dmg);
        }
        break;
      case "espinheiro":
      case "gelidea": {
        p.timer = Math.max(0, p.timer - dt);
        const has = this.foes(p, x - 10, x + def.range * CW + 40, true).length > 0;
        p.charge = has ? 1 - p.timer / p.interval : 0;
        if (has && p.timer <= 0) {
          p.timer = p.interval;
          shot(p.type === "espinheiro" ? "dart" : "shard");
        }
        break;
      }
      case "morteiro": {
        p.timer = Math.max(0, p.timer - dt);
        const list = this.foes(p, x + CW * 1.5, x + def.range * CW + 60, false).sort((a, b) => a.x - b.x);
        p.charge = list.length ? clamp(1 - p.timer / p.interval, 0, 1) : 0;
        if (list.length && p.timer <= 0) {
          p.timer = p.interval;
          const z = list[0];
          this.projs.push({ kind: "lob", x, y: y - 20, row: p.row, vx: 0, dmg: p.dmg, x0: x + 14, y0: y - 30, tx: Math.max(x + CW, z.x - z.speed * 0.9), t: 0, dur: 0.9, owner: p.owner });
          this.snd("dart");
        }
        break;
      }
      case "orquidea": {
        p.timer = Math.max(0, p.timer - dt);
        let target = this.foes(p, x - 10, x + def.range * CW, true).sort((a, b) => a.x - b.x)[0];
        if (!target) target = this.foes(p, x, x + 3 * CW, true, 1).sort((a, b) => a.x - b.x)[0];
        p.charge = target ? clamp(1 - p.timer / p.interval, 0, 1) : 0;
        if (target && p.timer <= 0) {
          p.timer = p.interval;
          const hit: Enemy[] = [target];
          let cur = target;
          for (let k = 0; k < 2; k++) {
            const d2 = (z: Enemy) => Math.hypot(z.x - cur.x, cellY(z.row) - cellY(cur.row));
            const nxt = this.enemies.filter((z) => !hit.includes(z) && !z.burrowed && d2(z) < 150).sort((a, b) => d2(a) - d2(b))[0];
            if (!nxt) break;
            hit.push(nxt);
            cur = nxt;
          }
          const pts: number[][] = [[x, y - 16]];
          hit.forEach((z, k) => {
            this.hurtEnemy(z, k === 0 ? p.dmg : p.dmg * 0.7, "bolt");
            pts.push([z.x - 8, cellY(z.row) - (ENEMY_BY_ID[z.type].flying ? 60 : 14)]);
          });
          this.addFx({ k: "bolt", x, y, ttl: 0.3, pts });
          this.snd("zap");
        }
        break;
      }
      case "cipo": {
        p.timer = Math.max(0, p.timer - dt);
        p.charge = Math.max(0, p.charge - dt * 4);
        const list = this.foes(p, x - 10, x + 2 * CW + 20, false);
        if (list.length && p.timer <= 0) {
          p.timer = p.interval;
          p.charge = 1;
          for (const z of list) this.hurtEnemy(z, p.dmg, "melee");
          this.addFx({ k: "slash", x: x + 10, y: y - 6, ttl: 0.25, a: 2 * CW, col: "#e0ff6a" });
          this.snd("whip");
        }
        break;
      }
      case "cardo": {
        p.timer = Math.max(0, p.timer - dt);
        p.charge = Math.max(0, p.charge - dt * 3);
        const list = this.foes(p, x - 1.6 * CW, x + 1.6 * CW, false, 1);
        if (list.length && p.timer <= 0) {
          p.timer = p.interval;
          p.charge = 1;
          for (const z of list) this.hurtEnemy(z, p.dmg, "melee");
          this.addFx({ k: "ring", x, y, ttl: 0.3, a: 1.6 * CW, col: "#ff8fb1" });
          this.snd("whip");
        }
        break;
      }
      case "musgo": {
        p.timer -= dt;
        if (p.timer <= 0) {
          p.timer = 1;
          let healed = false;
          for (const q of this.plants) {
            if (q !== p && Math.abs(q.col - p.col) <= 1 && Math.abs(q.row - p.row) <= 1 && q.hp < q.maxHp) {
              q.hp = Math.min(q.maxHp, q.hp + p.dmg);
              healed = true;
            }
          }
          if (healed) this.addFx({ k: "ring", x, y: y + 10, ttl: 0.7, a: 80, col: "#5fe08a" });
        }
        break;
      }
      case "sino": {
        p.timer -= dt;
        p.charge = p.timer < 0.6 ? 1 : 0;
        if (p.timer <= 0) {
          p.timer = p.interval;
          let any = false;
          for (const z of this.enemies) {
            if (Math.abs(z.row - p.row) <= 1 && !z.burrowed && z.x > x - 40 && z.x < x + def.range * CW) {
              z.stunT = this.time + (ENEMY_BY_ID[z.type].kind === "chefe" ? 1.2 : 2.5);
              any = true;
            }
          }
          this.addFx({ k: "ring", x, y, ttl: 0.7, a: def.range * CW, col: "#aab8ff" });
          this.snd("bell");
          if (any) this.shake = Math.max(this.shake, 0.3);
        }
        break;
      }
      case "vazio": {
        p.timer -= dt;
        for (const z of this.enemies) {
          if (z.burrowed || Math.abs(z.row - p.row) > 1) continue;
          const dx = x - z.x;
          if (Math.abs(dx) < def.range * CW) {
            const boss = ENEMY_BY_ID[z.type].kind === "chefe";
            z.x += Math.sign(dx) * Math.min(Math.abs(dx), 80 * dt * (boss ? 0.25 : 1));
            this.hurtEnemy(z, p.dmg * dt, "void");
          }
        }
        if (Math.random() < dt * 3) this.snd("vortex");
        if (p.timer <= 0) {
          p.spent = true;
          p.hp = 0;
        }
        break;
      }
      case "magma": {
        p.timer -= dt;
        p.charge = clamp(1 - p.timer / def.interval, 0, 1);
        if (p.timer <= 0) {
          for (const z of this.enemies) if (!z.burrowed && Math.hypot(z.x - x, cellY(z.row) - y) < def.range * CW) this.hurtEnemy(z, p.dmg, "explode");
          this.addFx({ k: "boom", x, y, ttl: 0.55, a: 140 });
          this.shake = Math.max(this.shake, 0.8);
          this.snd("boom");
          p.spent = true;
          p.hp = 0;
        }
        break;
      }
      case "tronco":
        break;
    }
  }

  updateEnemy(z: Enemy, dt: number) {
    const def = ENEMY_BY_ID[z.type];
    applyEnemyAuras(this, z, dt);
    if (expansionEnemy(this, z, dt)) return;
    z.hurt = Math.max(0, z.hurt - dt);
    z.attacking = false;
    if (z.stunT > this.time) return;
    z.walk += dt * (z.speed * 0.13 + 3);
    const boss = def.kind === "chefe";
    const slowF = z.slowT > this.time ? (boss ? 0.75 : 0.5) : 1;
    const lastStart = this.waveStarts[this.waves - 1] ?? 0;
    const late = this.waveIdx >= this.waves && this.queue.length === 0 && this.cfg.level > 0 ? Math.max(0, this.dirClock - (lastStart + 60)) : 0;
    const spd = z.speed * slowF * (z.enrage ? 1.6 : 1) * (1 + Math.min(1.5, late / 60));
    const y = cellY(z.row);

    switch (z.type) {
      case "xama":
        z.timer -= dt;
        if (z.timer <= 0) {
          z.timer = 1;
          let any = false;
          for (const o of this.enemies) {
            if (Math.abs(o.row - z.row) <= 1 && Math.abs(o.x - z.x) < 2 * CW && o.hp < o.maxHp) {
              o.hp = Math.min(o.maxHp, o.hp + 18);
              any = true;
            }
          }
          if (any) this.addFx({ k: "ring", x: z.x, y: y + 6, ttl: 0.6, a: 70, col: "#5fe08a" });
        }
        break;
      case "ceifeira":
      case "murchar":
      case "titan": {
        z.timer -= dt;
        z.timer2 -= dt;
        if (z.timer <= 0) {
          z.timer = z.type === "murchar" ? 8 : z.type === "titan" ? 12 : 10;
          const kinds: EnemyId[] = z.type === "ceifeira" ? ["estilhaco", "estilhaco"] : z.type === "titan" ? ["escudeiro", "xama"] : ["cinzento", "escudeiro", "estilhaco"];
          const rows = this.activeRowList();
          kinds.forEach((k) => this.spawnEnemy(k, rows[Math.floor(Math.random() * rows.length)], Math.min(W + 20, z.x + 40)));
          this.addFx({ k: "ring", x: z.x, y, ttl: 0.8, a: 160, col: "#c07bff" });
          const b = this.aiSeat();
          if (b >= 0 && this.seats[b].kind === "ai") this.say(b, "O chefe chamou reforços!! 😱");
        }
        if (z.timer2 <= 0) {
          z.timer2 = 12;
          for (const p of this.plants) if (Math.abs(p.row - z.row) <= 1 && cellX(p.col) > z.x - 2.2 * CW && cellX(p.col) < z.x + 40) p.hp -= 150;
          this.addFx({ k: "ring", x: z.x - 60, y: y + 20, ttl: 0.6, a: 200, col: "#8a5a2a" });
          this.shake = Math.max(this.shake, 1);
          this.snd("boom");
        }
        if (z.type === "murchar" && !z.enrage && z.hp < z.maxHp * 0.5) {
          z.enrage = true;
          this.banner = "O MURCHAR ENFURECEU!";
          this.bannerT = 3;
          this.snd("boss");
        }
        if (z.type === "titan") {
          const f = z.hp / z.maxHp;
          if ((z.phase === 0 && f < 0.66) || (z.phase === 1 && f < 0.33)) {
            z.phase++;
            z.armor = 0;
            const rows = this.activeRowList();
            for (let i = 0; i < 3; i++) this.spawnEnemy("escudeiro", rows[Math.floor(Math.random() * rows.length)], Math.min(W + 20, z.x + 30));
            this.addFx({ k: "boom", x: z.x, y, ttl: 0.6, a: 120 });
            this.banner = "A ARMADURA RACHOU!";
            this.bannerT = 2.5;
          }
        }
        break;
      }
      case "rainha": {
        z.timer -= dt;
        z.timer2 -= dt;
        if (z.timer <= 0) {
          z.timer = 6;
          const gens = this.plants.filter((p) => DEF_BY_ID[p.type].cls === "gerador");
          const pool = gens.length ? gens : this.plants;
          if (pool.length) {
            const p = pool[Math.floor(Math.random() * pool.length)];
            p.hp -= 120;
            p.flash = 0.6;
            this.addFx({ k: "poof", x: cellX(p.col), y: cellY(p.row), ttl: 0.7, col: "#ff6bd0" });
            this.addFx({ k: "ring", x: cellX(p.col), y: cellY(p.row), ttl: 0.6, a: 60, col: "#ff6bd0" });
          }
        }
        if (z.timer2 <= 0) {
          z.timer2 = 12;
          const rows = this.activeRowList();
          for (let i = 0; i < 2; i++) this.spawnEnemy("mariposa", rows[Math.floor(Math.random() * rows.length)], Math.min(W + 20, z.x + 30));
        }
        break;
      }
      case "verme":
        if (z.burrowed && z.x < GX + 4.2 * CW) {
          z.burrowed = false;
          for (const p of this.plants) if (p.row === z.row && Math.abs(cellX(p.col) - z.x) < CW) p.hp -= 150;
          this.addFx({ k: "boom", x: z.x, y: y + 10, ttl: 0.4, a: 70 });
          this.snd("boom");
        }
        break;
      default:
        break;
    }

    if (def.flying) {
      if (z.type === "mariposa") {
        const gen = this.plants.find((p) => p.row === z.row && DEF_BY_ID[p.type].cls === "gerador" && Math.abs(cellX(p.col) - z.x) < 30);
        if (gen) {
          z.attacking = true;
          damagePlant(this, gen, def.dps * dt, z);
          return;
        }
      }
      z.x -= spd * dt;
      return;
    }

    if (z.jumpT > 0) {
      z.jumpT -= dt / 0.55;
      z.x = z.jumpFrom - (1 - Math.max(0, z.jumpT)) * CW * 1.25;
      return;
    }
    if (!z.burrowed) {
      const target = this.plants.find((p) => p.row === z.row && Math.abs(cellX(p.col) - (z.x - 16)) < 34);
      if (target) {
        if (z.type === "gafanhoto" && !z.jumped) {
          z.jumped = true;
          z.jumpT = 1;
          z.jumpFrom = z.x;
          return;
        }
        z.attacking = true;
        damagePlant(this, target, def.dps * dt * (z.enrage ? 1.4 : 1), z);
        return;
      }
      if (z.type === "sapo") {
        const far = this.plants.find((p) => p.row === z.row && cellX(p.col) < z.x - 30 && z.x - cellX(p.col) < 340);
        if (far) {
          z.attacking = true;
          z.timer -= dt;
          if (z.timer <= 0) {
            z.timer = 2.2;
            this.projs.push({ kind: "acid", x: z.x - 30, y: y - 20, row: z.row, vx: -230, dmg: 28, x0: 0, y0: 0, tx: 0, t: 0, dur: 0, owner: -1 });
          }
          z.x -= spd * 0.35 * dt; // nunca fica parado: evita impasse
          return;
        }
      }
    }
    z.x -= spd * dt;
  }

  updateProjs(dt: number) {
    const keep: Proj[] = [];
    for (const p of this.projs) {
      const ext = expansionProjTick(this, p, dt);
      if (ext !== null) { if (ext) keep.push(p); continue; }
      if (p.kind === "dart" || p.kind === "shard") {
        p.x += p.vx * dt;
        const hit = this.enemies.filter((z) => z.row === p.row && !z.burrowed && z.jumpT <= 0 && p.x > z.x - 20 && p.x < z.x + 14).sort((a, b) => a.x - b.x)[0];
        if (hit) {
          hitEnemy(this, hit, p.dmg, p.owner, "proj");
          if (p.kind === "shard") hit.slowT = this.time + 3;
          this.addFx({ k: "poof", x: p.x, y: p.y, ttl: 0.25, col: p.kind === "shard" ? "#bfeaff" : "#9be37a" });
          this.snd("hit");
          continue;
        }
        if (p.x < W + 30) keep.push(p);
      } else if (p.kind === "lob") {
        p.t += dt / p.dur;
        const k = Math.min(1, p.t);
        p.x = p.x0 + (p.tx - p.x0) * k;
        p.y = p.y0 + (cellY(p.row) - 10 - p.y0) * k - Math.sin(Math.PI * k) * 90;
        if (p.t >= 1) {
          for (const z of this.enemies) {
            if (z.burrowed || ENEMY_BY_ID[z.type].flying) continue;
            const dx = Math.abs(z.x - p.tx);
            if (z.row === p.row && dx < 48) hitEnemy(this, z, p.dmg, p.owner, "splash");
            else if (Math.abs(z.row - p.row) <= 1 && dx < 100) hitEnemy(this, z, p.dmg * 0.5, p.owner, "splash");
          }
          this.addFx({ k: "boom", x: p.tx, y: cellY(p.row), ttl: 0.35, a: 80 });
          this.snd("boom");
        } else keep.push(p);
      } else {
        p.x += p.vx * dt;
        const hit = this.plants.find((q) => q.row === p.row && Math.abs(cellX(q.col) - p.x) < 24);
        if (hit) {
          hit.hp -= p.dmg;
          hit.flash = 0.4;
          this.addFx({ k: "poof", x: p.x, y: p.y, ttl: 0.4, col: "#a3ff2a" });
          continue;
        }
        if (p.x > GX - 40) keep.push(p);
      }
    }
    this.projs = keep;
  }

  updateGuards(dt: number) {
    for (const m of this.guards) {
      if (m.state === 0) {
        if (this.enemies.some((z) => z.row === m.row && !z.burrowed && z.x < GX + 6)) {
          m.state = 1;
          this.stats.guardsUsed++;
          this.shake = Math.max(this.shake, 0.5);
          this.snd("boom");
          const b = this.aiSeat();
          if (b >= 0 && this.seats[b].kind === "ai" && Math.random() < 0.7) this.say(b, "RUNA DE GUARDA ATIVADA! ✦");
        }
      } else if (m.state === 1) {
        m.x += 480 * dt;
        for (const z of this.enemies) {
          if (z.row !== m.row || z.burrowed || Math.abs(z.x - m.x) > 36) continue;
          if (ENEMY_BY_ID[z.type].kind === "chefe") {
            if (!m.hit) {
              m.hit = true;
              this.hurtEnemy(z, 700, "guard");
            }
          } else z.hp = 0;
        }
        if (m.x > W + 60) m.state = 2;
      }
    }
    for (const z of this.enemies) {
      if (z.x < 26 && this.guards[z.row].state === 2) {
        this.finish(false);
        return;
      }
    }
  }

  /* ------------------------------ MULTIPLAYER (espelho) ------------------------------ */
  serialize(): Snap {
    const guards = this.guards.filter((g, i) => this.activeRows[i] && g.state !== 2).length;
    const boss = this.enemies.find((z) => ENEMY_BY_ID[z.type].kind === "chefe");
    const cd: Record<string, number> = {};
    for (const k of Object.keys(this.cd)) {
      const left = this.cd[k] - this.time;
      if (left > 0) cd[k] = Math.round(left * 10) / 10;
    }
    const r1 = (v: number) => Math.round(v * 10) / 10;
    const snap: Snap = {
      mid: this.cfg.mid,
      tick: this.tick,
      time: Math.round(this.time * 100) / 100,
      sun: Math.floor(this.sun),
      wave: this.waveIdx,
      waves: this.waves,
      prog: this.progress(),
      alive: this.enemies.length,
      banner: this.banner,
      bannerT: Math.round(this.bannerT * 10) / 10,
      status: this.status,
      paused: this.paused,
      pl: this.plants.map((p) => [p.id, DEF_IDS.indexOf(p.type), p.col, p.row, Math.round(p.hp), Math.round(p.maxHp), p.state, Math.round(p.charge * 100), p.owner, Math.round(p.born * 100) / 100, Math.round(p.flash * 100), p.lv]),
      en: this.enemies.map((z) => [z.id, ENEMY_IDS.indexOf(z.type), r1(z.x), z.row, Math.round(z.hp), Math.round(z.maxHp), (z.slowT > this.time ? 1 : 0) | (z.stunT > this.time ? 2 : 0) | (z.attacking ? 4 : 0) | (z.burrowed ? 8 : 0) | (z.enrage ? 16 : 0), z.armorMax ? Math.round((z.armor / z.armorMax) * 100) : 0, z.jumpT > 0 ? Math.round((1 - z.jumpT) * 100) : 0, r1(z.walk), Math.round(z.ofs), Math.round(z.hurt * 100)]),
      pj: this.projs.map((p) => [PROJ_KINDS.indexOf(p.kind), r1(p.x), r1(p.y), p.owner]),
      su: this.suns.map((s) => [s.id, r1(s.x), r1(s.y), s.value, r1(s.age)]),
      gd: this.guards.map((g) => [g.state, r1(g.x)]),
      st: this.seats.map((s) => [s.connected ? 1 : 0, s.autopilot ? 1 : 0, s.speakUntil > this.time ? 1 : 0]),
      cd,
      fx: this.outFx.splice(0),
      snd: this.outSnd.splice(0),
      chat: this.outChat.splice(0),
      stats: this.stats,
      guards,
      bossHp: boss ? boss.hp / boss.maxHp : null,
      bossName: boss ? ENEMY_BY_ID[boss.type].name : "",
      cm: [], ev: [], wn: [], bp: 0, fw: 0,
    };
    expansionSnap(this, snap);
    if (this.status !== 0 && this.result) snap.res = this.result;
    return snap;
  }

  applySnap(s: Snap) {
    if (!this.mirror || s.mid !== this.cfg.mid || s.tick < this.lastTick) return;
    this.lastTick = s.tick;
    if (Math.abs(this.time - s.time) > 0.3) this.time = s.time;
    const prev = new Map(this.enemies.map((e) => [e.id, e]));
    this.plants = s.pl.map((a) => ({ id: a[0], type: DEF_IDS[a[1]], col: a[2], row: a[3], hp: a[4], maxHp: a[5], state: a[6] as 0 | 1 | 2, charge: a[7] / 100, flash: a[10] / 100, owner: a[8], born: a[9], lv: a[11], timer: 0, dmg: 0, interval: 0, spent: false, combo: "", slowT: 0, ghostT: 0, stored: 0 }));
    this.enemies = s.en.map((a) => {
      const old = prev.get(a[0]);
      const type = ENEMY_IDS[a[1]];
      return { id: a[0], type, x: a[2], rx: old ? old.rx : a[2], row: a[3], hp: a[4], maxHp: a[5], armor: a[7], armorMax: 100, speed: ENEMY_BY_ID[type].speed, slowT: a[6] & 1 ? this.time + 1 : 0, stunT: a[6] & 2 ? this.time + 1 : 0, walk: old ? old.walk : a[9], hurt: a[11] / 100, timer: 0, timer2: 0, jumpT: a[8] > 0 ? 1 - a[8] / 100 : 0, jumpFrom: 0, jumped: false, ofs: a[10], attacking: !!(a[6] & 4), burrowed: !!(a[6] & 8), enrage: !!(a[6] & 16), phase: 0, traits: old?.traits ?? ENEMY_BY_ID[type].traits, charmedT: 0, burnT: 0, poisonT: 0, dmgAccum: 0, lastOwner: -1, phaseT: 0, shieldT: 0 };
    });
    this.projs = s.pj.map((a) => ({ kind: PROJ_KINDS[a[0]], x: a[1], y: a[2], row: 0, vx: 0, dmg: 0, x0: 0, y0: 0, tx: 0, t: 0, dur: 0, owner: a[3] }));
    this.suns = s.su.map((a) => ({ id: a[0], x: a[1], y: a[2], ty: a[2], value: a[3], age: a[4], botAt: 0 }));
    this.guards.forEach((g, i) => {
      if (s.gd[i]) {
        g.state = s.gd[i][0] as 0 | 1 | 2;
        g.x = s.gd[i][1];
      }
    });
    s.st.forEach((a, i) => {
      const seat = this.seats[i];
      if (seat) {
        seat.connected = !!a[0];
        seat.autopilot = !!a[1];
        seat.speakUntil = a[2] ? this.time + 1 : 0;
      }
    });
    this.sun = s.sun;
    this.waveIdx = s.wave;
    this.waves = s.waves;
    this.mProg = s.prog;
    this.mAlive = s.alive;
    this.banner = s.banner;
    this.bannerT = s.bannerT;
    this.paused = s.paused;
    this.cdLeft = s.cd;
    this.cdAt = this.time;
    this.stats = s.stats;
    this.mGuards = s.guards;
    this.mBossHp = s.bossHp;
    this.mBossName = s.bossName;
    expansionApplySnap(this, s);
    for (const f of s.fx) this.fxs.push({ ...f, t: 0 });
    for (const n of s.snd) this.hooks.onSound?.(n);
    for (const c of s.chat) this.hooks.onChat?.(c);
    if (s.status !== 0 && !this.ended && s.res) {
      this.status = s.status;
      this.result = s.res;
      this.ended = true;
      this.hooks.onSound?.(s.status === 1 ? "win" : "lose");
      this.emit();
      this.hooks.onEnd?.(s.res);
    }
  }

  updateMirror(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 2);
    for (const e of this.enemies) {
      e.rx += (e.x - e.rx) * Math.min(1, dt * 14);
      if (!e.attacking && e.stunT <= this.time) e.walk += dt * (e.speed * 0.13 + 3);
    }
    for (const s of this.suns) s.age += dt;
    for (const f of this.fxs) f.t += dt;
    this.fxs = this.fxs.filter((f) => f.t < f.ttl);
  }

  /* ------------------------------ LOOP / HUD ------------------------------ */
  progress() {
    return clamp(1 - (this.queue.length + this.enemies.length) / Math.max(this.total, this.queue.length + this.enemies.length), 0, 1);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.lastFrame = this.last;
    const loop = (t: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const minDt = 1000 / this.fpsCap - 2;
      if (t - this.lastFrame < minDt) return;
      this.lastFrame = t;
      const raw = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      const steps = this.mirror ? 1 : this.speed;
      for (let k = 0; k < steps; k++) this.update(raw);
      this.draw();
      this.hudT += raw;
      if (this.hudT > 0.1) {
        this.hudT = 0;
        this.emit();
      }
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this.raf);
  }

  emit() {
    const my = this.seats[this.mySeat] ?? this.seats[0];
    const queued = this.queue.length;
    this.hooks.onHud?.({
      sun: Math.floor(this.sun),
      wave: this.waveIdx,
      waves: this.waves,
      progress: this.mirror ? this.mProg : this.progress(),
      alive: this.mirror ? this.mAlive : this.enemies.length + queued * 0,
      banner: this.bannerT > 0 ? this.banner : "",
      seeds: my.loadout.map((id) => {
        const d = DEF_BY_ID[id];
        const left = this.cdRemain(this.mySeat, id);
        return { id, ready: clamp(1 - left / d.recharge, 0, 1), afford: this.sun >= d.cost, cost: d.cost };
      }),
      sel: this.sel,
      shovel: this.shovel,
      paused: this.paused,
      speed: this.speed,
      bossHp: this.mirror ? this.mBossHp : (() => {
        const b = this.enemies.find((z) => ENEMY_BY_ID[z.type].kind === "chefe");
        return b ? b.hp / b.maxHp : null;
      })(),
      bossName: this.mirror ? this.mBossName : (() => {
        const b = this.enemies.find((z) => ENEMY_BY_ID[z.type].kind === "chefe");
        return b ? ENEMY_BY_ID[b.type].name : "";
      })(),
      guards: this.mirror ? this.mGuards : this.guards.filter((g, i) => this.activeRows[i] && g.state !== 2).length,
      time: this.time,
      stats: this.stats,
      objectives: this.level.objectives.map((o) => {
        const e = objectiveEval(o, this.stats);
        return { text: e.text, met: e.met, label: e.label };
      }),
      seats: this.seats.map((s) => ({ name: s.name, color: s.color, kind: s.kind, connected: s.connected, autopilot: s.autopilot && s.kind === "human", speaking: s.speakUntil > this.time })),
      status: this.status,
      canPause: this.allowPause,
      world: 0,
      worldName: "",
      event: null,
      combos: [],
      bossPhase: 0,
      role: roleOf(undefined, this.mySeat),
      ...expansionHud(this),
    });
  }

  updateCursor() {
    if (!this.mouse) return;
    const kind: CursorKind = this.sunAt(this.mouse.x, this.mouse.y) ? "sun" : this.shovel ? "shovel" : this.sel ? "plant" : "aim";
    if (kind !== this.curKind) {
      this.curKind = kind;
      this.canvas.style.cursor = CURSORS[kind];
    }
  }

  draw() {
    drawScene(this);
    this.updateCursor();
  }
}
