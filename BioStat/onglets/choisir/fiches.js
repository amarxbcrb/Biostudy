// Choisir › Tous les tests : liste verticale par famille, puis la fiche complète d'un test (#/fiche/<id>).
import { data, esc, titre, gh, ico } from '../../js/app.js';
import { ficheTest, nomFonction, pastille } from './fiche.js';

export async function afficher(vue, [id], page) {
  const { familles, tests } = await data('tests');
  if (page === 'fiche') {
    const t = tests.find(x => x.id === id);
    if (!t) { location.replace('#/tests'); return; }
    vue.innerHTML = titre(t.titre, '', ['#/tests', 'Tous les tests']) + `<div class="narrow">${ficheTest(t, familles.find(x => x.id === t.famille).titre)}</div>`;
    return;
  }
  vue.innerHTML = titre('Tous les tests', `${tests.length} tests expliqués simplement : à quoi ils servent, leurs conditions, le code R à copier et un exemple de sortie.`) +
    `<div class="cols three">${familles.map(f => `<section aria-labelledby="f-${f.id}"><p class="gh" id="f-${f.id}">${esc(f.titre)} · ${esc(f.sous)}</p><div class="grp">
      ${tests.filter(t => t.famille === f.id).map(t => `<a class="row" href="#/fiche/${t.id}">${pastille(t)}
        <div class="t"><b>${esc(t.titre)}</b><small class="mono">${esc(nomFonction(t))}</small></div>${ico('chev')}</a>`).join('')}</div></section>`).join('')}</div>`;
}
