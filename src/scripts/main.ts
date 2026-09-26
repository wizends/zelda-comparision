import { imgSrc } from '../data/chapters';
import { initMusic } from './music';
import { initNavi } from './navi';

type RGB = [number, number, number];

// Pseudoaleatorio con semilla para que el fondo no cambie en cada redibujado
const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- Revelado al hacer scroll (cada mitad a su ritmo) ----------
function initReveal() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18 },
  );
  document.querySelectorAll('.row, .ch-head, .tl-block').forEach((el) => io.observe(el));
}

// ---------- Fondo low-poly (triángulos de color plano) ----------
const PALETTE: [number, RGB][] = [
  [0.0, [22, 22, 92]],
  [0.35, [44, 70, 190]],
  [0.55, [96, 140, 230]],
  [0.62, [70, 128, 60]],
  [0.8, [48, 100, 38]],
  [1.0, [26, 58, 22]],
];

function colorAt(t: number): RGB {
  for (let i = 1; i < PALETTE.length; i++) {
    const [t1, c1] = PALETTE[i];
    const [t0, c0] = PALETTE[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => v + (c1[j] - v) * k) as RGB;
    }
  }
  return PALETTE[PALETTE.length - 1][1];
}

function initLowPoly() {
  const svg = document.querySelector<SVGSVGElement>('.lowpoly');
  if (!svg) return;

  const draw = () => {
    const w = svg.clientWidth || window.innerWidth / 2;
    const h = svg.clientHeight || window.innerHeight;
    const rand = rng(64);
    const cols = Math.max(5, Math.round(w / 110));
    const rows = Math.max(6, Math.round(h / 110));
    const cw = w / cols;
    const rh = h / rows;
    const pts: [number, number][][] = [];
    for (let y = 0; y <= rows; y++) {
      pts.push([]);
      for (let x = 0; x <= cols; x++) {
        const edgeX = x === 0 || x === cols;
        const edgeY = y === 0 || y === rows;
        pts[y].push([
          x * cw + (edgeX ? 0 : (rand() - 0.5) * cw * 0.8),
          y * rh + (edgeY ? 0 : (rand() - 0.5) * rh * 0.8),
        ]);
      }
    }
    let out = '';
    const tri = (a: number[], b: number[], c: number[]) => {
      const cy = (a[1] + b[1] + c[1]) / 3 / h;
      const shade = 0.82 + rand() * 0.36;
      const [r, g, bl] = colorAt(cy).map((v) => Math.min(255, Math.round(v * shade)));
      out += `<polygon points="${a} ${b} ${c}" fill="rgb(${r},${g},${bl})" stroke="rgb(${r},${g},${bl})" stroke-width="0.6"/>`;
    };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const p = pts[y][x], q = pts[y][x + 1], r = pts[y + 1][x], s = pts[y + 1][x + 1];
        if ((x + y) % 2) { tri(p, q, s); tri(p, s, r); } else { tri(p, q, r); tri(q, s, r); }
      }
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = out;
  };

  draw();
  let rt: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = window.setTimeout(draw, 150);
  });
}

// ---------- Hadas flotantes en la mitad remake ----------
function initFairies() {
  const fairies = document.querySelector('.fairies');
  if (!fairies) return;
  const fr = rng(7);
  for (let i = 0; i < 14; i++) {
    const f = document.createElement('span');
    f.style.left = `${fr() * 95}%`;
    f.style.top = `${20 + fr() * 75}%`;
    f.style.setProperty('--d', `${9 + fr() * 10}s`);
    f.style.setProperty('--delay', `${-fr() * 15}s`);
    f.style.setProperty('--dx', `${(fr() - 0.5) * 160}px`);
    f.style.setProperty('--dy', `${-40 - fr() * 120}px`);
    fairies.appendChild(f);
  }
}

// ---------- Modal comparador ----------
function initModal() {
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const cmp = document.getElementById('cmp');
  if (!app || !modal || !cmp) return;

  const range = cmp.querySelector<HTMLInputElement>('.cmp-range')!;
  const imR = cmp.querySelector<HTMLImageElement>('.cmp-remake')!;
  const imN = cmp.querySelector<HTMLImageElement>('.cmp-n64')!;
  const title = document.getElementById('modal-title')!;
  const count = modal.querySelector('.modal-count')!;

  // Lista plana de escenas a partir de las filas renderizadas
  const all = [...app.querySelectorAll<HTMLElement>('.row')].map((row) => ({
    id: row.dataset.id!,
    name: row.dataset.name!,
  }));
  let current = 0;
  let lastFocus: HTMLElement | null = null;

  const setPos = (v: number | string) => cmp.style.setProperty('--pos', `${v}%`);

  function show(i: number) {
    current = (i + all.length) % all.length;
    const s = all[current];
    imR.src = imgSrc(s.id, 'remake');
    imR.alt = `${s.name} (Switch 2)`;
    imN.src = imgSrc(s.id, 'n64');
    imN.alt = `${s.name} (N64)`;
    title.textContent = s.name;
    count.textContent = `${current + 1} / ${all.length}`;
    range.value = '50';
    setPos(50);
  }

  function open(id: string) {
    lastFocus = document.activeElement as HTMLElement | null;
    show(all.findIndex((s) => s.id === id));
    modal!.hidden = false;
    document.body.style.overflow = 'hidden';
    range.focus();
  }

  function close() {
    modal!.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus();
  }

  app.addEventListener('click', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (row) open(row.dataset.id!);
  });
  app.addEventListener('keydown', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('.row');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open(row.dataset.id!);
    }
  });
  range.addEventListener('input', () => setPos(range.value));
  modal.querySelector('.modal-close')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  modal.querySelectorAll<HTMLElement>('.modal-nav').forEach((b) =>
    b.addEventListener('click', () => show(current + Number(b.dataset.dir))),
  );
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'PageDown' || (e.key === 'ArrowRight' && e.shiftKey)) show(current + 1);
    if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && e.shiftKey)) show(current - 1);
  });
}

// ---------- Cronología: la cabecera pasa a ser solo del remake ----------
// Se activa cuando el borde inferior de la cabecera toca el inicio de la sección
// y se deshace al volver a subir por encima.
function initFinale() {
  const topbar = document.querySelector<HTMLElement>('.topbar');
  const section = document.getElementById('cronologia');
  if (!topbar || !section) return;
  const check = () => {
    const reached = section.getBoundingClientRect().top <= topbar.getBoundingClientRect().bottom;
    if (reached === topbar.classList.contains('finale')) return;
    topbar.classList.toggle('finale', reached);
    // La música (si está activa) acompaña el ensamblado de la Trifuerza con un arpegio
    if (reached) window.dispatchEvent(new CustomEvent('oot:finale'));
  };
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  check();
}

initReveal();
initFinale();
initLowPoly();
initFairies();
initModal();
initMusic();
initNavi();
