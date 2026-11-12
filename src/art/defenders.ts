import { DEF_BY_ID, type DefId } from "../data/defenders";
import { drawGeneratedDefender } from "./generator";
import { TAU, ball, eyes, glow, groundShadow, leaf, limb, poly, rgba, shade, isFlat, type Ctx } from "./art";

export interface DefFx {
  hpFrac: number;
  charge: number; // 0..1 (antecipação / golpe recente)
  busy: boolean; // vórtice ativo etc.
  flash: number;
  lv: number;
}

type Draw = (c: Ctx, t: number, o: DefFx) => void;

const stem = (c: Ctx, sw: number, col = "#1f9a68", top = 4) => {
  limb(c, [[0, 38], [sw * 0.4, 20], [sw, top]], 6, col);
  leaf(c, 1, 30, -0.6, 26, shade(col, 0.15));
  leaf(c, -1, 26, Math.PI + 0.6, 26, shade(col, 0.15));
};

const crystal = (c: Ctx, x: number, y: number, h: number, w: number, tilt: number, a: string, b: string) => {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  const g = isFlat() ? a : (() => {
    const gg = c.createLinearGradient(-w, 0, w, 0);
    gg.addColorStop(0, shade(a, -0.3));
    gg.addColorStop(0.5, b);
    gg.addColorStop(1, a);
    return gg;
  })();
  poly(c, [[-w / 2, 0], [-w * 0.46, -h * 0.78], [0, -h], [w * 0.46, -h * 0.78], [w / 2, 0]], g as string, shade(a, 0.45), 1.2);
  c.fillStyle = "rgba(255,255,255,.35)";
  c.beginPath();
  c.moveTo(-w * 0.2, -h * 0.1);
  c.lineTo(-w * 0.12, -h * 0.7);
  c.lineTo(-w * 0.02, -h * 0.1);
  c.fill();
  c.restore();
};

