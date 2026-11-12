import type { RoleId } from "../game/types";

export interface RoleDef {
  id: RoleId;
  name: string;
  icon: string;
  color: string;
  desc: string;
  perk: string;
}
export const ROLES: RoleDef[] = [
  { id: "comandante", name: "Comandante", icon: "✦", color: "#2ee6c5", desc: "Organiza a defesa e acelera o plantio.", perk: "Recarga das cartas −15%" },
  { id: "agricultor", name: "Agricultor", icon: "☀", color: "#ffcf4a", desc: "Cuida da economia de seiva da equipe.", perk: "Seiva gerada +20%" },
  { id: "atirador", name: "Atirador", icon: "➶", color: "#7bdc6b", desc: "Especialista em dano à distância.", perk: "Dano dos seus defensores +15%" },
  { id: "curandeiro", name: "Curandeiro", icon: "✚", color: "#5fe08a", desc: "Mantém o jardim vivo.", perk: "Cura +30% e vida das plantas +10%" },
  { id: "guarda", name: "Guarda", icon: "⛨", color: "#c9a26a", desc: "Segura as linhas mais pressionadas.", perk: "Vida das suas plantas +25%" },
  { id: "tatico", name: "Tático", icon: "◇", color: "#a98bff", desc: "Coordena combinações e avisos.", perk: "Sinergias +1 efeito, pings ilimitados" },
];
export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleDef>;
export const ROLE_ORDER: RoleId[] = ROLES.map((r) => r.id);
export const roleOf = (role: RoleId | undefined, seat: number): RoleId => role ?? ROLE_ORDER[seat % ROLES.length];
