// Chat con Navi con la caja de diálogo del juego: la respuesta se divide en páginas de 3 líneas,
// se escribe letra a letra, los nombres del juego van en color, ▼ verde para continuar,
// ■ verde al terminar y las sugerencias aparecen como opciones en verde.

type Reply = { msg: string; highlights?: string[]; suggestions: string[]; context: { topic?: string } };

const STORE_KEY = 'navi-dialog';
const CALLOUT_KEY = 'navi-callout';
const LINES_PER_PAGE = 3;
const CPS = 70; // caracteres por segundo, velocidad de texto del juego
const GREETING: Reply = {
	msg: '¡Hey! ¡Escucha! Soy Navi. Pregúntame lo que quieras de Ocarina of Time: mazmorras, jefes, canciones, objetos, personajes…',
	suggestions: ['¿Cuál es el orden de las mazmorras?', '¿Cómo derroto a Volvagia?', '¿Dónde consigo el Gancho?', '¿Qué trae el remake?'],
	context: {},
};

type Segment = { text: string; hl: boolean };

export function initNavi() {
	const root = document.querySelector<HTMLElement>('[data-navi]');
	if (!root) return;
	const fab = root.querySelector<HTMLButtonElement>('.navi-fab')!;
	const scene = root.querySelector<HTMLElement>('.navi-scene')!;
	const form = root.querySelector<HTMLFormElement>('.navi-ask')!;
	const input = form.querySelector<HTMLInputElement>('input')!;
	const box = root.querySelector<HTMLElement>('.navi-box')!;
	const textEl = root.querySelector<HTMLElement>('.navi-text')!;
	const choicesEl = root.querySelector<HTMLUListElement>('.navi-choices')!;
	const next = root.querySelector<HTMLElement>('.navi-next')!;
	const sr = root.querySelector<HTMLElement>('.navi-sr')!;
	const callout = root.querySelector<HTMLElement>('.navi-callout')!;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---------- Estado (última respuesta y contexto, durante la sesión) ----------
	let current: Reply = GREETING;
	let context: Reply['context'] = {};
	try {
		const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null');
		if (saved) ({ current, context } = saved);
	} catch { /* sin almacenamiento */ }
	const save = () => {
		try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ current, context })); } catch { /* sin almacenamiento */ }
	};

	// ---------- Paginación: bloques de 3 líneas según el ancho real de la caja ----------
	function charsPerLine() {
		const style = getComputedStyle(textEl);
		const fontSize = parseFloat(style.fontSize) || 20;
		return Math.max(22, Math.floor(textEl.clientWidth / (fontSize * 0.53)));
	}

	function paginate(msg: string): string[] {
		const cpl = charsPerLine();
		const linesOf = (s: string) => s.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / cpl)), 0);
		const pages: string[] = [];
		// Cada párrafo empieza página nueva, como un nuevo cuadro de texto del juego
		for (const para of msg.split(/\n{2,}/)) {
			let page = '';
			const push = () => { if (page.trim()) pages.push(page.trim()); page = ''; };
			const add = (unit: string, sep: string) => {
				const candidate = page ? page + sep + unit : unit;
				if (linesOf(candidate) <= LINES_PER_PAGE) { page = candidate; return; }
				push();
				if (linesOf(unit) <= LINES_PER_PAGE) { page = unit; return; }
				// Frase más larga que una página: se reparte por comas y, si no basta, por palabras
				const clauses = unit.split(/(?<=,)\s+/);
				if (clauses.length > 1) for (const c of clauses) add(c, ' ');
				else for (const w of unit.split(' ')) add(w, ' ');
			};
			for (const line of para.split('\n')) {
				const sentences = line.split(/(?<=[.!?…])\s+/);
				sentences.forEach((sentence, i) => add(sentence, i === 0 && page ? '\n' : ' '));
			}
			push();
		}
		return pages.length ? pages : [msg];
	}

	/** Parte una página en trozos normales y resaltados (nombres del juego) */
	function segments(page: string, highlights: string[]): Segment[] {
		const names = [...highlights].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		if (!names.length) return [{ text: page, hl: false }];
		return page
			.split(new RegExp(`(${names.join('|')})`, 'g'))
			.filter(Boolean)
			.map((text) => ({ text, hl: highlights.includes(text) }));
	}

	/** Dibuja los primeros `n` caracteres de la página */
	function render(segs: Segment[], n: number) {
		const frag = document.createDocumentFragment();
		let left = n;
		for (const s of segs) {
			if (left <= 0) break;
			const part = s.text.slice(0, left);
			left -= part.length;
			if (s.hl) {
				const em = document.createElement('span');
				em.className = 'hl';
				em.textContent = part;
				frag.appendChild(em);
			} else frag.appendChild(document.createTextNode(part));
		}
		textEl.replaceChildren(frag);
	}

	// ---------- Presentación de la respuesta ----------
	let pages: string[] = [];
	let pageIdx = 0;
	let frame = 0;
	let typing = false;
	let finishPage = () => {};

	function setIndicator(kind: '' | 'more' | 'end') {
		next.className = `navi-next${kind ? ` ${kind}` : ''}`;
	}

	function showChoices(show: boolean) {
		choicesEl.hidden = !show || !current.suggestions.length;
		if (choicesEl.hidden) return;
		choicesEl.replaceChildren(
			...current.suggestions.map((s) => {
				const li = document.createElement('li');
				const b = document.createElement('button');
				b.type = 'button';
				b.textContent = s;
				b.addEventListener('click', (e) => { e.stopPropagation(); ask(s); });
				b.addEventListener('keydown', (e) => {
					const items = [...choicesEl.querySelectorAll('button')];
					const i = items.indexOf(b);
					if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
					if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
				});
				li.appendChild(b);
				return li;
			}),
		);
	}

	function showPage(i: number) {
		pageIdx = i;
		cancelAnimationFrame(frame);
		setIndicator('');
		showChoices(false);
		const segs = segments(pages[i], current.highlights ?? []);
		const total = pages[i].length;
		const last = i === pages.length - 1;

		finishPage = () => {
			cancelAnimationFrame(frame);
			typing = false;
			render(segs, total);
			setIndicator(last ? 'end' : 'more');
			if (last) showChoices(true);
		};

		if (reduced) return finishPage();
		typing = true;
		const start = performance.now();
		const tick = (now: number) => {
			const n = Math.floor(((now - start) / 1000) * CPS);
			render(segs, n);
			if (n < total) frame = requestAnimationFrame(tick);
			else finishPage();
		};
		frame = requestAnimationFrame(tick);
	}

	function present(reply: Reply) {
		current = reply;
		pages = paginate(reply.msg);
		sr.textContent = reply.msg; // lectores de pantalla: el texto completo de una vez
		showPage(0);
	}

	/** Clic / Enter / Espacio: completa la página o pasa a la siguiente (como el botón A del juego) */
	function advance() {
		if (box.classList.contains('thinking')) return;
		if (typing) return finishPage();
		if (pageIdx < pages.length - 1) showPage(pageIdx + 1);
		else input.focus();
	}

	// ---------- Preguntar ----------
	let busy = false;

	async function ask(question: string) {
		question = question.trim();
		if (!question || busy) return;
		busy = true;
		input.value = '';
		cancelAnimationFrame(frame);
		typing = false;
		showChoices(false);
		setIndicator('');
		box.classList.add('thinking');
		textEl.innerHTML = '<span class="navi-dots"><i></i><i></i><i></i></span>';

		let res: Reply;
		try {
			const r = await fetch('/api/navi', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ question, context }),
			});
			if (!r.ok) throw new Error(String(r.status));
			res = await r.json();
		} catch {
			res = { msg: '¡Hey! Algo falló al conectar con el Gran Árbol Deku… Inténtalo de nuevo en un momento.', suggestions: current.suggestions, context };
		}
		box.classList.remove('thinking');
		context = res.context ?? {};
		if (!res.suggestions?.length) res.suggestions = GREETING.suggestions;
		present(res);
		save();
		busy = false;
		input.focus({ preventScroll: true });
	}

	// ---------- Abrir / cerrar ----------
	function open() {
		scene.hidden = false;
		fab.setAttribute('aria-expanded', 'true');
		root!.classList.add('open');
		document.body.classList.add('navi-open');
		callout.hidden = true;
		present(current);
		input.focus({ preventScroll: true });
	}
	function close() {
		cancelAnimationFrame(frame);
		scene.hidden = true;
		fab.setAttribute('aria-expanded', 'false');
		root!.classList.remove('open');
		document.body.classList.remove('navi-open');
		fab.focus({ preventScroll: true });
	}

	fab.addEventListener('click', () => (scene.hidden ? open() : close()));
	root.querySelector('.navi-close')!.addEventListener('click', (e) => { e.stopPropagation(); close(); });
	box.addEventListener('click', advance);
	box.addEventListener('keydown', (e) => {
		if (e.target !== box) return;
		if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
	});
	form.addEventListener('submit', (e) => {
		e.preventDefault();
		// Enter con la caja de texto vacía = continuar leyendo
		if (input.value.trim()) ask(input.value);
		else advance();
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !scene.hidden) close();
	});
	// Si cambia el ancho, se vuelve a paginar la respuesta actual
	let rt: number | undefined;
	window.addEventListener('resize', () => {
		if (scene.hidden) return;
		clearTimeout(rt);
		rt = window.setTimeout(() => present(current), 200);
	});

	// ---------- «¡Hey! ¡Escucha!»: una vez por visita, a los pocos segundos ----------
	let shown = false;
	try { shown = sessionStorage.getItem(CALLOUT_KEY) === '1'; } catch { /* sin almacenamiento */ }
	if (!shown) {
		window.setTimeout(() => {
			if (!scene.hidden) return;
			callout.hidden = false;
			try { sessionStorage.setItem(CALLOUT_KEY, '1'); } catch { /* sin almacenamiento */ }
			window.setTimeout(() => { callout.hidden = true; }, 6000);
		}, 7000);
	}
}
