// Teste do caminho ONLINE REAL: sessões do jogo sobre WebSocket, passando por server/relay.mjs (TCP em localhost).
declare const require: any;
import { WebSocketBus, makePeerId } from "../src/net/bus";
import { ClientSession, HostSession, type Profile } from "../src/net/session";
import { availableDefs } from "../src/game/decks";
import { fakeCanvas } from "./helpers";
// @ts-ignore
import { server } from "../server/relay.mjs";

const WS = require("/tmp/pw/node_modules/ws");
let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x = "") => { c ? pass++ : fail++; console.log(`${c ? "  ✔" : "  ✘ FALHOU"} ${n}${x ? " — " + x : ""}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PORT = 18787;
const URL_ = `ws://127.0.0.1:${PORT}`;
const prof = (name: string, loadout: any[]): Profile => ({ name, levels: {}, aura: "aura_esmeralda", shot: "shot_padrao", loadout });

async function main() {
  await new Promise<void>((r) => server.listen(PORT, r));
  const avail = availableDefs(20, []);
  console.log("\n[R1] Sala online via relay (WebSocket real)");
  const host = new HostSession({ bus: new WebSocketBus("host", URL_, "ROOM1", "host", WS), room: "ROOM1", profile: prof("Anfitrião", ["luminia", "espinheiro", "tronco"]), avail });
  await sleep(150);
  const mk = (n: string, loadout: any[]) => new ClientSession({ factory: () => new WebSocketBus(makePeerId(), URL_, "ROOM1", "guest", WS), room: "ROOM1", profile: prof(n, loadout) });
  const a = mk("Ana", ["luminia", "gelidea", "cipo"]);
  const b = mk("Beto", ["luminia", "espinheiro", "musgo"]);
  const timer = setInterval(() => { host.tick(0.02); a.tick(0.02); b.tick(0.02); host.engine?.update(0.02); a.engine?.update(0.02); b.engine?.update(0.02); }, 20);
  await sleep(1200);
  ok(a.status === "connected" && b.status === "connected", "convidados conectados pelo relay", `${a.status},${b.status}`);
  ok(host.seats.length === 3 && a.lobby?.seats.length === 3, "lobby sincronizado entre 3 pessoas", String(a.lobby?.seats.length));

  const lone = new ClientSession({ factory: () => new WebSocketBus(makePeerId(), URL_, "NOHOST", "guest", WS), room: "NOHOST", profile: prof("X", []) });
  await sleep(300);
  const noHostStatus = lone.status;
  clearTimeout(0);
  ok(noHostStatus === "lost" && lone.reason.includes("Sala não encontrada"), "sala inexistente falha rápido com mensagem clara", noHostStatus + " / " + lone.reason);

  host.start();
  await sleep(500);
  ok(!!a.cfg && !!b.cfg && a.cfg.mid === host.cfg!.mid, "partida iniciada para todos");
  host.attach(fakeCanvas(), {}, {});
  a.attach(fakeCanvas(), {}, {});
  b.attach(fakeCanvas(), {}, {});
  host.engine!.sun = 5000;
  a.send({ k: "plant", d: "gelidea", col: 1, row: 0 });
  b.send({ k: "plant", d: "musgo", col: 2, row: 3 });
  await sleep(1500);
  const e = host.engine!;
  ok(e.plants.some((p) => p.type === "gelidea") && e.plants.some((p) => p.type === "musgo"), "ações dos convidados chegaram ao anfitrião pela rede");
  ok(a.engine!.plants.length === e.plants.length && b.engine!.plants.length === e.plants.length, "todos veem as mesmas plantas", `${a.engine!.plants.length}/${b.engine!.plants.length}/${e.plants.length}`);

  console.log("\n[R2] Queda real de socket e reconexão");
  const seatA = a.seat;
  const tokenA = (a as any).token;
  (a as any).bus.ws.terminate();
  await sleep(600);
  ok(a.status === "reconnecting", "convidado detecta o socket morto", a.status);
  await sleep(3500);
  ok(a.status === "connected" && a.seat === seatA && (a as any).token === tokenA, "reconectou ao mesmo assento", `${a.status} seat=${a.seat}`);
  e.sun = 9999;
  a.send({ k: "plant", d: "cipo", col: 0, row: 0 });
  await sleep(1200);
  ok(e.plants.some((p) => p.type === "cipo" && p.owner === seatA), "volta a jogar depois de reconectar", `plantas=${e.plants.map((p) => p.type + ":" + p.owner).join(",")} pendentes=${(a as any).pending.size} status=${a.status}`);

  console.log("\n[R3] Anfitrião encerra");
  host.dispose();
  await sleep(500);
  ok(["closed", "reconnecting", "lost"].includes(b.status), "convidados notam o fim da sala", b.status);
  clearInterval(timer);
  console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
  process.exit(fail ? 1 : 0);
}
main();
