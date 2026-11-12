// Camada de transporte. O jogo só conhece a interface `Bus`; o meio físico é intercambiável.
//  - MemoryHub:    em memória, com latência/perda/duplicação simuladas (usado nos testes).
//  - BroadcastBus: entre abas/janelas do MESMO navegador (sem servidor). NÃO é online.
//  - WebSocketBus: online de verdade, via servidor relay (server/relay.mjs) que VOCÊ hospeda.
export type BusStatus = "open" | "closed" | "error";

export interface Bus {
  readonly id: string;
  send(to: string, msg: unknown): void;
  onmessage: ((from: string, msg: any) => void) | null;
  onstatus: ((s: BusStatus, info?: string) => void) | null;
  close(): void;
}

export type BusKind = "tabs" | "relay";

export const HOST_ID = "host";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function randomId(n: number, alphabet = ALPHA) {
  const out: string[] = [];
  const buf = new Uint32Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 4294967296);
  for (let i = 0; i < n; i++) out.push(alphabet[buf[i] % alphabet.length]);
  return out.join("");
}
export const makeRoomCode = () => randomId(5);
export const makePeerId = () => "p" + randomId(8, "abcdefghijklmnopqrstuvwxyz0123456789");

/* ------------------------------ memória (testes) ------------------------------ */
class MemoryBus implements Bus {
  onmessage: Bus["onmessage"] = null;
  onstatus: Bus["onstatus"] = null;
  constructor(readonly id: string, private hub: MemoryHub) {}
  send(to: string, msg: unknown) {
    this.hub.enqueue(this.id, to, msg);
  }
  close() {
    this.hub.buses.delete(this.id);
  }
}

export class MemoryHub {
  now = 0;
  seq = 0;
  latency = 0.04;
  jitter = 0.02;
  drop = 0;
  dup = 0;
  buses = new Map<string, MemoryBus>();
  cut = new Set<string>();
  queue: { at: number; seq: number; from: string; to: string; msg: any }[] = [];
  private s = 1;
  rnd = () => {
    this.s = (this.s * 1664525 + 1013904223) >>> 0;
    return this.s / 4294967296;
  };
  bus(id: string): Bus {
    const b = new MemoryBus(id, this);
    this.buses.set(id, b);
    setTimeout(() => b.onstatus?.("open"), 0);
    return b;
  }
  enqueue(from: string, to: string, msg: unknown) {
    if (this.cut.has(from) || this.cut.has(to)) return;
    if (this.rnd() < this.drop) return;
    const copy = JSON.parse(JSON.stringify(msg));
    const at = this.now + this.latency + this.rnd() * this.jitter;
    this.queue.push({ at, seq: this.seq++, from, to, msg: copy });
    if (this.rnd() < this.dup) this.queue.push({ at: at + 0.03 + this.rnd() * 0.05, seq: this.seq++, from, to, msg: JSON.parse(JSON.stringify(msg)) });
  }
  advance(dt: number) {
    this.now += dt;
    for (;;) {
      const due = this.queue.filter((q) => q.at <= this.now).sort((a, b) => a.at - b.at || a.seq - b.seq);
      if (!due.length) break;
      this.queue = this.queue.filter((q) => q.at > this.now);
      for (const q of due) {
        if (this.cut.has(q.from) || this.cut.has(q.to)) continue;
        this.buses.get(q.to)?.onmessage?.(q.from, q.msg);
      }
    }
  }
}

/* ------------------------------ abas do mesmo navegador ------------------------------ */
export class BroadcastBus implements Bus {
  onmessage: Bus["onmessage"] = null;
  onstatus: Bus["onstatus"] = null;
  private ch: BroadcastChannel;
  constructor(readonly id: string, room: string) {
    this.ch = new BroadcastChannel("jdf-room-" + room);
    this.ch.onmessage = (ev) => {
      const d = ev.data;
      if (!d || (d.to !== this.id && d.to !== "*")) return;
      this.onmessage?.(d.f, d.m);
    };
    setTimeout(() => this.onstatus?.("open"), 0);
  }
  send(to: string, msg: unknown) {
    this.ch.postMessage({ f: this.id, to, m: msg });
  }
  close() {
    this.ch.close();
  }
}

/* ------------------------------ WebSocket (relay online) ------------------------------ */
export class WebSocketBus implements Bus {
  onmessage: Bus["onmessage"] = null;
  onstatus: Bus["onstatus"] = null;
  private ws: WebSocket;
  constructor(readonly id: string, base: string, room: string, role: "host" | "guest", WS: typeof WebSocket = WebSocket) {
    const sep = base.includes("?") ? "&" : "?";
    this.ws = new WS(`${base}${sep}room=${encodeURIComponent(room)}&id=${encodeURIComponent(id)}&role=${role}`);
    this.ws.onopen = () => this.onstatus?.("open");
    this.ws.onclose = () => this.onstatus?.("closed");
    this.ws.onerror = () => this.onstatus?.("error", "Falha ao conectar no servidor relay");
    this.ws.onmessage = (ev: MessageEvent) => {
      try {
        const d = JSON.parse(String(ev.data));
        if (d && typeof d.f === "string") this.onmessage?.(d.f, d.m);
      } catch {
        /* mensagem inválida: ignora */
      }
    };
  }
  send(to: string, msg: unknown) {
    if (this.ws.readyState === 1) this.ws.send(JSON.stringify({ to, m: msg }));
  }
  close() {
    try {
      this.ws.close();
    } catch {
      /* já fechado */
    }
  }
}

export function createBus(kind: BusKind, room: string, id: string, role: "host" | "guest", relayUrl: string): Bus {
  if (kind === "relay") {
    if (!/^wss?:\/\//i.test(relayUrl)) throw new Error("Informe o endereço do servidor relay (ws:// ou wss://).");
    return new WebSocketBus(id, relayUrl, room, role);
  }
  if (typeof BroadcastChannel === "undefined") throw new Error("Este navegador não suporta salas entre abas.");
  return new BroadcastBus(id, room);
}
