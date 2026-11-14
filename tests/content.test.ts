// Aceitação da Edição 3.0: conteúdo REAL, não decorativo.
import { DEFENDERS, DEF_BY_ID, PLANT_COUNT, MAX_DEF_LEVEL, defStats } from "../src/data/defenders";
import { ENEMIES, ENEMY_BY_ID, ENEMY_COUNT, WORLD_BOSSES } from "../src/data/enemies";
import { LEVELS, BIOMES, getLevel } from "../src/data/levels";
import { FINAL_LEVEL } from "../src/data/rules";
import { COMBOS } from "../src/data/combos";
import { boardFor } from "../src/data/worlds";
import { availableDefs } from "../src/game/decks";
import { HostSession } from "../src/net/session";
import { GardenEngine } from "../src/game/engine";
import { cellX } from "../src/game/geometry";
import { roleOfSeat, recomputeCombos } from "../src/game/expansion";
import { fakeCanvas } from "./helpers";
import type { MatchCfg, MatchResult, SeatCfg } from "../src/game/types";

let pass = 0, fail = 0;
const ok = (c: boolean, n: string, x = "") => { c ? pass++ : fail++; if (!c) console.log(`  ✘ FALHOU ${n}${x ? " — " + x : ""}`); else console.log(`  ✔ ${n}${x ? " — " + x : ""}`); };
const ALL_ACH = ["caca_asas", "primeira", "mundo1", "mundo2", "mundo3", "mundo4", "rei"];
const avail = availableDefs(50, ALL_ACH);

function cfg(loadout: string[], opts: { levels?: any; role?: any; seed?: number; mirror?: boolean } = {}): MatchCfg {
  const seats: SeatCfg[] = [{ name: "Teste", kind: "human", color: "#fff", loadout, levels: opts.levels ?? {}, aura: "aura_esmeralda", shot: "shot_padrao", role: opts.role }];
  return { mid: 1, level: 25, mode: "campaign", seats, seed: opts.seed ?? 4242, mods: [], emphasis: [], rewardMul: 1 };
}

{
  const selected = ["luminia", "espinheiro", "tronco", "magma", "gelidea", "musgo"] as const;
  const host = new HostSession({
    bus: null,
    room: "TESTE",
    profile: { name: "Teste", levels: {}, aura: "aura_esmeralda", shot: "shot_padrao", loadout: [...selected], role: "comandante" },
    avail,
  });
  host.configure({ level: 2, mode: "campaign" });
  const started = host.start();
  ok(!!started && started.seats[0].loadout.join(",") === selected.join(","), "modo solo respeita o deck escolhido pelo jogador");
  host.dispose();
}

console.log("\n[A] 50 fases / 5 mundos");
ok(LEVELS.length === 50 && FINAL_LEVEL === 50, "exatamente 50 fases cadastradas", `${LEVELS.length}`);
ok(BIOMES.length === 5, "5 mundos temáticos");
BIOMES.forEach((b) => ok(LEVELS.filter((l) => l.world === b.id).length === 10, `mundo ${b.id + 1} tem 10 fases`, b.name));
ok(new Set(BIOMES.map((b) => b.prop)).size === 5, "cada mundo tem cenário próprio", BIOMES.map((b) => b.prop).join(","));
ok(new Set(BIOMES.map((b) => b.sky.join())).size === 5, "cada mundo tem paleta própria");
ok(WORLD_BOSSES.every((id, i) => getLevel((i + 1) * 10).boss === id), "chefe nas fases 10/20/30/40/50", WORLD_BOSSES.join(","));
ok(LEVELS.every((l) => l.board.cells.length > 0 && l.events.length >= 0 && l.waves >= 2 && l.objectives.length === 2 && l.reward > 0), "todas as fases têm tabuleiro, ondas, objetivos e recompensa");
ok(new Set(LEVELS.map((l) => l.board.id)).size >= 45, "tabuleiros variados", `${new Set(LEVELS.map((l) => l.board.id)).size} ids distintos`);
ok(new Set(LEVELS.map((l) => l.board.cells.map((c) => c.kind).join())).size >= 20, "configurações estratégicas diferentes", `${new Set(LEVELS.map((l) => l.board.cells.map((c) => c.kind).join())).size} layouts`);
ok(LEVELS.filter((l) => l.events.length > 0).length >= 40, "eventos dinâmicos na maioria das fases", `${LEVELS.filter((l) => l.events.length > 0).length}`);
ok([0, 1, 2, 3, 4].every((w) => new Set(LEVELS.filter((l) => l.world === w).flatMap((l) => l.board.cells.map((c) => c.kind))).size >= 3), "cada mundo tem 3+ tipos de terreno");
ok(getLevel(50).boss === "devorador_mundos" && getLevel(50).world === 4, "fase 50 é o evento final");

