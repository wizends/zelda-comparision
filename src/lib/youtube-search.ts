// Busca en la YouTube Data API v3 el vídeo de cada sección, en tiempo de compilación.
// La clave (YOUTUBE_API_KEY) solo se usa en el servidor/build y nunca llega al navegador.
// Los resultados se guardan en .youtube-cache.json para no gastar cuota en cada recarga del servidor de desarrollo.

import { readFile, writeFile } from 'node:fs/promises';
import { TRACKS, youtubeId, type Track } from '../data/tracks';

const CACHE_FILE = '.youtube-cache.json';
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

interface Hit { id: string; title: string; channel: string }
type Cache = Record<string, Hit | null>;

const queryOf = (t: Track) => t.youtube.query ?? `Zelda Ocarina of Time OST ${t.youtube.song}`;

async function readCache(): Promise<Cache> {
  try { return JSON.parse(await readFile(CACHE_FILE, 'utf8')); } catch { return {}; }
}

/** La API devuelve los títulos con entidades HTML (&#39;, &amp;…) */
const decode = (s: string) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function search(query: string, key: string): Promise<Hit | null> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '1',
    videoEmbeddable: 'true', // que permita incrustarse
    videoSyndicated: 'true', // que se pueda reproducir fuera de youtube.com
    q: query,
    key,
  });
  const res = await fetch(`${SEARCH_URL}?${params}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason = body.error?.details?.[0]?.reason ?? body.error?.errors?.[0]?.reason ?? '';
    throw new Error(`YouTube API ${res.status} ${reason}: ${body.error?.message ?? res.statusText}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  return item ? { id: item.id.videoId, title: decode(item.snippet.title), channel: decode(item.snippet.channelTitle) } : null;
}

let memo: Promise<Record<string, string>> | undefined;

/** Devuelve { idDeSeccion: idDeVideo } para las secciones que tienen vídeo */
export function resolveVideos() {
  memo ??= (async () => {
    const key = import.meta.env.YOUTUBE_API_KEY as string | undefined;
    const cache = await readCache();
    let dirty = false;
    const out: Record<string, string> = {};

    for (const t of TRACKS) {
      const manual = youtubeId(t.youtube.id);
      if (manual) { out[t.id] = manual; continue; }

      const q = queryOf(t);
      if (!(q in cache)) {
        if (!key) continue;
        try {
          cache[q] = await search(q, key);
          dirty = true;
        } catch (err) {
          console.warn(`[música] No se pudo buscar "${q}": ${(err as Error).message}`);
          continue;
        }
      }
      const hit = cache[q];
      if (hit) {
        out[t.id] = hit.id;
        console.log(`[música] ${t.id}: "${hit.title}" (${hit.channel}) → https://youtu.be/${hit.id}`);
      } else {
        console.warn(`[música] ${t.id}: sin resultados para "${q}"`);
      }
    }

    if (!key && Object.keys(out).length < TRACKS.length) {
      console.warn('[música] Sin YOUTUBE_API_KEY: las secciones sin vídeo usan el tema generado.');
    }
    if (dirty) await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    return out;
  })();
  return memo;
}
