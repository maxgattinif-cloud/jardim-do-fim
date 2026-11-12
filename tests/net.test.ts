// Testes do multiplayer: protocolo autoritativo sobre um barramento em memória com latência, perda e duplicação.
import { MemoryHub } from "../src/net/bus";
import { ClientSession, HostSession, type Profile } from "../src/net/session";
import { availableDefs } from "../src/game/decks";
import { fakeCanvas } from "./helpers";
import { cellX } from "../src/game/geometry";

let pass = 0;
let fail = 0;
const ok = (cond: boolean, name: string, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  ✔" : "  ✘ FALHOU"} ${name}${extra ? " — " + extra : ""}`);
};
const tick = () => new Promise((r) => setTimeout(r, 5));
const prof = (name: string, loadout: any[] = ["luminia", "espinheiro", "tronco"]): Profile => ({ name, levels: {}, aura: "aura_esmeralda", shot: "shot_padrao", loadout });
const avail = availableDefs(20, ["caca_asas"]);

function world(opts: { drop?: number; dup?: number } = {}) {
  const hub = new MemoryHub();
  hub.drop = opts.drop ?? 0;
  hub.dup = opts.dup ?? 0;
  const host = new HostSession({ bus: hub.bus("host"), room: "TEST1", profile: prof("Anfitrião"), avail });
  const clients: ClientSession[] = [];
  const engines = new Map<ClientSession, any>();
  const join = (name: string, id: string, loadout?: any[]) => {
    const c = new ClientSession({ factory: () => hub.bus(id), room: "TEST1", profile: prof(name, loadout) });
    clients.push(c);
    return c;
  };
  const step = (secs: number, dt = 0.02) => {
    for (let t = 0; t < secs; t += dt) {
      host.tick(dt);
      clients.forEach((c) => c.tick(dt));
      hub.advance(dt);
      host.engine?.update(dt);
      clients.forEach((c) => c.engine?.update(dt));
    }
  };
  const attachAll = () => {
    host.attach(fakeCanvas(), {}, {});
    for (const c of clients) if (c.cfg) engines.set(c, c.attach(fakeCanvas(), {}, {}));
  };
  /** força um snapshot final e compara o estado exato do anfitrião com o de cada cliente */
  const syncCheck = () => {
    host.tick(1 / 12 + 0.001);
    hub.advance(0.3);
    const h = host.engine!;
    return clients.filter((c) => c.engine).map((c) => {
      const e = c.engine!;
      const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
      return { name: c.lobby?.seats[c.seat]?.name, plants: same(h.plants.map((p) => p.id).sort(), e.plants.map((p) => p.id).sort()), enemies: same(h.enemies.map((p) => p.id).sort(), e.enemies.map((p) => p.id).sort()), sun: h.sun === e.sun || Math.floor(h.sun) === e.sun, suns: h.suns.length === e.suns.length, status: h.status === e.status };
    });
  };
  return { hub, host, clients, join, step, attachAll, syncCheck, engines };
}

