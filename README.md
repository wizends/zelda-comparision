# Ocarina of Time · Remake vs N64

Web comparativa escena a escena entre *The Legend of Zelda: Ocarina of Time* para Nintendo Switch 2 y el original de Nintendo 64 (1998). Hecha con [Astro](https://astro.build).

- **Mitad izquierda:** estilo de la web oficial del remake (oscuro, cinematográfico, bronce y oro).
- **Mitad derecha:** estilo N64 (fondo low-poly, píxeles, scanlines, cajas de diálogo del juego).
- Haz clic en cualquier escena para abrir el comparador con deslizador.
- **Música por sección:** al activarla con el botón inferior central, cada sección reproduce su canción original desde YouTube o, si no tiene, un tema generado (ver [Música](#música)).

## Desarrollo

Requiere Node 22.12 o superior.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # astro check + build estático en dist/
npm run preview  # sirve dist/ en local
```

## Estructura

```
src/
  pages/index.astro          página principal
  layouts/Layout.astro       <head>, fondos fijos y script
  components/                TopBar, Hero, ChapterNav, ChapterSection, SceneRow, SiteFooter, CompareModal
  data/chapters.ts           capítulos y escenas (textos + ids de imagen)
  data/tracks.ts             pista de cada sección y temas generados de respaldo
  scripts/main.ts            fondo low-poly, hadas, revelado al hacer scroll y comparador
  scripts/music.ts           música por sección: temas generados y fundidos
  scripts/youtube.ts         reproductor de YouTube visible con fundidos de volumen
  lib/youtube-search.ts      búsqueda de vídeos con la YouTube Data API al compilar
  styles/global.css          estilos de ambas mitades
public/img/                  imágenes optimizadas <id>-remake.webp / <id>-n64.webp
_originals/                  descargas a resolución completa (ignoradas por git y Vercel)
```

Para añadir una escena, deja las dos imágenes en `public/img/` y añade una entrada en `src/data/chapters.ts`.

## Música

Cada sección reproduce su canción original desde YouTube, con un reproductor visible (abajo a la derecha) y fundido de volumen al cambiar de sección. El vídeo de cada sección se busca **al compilar** con la YouTube Data API v3 (`src/lib/youtube-search.ts`); la clave nunca llega al navegador.

| Sección | Canción | Búsqueda |
| --- | --- | --- |
| Portada e índice | Title Theme | `Zelda Ocarina of Time OST Title Theme` |
| I · El Bosque Kokiri | Kokiri Forest | `Zelda Ocarina of Time OST Kokiri Forest` |
| II · El reino de Hyrule | Hyrule Field Main Theme | `Zelda Ocarina of Time OST Hyrule Field Main Theme` |
| III · Pueblos y montañas | Kakariko Village | `Zelda Ocarina of Time OST Kakariko Village` |
| IV · Las aguas de Hyrule | Zora's Domain | `Zelda Ocarina of Time OST Zora's Domain` |
| V · Desierto y templos | Gerudo Valley | `Zelda Ocarina of Time OST Gerudo Valley` |

### Configurar la clave

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto, activa **YouTube Data API v3** y crea una **clave de API** (conviene restringirla a esa API).
2. Copia `.env.example` a `.env` y pega la clave en `YOUTUBE_API_KEY`.
3. Ejecuta `npm run build` (o `npm run dev`): en la consola verás `[música] bosque: "título" (canal) → enlace` para cada sección. Revisa que los vídeos sean los correctos.

Los resultados se guardan en `.youtube-cache.json`. **Súbelo al repositorio**: así Vercel usa exactamente los vídeos que revisaste, sin volver a buscar. Para repetir una búsqueda, borra su entrada del archivo.

### Ajustar una sección

En `src/data/tracks.ts`, campo `youtube` de cada sección:

- `id`: pega un enlace de YouTube para fijar ese vídeo (no se busca).
- `query`: cambia el texto de búsqueda.
- `start`: segundo en que empieza la canción.

Si una sección no tiene vídeo (sin clave, sin resultados) o el vídeo falla al reproducirse, suena su tema generado con Web Audio. La música es © Nintendo; revisa quién publica cada vídeo.

## Publicar en Vercel

El sitio es 100 % estático; `vercel.json` ya indica el framework (Astro), el comando de build, la carpeta `dist/` y caché larga para `/img/*`.

**Opción A: desde GitHub (recomendada)**

1. Sube el repositorio a GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio y pulsa *Deploy*.
3. (Opcional) En *Settings → Environment Variables* añade `YOUTUBE_API_KEY`, para que Vercel busque vídeos de las secciones que no estén en `.youtube-cache.json`.

Cada `git push` a la rama principal publica una nueva versión; las ramas y PR generan previews.

**Opción B: con la CLI**

```bash
npm i -g vercel
vercel          # primer despliegue (preview)
vercel --prod   # producción
```

## Fuentes de las capturas

- Remake: [nintendo.com/jp](https://www.nintendo.com/jp/games/switch2/aa9ja/index.html) y [Zelda Wiki](https://zeldawiki.wiki/wiki/Category:Ocarina_of_Time_(Nintendo_Switch_2)_Screenshots)
- N64: [Zelda Wiki](https://zeldawiki.wiki/wiki/Category:Ocarina_of_Time_Screenshots)

Hecho por Ricardo Pérez. Proyecto de fans sin ánimo de lucro. The Legend of Zelda y todas las imágenes © Nintendo.
