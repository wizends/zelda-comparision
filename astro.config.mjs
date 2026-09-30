// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

/**
 * Entrena el chatbot Navi en cada `astro build` (local o en Vercel) y deja el modelo en
 * src/lib/navi/model.generated.json, que la función del servidor solo importa.
 * @returns {import('vite').Plugin}
 */
function trainNavi() {
  /** Astro hace varios builds de Vite (cliente, servidor, prerender): se entrena una sola vez */
  /** @type {Promise<void> | undefined} */
  let trained;
  return {
    name: 'train-navi',
    apply: 'build',
    buildStart() {
      trained ??= import('./scripts/train-navi.js')
        .then(({ trainNavi }) => trainNavi())
        .then(({ intents, topics, ms }) => console.log(`\n[train-navi] Navi entrenada: ${intents} intenciones y ${topics} temas en ${ms} ms`));
      return trained;
    },
  };
}

/** URL pública (canonical, sitemap, Open Graph). Se puede cambiar con la variable SITE_URL. */
const SITE = process.env.SITE_URL || 'https://zelda-comparativa.wizends.dev';

// La web es estática; solo /api/navi (prerender = false) se sirve como función en Vercel.
export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/api/') && !page.includes('/404') })],
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  vite: { plugins: [trainNavi()] },
});
