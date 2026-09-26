// Temas musicales originales (generados con Web Audio), uno por sección de la web.
// Cada tema suena a la vez en versión "remake" (orquestal) y "N64" (chiptune).
// Los acordes están en MIDI; la melodía se genera con una semilla, así que siempre suena igual.

export interface Track {
  id: string;
  name: string;
  bpm: number;
  /** Nota MIDI de la tónica para la melodía */
  root: number;
  /** Escala en semitonos respecto a la tónica */
  scale: number[];
  /** Un acorde por compás; el patrón se repite en bucle */
  chords: number[][];
  /** Ritmos de melodía [paso, duración] en semicorcheas; se alternan por compás */
  rhythms: [number, number][][];
  /**
   * Melodía real (opcional, la genera flac-to-track): un array por compás con [paso, duración, nota MIDI].
   * Paso y duración pueden tener decimales para fusas (0.5) y tresillos (0.33, 0.67).
   * Si existe, sustituye a la melodía generada con `rhythms` y `seed`.
   */
  melody?: [number, number, number][][];
  /** Pasos del compás (0-15) en los que suena el bajo */
  bass: number[];
  /** Cada cuántas semicorcheas avanza el arpegio chiptune */
  arpEvery: number;
  hats: boolean;
  seed: number;
  /**
   * Canción original en YouTube. Con `id` vacío, el vídeo se busca con la YouTube Data API al compilar
   * (búsqueda: `query`, o "Zelda Ocarina of Time OST <song>"). Para fijar uno concreto, pega su enlace en `id`.
   * `start`: segundo en que empieza. Si no hay vídeo, suena el tema generado.
   */
  youtube: { id: string; song: string; query?: string; start?: number };
}

/** Extrae el id de un enlace de YouTube (watch?v=, youtu.be/, shorts/, embed/) o devuelve el valor tal cual */
export function youtubeId(value: string) {
  const m = value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : value.trim();
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

// Acordes en MIDI (octava 3)
const G = [43, 47, 50], Gm = [43, 46, 50], Bb = [46, 50, 53], C = [48, 52, 55];
const D = [50, 54, 57], Em = [40, 43, 47], F = [41, 45, 48];
const Bm = [47, 50, 54], Fsm = [42, 45, 49], E = [40, 44, 47];

export const TRACKS: Track[] = [
  {
    id: 'title', youtube: { id: '', song: 'Title Theme' }, name: 'Tema principal', bpm: 76, root: 62, scale: MAJOR,
    chords: [[50, 54, 57], [45, 49, 52], [47, 50, 54], [43, 47, 50], [50, 54, 57], [43, 47, 50], [45, 49, 52], [50, 54, 57]],
    rhythms: [[[0, 6], [6, 2], [8, 4], [12, 4]], [[0, 8], [8, 8]]],
    bass: [0, 8], arpEvery: 2, hats: false, seed: 11
  },
  {
    id: 'bosque', youtube: { id: '', song: 'Kokiri Forest' }, name: 'Bosque Kokiri', bpm: 92, root: 60, scale: MIXOLYDIAN, // Do con Si bemol (para Gm y Bb)
    chords: [G, Gm, Bb, C, Bb, C, Bb, C],
    rhythms: [[[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]], [[0, 3], [3, 3], [6, 2], [8, 8]]],
    bass: [0, 6, 8, 14], arpEvery: 1, hats: true, seed: 23
  },
  {
    id: 'hyrule', youtube: { id: '', song: 'Hyrule Field Main Theme' }, name: 'Campo de Hyrule', bpm: 143, root: 55, scale: MAJOR, // Sol mayor
    chords: [G, C, D, G, Em, C, D, G],
    rhythms: [[[0, 6], [6, 4], [10, 2], [12, 4]]],
    bass: [0, 3, 4, 8, 11, 12], arpEvery: 2, hats: true, seed: 37
  },
  {
    id: 'montana', youtube: { id: '', song: 'Kakariko Village' }, name: 'Kakariko y la Montaña', bpm: 98, root: 58, scale: MAJOR, // Si bemol mayor
    chords: [Gm, Bb, Bb, Gm, F, Bb, Gm, F],
    rhythms: [[[0, 4], [4, 2], [6, 2], [8, 8]], [[0, 2], [2, 2], [4, 2], [6, 2], [8, 8]]],
    bass: [0, 3, 6, 8, 11, 14], arpEvery: 2, hats: true, seed: 41
  },
  {
    id: 'agua', youtube: { id: '', song: "Zora's Domain" }, name: 'Las aguas de Hyrule', bpm: 84, root: 65, scale: LYDIAN,
    chords: [[41, 45, 48, 52], [43, 47, 50, 54], [40, 43, 47, 50], [45, 48, 52, 55]],
    rhythms: [[[0, 6], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 4], [12, 4]]],
    bass: [0, 10], arpEvery: 1, hats: false, seed: 53
  },
  {
    id: 'templos', youtube: { id: 'https://youtu.be/Swigi7tgqOM', song: 'Triforce Medley · 40.º aniversario', start: 161 }, name: 'Desierto y templos', bpm: 115, root: 59, scale: DORIAN, // Si dórico (para el E mayor)
    chords: [Bm, Fsm, D, E],
    rhythms: [[[0, 8], [8, 8]], [[0, 12], [12, 4]]],
    bass: [0, 8], arpEvery: 2, hats: false, seed: 67
  }
];
