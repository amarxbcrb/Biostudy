// Comprendre › p-value et risque α : sous la loi normale (H0 vraie), zone de rejet et aire de la p-value.
import { titre, gh } from '../../js/app.js';
import { dnorm, pnorm, qnorm } from '../../js/stats.js';
import { fr, fP, repere, axes, courbe, aire, svg, curseur, segment, brancher, chiffres, conclusion, explications, codeR } from '../../js/dessin.js';

const E = { z: 1.8, a: '0.05', h: 'bi' };

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'Si H0 est vraie, la statistique suit une loi connue (ici la loi normale). La p-value est l\'aire au-delà de la valeur observée : plus elle est petite, plus l\'observation est surprenante sous H0.') +
    `<div class="cols side"><div><div class="grp"><div id="fig"></div><p class="lgd"><span style="--c:var(--c-pink)"><i></i>Zone de rejet (aire = α)</span><span style="--c:var(--acc)"><i></i>p-value</span></p></div>
    ${gh('Règle le test')}<div class="grp" id="ctl">${curseur('z', 'Statistique observée z', -4, 4, 0.01, E.z)}
      <div class="sl2"><span class="lb">Risque α</span>${segment('a', [['0.01', '1 %'], ['0.05', '5 %'], ['0.1', '10 %']], E.a)}</div>
      <div class="sl2"><span class="lb">H1</span>${segment('h', [['bi', 'Bilatéral'], ['sup', '>'], ['inf', '<']], E.h)}</div></div></div>
    <div>${gh('Résultat')}<div class="grp" id="res"></div>
    ${explications(['La courbe montre les valeurs de z qu\'on obtiendrait si H0 était vraie : presque toujours entre −2 et 2.',
      'Bilatéral : on regarde les deux côtés, la p-value est doublée. Unilatéral : un seul côté, choisi <b>avant</b> de voir les données.',
      'On rejette H0 quand z tombe dans la zone de rejet, c\'est-à-dire exactement quand p < α.'])}
    <div id="code"></div></div></div>`;
  const maj = () => {
    const a = +E.a, z = E.z;
    const p = E.h === 'bi' ? 2 * pnorm(-Math.abs(z)) : E.h === 'sup' ? pnorm(-z) : pnorm(z);
    const c = E.h === 'bi' ? qnorm(1 - a / 2) : qnorm(1 - a);
    const R = repere(340, 170, -4, 4, 0, 0.42, { g: 8, d: 8, h: 10, b: 24 });
    const rej = (E.h !== 'sup' ? aire(R, dnorm, -4, -c, 'rej') : '') + (E.h !== 'inf' ? aire(R, dnorm, c, 4, 'rej') : '');
    const pv = E.h === 'bi' ? aire(R, dnorm, -4, -Math.abs(z), 'pv') + aire(R, dnorm, Math.abs(z), 4, 'pv') : E.h === 'sup' ? aire(R, dnorm, z, 4, 'pv') : aire(R, dnorm, -4, z, 'pv');
    vue.querySelector('#fig').innerHTML = svg(R, `${rej}${pv}<polyline class="cn" points="${courbe(R, dnorm)}"/>${axes(R)}
      <line class="obs" x1="${R.X(z)}" y1="${R.Y(0)}" x2="${R.X(z)}" y2="${R.m.h}"/><text class="et" x="${R.X(z)}" y="${R.m.h + 2}" text-anchor="${z > 2.5 ? 'end' : z < -2.5 ? 'start' : 'middle'}">z = ${fr(z)}</text>`);
    vue.querySelector('#res').innerHTML = chiffres([[fP(p), 'p-value'], [(E.h === 'bi' ? '± ' : E.h === 'inf' ? '−' : '') + fr(c), 'seuil de z'], [fr(a * 100) + ' %', 'α']]) +
      conclusion(p, 'z tombe dans la zone de rejet : on rejette H0.', 'z reste hors de la zone de rejet : on ne rejette pas H0 (ce qui ne prouve pas qu\'elle est vraie).', a);
    vue.querySelector('#code').innerHTML = codeR(`z <- ${z}\n${E.h === 'bi' ? '2 * pnorm(-abs(z))   # p bilatérale' : E.h === 'sup' ? 'pnorm(z, lower.tail = FALSE)   # p unilatérale, H1 : >' : 'pnorm(z)   # p unilatérale, H1 : <'}\nqnorm(${E.h === 'bi' ? 1 - a / 2 : 1 - a})   # seuil de z`);
  };
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  maj();
}
