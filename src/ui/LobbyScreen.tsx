import { useEffect, useReducer, useState } from "react";
import { CLASS_INFO, DEFENDERS, DEF_BY_ID, type DefClass, type DefId } from "../data/defenders";
import { LEVELS, MOD_INFO, getLevel } from "../data/levels";
import { currentEvent, dailyConfig, type DailyCfg } from "../data/progression";
import { AI_NAMES, CHOICE_MIN_PLAYERS, MAX_PLAYERS, SEAT_COLORS, slotsFor } from "../data/rules";
import { createBus, makePeerId, makeRoomCode, type BusKind } from "../net/bus";
import { ClientSession, HostSession, type MatchHandle, type Profile } from "../net/session";
import type { Mode } from "../game/types";
import { soloDeck } from "../game/decks";
import { Btn, Chip, Screen, Sprite } from "./common";
import { ROLES, ROLE_BY_ID, ROLE_ORDER } from "../data/roles";
import { useSave } from "./SaveContext";

export type Sess = { role: "host"; s: HostSession; kind: BusKind | "offline" } | { role: "client"; s: ClientSession; kind: BusKind };

export interface LobbyInit {
  level: number;
  mode: Mode;
  daily?: DailyCfg;
  entry: "setup" | "offline";
}

const DEFAULT_PICK: DefId[] = ["luminia", "espinheiro", "tronco", "gelidea", "magma", "musgo"];

