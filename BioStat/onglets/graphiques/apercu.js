// Graphiques › aperçu : dessine en SVG, avec les vraies données R (Rdatasets), un rendu proche de ggplot2
// pour savoir à quoi s'attendre. Ce n'est pas ggplot2 : tailles et espacements sont approchés.
import { esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { quantile7, moyenne, qt } from '../../js/stats.js';
import { graduations } from '../../js/dessin.js';

// Couleurs par défaut de ggplot2 (scales::hue_pal, vérifiées dans R) pour 2 à 6 groupes
const HUE = { 1: ['#595959'], 2: ['#F8766D', '#00BFC4'], 3: ['#F8766D', '#00BA38', '#619CFF'], 4: ['#F8766D', '#7CAE00', '#00BFC4', '#C77CFF'], 5: ['#F8766D', '#A3A500', '#00BF7D', '#00B0F6', '#E76BF3'], 6: ['#F8766D', '#B79F00', '#00BA38', '#00BFC4', '#619CFF', '#F564E3'] };
const THEMES = {
  grey: { panel: '#EBEBEB', grille: '#FFFFFF', axe: false, cadre: false },
  minimal: { panel: 'none', grille: '#EBEBEB', axe: false, cadre: false },
  classic: { panel: 'none', grille: null, axe: true, cadre: false },
  bw: { panel: '#FFFFFF', grille: '#EBEBEB', axe: false, cadre: '#333333' },
  light: { panel: '#FFFFFF', grille: '#DEDEDE', axe: false, cadre: '#B3B3B3' }
};
const fmt = v => String(+v.toFixed(6));
const txt = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.s || 9}" fill="${o.c || '#4D4D4D'}"${o.a ? ` text-anchor="${o.a}"` : ''}${o.b ? ' font-weight="700"' : ''}${o.r ? ` transform="rotate(${o.r} ${x} ${y})"` : ''}>${esc(t)}</text>`;

export async function charger(spec) {
  const d = await jeu('datasets', spec.jeu);
  return d;
}

