// Sessões cooperativas com ANFITRIÃO AUTORITATIVO.
//  - O anfitrião roda a simulação. Os convidados só enviam comandos e recebem o estado.
//  - Comandos têm número de sequência: reenvio seguro e proteção contra duplicatas.
//  - Queda de conexão: o assento fica reservado e passa a ser jogado pela IA até a pessoa voltar (token).
import { GardenEngine, type EngineHooks, type EngineOpts, type Snap } from "../game/engine";
import { aiLoadouts, availableDefs, sanitizeLevels, sanitizeLoadout, soloDeck } from "../game/decks";
import { COSMETIC_BY_ID, DEFAULT_AURA, DEFAULT_SHOT } from "../data/cosmetics";
import { DEF_IDS, type DefId } from "../data/defenders";
import { getLevel, type Mod } from "../data/levels";
import { AI_NAMES, CHOICE_MIN_PLAYERS, MAX_PLAYERS, PROTOCOL_VERSION, SEAT_COLORS, sanitizeName, slotsFor } from "../data/rules";
import { ROLE_ORDER, roleOf } from "../data/roles";
import type { Cmd, MatchCfg, Mode, RoleId, SeatCfg } from "../game/types";
import { HOST_ID, randomId, type Bus } from "./bus";

export type LinkStatus = "local" | "connecting" | "connected" | "reconnecting" | "lost" | "closed" | "rejected";
export type Phase = "lobby" | "playing";

export interface Profile {
  name: string;
  role?: RoleId;
  levels: Partial<Record<DefId, number>>;
  aura: string;
  shot: string;
  loadout: DefId[];
}
export interface LobbySeat {
  name: string;
  role: RoleId;
  kind: "human" | "ai";
  color: string;
  loadout: DefId[];
  levels: Partial<Record<DefId, number>>;
  aura: string;
  shot: string;
  connected: boolean;
  ready: boolean;
  local: boolean;
}
export interface LobbyState {
  room: string;
  phase: Phase;
  level: number;
  mode: Mode;
  mods: Mod[];
  emphasis: string[];
  seed: number;
  rewardMul: number;
  allies: number;
  seats: LobbySeat[];
  mid: number;
  choice: boolean;
  slots: number;
}
export interface MatchHandle {
  cfg: MatchCfg;
  mySeat: number;
  isHost: boolean;
  attach(canvas: HTMLCanvasElement, hooks: EngineHooks, opts?: EngineOpts): GardenEngine;
  send(cmd: Cmd): void;
  link(): LinkStatus;
}

const cosmeticOr = (id: unknown, def: string, kind: "aura" | "shot") => (typeof id === "string" && COSMETIC_BY_ID[id]?.kind === kind ? id : def);

interface HSeat {
  peer: string | null;
  token: string;
  name: string;
  role: RoleId;
  kind: "human";
  loadout: DefId[];
  levels: Partial<Record<DefId, number>>;
  aura: string;
  shot: string;
  connected: boolean;
  ready: boolean;
  local: boolean;
  lastSeen: number;
  leftAt: number;
  seen: Set<number>;
  seenQ: number[];
  bucket: number;
  lastRefill: number;
}

/* ============================== ANFITRIÃO ============================== */
export class HostSession {
  readonly room: string;
  bus: Bus | null;
  clock = 0;
  phase: Phase = "lobby";
  level = 1;
  mode: Mode = "campaign";
  mods: Mod[] = [];
  emphasis: string[] = [];
  seed = 1;
  rewardMul = 1;
  allies = 0;
  mid = 0;
  seats: HSeat[] = [];
  byPeer = new Map<string, HSeat>();
  byToken = new Map<string, HSeat>();
  engine: GardenEngine | null = null;
  cfg: MatchCfg | null = null;
  avail: DefId[];
  onLobby: (() => void) | null = null;
  private snapAcc = 0;
  private lobbyAcc = 0;
  private disposed = false;

  constructor(opts: { bus: Bus | null; room: string; profile: Profile; avail: DefId[] }) {
    this.room = opts.room;
    this.bus = opts.bus;
    this.avail = opts.avail;
    this.seats.push(this.newSeat(null, opts.profile, true));
    if (this.bus) this.bus.onmessage = (from, msg) => this.handle(from, msg);
  }

