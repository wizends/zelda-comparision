import type corpusJson from './corpus.json';
import type { Topic } from './knowledge';
import { plain, SLOT, type loadNlp } from './nlp.js';

export type Corpus = typeof corpusJson;
type Manager = Awaited<ReturnType<typeof loadNlp>>;

/** Memoria de la conversación que el cliente devuelve en cada mensaje (seguimientos tipo «¿y su jefe?») */
export type NaviContext = { topic?: string };

export type NaviReply = {
	msg: string;
	intent: string;
	/** Nombres del juego que aparecen en la respuesta (el cliente los colorea, como en el juego) */
	highlights: string[];
	suggestions: string[];
	context: NaviContext;
};

type Entity = { entity: string; option: string; sourceText: string; utteranceText: string; accuracy: number };

/**
 * El NER tolera erratas («volvajia», «bolero del fugo»), pero a veces une palabras sueltas.
 * Se aceptan coincidencias exactas o erratas dentro de un mismo número de palabras.
 */
const reliable = (e: Entity) =>
	e.accuracy >= 0.99 ||
	(e.utteranceText.split(' ').length === e.sourceText.split(' ').length && e.sourceText.length >= 5 && e.accuracy >= 0.8);

export type Brain = (question: string, context?: NaviContext) => Promise<NaviReply>;

/** Intenciones que se responden con el tema detectado (o el de la conversación) */
const TOPIC_INTENTS = new Set(['tema.info', 'tema.donde', 'tema.jefe', 'tema.tesoro', 'tema.recompensa', 'tema.derrotar', 'tema.uso', 'tema.consejo']);

/** Intenciones fijas que mandan aunque la frase mencione un tema («¿qué es esta web?») */
const PROTECTED = new Set(['juego.info', 'juego.desarrollo', 'juego.remake', 'juego.versiones', 'web.info', 'cronologia', 'navi.identidad', 'navi.capacidades', 'historia.resumen', 'historia.viaje', 'mazmorras.lista', 'canciones.lista', 'mascaras.lista', 'corazones']);

/** Intenciones «genéricas» que se ceden a un tema mencionado en la frase («Volvagia» → tema.info) */
const TOPIC_OVERRIDABLE = new Set(['None', 'saludo', 'agradecimiento', 'navi.hey', 'consejos', 'fuera_de_tema']);

const DEFAULT_SUGGESTIONS = ['¿Cuál es el orden de las mazmorras?', '¿Qué canciones hay?', '¿De qué trata la historia?', '¿Qué trae el remake?'];

