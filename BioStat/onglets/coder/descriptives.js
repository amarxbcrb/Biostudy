// Coder › Statistiques descriptives : moyenne, médiane, écart-type, quartiles… comme R (summary, sd, IQR),
// pour une série ou par groupe, avec boîte à moustaches, histogramme et phrases pour le rapport.
import { esc, titre, gh, ico, astuce } from '../../js/app.js';
import { descriptives, moyenne, lireValeurs, cinqNombres } from '../../js/stats.js';
import { repere, axes, svg, codeR } from '../../js/dessin.js';

const EX = 'Glycémie : 1,05 0,98 1,12 1,20 0,95 1,08 1,15 1,02 1,10 0,99 1,18 1,07';
let texte = EX, unite = 'g/L';

// 4 chiffres significatifs, à la française
const f4 = x => !isFinite(x) ? '—' : (+x.toPrecision(4)).toLocaleString('fr-FR', { maximumFractionDigits: 10 });

function figure(groupes) {
  const tous = groupes.flatMap(g => g.v), lo = Math.min(...tous), hi = Math.max(...tous), m = (hi - lo) * 0.06 || 1;
  const k = groupes.length, H = 70 + 46 * k, R = repere(340, H, lo - m, hi + m, 0, k, { g: groupes[0].nom ? 70 : 12, d: 12, h: 8, b: 26 });
  const couleurs = ['blue', 'orange', 'purple', 'teal', 'pink', 'indigo', 'brown'];
  const boites = groupes.map((g, i) => {
    const c = cinqNombres(g.v), y = R.Y(k - i - 0.5), col = `var(--c-${couleurs[i % 7]})`;
    return `<g style="--gc:${col}"><line class="mo" x1="${R.X(c.moustaches[0])}" x2="${R.X(c.moustaches[1])}" y1="${y}" y2="${y}"/>
      <rect class="bo" x="${R.X(c.h[1])}" y="${y - 13}" width="${Math.max(1, R.X(c.h[3]) - R.X(c.h[1]))}" height="26" rx="6"/>
      <line class="me" x1="${R.X(c.h[2])}" x2="${R.X(c.h[2])}" y1="${y - 13}" y2="${y + 13}"/><circle class="moy" cx="${R.X(moyenne(g.v))}" cy="${y}" r="3.5"/>
      ${c.atyp.map(a => `<circle class="at" cx="${R.X(a)}" cy="${y}" r="3.5"/>`).join('')}
      ${g.nom ? `<text class="lb" x="${R.m.g - 8}" y="${y + 4}" text-anchor="end">${esc(g.nom.length > 10 ? g.nom.slice(0, 9) + '…' : g.nom)}</text>` : ''}</g>`;
  }).join('');
  let hist = '';
  if (k === 1) {
    const v = groupes[0].v, nb = Math.ceil(Math.log2(v.length) + 1), w = (hi - lo) / nb || 1, cpt = Array(nb).fill(0);
    v.forEach(x => cpt[Math.min(nb - 1, Math.floor((x - lo) / w))]++);
    const Hh = repere(340, 130, lo - m, hi + m, 0, Math.max(...cpt), { g: 12, d: 12, h: 8, b: 26 });
    hist = svg(Hh, cpt.map((c, i) => `<rect class="bar" x="${Hh.X(lo + i * w) + 1}" y="${Hh.Y(c)}" width="${Math.max(0, Hh.X(lo + (i + 1) * w) - Hh.X(lo + i * w) - 2)}" height="${Hh.Y(0) - Hh.Y(c)}" rx="3"/>`).join('') + axes(Hh, { nx: 5 }));
  }
  return svg(R, boites + axes(R, { nx: 5 })) + hist + `<p class="lgd"><span>Boîte : Q1 à Q3</span><span>Trait : médiane</span><span style="--c:var(--tx)"><i></i>moyenne</span><span style="--c:var(--c-pink)"><i></i>valeur atypique</span></p>`;
}

