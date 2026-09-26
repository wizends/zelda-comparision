import { TRACKS, type Track } from '../data/tracks';
import { YouTubeDeck } from './youtube';

// ==========================================================
// Música sincronizada con el scroll.
// Cada sección con [data-track] tiene su tema; al cruzar el centro de la
// pantalla se hace un fundido cruzado entre temas. Cada tema suena en dos capas:
// "remake" (pads, campanas, reverb) y "N64" (onda cuadrada, arpegios, bajo triangular).
// La posición horizontal del ratón mezcla ambas capas.
// Las secciones con vídeo de YouTube usan su reproductor (visible) en lugar del tema generado.
// ==========================================================

const FADE = 1.8; // segundos de fundido entre temas
const LOOKAHEAD = 0.12; // segundos que se programan por adelantado
const STORAGE_KEY = 'oot-music';

type Inst = 'pad' | 'lead' | 'bass' | 'arp' | 'hat';
/** `at`: retraso dentro de la semicorchea, en fracción de paso (0 = en el paso) */
interface NoteEvent { inst: Inst; notes: number[]; dur: number; at?: number }

interface Voice {
  track: Track;
  events: NoteEvent[][]; // índice = paso (semicorchea) dentro del bucle
  steps: number;
  gR: GainNode;
  gN: GainNode;
  live: boolean;
  next: number;
  index: number;
  stopTimer?: number;
}

const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// ---------- Composición: genera el bucle de cada tema ----------
function compose(t: Track): NoteEvent[][] {
  const rand = rng(t.seed);
  const bars = t.chords.length;
  const steps = bars * 16;
  const events: NoteEvent[][] = Array.from({ length: steps }, () => []);

  // Notas disponibles para la melodía (dos octavas de la escala)
  const pool = [...t.scale.map((s) => t.root + s), ...t.scale.map((s) => t.root + 12 + s)];
  let idx = Math.floor(pool.length / 3);

  t.chords.forEach((chord, b) => {
    const base = b * 16;
    const last = b === bars - 1;
    events[base].push({ inst: 'pad', notes: chord, dur: 16 });
    t.bass.forEach((s) => events[base + s].push({ inst: 'bass', notes: [chord[0] - 12], dur: 2 }));

    // Arpegio chiptune con las notas del acorde una octava arriba
    for (let s = 0, k = 0; s < 16; s += t.arpEvery, k++) {
      events[base + s].push({ inst: 'arp', notes: [chord[k % chord.length] + 12], dur: t.arpEvery });
    }
    if (t.hats) for (let s = 2; s < 16; s += 4) events[base + s].push({ inst: 'hat', notes: [0], dur: 1 });

    // Melodía transcrita de la canción original, nota a nota, si la pista la tiene
    if (t.melody) {
      // El paso puede tener decimales (fusas, tresillos): la nota se retrasa dentro de su semicorchea
      for (const [s, dur, note] of t.melody[b % t.melody.length] ?? []) {
        events[base + Math.floor(s)].push({ inst: 'lead', notes: [note], dur, at: s % 1 });
      }
      return;
    }

    // Si no: paseo aleatorio por la escala, cae en notas del acorde en los tiempos fuertes
    const rhythm = t.rhythms[b % t.rhythms.length];
    rhythm.forEach(([s, dur], i) => {
      idx = Math.max(0, Math.min(pool.length - 1, idx + Math.round((rand() - 0.5) * 4)));
      let note = pool[idx];
      if (s % 8 === 0) {
        const tones = chord.flatMap((c) => [c + 12, c + 24]);
        note = tones.reduce((a, c) => (Math.abs(c - note) < Math.abs(a - note) ? c : a));
        idx = pool.indexOf(note) >= 0 ? pool.indexOf(note) : idx;
      }
      // El último compás resuelve en la tónica
      if (last && i === rhythm.length - 1) note = t.root + 12;
      events[base + s].push({ inst: 'lead', notes: [note], dur });
    });
  });
  return events;
}

// ---------- Motor de audio ----------
class MusicEngine {
  ctx!: AudioContext;
  master!: GainNode;
  busR!: GainNode;
  busN!: GainNode;
  fx!: GainNode;
  noise!: AudioBuffer;
  pulse!: PeriodicWave;
  voices = new Map<string, Voice>();
  current: string | null = 'title';
  timer?: number;
  started = false;

