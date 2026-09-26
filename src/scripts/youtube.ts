// Reproductor de YouTube (IFrame API) visible, con fundidos de volumen entre vídeos.

interface YTPlayer {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; CUED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const FADE_MS = 900;

let api: Promise<YTNamespace> | undefined;
function loadApi() {
  api ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return api;
}

export class YouTubeDeck {
  private player?: Promise<YTPlayer>;
  private current?: { id: string; start: number };
  private vol = 0;
  private fadeTimer?: number;
  /** Se llama si un vídeo no se puede reproducir (borrado, privado o sin permiso para incrustar) */
  onError?: (videoId: string) => void;
  /** Se llama cuando el vídeo empieza o deja de sonar (para los botones propios de play/pausa) */
  onPlaying?: (playing: boolean) => void;

  constructor(private mount: HTMLElement) {}

  private get() {
    this.player ??= loadApi().then(
      (YT) =>
        new Promise<YTPlayer>((resolve) => {
          const p: YTPlayer = new YT.Player(this.mount, {
            host: 'https://www.youtube-nocookie.com',
            width: '100%',
            height: '100%',
            // Sin la barra de YouTube: se controla con botones propios (el reproductor sigue visible, ≥ 200×200 px)
            playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, disablekb: 1, iv_load_policy: 3 },
            events: {
              onReady: () => resolve(p),
              onStateChange: (e: { data: number }) => {
                if (e.data === YT.PlayerState.PLAYING) {
                  this.fadeTo(p, 100);
                  this.onPlaying?.(true);
                } else if ([YT.PlayerState.PAUSED, YT.PlayerState.ENDED, YT.PlayerState.CUED].includes(e.data)) this.onPlaying?.(false);
                // Bucle: al terminar vuelve al punto de inicio de la sección
                if (e.data === YT.PlayerState.ENDED && this.current) {
                  p.seekTo(this.current.start, true);
                  p.playVideo();
                }
              },
              onError: () => this.current && this.onError?.(this.current.id),
            },
          });
        }),
    );
    return this.player;
  }

  private fadeTo(p: YTPlayer, target: number, ms = FADE_MS, done?: () => void) {
    clearInterval(this.fadeTimer);
    const from = this.vol;
    const t0 = performance.now();
    this.fadeTimer = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      this.vol = from + (target - from) * k;
      p.setVolume(Math.round(this.vol));
      if (k >= 1) {
        clearInterval(this.fadeTimer);
        done?.();
      }
    }, 50);
  }

  /** Funde el vídeo actual a silencio y carga el nuevo (que sube de volumen al empezar a sonar) */
  async play(id: string, start = 0) {
    const p = await this.get();
    if (this.current?.id === id) {
      p.playVideo();
      this.fadeTo(p, 100);
      return;
    }
    this.current = { id, start };
    const load = () => {
      this.vol = 0;
      p.setVolume(0);
      p.loadVideoById({ videoId: id, startSeconds: start });
    };
    if (this.vol > 1) this.fadeTo(p, 0, FADE_MS, load);
    else load();
  }

  /** Funde a silencio y pausa */
  async stop(done?: () => void) {
    if (!this.player) return done?.();
    const p = await this.player;
    this.fadeTo(p, 0, 500, () => {
      p.pauseVideo();
      done?.();
    });
  }

  async pause() {
    if (this.player) (await this.player).pauseVideo();
  }

  async resume() {
    if (this.player && this.current) (await this.player).playVideo();
  }
}
