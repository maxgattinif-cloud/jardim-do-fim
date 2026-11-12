import { ENEMY_BY_ID, type EnemyId } from "../data/enemies";
import { drawGeneratedEnemy } from "./generator";
import { TAU, ball, glow, groundShadow, hash, limb, poly, rgba, shade, isFlat, type Ctx } from "./art";

export interface EnemyFx {
  t: number;
  walk: number;
  armor: number; // 0..1 (armadura restante)
  slow: boolean;
  stun: boolean;
  hurt: number;
  attack: boolean;
  jump: number; // 0..1
  burrow: boolean;
  enrage: boolean;
}

const ASH = "#5b5666";
const ASH_D = "#2c2833";
const GLOW = "#b45cff";

type Draw = (c: Ctx, o: EnemyFx) => void;

const cracks = (c: Ctx, pts: number[][], t: number, col = GLOW) => {
  c.strokeStyle = rgba(col, 0.6 + 0.4 * Math.sin(t * 4));
  c.lineWidth = 1.8;
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.stroke();
};

const claws = (c: Ctx, x: number, y: number, col = "#d8d0e0") => {
  for (let i = -1; i <= 1; i++) limb(c, [[x, y], [x - 8, y + i * 3.6]], 1.9, col);
};

const eyeGlow = (c: Ctx, x: number, y: number, col: string, r = 3) => {
  glow(c, x, y, r * 3.4, col, 0.55);
  ball(c, x, y, r, r * 0.8, col);
  c.fillStyle = "rgba(0,0,0,.85)";
  c.beginPath();
  c.ellipse(x - 0.6, y, r * 0.3, r * 0.7, 0, 0, TAU);
  c.fill();
};

/** Corpo humanoide encurvado de cinza, base de vários inimigos. */
function ashBody(c: Ctx, o: EnemyFx, p: { skin?: string; dark?: string; lean?: number; eye?: string; head?: number; arms?: number }) {
  const skin = p.skin ?? ASH;
  const dark = p.dark ?? ASH_D;
  const sw = Math.sin(o.walk);
  const cw = Math.cos(o.walk);
  const att = o.attack ? 6 + Math.abs(cw) * 3 : 0;
  c.save();
  c.rotate(p.lean ?? 0);
  limb(c, [[3, -30], [3 + sw * 6, -16], [3 + sw * 8, -2]], 8, dark);
  limb(c, [[-4, -30], [-4 - sw * 6, -16], [-4 - sw * 8, -2]], 8, shade(dark, 0.1));
  limb(c, [[5, -58], [-8, -52 + cw * 3], [-24 - att, -46 + sw * 3]], 6, shade(skin, -0.25));
  ball(c, 0, -46, 15, 23, skin, -0.12);
  cracks(c, [[-6, -62], [-2, -52], [-8, -44], [-3, -34]], o.t);
  cracks(c, [[8, -58], [4, -48], [9, -40]], o.t + 1);
  ball(c, -4, -76, 13, 14 * (p.head ?? 1), shade(skin, 0.08));
  for (let i = 0; i < 4; i++) limb(c, [[-12 + i * 4, -86], [-14 + i * 4.6, -96 - (i % 2) * 4]], 2.2, dark);
  eyeGlow(c, -9, -77, p.eye ?? "#ffb020", 3.2);
  eyeGlow(c, 0, -76, p.eye ?? "#ffb020", 2.6);
  const jaw = o.attack ? 7 + Math.abs(sw) * 3 : 3 + Math.sin(o.t * 3) * 1;
  c.fillStyle = "#12080e";
  c.beginPath();
  c.moveTo(-14, -70);
  c.lineTo(4, -70);
  c.lineTo(2, -69 + jaw);
  c.lineTo(-12, -69 + jaw);
  c.closePath();
  c.fill();
  for (let i = 0; i < 4; i++) poly(c, [[-13 + i * 4, -70], [-11 + i * 4, -66], [-9 + i * 4, -70]], "#e8e0d0");
  limb(c, [[-3, -58], [-18, -56 - cw * 2], [-34 - att, -48 + sw * 3]], 7, skin);
  claws(c, -34 - att, -48 + sw * 3);
  c.restore();
}

