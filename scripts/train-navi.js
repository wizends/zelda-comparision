// Entrena a Navi y guarda el modelo en src/lib/navi/model.generated.json.
// Se ejecuta en cada `astro build` (plugin en astro.config.mjs), también en Vercel.
// Uso manual: npm run train:navi
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KINDS, sourceHash, trainNlp } from '../src/lib/navi/nlp.js';

const dir = fileURLToPath(new URL('../src/lib/navi/', import.meta.url));
export const MODEL_FILE = dir + 'model.generated.json';

const readJson = (file) => JSON.parse(readFileSync(dir + file, 'utf8'));

/** Mismos temas y en el mismo orden que src/lib/navi/knowledge.ts (la huella debe coincidir) */
export const loadTopics = () => KINDS.flatMap((kind) => readJson(`knowledge/${kind}.json`).map((t) => ({ ...t, kind })));

export async function trainNavi() {
	const t0 = Date.now();
	const corpus = readJson('corpus.json');
	const topics = loadTopics();
	const nlp = await trainNlp(corpus, topics);
	writeFileSync(MODEL_FILE, JSON.stringify({ hash: sourceHash(corpus, topics), model: JSON.parse(nlp.export(true)) }));
	return { intents: corpus.intents.length, topics: topics.length, ms: Date.now() - t0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { intents, topics, ms } = await trainNavi();
	console.log(`Navi entrenada: ${intents} intenciones y ${topics} temas en ${ms} ms → ${MODEL_FILE}`);
}
