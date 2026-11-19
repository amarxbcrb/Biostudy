// Comprendre › Wilcoxon-Mann-Whitney : les valeurs deviennent des rangs ; déplace les points pour voir W et p changer.
import { titre, gh, astuce, esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { testW } from '../../js/stats.js';
import { fr, fP, repere, svg, segment, graduations, brancher, chiffres, conclusion, explications, codeR, vec, glisser } from '../../js/dessin.js';

const SIM = { a: [1.2, 2.5, 3.1, 4.4, 5.8, 6.3], b: [3.6, 5.1, 6.9, 7.4, 8.2, 8.8, 9.5] };
const E = { src: 'sim', a: [...SIM.a], b: [...SIM.b] };
let reel = null;

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'On range toutes les valeurs des deux groupes ensemble, de la plus petite à la plus grande, et on ne garde que leur rang. Si un groupe a surtout les petits rangs, les groupes diffèrent.') +
    `<div class="cols side"><div><div class="grp"><div id="fig" class="drag"></div><p class="lgd"><span style="--c:var(--c-blue)"><i></i>Groupe A</span><span style="--c:var(--c-orange)"><i></i>Groupe B</span><span>Fais glisser un point</span></p></div>
    ${gh('Les données')}<div class="grp" id="ctl"><div class="sl2">${segment('src', [['sim', 'À déplacer'], ['reel', 'Vraies données']], E.src)}</div><div id="msg"></div></div></div>
    <div>${gh('Résultat')}<div class="grp" id="res"></div>
    ${explications(['Chaque valeur est remplacée par son rang (1 = la plus petite). Deux valeurs égales (ex aequo) reçoivent la moyenne de leurs rangs.',
      'W = somme des rangs de A − nA (nA + 1) / 2 : c\'est le nombre de paires (a, b) où la valeur de A dépasse celle de B.',
      'Comme le test n\'utilise que les rangs, une valeur extrême ne pèse pas plus qu\'une autre : déplace un point très loin, W ne bouge presque pas.'])}
    <div id="code"></div></div></div>`;
  const fig = vue.querySelector('#fig');
  let R;
  const maj = async () => {
    let a = E.a, b = E.b, code;
    if (E.src === 'reel') {
      try {
        reel ??= await jeu('datasets', 'InsectSprays');
        vue.querySelector('#msg').innerHTML = astuce('Nombre d\'insectes comptés après l\'insecticide C (A) ou D (B), 12 parcelles chacun : données <b>InsectSprays</b> de R, téléchargées depuis Rdatasets. Des comptages : variable discrète, avec des ex aequo.', '', 'database');
      } catch (e) { vue.querySelector('#msg').innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
      const c = reel.col('count'), s = reel.col('spray');
      a = c.filter((_, i) => s[i] === 'C'); b = c.filter((_, i) => s[i] === 'D');
      code = 'avec_C <- InsectSprays$count[InsectSprays$spray == "C"]\navec_D <- InsectSprays$count[InsectSprays$spray == "D"]\nwilcox.test(avec_C, avec_D)';
    } else {
      vue.querySelector('#msg').innerHTML = '';
      code = `A <- ${vec(a)}\nB <- ${vec(b)}\nwilcox.test(A, B)`;
    }
    const r = testW(a, b), tous = [...a, ...b], lo = Math.min(...tous), hi = Math.max(...tous), marge = (hi - lo) * 0.08 || 1;
    R = E.src === 'reel' ? repere(340, 200, lo - marge, hi + marge, 0, 1, { g: 12, d: 12, h: 8, b: 20 }) : repere(340, 200, 0, 10, 0, 1, { g: 12, d: 12, h: 8, b: 20 });
    // points : A en haut, B au milieu ; empilés s'ils sont égaux
    const vu = {}, pile = x => (vu[x] = (vu[x] || 0) + 1) - 1;
    const pts = (v, cls, y, off) => v.map((x, i) => `<circle class="${cls}" ${E.src === 'sim' ? `data-i="${i + off}"` : ''} cx="${R.X(x).toFixed(1)}" cy="${y - pile(cls + x) * 9}" r="${E.src === 'sim' ? 9 : 4.5}"/>`).join('');
    // ligne des rangs : toutes les valeurs triées, colorées par groupe, avec leur rang
    const ordre = tous.map((x, i) => ({ x, g: i < a.length ? 'A' : 'B', r: r.rangs[i] })).sort((p, q) => p.x - q.x || (p.g < q.g ? -1 : 1));
    const pas = (R.L - 24) / ordre.length, yr = 184;
    const rg = ordre.map((o, k) => `<g><circle class="${o.g === 'A' ? 'ra' : 'rb'}" cx="${12 + pas * (k + 0.5)}" cy="${yr}" r="${Math.min(10, pas / 2 - 0.5)}"/><text class="rk" x="${12 + pas * (k + 0.5)}" y="${yr + 3.5}" text-anchor="middle">${String(o.r).replace('.5', '½')}</text></g>`).join('');
    fig.innerHTML = svg(R, `<line class="ax" x1="12" y1="138" x2="${R.L - 12}" y2="138"/>${graduations(R.x0, R.x1, 5).map(t => `<text class="gr" x="${R.X(t)}" y="152" text-anchor="middle">${fr(t)}</text>`).join('')}
      <text class="lb" x="12" y="16">Valeurs</text>${pts(a, 'pa', 60, 0)}${pts(b, 'pb', 118, a.length)}<text class="gl" x="${R.L - 12}" y="30" text-anchor="end">A</text><text class="gl" x="${R.L - 12}" y="92" text-anchor="end">B</text>
      <text class="lb" x="12" y="${yr - 16}">Rangs (1 = plus petite valeur)</text>${rg}`);
    vue.querySelector('#res').innerHTML = chiffres([[fr(r.W, 5), 'W'], [fr(r.R1, 5), 'somme des rangs de A'], [fP(r.p), r.exact ? 'p exacte' : 'p (approx.)']]) +
      conclusion(r.p, 'les deux groupes n\'ont pas la même distribution.', 'rien ne montre que les deux groupes diffèrent.') +
      (r.exAequo ? astuce(`Il y a des ex aequo : ${r.exact ? 'R 4.6 calcule quand même une p-value exacte' : 'R utilise l\'approximation normale avec correction'}.`) : '');
    vue.querySelector('#code').innerHTML = codeR(code);
  };
  glisser(fig, () => R, (i, x) => {
    if (E.src !== 'sim') return;
    x = Math.round(Math.min(10, Math.max(0, x)) * 10) / 10;
    if (i < E.a.length) E.a[i] = x; else E.b[i - E.a.length] = x;
    maj();
  });
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  maj();
}
