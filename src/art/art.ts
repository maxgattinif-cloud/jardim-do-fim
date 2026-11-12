// Biblioteca de desenho do Jardim do Fim: volumes com gradiente, brilho e sombra.
export type Ctx = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

let FLAT = false;
/** Qualidade baixa: preenchimentos chapados (sem gradientes) para aparelhos fracos. */
export const setFlat = (v: boolean) => {
  FLAT = v;
};
export const isFlat = () => FLAT;

export function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(h: string, a: number) {
  const [r, g, b] = rgb(h);
  return `rgba(${r},${g},${b},${a})`;
}
/** k>0 clareia, k<0 escurece */
export function shade(h: string, k: number) {
  const [r, g, b] = rgb(h);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** Elipse com volume (luz no canto superior esquerdo). */
export function ball(c: Ctx, x: number, y: number, rx: number, ry: number, col: string, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  if (FLAT) c.fillStyle = col;
  else {
    const g = c.createRadialGradient(-rx * 0.35, -ry * 0.4, Math.min(rx, ry) * 0.1, 0, 0, Math.max(rx, ry) * 1.05);
    g.addColorStop(0, shade(col, 0.5));
    g.addColorStop(0.55, col);
    g.addColorStop(1, shade(col, -0.5));
    c.fillStyle = g;
  }
  c.beginPath();
  c.ellipse(0, 0, rx, ry, 0, 0, TAU);
  c.fill();
  c.restore();
}

export function glow(c: Ctx, x: number, y: number, r: number, col: string, a = 0.6) {
  if (FLAT) {
    c.fillStyle = rgba(col, a * 0.35);
    c.beginPath();
    c.arc(x, y, r * 0.6, 0, TAU);
    c.fill();
    return;
  }
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}

export function limb(c: Ctx, pts: number[][], w: number, col: string, taper = 0) {
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = col;
  if (taper > 0) {
    for (let i = 1; i < pts.length; i++) {
      c.lineWidth = Math.max(1, w * (1 - (taper * i) / pts.length));
      c.beginPath();
      c.moveTo(pts[i - 1][0], pts[i - 1][1]);
      c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    }
    return;
  }
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1];
  c.lineTo(l[0], l[1]);
  c.stroke();
}

export function leaf(c: Ctx, x: number, y: number, rot: number, len: number, col = "#2fc27a") {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const g = FLAT ? col : (() => {
    const gg = c.createLinearGradient(0, 0, len, 0);
    gg.addColorStop(0, shade(col, -0.35));
    gg.addColorStop(1, shade(col, 0.25));
    return gg;
  })();
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.45, -len * 0.34, len, 0);
  c.quadraticCurveTo(len * 0.45, len * 0.3, 0, 0);
  c.fill();
  c.strokeStyle = "rgba(0,0,0,.22)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(len * 0.9, 0);
  c.stroke();
  c.restore();
}

export function poly(c: Ctx, pts: number[][], fill: string, stroke?: string, sw = 1.5) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = sw;
    c.lineJoin = "round";
    c.stroke();
  }
}

export type Mood = "calm" | "angry" | "happy" | "sleep";
export function eyes(c: Ctx, x: number, y: number, sp: number, r: number, mood: Mood, iris = "#1a1a1a", look = -1) {
  for (const s of [-1, 1]) {
    if (mood === "sleep") {
      c.strokeStyle = "#102018";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x + s * sp, y, r, 0.1 * Math.PI, 0.9 * Math.PI);
      c.stroke();
      continue;
    }
    ball(c, x + s * sp, y, r, r * 1.08, "#ffffff");
    ball(c, x + s * sp + look, y + 0.4, r * 0.62, r * 0.7, iris);
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(x + s * sp + look - r * 0.2, y - r * 0.25, r * 0.2, 0, TAU);
    c.fill();
    if (mood === "angry") {
      c.strokeStyle = "rgba(10,10,10,.9)";
      c.lineWidth = 2.3;
      c.beginPath();
      c.moveTo(x + s * (sp + r + 1), y - r - 3.5);
      c.lineTo(x + s * (sp - r), y - r + 1.5);
      c.stroke();
    }
  }
}

export function groundShadow(c: Ctx, rx: number, y = 36, a = 0.38) {
  c.fillStyle = `rgba(0,0,0,${a})`;
  c.beginPath();
  c.ellipse(0, y, rx, rx * 0.24, 0, 0, TAU);
  c.fill();
}

/** Números pseudo-aleatórios estáveis (para texturas que não podem tremer). */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
