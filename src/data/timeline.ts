// Cronología oficial de The Legend of Zelda (Hyrule Historia 2011, The Legend of Zelda Encyclopedia 2018
// y la actualización de Nintendo del 25/11/2024 que sitúa Echoes of Wisdom tras Tri Force Heroes).
// Tras Ocarina of Time la historia se divide en tres ramas; Breath of the Wild y Tears of the Kingdom
// están al final de todas ellas, en un futuro lejano sin rama asignada.

export interface Game {
  title: string;
  year: number;
  platform: string;
  /** Ocarina of Time: el juego de esta web */
  current?: boolean;
}

export interface Era {
  title: string;
  retro: string;
  note: string;
  games: Game[];
}

export const ORIGIN: Era = {
  title: 'El origen',
  retro: 'EL ORIGEN',
  note: 'La leyenda comienza sobre las nubes y culmina en la batalla por la Trifuerza.',
  games: [
    { title: 'Skyward Sword', year: 2011, platform: 'Wii' },
    { title: 'The Minish Cap', year: 2004, platform: 'GBA' },
    { title: 'Four Swords', year: 2002, platform: 'GBA' },
    { title: 'Ocarina of Time', year: 1998, platform: 'N64 · Switch 2', current: true },
  ],
};

export const BRANCHES: Era[] = [
  {
    title: 'La caída del héroe',
    retro: 'EL HÉROE CAE',
    note: 'Link es derrotado por Ganon y Hyrule entra en decadencia.',
    games: [
      { title: 'A Link to the Past', year: 1991, platform: 'SNES' },
      { title: "Oracle of Seasons · Ages", year: 2001, platform: 'GBC' },
      { title: "Link's Awakening", year: 1993, platform: 'GB' },
      { title: 'A Link Between Worlds', year: 2013, platform: '3DS' },
      { title: 'Tri Force Heroes', year: 2015, platform: '3DS' },
      { title: 'Echoes of Wisdom', year: 2024, platform: 'Switch' },
      { title: 'The Legend of Zelda', year: 1986, platform: 'NES' },
      { title: 'The Adventure of Link', year: 1987, platform: 'NES' },
    ],
  },
  {
    title: 'La era infantil',
    retro: 'LINK NIÑO',
    note: 'Link vence y regresa a su infancia para advertir del peligro.',
    games: [
      { title: "Majora's Mask", year: 2000, platform: 'N64' },
      { title: 'Twilight Princess', year: 2006, platform: 'GC · Wii' },
      { title: 'Four Swords Adventures', year: 2004, platform: 'GC' },
    ],
  },
  {
    title: 'La era adulta',
    retro: 'LINK ADULTO',
    note: 'Link vence pero deja su tiempo; Hyrule queda sin héroe y bajo el mar.',
    games: [
      { title: 'The Wind Waker', year: 2002, platform: 'GC' },
      { title: 'Phantom Hourglass', year: 2007, platform: 'DS' },
      { title: 'Spirit Tracks', year: 2009, platform: 'DS' },
    ],
  },
];

export const FAR_FUTURE: Era = {
  title: 'Un futuro lejano',
  retro: 'FUTURO LEJANO',
  note: 'Al final de las tres ramas, milenios después.',
  games: [
    { title: 'Breath of the Wild', year: 2017, platform: 'Wii U · Switch' },
    { title: 'Tears of the Kingdom', year: 2023, platform: 'Switch' },
  ],
};

export const TIMELINE_SOURCES = [
  { label: 'Nintendo Everything', url: 'https://nintendoeverything.com/nintendo-adds-echoes-of-wisdom-to-the-zelda-timeline/' },
  { label: 'Zelda Wiki', url: 'https://zeldawiki.wiki/wiki/Timeline' },
];
