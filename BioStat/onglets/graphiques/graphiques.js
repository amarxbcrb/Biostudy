// Graphiques : accueil (composer sa palette en premier, puis les fiches de mise en forme) et une page par fiche
// (#/forme/<id>) avec, pour chaque code, un aperçu du résultat dessiné à partir des vraies données R.
import { esc, titre, gh, ico, astuce, blocCode, ligne } from '../../js/app.js';
import { fichier } from './onglet.js';
import { charger, dessiner } from './apercu.js';

const choix = []; // couleurs choisies, dans l'ordre du toucher
let cible = 'fill';

async function apercus(vue) {
  for (const z of vue.querySelectorAll('[data-apercu]')) {
    const spec = JSON.parse(z.dataset.apercu);
    try {
      const D = await charger(spec);
      z.innerHTML = spec.multi ? `<div class="gg4">${spec.multi.map(t => `<figure>${dessiner({ ...spec, theme: t }, D, 300, 210)}<figcaption>theme_${t}()</figcaption></figure>`).join('')}</div>` : dessiner(spec, D);
    } catch (e) { z.innerHTML = astuce(`Aperçu indisponible : ${esc(e.message)}`, 'err', 'warn'); }
  }
}

export async function afficher(vue, [id], page) {
  const [{ fiches }, C] = await Promise.all([fichier('ggplot.json'), fichier('couleurs.json')]);
  if (page === 'forme') {
    const f = fiches.find(x => x.id === id);
    if (!f) { location.replace('#/graphiques'); return; }
    vue.innerHTML = titre(f.titre, `Code ggplot2 à ajouter à ton graphique avec <b>+</b>. Sous chaque code, l'aperçu montre à quoi t'attendre, dessiné à partir des mêmes données R.`) +
      `<div class="cols two">${f.sections.map(s => `<section>${gh(s.titre)}<div class="grp">${s.texte ? `<div class="row top">${ico('info')}<div class="t"><p>${esc(s.texte)}</p></div></div>` : ''}${s.code ? blocCode(s.code) : ''}
        ${s.apercu ? `<div class="ggz"><p class="ggt">${ico('chart')}<span>${esc(s.apercu.note || 'À quoi t\'attendre')}</span></p><div class="ggc" data-apercu="${esc(JSON.stringify(s.apercu))}">${astuce('Chargement des données…')}</div></div>` : ''}</div></section>`).join('')}</div>
      ${astuce('Aperçus dessinés par BioStat avec les vraies données (Rdatasets) : formes, couleurs et positions sont celles de ggplot2, les tailles exactes peuvent un peu différer. ggplot2 s\'installe une fois avec install.packages("ggplot2"), puis library(ggplot2) à chaque session.')}`;
    apercus(vue);
    return;
  }
  // Accueil : composer sa palette, en premier
  const familles = [['Lisibles par tous (Okabe-Ito)', C.familles[1].palettes[0].couleurs], ['ggplot2 par défaut', C.familles[0].palettes[4].couleurs], ['Vives (Set1)', C.familles[2].palettes[0].couleurs], ['Douces (Set2)', C.familles[2].palettes[1].couleurs], ['Couleurs nommées de R', C.nommees.map(n => n[1])]];
  const nom = Object.fromEntries(C.nommees.map(([n, h]) => [h, n]));
  const groupes = [...new Set(fiches.map(f => f.groupe))];
  vue.innerHTML = titre('Graphiques R', 'Choisis tes couleurs et copie le code, puis mets en forme titres, légende et thème : chaque fiche montre un aperçu du résultat.') +
    `<div class="cols side"><div>${gh('Compose ta palette · touche les couleurs dans l\'ordre de tes groupes')}<div class="grp">
      ${familles.map(([t, c]) => `<div class="pal"><p class="pn"><b>${esc(t)}</b></p><div class="sws">${c.map(x => `<button type="button" class="sw" data-ch="${x}" style="--c:${x}" aria-pressed="false" title="Ajouter ${x}"><i></i><span>${nom[x] || x}</span></button>`).join('')}</div></div>`).join('')}
      </div><div class="grp choixz" id="choix"></div></div>
    <div>${groupes.filter(g => g !== 'Couleurs').map(g => gh(g) + `<div class="grp">${fiches.filter(f => f.groupe === g).map(f => ligne('#/forme/' + f.id, f.titre, f.sous, f.icone, f.couleur)).join('')}</div>`).join('')}
      ${gh('Couleurs')}<div class="grp">${ligne('#/couleurs', 'Toutes les palettes', 'ggplot2, daltonisme, ColorBrewer, gris, dégradés, noms de R', 'palette', 'purple')}${fiches.filter(f => f.groupe === 'Couleurs').map(f => ligne('#/forme/' + f.id, f.titre, f.sous, f.icone, f.couleur)).join('')}</div></div></div>`;
  const zone = vue.querySelector('#choix');
  const maj = () => {
    vue.querySelectorAll('[data-ch]').forEach(b => { const k = choix.indexOf(b.dataset.ch); b.setAttribute('aria-pressed', k >= 0); b.dataset.n = k >= 0 ? k + 1 : ''; });
    const vec = `c(${choix.map(x => `"${x}"`).join(', ')})`, code = `scale_${cible}_manual(values = ${vec})`;
    zone.innerHTML = choix.length
      ? `<div class="pal"><p class="pn"><b>Ta palette</b><small>${choix.length} couleur${choix.length > 1 ? 's' : ''}, dans l'ordre des niveaux de ton facteur</small></p>
        <div class="seg2" role="radiogroup" style="margin-bottom:8px"><button type="button" role="radio" aria-checked="${cible === 'fill'}" data-cible="fill">Remplissage (fill)</button><button type="button" role="radio" aria-checked="${cible === 'colour'}" data-cible="colour">Points, lignes (colour)</button></div>
        ${blocCode(code, '', true)}<div class="mact" style="margin-top:6px"><button class="cap" type="button" data-copie="${esc(vec)}">${ico('copy')}<span>Copier seulement c(…)</span></button><button class="cap" type="button" data-vider>${ico('reset')}<span>Vider</span></button></div></div>`
      : astuce('Touche des couleurs : le code <b>scale_fill_manual(values = c(…))</b> se construit ici, prêt à copier.');
  };
  vue.onclick = e => {
    const b = e.target.closest('[data-ch]'), c = e.target.closest('[data-cible]');
    if (b) { const k = choix.indexOf(b.dataset.ch); k >= 0 ? choix.splice(k, 1) : choix.length < 12 && choix.push(b.dataset.ch); maj(); }
    else if (c) { cible = c.dataset.cible; maj(); }
    else if (e.target.closest('[data-vider]')) { choix.length = 0; maj(); }
  };
  maj();
}