const E: Record<EnemyId, Draw> = {
  cinzento(c, o) {
    ashBody(c, o, {});
  },
  escudeiro(c, o) {
    ashBody(c, o, { skin: "#5a5260" });
    // elmo
    poly(c, [[-17, -80], [8, -80], [6, -92], [-14, -92]], "#8a5a3a", "#3a2418", 1.5);
    ball(c, -4, -92, 11, 3.4, "#a8703c");
    if (o.armor > 0) {
      const dent = o.armor < 0.5;
      c.save();
      c.translate(-40, -48);
      poly(c, [[-9, -30], [9, -30], [11, 12], [0, 24], [-11, 12]], isFlat() ? "#9a6338" : "#a8703c", "#3a2418", 2);
      poly(c, [[-9, -30], [0, -30], [1, 22], [-11, 12]], "rgba(255,200,140,.18)");
      c.fillStyle = "#3a2418";
      for (const [x, y] of [[-5, -22], [5, -22], [-6, 4], [6, 4]]) {
        c.beginPath();
        c.arc(x, y, 1.6, 0, TAU);
        c.fill();
      }
      c.strokeStyle = "#6a2a14";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-3, -20);
      c.lineTo(2, -8);
      c.lineTo(-2, 2);
      c.stroke();
      if (dent) {
        c.strokeStyle = "#1a0d06";
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(-8, -26);
        c.lineTo(3, -12);
        c.lineTo(-4, 4);
        c.lineTo(6, 16);
        c.stroke();
      }
      c.restore();
    }
  },
  estilhaco(c, o) {
    const sw = Math.sin(o.walk);
    c.save();
    c.rotate(-0.3);
    c.strokeStyle = "rgba(180,92,255,.25)";
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(18 + i * 10, -44 + i * 8);
      c.lineTo(46 + i * 10, -44 + i * 8);
      c.stroke();
    }
    limb(c, [[2, -30], [2 + sw * 11, -14], [2 + sw * 14, -2]], 7, "#2a2630");
    limb(c, [[-4, -30], [-4 - sw * 11, -14], [-4 - sw * 14, -2]], 7, "#3a3640");
    ball(c, 0, -46, 11, 21, "#4a4452", -0.1);
    for (let i = 0; i < 5; i++) poly(c, [[6, -62 + i * 8], [16, -64 + i * 8], [8, -58 + i * 8]], "#8a7aa0");
    cracks(c, [[-4, -58], [0, -48], [-5, -38]], o.t, "#ff9a2a");
    ball(c, -4, -74, 11, 12, "#5a5468");
    poly(c, [[-14, -80], [-26, -88], [-8, -86]], "#3a3446");
    eyeGlow(c, -9, -75, "#ffe14a", 3);
    c.fillStyle = "#12080e";
    c.fillRect(-14, -68, 14, o.attack ? 6 : 2.4);
    for (const [bx, by, ph] of [[-22, -52, 0], [-18, -42, 1.5]]) {
      c.save();
      c.translate(bx, by + sw * 2);
      c.rotate(ph - 0.4 + Math.cos(o.walk) * 0.2);
      poly(c, [[0, -3], [-34 - (o.attack ? 8 : 0), 0], [0, 3]], "#cfc6e0", "#6a4aa0", 1.4);
      poly(c, [[-12, -1], [-34, 0], [-12, 1]], "#ffffff");
      c.restore();
    }
    c.restore();
  },
  mariposa(c, o) {
    groundShadow(c, 18, 2, 0.28);
    const bob = Math.sin(o.t * 3) * 4;
    const flap = Math.sin(o.t * (o.slow ? 8 : 15));
    c.save();
    c.translate(0, -58 + bob);
    for (const [sx, sy, rx, ry, col] of [[-16, -14, 30, 20, "#7a6a90"], [-12, 10, 22, 14, "#5e5078"]] as [number, number, number, number, string][]) {
      c.save();
      c.translate(0, -4);
      c.scale(1, 0.55 + 0.45 * flap);
      ball(c, sx, sy, rx, ry, col, -0.5);
      c.restore();
    }
    for (const [sx, sy, rx, ry, col] of [[10, -16, 28, 18, "#8a7aa0"], [12, 8, 20, 12, "#6a5a88"]] as [number, number, number, number, string][]) {
      c.save();
      c.translate(0, -4);
      c.scale(1, 0.5 + 0.5 * flap);
      ball(c, sx, sy, rx, ry, col, 0.3);
      c.restore();
    }
    glow(c, -26, -20 * (0.5 + 0.5 * flap) - 4, 11, GLOW, 0.8);
    ball(c, 0, 0, 8, 17, "#4a4058", Math.PI / 2 - 0.1);
    for (let i = -2; i <= 2; i++) c.fillRect(i * 6 - 1, -6, 2, 12);
    ball(c, -18, -2, 9, 8, "#6a5e7c");
    eyeGlow(c, -21, -3, "#ff6bd0", 2.6);
    limb(c, [[-22, -8], [-30, -22], [-26, -30]], 1.8, "#d8d0e0");
    limb(c, [[-18, -9], [-20, -24], [-12, -32]], 1.8, "#d8d0e0");
    c.restore();
    for (let i = 0; i < 4; i++) {
      c.fillStyle = rgba("#d9b8ff", 0.7);
      c.fillRect(((o.t * 22 + i * 17) % 50) - 10, -40 + ((i * 29) % 30) + bob, 2, 2);
    }
  },
  sapo(c, o) {
    const sw = Math.sin(o.walk);
    const swell = o.attack ? 1.25 : 1 + Math.sin(o.t * 4) * 0.05;
    limb(c, [[8, -14], [18, -4], [24, 0]], 8, "#40603a");
    limb(c, [[-8, -14], [-14, -2], [-6, 0]], 7, "#4a6a42");
    ball(c, 0, -26, 25, 20, "#5c7a4a");
    ball(c, -6, -30, 18, 11, "#7a9a62", -0.1);
    for (let i = 0; i < 7; i++) {
      const x = -14 + hash(i) * 34;
      const y = -38 + hash(i + 9) * 22;
      glow(c, x, y, 7, "#e6ff6a", 0.55);
      ball(c, x, y, 2.4, 2.4, "#d4ee5a");
    }
    ball(c, -16, -16, 12 * swell, 10 * swell, "#8a5a90");
    glow(c, -16, -16, 18 * swell, "#e6ff6a", 0.3);
    limb(c, [[-6, -30], [-20 - (o.attack ? 6 : 0), -20 - sw * 2], [-28, -8]], 6, "#4a6a42");
    for (const x of [-8, 6]) {
      ball(c, x, -46, 7, 7, "#6a8a54");
      eyeGlow(c, x - 1, -47, "#e6ff6a", 3);
    }
    c.strokeStyle = "#10200c";
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(-6, -26, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    c.stroke();
  },
  gafanhoto(c, o) {
    const sw = Math.sin(o.walk);
    const j = o.jump;
    c.save();
    c.rotate(-0.28);
    const kick = j > 0 ? 18 : Math.abs(sw) * 6;
    limb(c, [[6, -34], [26 + kick * 0.5, -48], [40 + kick, -6]], 5, "#2a3a22");
    limb(c, [[2, -34], [18, -50], [30 + kick * 0.6, -8]], 4.4, "#3a4a2c");
    limb(c, [[-2, -26], [-10 - sw * 4, -14], [-8 - sw * 6, -2]], 4, "#2a3a22");
    ball(c, 0, -40, 9, 24, "#566a3a", -0.15);
    for (let i = 0; i < 5; i++) c.fillRect(-4, -58 + i * 8, 10, 2);
    ball(c, -4, -70, 10, 11, "#6a7e46");
    eyeGlow(c, -8, -72, "#ff4d4d", 3.6);
    eyeGlow(c, 1, -73, "#ff4d4d", 3);
    limb(c, [[-6, -80], [-14, -96], [-26, -98]], 1.8, "#d8d0e0");
    limb(c, [[0, -80], [-4, -97], [-14, -102]], 1.8, "#d8d0e0");
    limb(c, [[-6, -44], [-22 - (o.attack ? 6 : 0), -38], [-34, -28]], 4.4, "#566a3a");
    poly(c, [[-10, -66], [-20, -60], [-8, -60]], "#12080e");
    c.restore();
  },
  xama(c, o) {
    const sw = Math.sin(o.walk);
    glow(c, -4, -50, 50, "#5fe08a", 0.16 + 0.1 * Math.sin(o.t * 3));
    c.fillStyle = "#2a2036";
    c.beginPath();
    c.moveTo(-14, -64);
    c.quadraticCurveTo(-24, -20, -16, 0);
    c.lineTo(14, 0);
    c.quadraticCurveTo(22, -24, 10, -64);
    c.closePath();
    c.fill();
    limb(c, [[-14, 0], [-12 + sw * 4, -4]], 6, "#1a1424");
    ball(c, -2, -74, 11, 12, "#8a7aa0");
    c.save();
    c.translate(-2, -86);
    ball(c, 0, 0, 25, 14, "#7a3ac0");
    for (const [x, y, r] of [[-12, -3, 4], [6, -7, 3.4], [14, 1, 3.6], [-2, 2, 2.4]]) {
      glow(c, x, y, r * 3, "#9cffbc", 0.5);
      ball(c, x, y, r, r, "#c8ffd8");
    }
    c.restore();
    eyeGlow(c, -7, -74, "#5fe08a", 2.6);
    eyeGlow(c, 1, -74, "#5fe08a", 2.6);
    limb(c, [[-6, -56], [-22 - (o.attack ? 5 : 0), -52], [-34, -62]], 5, "#8a7aa0");
    limb(c, [[-36, -2], [-36, -80]], 3.4, "#5a4a3a");
    glow(c, -36, -86, 16, "#5fe08a", 0.8);
    ball(c, -36, -86, 6, 6, "#9cffbc");
    for (let i = 0; i < 5; i++) {
      const a = o.t * 1.5 + i * 1.3;
      ball(c, -4 + Math.cos(a) * 26, -52 + Math.sin(a * 1.4) * 22, 1.8, 1.8, "#9cffbc");
    }
  },
  colosso(c, o) {
    const sw = Math.sin(o.walk * 0.8);
    const att = o.attack ? 10 : 0;
    limb(c, [[8, -26], [8, -2]], 14, "#6a4630");
    limb(c, [[-8, -26], [-8 + sw * 3, -2]], 14, "#7a5238");
    ball(c, 0, -52, 24, 30, "#8a5a3a");
    for (let i = 0; i < 3; i++) ball(c, -10 + i * 10, -66 - (i % 2) * 3, 8, 6, "#3fae6a");
    cracks(c, [[-12, -70], [-6, -56], [-14, -44], [-8, -32]], o.t, "#ff8a3a");
    cracks(c, [[10, -64], [5, -50], [12, -38]], o.t + 2, "#ff8a3a");
    glow(c, 0, -48, 24, "#ff8a3a", 0.35);
    limb(c, [[10, -72], [4, -60], [-14 - att, -40]], 11, "#7a5238");
    ball(c, -4, -86, 12, 12, "#9a6a46");
    eyeGlow(c, -9, -87, "#ff8a3a", 3);
    eyeGlow(c, 1, -87, "#ff8a3a", 3);
    limb(c, [[-14, -70], [-30 - att, -56], [-44 - att, -34]], 12, "#8a5a3a");
    ball(c, -46 - att, -32, 11, 11, "#9a6a46");
  },
  verme(c, o) {
    if (o.burrow) {
      ball(c, 0, 0, 30, 9, "#4a3624");
      for (let i = 0; i < 6; i++) ball(c, 22 + i * 7 + hash(i) * 4, -2 - hash(i + 3) * 5, 3.4, 3, "#5a4430");
      for (let i = 0; i < 4; i++) {
        const k = (o.t * 1.6 + i / 4) % 1;
        ball(c, -8 + i * 6, -8 - k * 18, 2.6, 2.6, rgba("#6a5038", 1 - k) as string);
      }
      return;
    }
    const sway = Math.sin(o.t * 4);
    ball(c, 0, 0, 26, 8, "#4a3624");
    const pts: number[][] = [];
    for (let i = 0; i <= 7; i++) pts.push([Math.sin(i * 0.7 + o.walk) * 5 + i * 1.4, -i * 11]);
    limb(c, pts, 20, "#8a4a6a", 0.35);
    for (let i = 1; i < 7; i++) {
      c.strokeStyle = "rgba(40,10,30,.4)";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(pts[i][0], pts[i][1], 9 - i * 0.6, 0.2, Math.PI - 0.2);
      c.stroke();
    }
    c.save();
    c.translate(pts[7][0], pts[7][1] - 6);
    c.rotate(-0.2 + sway * 0.06);
    ball(c, 0, 0, 15, 14, "#a05a80");
    c.fillStyle = "#1a0510";
    c.beginPath();
    c.ellipse(-3, 0, 9, o.attack ? 10 : 7, 0, 0, TAU);
    c.fill();
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * TAU) / 8);
      poly(c, [[-1.6, -7], [0, -2.5], [1.6, -7]], "#f0e8d8");
      c.restore();
    }
    c.restore();
  },
  bulbo(c, o) {
    const sw = Math.sin(o.walk);
    const blink = 0.5 + 0.5 * Math.sin(o.t * 12);
    limb(c, [[6, -12], [8 + sw * 4, -2]], 8, "#3a2230");
    limb(c, [[-6, -12], [-8 - sw * 4, -2]], 8, "#4a2c3a");
    glow(c, 0, -34, 44, "#ff8a2a", 0.18 + 0.28 * blink);
    ball(c, 0, -34, 24, 26, "#7a3a55");
    cracks(c, [[-14, -50], [-6, -38], [-16, -26], [-8, -16]], o.t * 2, "#ffb020");
    cracks(c, [[12, -46], [6, -34], [14, -22]], o.t * 2 + 1, "#ffb020");
    limb(c, [[0, -58], [3, -70]], 3.4, "#3a2a1a");
    glow(c, 3, -72, 12, "#ffb020", 0.7 * blink + 0.2);
    ball(c, 3, -72, 3.4, 3.4, "#ffe27a");
    eyeGlow(c, -9, -36, "#ffb020", 3.4);
    eyeGlow(c, 2, -36, "#ffb020", 3);
    c.strokeStyle = "#12080e";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(-4, -26, 8, 0.1 * Math.PI, 0.9 * Math.PI);
    c.stroke();
    limb(c, [[-14, -40], [-28 - (o.attack ? 5 : 0), -34], [-34, -22]], 6, "#6a3248");
  },
  ceifeira(c, o) {
    const sw = Math.sin(o.walk * 0.7);
    glow(c, 0, -60, 70, GLOW, 0.14);
    c.fillStyle = "#1c1824";
    c.beginPath();
    c.moveTo(-20, -84);
    c.quadraticCurveTo(-34, -30, -26, 0);
    for (let i = 0; i < 6; i++) c.lineTo(-22 + i * 9, -6 + (i % 2) * 8 + Math.sin(o.t * 3 + i) * 2);
    c.quadraticCurveTo(30, -34, 14, -84);
    c.closePath();
    c.fill();
    cracks(c, [[-10, -60], [-4, -44], [-12, -30]], o.t, GLOW);
    ball(c, -3, -92, 13, 15, "#2e2a38");
    poly(c, [[-12, -102], [-24, -126], [-14, -108]], "#d8d0e0");
    poly(c, [[-4, -106], [-8, -134], [0, -108]], "#d8d0e0");
    poly(c, [[6, -102], [18, -124], [10, -106]], "#d8d0e0");
    eyeGlow(c, -9, -92, GLOW, 3.2);
    eyeGlow(c, 2, -92, GLOW, 3.2);
    for (const s of [0, 1]) {
      const ang = (o.attack ? -0.9 : -0.3) + sw * 0.1 - s * 0.2;
      c.save();
      c.translate(-8 - s * 6, -70);
      c.rotate(ang);
      limb(c, [[0, 0], [-26, 6]], 5, "#2a2434");
      c.fillStyle = "#e0d8ec";
      c.strokeStyle = GLOW;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(-26, 6);
      c.quadraticCurveTo(-60, -20, -66, 26);
      c.quadraticCurveTo(-46, -2, -26, 12);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
  },
  rainha(c, o) {
    groundShadow(c, 34, 2, 0.26);
    const flap = Math.sin(o.t * (o.slow ? 4 : 7));
    const bob = Math.sin(o.t * 2) * 5;
    c.save();
    c.translate(0, -72 + bob);
    glow(c, 0, 0, 90, "#ff6bd0", 0.18);
    const wing = (sx: number, sy: number, rx: number, ry: number, col: string, rot: number) => {
      c.save();
      c.scale(1, 0.55 + 0.45 * flap);
      ball(c, sx, sy, rx, ry, col, rot);
      c.restore();
    };
    wing(-30, -22, 46, 28, "#8a6aa8", -0.55);
    wing(-22, 16, 34, 20, "#6a4a88", -0.2);
    wing(26, -22, 44, 26, "#9a7ab8", 0.5);
    wing(22, 16, 30, 18, "#7a5a98", 0.25);
    for (const [x, y] of [[-40, -28], [32, -26]]) {
      glow(c, x, y * (0.5 + 0.5 * flap), 14, "#ff6bd0", 0.9);
      ball(c, x, y * (0.5 + 0.5 * flap), 5, 5, "#ffd0f0");
    }
    ball(c, 4, 6, 12, 26, "#3a2a48", Math.PI / 2 - 0.05);
    for (let i = -3; i <= 3; i++) {
      c.fillStyle = "#ff6bd0";
      c.fillRect(i * 7 - 1, -2, 2.4, 14);
    }
    ball(c, -26, 0, 14, 13, "#4a3a58");
    eyeGlow(c, -31, -2, "#ff6bd0", 3.4);
    eyeGlow(c, -23, -3, "#ff6bd0", 3);
    for (const [dx, h] of [[-4, 36], [4, 30], [12, 34]]) limb(c, [[-30 + dx * 0.2, -10], [-34 + dx, -h * 0.7], [-26 + dx, -h]], 2, "#ffd0f0");
    poly(c, [[-36, -12], [-33, -26], [-28, -14], [-24, -28], [-20, -12]], "#ffd45a", "#b8860b", 1.2);
    c.restore();
  },
  titan(c, o) {
    const sw = Math.sin(o.walk * 0.7);
    const arm = o.armor;
    glow(c, 0, -66, 80, "#ff8a3a", 0.15);
    limb(c, [[10, -32], [10, -2]], 18, "#5a3a26");
    limb(c, [[-10, -32], [-10 + sw * 3, -2]], 18, "#6a4630");
    ball(c, 0, -64, 30, 38, "#7a5238");
    cracks(c, [[-16, -92], [-8, -70], [-18, -52], [-10, -38]], o.t, "#ff8a3a");
    cracks(c, [[14, -86], [8, -66], [18, -48]], o.t + 1.4, "#ff8a3a");
    glow(c, 0, -62, 30, "#ff8a3a", 0.5);
    ball(c, 0, -62, 10, 12, "#ffcf6a");
    if (arm > 0.02) {
      const col = arm > 0.5 ? "#a8a090" : "#8a8072";
      poly(c, [[-24, -92], [-4, -98], [-2, -66], [-26, -60]], col, "#3a3228", 2);
      poly(c, [[6, -96], [26, -88], [24, -58], [4, -64]], col, "#3a3228", 2);
      poly(c, [[-22, -56], [22, -52], [18, -30], [-18, -30]], col, "#3a3228", 2);
      if (arm < 0.5) {
        c.strokeStyle = "#1a1410";
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(-14, -94);
        c.lineTo(-8, -76);
        c.lineTo(-16, -62);
        c.moveTo(12, -92);
        c.lineTo(16, -74);
        c.stroke();
      }
    }
    ball(c, 30, -92, 17, 11, "#6a4630");
    ball(c, -30, -92, 17, 11, "#6a4630");
    for (const x of [-26, -14, 18, 30]) ball(c, x, -100, 7, 5, "#3fae6a");
    ball(c, -4, -108, 14, 14, "#8a5a3a");
    poly(c, [[-14, -116], [-22, -134], [-6, -118]], "#4a3020");
    poly(c, [[6, -116], [16, -134], [10, -116]], "#4a3020");
    eyeGlow(c, -10, -108, "#ff8a3a", 3.4);
    eyeGlow(c, 2, -108, "#ff8a3a", 3.4);
    const att = o.attack ? 10 : 0;
    limb(c, [[-26, -84], [-44 - att, -62], [-56 - att, -34]], 15, "#8a5a3a");
    ball(c, -58 - att, -30, 13, 13, "#9a6a46");
    limb(c, [[26, -84], [36, -60], [30, -38]], 14, "#7a5238");
  },
  murchar(c, o) {
    const t = o.t;
    const rage = o.enrage ? 1 : 0;
    glow(c, 0, -70, 100, rage ? "#ff3a5a" : GLOW, 0.2 + rage * 0.15);
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + i * 0.36;
      limb(c, [[0, -4], [Math.cos(a + Math.PI) * 22 + Math.sin(t * 2 + i) * 6, -8], [-34 + i * 11 + Math.sin(t * 3 + i) * 5, 0]], 7, "#1a1024", 0.3);
    }
    c.fillStyle = isFlat() ? "#2a1836" : (() => {
      const g = c.createLinearGradient(-30, 0, 30, 0);
      g.addColorStop(0, "#14081c");
      g.addColorStop(0.5, "#3a2248");
      g.addColorStop(1, "#1a0c24");
      return g;
    })();
    c.beginPath();
    c.moveTo(-22, 0);
    c.quadraticCurveTo(-34, -50, -20, -104);
    c.quadraticCurveTo(0, -116, 20, -104);
    c.quadraticCurveTo(34, -50, 22, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(60,30,80,.7)";
    c.lineWidth = 1.6;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * 8, -8);
      c.quadraticCurveTo(i * 10 + 4, -60, i * 7, -100);
      c.stroke();
    }
    for (const [x, y, r] of [[-10, -84, 3.6], [8, -90, 3], [-4, -66, 3.2], [12, -64, 2.6], [-14, -48, 2.8], [6, -44, 3.4]]) {
      const bl = Math.sin(t * 2 + x) > -0.85;
      if (bl) eyeGlow(c, x, y, rage ? "#ff3a5a" : GLOW, r);
    }
    c.fillStyle = "#07020c";
    c.beginPath();
    c.ellipse(-4, -28, 12, o.attack ? 14 : 9, 0, 0, TAU);
    c.fill();
    for (let i = 0; i < 9; i++) {
      c.save();
      c.translate(-4, -28);
      c.rotate((i * TAU) / 9);
      poly(c, [[-1.6, -10], [0, -4.5], [1.6, -10]], "#e8e0f0");
      c.restore();
    }
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i * Math.PI) / 8;
      const bx = Math.cos(a) * 24;
      const by = -108 + Math.sin(a) * 6;
      limb(c, [[bx * 0.6, -106], [bx, by - 14], [bx * 1.12, by - 26 - (i % 3) * 8]], 3.4, "#1a1024", 0.2);
      if (i % 2 === 0) {
        glow(c, bx * 1.12, by - 28 - (i % 3) * 8, 10, rage ? "#ff3a5a" : GLOW, 0.85);
      }
    }
    const att = o.attack ? 10 : 0;
    limb(c, [[-20, -84], [-40 - att, -66], [-54 - att, -40]], 11, "#2a1836");
    claws(c, -54 - att, -40, "#e8e0f0");
  },
};

