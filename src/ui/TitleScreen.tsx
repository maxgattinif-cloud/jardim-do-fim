import { useEffect, useRef } from "react";
import { drawDefender } from "../art/defenders";
import { drawEnemy } from "../art/enemies";
import { TAU, glow, hash } from "../art/art";
import { GAME_VERSION } from "../data/rules";
import { PLANT_COUNT } from "../data/defenders";
import { ENEMY_COUNT } from "../data/enemies";
import { LEVELS } from "../data/levels";
import { BIOMES } from "../data/levels";
import { sound } from "../game/sound";
import { Btn } from "./common";

export function Logo({ size = 64, text = true }: { size?: number; text?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6df3d6" />
            <stop offset="1" stopColor="#1a9a7c" />
          </linearGradient>
          <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe27a" />
            <stop offset="1" stopColor="#f0a81e" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="#07201d" stroke="url(#lg1)" strokeWidth="3" />
        <path d="M32 50V30" stroke="url(#lg1)" strokeWidth="4" strokeLinecap="round" />
        <path d="M32 33C20 33 14 25 14 16c10 0 18 5 18 17z" fill="url(#lg1)" />
        <path d="M32 29c0-9 6-15 17-15 0 10-6 16-17 15z" fill="url(#lg1)" opacity=".85" />
        <circle cx="32" cy="14" r="5" fill="url(#lg2)" />
        <path d="M18 52c8 4 20 4 28 0" stroke="#ff6b8a" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
      {text && (
        <div className="leading-none">
          <div className="font-display text-3xl sm:text-4xl">
            Jardim <span className="text-[#2ee6c5]">do Fim</span>
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">Guardiões contra o Murchar</div>
        </div>
      )}
    </div>
  );
}

