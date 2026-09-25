// @ts-check
import { defineConfig } from 'astro/config';

// Sitio 100 % estático: Vercel lo detecta como Astro y sirve la carpeta dist/.
export default defineConfig({
  output: 'static',
});
