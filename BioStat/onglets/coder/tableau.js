// Onglet Lire › Tableau 2 × 2 : Se, Sp, VPP, VPN, OR, RR et IC à 95 %.
import { esc, titre, gh, ico, astuce } from '../../js/app.js';

const Z = 1.96;
const etat = { a: '90', b: '30', c: '10', d: '70' };
const nb = (x, d = 3) => x.toFixed(d).replace('.', ',');
const rt = x => String(Number(x.toFixed(2))).replace('.', ','); // ratio : 2 décimales au plus
const CASES = [['a', 'Test + et malade'], ['b', 'Test + et non malade'], ['c', 'Test − et malade'], ['d', 'Test − et non malade']];

// Proportion k / n avec IC de Wald (approximation normale)
function prop(nom, sigle, k, n, lettres) {
  if (!n) return mesure(nom, sigle, null, `${sigle} = ${lettres} : division par 0, non calculable.`);
  const p = k / n, e = Z * Math.sqrt(p * (1 - p) / n);
  const ic = [Math.max(0, p - e), Math.min(1, p + e)];
  const ok = n * p >= 5 && n * (1 - p) >= 5;
  return mesure(nom, sigle, `${nb(p)} (${nb(p * 100, 1)} %)`,
    `${sigle} = ${lettres} = ${k} / ${n} = ${nb(p)}\nIC 95 % = p ± 1,96 × √(p(1 − p) / n)\n       = ${nb(p)} ± 1,96 × √(${nb(p)} × ${nb(1 - p)} / ${n}) = [${nb(ic[0])} ; ${nb(ic[1])}]`,
    `[${nb(ic[0])} ; ${nb(ic[1])}]`,
    ok ? '' : 'IC approximatif : n·p ≥ 5 et n·(1 − p) ≥ 5 ne sont pas vérifiés (règle usuelle, à vérifier dans ton cours). Un IC exact s\'obtient avec binom.test() dans R.');
}

// Une mesure = une ligne : sigle et nom, valeur, IC, formule avec les valeurs saisies
function mesure(nom, sigle, val, formule, ic = '', alerte = '') {
  return `<div class="row ms"><div class="mh"><b>${esc(sigle)}</b><small>${esc(nom)}</small></div>
    <div class="mh"><span class="mv">${val === null ? '—' : esc(val)}</span>${ic ? `<span class="mi">IC 95 % ${esc(ic)}</span>` : ''}</div>
    <pre class="fm">${esc(formule)}</pre>${alerte ? `<p class="msg err">${esc(alerte)}</p>` : ''}</div>`;
}

