// Cosméticos: só alteram a aparência. Nenhum item muda o equilíbrio da partida.
export type CosmeticKind = "aura" | "shot";

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  name: string;
  color: string;
  color2: string;
  price: number; // sementes (moeda do jogo). 0 = já vem liberado
  /** "store" = reservado para a futura loja com dinheiro real (desativada). */
  source: "free" | "earn" | "store" | "reward";
  desc: string;
}

export const WORLD_AURAS = ["aura_vale", "aura_pantano", "aura_floresta", "aura_deserto", "aura_devorador"];

export const COSMETICS: Cosmetic[] = [
  { id: "aura_vale", kind: "aura", name: "Coroa do Vale", color: "#7be05a", color2: "#1b5a2a", price: 0, source: "reward", desc: "Recompensa por completar o Vale das Sementes." },
  { id: "aura_pantano", kind: "aura", name: "Bruma do Pântano", color: "#4fd8b0", color2: "#0d3a32", price: 0, source: "reward", desc: "Recompensa por completar o Pântano das Sombras." },
  { id: "aura_floresta", kind: "aura", name: "Esporos Mutantes", color: "#b98bff", color2: "#2b1c50", price: 0, source: "reward", desc: "Recompensa por completar a Floresta Mutante." },
  { id: "aura_deserto", kind: "aura", name: "Cinzas Douradas", color: "#ffb347", color2: "#6a3418", price: 0, source: "reward", desc: "Recompensa por completar o Deserto das Cinzas." },
  { id: "aura_devorador", kind: "aura", name: "Halo do Devorador", color: "#ff7ae0", color2: "#3b1768", price: 0, source: "reward", desc: "Recompensa EXCLUSIVA da fase 50." },

  { id: "aura_esmeralda", kind: "aura", name: "Brilho Esmeralda", color: "#2ee6c5", color2: "#0b6b5a", price: 0, source: "free", desc: "O brilho padrão dos guardiões." },
  { id: "aura_brasa", kind: "aura", name: "Brasa Âmbar", color: "#ffb020", color2: "#a34a00", price: 300, source: "earn", desc: "Um calor dourado sob os pés." },
  { id: "aura_lunar", kind: "aura", name: "Gelo Lunar", color: "#9fe6ff", color2: "#2a6aa8", price: 500, source: "earn", desc: "Névoa azul de luar." },
  { id: "aura_aurora", kind: "aura", name: "Aurora Violeta", color: "#c07bff", color2: "#4a1d88", price: 0, source: "store", desc: "Edição de lançamento (loja futura)." },
  { id: "aura_coroa", kind: "aura", name: "Halo Dourado", color: "#ffe27a", color2: "#b8860b", price: 0, source: "store", desc: "Edição de lançamento (loja futura)." },
  { id: "shot_padrao", kind: "shot", name: "Dardos Verdes", color: "#7dff9a", color2: "#1e8a3c", price: 0, source: "free", desc: "Projéteis padrão." },
  { id: "shot_dourado", kind: "shot", name: "Dardos Dourados", color: "#ffe14a", color2: "#c28a00", price: 250, source: "earn", desc: "Rastro de ouro." },
  { id: "shot_rubi", kind: "shot", name: "Espinhos Rubi", color: "#ff5a7a", color2: "#a01030", price: 400, source: "earn", desc: "Dardos cor de rubi." },
  { id: "shot_faisca", kind: "shot", name: "Faíscas Violeta", color: "#d9a8ff", color2: "#6a2fc0", price: 0, source: "store", desc: "Edição de lançamento (loja futura)." },
];

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c])) as Record<string, Cosmetic>;
export const DEFAULT_AURA = "aura_esmeralda";
export const DEFAULT_SHOT = "shot_padrao";
