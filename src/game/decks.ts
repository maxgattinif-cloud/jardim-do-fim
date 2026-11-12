import { AI_PRIORITY, DEF_BY_ID, DEFENDERS, type DefDef, type DefId } from "../data/defenders";
import { slotsFor } from "../data/rules";

/** Defensores liberados dado o progresso (níveis concluídos e conquistas). */
export function availableDefs(completedLevels: number, achievements: string[] = []): DefId[] {
  return DEFENDERS.filter((d) => d.unlock.kind === "start" || (d.unlock.kind === "level" && completedLevels >= d.unlock.n) || (d.unlock.kind === "achv" && achievements.includes(d.unlock.id))).map((d) => d.id);
}

const CORE: DefId[] = ["luminia", "espinheiro", "tronco", "magma"];
const rank = (d: DefDef) => (d.unlock.kind === "start" ? 0 : d.unlock.kind === "level" ? d.unlock.n : 8);

/**
 * Kit fixo do modo solo (1 participante, sem escolha): 4 defensores-base + 2 destaques.
 * O destaque 1 é sempre o desbloqueio mais recente; o 2 muda a cada fase (variedade).
 */
export function soloDeck(avail: DefId[], level = 1): DefId[] {
  const core = CORE.filter((id) => avail.includes(id));
  const others = DEFENDERS.filter((d) => avail.includes(d.id) && !CORE.includes(d.id))
    .sort((a, b) => rank(b) - rank(a))
    .map((d) => d.id);
  const feat: DefId[] = [];
  if (others[0]) feat.push(others[0]);
  const rest = others.slice(1);
  for (let i = 0; feat.length < 2 && rest.length && i < 12; i++) {
    const pick = rest[(level * 3 + i) % rest.length];
    if (!feat.includes(pick)) feat.push(pick);
  }
  return [...core, ...feat].slice(0, 6);
}

/** Aliados IA completam o que falta ao time (evita repetir o que os humanos já levaram). */
export function aiLoadouts(humans: DefId[][], aiCount: number, total: number, avail: DefId[]): DefId[][] {
  const counts: Record<string, number> = {};
  humans.flat().forEach((id) => (counts[id] = (counts[id] ?? 0) + 1));
  const slots = slotsFor(total);
  const out: DefId[][] = [];
  for (let i = 0; i < aiCount; i++) {
    const sorted = AI_PRIORITY.filter((id) => avail.includes(id)).sort((a, b) => {
      const d = (counts[a] ?? 0) - (counts[b] ?? 0);
      return d !== 0 ? d : AI_PRIORITY.indexOf(a) - AI_PRIORITY.indexOf(b);
    });
    const pick = sorted.slice(0, slots);
    pick.forEach((id) => (counts[id] = (counts[id] ?? 0) + 1));
    out.push(pick);
  }
  return out;
}

export function sanitizeLoadout(list: unknown, avail: DefId[], slots: number): DefId[] {
  if (!Array.isArray(list)) return [];
  const out: DefId[] = [];
  for (const id of list) if (typeof id === "string" && DEF_BY_ID[id as DefId] && avail.includes(id as DefId) && !out.includes(id as DefId) && out.length < slots) out.push(id as DefId);
  return out;
}

export function sanitizeLevels(levels: unknown): Partial<Record<DefId, number>> {
  const out: Partial<Record<DefId, number>> = {};
  if (levels && typeof levels === "object") {
    for (const [k, v] of Object.entries(levels as Record<string, unknown>)) {
      if (DEF_BY_ID[k as DefId] && typeof v === "number") out[k as DefId] = Math.max(1, Math.min(3, Math.floor(v)));
    }
  }
  return out;
}
