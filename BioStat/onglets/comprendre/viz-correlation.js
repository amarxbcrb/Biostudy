// Comprendre › Corrélation : déplace les points, ajoute une valeur aberrante ; r de Pearson (et p), ρ de Spearman.
import { titre, gh, ico, astuce, esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { pearson, spearman } from '../../js/stats.js';
import { fr, fP, repere, axes, svg, segment, brancher, chiffres, conclusion, explications, codeR, vec, glisser } from '../../js/dessin.js';

const BASE = [[1, 2.2], [2, 2.8], [3, 3.9], [4, 4.1], [5, 5.6], [6, 5.4], [7, 6.9], [8, 7.3], [9, 8.6], [10, 8.9]];
const E = { src: 'sim', pts: BASE.map(p => [...p]), aberrant: false };
let reel = null;
const force = r => Math.abs(r) >= 0.5 ? 'forte' : 'faible';

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'r de Pearson mesure un lien <b>linéaire</b> (une droite) ; ρ de Spearman, un lien <b>monotone</b> (qui monte ou descend toujours), calculé sur les rangs. Fais glisser les points.') +
    `<div class="cols side"><div><div class="grp"><div id="fig" class="drag"></div></div>
    ${gh('Les données')}<div class="grp" id="ctl"><div class="sl2">${segment('src', [['sim', 'À déplacer'], ['reel', 'Vraies données']], E.src)}</div>
      <div id="sim"><button type="button" class="opt" id="ab"><span>${E.aberrant ? 'Retirer' : 'Ajouter'} une valeur aberrante</span>${ico('warn')}</button><button type="button" class="opt" id="raz"><span>Remettre les points</span>${ico('reset')}</button></div><div id="msg"></div></div></div>
    <div>${gh('Résultat')}<div class="grp" id="res"></div>
    ${explications(['r va de −1 (droite descendante parfaite) à 1 (droite montante parfaite) ; 0 : pas de lien linéaire. Repère usuel : |r| < 0,5 lien faible, |r| ≥ 0,5 lien fort.',
      'Une seule valeur aberrante peut faire chuter (ou gonfler) r ; ρ, calculé sur les rangs, résiste mieux.',
      'On rapporte le coefficient et la p-value. Et une corrélation, même forte, ne prouve pas une cause.'])}
    <div id="code"></div></div></div>`;
  const fig = vue.querySelector('#fig');
  let R;
  const maj = async () => {
    vue.querySelector('#sim').hidden = E.src === 'reel';
    let P = E.pts, code, nx = 'x', ny = 'y';
    if (E.src === 'reel') {
      try {
        reel ??= await jeu('datasets', 'women');
        vue.querySelector('#msg').innerHTML = astuce('Taille (pouces) et poids (livres) de 15 femmes américaines : données <b>women</b> de R, téléchargées depuis Rdatasets.', '', 'database');
      } catch (e) { vue.querySelector('#msg').innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
      P = reel.col('height').map((h, i) => [h, reel.col('weight')[i]]); nx = 'taille'; ny = 'poids';
      code = 'cor.test(women$height, women$weight)\ncor(women$height, women$weight, method = "spearman")';
    } else {
      vue.querySelector('#msg').innerHTML = '';
      if (E.aberrant) P = [...P, [10, 1]];
      code = `x <- ${vec(P.map(p => p[0]))}\ny <- ${vec(P.map(p => p[1]))}\ncor.test(x, y)\ncor(x, y, method = "spearman")`;
    }
    const x = P.map(p => p[0]), y = P.map(p => p[1]), r = pearson(x, y), rho = spearman(x, y);
    const [x0, x1, y0, y1] = E.src === 'reel' ? [56, 74, 110, 170] : [0, 11, 0, 11];
    R = repere(340, 260, x0, x1, y0, y1, { g: 34, d: 10, h: 12, b: 26 });
    const pts = P.map(([a, b], i) => `<circle class="${E.src === 'sim' && i === BASE.length ? 'pab' : 'pt'}" ${E.src === 'sim' ? `data-i="${i}"` : ''} cx="${R.X(a).toFixed(1)}" cy="${R.Y(b).toFixed(1)}" r="${E.src === 'sim' ? 9 : 4.5}"/>`).join('');
    fig.innerHTML = svg(R, `<line class="ref" x1="${R.X(x0)}" y1="${R.Y(r.ord + r.pente * x0)}" x2="${R.X(x1)}" y2="${R.Y(r.ord + r.pente * x1)}"/>${axes(R, { ty: true, lx: nx, ly: ny })}${pts}`, 'clip');
    vue.querySelector('#res').innerHTML = chiffres([[fr(r.r, 3), 'r de Pearson'], [fP(r.p), 'p (Pearson)'], [fr(rho, 3), 'ρ de Spearman']]) +
      conclusion(r.p, `lien linéaire ${r.r > 0 ? 'positif' : 'négatif'} et ${force(r.r)} (r = ${fr(r.r)}).`, `rien ne montre un lien linéaire (r = ${fr(r.r)}).`) +
      astuce('La p-value de Spearman se lit dans R (cor.test(…, method = "spearman")) : elle utilise une loi exacte des rangs.');
    vue.querySelector('#code').innerHTML = codeR(code);
  };
  glisser(fig, () => R, (i, a, b) => {
    if (E.src !== 'sim') return;
    const c = v => Math.round(Math.min(11, Math.max(0, v)) * 10) / 10;
    if (i < E.pts.length) E.pts[i] = [c(a), c(b)];
    maj();
  });
  vue.querySelector('#ab').addEventListener('click', e => { E.aberrant = !E.aberrant; e.currentTarget.querySelector('span').textContent = E.aberrant ? 'Retirer la valeur aberrante' : 'Ajouter une valeur aberrante'; maj(); });
  vue.querySelector('#raz').addEventListener('click', () => { E.pts = BASE.map(p => [...p]); maj(); });
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  maj();
}
