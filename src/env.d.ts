interface ImportMetaEnv {
  /** Clave de la YouTube Data API v3 (solo servidor/build) para buscar la música de cada sección */
  readonly YOUTUBE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
