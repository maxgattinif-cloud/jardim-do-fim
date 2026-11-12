import { currentEvent, dailyConfig, QUEST_BY_ID } from "../data/progression";
import { Logo } from "./TitleScreen";
import { Seeds } from "./common";
import { useSave } from "./SaveContext";
import { PLANT_COUNT } from "../data/defenders";
import { ENEMY_COUNT } from "../data/enemies";
import { LEVELS } from "../data/levels";
import { BIOMES } from "../data/levels";

export type Dest = "campaign" | "daily" | "tutorial" | "collection" | "quests" | "cosmetics" | "ranking" | "settings";

export function MainMenu({ go }: { go: (d: Dest) => void }) {
  const { save, avail, unlockedLevel } = useSave();
  const ev = currentEvent();
  const daily = dailyConfig();
  const claimable = save.quests.list.filter((q) => !q.claimed && q.progress >= (QUEST_BY_ID[q.id]?.target ?? 1)).length;
  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);

  const cards: { id: Dest; title: string; sub: string; icon: string; accent: string; badge?: string; big?: boolean }[] = [
    { id: "campaign", title: "Campanha", sub: `Fase ${unlockedLevel} de 50 · ${totalStars}/150 ★`, icon: "◈", accent: "#2ee6c5", big: true },
    { id: "daily", title: "Desafio Diário", sub: save.daily.done ? "Concluído hoje ✓" : daily.title, icon: "▣", accent: "#ffcf4a", badge: save.daily.done ? undefined : "NOVO" },
    { id: "tutorial", title: "Treino", sub: save.tutorialDone ? "Rever o básico" : "Comece por aqui", icon: "▤", accent: "#7fd8ff", badge: save.tutorialDone ? undefined : "1º PASSO" },
    { id: "collection", title: "Defensores", sub: `${avail.length}/${PLANT_COUNT} liberados`, icon: "✿", accent: "#7bdc6b" },
    { id: "quests", title: "Missões", sub: claimable ? `${claimable} recompensa(s) pronta(s)` : "Missões e conquistas", icon: "★", accent: "#ff9a52", badge: claimable ? String(claimable) : undefined },
    { id: "cosmetics", title: "Cosméticos", sub: "Auras e efeitos", icon: "✧", accent: "#ff8fb1" },
    { id: "ranking", title: "Ranking", sub: "Seus melhores placares", icon: "▲", accent: "#c07bff" },
    { id: "settings", title: "Configurações", sub: "Som, gráficos, conta", icon: "◆", accent: "#9fb3a8" },
  ];

  return (
    <div className="bg-world absolute inset-0 flex flex-col">
      <header className="safe-pad flex shrink-0 items-center justify-between gap-3 border-b border-white/8 bg-black/25 backdrop-blur">
        <Logo size={44} />
        <div className="flex items-center gap-2">
          <button onClick={() => go("settings")} className="glass hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#3df0cf] to-[#1a8aa8] text-sm font-black text-[#04211c]">{save.name.slice(0, 1).toUpperCase()}</span>
            <span className="text-sm font-bold">{save.name}</span>
          </button>
          <Seeds n={save.coins} />
        </div>
      </header>
      <main className="scroll-y safe-pad min-h-0 flex-1">
        <div className="mx-auto max-w-5xl pb-10">
          <div className="anim-rise mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 ring-1 ring-[#2ee6c5]/40 sm:p-4" style={{ background: "linear-gradient(90deg, rgba(46,230,197,.16), rgba(167,139,255,.1))" }}>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2ee6c5]">Edição 3.0 · expansão real</div>
              <div className="font-display text-2xl leading-tight sm:text-3xl">{LEVELS.length} fases · {BIOMES.length} mundos · {PLANT_COUNT} defensores · {ENEMY_COUNT} inimigos</div>
              <p className="text-xs text-white/60">Cinco chefes, tabuleiros dinâmicos, combinações e evolução até nível 5.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => go("campaign")} className="rounded-xl bg-[#2ee6c5] px-4 py-2.5 text-sm font-black text-[#04211c]">Ver 50 fases</button>
              <button onClick={() => go("collection")} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black ring-1 ring-white/20">Ver catálogo</button>
            </div>
          </div>
          <button onClick={() => go("quests")} className="anim-rise glass mt-3 flex w-full items-center gap-3 rounded-2xl p-3 text-left sm:p-4" style={{ background: "linear-gradient(90deg, rgba(255,207,74,.16), rgba(255,255,255,.03))" }}>
            <span className="text-3xl">{ev.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Evento da semana</span>
              <span className="font-display block truncate text-xl leading-tight">{ev.name}</span>
              <span className="block truncate text-xs text-white/65">{ev.desc}</span>
            </span>
            <span className="shrink-0 rounded-full bg-amber-300 px-2.5 py-1 text-xs font-black text-[#3a2400]">×{ev.rewardMul}</span>
          </button>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cards.map((c, i) => (
              <button
                key={c.id}
                onClick={() => go(c.id)}
                className={`glass anim-rise group relative overflow-hidden rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[.98] ${c.big ? "col-span-2 sm:col-span-1 sm:row-span-1" : ""}`}
                style={{ animationDelay: `${60 + i * 45}ms`, boxShadow: `inset 0 0 0 1px ${c.accent}33, 0 10px 30px rgba(0,0,0,.35)` }}
              >
                <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:opacity-60" style={{ background: c.accent }} />
                <span className="text-3xl drop-shadow">{c.icon}</span>
                <span className="font-display mt-2 block text-xl leading-none sm:text-2xl" style={{ color: c.big ? c.accent : undefined }}>
                  {c.title}
                </span>
                <span className="mt-1 block text-xs text-white/60">{c.sub}</span>
                {c.badge && <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-black text-[#1a1000]" style={{ background: c.accent }}>{c.badge}</span>}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-white/35">Seus dados ficam salvos só neste aparelho · Sem anúncios · Sem coleta de dados pessoais</p>
        </div>
      </main>
    </div>
  );
}
