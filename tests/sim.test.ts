// Simulação de equilíbrio: 20 fases × (1, 3, 6 participantes) com aliados IA.
import { levelMult, playerMult } from "../src/data/rules";
import { LEVELS } from "../src/data/levels";
import { makeCfg, simulate } from "./helpers";

const RUNS = Number(process.env.RUNS ?? 3);
let stalls = 0;
let crashes = 0;
const rows: string[] = [];
for (const seats of [1, 3, 6]) {
  for (const L of LEVELS.map((l) => l.n)) {
    let wins = 0;
    let stall = 0;
    let time = 0;
    let stars = 0;
    for (let r = 0; r < RUNS; r++) {
      try {
        const { result, t } = simulate(makeCfg(L, seats, { seed: 1000 * L + r }));
        if (!result) stall++;
        else {
          if (result.win) wins++;
          stars += result.stars;
        }
        time += t;
      } catch (err) {
        crashes++;
        console.log("CRASH", seats, L, (err as Error).stack);
      }
    }
    stalls += stall;
    rows.push(`seats=${seats} L${String(L).padStart(2)} ameaça×${(levelMult(L) * playerMult(seats)).toFixed(2)} vitórias=${wins}/${RUNS} travadas=${stall} tempoMed=${Math.round(time / RUNS)}s estrelasMed=${(stars / RUNS).toFixed(1)}`);
  }
}
console.log(rows.join("\n"));
console.log(`\nTRAVAMENTOS: ${stalls} | EXCEÇÕES: ${crashes}`);
process.exit(stalls || crashes ? 1 : 0);