console.log("\n[B] Catálogos");
ok(DEFENDERS.length >= 40 && PLANT_COUNT >= 40, "40+ defensores", `${DEFENDERS.length}`);
ok(ENEMIES.length >= 35 && ENEMY_COUNT >= 35, "35+ inimigos", `${ENEMIES.length}`);
ok(new Set(DEFENDERS.map((d) => d.id)).size === DEFENDERS.length, "ids de plantas únicos");
ok(new Set(ENEMIES.map((e) => e.id)).size === ENEMIES.length, "ids de inimigos únicos");
ok(DEFENDERS.every((d) => d.cost > 0 && d.recharge > 0 && d.hp > 0 && d.power.length > 5 && d.ability && d.form && d.tags.length > 0), "toda planta tem custo, recarga, vida, habilidade, forma e descrição");
ok(ENEMIES.every((z) => z.hp > 0 && z.speed > 0 && z.power.length > 5 && z.form && z.colors.length === 3 && z.intro >= 1), "todo inimigo tem vida, velocidade, poder, forma e cor");
ok(ENEMIES.filter((z) => z.boss).length >= 5, "5+ chefes com etapas", `${ENEMIES.filter((z) => z.boss).length}`);
ok(ENEMIES.filter((z) => z.boss).every((z) => z.boss!.thresholds.length >= 2 && z.boss!.summons.length > 0), "chefes têm múltiplas etapas e invocações");
ok(new Set(DEFENDERS.flatMap((d) => d.tags)).size >= 10, "tags variadas para sinergias");
ok(COMBOS.length >= 5, "regras de combinação", `${COMBOS.length}`);

console.log(`\n[C] Cada uma das ${DEFENDERS.length} plantas é plantável e executa sua habilidade`);
let plantFails: string[] = [];
for (const d of DEFENDERS) {
  try {
    const sounds: string[] = [];
    const e = new GardenEngine(fakeCanvas(), cfg([d.id]), { onSound: (n) => sounds.push(n) });
    e.queue = [{ t: 1e9, type: "cinzento", row: 0 }];
    e.waveIdx = e.waves;
    e.sun = 9999;
    e.spawnEnemy("cinzento", 2, cellX(6));
    const enemy = e.enemies[0];
    const enemyHp0 = enemy.hp;
    const sun0 = e.sun;
    const planted = e.command(0, { k: "plant", d: d.id, col: 1, row: 2 });
    const p = e.plants[0];
    for (let i = 0; i < 500; i++) e.update(0.05); // 25 s
    const enemyAlive = e.enemies.find((z) => z.id === enemy.id);
    const effect =
      !enemyAlive || (enemyAlive && enemyAlive.hp < enemyHp0 - 1) ||
      e.sun > sun0 - d.cost + 1 || e.suns.length > 0 ||
      (p && (p.hp < p.maxHp - 1 || p.stored > 0 || p.charge > 0)) ||
      e.plants.length > 1 || e.projs.length > 0 || sounds.length > 0 ||
      (enemyAlive && enemyAlive.x > cellX(6) + 30 && enemyAlive.charmedT > 0);
    if (!planted || !effect) plantFails.push(d.id + (planted ? " (sem efeito)" : " (não plantou)"));
  } catch (err) {
    plantFails.push(d.id + " (EXCEÇÃO " + (err as Error).message + ")");
  }
}
ok(plantFails.length === 0, "todas as plantas funcionam na partida", plantFails.length ? plantFails.join(", ") : `${DEFENDERS.length}/${DEFENDERS.length}`);

console.log("\n[D] Cada inimigo aparece e se comporta");
let enemyFails: string[] = [];
for (const z of ENEMIES) {
  try {
    const e = new GardenEngine(fakeCanvas(), cfg(["espinheiro"]), {});
    e.queue = [{ t: 1e9, type: "cinzento", row: 0 }];
    e.waveIdx = e.waves;
    e.spawnEnemy(z.id, 2, 600);
    const en = e.enemies[0];
    const x0 = en.x;
    for (let i = 0; i < 160; i++) e.update(0.05); // 8 s
    const now = e.enemies.find((q) => q.id === en.id);
    const moved = !now || Math.abs(now.x - x0) > 3 || now.attacking || now.hp < en.maxHp || now.phase > 0;
    if (!moved) enemyFails.push(z.id);
  } catch (err) {
    enemyFails.push(z.id + " (EXCEÇÃO " + (err as Error).message + ")");
  }
}
ok(enemyFails.length === 0, "todos os inimigos se movem/agam", enemyFails.length ? enemyFails.join(", ") : `${ENEMIES.length}/${ENEMIES.length}`);

