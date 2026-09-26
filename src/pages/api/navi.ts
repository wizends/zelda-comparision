import type { APIRoute } from 'astro';
import type { NaviContext } from '../../lib/navi/brain';
import { reply } from '../../lib/navi/runtime';

// Función del servidor (Vercel): el resto de la web sigue siendo estática
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const { question, context } = await request.json().catch(() => ({}));
	if (typeof question !== 'string' || !question.trim() || question.length > 500) {
		return new Response(JSON.stringify({ error: 'Pregunta inválida' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
	const safeContext: NaviContext = context && typeof context.topic === 'string' ? { topic: context.topic.slice(0, 60) } : {};

	const answer = await reply(question.trim(), safeContext);
	return new Response(JSON.stringify({ ...answer, from: 'bot', name: 'Navi' }), {
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
	});
};
