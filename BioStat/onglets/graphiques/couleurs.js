// Graphiques › Couleurs : palettes ggplot2 à copier (couleurs.json, valeurs vérifiées dans R).
import { esc, titre, gh, ico, astuce, blocCode } from '../../js/app.js';
import { fichier } from './onglet.js';

const vec = c => `c(${c.map(x => `"${x}"`).join(', ')})`;
// Une pastille = un bouton qui copie "#RRGGBB" (ou "nom"), guillemets compris, prêt pour c(…)
const sw = (val, txt, c = val) => `<button type="button" class="sw" data-copie="${esc(`"${val}"`)}" style="--c:${c}" title="Copier &quot;${esc(val)}&quot;"><i></i><span>${esc(txt)}</span></button>`;

export async function afficher(vue) {
  const C = await fichier('couleurs.json');
  vue.innerHTML = titre('Couleurs', 'Touche une couleur pour copier son code, ou copie la palette entière et colle-la à la suite de ton ggplot().') +
    `<div class="cols two">${C.familles.map(f => `<section>${gh(`${f.titre} · ${f.sous}`)}<div class="grp">${f.palettes.map(p =>
      `<div class="pal"><p class="pn"><b>${esc(p.nom)}</b><small>${p.couleurs.length} couleurs</small></p><div class="sws">${p.couleurs.map(x => sw(x, x)).join('')}</div>
        ${blocCode(`${p.code}\n# ou, couleur par couleur :\nscale_fill_manual(values = ${vec(p.couleurs)})`, '', true)}</div>`).join('')}</div></section>`).join('')}
    <section>${gh('Dégradés · variable quantitative')}<div class="grp">${C.degrades.map(d =>
      `<div class="pal"><p class="pn"><b>${esc(d.nom)}</b></p><div class="grad" style="background:linear-gradient(90deg,${[d.bas, d.milieu, d.haut].filter(Boolean).join(',')})"></div>${blocCode(d.code, '', true)}</div>`).join('')}</div></section>
    <section>${gh('Couleurs nommées de R')}<div class="grp"><div class="pal"><div class="sws nm">${C.nommees.map(([n, h]) => sw(n, n, h)).join('')}</div></div></div></section></div>
    ${gh('Exemple complet')}<div class="grp">${blocCode(C.exemple, 'À coller dans RStudio')}</div>
    ${gh('Bon à savoir')}<div class="grp">${C.aide.map(a => `<div class="row top">${ico('info')}<div class="t"><p>${esc(a)}</p></div></div>`).join('')}</div>
    ${astuce('Les palettes « Lisibles par tous » restent distinctes pour les personnes daltoniennes : préfère-les pour un rapport ou une affiche.')}`;
}