export function drawEnemy(c: Ctx, id: EnemyId, o: EnemyFx, scale: number) {
  if (!E[id]) {
    const def = ENEMY_BY_ID[id];
    if (def) {
      c.save();
      c.lineCap = "round";
      drawGeneratedEnemy(c, def, o);
      c.restore();
    }
    return;
  }
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  const flying = id === "mariposa" || id === "rainha";
  if (!flying && !(id === "verme" && o.burrow)) groundShadow(c, 28 * scale * 0.9, 2, 0.4);
  c.scale(scale, scale);
  if (o.hurt > 0 && Math.sin(o.t * 70) > 0) c.globalAlpha = 0.65;
  if (id === "gafanhoto" && o.jump > 0) c.translate(0, -Math.sin(o.jump * Math.PI) * 38);
  E[id](c, o);
  if (o.slow) {
    c.globalAlpha = 0.26;
    ball(c, -2, -48, 30, 52, "#7fd8ff");
    c.globalAlpha = 1;
  }
  if (o.stun) {
    for (let i = 0; i < 3; i++) {
      const a = o.t * 5 + (i * TAU) / 3;
      ball(c, -4 + Math.cos(a) * 16, -96 + Math.sin(a) * 4, 3.2, 3.2, "#ffe14a");
    }
  }
  c.restore();
}