  start() {
    if (this.started) return this.ctx.resume();
    this.started = true;
    const ctx = (this.ctx = new AudioContext());

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
    this.master.connect(comp);

    // Capa remake: seca + reverb
    this.busR = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.busR.connect(this.master);
    this.busR.connect(reverb).connect(wet).connect(this.master);

    // Capa N64: seca, algo más brillante
    this.busN = ctx.createGain();
    this.busN.connect(this.master);

    // Efectos (arpegio del final): con reverb y sin depender de la mezcla remake/N64
    this.fx = ctx.createGain();
    this.fx.connect(this.master);
    this.fx.connect(reverb);

    this.noise = this.whiteNoise();
    this.pulse = this.pulseWave(0.25);
    this.setBalance(0.5);

    for (const t of TRACKS) {
      const gR = ctx.createGain();
      const gN = ctx.createGain();
      gR.gain.value = gN.gain.value = 0;
      gR.connect(this.busR);
      gN.connect(this.busN);
      const events = compose(t);
      this.voices.set(t.id, { track: t, events, steps: events.length, gR, gN, live: false, next: 0, index: 0 });
    }
    this.play(this.current);
    this.timer = window.setInterval(() => this.tick(), 25);
    return Promise.resolve();
  }

  stop() {
    if (!this.started) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    window.setTimeout(() => this.ctx.suspend(), 600);
  }

  resume() {
    this.ctx.resume();
    this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.4);
  }

  /** 0 = solo remake, 1 = solo N64 (potencia constante) */
  setBalance(x: number) {
    if (!this.started) return;
    const now = this.ctx.currentTime;
    this.busR.gain.setTargetAtTime(Math.cos((x * Math.PI) / 2), now, 0.25);
    this.busN.gain.setTargetAtTime(Math.sin((x * Math.PI) / 2) * 0.8, now, 0.25);
  }

  /** Fundido cruzado hacia el tema indicado; con null se funde a silencio */
  play(id: string | null) {
    this.current = id;
    if (!this.started) return;
    const now = this.ctx.currentTime;
    for (const [vid, v] of this.voices) {
      const target = vid === id ? 1 : 0;
      for (const g of [v.gR, v.gN]) {
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(target, now + FADE);
      }
      if (target) {
        clearTimeout(v.stopTimer);
        if (!v.live) {
          v.live = true;
          v.next = now + 0.05;
          v.index = 0;
        }
      } else if (v.live) {
        clearTimeout(v.stopTimer);
        v.stopTimer = window.setTimeout(() => {
          if (this.current !== vid) v.live = false;
          v.stopTimer = undefined;
        }, FADE * 1000 + 200);
      }
    }
  }

  private tick() {
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    for (const v of this.voices.values()) {
      if (!v.live) continue;
      const stepDur = 60 / v.track.bpm / 4;
      while (v.next < horizon) {
        for (const e of v.events[v.index]) this.note(v, e, v.next + (e.at ?? 0) * stepDur, stepDur);
        v.next += stepDur;
        v.index = (v.index + 1) % v.steps;
      }
    }
  }

  /**
   * Arpegio original que acompaña a la Trifuerza en la cabecera (no es el sonido del juego):
   * subida al aparecer y una nota al desaparecer. Coincide con la animación CSS (.topbar.finale).
   */
  chime() {
    if (!this.started) return;
    const t0 = this.ctx.currentTime;
    [74, 78, 81, 86].forEach((n, i) => this.bell(this.fx, hz(n), t0 + 0.1 + i * 0.08, 0.5)); // Re mayor, subiendo
    this.bell(this.fx, hz(98), t0 + 1.45, 0.6);
  }

  // ---------- Instrumentos ----------
  private note(v: Voice, e: NoteEvent, t: number, stepDur: number) {
    const d = e.dur * stepDur;
    switch (e.inst) {
      case 'pad':
        e.notes.forEach((n) => this.pad(v.gR, hz(n + 12), t, d));
        break;
      case 'lead':
        this.bell(v.gR, hz(e.notes[0]), t, d);
        this.square(v.gN, hz(e.notes[0]), t, d * 0.85, 0.05, 'square');
        break;
      case 'bass':
        this.tone(v.gR, hz(e.notes[0]), t, d, 0.16, 'sine', 0.02, 0.4);
        this.square(v.gN, hz(e.notes[0]), t, d * 0.9, 0.18, 'triangle');
        break;
      case 'arp':
        this.square(v.gN, hz(e.notes[0]), t, Math.min(d, 0.09), 0.022, 'pulse');
        break;
      case 'hat':
        this.hat(v.gN, t);
        break;
    }
  }

  private env(g: GainNode, t: number, level: number, attack: number, hold: number, release: number) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, t + Math.max(attack, hold));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, hold) + release);
    return t + Math.max(attack, hold) + release + 0.05;
  }

  private tone(dest: AudioNode, f: number, t: number, d: number, level: number, type: OscillatorType, attack: number, release: number) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(this.env(g, t, level, attack, d, release));
  }

  /** Pad cálido: dos sierras desafinadas con filtro paso bajo */
  private pad(dest: AudioNode, f: number, t: number, d: number) {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = this.ctx.createGain();
    lp.connect(g).connect(dest);
    const end = this.env(g, t, 0.035, 0.8, d, 1.4);
    for (const cents of [-7, 7]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(end);
    }
  }

  /** Campana/flauta: seno + armónico triangular suave */
  private bell(dest: AudioNode, f: number, t: number, d: number) {
    this.tone(dest, f, t, d * 0.6, 0.11, 'sine', 0.03, 0.9);
    this.tone(dest, f * 2, t, d * 0.3, 0.025, 'triangle', 0.01, 0.6);
  }

  /** Voces chiptune: cuadrada, pulso 25 % o triangular, con envolvente seca */
  private square(dest: AudioNode, f: number, t: number, d: number, level: number, kind: 'square' | 'pulse' | 'triangle') {
    const o = this.ctx.createOscillator();
    if (kind === 'pulse') o.setPeriodicWave(this.pulse);
    else o.type = kind;
    o.frequency.value = f;
    const g = this.ctx.createGain();
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(this.env(g, t, level, 0.004, d, 0.03));
  }

  private hat(dest: AudioNode, t: number) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    s.connect(hp).connect(g).connect(dest);
    s.start(t);
    s.stop(this.env(g, t, 0.035, 0.001, 0.01, 0.04));
  }

  // ---------- Utilidades ----------
  private whiteNoise() {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return b;
  }

  private impulse(seconds: number) {
    const rate = this.ctx.sampleRate;
    const len = rate * seconds;
    const b = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const data = b.getChannelData(c);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    return b;
  }

  private pulseWave(duty: number) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return this.ctx.createPeriodicWave(real, imag);
  }
}

