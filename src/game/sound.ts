// Sons e música gerados por síntese (WebAudio). Nenhum arquivo de áudio de terceiros.
class SoundEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfxBus: GainNode | null = null;
  musicBus: GainNode | null = null;
  vol = { master: 0.8, music: 0.5, sfx: 0.8 };
  muted = false;
  last: Record<string, number> = {};
  pad: OscillatorNode[] = [];

  ensure() {
    if (this.ctx || typeof window === "undefined") return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.apply();
  }
  resume() {
    this.ensure();
    void this.ctx?.resume();
  }
  setVolumes(v: { master: number; music: number; sfx: number }) {
    this.vol = v;
    this.apply();
  }
  apply() {
    if (!this.master || !this.sfxBus || !this.musicBus) return;
    this.master.gain.value = this.muted ? 0 : this.vol.master * 0.5;
    this.sfxBus.gain.value = this.vol.sfx;
    this.musicBus.gain.value = this.vol.music * 0.35;
  }
  setMuted(m: boolean) {
    this.muted = m;
    this.apply();
  }

  tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, slide?: number, delay = 0) {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  noise(dur: number, vol = 0.15, freq = 900) {
    if (!this.ctx || !this.sfxBus) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    f.type = "bandpass";
    f.frequency.value = freq;
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start();
  }

  play(name: string) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - (this.last[name] ?? 0) < (name === "dart" || name === "hit" ? 90 : 50)) return;
    this.last[name] = now;
    switch (name) {
      case "plant":
        this.tone(300, 0.12, "triangle", 0.18, 560);
        break;
      case "sun":
        this.tone(880, 0.09, "sine", 0.16);
        this.tone(1320, 0.12, "sine", 0.13, undefined, 0.07);
        break;
      case "dart":
        this.tone(720, 0.07, "square", 0.05, 320);
        break;
      case "hit":
        this.noise(0.06, 0.06, 1800);
        break;
      case "boom":
        this.noise(0.4, 0.22, 500);
        this.tone(140, 0.4, "sawtooth", 0.16, 45);
        break;
      case "zap":
        this.noise(0.18, 0.12, 2400);
        this.tone(900, 0.2, "sawtooth", 0.1, 160);
        break;
      case "bell":
        this.tone(660, 0.9, "sine", 0.2);
        this.tone(990, 0.7, "sine", 0.1);
        break;
      case "whip":
        this.noise(0.1, 0.14, 3200);
        break;
      case "vortex":
        this.tone(95, 0.3, "sine", 0.08, 60);
        break;
      case "win":
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, "triangle", 0.2, undefined, i * 0.13));
        break;
      case "lose":
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.45, "sawtooth", 0.14, undefined, i * 0.18));
        break;
      case "wave":
        this.tone(110, 0.8, "sawtooth", 0.14, 82);
        break;
      case "boss":
        this.tone(70, 1.1, "sawtooth", 0.2, 38);
        this.noise(0.7, 0.14, 300);
        break;
      case "ping":
        this.tone(1000, 0.08, "sine", 0.15);
        this.tone(1000, 0.08, "sine", 0.15, undefined, 0.12);
        break;
      case "error":
        this.tone(150, 0.12, "square", 0.1, 100);
        break;
      case "dig":
        this.noise(0.12, 0.1, 400);
        break;
      case "finale":
        [261.6, 329.6, 392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => this.tone(f, 0.6, "triangle", 0.2, undefined, i * 0.16));
        this.tone(65.4, 1.8, "sine", 0.2);
        break;
      case "click":
        this.tone(1400, 0.04, "square", 0.05);
        break;
    }
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || !this.musicBus || this.pad.length) return;
    const mk = (f: number, type: OscillatorType, g: number) => {
      const o = this.ctx!.createOscillator();
      const gn = this.ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      gn.gain.value = g;
      const lfo = this.ctx!.createOscillator();
      const lg = this.ctx!.createGain();
      lfo.frequency.value = 0.07 + Math.random() * 0.1;
      lg.gain.value = g * 0.6;
      lfo.connect(lg);
      lg.connect(gn.gain);
      lfo.start();
      o.connect(gn);
      gn.connect(this.musicBus!);
      o.start();
      this.pad.push(o, lfo);
    };
    mk(55, "sine", 0.3);
    mk(82.4, "triangle", 0.18);
    mk(110, "sine", 0.14);
    mk(164.8, "sine", 0.07);
  }
  stopMusic() {
    this.pad.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* já parado */
      }
    });
    this.pad = [];
  }
}

export const sound = new SoundEngine();
