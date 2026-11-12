import { drawDefender } from "../art/defenders";
import { drawTerrain, drawComboLinks, drawExpansionOverlay } from "./renderExpansion";
import { drawEnemy } from "../art/enemies";
import { TAU, ball, glow, hash, rgba, shade, type Ctx } from "../art/art";
import { COSMETIC_BY_ID, DEFAULT_AURA, DEFAULT_SHOT } from "../data/cosmetics";
import { ENEMY_BY_ID, type EnemyId } from "../data/enemies";
import { BIOMES } from "../data/levels";
import { CH, COLS, CW, GX, GY, H, ROWS, W, cellX, cellY, clamp } from "./geometry";
import type { Enemy, GardenEngine } from "./engine";

/** Altura aproximada (px locais) do topo de cada inimigo, para posicionar a barra de vida. */
const TOP: Partial<Record<EnemyId, number>> = { mariposa: 92, rainha: 112, ceifeira: 134, titan: 138, murchar: 142, colosso: 112, verme: 84, xama: 100 };

function paintBackground(e: GardenEngine, c: Ctx) {
  const b = BIOMES[e.level.biome];
  const g = c.createLinearGradient(0, 0, 0, GY + 70);
  g.addColorStop(0, b.sky[0]);
  g.addColorStop(1, b.sky[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // astro
  const bx = 870;
  const by = 46;
  if (b.body === "sun" || b.body === "swamp" || b.body === "cosmos") {
    glow(c, bx, by, 90, b.body === "sun" ? "#fff0b8" : b.body === "cosmos" ? "#ff9ae8" : "#b8ffd0", 0.35);
    ball(c, bx, by, 24, 24, b.body === "sun" ? "#ffe6a0" : b.body === "cosmos" ? "#ffc8f4" : "#e4ffe8");
    ball(c, bx - 7, by - 5, 5, 5, "rgba(120,140,180,.5)");
  } else if (b.body === "ember") {
    glow(c, bx, by + 6, 120, "#ff8a3a", 0.5);
    ball(c, bx, by + 6, 30, 30, "#ffb347");
  } else {
    glow(c, bx, by, 110, "#c07bff", 0.55);
    ball(c, bx, by, 26, 26, "#0a0412");
    c.strokeStyle = "#e0b0ff";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(bx, by, 27, 0, TAU);
    c.stroke();
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(255,255,255,${0.15 + hash(i) * 0.5})`;
    c.fillRect(hash(i + 3) * W, hash(i + 11) * (GY - 14), 1.6, 1.6);
  }

  // silhuetas distantes
  c.fillStyle = shade(b.sky[0], -0.3);
  c.strokeStyle = c.fillStyle;
  if (b.prop === "trees") {
    c.lineWidth = 4;
    for (const tx of [150, 330, 520, 700, 940]) {
      c.beginPath();
      c.moveTo(tx, GY);
      c.lineTo(tx, GY - 46);
      c.moveTo(tx, GY - 26);
      c.lineTo(tx - 18, GY - 50);
      c.moveTo(tx, GY - 32);
      c.lineTo(tx + 16, GY - 56);
      c.stroke();
    }
  } else if (b.prop === "reeds") {
    c.lineWidth = 2.4;
    for (let i = 0; i < 46; i++) {
      const x = 40 + i * 21 + hash(i) * 10;
      c.beginPath();
      c.moveTo(x, GY + 2);
      c.quadraticCurveTo(x + 4, GY - 22, x + (hash(i + 5) - 0.5) * 14, GY - 30 - hash(i + 2) * 16);
      c.stroke();
    }
  } else if (b.prop === "ruins") {
    for (const [x, h, w] of [[190, 62, 22], [380, 44, 26], [560, 74, 20], [760, 52, 28], [930, 66, 22]]) {
      c.fillRect(x - w / 2, GY - h, w, h);
      c.fillRect(x - w / 2 - 4, GY - h - 6, w + 8, 7);
    }
  } else if (b.prop === "flowers") {
    for (let i = 0; i < 12; i++) {
      const x = 40 + i * 88;
      const hh = 26 + hash(i) * 40;
      c.strokeStyle = shade(b.sky[1], -0.3);
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, GY); c.quadraticCurveTo(x + 6, GY - hh / 2, x + 2, GY - hh); c.stroke();
      c.fillStyle = i % 2 ? b.accent : "#ff8fb1";
      for (let k = 0; k < 5; k++) {
        c.save(); c.translate(x + 2, GY - hh); c.rotate((k * TAU) / 5);
        c.beginPath(); c.ellipse(0, -10, 5, 11, 0, 0, TAU); c.fill(); c.restore();
      }
      c.fillStyle = "#ffe27a";
      c.beginPath(); c.arc(x + 2, GY - hh, 5, 0, TAU); c.fill();
    }
  } else if (b.prop === "mushrooms") {
    for (let i = 0; i < 16; i++) {
      const x = 30 + i * 63, hh = 24 + hash(i) * 46;
      c.fillStyle = "#c8b8d8";
      c.fillRect(x - 3, GY - hh, 6, hh);
      c.fillStyle = i % 2 ? "#b98bff" : "#7fd8ff";
      c.beginPath(); c.ellipse(x, GY - hh, 15, 9, 0, Math.PI, TAU); c.fill();
      glow(c, x, GY - hh, 24, b.accent, 0.35);
    }
  } else if (b.prop === "dunes") {
    c.fillStyle = shade(b.sky[1], -0.18);
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(i * 300 - 40, GY);
      c.quadraticCurveTo(i * 300 + 110, GY - 34 - i * 8, i * 300 + 300, GY);
      c.fill();
    }
    for (const [x, hh] of [[240, 60], [520, 44], [800, 68]]) {
      c.fillStyle = "#3a2418";
      c.fillRect(x - 12, GY - hh, 24, hh);
      c.fillRect(x - 16, GY - hh - 6, 32, 7);
    }
  } else if (b.prop === "portals") {
    for (let i = 0; i < 5; i++) {
      const x = 100 + i * 210, y = 24 + hash(i) * 34;
      glow(c, x, y, 44, b.accent, 0.4);
      c.strokeStyle = rgba(b.accent, 0.8);
      c.lineWidth = 3;
      c.beginPath(); c.ellipse(x, y, 14 + hash(i) * 8, 26, e ? 0 : 0, 0, TAU); c.stroke();
    }
  } else {
    for (let i = 0; i < 30; i++) {
      const x = 30 + i * 33;
      const h = 22 + hash(i) * 40;
      c.beginPath();
      c.moveTo(x - 8, GY + 2);
      c.lineTo(x + (hash(i + 4) - 0.5) * 10, GY - h);
      c.lineTo(x + 8, GY + 2);
      c.fill();
    }
  }

  // gramado
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS + 2; col++) {
      c.fillStyle = (r + col) % 2 ? b.ground[0] : b.ground[1];
      c.fillRect(GX + col * CW, GY + r * CH, CW, CH);
    }
  }
  c.strokeStyle = b.line;
  c.lineWidth = 1;
  for (let col = 0; col <= COLS + 2; col++) {
    c.beginPath();
    c.moveTo(GX + col * CW, GY);
    c.lineTo(GX + col * CW, GY + ROWS * CH);
    c.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    c.beginPath();
    c.moveTo(GX, GY + r * CH);
    c.lineTo(W, GY + r * CH);
    c.stroke();
  }
  for (let i = 0; i < 160; i++) {
    const x = GX + hash(i * 3) * (W - GX);
    const y = GY + hash(i * 3 + 1) * ROWS * CH;
    c.strokeStyle = rgba(b.accent, 0.1 + hash(i) * 0.12);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (hash(i + 7) - 0.5) * 5, y - 4 - hash(i + 9) * 5);
    c.stroke();
  }
  if (b.prop === "reeds")
    for (let i = 0; i < 7; i++) {
      c.fillStyle = "rgba(120,220,200,.10)";
      c.beginPath();
      c.ellipse(GX + 120 + hash(i) * 700, GY + 40 + hash(i + 3) * 400, 46, 14, 0, 0, TAU);
      c.fill();
    }
  if (b.prop === "thorns" || b.prop === "ruins") {
    c.strokeStyle = rgba(b.accent, 0.22);
    c.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      const x = GX + 60 + hash(i * 5) * 800;
      const y = GY + 30 + hash(i * 5 + 1) * 430;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 18, y + 6);
      c.lineTo(x + 30, y - 8);
      c.stroke();
    }
  }

  // linhas inativas (modificador "corredor estreito")
  for (let r = 0; r < ROWS; r++) {
    if (e.activeRows[r]) continue;
    c.fillStyle = "rgba(4,2,8,.72)";
    c.fillRect(GX, GY + r * CH, W - GX, CH);
    c.strokeStyle = "rgba(190,120,255,.35)";
    c.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const x = GX + 20 + i * 56;
      c.beginPath();
      c.moveTo(x, GY + (r + 1) * CH);
      c.lineTo(x + 10, GY + r * CH + 20);
      c.lineTo(x + 20, GY + (r + 1) * CH);
      c.stroke();
    }
  }

  // rochas
  for (const k of e.rocks) {
    const x = cellX(k.col);
    const y = cellY(k.row) + 18;
    c.fillStyle = "rgba(0,0,0,.35)";
    c.beginPath();
    c.ellipse(x, y + 18, 34, 9, 0, 0, TAU);
    c.fill();
    ball(c, x - 10, y + 2, 20, 17, "#6b6f7a", -0.2);
    ball(c, x + 12, y - 2, 18, 22, "#7b808c", 0.2);
    ball(c, x, y - 8, 12, 9, "#8d93a0");
    c.fillStyle = "rgba(95,224,138,.7)";
    c.beginPath();
    c.ellipse(x + 8, y - 18, 10, 4, 0, 0, TAU);
    c.fill();
  }

  // santuário (a casa a ser protegida)
  c.fillStyle = "#14101c";
  c.fillRect(0, GY - 12, GX - 6, ROWS * CH + 24);
  c.fillStyle = "#0b0812";
  c.fillRect(GX - 10, GY - 12, 4, ROWS * CH + 24);
  for (let r = 0; r < ROWS; r++) {
    const cy = GY + r * CH + CH / 2;
    glow(c, 28, cy, 40, b.accent, 0.22);
    c.fillStyle = shade(b.accent, -0.1);
    c.beginPath();
    c.roundRect(14, cy - 24, 28, 46, [14, 14, 3, 3]);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.28)";
    c.beginPath();
    c.roundRect(18, cy - 20, 8, 38, 4);
    c.fill();
    c.fillStyle = "#14101c";
    c.fillRect(27, cy - 24, 2, 46);
  }
  c.fillStyle = "#0a0710";
  c.fillRect(0, GY + ROWS * CH, W, H - GY - ROWS * CH);
  c.strokeStyle = rgba(b.accent, 0.18);
  c.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(40 + i * 118, GY + ROWS * CH + 6);
    c.quadraticCurveTo(70 + i * 118, GY + ROWS * CH + 30, 20 + i * 118, GY + ROWS * CH + 52);
    c.stroke();
  }
}

function hpBar(c: Ctx, x: number, y: number, w: number, f: number, col: string) {
  c.fillStyle = "rgba(0,0,0,.6)";
  c.fillRect(x - w / 2, y, w, 5);
  c.fillStyle = col;
  c.fillRect(x - w / 2 + 1, y + 1, (w - 2) * clamp(f, 0, 1), 3);
}

export function drawScene(e: GardenEngine) {
  const c = e.ctx;
  const dpr = e.dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const b = BIOMES[e.level.biome];
  const high = e.quality === "high";
  const low = e.quality === "low";

  if (e.bgDirty || !e.bg) {
    e.bgDirty = false;
    if (typeof document !== "undefined") {
      const cv = document.createElement("canvas");
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const cc = cv.getContext("2d");
      if (cc) {
        cc.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintBackground(e, cc);
        e.bg = cv;
      }
    }
  }
  c.save();
  if (e.shakeOn && e.shake > 0) c.translate((Math.random() - 0.5) * e.shake * 9, (Math.random() - 0.5) * e.shake * 9);
  if (e.bg) c.drawImage(e.bg, 0, 0, W, H);
  else paintBackground(e, c);
  drawTerrain(e, c);
  drawComboLinks(e, c);

  // runas de guarda
  for (const g of e.guards) {
    if (g.state === 2) continue;
    const y = cellY(g.row) + 26;
    const pulse = 0.6 + 0.4 * Math.sin(e.time * 3 + g.row);
    c.save();
    c.translate(g.x, y);
    c.fillStyle = "rgba(0,0,0,.4)";
    c.beginPath();
    c.ellipse(0, 10, 26, 8, 0, 0, TAU);
    c.fill();
    ball(c, 0, 0, 24, 14, "#4a4658");
    c.strokeStyle = rgba(b.accent, 0.5 + 0.5 * pulse);
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(0, 0, 15, 8, 0, 0, TAU);
    c.moveTo(-10, 0);
    c.lineTo(10, 0);
    c.moveTo(0, -6);
    c.lineTo(0, 6);
    c.stroke();
    if (g.state === 1) {
      glow(c, 0, -6, 60, b.accent, 0.9);
      for (let i = 1; i < 8; i++) {
        c.fillStyle = rgba(b.accent, 0.5 - i * 0.06);
        c.fillRect(-i * 22, -22, 20, 36);
      }
    }
    c.restore();
  }

  // entidades por linha
  for (let r = 0; r < ROWS; r++) {
    for (const p of e.plants.filter((q) => q.row === r)) {
      const s = clamp((e.time - p.born) * 5, 0, 1);
      const x = cellX(p.col);
      const y = cellY(r);
      const seat = e.seats[p.owner];
      const aura = COSMETIC_BY_ID[seat?.aura ?? DEFAULT_AURA] ?? COSMETIC_BY_ID[DEFAULT_AURA];
      glow(c, x, y + 34, 44, aura.color, 0.42);
      c.save();
      c.translate(x, y);
      c.scale(0.6 + 0.4 * s, 0.6 + 0.4 * s);
      drawDefender(c, p.type, e.time + p.id, { hpFrac: p.hp / p.maxHp, charge: p.charge, busy: p.state === 2, flash: p.flash, lv: p.lv });
      c.restore();
      if (p.hp < p.maxHp * 0.999) hpBar(c, x, y - 52, 40, p.hp / p.maxHp, "#5fe08a");
      if (p.lv > 1) {
        c.fillStyle = "#ffd45a";
        c.strokeStyle = "#000";
        c.lineWidth = 2;
        c.font = "900 11px system-ui, sans-serif";
        c.textAlign = "left";
        const t = "★".repeat(p.lv - 1);
        c.strokeText(t, x - 28, y + 40);
        c.fillText(t, x - 28, y + 40);
      }
    }
    for (const z of e.enemies.filter((q) => q.row === r).sort((a, b2) => b2.x - a.x)) {
      const d = ENEMY_BY_ID[z.type];
      const x = e.mirror ? z.rx : z.x;
      const base = cellY(r) + 32 + z.ofs;
      const fogged = e.mods.has("nevoa") && x > GX + 6.2 * CW;
      c.save();
      c.translate(x, base);
      if (fogged) c.globalAlpha = 0.3;
      drawEnemy(
        c,
        z.type,
        { t: e.time + z.id, walk: z.walk, armor: z.armorMax ? z.armor / z.armorMax : 0, slow: z.slowT > e.time, stun: z.stunT > e.time, hurt: z.hurt, attack: z.attacking, jump: z.jumpT > 0 ? 1 - z.jumpT : 0, burrow: z.burrowed, enrage: z.enrage },
        d.scale
      );
      c.restore();
      if (!fogged && !z.burrowed && (z.hp < z.maxHp * 0.999 || d.kind === "chefe")) {
        const top = (TOP[z.type] ?? 100) * d.scale + 8;
        hpBar(c, x - 4, Math.max(4, base - top), 38 * Math.max(1, d.scale * 0.95), z.hp / z.maxHp, d.kind === "chefe" ? "#ff4d5e" : "#ff8f6b");
        if (z.armor > 0 && d.armor > 0) {
          c.fillStyle = "#cfd6e0";
          c.fillRect(x - 4 - 19 * Math.max(1, d.scale * 0.95) + 1, Math.max(4, base - top) - 3, (38 * Math.max(1, d.scale * 0.95) - 2) * clamp(z.armor / z.armorMax, 0, 1), 2);
        }
      }
    }
  }

  // projéteis
  for (const p of e.projs) {
    const shot = COSMETIC_BY_ID[e.seats[p.owner]?.shot ?? DEFAULT_SHOT] ?? COSMETIC_BY_ID[DEFAULT_SHOT];
    if (p.kind === "dart") {
      c.fillStyle = rgba(shot.color, 0.28);
      c.beginPath();
      c.ellipse(p.x - 10, p.y, 16, 4.5, 0, 0, TAU);
      c.fill();
      glow(c, p.x, p.y, 14, shot.color, 0.6);
      c.fillStyle = shot.color;
      c.beginPath();
      c.moveTo(p.x + 10, p.y);
      c.lineTo(p.x - 6, p.y - 4);
      c.lineTo(p.x - 6, p.y + 4);
      c.fill();
      c.fillStyle = "#fff";
      c.fillRect(p.x - 4, p.y - 1, 8, 2);
    } else if (p.kind === "shard") {
      c.fillStyle = "rgba(160,230,255,.32)";
      c.beginPath();
      c.ellipse(p.x - 10, p.y, 15, 5, 0, 0, TAU);
      c.fill();
      glow(c, p.x, p.y, 14, "#8fdcff", 0.7);
      c.fillStyle = "#e0f8ff";
      c.beginPath();
      c.moveTo(p.x + 11, p.y);
      c.lineTo(p.x, p.y - 6);
      c.lineTo(p.x - 8, p.y);
      c.lineTo(p.x, p.y + 6);
      c.closePath();
      c.fill();
    } else if (p.kind === "lob") {
      glow(c, p.x, p.y, 20, "#ffb347", 0.55);
      ball(c, p.x, p.y, 11, 11, "#ff8f3a");
      ball(c, p.x - 3, p.y - 3, 3.5, 3.5, "#ffe0a0");
    } else {
      glow(c, p.x + 6, p.y, 16, "#a3ff2a", 0.5);
      ball(c, p.x, p.y, 7, 7, "#a3ff2a");
    }
  }

  // efeitos
  for (const f of e.fxs) {
    const k = f.t / f.ttl;
    c.globalAlpha = 1;
    if (f.k === "boom") {
      const r = f.a * (0.4 + 0.6 * Math.sqrt(k));
      const gr = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gr.addColorStop(0, `rgba(255,240,170,${1 - k})`);
      gr.addColorStop(0.5, `rgba(255,120,40,${0.8 * (1 - k)})`);
      gr.addColorStop(1, "rgba(120,20,0,0)");
      c.fillStyle = gr;
      c.beginPath();
      c.arc(f.x, f.y, r, 0, TAU);
      c.fill();
    } else if (f.k === "bolt") {
      c.globalAlpha = 1 - k;
      c.lineJoin = "round";
      for (const [col, w] of [["#b678ff", 7], ["#ffffff", 2.5]] as [string, number][]) {
        c.strokeStyle = col;
        c.lineWidth = w;
        c.beginPath();
        f.pts.forEach(([px, py], i) => {
          if (i === 0) c.moveTo(px, py);
          else {
            const [qx, qy] = f.pts[i - 1];
            for (let s = 1; s <= 4; s++) {
              const jitter = s < 4 ? (hash(f.x + s * 7 + i + Math.floor(f.t * 40)) - 0.5) * 16 : 0;
              c.lineTo(qx + ((px - qx) * s) / 4 + jitter, qy + ((py - qy) * s) / 4 + jitter);
            }
          }
        });
        c.stroke();
      }
    } else if (f.k === "ring") {
      c.strokeStyle = f.col;
      c.globalAlpha = 1 - k;
      c.lineWidth = 5 * (1 - k) + 1;
      c.beginPath();
      c.arc(f.x, f.y, f.a * k, 0, TAU);
      c.stroke();
    } else if (f.k === "slash") {
      c.globalAlpha = (1 - k) * 0.9;
      c.strokeStyle = f.col;
      c.lineWidth = 6 * (1 - k) + 1;
      c.lineCap = "round";
      c.beginPath();
      c.arc(f.x, f.y, f.a * 0.5, -1.2 + k * 0.5, 1.2 - k * 0.2);
      c.stroke();
    } else if (f.k === "text") {
      c.globalAlpha = 1 - k;
      c.font = "900 20px system-ui, sans-serif";
      c.textAlign = "center";
      c.strokeStyle = "#000";
      c.lineWidth = 3;
      c.strokeText(f.text, f.x, f.y - k * 34);
      c.fillStyle = f.col;
      c.fillText(f.text, f.x, f.y - k * 34);
    } else {
      c.globalAlpha = 1 - k;
      c.fillStyle = f.col;
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7;
        c.beginPath();
        c.arc(f.x + Math.cos(a) * 22 * k, f.y + Math.sin(a) * 16 * k - k * 10, 6 * (1 - k * 0.6), 0, TAU);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  // seiva (a moeda de energia compartilhada)
  const hs = e.mouse ? e.sunAt(e.mouse.x, e.mouse.y) : null;
  for (const s of e.suns) {
    const hov = hs === s;
    const pulse = (1 + Math.sin(e.time * 6 + s.id) * 0.06) * (hov ? 1.3 : 1);
    c.globalAlpha = s.age > 12 && Math.floor(e.time * 8) % 2 === 0 ? 0.45 : 1;
    glow(c, s.x, s.y, 34 * pulse, "#ffcf4a", 0.8);
    ball(c, s.x, s.y, 13 * pulse, 14 * pulse, "#ffd45a");
    ball(c, s.x - 3, s.y - 4, 4, 5, "#fff6c8");
    c.strokeStyle = "rgba(255,240,170,.85)";
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + e.time * 1.4;
      c.beginPath();
      c.moveTo(s.x + Math.cos(a) * 19 * pulse, s.y + Math.sin(a) * 19 * pulse);
      c.lineTo(s.x + Math.cos(a) * 25 * pulse, s.y + Math.sin(a) * 25 * pulse);
      c.stroke();
    }
    if (hov) {
      c.strokeStyle = "#fff";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(s.x, s.y, 30 + Math.sin(e.time * 10) * 2, 0, TAU);
      c.stroke();
      c.font = "900 12px system-ui, sans-serif";
      c.textAlign = "center";
      c.strokeStyle = "#000";
      c.lineWidth = 3;
      c.strokeText("CLIQUE!", s.x, s.y - 40);
      c.fillStyle = "#fff";
      c.fillText("CLIQUE!", s.x, s.y - 40);
    }
  }
  c.globalAlpha = 1;

  // prévia de plantio
  if (e.hover) {
    const { col, row } = e.hover;
    const blocked = e.isBlocked(col, row);
    if (e.sel && !blocked) {
      c.fillStyle = "rgba(255,255,255,.14)";
      c.fillRect(GX + col * CW, GY + row * CH, CW, CH);
      c.save();
      c.globalAlpha = 0.55;
      c.translate(cellX(col), cellY(row));
      drawDefender(c, e.sel, e.time, { hpFrac: 1, charge: 0, busy: false, flash: 0, lv: 1 });
      c.restore();
    } else if (e.sel && blocked) {
      c.fillStyle = "rgba(255,60,60,.18)";
      c.fillRect(GX + col * CW, GY + row * CH, CW, CH);
    } else if (e.shovel && e.plants.some((p) => p.col === col && p.row === row)) {
      c.fillStyle = "rgba(255,60,60,.32)";
      c.fillRect(GX + col * CW, GY + row * CH, CW, CH);
    }
  }

  drawExpansionOverlay(e, c);
  // atmosfera
  if (!low) {
    c.fillStyle = b.fog;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(((e.time * 12 + i * 380) % (W + 400)) - 200, GY + 120 + i * 150, 260, 36, 0, 0, TAU);
      c.fill();
    }
    if (e.mods.has("nevoa")) {
      const fg = c.createLinearGradient(GX + 4.5 * CW, 0, W, 0);
      fg.addColorStop(0, "rgba(180,200,220,0)");
      fg.addColorStop(1, "rgba(180,200,220,.34)");
      c.fillStyle = fg;
      c.fillRect(GX + 4.5 * CW, GY, W, ROWS * CH);
    }
    if (e.mods.has("chuva")) {
      c.strokeStyle = "rgba(255,210,120,.35)";
      c.lineWidth = 1.4;
      const n = high ? 70 : 36;
      for (let i = 0; i < n; i++) {
        const x = ((hash(i) * W + e.time * 60) % (W + 80)) - 40;
        const y = ((hash(i + 40) * H + e.time * 460) % (H + 40)) - 20;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - 5, y + 14);
        c.stroke();
      }
    }
    if (e.mods.has("noite")) {
      c.fillStyle = "rgba(2,4,18,.32)";
      c.fillRect(0, 0, W, H);
    }
    const spores = high ? 26 : 12;
    for (let i = 0; i < spores; i++) {
      const x = (hash(i) * W + Math.sin(e.time * 0.6 + i) * 30) % W;
      const y = H - ((hash(i + 9) * H + e.time * (10 + hash(i + 2) * 14)) % H);
      c.fillStyle = rgba(b.accent, 0.12 + 0.28 * hash(i + 4));
      c.beginPath();
      c.arc(x, y, 1.2 + hash(i + 6) * 1.8, 0, TAU);
      c.fill();
    }
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.64);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,.5)");
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
  }
  c.restore();
}

export type { Enemy };