const D: Record<DefId, Draw> = {
  luminia(c, t) {
    const sw = Math.sin(t * 2) * 1.6;
    const p = 0.5 + 0.5 * Math.sin(t * 3);
    glow(c, sw, -12, 52 + p * 10, "#2ee6c5", 0.5);
    stem(c, sw);
    for (let i = 0; i < 7; i++) {
      c.save();
      c.translate(sw, -6);
      c.rotate(-Math.PI / 2 + (i - 3) * 0.44 + Math.sin(t * 2 + i) * 0.03);
      ball(c, 0, -22, 7, 17, i % 2 ? "#35e0c0" : "#6df3d6");
      c.restore();
    }
    ball(c, sw, -8, 16, 17, "#ffcf4a");
    glow(c, sw, -9, 22, "#fff6c8", 0.8 + 0.2 * p);
    ball(c, sw, -9, 8 + p * 1.5, 8 + p * 1.5, "#fff3b8");
    eyes(c, sw, -6, 5, 2.6, "calm", "#1a4a3a");
    for (let i = 0; i < 3; i++) {
      const a = t * 1.4 + i * 2.1;
      const x = sw + Math.cos(a) * 31;
      const y = -14 + Math.sin(a * 1.3) * 20;
      glow(c, x, y, 9, "#fff3a0", 0.9);
      ball(c, x, y, 1.8, 1.8, "#fffbe0");
    }
  },
  ambar(c, t) {
    const p = 0.5 + 0.5 * Math.sin(t * 2.4);
    glow(c, 0, -6, 58, "#ffb020", 0.42 + 0.16 * p);
    limb(c, [[-6, 36], [-18, 32], [-28, 37]], 4, "#6a4420");
    limb(c, [[6, 36], [18, 31], [30, 37]], 4, "#6a4420");
    crystal(c, -19, 36, 34, 12, -0.3, "#e08a10", "#ffcf5a");
    crystal(c, 19, 36, 30, 11, 0.32, "#e08a10", "#ffcf5a");
    crystal(c, 8, 36, 44, 13, 0.1, "#f09a18", "#ffd878");
    crystal(c, -6, 36, 54, 14, -0.07, "#f5a623", "#ffe09a");
    glow(c, -6, -8, 20, "#fff2c0", 0.7 + 0.3 * p);
    eyes(c, -6, -8, 4.2, 2.4, "calm", "#7a3a00");
    for (let i = 0; i < 4; i++) {
      const y = 30 - ((t * 16 + i * 17) % 78);
      ball(c, Math.sin(t + i * 2) * 20, y, 2.2, 3, "#ffe08a");
    }
  },
  espinheiro(c, t, o) {
    const sw = Math.sin(t * 2.2) * 1.5;
    const k = o.charge;
    stem(c, sw, "#2b8a52");
    c.save();
    c.translate(sw, -8 - k * 2);
    for (let i = 0; i < 12; i++) {
      c.save();
      c.rotate((i * TAU) / 12 + 0.2);
      poly(c, [[-3.4, -17], [0, -29 - (i % 3)], [3.4, -17]], "#1d6a3c");
      poly(c, [[-1.2, -25], [0, -29 - (i % 3)], [1.2, -25]], "#ff7a9a");
      c.restore();
    }
    ball(c, 0, 0, 19, 18, "#43bb70");
    ball(c, -7, -9, 6, 3.4, "#a8f5c0", -0.5);
    const len = 20 + k * 9;
    c.fillStyle = isFlat() ? "#9a6a3a" : (() => {
      const g = c.createLinearGradient(0, -8, 0, 8);
      g.addColorStop(0, "#c08a50");
      g.addColorStop(1, "#6a4420");
      return g;
    })();
    c.beginPath();
    c.roundRect(10, -7, len, 14, 6);
    c.fill();
    poly(c, [[10 + len, -5], [10 + len + 13, 0], [10 + len, 5]], "#fff1d0", "#c9a26a", 1);
    poly(c, [[10 + len + 6, -2], [10 + len + 13, 0], [10 + len + 6, 2]], "#ff5a7a");
    eyes(c, -3, -5, 6, 3.8, "angry", "#ffd45a");
    c.restore();
  },
  gelidea(c, t, o) {
    const sw = Math.sin(t * 2) * 1.4;
    const k = o.charge;
    glow(c, sw, -10, 54, "#7fd8ff", 0.35);
    stem(c, sw, "#3a9aa8");
    c.save();
    c.translate(sw, -8);
    for (let i = 0; i < 7; i++) {
      c.save();
      c.rotate(-1.35 + i * 0.45);
      poly(c, [[-5, -14], [0, -34 - (i % 2) * 7], [5, -14]], "#d8f6ff", "#7fd8ff", 1.2);
      c.restore();
    }
    ball(c, 0, 0, 19, 18, "#8fdcff");
    ball(c, -6, -8, 7, 4, "#f0fcff", -0.4);
    c.fillStyle = "#c9f0ff";
    c.strokeStyle = "#7fd8ff";
    c.lineWidth = 1.5;
    c.beginPath();
    c.roundRect(10, -7, 22 + k * 5, 14, 6);
    c.fill();
    c.stroke();
    poly(c, [[32 + k * 5, -5], [44 + k * 5, 0], [32 + k * 5, 5]], "#ffffff", "#7fd8ff", 1);
    eyes(c, -3, -5, 6, 3.8, "angry", "#2b6a9a");
    for (let i = 0; i < 4; i++) {
      const sx = -22 + ((t * 18 + i * 14) % 52);
      glow(c, sx, -22 + Math.sin(t * 3 + i) * 5, 6, "#ffffff", 0.9);
    }
    c.restore();
  },
  orquidea(c, t, o) {
    const sw = Math.sin(t * 2.1) * 1.3;
    const k = o.charge;
    stem(c, sw, "#3a9a6a");
    c.save();
    c.translate(sw, -8);
    glow(c, 0, 0, 52, "#c07bff", 0.3 + 0.4 * k);
    ball(c, -19, -5, 10, 21, "#8a4fe0", -0.75);
    ball(c, 19, -5, 10, 21, "#8a4fe0", 0.75);
    ball(c, 0, -22, 12, 17, "#b678ff");
    ball(c, 0, 9, 13, 9, "#ffd84a");
    ball(c, 0, -2, 10, 10, "#f5eaff");
    eyes(c, 0, -3, 4.2, 2.6, "angry", "#4a1d88");
    for (const s of [-1, 1]) {
      limb(c, [[s * 4, -10], [s * 9, -24], [s * 14, -38]], 2.4, "#6a2fc0");
      glow(c, s * 14, -38, 10 + k * 6, "#fff2a0", 0.9);
    }
    c.strokeStyle = rgba("#f0d8ff", 0.5 + 0.5 * Math.sin(t * 30));
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-14, -38);
    for (let i = 1; i <= 5; i++) c.lineTo(-14 + i * 5.6, -38 + Math.sin(t * 40 + i * 2) * (3 + k * 6));
    c.stroke();
    c.restore();
  },
  morteiro(c, _t, o) {
    const k = o.charge;
    const squash = 1 - k * 0.07;
    c.save();
    c.translate(0, 34);
    c.scale(1 + k * 0.05, squash);
    c.translate(0, -34);
    ball(c, 0, 12, 21, 25, "#3cbf92");
    c.strokeStyle = "rgba(10,60,40,.4)";
    c.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * 7, -10);
      c.quadraticCurveTo(i * 10, 12, i * 7, 36);
      c.stroke();
    }
    ball(c, -22, 6, 7, 11, "#35b085", -0.4);
    ball(c, 22, 8, 7, 11, "#35b085", 0.4);
    ball(c, -8, -14, 7, 6, "#ff8fb1");
    c.save();
    c.translate(6, -16 + k * 4);
    c.rotate(-0.62);
    c.fillStyle = isFlat() ? "#4a5a62" : (() => {
      const g = c.createLinearGradient(0, -9, 0, 9);
      g.addColorStop(0, "#7a8a92");
      g.addColorStop(1, "#2a363c");
      return g;
    })();
    c.beginPath();
    c.roundRect(0, -9, 32, 18, 4);
    c.fill();
    c.fillStyle = "#1a2226";
    c.fillRect(28, -9, 5, 18);
    glow(c, 33, 0, 12 + k * 12, "#ffcf5a", 0.4 + k * 0.5);
    c.restore();
    eyes(c, 0, 4, 6, 3.6, "angry", "#10382a");
    c.restore();
  },
  cipo(c, t, o) {
    const k = o.charge;
    for (let i = 0; i < 3; i++) ball(c, 0, 30 - i * 6, 18 - i * 2, 6, i % 2 ? "#6a9a22" : "#7fb02a");
    leaf(c, -4, 16, Math.PI + 0.5, 22, "#6aa82a");
    leaf(c, 4, 14, -0.5, 22, "#6aa82a");
    ball(c, -2, -6, 17, 17, "#a8dc40");
    for (let i = 0; i < 5; i++) leaf(c, -2, -18, -Math.PI / 2 + (i - 2) * 0.45, 17, "#4f8a1c");
    eyes(c, -4, -6, 5.6, 3.5, "angry", "#3a4a10");
    const L = 52 + k * 100;
    const pts: number[][] = [];
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      pts.push([12 + s * L, 0 + Math.sin(t * 6 - i * 0.8) * (3 + k * 12) * s - k * 10 * Math.sin(s * Math.PI)]);
    }
    limb(c, pts, 6, "#5a8a1a", 0.7);
    glow(c, pts[10][0], pts[10][1], 8 + k * 8, "#e0ff6a", 0.5 + k * 0.5);
  },
  cardo(c, t, o) {
    const k = o.charge;
    leaf(c, -2, 30, Math.PI + 0.7, 22, "#3a8a58");
    leaf(c, 2, 30, -0.7, 22, "#3a8a58");
    limb(c, [[0, 38], [0, 22]], 6, "#2f7a4a");
    c.save();
    c.translate(0, -2);
    const spin = t * (1.2 + k * 14);
    for (let i = 0; i < 2; i++) {
      c.save();
      c.rotate(spin + i * Math.PI);
      c.fillStyle = "#ffd3e0";
      c.strokeStyle = "#ff6b8a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(14, -3);
      c.quadraticCurveTo(46, -12, 40, 20);
      c.quadraticCurveTo(32, 2, 14, 4);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
    }
    for (let i = 0; i < 12; i++) {
      c.save();
      c.rotate((i * TAU) / 12);
      poly(c, [[-3, -15], [0, -26], [3, -15]], "#4a1d88");
      c.restore();
    }
    ball(c, 0, 0, 17, 17, "#8a4fe0");
    ball(c, -5, -7, 6, 3.4, "#d0b0ff", -0.5);
    eyes(c, 0, -2, 5.6, 3.4, "angry", "#ff6b8a");
    c.restore();
  },
  tronco(c, t, o) {
    const hf = o.hpFrac;
    ball(c, 0, 33, 29, 7, "#3a2410");
    c.fillStyle = isFlat() ? "#7a5530" : (() => {
      const g = c.createLinearGradient(-26, 0, 26, 0);
      g.addColorStop(0, "#3a2410");
      g.addColorStop(0.45, "#9a6c3e");
      g.addColorStop(1, "#4a2e14");
      return g;
    })();
    c.beginPath();
    c.roundRect(-26, -22, 52, 56, [10, 10, 8, 8]);
    c.fill();
    c.strokeStyle = "rgba(30,15,5,.45)";
    c.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(i * 7, -18);
      c.quadraticCurveTo(i * 7 + 3, 6, i * 7 - 1, 32);
      c.stroke();
    }
    ball(c, 0, -22, 26, 9, "#b88a52");
    c.strokeStyle = "rgba(90,55,20,.6)";
    c.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.ellipse(0, -22, 26 - i * 7, 9 - i * 2.3, 0, 0, TAU);
      c.stroke();
    }
    ball(c, -16, -27, 10, 5, "#3fae6a");
    ball(c, 14, -26, 7, 4, "#2f9a5a");
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.5);
    glow(c, -9, -4, 14, "#ffb020", 0.7 * pulse);
    glow(c, 9, -4, 14, "#ffb020", 0.7 * pulse);
    c.fillStyle = "#ffd45a";
    c.beginPath();
    c.ellipse(-9, -4, 6, 3.2, 0.2, 0, TAU);
    c.ellipse(9, -4, 6, 3.2, -0.2, 0, TAU);
    c.fill();
    c.strokeStyle = rgba("#ffb020", 0.4 + 0.5 * pulse);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-8, 14);
    c.lineTo(-3, 10);
    c.lineTo(3, 14);
    c.lineTo(8, 10);
    c.stroke();
    c.strokeStyle = "#1a0d04";
    c.lineWidth = 2.4;
    if (hf < 0.7) {
      c.beginPath();
      c.moveTo(14, -20);
      c.lineTo(8, -4);
      c.lineTo(16, 8);
      c.stroke();
    }
    if (hf < 0.35) {
      c.beginPath();
      c.moveTo(-18, -6);
      c.lineTo(-8, 10);
      c.lineTo(-16, 24);
      c.moveTo(6, 20);
      c.lineTo(18, 30);
      c.stroke();
    }
  },
  musgo(c, t) {
    const p = 0.5 + 0.5 * Math.sin(t * 2.2);
    glow(c, 0, 8, 46, "#5fe08a", 0.22 + 0.15 * p);
    ball(c, 0, 24, 34, 15, "#2f9a5a");
    ball(c, -16, 20, 17, 12, "#38ab66");
    ball(c, 16, 21, 16, 11, "#38ab66");
    limb(c, [[0, 24], [0, 4]], 11, "#e8dcc4");
    ball(c, 0, -6, 25, 15, "#e0527a");
    c.fillStyle = "rgba(255,255,255,.9)";
    for (const [x, y, r] of [[-12, -9, 4], [4, -14, 3.4], [13, -4, 4.2], [-2, -3, 2.6]]) {
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
    }
    eyes(c, 0, 12, 7, 2.4, "sleep");
    c.strokeStyle = "#143a22";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 16, 3.4, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
    for (let i = 0; i < 4; i++) {
      const y = 22 - ((t * 15 + i * 15) % 62);
      const x = Math.sin(t + i * 2) * 20;
      c.strokeStyle = rgba("#9cffbc", 0.85 - (22 - y) / 90);
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(x - 4, y);
      c.lineTo(x + 4, y);
      c.moveTo(x, y - 4);
      c.lineTo(x, y + 4);
      c.stroke();
    }
  },
  magma(c, t, o) {
    const k = o.charge;
    const pulse = 1 + 0.05 * Math.sin(t * 6) + k * 0.16;
    glow(c, 0, 4, 54 * pulse, "#ff5a2a", 0.4 + k * 0.45);
    c.save();
    c.translate(0, 8);
    c.scale(pulse, pulse);
    ball(c, 0, 0, 23, 22, "#3a1a22");
    c.strokeStyle = rgba("#ff8a2a", 0.7 + 0.3 * Math.sin(t * 5));
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(-14, -12);
    c.lineTo(-6, -2);
    c.lineTo(-12, 8);
    c.lineTo(-4, 16);
    c.moveTo(12, -14);
    c.lineTo(7, -4);
    c.lineTo(15, 4);
    c.lineTo(8, 14);
    c.stroke();
    eyes(c, 0, -2, 7, 3.8, "angry", "#ff5a2a");
    c.restore();
    for (let i = 0; i < 4; i++) leaf(c, 0, -14, -Math.PI / 2 + (i - 1.5) * 0.55, 18, "#2a6a3a");
    if (k > 0) {
      const fh = 14 + Math.sin(t * 30) * 4 + k * 10;
      poly(c, [[-6, -16], [0, -16 - fh], [6, -16]], "#ff8a1a");
      poly(c, [[-3, -16], [0, -16 - fh * 0.6], [3, -16]], "#ffe27a");
    }
  },
  sino(c, t, o) {
    const k = o.charge;
    limb(c, [[0, 38], [4, 20], [0, 6]], 5, "#3a8a8a");
    leaf(c, 2, 30, -0.5, 22, "#3a9a8a");
    c.save();
    c.translate(0, -4);
    c.rotate(Math.sin(t * 2) * 0.07 + (k > 0.85 ? Math.sin(t * 50) * 0.14 : 0));
    c.fillStyle = isFlat() ? "#6a7cf0" : (() => {
      const g = c.createLinearGradient(-24, 0, 24, 0);
      g.addColorStop(0, "#3a3fa0");
      g.addColorStop(0.5, "#8a9cff");
      g.addColorStop(1, "#4a4fc0");
      return g;
    })();
    c.beginPath();
    c.moveTo(-25, 16);
    c.quadraticCurveTo(-14, 8, -13, -14);
    c.quadraticCurveTo(0, -36, 13, -14);
    c.quadraticCurveTo(14, 8, 25, 16);
    c.quadraticCurveTo(0, 24, -25, 16);
    c.fill();
    c.strokeStyle = "#cfd6ff";
    c.lineWidth = 1.6;
    c.stroke();
    c.fillStyle = "#ffd96a";
    c.beginPath();
    c.arc(-1, -6, 8, 0.6 * Math.PI, 1.6 * Math.PI);
    c.arc(2, -6, 6.2, 1.6 * Math.PI, 0.6 * Math.PI, true);
    c.fill();
    ball(c, 0, 24 + Math.sin(t * 4) * 1.5, 5, 5, "#ffd96a");
    eyes(c, 0, 4, 6, 2.8, "calm", "#1a1f6a");
    c.restore();
    if (k > 0.85) {
      for (let i = 1; i <= 3; i++) {
        c.strokeStyle = rgba("#aab8ff", 1 - i * 0.28);
        c.lineWidth = 2.4;
        c.beginPath();
        c.arc(0, 4, 20 + i * 14 + (t * 40) % 10, -0.7, 0.7);
        c.stroke();
      }
    }
  },
  vazio(c, t, o) {
    glow(c, 0, 2, 50, "#9b5cff", 0.4 + (o.busy ? 0.3 : 0));
    if (o.busy) {
      for (let i = 0; i < 4; i++) {
        c.save();
        c.rotate(t * (2.4 - i * 0.4));
        c.strokeStyle = rgba("#c9a0ff", 0.65 - i * 0.12);
        c.lineWidth = 3 - i * 0.5;
        c.beginPath();
        c.ellipse(0, 0, 36 + i * 24, 20 + i * 13, 0, 0, Math.PI * 1.45);
        c.stroke();
        c.restore();
      }
      glow(c, 0, 0, 80, "#2a0a5a", 0.5);
    }
    ball(c, 0, 4, 15, 21, "#1a1030");
    c.strokeStyle = rgba("#b78cff", 0.9);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 4, 15, 21, 0, 0, TAU);
    c.stroke();
    c.beginPath();
    for (let i = 0; i < 40; i++) {
      const a = i * 0.3 + t * 3;
      const r = 1 + i * 0.3;
      const x = Math.cos(a) * r * 0.9;
      const y = 4 + Math.sin(a) * r * 1.2;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
    eyes(c, 0, -8, 5, 2.4, "angry", "#9b5cff");
  },
};

export function drawDefender(c: Ctx, id: DefId, t: number, o: DefFx) {
  if (!D[id]) {
    const def = DEF_BY_ID[id];
    if (def) drawGeneratedDefender(c, def, t, o);
    return;
  }
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  groundShadow(c, 26);
  D[id](c, t, o);
  if (o.flash > 0) {
    c.globalAlpha = Math.min(0.5, o.flash);
    ball(c, 0, 0, 40, 40, "#ffffff");
  }
  c.restore();
}
