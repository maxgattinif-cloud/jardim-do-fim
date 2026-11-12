import { useRef, useState } from "react";
import { COSMETICS, type Cosmetic } from "../data/cosmetics";
import { ACHIEVEMENTS, QUEST_BY_ID, currentEvent, dailyConfig } from "../data/progression";
import { BIOMES, LEVELS } from "../data/levels";
import { ENEMY_BY_ID } from "../data/enemies";
import { GAME_NAME, GAME_VERSION } from "../data/rules";
import { FEATURES } from "../services/monetization";
import { Btn, Chip, Screen, Seeds, Sprite } from "./common";
import { useSave } from "./SaveContext";
import { sound } from "../game/sound";

/* ------------------------------ Missões e conquistas ------------------------------ */
export function QuestsScreen({ onBack, onDaily }: { onBack: () => void; onDaily: () => void }) {
  const { save, claimQuest } = useSave();
  const ev = currentEvent();
  const dc = dailyConfig();
  const got = Object.keys(save.achievements).length;
  return (
    <Screen title="Missões & Conquistas" subtitle="Metas diárias, desafios e eventos" onBack={onBack} right={<Seeds n={save.coins} />}>
      <section className="glass mt-3 rounded-2xl p-4" style={{ boxShadow: "inset 0 0 0 1px #ffcf4a44" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Desafio diário</div>
            <h2 className="font-display text-2xl leading-tight">{dc.title}</h2>
            <p className="text-xs text-white/60">
              Fase {dc.level} · inimigo em destaque: {ENEMY_BY_ID[dc.emphasis[0]]?.name} · sequência: <b className="text-amber-200">{save.daily.streak} dia(s)</b> · melhor placar hoje: <b>{save.daily.best.toLocaleString("pt-BR")}</b>
            </p>
          </div>
          <Btn kind="gold" onClick={onDaily}>{save.daily.done ? "Jogar de novo" : "Jogar agora"}</Btn>
        </div>
      </section>

      <section className="glass mt-3 flex items-center gap-3 rounded-2xl p-4">
        <span className="text-3xl">{ev.icon}</span>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Evento da semana</div>
          <div className="font-display text-xl">{ev.name}</div>
          <p className="text-xs text-white/60">{ev.desc} Vale para a Campanha.</p>
        </div>
      </section>

      <h2 className="font-display mt-5 text-2xl">Missões de hoje</h2>
      <div className="mt-2 grid gap-2">
        {save.quests.list.map((q) => {
          const d = QUEST_BY_ID[q.id];
          if (!d) return null;
          const pct = Math.min(1, q.progress / d.target);
          return (
            <div key={q.id} className="glass flex items-center gap-3 rounded-xl p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">{d.text}</div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#2ee6c5] to-[#ffcf4a]" style={{ width: `${pct * 100}%` }} />
                </div>
                <div className="mt-0.5 text-[11px] text-white/50">{Math.min(q.progress, d.target)}/{d.target}</div>
              </div>
              {q.claimed ? <Chip color="#5fe08a">Resgatada ✓</Chip> : <Btn kind="gold" disabled={pct < 1} onClick={() => { claimQuest(q.id, d.reward); sound.play("sun"); }}>+{d.reward}</Btn>}
            </div>
          );
        })}
      </div>

      <h2 className="font-display mt-5 text-2xl">Conquistas <span className="text-base text-white/45">{got}/{ACHIEVEMENTS.length}</span></h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const has = !!save.achievements[a.id];
          return (
            <div key={a.id} className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${has ? "bg-amber-300/10 ring-amber-300/35" : "bg-white/4 ring-white/8"}`}>
              <span className={`text-3xl ${has ? "" : "opacity-30 grayscale"}`}>{a.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">{a.name}</div>
                <div className="text-[11px] text-white/55">{a.desc}</div>
                {a.unlocks && <div className="text-[11px] font-bold text-[#c07bff]">Libera um defensor raro</div>}
              </div>
              <span className="text-xs font-black text-amber-300">+{a.reward}</span>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

/* ------------------------------ Cosméticos ------------------------------ */
function Preview({ c }: { c: Cosmetic }) {
  return (
    <div className="relative grid h-24 place-items-center overflow-hidden rounded-xl bg-black/35">
      <div className="absolute bottom-2 h-6 w-24 rounded-full blur-md" style={{ background: c.kind === "aura" ? c.color : "transparent", opacity: 0.8 }} />
      {c.kind === "aura" ? (
        <Sprite kind="def" id="luminia" size={80} />
      ) : (
        <svg width="110" height="40" viewBox="0 0 110 40">
          <defs>
            <linearGradient id={"g" + c.id} x1="0" x2="1">
              <stop offset="0" stopColor={c.color} stopOpacity="0" />
              <stop offset="1" stopColor={c.color} />
            </linearGradient>
          </defs>
          <rect x="4" y="16" width="70" height="8" rx="4" fill={`url(#g${c.id})`} />
          <polygon points="96,20 74,10 74,30" fill={c.color} stroke={c.color2} strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}

export function CosmeticsScreen({ onBack }: { onBack: () => void }) {
  const { save, buyCosmetic, equip } = useSave();
  const [kind, setKind] = useState<"aura" | "shot">("aura");
  const list = COSMETICS.filter((c) => c.kind === kind);
  return (
    <Screen title="Cosméticos" subtitle="Só mudam a aparência. Nunca dão vantagem na partida." onBack={onBack} right={<Seeds n={save.coins} />}>
      <div className="mt-3 flex gap-2">
        {(["aura", "shot"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-full px-4 py-2 text-sm font-extrabold ${kind === k ? "bg-[#2ee6c5] text-[#04211c]" : "bg-white/8 ring-1 ring-white/12"}`}>
            {k === "aura" ? "✨ Auras" : "➶ Projéteis"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const owned = save.cosmetics.owned.includes(c.id);
          const on = save.cosmetics[kind] === c.id;
          return (
            <div key={c.id} className="glass rounded-2xl p-3" style={{ boxShadow: on ? `0 0 0 2px ${c.color}` : undefined }}>
              <Preview c={c} />
              <div className="mt-2 flex items-center justify-between">
                <div className="font-extrabold">{c.name}</div>
                {c.source === "store" && <Chip color="#c07bff">Edição de lançamento</Chip>}
                {c.source === "reward" && <Chip color="#ffcf4a">Recompensa de mundo</Chip>}
              </div>
              <p className="text-[11px] text-white/55">{c.desc}</p>
              <div className="mt-2">
                {owned ? (
                  <Btn className="w-full" kind={on ? "ghost" : "primary"} disabled={on} onClick={() => equip(kind, c.id)}>{on ? "Equipado ✓" : "Equipar"}</Btn>
                ) : c.source === "reward" ? (
                  <Btn className="w-full" kind="ghost" disabled>{owned ? "Equipar" : "Conclua o mundo"}</Btn>
                ) : c.source === "earn" ? (
                  <Btn className="w-full" kind="gold" disabled={save.coins < c.price} onClick={() => { if (buyCosmetic(c.id)) sound.play("plant"); }}>Desbloquear · {c.price}</Btn>
                ) : (
                  <Btn className="w-full" kind="ghost" disabled>{FEATURES.purchases ? "Ver na loja" : "Em breve na loja"}</Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-white/40">Compras com dinheiro real estão desativadas nesta versão. Cosméticos de loja ficam reservados para o futuro e jamais alterarão o equilíbrio do jogo.</p>
    </Screen>
  );
}

/* ------------------------------ Ranking ------------------------------ */
export function RankingScreen({ onBack }: { onBack: () => void }) {
  const { save } = useSave();
  return (
    <Screen title="Ranking" subtitle="Seus melhores placares neste aparelho" onBack={onBack}>
      <div className="glass mt-3 rounded-2xl p-3 text-xs text-white/60">
        🌐 O ranking global entre jogadores precisa de um servidor próprio e está <b>desativado</b>. Esta lista é local, salva apenas neste aparelho.
      </div>
      <h2 className="font-display mt-4 text-2xl">Melhores partidas</h2>
      <div className="glass mt-2 overflow-hidden rounded-2xl">
        {save.ranking.length === 0 && <p className="p-4 text-sm text-white/50">Vença uma fase para entrar no ranking.</p>}
        {save.ranking.slice(0, 10).map((r, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-white/6 px-3 py-2.5 last:border-0">
            <span className="font-display w-7 text-xl text-white/45">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold">{r.name} <span className="text-white/40">· fase {r.level}{r.mode === "daily" ? " (diário)" : ""}</span></div>
              <div className="text-[11px] text-white/45">{r.date} · {r.players} participante(s) · {"★".repeat(r.stars) || "—"}</div>
            </div>
            <span className="font-display text-xl text-amber-300">{r.score.toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
      <h2 className="font-display mt-5 text-2xl">Recordes por fase</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {BIOMES.map((b) => (
          <div key={b.id} className="glass rounded-2xl p-3">
            <div className="font-display text-lg" style={{ color: b.accent }}>{b.name}</div>
            {LEVELS.filter((l) => l.biome === b.id).map((l) => (
              <div key={l.n} className="flex justify-between py-0.5 text-xs">
                <span className="text-white/65">{l.n}. {l.name}</span>
                <span><span className="text-amber-300">{"★".repeat(save.stars[l.n] ?? 0)}</span> <b>{save.best[l.n]?.toLocaleString("pt-BR") ?? "—"}</b></span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Screen>
  );
}

/* ------------------------------ Configurações ------------------------------ */
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { save, patch, rename, exportSave, importSave, reset, grantTest } = useSave();
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: unknown) => patch((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const dl = (name: string, blob: Blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const downloadGame = async () => {
    try {
      const r = await fetch(location.href.split("#")[0]);
      dl("jardim-do-fim.html", await r.blob());
      setMsg("Jogo baixado: abra o arquivo .html em qualquer navegador.");
    } catch {
      setMsg("Não foi possível baixar daqui. Use o link do código-fonte.");
    }
  };
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex items-center gap-3 py-2 text-sm font-bold">
      <span className="w-28 shrink-0 text-white/70">{label}</span>
      {children}
    </label>
  );
  return (
    <Screen title="Configurações" onBack={onBack}>
      <section className="glass mt-3 rounded-2xl p-4">
        <h2 className="font-display text-xl">Perfil</h2>
        <Row label="Seu nome">
          <input value={save.name} onChange={(e) => rename(e.target.value)} maxLength={16} className="flex-1 rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/15" />
        </Row>
      </section>
      <section className="glass mt-3 rounded-2xl p-4">
        <h2 className="font-display text-xl">Áudio</h2>
        {(["master", "music", "sfx"] as const).map((k) => (
          <Row key={k} label={k === "master" ? "Geral" : k === "music" ? "Música" : "Efeitos"}>
            <input type="range" min={0} max={1} step={0.05} value={save.settings[k]} onChange={(e) => { set(k, Number(e.target.value)); sound.resume(); }} onPointerUp={() => sound.play("plant")} className="flex-1" />
            <span className="w-9 text-right text-xs text-white/55">{Math.round(save.settings[k] * 100)}%</span>
          </Row>
        ))}
      </section>
      <section className="glass mt-3 rounded-2xl p-4">
        <h2 className="font-display text-xl">Gráficos e acessibilidade</h2>
        <Row label="Qualidade">
          <select value={save.settings.quality} onChange={(e) => set("quality", e.target.value)} className="flex-1 rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/15">
            <option value="low">Baixa — aparelhos fracos</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </select>
        </Row>
        <Row label="Quadros/s">
          <select value={save.settings.fps} onChange={(e) => set("fps", Number(e.target.value))} className="flex-1 rounded-lg bg-black/40 px-3 py-2 ring-1 ring-white/15">
            <option value={30}>30 (economiza bateria)</option>
            <option value={60}>60</option>
          </select>
        </Row>
        <Row label="Tremor de tela">
          <input type="checkbox" checked={save.settings.shake} onChange={(e) => set("shake", e.target.checked)} className="h-5 w-5 accent-[#2ee6c5]" />
          <span className="text-xs font-normal text-white/50">Desligue se incomodar</span>
        </Row>
      </section>
      <section className="glass mt-3 rounded-2xl p-4">
        <h2 className="font-display text-xl">Dados e jogo</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Btn kind="ghost" onClick={() => dl("jardim-do-fim-save.json", new Blob([exportSave()], { type: "application/json" }))}>⬇ Exportar progresso</Btn>
          <Btn kind="ghost" onClick={() => fileRef.current?.click()}>⬆ Importar progresso</Btn>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setMsg(importSave(await f.text()) ? "Progresso importado." : "Arquivo inválido."); e.target.value = ""; }} />
          <Btn kind="ghost" onClick={downloadGame}>⬇ Baixar o jogo (.html)</Btn>
          <a href="./jardim-do-fim-codigo.zip" download className="rounded-xl bg-white/8 px-4 py-2.5 text-sm font-extrabold ring-1 ring-white/15 hover:bg-white/14">⬇ Código-fonte (.zip)</a>
          <Btn kind="danger" onClick={() => { if (confirm("Apagar TODO o progresso deste aparelho?")) { reset(); setMsg("Progresso apagado."); } }}>Apagar progresso</Btn>
        </div>
        <button onClick={grantTest} className="mt-3 text-[11px] text-white/30 underline">(modo teste) liberar tudo</button>
        {msg && <p className="mt-2 text-xs text-[#9ff5e4]">{msg}</p>}
      </section>
      <section className="glass mt-3 rounded-2xl p-4 text-xs text-white/55">
        <h2 className="font-display text-xl text-white">Sobre</h2>
        <p className="mt-1">{GAME_NAME} v{GAME_VERSION}. Personagens, arte e sons originais, gerados por código. O progresso fica só neste aparelho. Este jogo não exibe anúncios, não faz compras e não coleta dados pessoais.</p>
        <p className="mt-1">Anúncios com recompensa: {FEATURES.rewardedAds ? "ativos" : "desativados"} · Compras: {FEATURES.purchases ? "ativas" : "desativadas"} · Ranking online: {FEATURES.onlineRanking ? "ativo" : "desativado"}.</p>
      </section>
    </Screen>
  );
}
