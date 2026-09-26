// Motor de lenguaje de Navi (misma arquitectura que Elisa, el bot del portafolio):
// solo los paquetes de NLP.js necesarios para español.
//
// El modelo se entrena en el build (plugin de astro.config.mjs → model.generated.json) y el
// servidor solo lo importa. Si falta o no coincide con los datos, se entrena en memoria.
import { createHash } from 'node:crypto';
import core from '@nlpjs/core';
import nlpPkg from '@nlpjs/nlp';
import langEs from '@nlpjs/lang-es';

const { containerBootstrap } = core;
const { Nlp } = nlpPkg;
const { LangEs } = langEs;

/** @typedef {{ intents: { intent: string, utterances: string[], answers?: string[] }[] }} Corpus */
/** @typedef {{ id: string, aliases: string[] }} Topic */

/** Tipos de tema y el archivo de conocimiento de cada uno */
export const KINDS = /** @type {const} */ (['dungeons', 'bosses', 'songs', 'items', 'characters', 'places', 'enemies', 'races']);

/** Quita tildes y signos de apertura/cierre, como suele escribir la gente en un chat */
export const plain = (/** @type {string} */ text) =>
	text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[¿?¡!]/g, '');

/**
 * Palabra fija que reemplaza al tema al entrenar y al clasificar, para que
 * «¿cómo derroto a Morpha?» y «¿cómo derroto a Volvagia?» se vean igual para el clasificador.
 */
export const SLOT = 'temaslot';

/** Reemplaza el marcador @tema del corpus por la palabra fija */
export const fillSlots = (/** @type {string} */ text) => text.replace(/@tema/g, SLOT);

/** Huella de los datos de entrenamiento: si cambian, el modelo pre-entrenado deja de valer */
export const sourceHash = (/** @type {Corpus} */ corpus, /** @type {Topic[]} */ topics) =>
	createHash('sha256').update(JSON.stringify([corpus, topics])).digest('hex').slice(0, 16);

function createNlp() {
	const container = containerBootstrap();
	container.use(LangEs);
	return new Nlp({ languages: ['es'], autoSave: false, forceNER: true, nlu: { log: false }, container });
}

/** Entrena desde cero */
export async function trainNlp(/** @type {Corpus} */ corpus, /** @type {Topic[]} */ topics) {
	const nlp = createNlp();

	// Entidades: todos los temas del juego, con alias y variantes sin tildes
	const variants = (/** @type {string[]} */ texts) => [...new Set(texts.flatMap((t) => [t, plain(t)]))];
	for (const topic of topics) nlp.addNerRuleOptionTexts('es', 'tema', topic.id, variants(topic.aliases));

	for (const { intent, utterances, answers = [] } of corpus.intents) {
		for (const u of new Set(utterances.flatMap((u) => [fillSlots(u), plain(fillSlots(u))]))) {
			nlp.addDocument('es', u, intent);
		}
		for (const a of answers) nlp.addAnswer('es', intent, a);
	}

	await nlp.train();
	return nlp;
}

/** Carga un modelo ya entrenado */
export function loadNlp(/** @type {string | object} */ model) {
	const nlp = createNlp();
	nlp.import(model);
	return nlp;
}