export function TitleScreen({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const c = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      const t = ms / 1000;
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#050b1a");
      g.addColorStop(0.55, "#10304a");
      g.addColorStop(1, "#0b2a2a");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        c.fillStyle = `rgba(255,255,255,${0.15 + 0.5 * Math.abs(Math.sin(t * 0.8 + i))})`;
        c.fillRect(hash(i) * w, hash(i + 5) * h * 0.55, 1.6, 1.6);
      }
      glow(c, w * 0.9, h * 0.1, h * 0.3, "#cfe0ff", 0.35);
      c.fillStyle = "#eef3ff";
      c.beginPath();
      c.arc(w * 0.9, h * 0.1, h * 0.045, 0, TAU);
      c.fill();
      const gy = h * 0.8;
      for (let L = 0; L < 3; L++) {
        c.fillStyle = ["#0b1d2c", "#0a1a24", "#08151c"][L];
        c.strokeStyle = c.fillStyle;
        c.lineWidth = 5 - L;
        for (let i = 0; i < 9; i++) {
          const x = ((i * w) / 8 + t * (4 + L * 5)) % (w + 120) - 60;
          const th = h * (0.14 + 0.05 * L + hash(i + L) * 0.08);
          c.beginPath();
          c.moveTo(x, gy - L * 14);
          c.lineTo(x, gy - th);
          c.moveTo(x, gy - th * 0.6);
          c.lineTo(x - 18, gy - th * 0.9);
          c.moveTo(x, gy - th * 0.7);
          c.lineTo(x + 16, gy - th);
          c.stroke();
        }
      }
      const gr = c.createLinearGradient(0, gy - 20, 0, h);
      gr.addColorStop(0, "#1d5a48");
      gr.addColorStop(1, "#0a2a22");
      c.fillStyle = gr;
      c.fillRect(0, gy - 10, w, h - gy + 10);
      const s = Math.max(0.7, h / 520);
      const defs = ["luminia", "espinheiro", "tronco", "gelidea", "magma"] as const;
      defs.forEach((d, i) => {
        c.save();
        c.translate(w * (0.06 + i * 0.075) + 20, gy + 8 + (i % 2) * 8);
        c.scale(s * 1.15, s * 1.15);
        drawDefender(c, d, t + i, { hpFrac: 1, charge: 0.5 + 0.5 * Math.sin(t * 2 + i), busy: false, flash: 0, lv: 1 });
        c.restore();
      });
      const foes = ["cinzento", "escudeiro", "colosso", "mariposa", "estilhaco"] as const;
      foes.forEach((f, i) => {
        const span = w * 0.55;
        const x = w * 0.98 - ((t * (14 + i * 4) + i * 190) % span);
        c.save();
        c.translate(x, gy + 14 + (i % 3) * 6);
        const sc = s * (f === "colosso" ? 1.05 : 0.95);
        c.scale(sc, sc);
        drawEnemy(c, f, { t: t + i, walk: t * 3 + i, armor: 1, slow: false, stun: false, hurt: 0, attack: false, jump: 0, burrow: false, enrage: false }, 1);
        c.restore();
      });
      for (let i = 0; i < 28; i++) {
        const x = (hash(i) * w + Math.sin(t * 0.5 + i) * 30) % w;
        const y = h - ((hash(i + 7) * h + t * (12 + hash(i) * 14)) % h);
        glow(c, x, y, 7, "#8cffe0", 0.55);
      }
      const v = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,.55)");
      c.fillStyle = v;
      c.fillRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(loop);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") start();
    };
    const start = () => {
      sound.resume();
      sound.startMusic();
      onStart();
    };
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", key);
    };
  }, [onStart]);

  return (
    <div className="absolute inset-0">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <div className="safe-pad absolute inset-0 flex flex-col items-center justify-center pb-[6vh] text-center">
        <div className="anim-rise anim-float">
          <svg viewBox="0 0 64 64" style={{ height: "clamp(44px,12vh,96px)", width: "clamp(44px,12vh,96px)" }} className="mx-auto drop-shadow-[0_0_24px_rgba(46,230,197,.7)]">
            <circle cx="32" cy="32" r="29" fill="#07201d" stroke="#2ee6c5" strokeWidth="3" />
            <path d="M32 50V30" stroke="#6df3d6" strokeWidth="4" strokeLinecap="round" />
            <path d="M32 33C20 33 14 25 14 16c10 0 18 5 18 17z" fill="#2ee6c5" />
            <path d="M32 29c0-9 6-15 17-15 0 10-6 16-17 15z" fill="#6df3d6" opacity=".85" />
            <circle cx="32" cy="14" r="5" fill="#ffcf4a" />
          </svg>
        </div>
        <h1 className="font-display anim-rise mt-2 leading-[.9] drop-shadow-[0_6px_0_rgba(0,0,0,.45)]" style={{ animationDelay: "80ms", fontSize: "clamp(2.6rem, min(13vw, 17vh), 6.5rem)" }}>
          Jardim <span className="text-[#2ee6c5]">do Fim</span>
        </h1>
        <p className="anim-rise mt-3 text-xs font-bold uppercase tracking-[0.35em] text-white/70 sm:text-sm" style={{ animationDelay: "160ms" }}>
          {LEVELS.length} fases · {BIOMES.length} mundos · {PLANT_COUNT} defensores · {ENEMY_COUNT} inimigos
        </p>
        <div className="anim-rise mt-[3vh]" style={{ animationDelay: "260ms" }}>
          <Btn big onClick={() => { sound.startMusic(); onStart(); }}>
            ▶ Jogar
          </Btn>
        </div>
        <p className="mb-3 mt-3 rounded-full bg-[#2ee6c5]/15 px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ff5e4] ring-1 ring-[#2ee6c5]/40">Edição 3.0 · expansão instalada</p>
        <p className="mt-1 text-[11px] text-white/45">Toque, clique ou pressione Enter</p>
      </div>
      <div className="safe-pad pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-white/40">
        <span>v{GAME_VERSION}</span>
        <span>Sem anúncios · sem coleta de dados</span>
      </div>
    </div>
  );
}