  private newSeat(peer: string | null, p: Partial<Profile>, local: boolean): HSeat {
    const seat: HSeat = {
      peer,
      token: randomId(14, "abcdefghijklmnopqrstuvwxyz0123456789"),
      name: sanitizeName(p.name ?? "Guardião"),
      role: roleOf(p.role, this.seats.length),
      kind: "human",
      loadout: sanitizeLoadout(p.loadout, DEF_IDS, 6),
      levels: sanitizeLevels(p.levels),
      aura: cosmeticOr(p.aura, DEFAULT_AURA, "aura"),
      shot: cosmeticOr(p.shot, DEFAULT_SHOT, "shot"),
      connected: true,
      ready: false,
      local,
      lastSeen: this.clock,
      leftAt: 0,
      seen: new Set(),
      seenQ: [],
      bucket: 30,
      lastRefill: this.clock,
    };
    this.byToken.set(seat.token, seat);
    if (peer) this.byPeer.set(peer, seat);
    return seat;
  }

  get total() {
    return this.seats.length + this.allies;
  }
  get remoteCount() {
    return this.seats.filter((s) => !s.local).length;
  }

  /* ---- configuração da sala (somente no lobby) ---- */
  configure(o: { level?: number; mode?: Mode; mods?: Mod[]; emphasis?: string[]; seed?: number; rewardMul?: number }) {
    if (this.phase !== "lobby") return;
    if (o.level !== undefined) this.level = Math.max(0, Math.min(50, Math.floor(o.level)));
    if (o.mode) this.mode = o.mode;
    if (o.mods) this.mods = o.mods;
    if (o.emphasis) this.emphasis = o.emphasis;
    if (o.seed !== undefined) this.seed = o.seed >>> 0;
    if (o.rewardMul !== undefined) this.rewardMul = o.rewardMul;
    this.broadcastLobby();
  }
  setAllies(n: number) {
    if (this.phase !== "lobby") return;
    this.allies = Math.max(0, Math.min(MAX_PLAYERS - this.seats.length, Math.floor(n)));
    this.broadcastLobby();
  }
  setProfile(p: Partial<Profile>) {
    const me = this.seats[0];
    if (p.name) me.name = sanitizeName(p.name);
    if (p.loadout) me.loadout = sanitizeLoadout(p.loadout, DEF_IDS, 6);
    if (p.levels) me.levels = sanitizeLevels(p.levels);
    if (p.aura) me.aura = cosmeticOr(p.aura, DEFAULT_AURA, "aura");
    if (p.shot) me.shot = cosmeticOr(p.shot, DEFAULT_SHOT, "shot");
    if (p.role && ROLE_ORDER.includes(p.role)) me.role = p.role;
    this.broadcastLobby();
  }

  lobbyState(): LobbyState {
    const seats: LobbySeat[] = this.seats.map((s) => ({ name: s.name, role: s.role, kind: "human", color: "", loadout: s.loadout, levels: s.levels, aura: s.aura, shot: s.shot, connected: s.connected, ready: s.ready, local: s.local }));
    for (let i = 0; i < this.allies; i++) seats.push({ name: AI_NAMES[i % AI_NAMES.length], role: ROLE_ORDER[(this.seats.length + i) % 6], kind: "ai", color: "", loadout: [], levels: {}, aura: DEFAULT_AURA, shot: DEFAULT_SHOT, connected: true, ready: true, local: false });
    seats.forEach((s, i) => (s.color = SEAT_COLORS[i]));
    return { room: this.room, phase: this.phase, level: this.level, mode: this.mode, mods: this.mods, emphasis: this.emphasis, seed: this.seed, rewardMul: this.rewardMul, allies: this.allies, seats, mid: this.mid, choice: this.total >= CHOICE_MIN_PLAYERS, slots: slotsFor(this.total) };
  }
  broadcastLobby() {
    this.onLobby?.();
    if (!this.bus) return;
    const s = this.lobbyState();
    for (const seat of this.seats) if (seat.peer && seat.connected) this.bus.send(seat.peer, { t: "lobby", s });
  }

