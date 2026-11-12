// Gerador procedural de personagens da Edição 3.0.
// Cada novo defensor/inimigo tem forma, paleta, traços e animação próprios —
// nada aqui é um "placeholder": o desenho muda de acordo com os dados do catálogo.
import { TAU, ball, glow, groundShadow, hash, limb, poly, rgba, shade, type Ctx } from "./art";
import type { DefDef } from "../data/defenders";
import type { EnemyDef } from "../data/enemies";
import type { DefFx } from "./defenders";
import type { EnemyFx } from "./enemies";

const seedOf = (id: string) => Array.from(id).reduce((a, ch) => a + ch.charCodeAt(0), 0);
const h = (id: string, n: number) => hash(seedOf(id) + n * 13.7);

function face(c: Ctx, x: number, y: number, r: number, mood: "happy" | "angry" | "calm", iris = "#1a1a22") {
  for (const s of [-1, 1]) {
    ball(c, x + s * r * 0.9, y, r * 0.62, r * 0.72, "#fff");
    ball(c, x + s * r * 0.9 - 0.5, y + 0.4, r * 0.32, r * 0.4, iris);
  }
  c.strokeStyle = "#1a1a22";
  c.lineWidth = Math.max(1.4, r * 0.3);
  c.lineCap = "round";
  c.beginPath();
  if (mood === "happy") c.arc(x, y + r * 0.35, r * 0.75, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (mood === "angry") c.arc(x, y + r * 1.1, r * 0.65, 1.15 * Math.PI, 1.85 * Math.PI);
  else { c.moveTo(x - r * 0.5, y + r * 1.1); c.lineTo(x + r * 0.5, y + r * 1.1); }
  c.stroke();
  if (mood === "angry") {
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + s * r * 1.6, y - r * 1.05);
      c.lineTo(x + s * r * 0.45, y - r * 0.55);
      c.stroke();
    }
  }
}

function stem(c: Ctx, sw: number, col: string) {
  limb(c, [[0, 38], [sw * 0.5, 18], [sw, 2]], 6, col);
  c.save();
  c.translate(0, 26);
  c.rotate(-0.55);
  ball(c, 12, 0, 13, 5, shade(col, 0.16));
  c.restore();
  c.save();
  c.translate(0, 22);
  c.rotate(Math.PI + 0.5);
  ball(c, 12, 0, 12, 5, col);
  c.restore();
}

function tagFx(c: Ctx, def: DefDef, t: number, charge: number) {
  const col = def.color;
  if (def.tags.includes("fire")) {
    for (let i = 0; i < 3; i++) {
      const fh = 10 + Math.sin(t * 9 + i) * 4 + charge * 8;
      poly(c, [[-12 + i * 12, -24], [-7 + i * 12, -24 - fh], [-2 + i * 12, -24]], "#ff8a2a");
    }
  }
  if (def.tags.includes("ice")) {
    for (let i = 0; i < 4; i++) {
      const a = t * 1.2 + (i * TAU) / 4;
      ball(c, Math.cos(a) * 26, -10 + Math.sin(a) * 22, 2.4, 3.6, "#d8f6ff");
    }
  }
  if (def.tags.includes("electric")) {
    c.strokeStyle = rgba("#fff2a0", 0.55 + 0.45 * Math.sin(t * 22));
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(10, -30);
    for (let i = 1; i <= 5; i++) c.lineTo(10 + i * 6, -30 + Math.sin(t * 30 + i) * 6);
    c.stroke();
  }
  if (def.tags.includes("aquatic")) {
    for (let i = 0; i < 3; i++) {
      const y = 20 - ((t * 14 + i * 12) % 54);
      ball(c, -18 + i * 18, y, 2, 3, "#7fe6ff");
    }
  }
  if (def.tags.includes("cosmic")) {
    for (let i = 0; i < 5; i++) {
      const a = t * 0.8 + (i * TAU) / 5;
      c.fillStyle = i % 2 ? "#fff" : col;
      c.fillRect(Math.cos(a) * 30 - 1, Math.sin(a) * 26 - 12 - 1, 2.5, 2.5);
    }
  }
  if (def.tags.includes("poison")) {
    for (let i = 0; i < 3; i++) glow(c, -16 + i * 16, -30 - Math.sin(t * 4 + i) * 5, 8, "#a3ff5a", 0.5);
  }
  if (def.tags.includes("protective")) {
    c.strokeStyle = rgba(col, 0.35 + 0.2 * Math.sin(t * 3));
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 34, 0, TAU);
    c.stroke();
  }
}

