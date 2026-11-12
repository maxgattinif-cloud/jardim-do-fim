// Cursores grandes, com contorno escuro, para aparecerem bem sobre qualquer cenário.
const svg = (body: string, size = 44) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`
  )}") ${size / 2} ${size / 2}, crosshair`;

const ticks = (col: string, w: number) =>
  [[22, 2, 22, 9], [22, 35, 22, 42], [2, 22, 9, 22], [35, 22, 42, 22]]
    .map(([a, b, c, d]) => `<line x1='${a}' y1='${b}' x2='${c}' y2='${d}' stroke='${col}' stroke-width='${w}' stroke-linecap='round'/>`)
    .join("");

const rays = (col: string, w: number) =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<line x1='${(22 + Math.cos(a) * 12).toFixed(1)}' y1='${(22 + Math.sin(a) * 12).toFixed(1)}' x2='${(22 + Math.cos(a) * 19).toFixed(1)}' y2='${(22 + Math.sin(a) * 19).toFixed(1)}' stroke='${col}' stroke-width='${w}' stroke-linecap='round'/>`;
  }).join("");

export const CURSORS = {
  aim: svg(
    `<circle cx='22' cy='22' r='11' fill='rgba(255,255,255,.12)' stroke='#000' stroke-width='5.5'/>` +
      ticks("#000", 5.5) +
      `<circle cx='22' cy='22' r='11' fill='none' stroke='#fff' stroke-width='2.6'/>` +
      ticks("#fff", 2.6) +
      `<circle cx='22' cy='22' r='3.2' fill='#ffe14a' stroke='#000' stroke-width='1.4'/>`
  ),
  sun: svg(
    rays("#000", 6) +
      `<circle cx='22' cy='22' r='9' fill='#000'/>` +
      rays("#ffe14a", 3) +
      `<circle cx='22' cy='22' r='7.5' fill='#fff176' stroke='#ff9800' stroke-width='2'/>` +
      `<circle cx='22' cy='22' r='20' fill='none' stroke='#fff' stroke-width='1.6' stroke-dasharray='3 3'/>`
  ),
  plant: svg(
    `<circle cx='22' cy='22' r='13' fill='rgba(120,255,80,.18)' stroke='#000' stroke-width='5.5'/>` +
      `<path d='M22 12v20M12 22h20' stroke='#000' stroke-width='6' stroke-linecap='round'/>` +
      `<circle cx='22' cy='22' r='13' fill='none' stroke='#8dff5a' stroke-width='2.6'/>` +
      `<path d='M22 12v20M12 22h20' stroke='#8dff5a' stroke-width='3' stroke-linecap='round'/>`
  ),
  shovel: svg(
    `<circle cx='22' cy='22' r='13' fill='rgba(255,60,60,.2)' stroke='#000' stroke-width='5.5'/>` +
      `<path d='M15 15l14 14M29 15L15 29' stroke='#000' stroke-width='6' stroke-linecap='round'/>` +
      `<circle cx='22' cy='22' r='13' fill='none' stroke='#ff4d4d' stroke-width='2.6'/>` +
      `<path d='M15 15l14 14M29 15L15 29' stroke='#ff4d4d' stroke-width='3' stroke-linecap='round'/>`
  ),
} as const;

export type CursorKind = keyof typeof CURSORS;