  /* ---- início da partida ---- */
  start(): MatchCfg | null {
    if (this.phase !== "lobby") return null;
    const total = this.total;
    const choice = total >= CHOICE_MIN_PLAYERS;
    const slots = slotsFor(total);
    const humanLoads: DefId[][] = this.seats.map((s) => (choice ? sanitizeLoadout(s.loadout, DEF_IDS, slots) : []));
    if (!choice) {
      humanLoads[0] = sanitizeLoadout(this.seats[0]?.loadout, this.avail, slots);
      if (!humanLoads[0].length) humanLoads[0] = soloDeck(this.avail, this.level);
    }
    humanLoads.forEach((l, i) => {
      if (!l.length) humanLoads[i] = aiLoadouts(humanLoads.filter((_, j) => j !== i), 1, total, this.avail)[0];
    });
    const ai = aiLoadouts(humanLoads, this.allies, total, this.avail);
    const seats: SeatCfg[] = this.seats.map((s, i) => ({ name: s.name, kind: "human", role: s.role, color: SEAT_COLORS[i], loadout: humanLoads[i], levels: s.levels, aura: s.aura, shot: s.shot }));
    for (let i = 0; i < this.allies; i++) seats.push({ name: AI_NAMES[i % AI_NAMES.length], role: ROLE_ORDER[(this.seats.length + i) % 6], kind: "ai", color: SEAT_COLORS[this.seats.length + i], loadout: ai[i], levels: {}, aura: DEFAULT_AURA, shot: DEFAULT_SHOT });
    this.mid++;
    // fases da campanha trazem os próprios modificadores; o desafio diário usa só os do dia
    const mods: Mod[] = this.mode === "daily" ? this.mods : Array.from(new Set([...(this.mode === "campaign" ? getLevel(this.level).mods : []), ...this.mods]));
    const cfg: MatchCfg = { mid: this.mid, level: this.level, mode: this.mode, seats, seed: (this.seed + this.mid * 7919) >>> 0, mods, emphasis: this.emphasis, rewardMul: this.rewardMul };
    this.engine?.stop();
    this.engine = null;
    this.cfg = cfg;
    this.phase = "playing";
    this.snapAcc = 0;
    for (const s of this.seats) s.ready = false;
    this.sendStartAll();
    this.broadcastLobby();
    return cfg;
  }
  private sendStartAll() {
    if (!this.bus || !this.cfg) return;
    this.seats.forEach((s, i) => s.peer && s.connected && this.bus!.send(s.peer, { t: "start", cfg: this.cfg, seat: i }));
  }

  matchHandle(): MatchHandle {
    const self = this;
    return {
      cfg: this.cfg!,
      mySeat: 0,
      isHost: true,
      attach: (canvas, hooks, opts) => self.attach(canvas, hooks, opts),
      send: (cmd) => void self.engine?.command(0, cmd),
      link: () => (self.bus && self.remoteCount ? "connected" : "local"),
    };
  }

  attach(canvas: HTMLCanvasElement, hooks: EngineHooks, opts: EngineOpts = {}) {
    if (!this.cfg) throw new Error("Partida não iniciada");
    this.engine?.stop();
    const e = new GardenEngine(canvas, this.cfg, hooks, { ...opts, capture: false, mirror: false, mySeat: 0 });
    this.engine = e;
    this.syncEngineSeats();
    return e;
  }
  private syncEngineSeats() {
    const e = this.engine;
    if (!e) return;
    this.seats.forEach((s, i) => e.setSeatState(i, s.connected, !s.connected));
    e.capture = this.remoteCount > 0;
    e.allowPause = !this.seats.some((s) => !s.local && s.connected);
  }

  /* ---- rede ---- */
  handle(from: string, msg: any) {
    if (this.disposed || !msg || typeof msg !== "object") return;
    if (from === "relay") return;
    if (msg.t === "hello") return this.onHello(from, msg);
    const seat = this.byPeer.get(from);
    if (!seat) {
      this.bus?.send(from, { t: "unknown" });
      return;
    }
    seat.lastSeen = this.clock;
    if (!seat.connected) this.reconnectSeat(seat);
    const idx = this.seats.indexOf(seat);
    switch (msg.t) {
      case "ping":
        this.bus?.send(from, { t: "pong", n: msg.n });
        break;
      case "lobby":
        if (this.phase !== "lobby") break;
        if (Array.isArray(msg.loadout)) seat.loadout = sanitizeLoadout(msg.loadout, DEF_IDS, 6);
        if (msg.levels) seat.levels = sanitizeLevels(msg.levels);
        if (msg.aura) seat.aura = cosmeticOr(msg.aura, DEFAULT_AURA, "aura");
        if (msg.shot) seat.shot = cosmeticOr(msg.shot, DEFAULT_SHOT, "shot");
        if (typeof msg.name === "string") seat.name = sanitizeName(msg.name);
        if (typeof msg.role === "string" && ROLE_ORDER.includes(msg.role as RoleId)) seat.role = msg.role as RoleId;
        seat.ready = !!msg.ready;
        this.broadcastLobby();
        break;
      case "cmd": {
        const seq = Number(msg.seq);
        if (!Number.isInteger(seq)) break;
        if (seat.seen.has(seq)) {
          this.bus?.send(from, { t: "ack", seq, ok: true, dup: true });
          break;
        }
        seat.bucket = Math.min(30, seat.bucket + (this.clock - seat.lastRefill) * 30);
        seat.lastRefill = this.clock;
        if (seat.bucket < 1) break; // excesso de comandos: descarta (sem ack, o cliente não reenvia para sempre)
        seat.bucket -= 1;
        seat.seen.add(seq);
        seat.seenQ.push(seq);
        if (seat.seenQ.length > 256) seat.seen.delete(seat.seenQ.shift()!);
        const ok = this.phase === "playing" && !!this.engine && this.engine.command(idx, msg.c as Cmd);
        this.bus?.send(from, { t: "ack", seq, ok });
        break;
      }
      case "need-start":
        if (this.phase === "playing" && this.cfg) this.bus?.send(from, { t: "start", cfg: this.cfg, seat: idx });
        break;
      case "bye":
        this.dropSeat(seat, true);
        break;
    }
  }

