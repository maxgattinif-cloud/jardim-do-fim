import { useCallback, useEffect, useRef, useState } from "react";
import { dailyConfig } from "./data/progression";
import { makeRoomCode } from "./net/bus";
import { HostSession, type MatchHandle } from "./net/session";
import { sound } from "./game/sound";
import { finishCrazyGamesLoading, setCrazyGamesGameplay } from "./services/crazygames";
import { SaveProvider, useSave } from "./ui/SaveContext";
import { TitleScreen } from "./ui/TitleScreen";
import { ProfileScreen } from "./ui/ProfileScreen";
import { MainMenu, type Dest } from "./ui/MainMenu";
import { CampaignScreen } from "./ui/CampaignScreen";
import { CollectionScreen } from "./ui/CollectionScreen";
import { LobbyScreen, type LobbyInit, type Sess } from "./ui/LobbyScreen";
import { MatchScreen } from "./ui/MatchScreen";
import { CosmeticsScreen, QuestsScreen, RankingScreen, SettingsScreen } from "./ui/Extras";

type Screen = "title" | "profile" | "menu" | "campaign" | "lobby" | "match" | "collection" | "quests" | "cosmetics" | "ranking" | "settings";

function Shell() {
  const { save, avail } = useSave();
  const [screen, setScreen] = useState<Screen>("title");
  const [init, setInit] = useState<LobbyInit>({ level: 1, mode: "campaign", entry: "setup" });
  const [sess, setSessState] = useState<Sess | null>(null);
  const [handle, setHandle] = useState<MatchHandle | null>(null);
  const sessRef = useRef<Sess | null>(null);
  sessRef.current = sess;

  const setSess = useCallback((s: Sess | null) => setSessState(s), []);

  // Finaliza a medição de carregamento após a montagem inicial do jogo.
  useEffect(() => {
    void finishCrazyGamesLoading();
  }, []);

  // A CrazyGames precisa saber quando a partida começa e quando o jogador volta aos menus.
  useEffect(() => {
    void setCrazyGamesGameplay(screen === "match");
    return () => {
      void setCrazyGamesGameplay(false);
    };
  }, [screen, handle?.cfg.mid]);

  // ritmo das sessões de rede (lobby e partida)
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      sessRef.current?.s.tick(dt);
    }, 50);
    const bye = () => {
      const s = sessRef.current;
      if (s?.role === "host") s.s.dispose();
      else if (s?.role === "client") s.s.leave();
    };
    window.addEventListener("beforeunload", bye);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", bye);
    };
  }, []);

  // convidado: quando o anfitrião volta ao lobby ou inicia outra partida
  useEffect(() => {
    if (!sess || sess.role !== "client") return;
    const c = sess.s;
    const prevStart = c.onStart;
    c.onStart = (cfg) => {
      prevStart?.(cfg);
      const h = c.matchHandle();
      if (h) {
        setHandle(h);
        setScreen("match");
      }
    };
    const prevLobby = c.onLobby;
    c.onLobby = () => {
      prevLobby?.();
      if (screen === "match" && c.lobby?.phase === "lobby" && !c.cfg) {
        setHandle(null);
        setScreen("lobby");
      }
    };
    return () => {
      c.onStart = prevStart;
      c.onLobby = prevLobby;
    };
  }, [sess, screen]);

  const closeSession = useCallback(() => {
    const s = sessRef.current;
    if (s?.role === "host") s.s.dispose();
    else if (s?.role === "client") s.s.leave();
    setSessState(null);
    setHandle(null);
  }, []);

  const profile = () => ({ name: save.name, levels: save.defLevels, aura: save.cosmetics.aura, shot: save.cosmetics.shot, loadout: [] });

  const quickStart = (level: number, mode: "campaign" | "tutorial") => {
    closeSession();
    const h = new HostSession({ bus: null, room: makeRoomCode(), profile: profile(), avail });
    h.configure({ level, mode, mods: [], emphasis: [], rewardMul: 1 });
    h.start();
    setSessState({ role: "host", s: h, kind: "offline" });
    setHandle(h.matchHandle());
    setScreen("match");
  };

  const openLobby = (i: LobbyInit) => {
    closeSession();
    setInit(i);
    setScreen("lobby");
  };

  const go = (d: Dest) => {
    sound.play("click");
    if (d === "daily") {
      const dc = dailyConfig();
      return openLobby({ level: dc.level, mode: "daily", daily: dc, entry: "offline" });
    }
    if (d === "tutorial") return quickStart(0, "tutorial");
    setScreen(d);
  };

  const toMenu = () => {
    closeSession();
    setScreen("menu");
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {screen === "title" && <TitleScreen onStart={() => setScreen(save.profileReady ? "menu" : "profile")} />}
      {screen === "profile" && <ProfileScreen onComplete={() => setScreen("menu")} />}
      {screen === "menu" && <MainMenu go={go} />}
      {screen === "campaign" && <CampaignScreen onBack={() => setScreen("menu")} onSolo={(n) => openLobby({ level: n, mode: "campaign", entry: "offline" })} />}
      {screen === "collection" && <CollectionScreen onBack={() => setScreen("menu")} />}
      {screen === "quests" && <QuestsScreen onBack={() => setScreen("menu")} onDaily={() => go("daily")} />}
      {screen === "cosmetics" && <CosmeticsScreen onBack={() => setScreen("menu")} />}
      {screen === "ranking" && <RankingScreen onBack={() => setScreen("menu")} />}
      {screen === "settings" && <SettingsScreen onBack={() => setScreen("menu")} />}
      {screen === "lobby" && (
        <LobbyScreen
          init={init}
          sess={sess}
          setSess={setSess}
          onStart={(h) => {
            setHandle(h);
            setScreen("match");
          }}
          onBack={() => {
            closeSession();
            setScreen(init.mode === "campaign" && init.entry === "offline" ? "campaign" : "menu");
          }}
        />
      )}
      {screen === "match" && handle && sess && (
        <MatchScreen
          key={handle.cfg.mid}
          handle={handle}
          sess={sess}
          onExit={toMenu}
          onNext={(level) => {
            if (sess.role !== "host") return;
            const h = sess.s;
            h.backToLobby();
            h.configure({ level });
            setInit({ level, mode: "campaign", entry: "offline" });
            setHandle(null);
            setScreen("lobby");
          }}
          onLobby={() => {
            if (sess.role === "host") sess.s.backToLobby();
            setHandle(null);
            setScreen("lobby");
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <SaveProvider>
      <Shell />
    </SaveProvider>
  );
}
