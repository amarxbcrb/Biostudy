// Comprendre › ANOVA à 2 facteurs : effet du facteur A, du facteur B et de leur interaction (graphique d'interaction).
import { titre, gh, astuce, esc } from '../../js/app.js';
import { jeu } from '../../js/rdatasets.js';
import { anova2, echantillon } from '../../js/stats.js';
import { fr, pEgal, repere, axes, svg, curseur, segment, brancher, explications, codeR, vec } from '../../js/dessin.js';

const E = { src: 'sim', ea: 1.5, eb: 1, ei: 0, br: 1 };
const LA = ['A1', 'A2'], LB = ['B1', 'B2', 'B3'], R5 = 5;
// un seul tirage de 30 valeurs (moyenne 0, écart-type 1) réparti dans les 6 cases : un peu de bruit dans chaque moyenne, comme dans la réalité
const TIRAGE = echantillon(30, 0, 1, 40), BRUIT = Array.from({ length: 6 }, (_, k) => TIRAGE.slice(5 * k, 5 * k + 5));
let reel = null;

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'Deux facteurs croisés : l\'ANOVA teste l\'effet de chacun et leur <b>interaction</b>. Il y a interaction quand l\'effet d\'un facteur change selon le niveau de l\'autre : sur le graphique, les lignes ne sont plus parallèles.') +
    `<div class="cols side"><div><div class="grp"><div id="fig"></div><p class="lgd"><span style="--c:var(--c-blue)"><i></i><b id="la1">A1</b></span><span style="--c:var(--c-orange)"><i></i><b id="la2">A2</b></span><span>Points : valeurs ; traits : moyennes</span></p></div>
    ${gh('Règle les effets')}<div class="grp" id="ctl"><div class="sl2">${segment('src', [['sim', 'Simulées'], ['reel', 'Vraies données']], E.src)}</div>
      <div id="sim">${curseur('ea', 'Effet du facteur A', 0, 4, 0.1, E.ea)}${curseur('eb', 'Effet du facteur B', 0, 3, 0.1, E.eb)}${curseur('ei', 'Interaction A × B', -3, 3, 0.1, E.ei)}${curseur('br', 'Dispersion', 0.3, 3, 0.1, E.br)}</div><div id="msg"></div></div></div>
    <div>${gh('Table d\'ANOVA')}<div class="grp" id="res"></div>
    ${explications(['Effet de A : la ligne orange est-elle globalement au-dessus de la bleue ? Effet de B : les lignes montent-elles de B1 à B3 ?',
      'Interaction : l\'écart entre les deux lignes change d\'un niveau de B à l\'autre. Mets « Interaction » à 0 : les lignes deviennent parallèles et l\'interaction n\'est plus significative.',
      'Quand l\'interaction est significative, on ne conclut pas sur un facteur seul : on décrit les moyennes de chaque case.'])}
    <div id="code"></div></div></div>`;
  const maj = async () => {
    vue.querySelector('#sim').hidden = E.src === 'reel';
    let y = [], a = [], b = [], la = LA, lb = LB, nomA = 'A', nomB = 'B', code;
    if (E.src === 'reel') {
      try {
        reel ??= await jeu('datasets', 'ToothGrowth');
        vue.querySelector('#msg').innerHTML = astuce('Longueur des odontoblastes de 60 cobayes selon le supplément (A : OJ jus d\'orange, VC acide ascorbique) et la dose (B : 0,5 ; 1 ; 2 mg/jour). Données <b>ToothGrowth</b> de R, téléchargées depuis Rdatasets.', '', 'database');
      } catch (e) { vue.querySelector('#msg').innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
      y = reel.col('len'); a = reel.col('supp'); b = reel.col('dose').map(String); la = ['OJ', 'VC']; lb = ['0.5', '1', '2']; nomA = 'supplément'; nomB = 'dose';
      code = 'ToothGrowth$dose <- factor(ToothGrowth$dose)\nsummary(aov(len ~ supp * dose, data = ToothGrowth))\ninteraction.plot(ToothGrowth$dose, ToothGrowth$supp, ToothGrowth$len)';
    } else {
      vue.querySelector('#msg').innerHTML = '';
      LA.forEach((A, i) => LB.forEach((B, j) => BRUIT[3 * i + j].forEach(z => {
        y.push(Math.round((10 + E.ea * (i - 0.5) + E.eb * j + E.ei * (i - 0.5) * (j - 1) + E.br * z) * 100) / 100); a.push(A); b.push(B);
      })));
      code = `donnees <- data.frame(\n  y = ${vec(y)},\n  A = rep(c("A1", "A2"), each = 15),\n  B = rep(rep(c("B1", "B2", "B3"), each = 5), times = 2))\nmodele <- aov(y ~ A * B, data = donnees)\nsummary(modele)\ninteraction.plot(donnees$B, donnees$A, donnees$y)`;
    }
    vue.querySelector('#la1').textContent = la[0]; vue.querySelector('#la2').textContent = la[1];
    const r = anova2(y, a, b), M = r.moyennes.cell, lo = Math.min(...y), hi = Math.max(...y), mg = (hi - lo) * 0.08 || 1;
    const R = repere(340, 230, -0.4, lb.length - 0.6, lo - mg, hi + mg, { g: 34, d: 12, h: 12, b: 26 });
    const col = ['blue', 'orange'], dx = [-9, 9];
    const pts = y.map((v, i) => { const k = la.indexOf(a[i]), j = lb.indexOf(b[i]); return `<circle class="${k ? 'pb' : 'pa'}" cx="${(R.X(j) + dx[k] + ((i % 5) - 2) * 2.4).toFixed(1)}" cy="${R.Y(v).toFixed(1)}" r="2.6" fill-opacity=".45"/>`; }).join('');
    const lignes = la.map((A, k) => `<polyline fill="none" stroke="var(--c-${col[k]})" stroke-width="3" stroke-linejoin="round" points="${lb.map((B, j) => `${R.X(j) + dx[k]},${R.Y(M[A + '\u0001' + B])}`).join(' ')}"/>` +
      lb.map((B, j) => `<circle cx="${R.X(j) + dx[k]}" cy="${R.Y(M[A + '\u0001' + B])}" r="5" fill="var(--c-${col[k]})"/>`).join('')).join('');
    vue.querySelector('#fig').innerHTML = svg(R, `${axes(R, { tx: false, ty: true, ny: 4 })}${lb.map((B, j) => `<text class="gr" x="${R.X(j)}" y="${R.H - 8}" text-anchor="middle">${esc(B)}</text>`).join('')}${pts}${lignes}`);
    const L = [[`Facteur A (${nomA})`, r.A], [`Facteur B (${nomB})`, r.B], ['Interaction A × B', r.AB]];
    vue.querySelector('#res').innerHTML = L.map(([n, x]) => `<div class="row"><div class="t"><b>${n}</b><small>F(${x.df} ; ${r.E.df}) = ${fr(x.F, 4)}</small></div><span class="dv ${x.p < 0.05 ? 'sig' : ''}">${pEgal(x.p)}</span></div>`).join('') +
      `<p class="concl ${r.AB.p < 0.05 ? 'ok' : 'no'}">${r.AB.p < 0.05 ? '<b>Interaction significative :</b> l\'effet de A dépend du niveau de B. Décris les moyennes case par case.' : `<b>Pas d'interaction significative :</b> on peut lire les effets principaux. ${[r.A.p < 0.05 ? 'A a un effet' : 'A n\'a pas d\'effet significatif', r.B.p < 0.05 ? 'B a un effet' : 'B n\'a pas d\'effet significatif'].join(' ; ')}.`}</p>`;
    vue.querySelector('#code').innerHTML = codeR(code);
  };
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; maj(); });
  maj();
}