export function drawGeneratedDefender(c: Ctx, def: DefDef, t: number, o: DefFx) {
  const k = h(def.id, 1);
  const col = def.color;
  const dark = shade(col, -0.45);
  const sway = Math.sin(t * 2 + k * 6) * 1.6;
  const bob = Math.abs(Math.sin(t * 1.6 + k * 4)) * 1.6;
  const mood = def.cls === "longo" || def.cls === "curto" ? "angry" : def.cls === "protecao" ? "calm" : "happy";
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  groundShadow(c, 26);
  glow(c, 0, 2, 42 + (o.lv >= 4 ? 20 : 0), col, 0.22 + o.charge * 0.25 + (o.lv >= 5 ? 0.2 : 0));
  c.translate(sway, -bob);
  if (o.charge > 0.5) c.rotate(-0.06 * o.charge);
  stem(c, sway * 0.4, shade(col, -0.25));

  switch (def.form) {
    case "flower": {
      const petals = 6 + Math.floor(k * 4);
      for (let i = 0; i < petals; i++) {
        c.save();
        c.rotate((i * TAU) / petals + t * 0.15);
        ball(c, 0, -22, 9, 17, i % 2 ? col : shade(col, 0.28), 0);
        c.restore();
      }
      ball(c, 0, -6, 17, 16, shade(col, -0.12));
      face(c, 0, -8, 7, mood);
      break;
    }
    case "mushroom": {
      limb(c, [[0, 24], [0, -6]], 12, "#e8dcc4");
      ball(c, 0, -12, 27, 15, col);
      ball(c, -9, -18, 6, 4, "rgba(255,255,255,.55)");
      ball(c, 8, -14, 5, 3.5, "rgba(255,255,255,.45)");
      c.fillStyle = dark;
      c.beginPath();
      c.roundRect(-24, -6, 48, 9, 4);
      c.fill();
      face(c, 0, 10, 6, mood);
      break;
    }
    case "crystal": {
      for (let i = -2; i <= 2; i++) {
        const hh = 26 + h(def.id, i + 3) * 24;
        poly(c, [[i * 10 - 6, 22], [i * 10 - 4, 22 - hh * 0.75], [i * 10, 22 - hh], [i * 10 + 5, 22 - hh * 0.7], [i * 10 + 7, 22]], col, shade(col, 0.5), 1.2);
      }
      ball(c, 0, 6, 18, 14, shade(col, -0.1));
      face(c, 0, 4, 6, mood);
      break;
    }
    case "cactus": {
      ball(c, 0, 8, 18, 28, col);
      ball(c, -19, 0, 8, 12, shade(col, -0.15));
      ball(c, 19, -4, 8, 11, shade(col, -0.15));
      for (let i = 0; i < 12; i++) {
        const y = -16 + i * 4.5;
        limb(c, [[-15 + (i % 2) * 30, y], [-21 + (i % 2) * 42, y - 3]], 1.6, "#f0e8c8");
      }
      ball(c, 0, -24, 13, 10, shade(col, -0.2));
      face(c, 0, 4, 6, mood);
      break;
    }
    case "vine": {
      limb(c, [[-20, 34], [-8, 8], [10, -18], [4, -38]], 8, col);
      for (let i = 0; i < 4; i++) {
        c.save();
        c.translate(-12 + i * 9, 18 - i * 14);
        c.rotate(-0.6 + i * 0.35);
        ball(c, 10, 0, 12, 5, shade(col, 0.2));
        c.restore();
      }
      ball(c, 4, -38, 13, 12, shade(col, 0.15));
      face(c, 4, -40, 5, mood);
      break;
    }
    case "bulb": {
      ball(c, 0, 0, 20, 19, col);
      const len = 20 + o.charge * 12;
      c.fillStyle = dark;
      c.beginPath();
      c.roundRect(10, -8, len, 16, 7);
      c.fill();
      ball(c, 10 + len, 0, 6, 6, "#101810");
      for (let i = 0; i < 4; i++) poly(c, [[-10 + i * 6, -18], [-7 + i * 6, -28], [-4 + i * 6, -18]], shade(col, -0.3));
      face(c, -5, -6, 6, mood);
      break;
    }
    case "tree": {
      c.fillStyle = "#6a4528";
      c.beginPath();
      c.roundRect(-14, -18, 28, 52, 5);
      c.fill();
      for (let i = -1; i <= 1; i++) ball(c, i * 16, -34, 17, 15, col);
      ball(c, 0, -46, 20, 14, shade(col, 0.2));
      face(c, 0, 0, 7, mood);
      break;
    }
    case "orb": {
      const pulse = 1 + o.charge * 0.14 + Math.sin(t * 5) * 0.04;
      ball(c, 0, -2, 22 * pulse, 22 * pulse, dark);
      c.strokeStyle = rgba(col, 0.9);
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(0, -2, 22 * pulse, 8, t * (0.8 + i * 0.4) + i, 0, TAU);
        c.stroke();
      }
      face(c, 0, -4, 7, mood, col);
      break;
    }
    case "pumpkin": {
      ball(c, 0, 2, 28, 24, col);
      c.strokeStyle = shade(col, -0.35);
      c.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.ellipse(i * 9, 2, 7, 23, 0, 0, TAU);
        c.stroke();
      }
      limb(c, [[0, -22], [4, -34]], 5, "#4a7a3a");
      face(c, 0, 0, 8, mood);
      break;
    }
    case "bell": {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(-25, 20);
      c.quadraticCurveTo(-14, 4, -12, -18);
      c.quadraticCurveTo(0, -38, 12, -18);
      c.quadraticCurveTo(14, 4, 25, 20);
      c.closePath();
      c.fill();
      c.strokeStyle = shade(col, 0.5);
      c.lineWidth = 1.6;
      c.stroke();
      ball(c, 0, 26, 5, 5, "#ffe27a");
      face(c, 0, 4, 5, mood);
      break;
    }
    case "fan": {
      for (let i = 0; i < 5; i++) {
        c.save();
        c.rotate(-0.7 + i * 0.35 + Math.sin(t * 3) * 0.08);
        ball(c, 0, -26, 7, 18, i % 2 ? col : shade(col, 0.3));
        c.restore();
      }
      ball(c, 0, 0, 15, 13, dark);
      face(c, 0, -2, 5, mood);
      break;
    }
    case "telescope": {
      c.save();
      c.rotate(-0.45);
      c.fillStyle = col;
      c.beginPath();
      c.roundRect(-8, -34, 20, 58, 5);
      c.fill();
      c.fillStyle = dark;
      c.fillRect(-10, -38, 24, 7);
      c.restore();
      ball(c, 0, 8, 15, 12, shade(col, -0.2));
      face(c, 0, 6, 5, mood);
      break;
    }
    case "sun": {
      for (let i = 0; i < 12; i++) {
        c.save();
        c.rotate((i * TAU) / 12 + t * 0.25);
        poly(c, [[-5, -20], [0, -34 - (i % 2) * 5], [5, -20]], col);
        c.restore();
      }
      ball(c, 0, -4, 18, 18, "#ffd45a");
      face(c, 0, -6, 7, mood);
      break;
    }
    case "root": {
      for (let i = -2; i <= 2; i++) limb(c, [[i * 4, 32], [i * 9, 10], [i * 14, -18 + h(def.id, i + 4) * 10]], 7, i % 2 ? col : dark);
      ball(c, 0, 0, 20, 17, col);
      face(c, 0, -2, 7, mood);
      break;
    }
    case "shield": {
      poly(c, [[0, -32], [26, -18], [22, 18], [0, 34], [-22, 18], [-26, -18]], col, shade(col, 0.5), 2);
      poly(c, [[0, -26], [18, -14], [0, 26], [-18, -14]], "rgba(255,255,255,.18)");
      face(c, 0, -4, 6, mood);
      break;
    }
  }
  tagFx(c, def, t, o.charge);
  // evolução: nível 4 ganha coroa, nível 5 ganha halo duplo
  if (o.lv >= 4) {
    poly(c, [[-14, -42], [-10, -54], [-4, -44], [0, -58], [4, -44], [10, -54], [14, -42]], "#ffe27a", "#b8860b", 1);
  }
  if (o.lv >= 5) {
    c.strokeStyle = rgba("#fff2a0", 0.5 + 0.3 * Math.sin(t * 4));
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 40 + Math.sin(t * 3) * 2, 0, TAU);
    c.stroke();
  }
  if (o.flash > 0) {
    c.globalAlpha = Math.min(0.5, o.flash);
    ball(c, 0, 0, 40, 40, "#fff");
  }
  c.restore();
}