// ---------- Integración con la página ----------
const SWITCH_DELAY = 700; // ms: espera antes de cambiar de canción, para no recargar el reproductor al hacer scroll rápido

export function initMusic() {
  const root = document.querySelector<HTMLElement>('.music');
  const btn = root?.querySelector<HTMLButtonElement>('.music-btn');
  const now = root?.querySelector<HTMLElement>('.music-now');
  const ost = document.querySelector<HTMLElement>('.ost');
  const mount = ost?.querySelector<HTMLElement>('.ost-player');
  const song = ost?.querySelector<HTMLElement>('.ost-song');
  const playBtn = ost?.querySelector<HTMLButtonElement>('.ost-play');
  const minBtn = ost?.querySelector<HTMLButtonElement>('.ost-min');
  if (!root || !btn || !now || !ost || !mount || !song || !playBtn || !minBtn) return;

  const engine = new MusicEngine();
  const yt = new YouTubeDeck(mount);
  const byId = new Map(TRACKS.map((t) => [t.id, t]));
  const failed = new Set<string>(); // vídeos que YouTube no pudo reproducir
  // Vídeo de cada sección, resuelto al compilar (enlace fijado a mano o búsqueda en la YouTube Data API)
  let videos: Record<string, string> = {};
  try { videos = JSON.parse(root.dataset.videos ?? '{}'); } catch { /* sin vídeos */ }
  let on = false;
  let section = 'title';
  let switchTimer: number | undefined;

  /** Vídeo de YouTube de una sección, si tiene uno válido */
  const videoOf = (t?: Track) => {
    const id = t ? videos[t.id] : undefined;
    return id && !failed.has(id) ? id : null;
  };

  const label = () => {
    const t = byId.get(section);
    now.textContent = on && t ? `♪ ${videoOf(t) ? t.youtube.song : t.name}` : '';
  };

  /** Aplica la música de la sección actual: canción original (YouTube) o tema generado */
  const apply = () => {
    const t = byId.get(section);
    if (!on || !t) return;
    const video = videoOf(t);
    if (video) {
      engine.play(null);
      ost.hidden = false;
      song.textContent = t.youtube.song;
      // Minimizado no puede sonar (el vídeo debe verse): la canción se carga al desplegarlo
      if (!ost.classList.contains('collapsed')) yt.play(video, t.youtube.start ?? 0);
    } else {
      yt.stop(() => { if (!videoOf(byId.get(section))) ost.hidden = true; });
      engine.play(t.id);
    }
    label();
  };

  // Vídeo borrado, privado o sin permiso para incrustar: esa sección pasa al tema generado
  yt.onError = (id) => {
    failed.add(id);
    apply();
  };

  // Botones propios del reproductor compacto
  let ytPlaying = false;
  let resumeOnShow = false;
  yt.onPlaying = (playing) => {
    ytPlaying = playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  };
  const setCollapsed = (collapsed: boolean) => {
    ost.classList.toggle('collapsed', collapsed);
    minBtn.textContent = collapsed ? '▴' : '▾';
    minBtn.setAttribute('aria-expanded', String(!collapsed));
    minBtn.setAttribute('aria-label', collapsed ? 'Mostrar y reproducir' : 'Minimizar y pausar');
  };
  playBtn.addEventListener('click', () => {
    if (playBtn.getAttribute('aria-label') === 'Pausar') return yt.pause();
    setCollapsed(false);
    apply();
    yt.resume();
  });
  minBtn.addEventListener('click', () => {
    const collapse = !ost.classList.contains('collapsed');
    setCollapsed(collapse);
    if (collapse) yt.pause();
    else { apply(); yt.resume(); }
  });

  const setOn = async (value: boolean) => {
    on = value;
    btn.setAttribute('aria-pressed', String(on));
    root.classList.toggle('playing', on);
    try { localStorage.setItem(STORAGE_KEY, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
    if (on) {
      const t = byId.get(section);
      engine.current = t && !videoOf(t) ? t.id : null;
      if (engine.started) engine.resume();
      else await engine.start();
      apply();
    } else {
      clearTimeout(switchTimer);
      engine.stop();
      yt.stop(() => { if (!on) ost.hidden = true; });
      label();
    }
  };

  btn.addEventListener('click', () => setOn(!on));

  // Si el visitante la tenía activada, arranca en su primera interacción (los navegadores bloquean el autoplay)
  let wanted = false;
  try { wanted = localStorage.getItem(STORAGE_KEY) === '1'; } catch { /* sin almacenamiento */ }
  if (wanted) {
    const first = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!on && !target.closest('.music-btn, .ost')) setOn(true);
    };
    window.addEventListener('pointerdown', first, { once: true });
    window.addEventListener('keydown', first, { once: true });
  }

  // Cambio de tema: manda la sección que contiene el centro de la pantalla
  const sections = [...document.querySelectorAll<HTMLElement>('[data-track]')];
  const sync = () => {
    const mid = window.innerHeight / 2;
    const hit = sections.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    });
    const id = hit?.dataset.track;
    if (!id || id === section) return;
    section = id;
    label();
    clearTimeout(switchTimer);
    switchTimer = window.setTimeout(apply, SWITCH_DELAY);
  };
  window.addEventListener('scroll', sync, { passive: true });

  // Arpegio del final de la cabecera (solo si la música está activada)
  window.addEventListener('oot:finale', () => {
    if (on && !document.hidden) engine.chime();
  });
  sync();

  // Mezcla remake/N64 según la posición horizontal del ratón (solo temas generados, solo escritorio)
  const desktop = window.matchMedia('(min-width: 801px) and (pointer: fine)');
  window.addEventListener('pointermove', (e) => {
    if (!on || !desktop.matches) return;
    const x = e.clientX / window.innerWidth;
    engine.setBalance(0.5 + (x - 0.5) * 0.8);
    root.style.setProperty('--mix', x.toFixed(3));
  });

  // Silencio cuando la pestaña no está visible
  document.addEventListener('visibilitychange', () => {
    if (!on) return;
    if (document.hidden) {
      if (engine.started) engine.ctx.suspend();
      resumeOnShow = ytPlaying; // solo se reanuda si estaba sonando (no si se pausó o minimizó a mano)
      if (ytPlaying) yt.pause();
    } else {
      if (engine.started) engine.ctx.resume();
      if (resumeOnShow) yt.resume();
    }
  });
}
