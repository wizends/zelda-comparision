// Pares de comparación: cada escena tiene su captura del remake (Switch 2) y de N64.
// Imágenes en public/img/<id>-remake.webp y public/img/<id>-n64.webp
export interface Scene {
  id: string;
  name: string;
  remake: string;
  n64: string;
}

export interface Chapter {
  id: string;
  title: string;
  retro: string;
  intro: string;
  scenes: Scene[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'bosque',
    title: 'El Bosque Kokiri',
    retro: 'BOSQUE KOKIRI',
    intro: 'Donde todo empieza: un niño sin hada, un árbol que sueña y un bosque que nunca deja salir a sus hijos.',
    scenes: [
      { id: 'kokiri', name: 'Bosque Kokiri',
        remake: 'La niebla, los rayos de luz entre las copas y la vegetación densa convierten la aldea en un bosque vivo.',
        n64: 'Casas-tronco, un arroyo de textura repetida y una niebla verde que oculta el límite del mapa.' },
      { id: 'deku-meadow', name: 'Pradera del Gran Árbol Deku',
        remake: 'Hojas cayendo, raíces colosales y una escala que por fin se siente abrumadora.',
        n64: 'Un gigante de pocos polígonos cuya cara era pura textura. Aun así, imponía.' },
      { id: 'deku-inside', name: 'Interior del Árbol Deku',
        remake: 'La luz cenital atraviesa el tronco hueco e ilumina las telarañas y la madera orgánica.',
        n64: 'La primera mazmorra en 3D de Zelda: paredes con textura de corteza y mucha oscuridad.' },
      { id: 'links-house', name: 'La casa de Link',
        remake: 'Faroles cálidos, cestas y un hogar con detalle de sobra.',
        n64: 'Una escalera, una puerta y la casa en el árbol más famosa de los 90.' },
      { id: 'lost-woods', name: 'Bosque Perdido',
        remake: 'Saria espera entre troncos retorcidos con iluminación volumétrica.',
        n64: 'Cruces idénticos con un túnel a cada lado. La música era la verdadera guía.' },
      { id: 'sacred-meadow', name: 'Prado Sagrado',
        remake: 'El laberinto de setos recibe sombras dinámicas y un nuevo HUD mínimo.',
        n64: 'Setos planos, niebla verdosa y los Moblins acechando al fondo.' },
      { id: 'saria', name: 'La ocarina de Saria',
        remake: 'Expresiones faciales animadas y una despedida mucho más emotiva.',
        n64: 'La escena del puente con barras de cine y el Hada Ocarina como regalo.' }
    ]
  },
  {
    id: 'hyrule',
    title: 'El reino de Hyrule',
    retro: 'CAMPO DE HYRULE',
    intro: 'Más allá del bosque se abre un mundo enorme: praderas, un castillo y una ciudad llena de vida.',
    scenes: [
      { id: 'hyrule-field', name: 'Campo de Hyrule',
        remake: 'Un horizonte real con montañas, nubes y el castillo recortado en la distancia.',
        n64: 'La gran explanada que asombró a todos en 1998, con la niebla escondiendo el final.' },
      { id: 'market', name: 'Mercado de la Ciudadela',
        remake: 'Casas con entramado de madera, gente paseando y calles de piedra modeladas.',
        n64: 'Fondos pre-renderizados con ángulos de cámara fijos, como un diorama.' },
      { id: 'hyrule-castle', name: 'Castillo de Hyrule',
        remake: 'Torres esbeltas, tejados azules y un castillo con peso arquitectónico.',
        n64: 'Una silueta gris de muros planos que se leía perfectamente desde la colina.' },
      { id: 'courtyard', name: 'Encuentro con Zelda',
        remake: 'Link y Zelda sentados en el patio: una escena reinterpretada con más intimidad.',
        n64: '"Soy Zelda, princesa de Hyrule." Uno de los diálogos más recordados del juego.' },
      { id: 'courtyard2', name: 'Jardines del castillo',
        remake: 'Flores, arcos góticos y piedra blanca. Un jardín de verdad.',
        n64: 'Un rectángulo de césped y pocos arbustos, rodeado de muros altos.' },
      { id: 'lon-lon', name: 'Rancho Lon Lon',
        remake: 'Pinos, cercas de madera y el granero con luz de atardecer.',
        n64: 'La pista ovalada y los caballos a lo lejos. Aquí conociste a Epona.' },
      { id: 'epona', name: 'Cabalgando a Epona',
        remake: 'Epona se encabrita con el cielo de fondo: una postal hecha escena de juego.',
        n64: 'Las zanahorias en el HUD y la tarjeta de "Faster". Pura sensación de libertad.' }
    ]
  },
  {
    id: 'montana',
    title: 'Pueblos y montañas',
    retro: 'KAKARIKO Y MONTE',
    intro: 'Kakariko a los pies de la Montaña de la Muerte y los gorons que viven dentro de ella.',
    scenes: [
      { id: 'kakariko', name: 'Aldea Kakariko',
        remake: 'Tejados orientales, jardines con flores y un pueblo que parece habitado.',
        n64: 'Vista aérea con tejados rojos, el molino y cuadrados de hierba.' },
      { id: 'burning', name: 'Kakariko en llamas',
        remake: 'Una vista nocturna con el fuego dibujando el contorno de las casas.',
        n64: 'Humo naranja, barras de cine y el aviso de que algo terrible llega.' },
      { id: 'death-mountain', name: 'Montaña de la Muerte',
        remake: 'El volcán domina el paisaje mientras Link y Epona lo contemplan.',
        n64: 'El famoso anillo de humo sobre un cono marrón y un cielo azul intenso.' },
      { id: 'dm-trail', name: 'Sendero de la montaña',
        remake: 'Roca erosionada, estratos visibles y un camino con relieve.',
        n64: 'Paredes de cañón con textura repetida y un camino en zigzag.' },
      { id: 'goron', name: 'Ciudad Goron',
        remake: 'Un gran salón excavado con luz de lava y ornamentos tallados.',
        n64: 'Una fosa circular de varios niveles con la cuerda de la gran vasija.' },
      { id: 'dodongo', name: 'Caverna de los Dodongos',
        remake: 'Magma que ilumina la cueva y cabeza de dragón monumental.',
        n64: 'La calavera del dodongo sobre una plataforma con alfombra de lava.' },
      { id: 'king-dodongo', name: 'Rey Dodongo',
        remake: 'El jefe se muestra con escamas, dientes y chispas volando.',
        n64: 'La arena de lava roja brillante. Solo faltaba una bomba en su boca.' }
    ]
  },
  {
    id: 'agua',
    title: 'Las aguas de Hyrule',
    retro: 'DOMINIO ZORA',
    intro: 'Cascadas, el lago y un pez gigante que se traga a un niño con una botella.',
    scenes: [
      { id: 'zora-domain', name: 'Dominio Zora',
        remake: 'Columnas, cascadas con vapor y vegetación que cuelga sobre el agua.',
        n64: 'Una gruta turquesa con la cascada como gran protagonista.' },
      { id: 'zora-fountain', name: 'Fuente Zora',
        remake: 'Lord Jabu-Jabu descansa en su altar con agua cristalina.',
        n64: 'Troncos muertos asomando de un agua quieta y verdosa.' },
      { id: 'jabu-lord', name: 'Lord Jabu-Jabu',
        remake: 'Link salta hacia una boca llena de dientes con texturas orgánicas.',
        n64: 'La boca abierta más famosa de Nintendo 64, en su altar de piedra.' },
      { id: 'jabu', name: 'Tripa de Jabu-Jabu',
        remake: 'Paredes carnosas con brillo húmedo y tentáculos eléctricos.',
        n64: 'Un túnel rojo animado que parecía moverse al ritmo del pez.' },
      { id: 'lake-hylia', name: 'Lago Hylia',
        remake: 'El puente, la isla y el cielo reflejados en un lago enorme.',
        n64: 'Agua semitransparente, un árbol solitario y el laboratorio al fondo.' },
      { id: 'fishing', name: 'Estanque de pesca',
        remake: 'Nenúfares y agua turbia donde por fin se ve lo que hay debajo.',
        n64: 'El minijuego que se tragó horas: la Loach de Hylia sigue ahí.' }
    ]
  },
  {
    id: 'templos',
    title: 'Desierto y templos',
    retro: 'LOS TEMPLOS',
    intro: 'Siete años después: templos, sabios y el duelo final por la Trifuerza.',
    scenes: [
      { id: 'gerudo', name: 'Fortaleza Gerudo',
        remake: 'Adobe rojizo, toldos y un calor casi palpable.',
        n64: 'Bloques de arena con puertas oscuras y guardias vigilando.' },
      { id: 'colossus', name: 'Coloso del Desierto',
        remake: 'La diosa tallada en la roca, con manos gigantes que abrazan el templo.',
        n64: 'Un oasis y el coloso rodeado de dunas planas.' },
      { id: 'forest-temple', name: 'Templo del Bosque',
        remake: 'Ruinas cubiertas de musgo con una entrada misteriosa al fondo.',
        n64: 'La fachada entre árboles y la primera enredadera de la aventura adulta.' },
      { id: 'water-temple', name: 'Templo del Agua',
        remake: 'Reflejos azulados y un nivel del agua que se ve profundo.',
        n64: 'El templo más temido. Botas de hierro en el menú, una y otra vez.' },
      { id: 'shadow-temple', name: 'Templo de la Sombra',
        remake: 'Oscuridad casi total y la luz de Navi como único guía.',
        n64: 'Guillotinas, calaveras y la Lente de la Verdad como única ayuda.' },
      { id: 'volley', name: 'Tenis con Ganondorf',
        remake: 'Magia verde y partículas: el duelo más icónico, en alta definición.',
        n64: 'Devolver la esfera con la espada. Pura mecánica de Zelda.' },
      { id: 'master-sword', name: 'La Espada Maestra',
        remake: 'Link sostiene la hoja sagrada bajo la luz del Templo del Tiempo.',
        n64: 'El pedestal en la Cámara de la Espada. El momento en que todo cambia.' },
      { id: 'sacred-realm', name: 'El Reino Sagrado',
        remake: 'Hilos de luz alrededor de la Trifuerza en un cielo cósmico.',
        n64: 'La Trifuerza dorada flotando sobre un fondo abstracto.' },
      { id: 'goddesses', name: 'Las Diosas de Oro',
        remake: 'Din, Nayru y Farore dejan estelas de color en la creación del mundo.',
        n64: 'La leyenda de la creación contada en la escena de apertura.' }
    ]
  }
];

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export const imgSrc = (id: string, side: 'remake' | 'n64') => `/img/${id}-${side}.webp`;