function resultats({ a, b, c, d }) {
  const zeros = CASES.filter(([k]) => ({ a, b, c, d })[k] === 0).map(([k]) => k);
  const h = zeros.length ? astuce(`<b>Attention :</b> ${zeros.length > 1 ? 'les cases' : 'la case'} ${zeros.join(', ')} ${zeros.length > 1 ? 'valent' : 'vaut'} 0. ` +
    'L\'OR, le RR ou leur IC peuvent devenir infinis ou non calculables (division par 0, logarithme de 0). Certains cours ajoutent 0,5 à chaque case : à vérifier dans ton cours.', 'warn', 'warn') : '';

  const perf = prop('Sensibilité', 'Se', a, a + c, 'a / (a + c)') + prop('Spécificité', 'Sp', d, b + d, 'd / (b + d)') +
    prop('Valeur prédictive positive', 'VPP', a, a + b, 'a / (a + b)') + prop('Valeur prédictive négative', 'VPN', d, c + d, 'd / (c + d)');

  let or, rr;
  if (b * c === 0) or = mesure('Odds ratio', 'OR', null, 'OR = (a × d) / (b × c) : b × c = 0, division par 0.');
  else {
    const v = a * d / (b * c);
    const txt = `OR = (a × d) / (b × c) = (${a} × ${d}) / (${b} × ${c}) = ${rt(v)}`;
    if (a * d === 0) or = mesure('Odds ratio', 'OR', rt(v), txt + '\nIC de Woolf non calculable : ln(0) n\'existe pas.');
    else {
      const s = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d), ic = [v * Math.exp(-Z * s), v * Math.exp(Z * s)];
      or = mesure('Odds ratio', 'OR', rt(v), `${txt}\nIC 95 % (Woolf) = exp(ln OR ± 1,96 × √(1/a + 1/b + 1/c + 1/d))\n       = exp(ln ${rt(v)} ± 1,96 × ${nb(s)}) = [${rt(ic[0])} ; ${rt(ic[1])}]`, `[${rt(ic[0])} ; ${rt(ic[1])}]`);
    }
  }
  if (!(a + b) || !(c + d) || c === 0) rr = mesure('Risque relatif', 'RR', null, 'RR = [a / (a + b)] / [c / (c + d)] : division par 0.');
  else {
    const v = (a / (a + b)) / (c / (c + d));
    const txt = `RR = [a / (a + b)] / [c / (c + d)] = (${a} / ${a + b}) / (${c} / ${c + d}) = ${rt(v)}`;
    if (a === 0) rr = mesure('Risque relatif', 'RR', rt(v), txt + '\nIC non calculable : ln(0) n\'existe pas.');
    else {
      const s = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d)), ic = [v * Math.exp(-Z * s), v * Math.exp(Z * s)];
      rr = mesure('Risque relatif', 'RR', rt(v), `${txt}\nIC 95 % (log) = exp(ln RR ± 1,96 × √(1/a − 1/(a + b) + 1/c − 1/(c + d)))\n       = exp(ln ${rt(v)} ± 1,96 × ${nb(s)}) = [${rt(ic[0])} ; ${rt(ic[1])}]`, `[${rt(ic[0])} ; ${rt(ic[1])}]`);
    }
  }
  const N = a + b + c + d, sav = [
    `Prévalence dans l'échantillon : (a + c) / N = ${a + c} / ${N} = ${N ? nb((a + c) / N) : '—'}. VPP et VPN dépendent de la prévalence : elles ne se transposent pas à une population où la maladie est plus rare ou plus fréquente.`,
    'Dans une étude cas-témoins, le nombre de malades est fixé par l\'étude : le RR n\'y est pas estimable, seul l\'OR l\'est.',
    'Quand la maladie est rare, l\'OR est proche du RR.',
    'Un IC à 95 % de l\'OR ou du RR qui contient 1 correspond à une association non significative au risque 5 %.'];
  return h + `<div class="cols two"><div>${gh('Performance du test')}<div class="grp">${perf}</div></div>
    <div>${gh('Association')}<div class="grp">${or}${rr}</div>
    ${gh('À savoir')}<div class="grp">${sav.map(x => `<div class="row top">${ico('info')}<div class="t"><p>${esc(x)}</p></div></div>`).join('')}</div></div></div>`;
}

export function afficher(vue) {
  const cellule = k => `<td><label class="cell"><b>${k}</b><input class="in" id="k-${k}" name="${k}" inputmode="numeric" value="${esc(etat[k])}" aria-label="${CASES.find(x => x[0] === k)[1]} (${k})"></label></td>`;
  vue.innerHTML = titre('Tableau 2 × 2', 'Entre les effectifs de ton tableau : BioStat calcule les indicateurs, avec chaque formule écrite avec tes valeurs.') +
    `<div class="narrow">${gh('Tableau de contingence')}<form class="grp" onsubmit="return false">
      <table class="t22"><thead><tr><td></td><th scope="col">Malades</th><th scope="col">Non malades</th><th scope="col">Total</th></tr></thead>
      <tbody><tr><th scope="row">Test +<small>ou exposés</small></th>${cellule('a')}${cellule('b')}<td class="tot" data-t="ab"></td></tr>
      <tr><th scope="row">Test −<small>ou non exposés</small></th>${cellule('c')}${cellule('d')}<td class="tot" data-t="cd"></td></tr>
      <tr><th scope="row">Total</th><td class="tot" data-t="ac"></td><td class="tot" data-t="bd"></td><td class="tot" data-t="n"></td></tr></tbody></table></form>
      <div class="glob" role="alert"></div></div>
    <div class="sortie-calc"></div>`;

  const maj = () => {
    const v = {}, mauvais = [];
    for (const [k] of CASES) {
      const s = etat[k].trim();
      if (!/^\d+$/.test(s)) mauvais.push(k); else v[k] = +s;
      vue.querySelector(`#k-${k}`).toggleAttribute('aria-invalid', !/^\d+$/.test(s));
    }
    const tot = { ab: v.a + v.b, cd: v.c + v.d, ac: v.a + v.c, bd: v.b + v.d, n: v.a + v.b + v.c + v.d };
    vue.querySelectorAll('.tot').forEach(td => (td.textContent = Number.isNaN(tot[td.dataset.t]) ? '' : tot[td.dataset.t]));
    vue.querySelector('.glob').innerHTML = mauvais.length ? astuce(`Case${mauvais.length > 1 ? 's' : ''} ${mauvais.join(', ')} : saisis un effectif, c'est-à-dire un nombre entier positif ou nul.`, 'err', 'warn') : '';
    vue.querySelector('.sortie-calc').innerHTML = mauvais.length ? '' : resultats(v);
  };
  vue.querySelector('form').addEventListener('input', e => { etat[e.target.name] = e.target.value; maj(); });
  maj();
}