async function main() {
  console.log("\n[1] Lobby: entrada, identificação e saída");
  {
    const w = world();
    const a = w.join("Ana", "pA");
    const b = w.join("Beto", "pB");
    await tick();
    w.step(1);
    ok(w.host.seats.length === 3, "anfitrião tem 3 participantes", String(w.host.seats.length));
    ok(a.status === "connected" && b.status === "connected", "convidados conectados");
    ok(a.lobby?.seats.length === 3 && [...a.lobby.seats.map((s) => s.name)].sort().join() === "Ana,Anfitrião,Beto" && a.lobby.seats.map((s) => s.name).join() === b.lobby?.seats.map((s) => s.name).join(), "todos veem a mesma lista", a.lobby?.seats.map((s) => s.name).join());
    ok(new Set(a.lobby!.seats.map((s) => s.color)).size === 3, "cada participante tem cor própria");
    ok(a.lobby!.seats[a.seat].name === "Ana" && b.lobby!.seats[b.seat].name === "Beto" && a.seat !== b.seat, "cada um sabe qual é o seu assento", `${a.seat},${b.seat}`);
    b.leave();
    w.step(0.5);
    ok(w.host.seats.length === 2, "saída remove o participante do lobby", String(w.host.seats.length));
    ok(a.lobby?.seats.length === 2, "os demais veem a saída");
  }

  console.log("\n[2] Lotação máxima (6) e versões");
  {
    const w = world();
    const cs = ["b", "c", "d", "e", "f", "g"].map((n) => w.join(n, "p" + n));
    await tick();
    w.step(1.5);
    ok(w.host.seats.length === 6, "sala aceita no máximo 6", String(w.host.seats.length));
    ok(cs.filter((c) => c.status === "rejected").length === 1, "o 7º é recusado com motivo", cs.map((c) => c.status).join());
    ok(cs.find((c) => c.status === "rejected")?.reason === "A sala está cheia.", "mensagem 'sala cheia'");
    let got: any = null;
    const raw = w.hub.bus("pX");
    raw.onmessage = (_f, m) => (got = m);
    raw.send("host", { t: "hello", v: 99, name: "x" });
    w.step(0.3);
    ok(got?.t === "reject" && got.reason === "version", "versão incompatível é recusada");
  }

  console.log("\n[3] Partida: sincronização de estado entre todos");
  {
    const w = world();
    const a = w.join("Ana", "pA", ["luminia", "espinheiro", "tronco"]);
    const b = w.join("Beto", "pB", ["luminia", "gelidea", "cipo"]);
    await tick();
    w.step(1);
    w.host.setAllies(1);
    w.step(0.3);
    ok(a.lobby?.seats.length === 4 && a.lobby.seats[3].kind === "ai", "aliado IA aparece identificado como IA");
    let started = 0;
    a.onStart = () => started++;
    b.onStart = () => started++;
    w.host.start();
    w.step(0.5);
    ok(started === 2, "todos recebem o início da partida");
    ok(a.cfg?.mid === b.cfg?.mid && a.cfg?.seed === w.host.cfg?.seed, "mesma partida e mesma semente");
    w.attachAll();
    w.step(0.5);
    ok(w.host.cfg!.seats.map((s) => s.kind).join() === "human,human,human,ai", "assentos: 3 humanos + 1 IA");
    const e = w.host.engine!;
    e.sun = 3000;
    a.send({ k: "plant", d: "luminia", col: 0, row: 1 });
    b.send({ k: "plant", d: "gelidea", col: 2, row: 2 });
    w.step(1);
    ok(e.plants.some((p) => p.type === "luminia" && p.owner === a.seat) && e.plants.some((p) => p.type === "gelidea" && p.owner === b.seat), "comandos dos convidados executados no seat certo");
    w.step(40);
    ok(e.enemies.length + e.stats.kills > 0, "partida segue simulando", `inimigos=${e.enemies.length} abates=${e.stats.kills}`);
    const r = w.syncCheck();
    ok(r.every((x) => x.plants && x.enemies && x.sun && x.suns), "plantas, inimigos, seiva e sóis idênticos em todos", JSON.stringify(r));
    ok(a.engine!.sun === Math.floor(e.sun), "seiva (recurso) sincronizada", `${a.engine!.sun} vs ${Math.floor(e.sun)}`);
  }

  console.log("\n[4] Proteção contra duplicatas e comandos inválidos");
  {
    const w = world({ dup: 0.9 });
    const a = w.join("Ana", "pA", ["luminia", "espinheiro", "tronco"]);
    const b = w.join("Beto", "pB", ["luminia", "gelidea", "cipo"]);
    await tick();
    w.step(1.5);
    w.host.start();
    w.step(0.6);
    w.attachAll();
    const e = w.host.engine!;
    e.sun = 1000;
    const before = e.sun;
    a.send({ k: "plant", d: "luminia", col: 0, row: 0 });
    w.step(2);
    ok(e.stats.planted === 1, "mensagens duplicadas (90%) plantam só uma vez", `plantadas=${e.stats.planted}`);
    ok(Math.floor(before - e.sun) <= 50 + 25, "custo cobrado uma única vez", `gasto=${Math.floor(before - e.sun)}`);
    const n = e.plants.length;
    a.send({ k: "plant", d: "luminia", col: 0, row: 0 });
    w.step(1);
    ok(e.plants.length === n, "casa ocupada recusa plantio");
    a.send({ k: "plant", d: "gelidea", col: 3, row: 1 });
    w.step(1);
    ok(!e.plants.some((p) => p.type === "gelidea"), "defensor fora da mão do jogador é recusado");
    a.send({ k: "plant", d: "tronco", col: NaN as any, row: 1 });
    a.send({ k: "plant", d: "hack" as any, col: 1, row: 1 });
    a.send({ k: "plant", d: "tronco", col: 99, row: -4 });
    a.send({ k: "sun", id: -1 });
    w.step(1);
    ok(e.plants.length === n, "valores forjados (NaN, id falso, fora do mapa) não têm efeito");
    b.send({ k: "dig", col: 0, row: 0 });
    w.step(1);
    ok(e.plants.some((p) => p.col === 0 && p.row === 0), "não é possível remover a planta de outro humano");
    for (let i = 0; i < 80; i++) b.send({ k: "chat", text: "spam" + i });
    w.step(1);
    ok(true, "inundação de comandos não derruba o anfitrião");
  }

  console.log("\n[5] Rede ruim: 25% de perda + 20% de duplicação");
  {
    const w = world({ drop: 0.25, dup: 0.2 });
    const a = w.join("Ana", "pA", ["luminia", "espinheiro", "tronco"]);
    await tick();
    w.step(6);
    ok(a.status === "connected", "entra mesmo com perda de pacotes", a.status);
    w.host.setAllies(1);
    w.step(1);
    w.host.start();
    w.step(5);
    ok(!!a.cfg, "início da partida chega ao convidado (via reenvio)");
    w.attachAll();
    w.step(0.5);
    const e = w.host.engine!;
    e.sun = 9999;
    (["luminia", "espinheiro", "tronco"] as const).forEach((d, i) => a.send({ k: "plant", d, col: i, row: 2 }));
    w.step(8);
    const mine = e.plants.filter((p) => p.owner === a.seat).length;
    ok(mine === 3, "os 3 comandos chegam apesar da perda (reenvio) e sem repetir", `plantas da Ana=${mine}/3`);
    ok((a as any).pending.size === 0, "todos os comandos foram confirmados (ack)");
    const r = w.syncCheck();
    ok(r.every((x) => x.plants && x.sun), "estado converge mesmo com perda", JSON.stringify(r));
  }

  console.log("\n[6] Queda de conexão e reconexão");
  {
    const w = world();
    const a = w.join("Ana", "pA", ["luminia", "espinheiro", "tronco"]);
    const b = w.join("Beto", "pB", ["luminia", "gelidea", "cipo"]);
    await tick();
    w.step(1.5);
    w.host.start();
    w.step(0.6);
    w.attachAll();
    w.step(3);
    const seatA = a.seat;
    const tokenA = (a as any).token;
    w.hub.cut.add("pA");
    w.step(8);
    ok(a.status === "reconnecting", "convidado percebe a queda", a.status);
    ok(!w.host.seats[seatA].connected && w.host.engine!.seats[seatA].autopilot, "anfitrião detecta e a IA assume o assento", `conectado=${w.host.seats[seatA].connected}`);
    ok(b.status === "connected", "os outros jogadores seguem normalmente");
    ok(w.host.engine!.status === 0, "a partida não é interrompida");
    w.hub.cut.delete("pA");
    w.step(5);
    ok(a.status === "connected", "reconecta sozinho", a.status);
    ok(a.seat === seatA && (a as any).token === tokenA, "volta ao MESMO assento com o MESMO token");
    ok(w.host.seats[seatA].connected && !w.host.engine!.seats[seatA].autopilot, "controle devolvido ao jogador");
    const r = w.syncCheck();
    ok(r.every((x) => x.plants && x.enemies), "estado idêntico após reconectar", JSON.stringify(r));
    a.send({ k: "plant", d: "luminia", col: 1, row: 4 });
    w.host.engine!.sun = 999;
    w.step(1);
    ok(w.host.engine!.plants.some((p) => p.col === 1 && p.row === 4 && p.owner === seatA), "volta a jogar normalmente");
  }

  console.log("\n[7] Fim de partida e encerramento da sala");
  {
    const w = world();
    const a = w.join("Ana", "pA", ["luminia", "espinheiro", "tronco"]);
    await tick();
    w.step(1.5);
    w.host.setAllies(1);
    w.host.start();
    w.step(0.6);
    w.attachAll();
    let res: any = null;
    ok(!!a.engine, "convidado tem a partida aberta", `${a.status} cfg=${!!a.cfg}`);
    a.engine!.hooks.onEnd = (r) => (res = r);
    w.step(1);
    w.host.engine!.finish(true);
    w.step(0.6);
    ok(res?.win === true && res.score === w.host.engine!.result!.score, "resultado idêntico para todos", `${res?.score}`);
    w.host.backToLobby();
    w.step(0.6);
    ok(a.lobby?.phase === "lobby" && !a.cfg, "todos voltam ao lobby juntos");
    w.host.dispose();
    w.step(0.3);
    ok(a.status === "closed", "convidados são avisados quando o anfitrião encerra", a.status);
  }

  console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
void cellX;
main();
