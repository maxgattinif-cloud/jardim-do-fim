import { useState } from "react";
import { ENEMY_BY_ID } from "../data/enemies";
import { BIOMES, LEVELS, MOD_INFO, objectiveEval, type LevelDef } from "../data/levels";
import { levelMult } from "../data/rules";
import { Btn, Chip, Screen, Sprite } from "./common";
import { useSave } from "./SaveContext";

const ZERO = { kills: 0, airKills: 0, seivaCollected: 0, sunClicks: 0, planted: 0, plantedBy: {}, classesUsed: 0, plantsLost: 0, guardsUsed: 0, bossKilled: false, combos: 0, events: 0, bySeat: [] };

export function CampaignScreen({ onBack, onSolo }: { onBack: () => void; onSolo: (n: number) => void }) {
  const { save, unlockedLevel } = useSave();
  const [sel, setSel] = useState(Math.min(50, unlockedLevel));
  const L: LevelDef = LEVELS[sel - 1];
  const biome = BIOMES[L.biome];
  const enemy = L.newEnemy ?? L.boss;
  const e = enemy ? ENEMY_BY_ID[enemy] : null;

  return (
    <Screen title="Campanha" subtitle="50 fases · 5 mundos · um chefe a cada 10 fases" onBack={onBack} wide>
      <div className="mt-3 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          {BIOMES.map((b) => (
            <section key={b.id} className="glass rounded-2xl p-3 sm:p-4" style={{ boxShadow: `inset 0 0 0 1px ${b.accent}33` }}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-xl sm:text-2xl" style={{ color: b.accent }}>
                  {b.name}
                </h2>
                <span className="text-right text-[11px] text-white/50">
                  Fases {b.levels[0]}–{b.levels[1]}<br />
                  👑 {b.boss}
                  {unlockedLevel >= b.levels[1] && <span className="ml-1 font-black text-amber-300">· mundo completo ✓</span>}
                </span>
              </div>
              <p className="text-xs text-white/55">{b.blurb}</p>
              <p className="mt-0.5 text-[11px] font-bold" style={{ color: b.accent }}>Recompensa ao completar: aura exclusiva + sementes</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {LEVELS.filter((l) => l.biome === b.id).map((l) => {
                  const locked = l.n > unlockedLevel;
                  const stars = save.stars[l.n] ?? 0;
                  const active = sel === l.n;
                  return (
                    <button
                      key={l.n}
                      disabled={locked}
                      onClick={() => setSel(l.n)}
                      aria-label={`Fase ${l.n}: ${l.name}`}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-center transition ${locked ? "bg-white/4 text-white/25" : active ? "scale-105 text-[#04211c]" : "bg-white/9 hover:bg-white/15"}`}
                      style={active ? { background: `linear-gradient(180deg, ${b.accent}, ${b.accent}bb)`, boxShadow: `0 0 20px ${b.accent}88` } : l.boss && !locked ? { boxShadow: "inset 0 0 0 2px #ff4d5e88" } : undefined}
                    >
                      {l.boss && <span className="absolute -top-2 text-sm text-amber-300">★</span>}
                      <span className="font-display text-2xl leading-none">{locked ? "×" : l.n}</span>
                      <span className="mt-0.5 text-[10px] tracking-tighter">{[1, 2, 3].map((i) => (i <= stars ? "★" : "☆")).join("")}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="glass anim-rise h-fit rounded-2xl p-4 lg:sticky lg:top-2" key={sel} style={{ boxShadow: `inset 0 0 0 1px ${biome.accent}44` }}>
          <div className="flex items-center gap-2">
            <Chip color={biome.accent}>Fase {L.n}</Chip>
            {L.boss && <Chip color="#ff4d5e">👑 CHEFE</Chip>}
            <Chip color="#ffcf4a">Ameaça ×{levelMult(L.n).toFixed(1)}</Chip>
          </div>
          <h2 className="font-display mt-2 text-3xl leading-none">{L.name}</h2>
          <p className="mt-2 text-sm text-white/70">{L.intro}</p>

          {L.mods.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {L.mods.map((m) => (
                <span key={m} title={MOD_INFO[m].desc} className="rounded-lg bg-white/8 px-2 py-1 text-[11px] font-bold ring-1 ring-white/10">
                  {MOD_INFO[m].icon} {MOD_INFO[m].label}
                </span>
              ))}
            </div>
          )}

          {e && enemy && (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/30 p-2 ring-1 ring-white/8">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden">
                <Sprite kind="enemy" id={enemy} size={64} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#ff8f6b]">{L.boss ? "Chefe da região" : "Novo inimigo"}</div>
                <div className="font-bold leading-tight">{e.name}</div>
                <div className="text-[11px] leading-snug text-white/60">{e.power}</div>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Objetivos secundários (★)</div>
            {L.objectives.map((o, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-white/6 px-2.5 py-1.5 text-xs">
                <span className={(save.stars[L.n] ?? 0) > i + 1 ? "text-amber-300" : "text-white/35"}>★</span>
                <span>{objectiveEval(o, ZERO).text}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-white/55">
            <span>Melhor placar</span>
            <b className="text-white">{save.best[L.n]?.toLocaleString("pt-BR") ?? "—"}</b>
          </div>

          <div className="mt-4 grid gap-2">
            <Btn big onClick={() => onSolo(L.n)}>
              ▶ Jogar
            </Btn>
          </div>
          <p className="mt-2 text-center text-[11px] text-white/40">Você joga com um kit de defensores que se adapta à fase.</p>
        </aside>
      </div>
    </Screen>
  );
}
