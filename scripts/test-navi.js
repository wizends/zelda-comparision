// Prueba a Navi con preguntas redactadas distinto al corpus, contra el endpoint real.
// Uso: con el servidor corriendo (npm run dev), `npm run test:navi` (o NAVI_URL=http://... npm run test:navi)
import { readFileSync } from 'node:fs';

const cases = JSON.parse(readFileSync(new URL('../src/lib/navi/testCases.json', import.meta.url), 'utf8'));
const URL_NAVI = process.env.NAVI_URL ?? 'http://localhost:4321/api/navi';

let pass = 0;
let total = 0;
for (const convo of cases.conversations) {
	let context = {};
	for (const turn of convo) {
		total++;
		const res = await fetch(URL_NAVI, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ question: turn.q, context }),
		}).then((r) => r.json());
		context = res.context;
		const okIntent = [turn.intent].flat().includes(res.intent);
		const okText = !turn.has || res.msg.includes(turn.has);
		if (okIntent && okText) pass++;
		console.log(`${okIntent && okText ? '✔' : '✘'} ${turn.q.padEnd(50)} → ${res.intent}${okIntent ? '' : ` (esperado ${turn.intent})`}${okText ? '' : ` [falta «${turn.has}»]`}`);
		if (!(okIntent && okText) || process.env.VERBOSE) console.log(`    ${res.msg.replace(/\n/g, '\n    ')}`);
	}
}
console.log(`\n${pass}/${total} correctas (${Math.round((pass / total) * 100)}%)`);
process.exit(pass === total ? 0 : 1);