console.log("\n[E] Chefias, evolução, combinações, papéis e sincronização");
{
  const e = new GardenEngine(fakeCanvas(), cfg(["espinheiro"]), {});
  e.queue = [{ t: 1e9, type: "cinzento", row: 0 }]; e.waveIdx = e.waves;
  e.spawnEnemy("devorador_mundos", 2, 700);
  const boss = e.enemies[0];
  boss.hp = boss.maxHp * 0.7;
  e.update(0.05);
  ok(boss.phase >= 1, "chefe muda de etapa ao perder vida", `etapa ${boss.phase}`);
  boss.hp = boss.maxHp * 0.1;
  e.update(0.05);
  ok(boss.enrage, "chefe enfurece na etapa final");
  ok(ENEMY_BY_ID["devorador_mundos"].boss!.thresholds.length === 4, "chefe final tem 4 limiares");
}
{
  const e = new GardenEngine(fakeCanvas(), cfg(["espinheiro"], { levels: { espinheiro: 5 } }), {});
  e.sun = 9999;
  e.command(0, { k: "plant", d: "espinheiro", col: 1, row: 2 });
  const p = e.plants[0];
  ok(p.lv === MAX_DEF_LEVEL && MAX_DEF_LEVEL === 5, "evolução até nível 5");
  ok(p.dmg > defStats(DEF_BY_ID.espinheiro, 1).dmg && p.hp > DEF_BY_ID.espinheiro.hp, "evolução altera atributos", `${p.dmg} dmg / ${p.hp} hp`);
}
{
  const e = new GardenEngine(fakeCanvas(), cfg(["lirio_eletrico", "raiz_cristalina"]), {});
  e.sun = 9999;
  e.command(0, { k: "plant", d: "lirio_eletrico", col: 2, row: 2 });
  e.command(0, { k: "plant", d: "raiz_cristalina", col: 3, row: 2 });
  recomputeCombos(e);
  ok(e.comboLinks.length > 0 && e.stats.combos > 0, "combinação elétrica + aquática ativa", e.comboNames.join(","));
  ok(e.comboNames.includes("Condutividade"), "sinergia nomeada aparece no HUD");
}
{
  const e = new GardenEngine(fakeCanvas(), cfg(["espinheiro"], { role: "atirador" }), {});
  ok(roleOfSeat(e, 0) === "atirador", "função cooperativa aplicada");
  const e2 = new GardenEngine(fakeCanvas(), cfg(["espinheiro"], { role: "guarda" }), {});
  e.sun = e2.sun = 9999;
  e.command(0, { k: "plant", d: "espinheiro", col: 1, row: 2 });
  e2.command(0, { k: "plant", d: "espinheiro", col: 1, row: 2 });
  ok(e2.plants[0].hp > e.plants[0].hp, "bônus de função muda atributos", `${e.plants[0].hp} vs ${e2.plants[0].hp}`);
}
{
  const host = new GardenEngine(fakeCanvas(), cfg(["lirio_eletrico", "raiz_cristalina", "espinheiro"]), {}, { capture: true });
  host.sun = 9999;
  host.command(0, { k: "plant", d: "lirio_eletrico", col: 2, row: 2 });
  host.command(0, { k: "plant", d: "raiz_cristalina", col: 3, row: 2 });
  host.spawnEnemy("cinzento", 2, 600);
  const snap = host.serialize();
  const mirror = new GardenEngine(fakeCanvas(), cfg(["lirio_eletrico", "raiz_cristalina", "espinheiro"]), {}, { mirror: true });
  mirror.applySnap(snap);
  ok(mirror.comboLinks.length === host.comboLinks.length && mirror.enemies.length === host.enemies.length, "estado novo (sinergias/inimigos) sincronizado no espelho");
  ok(mirror.plants.length === host.plants.length && Math.floor(mirror.sun) === Math.floor(host.sun), "plantas e seiva sincronizadas");
}
{
  const saved = JSON.parse(JSON.stringify(getLevel(50).board));
  ok(JSON.stringify(boardFor(50, 4242)) === JSON.stringify(boardFor(50, 4242)), "tabuleiro determinístico pela semente");
  ok(saved.portals.length > 0, "fase 50 tem portais de entrada");
}
console.log(`\nRESULTADO: ${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