// spec : { jeu, geom: boxplot | histogram | point | bar, x, y, fill, colour, points, smooth, bins, couleurs, labels, breaks, ordre, axeLabels,
//          titre, soustitre, xlab, ylab, caption, centre, titreGras, legende: right | bottom | top | none, legendeTitre, nrow1,
//          theme, taille (facteur du texte), titresAxesGras, angle, ylim, histFill, histColour }
export function dessiner(spec, D, L = 340, H = 240) {
  const th = THEMES[spec.theme || 'grey'], k = spec.taille || 1, s = v => +(v * k).toFixed(1);
  const col = n => D.col(n);
  let X = col(spec.x), Y = spec.y ? col(spec.y) : null;
  const grp = spec.fill || spec.colour, G = grp ? col(grp).map(String) : null;
  if (spec.geom !== 'histogram' && spec.geom !== 'point') X = X.map(String);
  // niveaux d'un facteur : ordre alphabétique (comme factor()), ou celui donné par l'utilisateur
  const niveaux = v => spec.ordre && v === X ? spec.ordre : [...new Set(v)].sort((a, b) => isNaN(a) || isNaN(b) ? (a < b ? -1 : a > b ? 1 : 0) : a - b);
  const NX = typeof X[0] === 'string' ? niveaux(X) : null, NG = G ? [...new Set(G)].sort() : null;
  const pal = NG ? (spec.couleurs || HUE[Math.min(6, NG.length)]) : null, colG = g => pal[NG.indexOf(g) % pal.length];
  const etiq = g => spec.labels ? spec.labels[NG.indexOf(g)] : g;
  const ordreLeg = spec.breaks || NG;
  // place de la légende
  const leg = NG && spec.legende !== 'none', legPos = spec.legende || 'right';
  const legW = leg && legPos === 'right' ? (spec.nrow1 ? 60 * NG.length : Math.max(String(spec.legendeTitre ?? grp).length * 5.8 + 6, Math.max(...NG.map(g => String(etiq(g)).length)) * 5.4 + 34)) : 0;
  const legH = leg && legPos !== 'right' ? 26 : 0;
  const hautTitre = (spec.titre ? s(16) : 0) + (spec.soustitre ? s(13) : 0) + (spec.titre || spec.soustitre ? 6 : 6);
  const basCaption = spec.caption ? s(12) : 0;
  const yLabW = s(spec.ylab === '' ? 0 : 14), tickW = s(26), xLabH = s(spec.xlab === '' ? 0 : 14), tickH = spec.angle ? s(38) : s(13);
  const px0 = 6 + yLabW + tickW, px1 = L - 8 - legW - (legW ? 6 : 0);
  const py0 = hautTitre + (legPos === 'top' ? legH : 0), py1 = H - 6 - basCaption - xLabH - tickH - (legPos === 'bottom' ? legH : 0);
  // échelles
  let y0, y1, comptes, bins;
  if (spec.geom === 'histogram') {
    const lo = Math.min(...X), hi = Math.max(...X), n = spec.bins || 30, w = (hi - lo) / (n - 1);
    bins = Array.from({ length: n }, (_, i) => lo - w / 2 + i * w); comptes = bins.map(b => X.filter(x => x >= b && (x < b + w || (b + w >= hi && x <= b + w))).length);
    y0 = 0; y1 = Math.max(...comptes) * 1.05; spec._w = w;
  } else if (spec.geom === 'bar') { comptes = NX.map(l => X.filter(x => x === l).length); y0 = 0; y1 = Math.max(...comptes) * 1.05; }
  else { const lo = Math.min(...Y), hi = Math.max(...Y), m = (hi - lo) * 0.05; [y0, y1] = spec.ylim || [lo - m, hi + m]; }
  const xNum = !NX;
  let x0, x1;
  if (xNum) { const lo = spec.geom === 'histogram' ? bins[0] : Math.min(...X), hi = spec.geom === 'histogram' ? bins.at(-1) + spec._w : Math.max(...X), m = (hi - lo) * 0.05; x0 = lo - m; x1 = hi + m; }
  else { x0 = 0.4; x1 = NX.length + 0.6; }
  const SX = v => px0 + (v - x0) / (x1 - x0) * (px1 - px0), SY = v => py1 - (v - y0) / (y1 - y0) * (py1 - py0);
  const pos = l => SX(NX.indexOf(l) + 1);
  let g = `<rect width="${L}" height="${H}" fill="#fff"/>`;
  if (th.panel !== 'none') g += `<rect x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}" fill="${th.panel}"/>`;
  const ty = graduations(y0, y1, 4), tx = xNum ? graduations(x0, x1, 4) : [];
  if (th.grille) {
    for (const t of ty) g += `<line x1="${px0}" x2="${px1}" y1="${SY(t)}" y2="${SY(t)}" stroke="${th.grille}" stroke-width="1"/>`;
    if (xNum) for (const t of tx) g += `<line y1="${py0}" y2="${py1}" x1="${SX(t)}" x2="${SX(t)}" stroke="${th.grille}" stroke-width="1"/>`;
    else for (const l of NX) g += `<line y1="${py0}" y2="${py1}" x1="${pos(l)}" x2="${pos(l)}" stroke="${th.grille}" stroke-width="1"/>`;
  }
  g += `<svg x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}" overflow="hidden"><g transform="translate(${-px0} ${-py0})">`;
  // géométries
  if (spec.geom === 'boxplot') {
    const larg = (px1 - px0) / (x1 - x0) * 0.75;
    for (const l of NX) {
      const v = Y.filter((_, i) => X[i] === l), q = [0.25, 0.5, 0.75].map(p => quantile7(v, p)), e = 1.5 * (q[2] - q[0]);
      const dans = v.filter(y => y >= q[0] - e && y <= q[2] + e), out = v.filter(y => y < q[0] - e || y > q[2] + e), c = pos(l);
      const f = grp ? colG(G[X.indexOf(l)]) : '#FFFFFF';
      g += `<line x1="${c}" x2="${c}" y1="${SY(Math.min(...dans))}" y2="${SY(q[0])}" stroke="#333" /><line x1="${c}" x2="${c}" y1="${SY(q[2])}" y2="${SY(Math.max(...dans))}" stroke="#333"/>
        <rect x="${c - larg / 2}" y="${SY(q[2])}" width="${larg}" height="${SY(q[0]) - SY(q[2])}" fill="${f}" stroke="#333"/><line x1="${c - larg / 2}" x2="${c + larg / 2}" y1="${SY(q[1])}" y2="${SY(q[1])}" stroke="#333" stroke-width="2"/>`;
      if (!spec.points) g += out.map(y => `<circle cx="${c}" cy="${SY(y)}" r="2" fill="#333"/>`).join('');
      if (spec.points) g += v.map((y, i) => `<circle cx="${c + ((i * 7919) % 100 / 100 - 0.5) * larg * 0.4}" cy="${SY(y)}" r="1.8" fill="#000"/>`).join('');
    }
  } else if (spec.geom === 'histogram') {
    comptes.forEach((n, i) => { if (n) g += `<rect x="${SX(bins[i])}" y="${SY(n)}" width="${SX(bins[i] + spec._w) - SX(bins[i])}" height="${SY(0) - SY(n)}" fill="${spec.histFill || '#595959'}" stroke="${spec.histColour || 'none'}" stroke-width="0.6"/>`; });
  } else if (spec.geom === 'bar') {
    const larg = (px1 - px0) / (x1 - x0) * 0.9;
    NX.forEach((l, i) => { g += `<rect x="${pos(l) - larg / 2}" y="${SY(comptes[i])}" width="${larg}" height="${SY(0) - SY(comptes[i])}" fill="#595959"/>`; });
  } else if (spec.geom === 'point') {
    if (spec.smooth) {
      const n = X.length, mx = moyenne(X), my = moyenne(Y), sxx = X.reduce((a, x) => a + (x - mx) ** 2, 0), b = X.reduce((a, x, i) => a + (x - mx) * (Y[i] - my), 0) / sxx, a0 = my - b * mx;
      const se = Math.sqrt(X.reduce((a, x, i) => a + (Y[i] - a0 - b * x) ** 2, 0) / (n - 2)), q = qt(0.975, n - 2), lo = Math.min(...X), hi = Math.max(...X);
      const xs = Array.from({ length: 41 }, (_, i) => lo + (hi - lo) * i / 40), bande = x => q * se * Math.sqrt(1 / n + (x - mx) ** 2 / sxx);
      g += `<polygon points="${xs.map(x => `${SX(x)},${SY(a0 + b * x + bande(x))}`).join(' ')} ${xs.reverse().map(x => `${SX(x)},${SY(a0 + b * x - bande(x))}`).join(' ')}" fill="#999" fill-opacity=".4"/>
        <line x1="${SX(lo)}" y1="${SY(a0 + b * lo)}" x2="${SX(hi)}" y2="${SY(a0 + b * hi)}" stroke="#3366FF" stroke-width="2"/>`;
    }
    g += X.map((x, i) => `<circle cx="${SX(x)}" cy="${SY(Y[i])}" r="2.2" fill="${G ? colG(G[i]) : '#000'}"/>`).join('');
  }
  g += '</g></svg>';
  if (th.cadre) g += `<rect x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}" fill="none" stroke="${th.cadre}"/>`;
  if (th.axe) g += `<line x1="${px0}" x2="${px0}" y1="${py0}" y2="${py1}" stroke="#000"/><line x1="${px0}" x2="${px1}" y1="${py1}" y2="${py1}" stroke="#000"/>`;
  // graduations et titres des axes
  const ts = s(spec.tailleAxe || 8), tc = '#4D4D4D';
  for (const t of ty) g += `<line x1="${px0 - 3}" x2="${px0}" y1="${SY(t)}" y2="${SY(t)}" stroke="#333"/>` + txt(px0 - 5, SY(t) + 3, fmt(t), { s: ts, c: tc, a: 'end' });
  const ticksX = xNum ? tx.map(t => [SX(t), fmt(t)]) : NX.map((l, i) => [pos(l), spec.axeLabels ? spec.axeLabels[i] : l]);
  for (const [x, t] of ticksX) g += `<line x1="${x}" x2="${x}" y1="${py1}" y2="${py1 + 3}" stroke="#333"/>` + (spec.angle ? txt(x, py1 + 11, t, { s: ts, c: tc, a: 'end', r: -spec.angle }) : txt(x, py1 + 12, t, { s: ts, c: tc, a: 'middle' }));
  const xl = spec.xlab ?? spec.x, yl = spec.ylab ?? (spec.y || 'count');
  const tA = s(spec.tailleTitreAxe || 10);
  if (xl) g += txt((px0 + px1) / 2, py1 + tickH + xLabH - 2, xl, { s: tA, c: '#000', a: 'middle', b: spec.titresAxesGras });
  if (yl) g += txt(6 + yLabW * 0.7, (py0 + py1) / 2, yl, { s: tA, c: '#000', a: 'middle', r: -90, b: spec.titresAxesGras });
  // titres
  const tX = spec.centre ? (px0 + px1) / 2 : px0, tA2 = spec.centre ? 'middle' : 'start';
  if (spec.titre) g += txt(tX, s(14), spec.titre, { s: s(spec.titreTaille || 11.5), c: '#000', a: tA2, b: spec.titreGras });
  if (spec.soustitre) g += txt(tX, s(spec.titre ? 28 : 14), spec.soustitre, { s: s(9.5), c: '#333', a: tA2 });
  if (spec.caption) g += txt(L - 8, H - 5, spec.caption, { s: s(8), c: '#333', a: 'end' });
  // légende
  if (leg) {
    const titreL = spec.legendeTitre ?? grp, carre = spec.geom === 'point' ? (c, x, y) => `<circle cx="${x + 6}" cy="${y + 6}" r="3" fill="${c}"/>` : (c, x, y) => `<rect x="${x}" y="${y}" width="12" height="12" fill="${c}" stroke="#333" stroke-width=".6"/>`;
    if (legPos === 'right' && !spec.nrow1) {
      const lx = px1 + 12, ly = (py0 + py1) / 2 - (ordreLeg.length * 17 + 14) / 2;
      g += txt(lx, ly + 9, titreL, { s: s(9.5), c: '#000' }) + ordreLeg.map((l, i) => carre(colG(l), lx, ly + 16 + i * 17) + txt(lx + 17, ly + 26 + i * 17, etiq(l), { s: s(8.5), c: '#000' })).join('');
    } else {
      const items = ordreLeg.map(l => [l, String(etiq(l))]), larg = items.reduce((a, [, t]) => a + t.length * 5.2 + 24, 0) + String(titreL).length * 5.6 + 8;
      let lx = legPos === 'right' ? px1 + 8 : Math.max(4, (L - larg) / 2);
      const ly = legPos === 'top' ? py0 - legH + 4 : legPos === 'right' ? (py0 + py1) / 2 - 6 : H - 6 - basCaption - legH + 8;
      g += txt(lx, ly + 10, titreL, { s: s(9.5), c: '#000' }); lx += String(titreL).length * 5.6 + 8;
      for (const [l, t] of items) { g += carre(colG(l), lx, ly) + txt(lx + 16, ly + 10, t, { s: s(8.5), c: '#000' }); lx += t.length * 5.2 + 24; }
    }
  }
  return `<svg class="gg" viewBox="0 0 ${L} ${H}" role="img" aria-label="Aperçu du graphique">${g}</svg>`;
}
