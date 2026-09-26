// Navi en producción: carga el modelo entrenado en el build y lo reutiliza entre peticiones.
// Si el modelo no existe o no coincide con los datos (p. ej. en `npm run dev` antes del primer
// build), se entrena en memoria la primera vez.
import corpus from './corpus.json';
import { TOPICS } from './knowledge';
import { loadNlp, sourceHash, trainNlp } from './nlp.js';
import { createBrain, type Brain, type NaviContext, type NaviReply } from './brain';

// import.meta.glob no falla si el archivo aún no existe
const pretrained = Object.values(
	import.meta.glob<{ hash: string; model: object }>('./model.generated.json', { eager: true, import: 'default' }),
)[0];

let brain: Promise<Brain> | undefined;

function getBrain() {
	return (brain ??= (async () => {
		const manager =
			pretrained?.hash === sourceHash(corpus, TOPICS) ? loadNlp(pretrained.model) : await trainNlp(corpus, TOPICS);
		return createBrain(corpus, TOPICS, manager);
	})());
}

export async function reply(question: string, context: NaviContext = {}): Promise<NaviReply> {
	return (await getBrain())(question, context);
}