/** Arma a Navi con unos datos (corpus + temas) y un modelo ya entrenado con esos mismos datos */
export function createBrain(corpus: Corpus, topics: Topic[], manager: Manager): Brain {
	const MIN_SCORE = 0.6;
	const intents = new Map(corpus.intents.map((i) => [i.intent, i as { answers?: string[]; suggestions?: string[] }]));
	const byId = new Map(topics.map((t) => [t.id, t]));

	const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];

	/** Nombres resaltables: sin artículo ni paréntesis («la Nana de Zelda» → «Nana de Zelda») */
	const NAMES = [...new Set(topics.map((t) => t.name.replace(/^(el|la|los|las) /i, '').replace(/\s*\(.*\)$/, '')))].filter((n) => n.length >= 4);
	const highlightsIn = (msg: string) => NAMES.filter((n) => msg.includes(n));

	const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
	const dungeonOf = (t: Topic) => byId.get(t.dungeon ?? '');
	const bossOf = (t: Topic) => byId.get(t.boss ?? '');

	// ---------- Concordancia («las Botas se consiguen», «el Minueto te lo enseña», «del Templo») ----------
	const plural = (name: string) => /^(las|los) /i.test(name);
	const fem = (name: string) => /^(la|las) /i.test(name);
	const n = (name: string, singular: string, pluralForm: string) => (plural(name) ? pluralForm : singular);
	/** «de» + nombre, con contracción: «del Templo del Agua», «de la Caverna de hielo» */
	const de = (name: string) => (/^el /i.test(name) ? `del ${name.slice(3)}` : `de ${name}`);
	/** Los textos de «where» que empiezan por un lugar se leen tras «se consigue»; el resto van tras dos puntos */
	const PLACE_START = /^(en|junto|bajo|como|al|dentro|de|sobre|más allá|tras|detrás|donde|frente|hay)\b/i;

	/** Mazmorra relacionada: la propia, la del jefe o la enlazada a un personaje o lugar («Jabu-Jabu», «Lago Hylia») */
	const dungeonFor = (t: Topic) => (t.kind === 'dungeons' ? t : dungeonOf(t)?.kind === 'dungeons' ? dungeonOf(t) : undefined);

	/**
	 * Para personajes y lugares, las preguntas de mazmorra solo se redirigen a la mazmorra enlazada si la
	 * frase lo pide de verdad («¿quién es el jefe de Jabu-Jabu?»); «¿qué hay en el Lago Hylia?» describe el lugar.
	 */
	const ASKS: Record<string, RegExp> = {
		'tema.jefe': /jefe|monstruo|pele|lucho/,
		'tema.tesoro': /objeto|tesoro|arma|item|consig/,
		'tema.recompensa': /recompensa|medall|piedra|sabi|terminar|me dan/,
		'tema.consejo': /consejo|atasc|pista|truco|paso|pasar|supero|ayuda/,
	};

	// ---------- Piezas de respuesta por tipo de tema ----------

	function info(t: Topic): string {
		switch (t.kind) {
			case 'dungeons': {
				const boss = bossOf(t);
				const extra = [`Está ${t.where}.`, `Se recorre de ${t.age}.`, `Su tesoro es ${t.treasure}`, boss ? `y el jefe es ${boss.name}.` : '(no tiene jefe).'];
				return `${cap(t.name)}: ${t.summary}\n\n${extra.join(' ')}`;
			}
			case 'bosses': {
				const d = dungeonOf(t);
				return `${t.name}: ${t.summary}${d ? `\n\nLo encontrarás en ${d.name}.` : ''}`;
			}
			case 'songs':
				return `${cap(t.name)}: ${t.summary} ${fem(t.name) ? 'La' : 'Lo'} enseña ${t.teacher}. ${t.effect}`;
			case 'items':
				return `${cap(t.name)}: ${t.use}\n\n${where(t)}`;
			case 'enemies':
				return `${cap(t.name)}: ${t.summary} ${n(t.name, 'Se encuentra', 'Se encuentran')} ${t.where}.`;
			default:
				return `${cap(t.name)}: ${t.summary}`;
		}
	}

	function where(t: Topic): string {
		switch (t.kind) {
			case 'songs':
				return /^tú/.test(t.teacher ?? '')
					? `${cap(t.name)}: ${t.where}.`
					: `${cap(t.name)} te ${fem(t.name) ? 'la' : 'lo'} enseña ${t.teacher}, ${t.where}.`;
			case 'items':
				return PLACE_START.test(t.where ?? '')
					? `${cap(t.name)} ${n(t.name, 'se consigue', 'se consiguen')} ${t.where}.`
					: `${cap(t.name)}: ${t.where}.`;
			case 'bosses': {
				const d = dungeonOf(t);
				return d ? `${t.name} te espera en ${d.name}, que está ${d.where}.` : info(t);
			}
			case 'dungeons':
				return `${cap(t.name)} está ${t.where}.`;
			case 'enemies':
				return `${cap(t.name)} ${n(t.name, 'se encuentra', 'se encuentran')} ${t.where}.`;
			default:
				return t.where ? `${cap(t.name)}: ${t.where}.` : info(t);
		}
	}

	function boss(t: Topic): string | null {
		if (t.kind === 'bosses') {
			const d = dungeonOf(t);
			return d ? `${t.name} es el jefe ${de(d.name)}.` : null;
		}
		const d = dungeonFor(t);
		if (!d) return null;
		const b = bossOf(d);
		if (!b) return `${cap(d.name)} no tiene jefe final${d.miniboss ? `, aunque sí hay un minijefe: ${d.miniboss}` : ''}.`;
		return `El jefe ${de(d.name)} es ${b.name}. ${b.summary}${d.miniboss ? `\n\nAntes te cruzarás con ${d.miniboss}.` : ''}`;
	}

	function defeat(t: Topic): string | null {
		if (t.kind === 'bosses' || t.kind === 'enemies') return `Contra ${t.name}: ${t.strategy}`;
		const d = dungeonFor(t);
		const b = d && bossOf(d);
		return b ? `El jefe ${de(d!.name)} es ${b.name}. ${b.strategy}` : null;
	}

	function treasure(t: Topic): string | null {
		const d = dungeonFor(t);
		return d ? `En ${d.name} consigues ${d.treasure}.` : null;
	}

	function reward(t: Topic): string | null {
		const d = dungeonFor(t);
		return d ? `Al terminar ${d.name} obtienes ${d.reward}.` : null;
	}

	function use(t: Topic): string | null {
		if (t.kind === 'items') return `${cap(t.name)}: ${t.use}`;
		if (t.kind === 'songs') return `${cap(t.name)}: ${t.effect}`;
		return null;
	}

	function tip(t: Topic): string | null {
		if (t.kind === 'bosses' || t.kind === 'enemies') return defeat(t);
		const d = dungeonFor(t);
		if (!d) return null;
		const b = bossOf(d);
		return `Pista para ${d.name}: ${d.tip}${b ? `\n\nY para el jefe: ${b.strategy}` : ''}`;
	}

	/** Sugerencias de seguimiento según el tipo de tema (funcionan gracias al contexto), con su intención */
	function followUps(t: Topic): [string, string][] {
		switch (t.kind) {
			case 'dungeons':
				return t.boss
					? [['¿Quién es el jefe?', 'tema.jefe'], ['¿Cómo derroto al jefe?', 'tema.derrotar'], ['¿Qué objeto hay?', 'tema.tesoro'], ['¿Qué recompensa da?', 'tema.recompensa'], ['¿Dónde está?', 'tema.donde']]
					: [['¿Qué objeto hay?', 'tema.tesoro'], ['¿Algún consejo?', 'tema.consejo'], ['¿Dónde está?', 'tema.donde']];
			case 'bosses':
			case 'enemies':
				return [['¿Cómo se derrota?', 'tema.derrotar'], ['¿Dónde está?', 'tema.donde'], ['Cuéntame más', 'tema.info']];
			case 'songs':
				return [['¿Para qué sirve?', 'tema.uso'], ['¿Dónde se aprende?', 'tema.donde'], ['¿Qué canciones hay?', 'canciones.lista']];
			case 'items':
				return [['¿Dónde se consigue?', 'tema.donde'], ['¿Para qué sirve?', 'tema.uso']];
			default:
				return [['¿Dónde está?', 'tema.donde'], ['¿De qué trata la historia?', 'historia.resumen']];
		}
	}

	// ---------- Entrada principal ----------

	const GREETING = /^(hola+|holi|buenas(?: tardes| noches)?|buenos dias|hey|oye|navi|que tal|saludos)\b[\s,.!]*/i;
	const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	/** «Hola», «holaa Navi!», «buenas navi»: solo saludo (Navi no es el tema de la pregunta) */
	const ONLY_GREETING = /^(?:(?:hola+|holi|buenas|buenos|dias|tardes|noches|hey|oye|navi|que tal|saludos|hello|hi)[\s,.!]*)+$/i;

	async function reply(question: string, context: NaviContext = {}): Promise<NaviReply> {
		if (ONLY_GREETING.test(plain(question).trim())) {
			const def = intents.get('saludo');
			return { msg: pick(def?.answers ?? ['¡Hola!']), intent: 'saludo', highlights: [], suggestions: def?.suggestions ?? [], context: { ...context } };
		}

		// «Hola Navi, ¿dónde está el Gancho?» → se clasifica la pregunta, no el saludo
		const stripped = plain(question).replace(GREETING, '').replace(GREETING, '').trim();
		let text = stripped.split(/\s+/).length >= 2 ? stripped : question;

		// 1ª pasada: entidades (se prefiere la coincidencia más larga: «castillo de ganon» antes que «castillo»).
		// 2ª pasada: clasificación con el tema sustituido por su palabra fija.
		const first = await manager.process('es', text);
		const found = ((first.entities ?? []) as Entity[])
			.filter((e) => e.entity === 'tema' && reliable(e))
			.sort((a, b) => b.utteranceText.length - a.utteranceText.length || b.accuracy - a.accuracy);
		const topicEnt = found[0];
		const mentioned = byId.get(topicEnt?.option ?? '');
		if (topicEnt) text = text.replace(new RegExp(escapeRe(topicEnt.utteranceText), 'i'), SLOT);

		let res = await manager.process('es', text);
		// Si la frase original ya era claramente fija («¿qué trae el remake?») y no habla de un tema
		// concreto, se respeta («¿quién es Sheik?» no es «¿quién eres?»)
		if (!mentioned && PROTECTED.has(first.intent) && first.score >= 0.8 && first.score > res.score - 0.05) res = first;

		let intent: string = res.score >= MIN_SCORE ? res.intent : 'None';
		if (mentioned && TOPIC_OVERRIDABLE.has(intent)) intent = 'tema.info';

		const def = intents.get(intent);
		const out: NaviReply = { msg: '', intent, highlights: [], suggestions: def?.suggestions ?? [], context: { ...context } };

		if (TOPIC_INTENTS.has(intent)) {
			// Tema de la frase o, en seguimientos («¿y su jefe?»), el de la conversación
			const t = mentioned ?? byId.get(context.topic ?? '');
			if (!t) {
				out.msg = '¿Sobre qué quieres saber? Dime una mazmorra, un jefe, una canción, un objeto o un personaje. Por ejemplo: «¿Dónde está el Templo del Agua?».';
				out.suggestions = DEFAULT_SUGGESTIONS;
			} else {
				const redirected = t.kind !== 'dungeons' && t.kind !== 'bosses' && t.kind !== 'enemies' && intent in ASKS;
				if (redirected && !ASKS[intent].test(plain(question).toLowerCase())) intent = out.intent = 'tema.info';
				const answer =
					intent === 'tema.donde' ? where(t)
					: intent === 'tema.jefe' ? boss(t)
					: intent === 'tema.tesoro' ? treasure(t)
					: intent === 'tema.recompensa' ? reward(t)
					: intent === 'tema.derrotar' ? defeat(t)
					: intent === 'tema.uso' ? use(t)
					: intent === 'tema.consejo' ? tip(t)
					: null;
				// Si la pregunta no encaja con el tipo de tema («¿qué jefe tiene Saria?»), se da su ficha
				out.msg = answer ?? info(t);
				out.context.topic = t.id;
				out.suggestions = followUps(t).filter(([, i]) => i !== intent).map(([s]) => s);
			}
		} else if (intent === 'None') {
			out.msg = pick([
				'¿Eh? No estoy segura de haberte entendido 🤔. Pregúntame por una mazmorra, un jefe, una canción, un objeto o un personaje de Ocarina of Time.',
				'¡Hey! Esa no me la sé. Prueba con algo como «¿Cómo derroto a Bongo Bongo?» o «¿Dónde consigo las Botas de hierro?».'
			]);
			out.suggestions = DEFAULT_SUGGESTIONS;
		} else {
			// Respuesta fija del corpus (NLP.js elige una al azar si hay varias)
			out.msg = res.intent === intent && res.answer ? res.answer : pick(def?.answers ?? ['']);
		}

		out.suggestions = out.suggestions.filter((s) => plain(s).toLowerCase() !== plain(question).toLowerCase()).slice(0, 4);
		out.highlights = highlightsIn(out.msg);
		return out;
	}

	return reply;
}
