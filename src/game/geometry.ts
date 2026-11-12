export const W = 1000;
export const H = 600;
export const COLS = 9;
export const ROWS = 5;
export const CW = 88;
export const CH = 96;
export const GX = 96;
export const GY = 84;
export const cellX = (c: number) => GX + c * CW + CW / 2;
export const cellY = (r: number) => GY + r * CH + CH / 2;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
