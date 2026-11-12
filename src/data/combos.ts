import type { PlantTag } from "./defenders";

export interface ComboRule {
  id: string;
  name: string;
  a: PlantTag;
  b: PlantTag;
  effect: string;
  color: string;
  desc: string;
}

/** Sinergias reais: aplicadas pelo motor quando duas plantas com as tags ficam adjacentes. */
export const COMBOS: ComboRule[] = [
  { id: "condutividade", name: "Condutividade", a: "electric", b: "aquatic", effect: "chain", color: "#7fd8ff", desc: "Cadeia elétrica atinge +2 alvos e atravessa a água." },
  { id: "estilhaco_gelado", name: "Estilhaço Gelado", a: "ice", b: "explosive", effect: "freezeBoom", color: "#bfeaff", desc: "Explosões também desaceleram os inimigos atingidos." },
  { id: "trinca_armada", name: "Trinca Armada", a: "protective", b: "attacker", effect: "guard", color: "#ffd45a", desc: "Atacantes protegidos recebem 20% menos dano." },
  { id: "sintonia_solar", name: "Sintonia Cósmica", a: "solar", b: "cosmic", effect: "energy", color: "#ffe27a", desc: "Geradores próximos produzem 25% mais seiva." },
  { id: "veneno_perfurante", name: "Veneno Perfurante", a: "poison", b: "attacker", effect: "poisonPierce", color: "#a3ff5a", desc: "Projéteis perfurantes aplicam veneno em cada alvo." },
  { id: "incendio_controlado", name: "Incêndio Controlado", a: "fire", b: "protective", effect: "warmth", color: "#ff7a3a", desc: "Muralhas aquecidas regeneram 4 de vida/s." },
  { id: "jardim_aurora", name: "Jardim Aurora", a: "support", b: "solar", effect: "bloom", color: "#5fe08a", desc: "Curas e regenerações ficam 30% mais fortes." },
];

export const COMBO_BY_EFFECT = Object.fromEntries(COMBOS.map((c) => [c.effect, c])) as Record<string, ComboRule>;

export function comboFor(tagsA: PlantTag[], tagsB: PlantTag[]): ComboRule | null {
  for (const r of COMBOS) if (tagsA.includes(r.a) && tagsB.includes(r.b)) return r;
  for (const r of COMBOS) if (tagsA.includes(r.b) && tagsB.includes(r.a)) return r;
  return null;
}
