import { useEffect, useRef, useState } from "react";
import { ACH_BY_ID, type ResultSummary } from "../data/progression";
import { CLASS_INFO, DEF_BY_ID } from "../data/defenders";
import { getLevel } from "../data/levels";
import { FINAL_LEVEL } from "../data/rules";
import { ROLE_BY_ID } from "../data/roles";
import { WORLD_AURAS } from "../data/cosmetics";
import { GardenEngine } from "../game/engine";
import { H, W } from "../game/geometry";
import { sound } from "../game/sound";
import { setCrazyGamesGameplay } from "../services/crazygames";
import type { Hud, MatchResult } from "../game/types";
import type { MatchHandle } from "../net/session";
import { Btn, Chip, Sprite } from "./common";
import { useSave } from "./SaveContext";
import type { Sess } from "./LobbyScreen";

const TUTORIAL = [
  { text: "Clique nas esferas douradas que caem do céu para coletar SEIVA, a energia de toda a equipe.", done: (h: Hud) => h.stats.sunClicks >= 1, card: -1 },
  { text: "Escolha a Lumínia (carta 1 ou tecla 1) e clique no gramado para plantar. Ela gera seiva sozinha.", done: (h: Hud) => (h.stats.plantedBy.luminia ?? 0) >= 1, card: 0 },
  { text: "Agora o Espinheiro (carta 2): plante na linha do meio (linha 3). Ele ataca de longe.", done: (h: Hud) => (h.stats.plantedBy.espinheiro ?? 0) >= 1, card: 1 },
  { text: "Os Murchos estão chegando! Proteja o Espinheiro com um Tronco Ancestral (carta 3) à frente dele.", done: (h: Hud) => (h.stats.plantedBy.tronco ?? 0) >= 1, card: 2 },
  { text: "Perfeito! Use a Fruta-Magma (carta 4) em emergências. Se algo passar, a Runa de Guarda protege a linha uma vez. Derrote os 3 inimigos!", done: (h: Hud) => h.status === 1, card: 3 },
];