/* --------------------------------- INIMIGOS --------------------------------- */
const TRAIT_GLYPH: Record<string, string> = {
  armored: "#cfd6e0", amphibious: "#7fe6ff", camouflage: "#b98bff", vampire: "#ff4d7a", summon: "#5fe08a",
  freezeAura: "#9fe6ff", weakenAura: "#d4ff5a", ghost: "#ffffff", magnet: "#7fd8ff", ranged: "#ff9a52",
  demolish: "#ff6a2a", shieldAura: "#ffd45a", dash: "#ffe14a", poisonAura: "#a3ff5a", mutant: "#ff7ae0",
  heatAura: "#ff7a3a", radioactive: "#d4ff5a", slowImmune: "#d8f6ff", root: "#9be37a", burrow: "#d8b878", boss: "#ff4d5e",
};

export function drawGeneratedEnemy(c: Ctx, def: EnemyDef, o: EnemyFx) {
  const [skin, dark, glowCol] = def.colors;
  const k = h(def.id, 7);
  const sw = Math.sin(o.walk);
  const att = o.attack ? 6 : 0;
  const alpha = def.traits.includes("camouflage") ? 0.55 : def.traits.includes("ghost") ? 0.68 : 1;
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  c.globalAlpha = alpha;
  if (!def.flying && !o.burrow) groundShadow(c, 26, 2, 0.38);
  glow(c, 0, -44, 40, glowCol, def.traits.includes("boss") ? 0.35 : 0.16);
  if (def.form === "spectral") c.translate(0, Math.sin(o.t * 3) * 4);
  if (o.jump > 0) c.translate(0, -Math.sin(o.jump * Math.PI) * 30);

  const body = (w: number, hh: number) => ball(c, 0, -hh / 2 - 2, w, hh, skin);
  const head = (y: number, r: number) => {
    ball(c, -2, y, r, r * 0.9, shade(skin, 0.12));
    glow(c, -r * 0.45, y - 2, r * 1.2, glowCol, 0.7);
    c.fillStyle = "#120810";
    c.beginPath();
    c.ellipse(-r * 0.45, y - 2, r * 0.2, r * 0.28, 0, 0, TAU);
    c.fill();
    c.fillStyle = "#1a0510";
    c.beginPath();
    c.moveTo(-r * 0.9, y + r * 0.4);
    c.lineTo(r * 0.6, y + r * 0.4);
    c.lineTo(r * 0.4, y + r * 0.4 + (o.attack ? 8 : 3));
    c.lineTo(-r * 0.7, y + r * 0.4 + (o.attack ? 8 : 3));
    c.fill();
  };

  switch (def.form) {
    case "humanoid":
    case "armored": {
      limb(c, [[3, -30], [3 + sw * 6, -14], [3 + sw * 8, -2]], 8, dark);
      limb(c, [[-4, -30], [-4 - sw * 6, -14], [-4 - sw * 8, -2]], 8, shade(dark, 0.1));
      body(15, 44);
      limb(c, [[5, -56], [-10, -52 + sw * 2], [-26 - att, -44]], 6, shade(skin, -0.2));
      limb(c, [[-4, -56], [-20, -52 - sw * 2], [-36 - att, -42]], 7, skin);
      head(-76, 13);
      if (def.form === "armored" || o.armor > 0) {
        poly(c, [[-30, -52], [-10, -54], [-8, -18], [-30, -22]], shade(skin, -0.15), glowCol, 1.5);
        poly(c, [[-18, -90], [12, -90], [10, -96], [-16, -96]], shade(skin, -0.3), glowCol, 1);
      }
      break;
    }
    case "beast": {
      body(26, 26);
      for (const s of [-1, 1]) {
        limb(c, [[s * 12, -20], [s * 16, -4], [s * 14 + sw * s * 5, 0]], 7, dark);
        limb(c, [[-s * 12, -20], [-s * 16, -4], [-s * 14 - sw * s * 5, 0]], 7, skin);
      }
      ball(c, -30, -34, 13, 11, shade(skin, 0.1));
      glow(c, -33, -35, 12, glowCol, 0.8);
      limb(c, [[18, -34], [34, -44], [30 + att, -52]], 5, skin);
      break;
    }
    case "blob": {
      ball(c, 0, -12, 26, 24, skin);
      for (let i = 0; i < 5; i++) ball(c, -20 + i * 10, -32 + Math.sin(o.t * 4 + i) * 3, 6, 6, shade(skin, 0.2));
      head(-20, 9);
      break;
    }
    case "insect": {
      for (let i = 0; i < 3; i++) {
        const s = i < 2 ? -1 : 1;
        limb(c, [[s * 5, -20], [s * 18, -26], [s * 26 + sw * 3, -4]], 3, dark);
      }
      ball(c, 0, -22, 12, 20, skin);
      const flap = Math.sin(o.t * 14 + k * 6);
      for (const s of [-1, 1]) {
        c.save();
        c.scale(1, 0.45 + 0.55 * flap);
        ball(c, s * 17, -50, 20, 11, shade(skin, 0.25), s * 0.5);
        c.restore();
      }
      glow(c, -12, -46, 12, glowCol, 0.8);
      break;
    }
    case "spectral": {
      c.fillStyle = rgba(skin, 0.75);
      c.beginPath();
      c.moveTo(-20, 0);
      c.quadraticCurveTo(-26, -40, -12, -70);
      c.quadraticCurveTo(0, -92, 12, -70);
      c.quadraticCurveTo(26, -40, 20, 0);
      for (let i = 0; i < 5; i++) c.quadraticCurveTo(16 - i * 8, 10 + Math.sin(o.t * 4 + i) * 5, 12 - i * 8, 0);
      c.fill();
      glow(c, -8, -66, 16, glowCol, 0.9);
      c.fillStyle = "#120810";
      c.beginPath();
      c.arc(-8, -66, 3, 0, TAU);
      c.fill();
      break;
    }
    case "colossal": {
      limb(c, [[8, -26], [8, -2]], 15, dark);
      limb(c, [[-8, -26], [-8 + sw * 3, -2]], 15, dark);
      body(28, 62);
      limb(c, [[-24, -74], [-42 - att, -54], [-54, -30]], 13, skin);
      limb(c, [[24, -74], [38, -54], [30, -30]], 12, shade(skin, -0.1));
      head(-98, 15);
      for (let i = -1; i <= 1; i++) poly(c, [[i * 12 - 5, -112], [i * 12, -128], [i * 12 + 5, -112]], shade(skin, -0.3));
      break;
    }
    case "fungal": {
      limb(c, [[0, 20], [0, -18]], 14, "#d8ccb0");
      ball(c, 0, -28, 28, 16, skin);
      for (let i = 0; i < 5; i++) glow(c, -18 + i * 9, -32 + h(def.id, i) * 8, 7, glowCol, 0.7);
      head(-8, 9);
      break;
    }
    case "aquatic": {
      ball(c, 0, -16, 22, 22, skin);
      for (let i = 0; i < 4; i++) ball(c, -18 + i * 12, -34 + Math.sin(o.t * 5 + i) * 3, 4, 5, "#bff4ff");
      poly(c, [[16, -20], [36, -34], [32, -8]], shade(skin, 0.2));
      glow(c, -12, -26, 14, glowCol, 0.85);
      c.fillStyle = "#0a2030";
      c.beginPath();
      c.arc(-12, -26, 3, 0, TAU);
      c.fill();
      break;
    }
    case "boss": {
      // Monumental: manto, chifres, braços, aura e etapas visuais
      const rage = o.enrage ? 1 : 0;
      glow(c, 0, -60, 100, rage ? "#ff3a5a" : glowCol, 0.28 + rage * 0.2);
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36;
        limb(c, [[0, -4], [Math.cos(a + Math.PI) * 24, -10], [-34 + i * 11 + Math.sin(o.t * 2 + i) * 5, 0]], 7, dark, 0.3);
      }
      c.fillStyle = skin;
      c.beginPath();
      c.moveTo(-26, 0);
      c.quadraticCurveTo(-38, -60, -22, -104);
      c.quadraticCurveTo(0, -120, 22, -104);
      c.quadraticCurveTo(38, -60, 26, 0);
      c.closePath();
      c.fill();
      for (let i = -2; i <= 2; i++) {
        c.strokeStyle = rgba(dark, 0.5);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(i * 9, -4);
        c.quadraticCurveTo(i * 11 + 5, -56, i * 8, -98);
        c.stroke();
      }
      for (const [x, y] of [[-12, -80], [8, -86], [-6, -62], [12, -58], [-16, -44], [4, -40]]) {
        glow(c, x, y, 10, rage ? "#ff3a5a" : glowCol, 0.85);
      }
      c.fillStyle = "#07020c";
      c.beginPath();
      c.ellipse(-2, -24, 13, o.attack ? 15 : 9, 0, 0, TAU);
      c.fill();
      for (let i = 0; i < 8; i++) {
        c.save();
        c.translate(-2, -24);
        c.rotate((i * TAU) / 8);
        poly(c, [[-2, -11], [0, -5], [2, -11]], "#e8e0f0");
        c.restore();
      }
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI + (i * Math.PI) / 8;
        limb(c, [[Math.cos(a) * 14, -104], [Math.cos(a) * 24, -112], [Math.cos(a) * 28, -128 - (i % 3) * 8]], 3.5, dark);
        if (i % 2 === 0) glow(c, Math.cos(a) * 28, -130 - (i % 3) * 8, 10, rage ? "#ff3a5a" : glowCol, 0.9);
      }
      const bx = -50 - att;
      limb(c, [[-22, -82], [bx * 0.7, -62], [bx, -34]], 12, skin);
      ball(c, bx, -32, 12, 12, shade(skin, 0.15));
      break;
    }
  }

  // indicadores visuais de habilidade (acima da cabeça)
  const shown = def.traits.filter((t) => TRAIT_GLYPH[t] && t !== "boss").slice(0, 3);
  shown.forEach((tr, i) => {
    const x = -16 + i * 16;
    const y = -112;
    c.globalAlpha = 0.9;
    ball(c, x, y, 5.5, 5.5, "#0a0812");
    c.strokeStyle = TRAIT_GLYPH[tr];
    c.lineWidth = 2;
    if (tr === "armored" || tr === "shieldAura") {
      c.beginPath();
      c.moveTo(x, y - 4);
      c.lineTo(x + 4, y - 2);
      c.lineTo(x + 3, y + 4);
      c.lineTo(x, y + 5);
      c.lineTo(x - 3, y + 4);
      c.lineTo(x - 4, y - 2);
      c.closePath();
      c.stroke();
    } else if (tr === "vampire" || tr === "poisonAura") {
      c.beginPath();
      c.moveTo(x, y - 4);
      c.quadraticCurveTo(x + 5, y, x, y + 4);
      c.quadraticCurveTo(x - 5, y, x, y - 4);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(x, y, 3.2, 0, TAU);
      c.stroke();
    }
  });
  c.globalAlpha = 1;
  if (o.slow) {
    c.globalAlpha = 0.28;
    ball(c, -2, -46, 28, 50, "#7fd8ff");
    c.globalAlpha = 1;
  }
  if (o.stun) for (let i = 0; i < 3; i++) {
    const a = o.t * 5 + (i * TAU) / 3;
    ball(c, -4 + Math.cos(a) * 16, -108 + Math.sin(a) * 4, 3.2, 3.2, "#ffe14a");
  }
  c.restore();
}