  private onHello(from: string, msg: any) {
    if (!this.bus) return;
    if (msg.v !== PROTOCOL_VERSION) {
      this.bus.send(from, { t: "reject", reason: "version" });
      return;
    }
    const ex = (typeof msg.token === "string" ? this.byToken.get(msg.token) : undefined) ?? this.byPeer.get(from);
    if (ex && !ex.local) {
      if (ex.peer && ex.peer !== from) this.byPeer.delete(ex.peer);
      ex.peer = from;
      this.byPeer.set(from, ex);
      ex.lastSeen = this.clock;
      if (!ex.connected) this.reconnectSeat(ex);
      this.bus.send(from, { t: "welcome", seat: this.seats.indexOf(ex), token: ex.token, room: this.room, phase: this.phase });
      if (this.phase === "playing" && this.cfg) this.bus.send(from, { t: "start", cfg: this.cfg, seat: this.seats.indexOf(ex) });
      else this.bus.send(from, { t: "lobby", s: this.lobbyState() });
      return;
    }
    if (this.phase !== "lobby") {
      this.bus.send(from, { t: "reject", reason: "in_progress" });
      return;
    }
    if (this.total >= MAX_PLAYERS) {
      if (this.allies > 0) this.allies--;
      else {
        this.bus.send(from, { t: "reject", reason: "full" });
        return;
      }
    }
    const seat = this.newSeat(from, { name: msg.name, loadout: msg.loadout, levels: msg.levels, aura: msg.aura, shot: msg.shot, role: msg.role }, false);
    this.seats.push(seat);
    this.bus.send(from, { t: "welcome", seat: this.seats.length - 1, token: seat.token, room: this.room, phase: this.phase });
    this.broadcastLobby();
  }

  private reconnectSeat(seat: HSeat) {
    seat.connected = true;
    seat.leftAt = 0;
    const i = this.seats.indexOf(seat);
    if (this.engine) {
      this.engine.setSeatState(i, true, false);
      this.engine.say(i, "voltei! 👋");
    }
    this.syncEngineSeats();
    this.broadcastLobby();
  }

  private dropSeat(seat: HSeat, leaving: boolean) {
    if (seat.local) return;
    if (this.phase === "lobby" && leaving) {
      this.seats = this.seats.filter((s) => s !== seat);
      if (seat.peer) this.byPeer.delete(seat.peer);
      this.byToken.delete(seat.token);
      this.broadcastLobby();
      return;
    }
    seat.connected = false;
    seat.leftAt = this.clock;
    if (this.engine) {
      const i = this.seats.indexOf(seat);
      this.engine.setSeatState(i, false, true);
      this.engine.say(i, "perdi a conexão… a IA assume 🤖");
    }
    this.syncEngineSeats();
    this.broadcastLobby();
  }

  tick(dt: number) {
    if (this.disposed) return;
    this.clock += dt;
    if (this.bus) {
      for (const s of [...this.seats]) {
        if (s.local) continue;
        if (s.connected && this.clock - s.lastSeen > 6) this.dropSeat(s, false);
        else if (!s.connected && this.phase === "lobby" && this.clock - s.leftAt > 10) this.dropSeat(s, true);
      }
    }
    if (this.phase === "playing" && this.engine) {
      this.engine.capture = this.remoteCount > 0;
      if (!this.engine.capture) {
        this.engine.outFx.length = 0;
        this.engine.outSnd.length = 0;
        this.engine.outChat.length = 0;
      }
      this.snapAcc += dt;
      if (this.snapAcc >= 1 / 12 && this.bus) {
        this.snapAcc = 0;
        const targets = this.seats.filter((s) => s.peer && s.connected);
        if (targets.length) {
          const snap: Snap = this.engine.serialize();
          for (const s of targets) this.bus.send(s.peer!, { t: "snap", s: snap });
        }
      }
    } else if (this.phase === "lobby" && this.bus) {
      this.lobbyAcc += dt;
      if (this.lobbyAcc > 1.5) {
        this.lobbyAcc = 0;
        this.broadcastLobby();
      }
    }
  }

