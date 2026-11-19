// Comprendre › χ² d'indépendance : tableau modifiable, effectifs théoriques et contribution de chaque case.
import { titre, gh, esc } from '../../js/app.js';
import { testChi2 } from '../../js/stats.js';
import { fr, fP, segment, brancher, chiffres, conclusion, explications, codeR } from '../../js/dessin.js';

const EX = { '2x3': { l: ['Licence', 'Master'], c: ['Agro', 'Environ.', 'Santé'], v: [[15, 54, 13], [5, 15, 12]] }, '2x2': { l: ['Fumeur', 'Non fumeur'], c: ['Malade', 'Non malade'], v: [[30, 20], [15, 35]] } };
const E = { taille: '2x3', yates: 'oui', v: { '2x3': EX['2x3'].v.map(l => [...l]), '2x2': EX['2x2'].v.map(l => [...l]) } };

export function afficher(vue, v) {
  vue.innerHTML = titre(v.titre, 'Si les deux variables étaient indépendantes, chaque case contiendrait environ total de la ligne × total de la colonne / effectif total. Le χ² additionne les écarts entre ce qu\'on observe et ces effectifs théoriques.') +
    `<div class="cols side"><div>${gh('Tableau observé · modifie les effectifs')}<div class="grp"><div id="tab"></div></div>
    <div class="grp" id="ctl" style="margin-top:10px"><div class="sl2"><span class="lb">Tableau</span>${segment('taille', [['2x3', '2 × 3'], ['2x2', '2 × 2']], E.taille)}</div>
      <div class="sl2" id="ly"><span class="lb">Correction de Yates</span>${segment('yates', [['oui', 'Oui (R)'], ['non', 'Non']], E.yates)}</div></div></div>
    <div>${gh('Résultat')}<div class="grp" id="res"></div>
    ${explications(['Chaque case affiche l\'effectif observé, l\'effectif théorique (C) et sa part du χ², (O − C)² / C. Plus la case est colorée, plus elle pèse.',
      'Condition usuelle : tous les effectifs théoriques ≥ 5. Sinon, test exact de Fisher.',
      'Sur un tableau 2 × 2, R applique par défaut la correction de Yates (correct = TRUE), qui réduit un peu le χ².'])}
    <div id="code"></div></div></div>`;
  const tab = vue.querySelector('#tab');
  const dessiner = () => {
    const ex = EX[E.taille], T = E.v[E.taille];
    tab.innerHTML = `<table class="chi"><thead><tr><td></td>${ex.c.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${T.map((l, i) => `<tr><th scope="row">${esc(ex.l[i])}</th>${l.map((o, j) =>
      `<td><input class="in" inputmode="numeric" data-i="${i}" data-j="${j}" value="${o}" aria-label="${esc(ex.l[i])}, ${esc(ex.c[j])}"><span class="th" id="e${i}${j}"></span></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    maj();
  };
  const maj = () => {
    const ex = EX[E.taille], T = E.v[E.taille], deux = E.taille === '2x2';
    vue.querySelector('#ly').hidden = !deux;
    if (T.flat().some(x => !(x >= 0) || !Number.isInteger(x)) || T.some(l => !l.some(Boolean)) || T[0].some((_, j) => !T.some(l => l[j]))) {
      vue.querySelector('#res').innerHTML = `<p class="concl no">Entre des effectifs entiers positifs, sans ligne ni colonne entièrement à 0.</p>`;
      return;
    }
    const r = testChi2(T, deux && E.yates === 'oui'), max = Math.max(...r.contrib.flat());
    T.forEach((l, i) => l.forEach((_, j) => {
      const e = tab.querySelector(`#e${i}${j}`);
      e.textContent = `C = ${fr(r.E[i][j])} · ${fr(r.contrib[i][j])}`;
      e.parentNode.style.setProperty('--k', max ? r.contrib[i][j] / max : 0);
      e.classList.toggle('bas', r.E[i][j] < 5);
    }));
    const petit = r.E.flat().some(x => x < 5);
    vue.querySelector('#res').innerHTML = chiffres([[fr(r.x2, 4), 'χ²'], [String(r.ddl), 'ddl'], [fP(r.p), 'p-value']]) +
      conclusion(r.p, 'les deux variables sont liées.', 'rien ne montre un lien entre les deux variables.') +
      (petit ? '<p class="concl no">Un effectif théorique est < 5 (case en rouge) : préfère fisher.test().</p>' : '');
    vue.querySelector('#code').innerHTML = codeR(`tab <- matrix(c(${T.flat().join(', ')}), nrow = ${T.length}, byrow = TRUE,\n              dimnames = list(c(${ex.l.map(x => `"${x}"`).join(', ')}),\n                              c(${ex.c.map(x => `"${x}"`).join(', ')})))\nr <- chisq.test(tab${deux && E.yates === 'non' ? ', correct = FALSE' : ''})\nr\nr$expected   # effectifs théoriques`);
  };
  tab.addEventListener('input', e => { const x = e.target.closest('input'); if (!x) return; E.v[E.taille][+x.dataset.i][+x.dataset.j] = x.value.trim() === '' ? NaN : +x.value; maj(); });
  brancher(vue.querySelector('#ctl'), (id, val) => { E[id] = val; id === 'taille' ? dessiner() : maj(); });
  dessiner();
}
