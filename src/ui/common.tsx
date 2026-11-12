import { useEffect, useRef, type ReactNode } from "react";
import { drawDefender } from "../art/defenders";
import { drawEnemy } from "../art/enemies";
import { DEF_BY_ID, type DefId } from "../data/defenders";
import { ENEMY_BY_ID, type EnemyId } from "../data/enemies";
import { sound } from "../game/sound";

export function Btn({ children, onClick, kind = "primary", disabled, className = "", title, big }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "gold"; disabled?: boolean; className?: string; title?: string; big?: boolean }) {
  const styles = {
    primary: "bg-gradient-to-b from-[#3df0cf] to-[#1db89c] text-[#04211c] shadow-[0_6px_18px_rgba(46,230,197,.3)] hover:brightness-110",
    gold: "bg-gradient-to-b from-[#ffe27a] to-[#f0a81e] text-[#3a2400] shadow-[0_6px_18px_rgba(255,207,74,.3)] hover:brightness-110",
    danger: "bg-gradient-to-b from-[#ff6b7a] to-[#d63048] text-white shadow-[0_6px_18px_rgba(255,77,94,.3)] hover:brightness-110",
    ghost: "bg-white/8 text-white ring-1 ring-white/15 hover:bg-white/14",
  }[kind];
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={() => {
        sound.resume();
        sound.play("click");
        onClick?.();
      }}
      className={`rounded-xl font-extrabold transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 ${big ? "px-8 py-3.5 text-lg" : "px-4 py-2.5 text-sm"} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Chip({ children, color = "#9fb3a8", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${className}`} style={{ background: color + "26", color, boxShadow: `inset 0 0 0 1px ${color}55` }}>
      {children}
    </span>
  );
}

export function Screen({ title, subtitle, onBack, right, children, wide }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="bg-world absolute inset-0 flex flex-col">
      <header className="safe-pad flex shrink-0 items-center gap-3 border-b border-white/8 bg-black/25 backdrop-blur">
        {onBack && (
          <button onClick={() => { sound.play("click"); onBack(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-lg ring-1 ring-white/12 hover:bg-white/14" aria-label="Voltar">
            ←
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-2xl leading-none sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-white/55">{subtitle}</p>}
        </div>
        {right}
      </header>
      <main className="scroll-y safe-pad min-h-0 flex-1">
        <div className={`mx-auto pb-10 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>{children}</div>
      </main>
    </div>
  );
}

export function Seeds({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/12 px-3 py-1.5 text-sm font-black text-amber-200 ring-1 ring-amber-300/30">
      <span className="inline-block h-3.5 w-3.5 rounded-full bg-gradient-to-br from-[#fff6c8] to-[#f0a81e] shadow-[0_0_8px_#ffcf4a]" />
      {n}
    </span>
  );
}

export function StatBar({ label, value, max, color = "#2ee6c5", text }: { label: string; value: number; max: number; color?: string; text?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold text-white/60">
        <span>{label}</span>
        <span className="text-white/85">{text ?? value}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

/** Miniatura animada (ou estática) de um defensor ou inimigo. */
export function Sprite({ kind, id, size = 84, animate = true, dark }: { kind: "def" | "enemy"; id: DefId | EnemyId; size?: number; animate?: boolean; dark?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = size;
    const h = kind === "enemy" ? Math.round(size * 1.2) : size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const c = canvas.getContext("2d")!;
    let raf = 0;
    let last = 0;
    const draw = (ms: number) => {
      const t = ms / 1000;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, h);
      c.save();
      if (kind === "def") {
        const k = size / 100;
        c.translate(w / 2, h / 2 + 2 * k);
        c.scale(k, k);
        drawDefender(c, id as DefId, t, { hpFrac: 1, charge: (Math.sin(t * 2) + 1) / 2, busy: id === "vazio", flash: 0, lv: 1 });
      } else {
        const def = ENEMY_BY_ID[id as EnemyId];
        const top = { mariposa: 100, rainha: 190, ceifeira: 140, titan: 150, murchar: 150, colosso: 125, verme: 90 }[id as string] ?? 104;
        const k = ((h - 8) / (top * def.scale)) * 0.96;
        c.translate(w / 2 + 6 * k, h - 6);
        c.scale(k, k);
        drawEnemy(c, id as EnemyId, { t, walk: t * 3.2, armor: 1, slow: false, stun: false, hurt: 0, attack: Math.sin(t * 1.3) > 0.5, jump: 0, burrow: false, enrage: false }, def.scale);
      }
      c.restore();
    };
    if (!animate) {
      draw(900);
      return;
    }
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (ms - last < 40) return;
      last = ms;
      draw(ms);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [kind, id, size, animate]);
  const h = kind === "enemy" ? Math.round(size * 1.2) : size;
  return <canvas ref={ref} style={{ width: size, height: h, filter: dark ? "brightness(0) opacity(.5)" : undefined }} className="block" aria-label={kind === "def" ? DEF_BY_ID[id as DefId]?.name : ENEMY_BY_ID[id as EnemyId]?.name} />;
}
