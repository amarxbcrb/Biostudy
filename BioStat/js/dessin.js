// Briques communes des figures (Comprendre, Coder, Graphiques) (SVG dessiné à la main, curseurs, résultat, glisser des points).
import { esc, gh, ico, blocCode } from './app.js';

// Nombres à la française : 3 chiffres significatifs, puissance de 10 sous 0,001
export const fr = (x, c = 3) => !isFinite(x) ? '—' : (Math.abs(x) >= 1e-3 || x === 0 ? (+x.toPrecision(c)).toLocaleString('fr-FR', { maximumFractionDigits: 6 }) : (() => {
  const e = Math.floor(Math.log10(Math.abs(x))), m = +(x / 10 ** e).toPrecision(2);
  return `${m.toLocaleString('fr-FR')} × 10${String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`;
})());
export const fP = p => p < 2.2e-16 ? '< 2,2 × 10⁻¹⁶' : fr(p);
// « p = 0,021 » ou « p < 2,2 × 10⁻¹⁶ »
export const pEgal = p => p < 2.2e-16 ? 'p < 2,2 × 10⁻¹⁶' : `p = ${fr(p)}`;

// Repère : domaine [x0, x1] × [y0, y1] projeté sur une zone de L × H (marges pour les graduations)
export function repere(L, H, x0, x1, y0, y1, m = { g: 34, d: 10, h: 12, b: 26 }) {
  const X = x => m.g + (x - x0) / (x1 - x0) * (L - m.g - m.d), Y = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.h - m.b);
  return { X, Y, L, H, m, x0, x1, y0, y1, ix: px => x0 + (px - m.g) / (L - m.g - m.d) * (x1 - x0), iy: py => y0 + (H - m.b - py) / (H - m.h - m.b) * (y1 - y0) };
}
// Graduations « rondes » entre a et b
export function graduations(a, b, n = 5) {
  const pas0 = (b - a) / n, p10 = 10 ** Math.floor(Math.log10(pas0)), pas = [1, 2, 2.5, 5, 10].map(k => k * p10).find(k => k >= pas0);
  const t = [];
  for (let v = Math.ceil(a / pas) * pas; v <= b + pas * 1e-9; v += pas) t.push(+v.toFixed(10));
  return t;
}
export function axes(R, { tx = true, ty = false, nx = 5, ny = 4, lx = '', ly = '' } = {}) {
  const { X, Y, x0, x1, y0, y1, L, H, m } = R;
  let s = `<line class="ax" x1="${m.g}" y1="${Y(y0)}" x2="${L - m.d}" y2="${Y(y0)}"/>`;
  if (tx) s += graduations(x0, x1, nx).map(v => `<text class="gr" x="${X(v)}" y="${H - m.b + 15}" text-anchor="middle">${fr(v)}</text>`).join('');
  if (ty) s += `<line class="ax" x1="${m.g}" y1="${Y(y0)}" x2="${m.g}" y2="${m.h}"/>` + graduations(y0, y1, ny).map(v => `<text class="gr" x="${m.g - 5}" y="${Y(v) + 4}" text-anchor="end">${fr(v)}</text>`).join('');
  if (lx) s += `<text class="lb" x="${L - m.d}" y="${H - 2}" text-anchor="end">${esc(lx)}</text>`;
  if (ly) s += `<text class="lb" x="${m.g + 4}" y="${m.h - 2}">${esc(ly)}</text>`;
  return s;
}
// Courbe y = f(x) et aire sous la courbe entre a et b
export const courbe = (R, f, a = R.x0, b = R.x1, n = 160) => Array.from({ length: n + 1 }, (_, i) => { const x = a + (b - a) * i / n; return `${R.X(x).toFixed(1)},${R.Y(Math.min(f(x), R.y1)).toFixed(1)}`; }).join(' ');
export const aire = (R, f, a, b, cls) => a >= b ? '' : `<polygon class="${cls}" points="${R.X(a).toFixed(1)},${R.Y(R.y0)} ${courbe(R, f, a, b, 80)} ${R.X(b).toFixed(1)},${R.Y(R.y0)}"/>`;
export const svg = (R, corps, cls = '') => `<svg class="fig ${cls}" viewBox="0 0 ${R.L} ${R.H}" role="img">${corps}</svg>`;

// Contrôles : curseur (valeur affichée à droite), segment de 2 ou 3 choix
export const curseur = (id, lab, min, max, pas, v, aff = fr) => `<div class="sl2"><label for="${id}">${esc(lab)}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${pas}" value="${v}" style="--v:${(v - min) / (max - min) * 100}%"><output for="${id}">${aff(v)}</output></div>`;
export const segment = (id, opts, cur) => `<div class="seg2" role="radiogroup" id="${id}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === cur}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
// Branche les curseurs d'une zone : met à jour la valeur affichée et le remplissage, puis appelle maj
export function brancher(zone, maj) {
  zone.addEventListener('input', e => {
    const r = e.target.closest('input[type=range]');
    if (!r) return;
    r.style.setProperty('--v', (r.value - r.min) / (r.max - r.min) * 100 + '%');
    maj(r.id, +r.value, r);
  });
  zone.addEventListener('click', e => {
    const b = e.target.closest('.seg2 [data-v]');
    if (!b) return;
    b.parentNode.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-checked', x === b));
    maj(b.parentNode.id, b.dataset.v, b);
  });
}
// Résultat : grands nombres, puis conclusion au risque α
export const chiffres = L => `<div class="stats">${L.map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join('')}</div>`;
export const conclusion = (p, oui, non, a = 0.05) => `<p class="concl ${p < a ? 'ok' : 'no'}"><b>${pEgal(p)} ${p < a ? '<' : '≥'} ${fr(a)} :</b> ${p < a ? oui : non}</p>`;
export const explications = L => gh('Comment le lire') + `<div class="grp">${L.map(t => `<div class="row top">${ico('info')}<div class="t"><p>${t}</p></div></div>`).join('')}</div>`;
export const codeR = code => gh('Le même calcul dans R') + `<div class="grp">${blocCode(code, '', false, true)}</div>`;
export const vec = v => `c(${v.map(x => +x.toFixed(2)).join(', ')})`;

// Glisser des points : zone = conteneur qui reste en place (le SVG dedans est redessiné à chaque mouvement) ;
// data-i sur chaque point ; deplacer(i, x, y) reçoit les coordonnées en unités du repère
export function glisser(zone, getR, deplacer) {
  let i = -1;
  const pos = e => { const s = zone.querySelector('svg'), pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(s.getScreenCTM().inverse()); return [getR().ix(q.x), getR().iy(q.y)]; };
  zone.addEventListener('pointerdown', e => {
    const c = e.target.closest('[data-i]');
    if (!c) return;
    i = +c.dataset.i; zone.setPointerCapture(e.pointerId); e.preventDefault();
  });
  zone.addEventListener('pointermove', e => { if (i >= 0) deplacer(i, ...pos(e)); });
  const fin = () => { i = -1; };
  zone.addEventListener('pointerup', fin); zone.addEventListener('pointercancel', fin);
}