  backToLobby() {
    this.engine?.stop();
    this.engine = null;
    this.phase = "lobby";
    for (const s of [...this.seats]) if (!s.local && !s.connected) this.dropSeat(s, true);
    this.broadcastLobby();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.engine?.stop();
    if (this.bus) {
      for (const s of this.seats) if (s.peer) this.bus.send(s.peer, { t: "closed" });
      this.bus.close();
    }
  }
}

/* ============================== CONVIDADO ============================== */
export class ClientSession {
  status: LinkStatus = "connecting";
  reason = "";
  seat = -1;
  token: string;
  readonly room: string;
  lobby: LobbyState | null = null;
  cfg: MatchCfg | null = null;
  engine: GardenEngine | null = null;
  clock = 0;
  onLobby: (() => void) | null = null;
  onStatus: ((s: LinkStatus) => void) | null = null;
  onStart: ((cfg: MatchCfg) => void) | null = null;
  private bus: Bus | null = null;
  private busOpen = false;
  private lastPong = 0;
  private pingAcc = 0;
  private helloAcc = 0;
  private reconnectFrom = 0;
  private connectFrom = 0;
  private needStartAt = -9;
  private seq = 0;
  private pending = new Map<number, { cmd: Cmd; at: number; tries: number }>();
  private pendingSnap: Snap | null = null;
  private profile: Profile;
  private factory: () => Bus;
  private store: Pick<Storage, "getItem" | "setItem"> | null;

  constructor(opts: { factory: () => Bus; room: string; profile: Profile; store?: Pick<Storage, "getItem" | "setItem"> | null }) {
    this.factory = opts.factory;
    this.room = opts.room;
    this.profile = opts.profile;
    this.store = opts.store ?? null;
    this.token = this.store?.getItem("jdf-token-" + opts.room) ?? "";
    this.connect();
  }

  private setStatus(s: LinkStatus, reason = "") {
    if (this.status === s && !reason) return;
    this.status = s;
    this.reason = reason;
    this.onStatus?.(s);
  }

  private connect() {
    this.bus?.close();
    this.busOpen = false;
    try {
      this.bus = this.factory();
    } catch (err) {
      this.setStatus("lost", (err as Error).message);
      return;
    }
    this.bus.onmessage = (from, msg) => from === HOST_ID && this.handle(msg);
    this.bus.onstatus = (s, info) => {
      if (s === "open") {
        this.busOpen = true;
        this.sendHello();
      } else {
        this.busOpen = false;
        if (this.status === "connected") {
          this.reconnectFrom = this.clock;
          this.setStatus("reconnecting");
        } else if (this.status === "connecting") this.setStatus("lost", s === "error" ? info ?? "Falha na conexão" : "Sala não encontrada ou servidor indisponível.");
      }
    };
    this.connectFrom = this.clock;
  }

  private sendHello() {
    const p = this.profile;
    this.bus?.send(HOST_ID, { t: "hello", v: PROTOCOL_VERSION, name: p.name, token: this.token, loadout: p.loadout, levels: p.levels, aura: p.aura, shot: p.shot, role: p.role });
  }