// Phrases d'interprétation pour une série
function phrases(d, c, u) {
  const U = u ? ' ' + u : '', P = [];
  const ecart = d.moyenne - d.mediane;
  P.push(d.n < 3 ? 'Trop peu de valeurs pour décrire la forme de la distribution.'
    : Math.abs(ecart) <= 0.1 * d.sd ? `La moyenne (${f4(d.moyenne)}${U}) et la médiane (${f4(d.mediane)}${U}) sont proches : la distribution paraît à peu près symétrique.`
    : ecart > 0 ? `La moyenne (${f4(d.moyenne)}${U}) est supérieure à la médiane (${f4(d.mediane)}${U}) : la distribution est étirée vers les grandes valeurs (asymétrie à droite). La médiane et l'écart interquartile la décrivent mieux.`
    : `La moyenne (${f4(d.moyenne)}${U}) est inférieure à la médiane (${f4(d.mediane)}${U}) : la distribution est étirée vers les petites valeurs (asymétrie à gauche). La médiane et l'écart interquartile la décrivent mieux.`);
  P.push(`La moitié centrale des valeurs se situe entre ${f4(d.q1)} et ${f4(d.q3)}${U} (écart interquartile : ${f4(d.iqr)}${U}) ; l'écart-type vaut ${f4(d.sd)}${U}, soit un coefficient de variation de ${f4(d.cv)} %.`);
  P.push(c.atyp.length ? `${c.atyp.length === 1 ? 'Une valeur est atypique' : `${c.atyp.length} valeurs sont atypiques`} selon la règle de la boîte à moustaches (plus de 1,5 fois la hauteur de la boîte au-delà de ses bords) : ${c.atyp.map(f4).join(' ; ')}${U}. Vérifie qu'il ne s'agit pas d'une erreur de saisie avant de l'exclure.`
    : 'Aucune valeur atypique selon la règle de la boîte à moustaches.');
  P.push(`L'intervalle de confiance à 95 % de la moyenne va de ${f4(d.ic[0])} à ${f4(d.ic[1])}${U} : c'est la précision de l'estimation de la moyenne, pas l'étendue des valeurs.`);
  return P;
}

