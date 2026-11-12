import { useState } from "react";
import { CLASS_INFO, DEFENDERS, DEF_BY_ID, MAX_DEF_LEVEL, PLANT_COUNT, RARITY_INFO, UPGRADE_COST, defStats, type DefId } from "../data/defenders";
import { ENEMIES, ENEMY_COUNT, KIND_INFO } from "../data/enemies";
import { ACH_BY_ID } from "../data/progression";
import { Btn, Chip, Screen, Seeds, Sprite, StatBar } from "./common";
import { useSave } from "./SaveContext";
import { sound } from "../game/sound";

function unlockText(id: DefId) {
  const u = DEF_BY_ID[id].unlock;
  if (u.kind === "start") return "Disponível desde o início";
  if (u.kind === "level") return `Conclua a fase ${u.n}`;
  return `Conquista: ${ACH_BY_ID[u.id]?.name ?? u.id}`;
}

export function CollectionScreen({ onBack }: { onBack: () => void }) {
  const { save, avail, upgrade } = useSave();
  const [tab, setTab] = useState<"def" | "enemy">("def");
  const [sel, setSel] = useState<DefId>("luminia");
  const d = DEF_BY_ID[sel];
  const owned = avail.includes(sel);
  const lv = save.defLevels[sel] ?? 1;
  const st = defStats(d, lv);
  const cost = UPGRADE_COST[lv] ?? 0;

  return (
    <Screen title="Defensores & Inimigos" subtitle="Evolua seus guardiões e conheça o Murchar" onBack={onBack} right={<Seeds n={save.coins} />} wide>
      <div className="mt-3 flex gap-2">
        {(["def", "enemy"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-extrabold ${tab === t ? "bg-[#2ee6c5] text-[#04211c]" : "bg-white/8 ring-1 ring-white/12"}`}>
            {t === "def" ? `🌿 Defensores (${avail.length}/${PLANT_COUNT})` : `💀 Bestiário (${ENEMY_COUNT})`}
          </button>
        ))}
      </div>

      {tab === "def" ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {DEFENDERS.map((x) => {
              const has = avail.includes(x.id);
              const r = RARITY_INFO[x.rarity];
              return (
                <button key={x.id} onClick={() => setSel(x.id)} className={`glass relative flex flex-col items-center rounded-2xl p-2 transition ${sel === x.id ? "scale-[1.03]" : "hover:brightness-125"}`} style={{ boxShadow: sel === x.id ? `0 0 0 2px ${r.color}, 0 0 20px ${r.color}55` : `inset 0 0 0 1px ${r.color}33` }}>
                  <Sprite kind="def" id={x.id} size={76} animate={false} dark={!has} />
                  <span className="mt-1 line-clamp-1 text-center text-[11px] font-extrabold leading-tight">{has ? x.name : "???"}</span>
                  <span className="mt-0.5 text-[10px] font-bold" style={{ color: r.color }}>
                    {r.label}
                  </span>
                  {!has && <span className="absolute right-1.5 top-1.5 text-sm">🔒</span>}
                  {has && (save.defLevels[x.id] ?? 1) > 1 && <span className="absolute left-1.5 top-1.5 text-[10px] text-amber-300">{"★".repeat((save.defLevels[x.id] ?? 1) - 1)}</span>}
                </button>
              );
            })}
          </div>

          <aside className="glass anim-rise h-fit rounded-2xl p-4 lg:sticky lg:top-2" key={sel}>
            <div className="flex items-start gap-3">
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl bg-black/30 ring-1 ring-white/10">
                <Sprite kind="def" id={sel} size={104} dark={!owned} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1">
                  <Chip color={CLASS_INFO[d.cls].color}>
                    {CLASS_INFO[d.cls].icon} {CLASS_INFO[d.cls].label}
                  </Chip>
                  <Chip color={RARITY_INFO[d.rarity].color}>{RARITY_INFO[d.rarity].label}</Chip>
                </div>
                <h2 className="font-display mt-1 text-2xl leading-none">{owned ? d.name : "Bloqueado"}</h2>
                <p className="text-xs italic text-white/55">{owned ? d.tagline : unlockText(sel)}</p>
              </div>
            </div>
            {owned ? (
              <>
                <p className="mt-3 text-sm text-white/80">{d.power}</p>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  <StatBar label="Custo (seiva)" value={d.cost} max={300} color="#ffcf4a" />
                  <StatBar label="Resistência" value={st.hp} max={1200} color="#5fe08a" />
                  <StatBar label={d.cls === "gerador" ? "Seiva gerada" : d.cls === "protecao" && d.id === "musgo" ? "Cura/s" : "Poder"} value={st.dmg} max={d.cls === "especial" ? 800 : 60} color="#ff8f6b" />
                  <StatBar label="Velocidade" value={d.interval > 0 ? 1 / st.interval : 0} max={1.3} color="#7fd8ff" text={d.interval > 0 ? `${(1 / st.interval).toFixed(2)}/s` : "—"} />
                  <StatBar label="Alcance (casas)" value={d.range} max={9} color="#c07bff" text={d.range ? String(d.range) : "—"} />
                  <StatBar label="Recarga" value={d.recharge} max={30} color="#9fb3a8" text={`${d.recharge}s`} />
                </div>
                <div className="mt-2 text-xs text-white/55">Acerta voadores: <b className={d.air ? "text-[#7fd8ff]" : "text-white/70"}>{d.air ? "sim" : "não"}</b></div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-black/30 p-3 ring-1 ring-white/8">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Nível</div>
                    <div className="text-lg font-black text-amber-300">{"★".repeat(lv)}<span className="text-white/20">{"★".repeat(MAX_DEF_LEVEL - lv)}</span></div>
                    <div className="text-[10px] text-white/45">+15% poder · +20% resistência por nível</div>
                  </div>
                  {lv < MAX_DEF_LEVEL ? (
                    <Btn kind="gold" disabled={save.coins < cost} onClick={() => { if (upgrade(sel)) sound.play("plant"); }}>
                      Evoluir · {cost}
                    </Btn>
                  ) : (
                    <Chip color="#ffcf4a">NÍVEL MÁXIMO</Chip>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-white/40">Evoluções só afetam a sua versão do defensor e vêm de jogar, nunca de compras.</p>
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-black/30 p-3 text-sm text-white/70">🔒 {unlockText(sel)} para liberar este defensor.</p>
            )}
          </aside>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENEMIES.map((z) => {
            const seen = z.intro <= save.completed + 1;
            const k = KIND_INFO[z.kind];
            return (
              <div key={z.id} className="glass flex gap-3 rounded-2xl p-3" style={{ boxShadow: `inset 0 0 0 1px ${k.color}33` }}>
                <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/30">
                  <Sprite kind="enemy" id={z.id} size={80} dark={!seen} />
                </div>
                <div className="min-w-0">
                  <Chip color={k.color}>{k.label}</Chip>
                  <div className="font-display mt-1 text-lg leading-tight">{seen ? z.name : "???"}</div>
                  <p className="text-[11px] leading-snug text-white/60">{seen ? z.power : `Aparece na fase ${z.intro}.`}</p>
                  {seen && (
                    <p className="mt-1 text-[10px] font-bold text-white/40">
                      ❤ {z.hp + z.armor} · 🦶 {z.speed} · fase {z.intro}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
