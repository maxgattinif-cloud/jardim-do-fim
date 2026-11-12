import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COSMETIC_BY_ID } from "../data/cosmetics";
import { DEF_BY_ID, MAX_DEF_LEVEL, UPGRADE_COST, type DefId } from "../data/defenders";
import { sanitizeName } from "../data/rules";
import { ACHIEVEMENTS, applyResult, type ResultSummary } from "../data/progression";
import { availableDefs } from "../game/decks";
import { defaultSave, loadSave, normalize, persist, rollDaily, SAVE_KEY, type Save } from "../game/save";
import { sound } from "../game/sound";
import type { MatchResult } from "../game/types";

interface Api {
  save: Save;
  avail: DefId[];
  unlockedLevel: number;
  apply: (r: MatchResult) => ResultSummary;
  upgrade: (id: DefId) => boolean;
  buyCosmetic: (id: string) => boolean;
  equip: (kind: "aura" | "shot", id: string) => void;
  claimQuest: (id: string, reward: number) => void;
  patch: (fn: (s: Save) => Save) => void;
  rename: (n: string) => void;
  exportSave: () => string;
  importSave: (text: string) => boolean;
  reset: () => void;
  grantTest: () => void;
}

const Ctx = createContext<Api | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<Save>(() => rollDaily(loadSave()));
  const ref = useRef(save);
  ref.current = save;

  useEffect(() => persist(save), [save]);
  useEffect(() => {
    const s = save.settings;
    sound.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
  }, [save.settings]);
  useEffect(() => {
    const roll = () => document.visibilityState === "visible" && setSave((s) => rollDaily(s));
    document.addEventListener("visibilitychange", roll);
    return () => document.removeEventListener("visibilitychange", roll);
  }, []);

  const patch = useCallback((fn: (s: Save) => Save) => setSave((s) => fn(s)), []);

  const api = useMemo<Api>(
    () => ({
      save,
      avail: availableDefs(save.completed, Object.keys(save.achievements)),
      unlockedLevel: Math.min(50, save.completed + 1),
      apply: (r) => {
        const out = applyResult(ref.current, r);
        ref.current = out.save;
        setSave(out.save);
        return out.summary;
      },
      upgrade: (id) => {
        const s = ref.current;
        const lv = s.defLevels[id] ?? 1;
        const cost = UPGRADE_COST[lv] ?? 0;
        if (lv >= MAX_DEF_LEVEL || s.coins < cost || !DEF_BY_ID[id]) return false;
        let next: Save = { ...s, coins: s.coins - cost, defLevels: { ...s.defLevels, [id]: lv + 1 } };
        const ach = ACHIEVEMENTS.find((a) => a.id === "evolucao")!;
        if (!next.achievements[ach.id] && ach.check(next)) next = { ...next, coins: next.coins + ach.reward, achievements: { ...next.achievements, [ach.id]: Date.now() } };
        ref.current = next;
        setSave(next);
        return true;
      },
      buyCosmetic: (id) => {
        const s = ref.current;
        const c = COSMETIC_BY_ID[id];
        if (!c || c.source !== "earn" || s.cosmetics.owned.includes(id) || s.coins < c.price) return false;
        const next = { ...s, coins: s.coins - c.price, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, id] } };
        ref.current = next;
        setSave(next);
        return true;
      },
      equip: (kind, id) => setSave((s) => (s.cosmetics.owned.includes(id) ? { ...s, cosmetics: { ...s.cosmetics, [kind]: id } } : s)),
      claimQuest: (id, reward) =>
        setSave((s) => ({ ...s, coins: s.coins + reward, quests: { ...s.quests, list: s.quests.list.map((q) => (q.id === id ? { ...q, claimed: true } : q)) } })),
      patch,
      rename: (n) => setSave((s) => ({ ...s, name: sanitizeName(n, s.name) })),
      exportSave: () => JSON.stringify(ref.current, null, 2),
      importSave: (text) => {
        try {
          const s = normalize(JSON.parse(text));
          setSave(s);
          return true;
        } catch {
          return false;
        }
      },
      reset: () => {
        try {
          localStorage.removeItem(SAVE_KEY);
        } catch {
          /* ignora */
        }
        setSave(defaultSave());
      },
      grantTest: () => setSave((s) => ({ ...s, completed: 50, coins: s.coins + 5000, tutorialDone: true })),
    }),
    [save, patch]
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSave() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSave fora do SaveProvider");
  return v;
}