  private handle(msg: any) {
    if (!msg || typeof msg !== "object") return;
    switch (msg.t) {
      case "welcome":
        this.seat = msg.seat;
        this.token = msg.token;
        this.store?.setItem("jdf-token-" + this.room, this.token);
        this.lastPong = this.clock;
        this.setStatus("connected");
        break;
      case "reject":
        this.setStatus("rejected", msg.reason === "full" ? "A sala está cheia." : msg.reason === "in_progress" ? "A partida já começou." : "Versão incompatível do jogo.");
        break;
      case "lobby":
        this.lastPong = this.clock;
        if (this.cfg && msg.s.mid < this.cfg.mid) break; // mensagem antiga (chegou fora de ordem)
        this.lobby = msg.s;
        if (msg.s.phase === "lobby" && this.cfg) {
          this.cfg = null;
          this.engine?.stop();
          this.engine = null;
        }
        this.onLobby?.();
        break;
      case "start":
        this.lastPong = this.clock;
        this.seat = msg.seat ?? this.seat;
        if (!this.cfg || msg.cfg.mid > this.cfg.mid) {
          this.cfg = msg.cfg;
          this.engine?.stop();
          this.engine = null;
          this.pendingSnap = null;
          this.onStart?.(msg.cfg);
        }
        break;
      case "snap": {
        this.lastPong = this.clock;
        if (this.status === "reconnecting") this.setStatus("connected");
        const s = msg.s as Snap;
        if (this.engine) this.engine.applySnap(s);
        else {
          this.pendingSnap = s;
          if (!this.cfg && this.clock - this.needStartAt > 1) {
            this.needStartAt = this.clock;
            this.bus?.send(HOST_ID, { t: "need-start" });
          }
        }
        break;
      }
      case "ack":
        this.pending.delete(msg.seq);
        break;
      case "pong":
        this.lastPong = this.clock;
        if (this.status === "reconnecting") this.setStatus("connected");
        break;
      case "unknown":
        this.sendHello();
        break;
      case "closed":
        this.setStatus("closed", "O anfitrião encerrou a sala.");
        break;
    }
  }

  tick(dt: number) {
    this.clock += dt;
    if (this.status === "closed" || this.status === "rejected" || this.status === "lost") return;
    if (this.status === "connecting") {
      this.helloAcc += dt;
      if (this.busOpen && this.helloAcc > 0.8) {
        this.helloAcc = 0;
        this.sendHello();
      }
      if (this.clock - this.connectFrom > 8) this.setStatus("lost", "Sem resposta do anfitrião. Confira o código da sala.");
      return;
    }
    if (this.status === "connected") {
      this.pingAcc += dt;
      if (this.pingAcc >= 1) {
        this.pingAcc = 0;
        this.bus?.send(HOST_ID, { t: "ping", n: Math.floor(this.clock) });
      }
      if (this.clock - this.lastPong > 6) {
        this.reconnectFrom = this.clock;
        this.setStatus("reconnecting");
      }
    } else if (this.status === "reconnecting") {
      this.helloAcc += dt;
      if (this.helloAcc >= 0.8) {
        this.helloAcc = 0;
        if (!this.busOpen) this.connect();
        else this.sendHello();
      }
      if (this.clock - this.reconnectFrom > 90) this.setStatus("lost", "Não foi possível reconectar.");
    }
    for (const [seq, p] of this.pending) {
      if (this.clock - p.at > 0.5) {
        if (p.tries >= 6) this.pending.delete(seq);
        else {
          p.tries++;
          p.at = this.clock;
          this.bus?.send(HOST_ID, { t: "cmd", seq, c: p.cmd });
        }
      }
    }
  }

  setProfile(p: Partial<Profile> & { ready?: boolean }) {
    this.profile = { ...this.profile, ...p } as Profile;
    this.bus?.send(HOST_ID, { t: "lobby", loadout: this.profile.loadout, levels: this.profile.levels, aura: this.profile.aura, shot: this.profile.shot, name: this.profile.name, role: this.profile.role, ready: !!p.ready });
  }

  send(cmd: Cmd) {
    const seq = ++this.seq;
    this.pending.set(seq, { cmd, at: this.clock, tries: 0 });
    if (this.status === "connected") this.bus?.send(HOST_ID, { t: "cmd", seq, c: cmd });
  }

  matchHandle(): MatchHandle | null {
    if (!this.cfg) return null;
    const self = this;
    return {
      cfg: this.cfg,
      mySeat: this.seat,
      isHost: false,
      attach: (canvas, hooks, opts) => self.attach(canvas, hooks, opts),
      send: (cmd) => self.send(cmd),
      link: () => self.status,
    };
  }

  attach(canvas: HTMLCanvasElement, hooks: EngineHooks, opts: EngineOpts = {}) {
    if (!this.cfg) throw new Error("Partida não iniciada");
    this.engine?.stop();
    const e = new GardenEngine(canvas, this.cfg, hooks, { ...opts, mirror: true, mySeat: this.seat });
    this.engine = e;
    if (this.pendingSnap) e.applySnap(this.pendingSnap);
    return e;
  }

  leave() {
    this.bus?.send(HOST_ID, { t: "bye" });
    this.engine?.stop();
    this.bus?.close();
    this.setStatus("closed");
  }
}

export { availableDefs };