export function afficher(vue) {
  vue.innerHTML = titre('Statistiques descriptives', 'Colle tes valeurs : BioStat calcule moyenne, médiane, écart-type, quartiles… avec les mêmes définitions que R, et rédige les phrases pour ton rapport.') +
    `<div class="cols side"><div>${gh('Tes valeurs')}<form class="grp" onsubmit="return false"><div style="padding:12px 12px 4px"><textarea class="ta" id="dv" rows="7" spellcheck="false" aria-label="Valeurs" style="min-height:150px"></textarea></div>
      <div class="vr"><label for="du">Unité (facultatif)</label><input class="in" id="du" value="${esc(unite)}" placeholder="g/L, mm, s…" autocomplete="off"></div></form>
      ${astuce('Sépare les valeurs par des espaces, des retours à la ligne ou des points-virgules ; la virgule décimale est acceptée. <b>Plusieurs groupes :</b> une ligne par groupe, sous la forme « Placebo : 4,1 5,2 3,8 ». NA = valeur manquante, ignorée.')}
      <div id="dl" aria-live="polite"></div></div><div id="dres" aria-live="polite"></div></div>`;
  const zone = vue.querySelector('#dv'), res = vue.querySelector('#dres'), lu = vue.querySelector('#dl');
  zone.value = texte;
  const maj = () => {
    texte = zone.value; unite = vue.querySelector('#du').value.trim();
    const { groupes, mauvais } = lireValeurs(texte), U = unite ? ' ' + unite : '';
    lu.innerHTML = mauvais.length ? astuce(`Non lu : ${mauvais.slice(0, 6).map(x => `« ${esc(x)} »`).join(', ')}. Corrige ces valeurs (un nombre par valeur, sans unité).`, 'err', 'warn') : '';
    if (!groupes.length || groupes.some(g => g.v.length < 2)) { res.innerHTML = gh('Résultats') + astuce('Il faut au moins 2 valeurs (par groupe) pour calculer un écart-type.', 'warn', 'warn'); return; }
    const D = groupes.map(g => ({ ...g, d: descriptives(g.v), c: cinqNombres(g.v) }));
    const na = groupes.reduce((s, g) => s + g.na, 0);
    let html = gh('À quoi ressemblent les données') + `<div class="grp"><div class="figz">${figure(groupes)}</div></div>`;
    if (D.length === 1) {
      const { d, c } = D[0], L = [['Effectif', 'length(x)', String(d.n)], ['Moyenne', 'mean(x)', f4(d.moyenne)], ['Médiane', 'median(x)', f4(d.mediane)], ['Écart-type', 'sd(x)', f4(d.sd)], ['Variance', 'var(x)', f4(d.variance)],
        ['Minimum', 'min(x)', f4(d.min)], ['1er quartile Q1', 'quantile(x, 0.25)', f4(d.q1)], ['3e quartile Q3', 'quantile(x, 0.75)', f4(d.q3)], ['Maximum', 'max(x)', f4(d.max)], ['Écart interquartile', 'IQR(x)', f4(d.iqr)],
        ['Étendue', 'max(x) − min(x)', f4(d.max - d.min)], ['Erreur type de la moyenne', 'sd(x) / sqrt(n)', f4(d.se)], ['IC à 95 % de la moyenne', 'loi de Student', `[${f4(d.ic[0])} ; ${f4(d.ic[1])}]`], ['Coefficient de variation', 'sd / moyenne', f4(d.cv) + ' %']];
      if (d.modes.length && d.modes.length <= 3) L.push(['Valeur la plus fréquente', `${d.fmode} fois`, d.modes.map(f4).join(' ; ')]);
      html += gh('Résultats' + (unite ? ` · en ${unite}` : '')) + `<div class="grp">${L.map(([l, f, v]) => `<div class="row"><div class="t"><b>${l}</b><small class="mono">${esc(f)}</small></div><span class="dv">${v}</span></div>`).join('')}</div>` +
        (na ? astuce(`${na} valeur${na > 1 ? 's' : ''} manquante${na > 1 ? 's' : ''} (NA) ignorée${na > 1 ? 's' : ''}, comme avec na.rm = TRUE dans R.`) : '') +
        gh('Interprétation') + `<div class="grp">${phrases(d, c, unite).map(p => `<div class="row top">${ico('info')}<div class="t"><p>${esc(p)}</p></div></div>`).join('')}</div>` +
        gh('Phrase pour ton rapport') + `<div class="grp"><p class="concl">${esc(`Moyenne ± écart-type : ${f4(d.moyenne)} ± ${f4(d.sd)}${U} (n = ${d.n}) ; médiane : ${f4(d.mediane)}${U} [Q1 = ${f4(d.q1)} ; Q3 = ${f4(d.q3)}].`)}</p></div>` +
        codeR(`x <- c(${d.n ? groupes[0].v.join(', ') : ''})\nsummary(x)       # min, Q1, médiane, moyenne, Q3, max\nsd(x); var(x); IQR(x)\nsd(x) / sqrt(length(x))   # erreur type\nt.test(x)$conf.int        # IC à 95 % de la moyenne\nboxplot(x, horizontal = TRUE)`);
    } else {
      const C = [['Effectif', d => String(d.n)], ['Moyenne', d => f4(d.moyenne)], ['Écart-type', d => f4(d.sd)], ['Médiane', d => f4(d.mediane)], ['Q1', d => f4(d.q1)], ['Q3', d => f4(d.q3)], ['Min', d => f4(d.min)], ['Max', d => f4(d.max)], ['IC 95 % moyenne', d => `${f4(d.ic[0])} – ${f4(d.ic[1])}`]];
      html += gh('Résultats par groupe' + (unite ? ` · en ${unite}` : '')) + `<div class="grp apercu"><table class="dt"><thead><tr><td></td>${D.map(g => `<th scope="col">${esc(g.nom)}</th>`).join('')}</tr></thead><tbody>${C.map(([l, f]) => `<tr><th scope="row">${l}</th>${D.map(g => `<td>${f(g.d)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` +
        gh('Phrases pour ton rapport') + `<div class="grp">${D.map(g => `<div class="row top">${ico('info')}<div class="t"><p>${esc(`${g.nom} : ${f4(g.d.moyenne)} ± ${f4(g.d.sd)}${U} (moyenne ± écart-type, n = ${g.d.n}) ; médiane ${f4(g.d.mediane)}${U} [${f4(g.d.q1)} ; ${f4(g.d.q3)}].${g.c.atyp.length ? ` Valeur${g.c.atyp.length > 1 ? 's' : ''} atypique${g.c.atyp.length > 1 ? 's' : ''} : ${g.c.atyp.map(f4).join(' ; ')}.` : ''}`)}</p></div></div>`).join('')}</div>` +
        astuce('Décrire n\'est pas tester : pour savoir si les groupes diffèrent vraiment, utilise l\'onglet Choisir.') +
        codeR(`donnees <- data.frame(\n  valeur = c(${D.flatMap(g => g.v).join(', ')}),\n  groupe = rep(c(${D.map(g => `"${g.nom.replace(/"/g, '')}"`).join(', ')}), times = c(${D.map(g => g.v.length).join(', ')})))\ntapply(donnees$valeur, donnees$groupe, summary)\ntapply(donnees$valeur, donnees$groupe, sd)\nboxplot(valeur ~ groupe, data = donnees)`);
    }
    res.innerHTML = html;
  };
  vue.querySelector('form').addEventListener('input', maj);
  maj();
}