export function LobbyScreen({ init, sess, setSess, onStart, onBack }: { init: LobbyInit; sess: Sess | null; setSess: (s: Sess | null) => void; onStart: (h: MatchHandle) => void; onBack: () => void }) {
  const { save, avail, unlockedLevel, patch } = useSave();
  const [, bump] = useReducer((x: number) => x + 1, 0);
  const [kind, setKind] = useState<BusKind>("tabs");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [pick, setPick] = useState<DefId[]>(() => DEFAULT_PICK.filter((d) => avail.includes(d)).slice(0, 6));
  const [myRole, setMyRole] = useState<"comandante" | "agricultor" | "atirador" | "curandeiro" | "guarda" | "tatico">(ROLE_ORDER[0]);
  const [copied, setCopied] = useState(false);

  const profile = (): Profile => ({ name: save.name, levels: save.defLevels, aura: save.cosmetics.aura, shot: save.cosmetics.shot, loadout: pick, role: myRole });

  // assina atualizações da sessão
  useEffect(() => {
    if (!sess) return;
    const s = sess.s;
    s.onLobby = bump;
    if (sess.role === "client") {
      sess.s.onStatus = bump;
      sess.s.onStart = () => {
        const h = sess.s.matchHandle();
        if (h) onStart(h);
      };
    }
    const iv = setInterval(bump, 500);
    return () => {
      clearInterval(iv);
      s.onLobby = null;
    };
  }, [sess, onStart]);

  const lobby = sess ? (sess.role === "host" ? sess.s.lobbyState() : sess.s.lobby) : null;
  const slots = lobby?.slots ?? 6;
  const choice = lobby?.choice ?? false;
  // mantém a escolha de defensores sincronizada com a sala
  useEffect(() => {
    if (!sess) return;
    const list = pick.slice(0, slots);
    if (sess.role === "host") sess.s.setProfile({ loadout: list, levels: save.defLevels, aura: save.cosmetics.aura, shot: save.cosmetics.shot, name: save.name });
    else sess.s.setProfile({ loadout: list, levels: save.defLevels });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, slots, myRole, sess]);

  const configureHost = (h: HostSession) => {
    if (init.mode === "daily" && init.daily) h.configure({ level: init.daily.level, mode: "daily", mods: init.daily.mods, emphasis: init.daily.emphasis, seed: init.daily.seed, rewardMul: 1 });
    else if (init.mode === "tutorial") h.configure({ level: 0, mode: "tutorial", mods: [], emphasis: [], rewardMul: 1 });
    else {
      const ev = currentEvent();
      h.configure({ level: init.level, mode: "campaign", mods: [], emphasis: ev.emphasis, rewardMul: ev.rewardMul });
    }
  };

  const createHost = (k: BusKind | "offline") => {
    try {
      const room = makeRoomCode();
      const bus = k === "offline" ? null : createBus(k, room, "host", "host", save.settings.relayUrl.trim());
      const h = new HostSession({ bus, room, profile: profile(), avail });
      configureHost(h);
      setSess({ role: "host", s: h, kind: k });
      setErr("");
      return h;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    }
  };

  // entrada direta no modo offline (solo / treino / desafio)
  useEffect(() => {
    if (!sess && init.entry === "offline") createHost("offline");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = () => {
    const room = code.trim().toUpperCase();
    if (room.length < 3) return setErr("Digite o código da sala.");
    try {
      const c = new ClientSession({ factory: () => createBus(kind, room, makePeerId(), "guest", save.settings.relayUrl.trim()), room, profile: profile(), store: typeof sessionStorage !== "undefined" ? sessionStorage : null });
      setSess({ role: "client", s: c, kind });
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const leave = () => {
    if (sess) sess.s instanceof HostSession ? sess.s.dispose() : (sess.s as ClientSession).leave();
    setSess(null);
    onBack();
  };

  /* ------------------------------ configuração inicial ------------------------------ */
  if (!sess && init.entry === "offline") {
    return (
      <Screen title="Preparando partida" subtitle={init.mode === "daily" ? "Carregando o desafio diário" : init.mode === "tutorial" ? "Preparando o treino" : `Carregando a fase ${init.level}`} onBack={onBack}>
        <div className="glass mt-4 rounded-2xl p-6 text-center">
          <div className="text-4xl anim-float">🌱</div>
          <p className="mt-2 text-sm text-white/65">Preparando seu jardim…</p>
        </div>
      </Screen>
    );
  }
  if (!sess) {
    return (
      <Screen title="Cooperativo" subtitle="Crie uma sala ou entre com um código" onBack={onBack}>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <section className="glass rounded-2xl p-4">
            <h2 className="font-display text-2xl text-[#2ee6c5]">Criar sala</h2>
            <p className="mt-1 text-xs text-white/60">Você é o anfitrião: a partida roda no seu aparelho e os outros jogadores se conectam a você.</p>
            <Transport kind={kind} setKind={setKind} />
            <Btn className="mt-3 w-full" onClick={() => createHost(kind)}>
              Criar sala
            </Btn>
          </section>
          <section className="glass rounded-2xl p-4">
            <h2 className="font-display text-2xl text-[#a98bff]">Entrar numa sala</h2>
            <p className="mt-1 text-xs text-white/60">Digite o código que o anfitrião compartilhou.</p>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="CÓDIGO" aria-label="Código da sala" className="font-display mt-3 w-full rounded-xl bg-black/40 px-4 py-3 text-center text-3xl tracking-[0.3em] ring-1 ring-white/15 placeholder:text-white/20" />
            <Transport kind={kind} setKind={setKind} />
            <Btn className="mt-3 w-full" kind="gold" onClick={join}>
              Entrar
            </Btn>
          </section>
        </div>
        {kind === "relay" && (
          <section className="glass mt-3 rounded-2xl p-4">
            <label className="text-xs font-bold text-white/70">Endereço do servidor relay</label>
            <input value={save.settings.relayUrl} onChange={(e) => patch((s) => ({ ...s, settings: { ...s.settings, relayUrl: e.target.value } }))} placeholder="wss://seu-servidor.exemplo.com" className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2.5 text-sm ring-1 ring-white/15" />
            <p className="mt-1 text-[11px] text-white/45">Nenhum servidor é incluído por padrão. Veja o README para hospedar o seu (arquivo server/relay.mjs).</p>
          </section>
        )}
        {err && <p className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-200 ring-1 ring-red-400/30">⚠ {err}</p>}
        <p className="mt-4 text-center text-xs text-white/45">Prefere jogar sozinho ou com aliados controlados por IA? Use "Campanha" no menu.</p>
      </Screen>
    );
  }

  /* ------------------------------ sala ------------------------------ */
  const host = sess.role === "host" ? sess.s : null;
  const client = sess.role === "client" ? sess.s : null;
  const level = lobby?.level ?? init.level;
  const ldef = getLevel(level);
  const status = client?.status ?? "local";
  const seats = lobby?.seats ?? [];
  const mySeat = host ? 0 : client?.seat ?? -1;
  const humans = seats.filter((s) => s.kind === "human").length;
  const roomMode = lobby?.mode ?? init.mode;
  const team = new Set<DefId>();
  seats.forEach((s) => s.loadout.forEach((d) => team.add(d)));
  const classes = new Set<DefClass>([...team].map((d) => DEF_BY_ID[d].cls));
  const offline = sess.role === "host" && sess.kind === "offline";
  const solo = (lobby?.seats.length ?? 1) < CHOICE_MIN_PLAYERS;
  const soloKit = soloDeck(avail, level);

  const title = roomMode === "daily" ? "Desafio Diário" : roomMode === "tutorial" ? "Treino" : offline ? "Preparar partida" : "Sala cooperativa";
  const lost = status === "lost" || status === "closed" || status === "rejected";

  return (
    <Screen title={title} subtitle={roomMode === "tutorial" ? "Aprenda o básico em minutos" : `Fase ${level} · ${ldef.name}`} onBack={leave} wide>
      {lost && (
        <div className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
          ⚠ {client?.reason || "Conexão encerrada."} <button className="ml-2 underline" onClick={leave}>Voltar</button>
        </div>
      )}
      <div className="mt-3 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {/* conexão */}
          {!offline && (
            <section className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Código da sala</div>
                <div className="font-display text-5xl leading-none tracking-[0.2em] text-[#2ee6c5]">{lobby?.room ?? sess.s.room}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Chip color={sess.kind === "relay" ? "#7fd8ff" : "#ffcf4a"}>{sess.kind === "relay" ? "🌐 Online (relay)" : "🗂 Abas deste navegador"}</Chip>
                <Chip color={status === "connected" || status === "local" ? "#5fe08a" : "#ff8f6b"}>{status === "local" ? "Anfitrião" : status === "connected" ? "Conectado" : status === "connecting" ? "Conectando…" : status === "reconnecting" ? "Reconectando…" : "Desconectado"}</Chip>
                <button className="text-xs font-bold text-white/70 underline" onClick={() => { void navigator.clipboard?.writeText(lobby?.room ?? sess.s.room); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
                  {copied ? "✔ Copiado" : "Copiar código"}
                </button>
              </div>
              {sess.kind === "tabs" && <p className="w-full text-[11px] leading-snug text-white/50">Abra o jogo em outra aba ou janela <b>deste mesmo navegador</b> e entre com o código. Para jogar com pessoas em outros aparelhos é necessário um servidor relay (modo "Online").</p>}
            </section>
          )}

          {/* fase */}
          {host && roomMode === "campaign" && (
            <section className="glass rounded-2xl p-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/45">Fase</label>
              <select value={level} onChange={(e) => host.configure({ level: Number(e.target.value) })} className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2.5 text-sm font-bold ring-1 ring-white/15">
                {LEVELS.filter((l) => l.n <= unlockedLevel).map((l) => (
                  <option key={l.n} value={l.n}>
                    {l.n}. {l.name}
                    {l.boss ? " 👑" : ""}
                  </option>
                ))}
              </select>
            </section>
          )}
          {(ldef.mods.length > 0 || (lobby?.mods.length ?? 0) > 0) && roomMode !== "tutorial" && (
            <div className="flex flex-wrap gap-1.5">
              {(roomMode === "daily" ? lobby?.mods ?? [] : ldef.mods).map((m) => (
                <span key={m} title={MOD_INFO[m].desc} className="rounded-lg bg-white/8 px-2 py-1 text-[11px] font-bold ring-1 ring-white/10">
                  {MOD_INFO[m].icon} {MOD_INFO[m].label}
                </span>
              ))}
            </div>
          )}

          {/* participantes */}
          <section className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Participantes</h2>
              <span className="text-xs font-bold text-white/55">
                {seats.length}/{MAX_PLAYERS} · ameaça +{Math.round(Math.max(0, seats.length - 1) * 35)}%
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                const s = seats[i];
                if (!s)
                  return (
                    <div key={i} className="grid min-h-[68px] place-items-center rounded-xl border-2 border-dashed border-white/12 text-xs text-white/30">
                      vaga {i + 1} aberta
                    </div>
                  );
                const me = i === mySeat;
                return (
                  <div key={i} className="rounded-xl bg-black/30 p-2.5 ring-1" style={{ boxShadow: `inset 0 0 0 1px ${me ? s.color : "rgba(255,255,255,.08)"}` }}>
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black text-[#07120f]" style={{ background: SEAT_COLORS[i] }}>
                        {s.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold">
                          {s.name} {me && <span className="text-[#2ee6c5]">(você)</span>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {s.kind === "ai" ? <Chip color="#9fb3a8">🤖 Aliado IA</Chip> : s.local ? <Chip color="#ffcf4a">👑 Anfitrião</Chip> : s.connected ? <Chip color="#5fe08a">Conectado</Chip> : <Chip color="#ff8f6b">Reconectando…</Chip>}
                          <Chip color={ROLE_BY_ID[s.role]?.color ?? "#9fb3a8"}>{ROLE_BY_ID[s.role]?.icon} {ROLE_BY_ID[s.role]?.name}</Chip>
                        </div>
                      </div>
                    </div>
                    {s.loadout.length > 0 && (
                      <div className="mt-1.5 flex gap-1">
                        {s.loadout.map((d) => (
                          <span key={d} title={DEF_BY_ID[d].name} className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-white/6">
                            <Sprite kind="def" id={d} size={28} animate={false} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {host && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-black/30 p-2.5">
                <div>
                  <div className="text-sm font-extrabold">Aliados controlados por IA</div>
                  <div className="text-[11px] text-white/50">Completam a equipe. Identificados como IA, nunca como jogadores.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="h-9 w-9 rounded-lg bg-white/10 text-lg font-black disabled:opacity-30" disabled={lobby!.allies <= 0} onClick={() => host.setAllies(lobby!.allies - 1)} aria-label="Menos aliados">−</button>
                  <span className="w-5 text-center text-lg font-black">{lobby?.allies ?? 0}</span>
                  <button className="h-9 w-9 rounded-lg bg-white/10 text-lg font-black disabled:opacity-30" disabled={seats.length >= MAX_PLAYERS} onClick={() => host.setAllies(lobby!.allies + 1)} aria-label="Mais aliados">+</button>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          {/* deck */}
          <section className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{solo ? "Kit da fase" : "Seu deck"}</h2>
              <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-black ring-1 ring-white/10">{solo ? soloKit.length : Math.min(pick.length, slots)}/{slots}</span>
            </div>
            {solo ? (
              <>
                <p className="mt-1 text-xs text-white/60">Sozinho você joga com 4 defensores-base e 2 destaques que mudam a cada fase. <b>A escolha livre abre com {CHOICE_MIN_PLAYERS}+ participantes</b> (adicione um aliado IA ou chame alguém).</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {soloKit.map((d) => (
                    <div key={d} className="rounded-xl bg-black/30 p-2 text-center ring-1 ring-white/8">
                      <div className="grid place-items-center"><Sprite kind="def" id={d} size={56} animate={false} /></div>
                      <div className="mt-1 truncate text-[11px] font-bold">{DEF_BY_ID[d].name}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-white/60">Escolha até {slots}. A equipe compartilha a seiva; os aliados IA completam o que faltar.</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {DEFENDERS.map((d) => {
                    const has = avail.includes(d.id);
                    const on = pick.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        disabled={!has}
                        onClick={() => setPick((p) => (p.includes(d.id) ? p.filter((x) => x !== d.id) : p.length >= slots ? p : [...p, d.id]))}
                        className={`relative rounded-xl p-1.5 text-center ring-2 transition ${on ? "bg-[#2ee6c5]/15 ring-[#2ee6c5]" : "bg-black/30 ring-white/6 hover:ring-white/25"} ${!has ? "opacity-40" : ""}`}
                        title={has ? d.power : "Ainda bloqueado"}
                      >
                        <div className="grid place-items-center"><Sprite kind="def" id={d.id} size={52} animate={false} dark={!has} /></div>
                        <div className="truncate text-[10px] font-bold">{has ? d.name : "🔒"}</div>
                        <div className="text-[10px] font-black text-amber-300">{d.cost}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* função do participante */}
          <section className="glass rounded-2xl p-4">
            <h2 className="font-display text-2xl">Sua função</h2>
            <p className="text-[11px] text-white/50">Cada participante recebe um bônus diferente. Todos os bônus são cooperativos.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button key={r.id} onClick={() => setMyRole(r.id)} title={r.perk} className={`rounded-xl p-2 text-left ring-2 transition ${myRole === r.id ? "bg-white/10" : "bg-black/25 hover:bg-white/8"}`} style={{ boxShadow: myRole === r.id ? `0 0 0 2px ${r.color}` : undefined }}>
                  <div className="text-sm font-black" style={{ color: r.color }}>{r.icon} {r.name}</div>
                  <div className="text-[10px] leading-tight text-white/55">{r.perk}</div>
                </button>
              ))}
            </div>
          </section>

          {/* deck compartilhado da equipe */}
          <section className="glass rounded-2xl p-4">
            <h2 className="font-display text-xl">Deck da equipe</h2>
            <p className="text-[11px] text-white/50">O que todos juntos levam para a partida.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(CLASS_INFO) as DefClass[]).map((c) => (
                <Chip key={c} color={classes.has(c) ? CLASS_INFO[c].color : "#6b7a74"} className={classes.has(c) ? "" : "opacity-60"}>
                  {classes.has(c) ? "✔" : "✘"} {CLASS_INFO[c].label}
                </Chip>
              ))}
            </div>
            {!seats.some((s) => s.loadout.includes("luminia") || s.loadout.includes("ambar")) && !solo && <p className="mt-2 text-xs text-amber-300">⚠ Ninguém levou um Gerador: sem economia de seiva!</p>}
            {!seats.some((s) => s.loadout.some((d) => DEF_BY_ID[d].air)) && !solo && <p className="mt-1 text-xs text-amber-300">⚠ Ninguém leva defensor que acerte voadores.</p>}
          </section>

          {host ? (
            <Btn big className="w-full" onClick={() => { const cfg = host.start(); if (cfg) onStart(host.matchHandle()); }} disabled={!choice ? false : pick.length === 0}>
              ▶ Iniciar {roomMode === "tutorial" ? "treino" : `fase ${level}`}
            </Btn>
          ) : (
            <div className="glass rounded-2xl p-4 text-center text-sm text-white/70">{status === "connected" ? "Aguardando o anfitrião iniciar a partida…" : "Conectando à sala…"}</div>
          )}
          {humans > 1 && host && <p className="text-center text-[11px] text-white/40">Com outras pessoas conectadas a partida não pode ser pausada.</p>}
        </div>
      </div>
    </Screen>
  );
}

function Transport({ kind, setKind }: { kind: BusKind; setKind: (k: BusKind) => void }) {
  const opts: { id: BusKind; label: string; sub: string }[] = [
    { id: "tabs", label: "Abas do mesmo navegador", sub: "Sem servidor · mesmo aparelho" },
    { id: "relay", label: "Online (servidor relay)", sub: "Aparelhos diferentes · requer servidor" },
  ];
  return (
    <div className="mt-3 grid gap-2">
      {opts.map((o) => (
        <button key={o.id} onClick={() => setKind(o.id)} className={`rounded-xl p-2.5 text-left ring-2 ${kind === o.id ? "bg-white/10 ring-[#2ee6c5]" : "bg-black/25 ring-white/8 hover:ring-white/25"}`}>
          <div className="text-sm font-extrabold">{o.label}</div>
          <div className="text-[11px] text-white/50">{o.sub}</div>
        </button>
      ))}
    </div>
  );
}

export { AI_NAMES, slotsFor, dailyConfig };
