import { TAU, ball, glow, hash, rgba, type Ctx } from "../art/art";
import { EVENT_INFO, TERRAIN_INFO, EVENT_WARN } from "../data/worlds";
import { COMBOS } from "../data/combos";
import { ENEMY_BY_ID } from "../data/enemies";
import { CH, CW, GX, GY, W, cellY } from "./geometry";
import { bridgeOpen } from "./expansion";
import type { GardenEngine } from "./engine";

/** Casas especiais do tabuleiro — desenhadas ABAIXO dos personagens. */
export function drawTerrain(e: GardenEngine, c: Ctx) {
  for (const cell of e.board.cells) {
    const x = GX + cell.col * CW;
    const y = GY + cell.row * CH;
    const cx = x + CW / 2, cy = y + CH / 2;
    const info = TERRAIN_INFO[cell.kind];
    switch (cell.kind) {
      case "water": {
        c.fillStyle = "rgba(35,120,190,.45)";
        c.fillRect(x + 2, y + 2, CW - 4, CH - 4);
        c.strokeStyle = "rgba(180,240,255,.28)";
        c.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const yy = y + 18 + i * 26;
          c.beginPath();
          c.moveTo(x + 8, yy + Math.sin(e.time * 2 + i) * 2);
          c.quadraticCurveTo(cx, yy - 5, x + CW - 8, yy + Math.sin(e.time * 2 + i + 1) * 2);
          c.stroke();
        }
        break;
      }
      case "lava": {
        c.fillStyle = "rgba(150,40,10,.55)";
        c.fillRect(x + 2, y + 2, CW - 4, CH - 4);
        glow(c, cx, cy, 52, "#ff6a2a", 0.45);
        c.fillStyle = `rgba(255,150,40,${0.25 + 0.15 * Math.sin(e.time * 3 + cell.col)})`;
        c.beginPath();
        c.ellipse(cx, cy, 30, 18, 0, 0, TAU);
        c.fill();
        break;
      }
      case "ice": {
        c.fillStyle = "rgba(160,220,255,.18)";
        c.fillRect(x + 2, y + 2, CW - 4, CH - 4);
        c.strokeStyle = "rgba(230,250,255,.7)";
        c.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const bx = x + 18 + i * 24, by = y + 24 + (i % 2) * 30;
          c.beginPath();
          c.moveTo(bx - 8, by); c.lineTo(bx + 8, by);
          c.moveTo(bx, by - 8); c.lineTo(bx, by + 8);
          c.stroke();
        }
        break;
      }
      case "shadow": {
        c.fillStyle = "rgba(20,10,40,.5)";
        c.fillRect(x + 2, y + 2, CW - 4, CH - 4);
        glow(c, cx, cy, 40, "#8a6ab0", 0.3);
        break;
      }
      case "growth": {
        const grown = e.growthActive;
        const h = grown ? 1 : 0.25;
        c.fillStyle = "rgba(20,60,25,.3)";
        c.fillRect(x + 2, y + 2, CW - 4, CH - 4);
        for (let i = -1; i <= 1; i++) {
          c.strokeStyle = grown ? "#5fdc6b" : "rgba(120,190,110,.5)";
          c.lineWidth = grown ? 5 : 3;
          c.beginPath();
          c.moveTo(cx + i * 14, y + CH - 6);
          c.quadraticCurveTo(cx + i * 18, cy, cx + i * 8, cy - 26 * h);
          c.stroke();
        }
        if (grown) glow(c, cx, cy - 10, 40, "#7be05a", 0.35);
        break;
      }
      case "bridge": {
        const open = bridgeOpen(e);
        c.fillStyle = open ? "rgba(160,120,70,.42)" : "rgba(20,40,60,.7)";
        c.fillRect(x + 3, y + 26, CW - 6, CH - 52);
        for (let i = 0; i < 5; i++) {
          c.strokeStyle = open ? "#c9a26a" : "rgba(120,160,200,.4)";
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(x + 8 + i * 18, y + 26);
          c.lineTo(x + 8 + i * 18, y + CH - 26);
          c.stroke();
        }
        if (!open) glow(c, cx, cy, 44, "#7fe6ff", 0.25);
        break;
      }
      case "rock": {
        c.fillStyle = "rgba(0,0,0,.35)";
        c.beginPath(); c.ellipse(cx, cy + 22, 30, 8, 0, 0, TAU); c.fill();
        ball(c, cx - 10, cy + 6, 20, 17, "#6b6f7a");
        ball(c, cx + 12, cy - 2, 18, 22, "#7b808c");
        ball(c, cx, cy - 14, 12, 9, "#8d93a0");
        break;
      }
      case "portal": {
        glow(c, cx, cy, 46 + Math.sin(e.time * 3 + cell.col) * 6, "#c07bff", 0.55);
        c.strokeStyle = rgba("#e8c8ff", 0.9);
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(cx, cy, 22, 32, e.time * 0.6, 0, TAU);
        c.stroke();
        c.strokeStyle = "rgba(255,255,255,.55)";
        c.lineWidth = 1.5;
        c.beginPath();
        c.ellipse(cx, cy, 12, 22, -e.time * 0.9, 0, TAU);
        c.stroke();
        break;
      }
      case "trail": {
        c.fillStyle = "rgba(190,150,90,.22)";
        c.fillRect(x + 2, y + 8, CW - 4, CH - 16);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = "rgba(255,220,160,.18)";
          c.beginPath();
          c.ellipse(x + 12 + hash(i + cell.col) * 60, y + 14 + hash(i + cell.row) * 64, 4, 2, 0, 0, TAU);
          c.fill();
        }
        break;
      }
      case "crystal": {
        c.fillStyle = "rgba(60,180,220,.18)";
        c.fillRect(x + 2, y + 2, CW - 4, CH - 4);
        glow(c, cx, cy, 34, "#7fd8ff", 0.35);
        c.fillStyle = "#bfeaff";
        for (const [dx, dy, h2] of [[-12, 10, 18], [8, 4, 24], [18, 16, 14]]) {
          c.beginPath();
          c.moveTo(cx + dx - 4, cy + dy);
          c.lineTo(cx + dx, cy + dy - h2);
          c.lineTo(cx + dx + 4, cy + dy);
          c.fill();
        }
        break;
      }
    }
    if (cell.kind !== "trail" && cell.kind !== "crystal") {
      c.strokeStyle = rgba(info.color, 0.35);
      c.lineWidth = 1;
      c.strokeRect(x + 2, y + 2, CW - 4, CH - 4);
    }
  }
}