export function MatchScreen({ handle, sess, onExit, onNext, onLobby }: { handle: MatchHandle; sess: Sess; onExit: () => void; onNext: (level: number) => void; onLobby: () => void }) {
  const { save, apply, patch } = useSave();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const eng = useRef<GardenEngine | null>(null);
  const done = useRef(false);
  const cid = useRef(0);
  const [hud, setHud] = useState<Hud | null>(null);
  const [chat, setChat] = useState<{ id: number; who: number; text: string }[]>([]);
  const [res, setRes] = useState<{ r: MatchResult; s: ResultSummary } | null>(null);
  const [menu, setMenu] = useState(false);
  const [size, setSize] = useState({ w: 640, h: 384 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [text, setText] = useState("");
  const [panel, setPanel] = useState(false);

  const cfg = handle.cfg;
  const level = getLevel(cfg.level);
  const multi = cfg.seats.length > 1;
  const compact = vp.h < 520 && vp.w > vp.h;
  const wide = vp.w >= 1024 && !compact;
  const link = handle.link();
  const tutorial = cfg.level === 0;
  const step = tutorial && hud ? TUTORIAL.findIndex((t) => !t.done(hud)) : -1;

  // A plataforma deve saber quando o jogador pausa, retoma ou termina a partida.
  useEffect(() => {
    void setCrazyGamesGameplay(!menu && !hud?.paused && !res);
    return () => {
      void setCrazyGamesGameplay(false);
    };
  }, [menu, hud?.paused, res]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // motor
  useEffect(() => {
    const canvas = canvasRef.current!;
    done.current = false;
    const e = handle.attach(
      canvas,
      {
        onHud: setHud,
        onChat: (l) => setChat((c) => [...c.slice(-5), { id: ++cid.current, ...l }]),
        onSound: (n) => sound.play(n),
        onEnd: (r) => {
          if (done.current) return;
          done.current = true;
          if (r.win && r.level === 50) sound.play("finale");
          setRes({ r, s: apply(r) });
        },
      },
      { quality: save.settings.quality, fps: save.settings.fps, shake: save.settings.shake }
    );
    eng.current = e;
    e.start();
    e.emit();
    return () => {
      e.stop();
      eng.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  useEffect(() => {
    const e = eng.current;
    if (!e) return;
    e.shakeOn = save.settings.shake;
    if (e.quality !== save.settings.quality || e.fpsCap !== save.settings.fps) e.setQuality(save.settings.quality, save.settings.fps);
  }, [save.settings.quality, save.settings.fps, save.settings.shake]);

  // tamanho do campo (mantém a proporção, sem cortar nada)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => {
      const bw = el.clientWidth;
      const bh = el.clientHeight;
      const w = wide || compact ? Math.min(bw, (bh * W) / H) : bw;
      setSize({ w: Math.max(200, w), h: Math.max(120, (Math.max(200, w) * H) / W) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide, compact, vp]);

  // atalhos
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.tagName === "INPUT") return;
      const k = ev.key.toLowerCase();
      const e = eng.current;
      if (!e) return;
      if (k === "escape") return setMenu((m) => !m);
      if (/^[1-9]$/.test(k)) {
        const id = e.seats[handle.mySeat]?.loadout[Number(k) - 1];
        if (id) e.selectSeed(id);
      }
      if (k === "x") e.toggleShovel();
      if (k === "c") handle.send({ k: "all" });
      if (k === "p" && handle.isHost) handle.send({ k: "pause", on: !e.paused });
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [handle]);

  // pausa automática ao esconder a aba (só se for seguro pausar)
  useEffect(() => {
    const vis = () => document.hidden && eng.current?.allowPause && handle.send({ k: "pause", on: true });
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [handle]);

  const toGame = (ev: React.PointerEvent) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  };

  const quit = () => {
    if (sess.role === "host") sess.s.dispose();
    else sess.s.leave();
    onExit();
  };

  const sendChat = (t: string) => {
    if (t.trim()) handle.send({ k: "chat", text: t.trim().slice(0, 60) });
    setText("");
  };

  const cards = hud?.seeds ?? [];
  const cardEl = (s: (typeof cards)[number], i: number) => {
    const d = DEF_BY_ID[s.id];
    const blocked = !s.afford || s.ready < 1;
    const hint = tutorial && step >= 0 && TUTORIAL[step].card === i;
    return (
      <button
        key={s.id}
        onClick={() => eng.current?.selectSeed(s.id)}
        aria-label={`${d.name}, custo ${d.cost}`}
        className={`relative shrink-0 overflow-hidden rounded-xl p-1 text-center ring-2 transition ${compact ? "h-[68px] w-[64px]" : "h-[88px] w-[80px]"} ${hud?.sel === s.id ? "bg-[#2ee6c5]/20 ring-[#2ee6c5]" : "bg-white/7 ring-white/10 hover:ring-white/30"} ${blocked ? "opacity-70" : ""} ${hint ? "anim-pulse-ring ring-amber-300" : ""}`}
      >
        <span className="absolute left-1 top-0.5 text-[10px] font-black text-white/45">{i + 1}</span>
        <span className="grid place-items-center"><Sprite kind="def" id={s.id} size={compact ? 38 : 52} animate={false} /></span>
        <span className={`block text-[11px] font-black ${s.afford ? "text-amber-300" : "text-red-400"}`}>{s.cost}</span>
        {s.ready < 1 && <span className="absolute inset-x-0 top-0 bg-black/65" style={{ height: `${(1 - s.ready) * 100}%` }} />}
        <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: CLASS_INFO[d.cls].color }} />
      </button>
    );
  };

  const side = (
    <div className="space-y-2.5">
      <section className="glass rounded-xl p-2.5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">Objetivos ★</h3>
        <ul className="mt-1.5 space-y-1">
          {hud?.objectives.map((o, i) => (
            <li key={i} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[11px] ${o.met ? "bg-[#2ee6c5]/12 text-[#9ff5e4]" : "bg-white/6 text-white/70"}`}>
              <span>{o.met ? "✔" : "○"} {o.text}</span>
              <b className="shrink-0">{o.label}</b>
            </li>
          ))}
        </ul>
      </section>
      {multi && (
        <section className="glass rounded-xl p-2.5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">Equipe</h3>
          <ul className="mt-1.5 space-y-1">
            {hud?.seats.map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-black/25 p-1.5">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-[#07120f] ${s.speaking ? "ring-2 ring-white" : ""}`} style={{ background: s.color }}>{s.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{s.name}{i === handle.mySeat && " (você)"}</span>
                {s.kind === "ai" ? <Chip color="#9fb3a8">IA</Chip> : s.autopilot || !s.connected ? <Chip color="#ff8f6b">IA assumiu</Chip> : <Chip color="#5fe08a">online</Chip>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {multi && (
        <section className="glass rounded-xl p-2.5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">Chat e avisos</h3>
          <div className="mt-1.5 flex min-h-[56px] flex-col justify-end gap-1">
            {chat.map((m) => (
              <div key={m.id} className="rounded-lg bg-black/30 px-2 py-1 text-[11px]">
                <b style={{ color: cfg.seats[m.who]?.color }}>{cfg.seats[m.who]?.name}:</b> <span className="text-white/80">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button key={r} onClick={() => handle.send({ k: "ping", row: r - 1 })} className="rounded-md bg-amber-300/15 px-2 py-1 text-[11px] font-black text-amber-200 ring-1 ring-amber-300/30" aria-label={`Avisar linha ${r}`}>⚠{r}</button>
            ))}
            {["Mais seiva!", "Segura aí!", "Boa! 👍"].map((q) => (
              <button key={q} onClick={() => sendChat(q)} className="rounded-md bg-white/8 px-2 py-1 text-[11px] font-bold">{q}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendChat(text); }} className="mt-1.5 flex gap-1">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={60} placeholder="Mensagem…" aria-label="Mensagem para a equipe" className="min-w-0 flex-1 rounded-lg bg-black/40 px-2 py-1.5 text-xs ring-1 ring-white/12" />
            <button className="rounded-lg bg-[#2ee6c5] px-3 text-xs font-black text-[#04211c]">Enviar</button>
          </form>
        </section>
      )}
    </div>
  );

  return (
    <div className={`absolute inset-0 flex flex-col bg-[#040c0c] select-none ${res && !res.r.win ? "anim-shake" : ""}`}>
      {/* barra superior */}
      <div className="safe-pad flex shrink-0 items-center gap-2 border-b border-white/8 bg-black/40">
        <div className="flex items-center gap-1.5 rounded-xl bg-amber-300/12 px-3 py-1 ring-1 ring-amber-300/30">
          <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-br from-[#fff6c8] to-[#f0a81e] shadow-[0_0_10px_#ffcf4a]" />
          <span className="font-display text-3xl leading-none text-amber-200">{hud?.sun ?? 0}</span>
        </div>
        <div className="min-w-[60px] flex-1 px-1">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-white/55">
            <span className="truncate">{tutorial ? "Treino" : `Fase ${cfg.level} · ${level.name}`}{hud && !tutorial ? ` · onda ${hud.wave}/${hud.waves}` : ""}</span>
            <span className="ml-2 hidden shrink-0 sm:inline">{hud?.alive ?? 0}<span className="hidden sm:inline"> inimigos</span> · {hud?.guards ?? 0}<span className="hidden sm:inline"> runas</span></span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2ee6c5] via-[#ffcf4a] to-[#ff4d5e] transition-[width] duration-300" style={{ width: `${(hud?.progress ?? 0) * 100}%` }} />
          </div>
        </div>
        <button onClick={() => handle.send({ k: "all" })} className="rounded-xl bg-amber-300 px-2.5 py-2 text-sm font-black text-[#3a2400]" title="Coletar toda a seiva (C)" aria-label="Coletar toda a seiva">✦<span className="hidden md:inline"> Coletar</span></button>
        <button onClick={() => eng.current?.toggleShovel()} className={`rounded-xl px-2.5 py-2 text-sm font-black ring-1 ${hud?.shovel ? "bg-red-500 ring-red-300" : "bg-white/8 ring-white/15"}`} title="Remover defensor (X)" aria-label="Pá">Pá</button>
        {hud?.canPause && (
          <button onClick={() => handle.send({ k: "speed", v: hud.speed === 2 ? 1 : 2 })} className="rounded-xl bg-white/8 px-2.5 py-2 text-sm font-black ring-1 ring-white/15" aria-label="Velocidade">{hud.speed === 2 ? "⏩2×" : "▶1×"}</button>
        )}
        {(compact || !wide) && multi && (
          <button onClick={() => setPanel((p) => !p)} className="rounded-xl bg-white/8 px-2.5 py-2 text-sm font-black ring-1 ring-white/15" aria-label="Equipe">Equipe</button>
        )}
        <button
          onClick={() => {
            setMenu(true);
            if (hud?.canPause) handle.send({ k: "pause", on: true });
          }}
          className="rounded-xl bg-white/8 px-3 py-2 text-sm font-black ring-1 ring-white/15"
          aria-label="Menu"
        >
          ☰
        </button>
      </div>

      {/* mundo, função, evento, sinergias e etapa do chefe */}
      <div className="hide-scroll flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/8 bg-black/30 px-2 py-1 text-[11px] font-bold">
        <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5" style={{ color: "#9ff5e4" }}>{hud?.worldName ?? "Vale das Sementes"}</span>
        {hud?.role && <span className="shrink-0 rounded-full px-2 py-0.5" style={{ background: ROLE_BY_ID[hud.role].color + "26", color: ROLE_BY_ID[hud.role].color }}>{ROLE_BY_ID[hud.role].icon} {ROLE_BY_ID[hud.role].name}</span>}
        {hud?.event && <span className={`shrink-0 rounded-full px-2 py-0.5 ${hud.event.warn ? "animate-pulse" : ""}`} style={{ background: hud.event.color + "26", color: hud.event.color }}>{hud.event.icon} {hud.event.label}{hud.event.warn ? " (em breve)" : ""}</span>}
        {hud && hud.combos.length > 0 && <span className="shrink-0 rounded-full bg-[#ffcf4a]/15 px-2 py-0.5 text-amber-200">✦ {hud.combos.slice(0, 2).join(" · ")}</span>}
        {hud && hud.bossHp != null && <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-red-200">★ Etapa {hud.bossPhase + 1}</span>}
        <span className="shrink-0 text-white/35">Fase {cfg.level}/50</span>
      </div>

      <div className={`flex min-h-0 flex-1 ${compact ? "flex-row" : "flex-col"}`}>
        {/* cartas */}
        <div className={compact ? "scroll-y flex shrink-0 flex-col gap-1.5 border-r border-white/8 bg-black/30 p-1.5" : "hide-scroll flex shrink-0 gap-2 overflow-x-auto border-b border-white/8 bg-black/25 px-2 py-1.5"}>{cards.map(cardEl)}</div>

        <div className={`flex min-h-0 min-w-0 flex-1 gap-3 p-1.5 ${wide ? "flex-row" : "flex-col"}`}>
          <div ref={boxRef} className={`relative min-h-0 min-w-0 ${wide || compact ? "grid flex-1 place-items-center" : "shrink-0"}`} style={!wide && !compact ? { height: size.h } : undefined}>
            <div className="relative overflow-hidden rounded-xl ring-1 ring-white/12" style={{ width: size.w, height: size.h }}>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full touch-none"
                aria-label="Campo de batalha"
                onPointerDown={(e) => {
                  sound.resume();
                  const p = toGame(e);
                  const en = eng.current;
                  if (!en) return;
                  en.hoverAt(p.x, p.y);
                  const cmd = en.pointerCmd(p.x, p.y);
                  if (cmd) handle.send(cmd);
                }}
                onPointerMove={(e) => {
                  const p = toGame(e);
                  eng.current?.hoverAt(p.x, p.y);
                }}
                onPointerLeave={() => eng.current?.hoverAt(-999, -999)}
              />
              {hud?.banner && (
                <div key={hud.banner} className="pointer-events-none absolute inset-x-0 top-[26%] text-center">
                  <div className="anim-banner font-display inline-block bg-black/55 px-6 py-2 text-3xl tracking-widest text-[#ff6b7a] sm:text-6xl">{hud.banner}</div>
                </div>
              )}
              {hud?.bossHp != null && (
                <div className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-[62%]">
                  <div className="font-display text-center text-sm tracking-widest text-red-300 sm:text-lg">{hud.bossName}</div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-black/60 ring-1 ring-red-400/50">
                    <div className="h-full bg-gradient-to-r from-red-700 to-red-400" style={{ width: `${hud.bossHp * 100}%` }} />
                  </div>
                </div>
              )}
              {tutorial && step >= 0 && hud && (wide || compact) && (
                <div className={`pointer-events-none absolute z-10 rounded-2xl bg-black/80 ring-2 ring-amber-300/70 ${compact ? "inset-x-1 top-1 p-1.5" : "inset-x-2 bottom-2 mx-auto max-w-lg p-4"}`}>
                  {!compact && <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Passo {step + 1} de {TUTORIAL.length}</div>}
                  <p className={`font-semibold text-white ${compact ? "text-[11px] leading-tight" : "mt-0.5 text-sm"}`}>{compact ? `${step + 1}/${TUTORIAL.length} · ` : ""}{TUTORIAL[step].text}</p>
                </div>
              )}
              {link !== "local" && link !== "connected" && (
                <div className="absolute inset-x-0 top-0 bg-amber-500/90 py-1.5 text-center text-xs font-black text-black">
                  {link === "reconnecting" ? "⚠ Conexão perdida… tentando reconectar (a IA joga por você)" : link === "lost" || link === "closed" ? "⚠ Desconectado da sala" : "Conectando…"}
                </div>
              )}
              {hud?.paused && !res && !menu && (
                <div className="absolute inset-0 grid place-items-center bg-black/60">
                  <Btn big onClick={() => handle.send({ k: "pause", on: false })}>▶ Continuar</Btn>
                </div>
              )}
            </div>
          </div>

          {/* painel lateral / inferior */}
          {wide ? (
            <aside className="scroll-y w-72 shrink-0 pr-1">{side}</aside>
          ) : compact ? (
            panel && <aside className="scroll-y absolute right-2 top-14 z-20 max-h-[70%] w-72 rounded-xl bg-black/90 p-2 ring-1 ring-white/15">{side}</aside>
          ) : (
            <div className="scroll-y min-h-0 flex-1 px-0.5 pb-2">
              {tutorial && step >= 0 && (
                <div className="mb-2 rounded-2xl bg-black/70 p-3 ring-2 ring-amber-300/70">
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Passo {step + 1} de {TUTORIAL.length}</div>
                  <p className="mt-0.5 text-sm font-semibold text-white">{TUTORIAL[step].text}</p>
                </div>
              )}
              {vp.h < vp.w && <p className="mb-2 text-center text-[11px] text-white/40">Dica: gire o aparelho para ver o campo maior.</p>}
              {side}
            </div>
          )}
        </div>
      </div>

      {/* menu / pausa */}
      {menu && !res && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-4" role="dialog" aria-label="Menu da partida">
          <div className="glass anim-rise w-full max-w-sm rounded-2xl p-5">
            <h2 className="font-display text-3xl">{hud?.canPause ? "Pausado" : "Menu"}</h2>
            {!hud?.canPause && <p className="text-xs text-amber-300">A partida continua para os outros jogadores.</p>}
            <div className="mt-3 space-y-2.5">
              {(["master", "music", "sfx"] as const).map((k) => (
                <label key={k} className="flex items-center gap-3 text-xs font-bold">
                  <span className="w-16 text-white/70">{k === "master" ? "Geral" : k === "music" ? "Música" : "Efeitos"}</span>
                  <input type="range" min={0} max={1} step={0.05} value={save.settings[k]} onChange={(e) => patch((s) => ({ ...s, settings: { ...s.settings, [k]: Number(e.target.value) } }))} className="flex-1" />
                </label>
              ))}
              <label className="flex items-center gap-3 text-xs font-bold">
                <span className="w-16 text-white/70">Gráficos</span>
                <select value={save.settings.quality} onChange={(e) => patch((s) => ({ ...s, settings: { ...s.settings, quality: e.target.value as "low" | "medium" | "high" } }))} className="flex-1 rounded-lg bg-black/40 px-2 py-1.5 ring-1 ring-white/15">
                  <option value="low">Baixo (mais rápido)</option>
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-2">
              <Btn onClick={() => { setMenu(false); if (hud?.canPause) handle.send({ k: "pause", on: false }); }}>▶ Continuar</Btn>
              <Btn kind="danger" onClick={quit}>Sair da partida</Btn>
            </div>
          </div>
        </div>
      )}

      {/* resultado */}
      {res && (
        <div className="absolute inset-0 z-40 overflow-hidden bg-black/80" role="dialog" aria-label="Resultado">
          {res.r.win ? (
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 26 }, (_, i) => (
                <span key={i} className="petal" style={{ left: `${(i * 37) % 100}%`, width: 8 + (i % 4) * 4, height: 8 + (i % 4) * 4, background: ["#2ee6c5", "#ffcf4a", "#ff8fb1", "#a98bff"][i % 4], animationDuration: `${4 + (i % 5)}s`, animationDelay: `${(i % 7) * 0.4}s` }} />
              ))}
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 50% 40%, transparent 30%, rgba(120,0,20,.55))" }} />
          )}
          <div className="scroll-y absolute inset-0 grid place-items-center p-3">
            <div className="glass anim-rise w-full max-w-md rounded-3xl p-5 text-center">
              {res.r.win ? (
                <>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#2ee6c5]">{cfg.level === 0 ? "treino concluído" : cfg.level === FINAL_LEVEL ? "campanha completa" : "vitória"}</p>
                  <h2 className="font-display shimmer-text text-5xl leading-none sm:text-6xl">{cfg.level === FINAL_LEVEL ? "O Murchar caiu!" : cfg.level === 0 ? "Bem-vindo!" : `Fase ${cfg.level} limpa`}</h2>
                  {cfg.level > 0 && (
                    <div className="mt-3 flex justify-center gap-2 text-5xl">
                      {[1, 2, 3].map((i) => (
                        <span key={i} className={i <= res.r.stars ? "anim-pop text-amber-300 drop-shadow-[0_0_14px_#ffcf4a]" : "text-white/15"} style={{ animationDelay: `${i * 220}ms` }}>★</span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-red-300">o Murchar alcançou o santuário</p>
                  <h2 className="font-display text-5xl leading-none text-red-400 sm:text-6xl">Derrota</h2>
                  <p className="mt-2 text-xs text-white/60">Dica: combine um Gerador, uma muralha e dois atacantes de longo alcance. Voadores precisam de Espinheiro, Gelídea ou Orquídea.</p>
                </>
              )}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["Placar", res.r.score.toLocaleString("pt-BR")], ["Abates", String(res.r.stats.kills)], ["Tempo", `${Math.floor(res.r.time / 60)}:${String(res.r.time % 60).padStart(2, "0")}`]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-black/30 p-2">
                    <div className="text-lg font-black">{v}</div>
                    <div className="text-[10px] font-bold uppercase text-white/45">{l}</div>
                  </div>
                ))}
              </div>
              {res.r.win && cfg.level > 0 && (
                <div className="mt-3 space-y-1 text-left">
                  {getLevel(cfg.level).objectives.map((_, i) => (
                    <div key={i} className={`rounded-lg px-2.5 py-1 text-xs ${res.r.objectives[i] ? "bg-[#2ee6c5]/15 text-[#9ff5e4]" : "bg-white/6 text-white/45"}`}>
                      {res.r.objectives[i] ? "★" : "☆"} {hud?.objectives[i]?.text}
                    </div>
                  ))}
                </div>
              )}
              {res.s.parts.length > 0 && (
                <div className="mt-3 rounded-xl bg-black/30 p-2.5 text-left text-xs">
                  {res.s.parts.map((p, i) => (
                    <div key={i} className="flex justify-between py-0.5">
                      <span className="text-white/70">{p.label}</span>
                      <b className="text-amber-200">+{p.value}</b>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-white/10 pt-1 text-sm font-black">
                    <span>Total em sementes</span>
                    <span className="text-amber-300">+{res.s.coins}</span>
                  </div>
                </div>
              )}
              {res.s.newBest && <p className="mt-2 text-xs font-black text-[#ffcf4a]">🏅 Novo recorde nesta fase!</p>}
              {res.s.newAch.map((id) => (
                <p key={id} className="mt-1 rounded-lg bg-amber-300/12 px-2 py-1 text-xs font-bold text-amber-200">🏆 Conquista: {ACH_BY_ID[id].name} (+{ACH_BY_ID[id].reward})</p>
              ))}
              {res.s.unlockedDefs.map((id) => (
                <div key={id} className="mt-2 flex items-center gap-3 rounded-xl bg-[#2ee6c5]/12 p-2 ring-1 ring-[#2ee6c5]/40">
                  <Sprite kind="def" id={id} size={52} />
                  <div className="text-left">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#2ee6c5]">Novo defensor!</div>
                    <div className="font-extrabold">{DEF_BY_ID[id].name}</div>
                  </div>
                </div>
              ))}
              {res.s.questsDone.map((q) => (
                <p key={q} className="mt-1 text-xs text-[#9ff5e4]">✔ Missão cumprida: {q}</p>
              ))}
              {res.r.win && cfg.level === FINAL_LEVEL && (
                <div className="anim-rise finale-glow mt-4 rounded-2xl p-4 ring-2 ring-[#ff7ae0]/60">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff7ae0]">Encerramento · Jardim do Fim 3.0</div>
                  <div className="font-display mt-1 text-3xl leading-tight">Os cinco mundos respiram de novo</div>
                  <p className="mt-1 text-xs text-white/70">O Devorador foi desfeito em {res.s.parts.length} etapas de recompensa. Você concluiu as 50 fases.</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <span className="rounded-full bg-[#ffcf4a]/15 px-3 py-1 text-xs font-black text-amber-200">✨ {WORLD_AURAS[4] ? "Halo do Devorador" : "Aura exclusiva"}</span>
                    <span className="rounded-full bg-[#2ee6c5]/15 px-3 py-1 text-xs font-black text-[#9ff5e4]">👑 Conquista lendária</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">+1000 sementes</span>
                  </div>
                </div>
              )}
              <div className="mt-4 grid gap-2">
                {handle.isHost ? (
                  <>
                    {res.r.win && cfg.mode === "campaign" && cfg.level < FINAL_LEVEL && cfg.level > 0 && <Btn big onClick={() => onNext(cfg.level + 1)}>Próxima fase →</Btn>}
                    {cfg.mode !== "tutorial" && <Btn kind={res.r.win ? "ghost" : "primary"} onClick={() => onNext(cfg.level)}>↻ Jogar de novo</Btn>}
                    {sess.role === "host" && sess.kind !== "offline" ? (
                      <Btn kind="ghost" onClick={onLobby}>Voltar à sala</Btn>
                    ) : (
                      <Btn kind="ghost" onClick={quit}>Voltar ao menu</Btn>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-white/55">Aguardando o anfitrião escolher o próximo passo…</p>
                    <Btn kind="ghost" onClick={quit}>Sair da sala</Btn>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
