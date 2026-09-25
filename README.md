# Ocarina of Time · Remake vs N64

Web comparativa escena a escena entre *The Legend of Zelda: Ocarina of Time* para Nintendo Switch 2 y el original de Nintendo 64 (1998). Hecha con [Astro](https://astro.build).

- **Mitad izquierda:** estilo de la web oficial del remake (oscuro, cinematográfico, bronce y oro).
- **Mitad derecha:** estilo N64 (fondo low-poly, píxeles, scanlines, cajas de diálogo del juego).
- Haz clic en cualquier escena para abrir el comparador con deslizador.

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
  scripts/main.ts            fondo low-poly, hadas, revelado al hacer scroll y comparador
  styles/global.css          estilos de ambas mitades
public/img/                  imágenes optimizadas <id>-remake.webp / <id>-n64.webp
_originals/                  descargas a resolución completa (ignoradas por git y Vercel)
```

Para añadir una escena, deja las dos imágenes en `public/img/` y añade una entrada en `src/data/chapters.ts`.

## Publicar en Vercel

El sitio es 100 % estático; `vercel.json` ya indica el framework (Astro), el comando de build, la carpeta `dist/` y caché larga para `/img/*`.

**Opción A: desde GitHub (recomendada)**

1. Sube el repositorio a GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio y pulsa *Deploy*. No hace falta configurar nada más.

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