/** Ligações de sinergia entre plantas (efeito visível e discreto). */
export function drawComboLinks(e: GardenEngine, c: Ctx) {
  for (const l of e.comboLinks) {
    const rule = COMBOS[l[4]];
    if (!rule) continue;
    const pulse = 0.4 + 0.3 * Math.sin(e.time * 4 + l[0]);
    c.strokeStyle = rgba(rule.color, pulse);
    c.lineWidth = 3;
    c.setLineDash([6, 8]);
    c.beginPath();
    c.moveTo(l[0], l[1] + 18);
    c.lineTo(l[2], l[3] + 18);
    c.stroke();
    c.setLineDash([]);
    glow(c, (l[0] + l[2]) / 2, (l[1] + l[3]) / 2 + 18, 16, rule.color, 0.25);
  }
}

/** Avisos, eventos ativos, status e aura dos chefes — desenhado ACIMA do campo. */
export function drawExpansionOverlay(e: GardenEngine, c: Ctx) {
  // telegrafo justo: 3 s de aviso com a casa marcada
  if (e.warnEvent) {
    const w = e.warnEvent;
    const x = GX + w.col * CW, y = GY + w.row * CH;
    const pulse = 0.35 + 0.35 * Math.sin(e.time * 12);
    c.strokeStyle = rgba(EVENT_INFO[w.kind].color, 0.9);
    c.lineWidth = 4;
    c.setLineDash([10, 8]);
    c.strokeRect(x + 4, y + 4, CW - 8, CH - 8);
    c.setLineDash([]);
    c.fillStyle = rgba(EVENT_INFO[w.kind].color, pulse * 0.25);
    c.fillRect(x + 4, y + 4, CW - 8, CH - 8);
    glow(c, x + CW / 2, y + CH / 2, 50, EVENT_INFO[w.kind].color, pulse);
  }
  for (const a of e.activeEvents) {
    const info = EVENT_INFO[a.kind];
    if (a.kind === "rain") {
      c.strokeStyle = "rgba(160,220,255,.4)";
      c.lineWidth = 1.2;
      for (let i = 0; i < 40; i++) {
        const x = ((hash(i) * W + e.time * 90) % (W + 60)) - 30;
        const y = ((hash(i + 9) * 500 + e.time * 500) % 560) - 20;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 12); c.stroke();
      }
    } else if (a.kind === "sandstorm") {
      c.fillStyle = rgba(info.color, 0.12);
      c.fillRect(0, 0, W, 600);
      for (let i = 0; i < 26; i++) {
        const x = ((hash(i) * W + e.time * 260) % (W + 200)) - 100;
        const y = GY + ((hash(i + 3) * 480 + e.time * 60) % 480);
        c.fillStyle = rgba(info.color, 0.2);
        c.fillRect(x, y, 40 + hash(i) * 60, 2);
      }
    } else if (a.kind === "night" || a.kind === "fog") {
      c.fillStyle = a.kind === "night" ? "rgba(2,4,18,.4)" : "rgba(190,210,225,.22)";
      c.fillRect(0, 0, W, 600);
    } else if (a.kind === "heat") {
      c.fillStyle = "rgba(255,90,30,.09)";
      c.fillRect(0, 0, W, 600);
    } else if (a.kind === "eclipse" || a.kind === "portalSurge" || a.kind === "inversion") {
      glow(c, W / 2, 40, 320, info.color, 0.12);
    }
  }
  // status dos inimigos
  for (const z of e.enemies) {
    const x = e.mirror ? z.rx : z.x;
    const y = cellY(z.row) + 32;
    if (z.burnT > e.time) { glow(c, x, y - 50, 26, "#ff7a3a", 0.5); c.fillStyle = "#ffd45a"; c.fillRect(x - 3, y - 74, 6, 3); }
    if (z.poisonT > e.time) { glow(c, x, y - 50, 22, "#a3ff5a", 0.45); c.fillStyle = "#a3ff5a"; c.fillRect(x - 3, y - 78, 6, 3); }
    if (z.charmedT > e.time) { c.strokeStyle = "#ff8fb1"; c.lineWidth = 2; c.beginPath(); c.arc(x - 4, y - 96, 8, 0, TAU); c.stroke(); }
    if (z.shieldT > e.time) { c.strokeStyle = "rgba(255,212,90,.65)"; c.lineWidth = 2; c.beginPath(); c.ellipse(x - 4, y - 46, 26, 46, 0, 0, TAU); c.stroke(); }
    const spec = ENEMY_BY_ID[z.type]?.boss;
    if (spec) {
      const col = z.enrage ? "#ff3a5a" : spec.aura;
      glow(c, x, y - 60, 100, col, 0.32);
      c.strokeStyle = rgba(col, 0.75);
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y - 60, 60 + Math.sin(e.time * 3) * 4, 0, TAU);
      c.stroke();
      // etapas do chefe
      for (let i = 0; i <= spec.thresholds.length; i++) {
        c.fillStyle = i <= z.phase ? col : "rgba(255,255,255,.18)";
        c.beginPath();
        c.arc(x - 30 + i * 20, y - 132, 5, 0, TAU);
        c.fill();
      }
    }
  }
  // rastro dos novos projéteis
  for (const p of e.projs) {
    if (!p.mode) continue;
    const col = p.mode === "fire" ? "#ff8a2a" : p.mode === "poison" || p.mode === "spore" ? "#a3ff5a" : p.mode === "freeze" || p.mode === "shards" ? "#9fe6ff" : p.mode === "triple" ? "#9be37a" : p.mode === "meteor" ? "#ff6a2a" : "#ffe27a";
    c.fillStyle = rgba(col, 0.25);
    c.beginPath();
    c.ellipse(p.x - Math.sign(p.vx || 1) * 12, p.y, 18, 4, 0, 0, TAU);
    c.fill();
    glow(c, p.x, p.y, 12, col, 0.5);
  }
  // selo do tabuleiro / mundo
  c.save();
  c.font = "900 12px system-ui, sans-serif";
  c.textAlign = "right";
  c.fillStyle = "rgba(255,255,255,.35)";
  c.fillText(e.board.name.toUpperCase() + " · TABULEIRO " + e.board.id, W - 18, GY + 5 * CH - 10);
  c.restore();
  if (e.eventIdx < e.levelEvents.length) {
    const next = e.levelEvents[e.eventIdx];
    const left = Math.max(0, next.t - e.time);
    if (left > 0 && left <= EVENT_WARN) {
      c.save();
      c.font = "900 14px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillStyle = EVENT_INFO[next.kind].color;
      c.fillText(`${EVENT_INFO[next.kind].warn} · ${Math.ceil(left)}s`, W / 2, GY + 22);
      c.restore();
    }
  }
}
