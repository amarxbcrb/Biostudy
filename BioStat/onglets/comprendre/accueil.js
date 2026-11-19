// Comprendre : accueil (visualisations en liste verticale, Réviser) et page d'une visualisation (#/viz/<id>).
import { titre, gh, ligne } from '../../js/app.js';
import { VIZ, fichier } from './onglet.js';

export async function afficher(vue, [id], page) {
  if (page === 'viz') {
    const v = VIZ.find(x => x.id === id);
    if (!v) { location.replace('#/comprendre'); return; }
    const m = await import(`./viz-${v.id}.js`);
    return m.afficher(vue, v);
  }
  const { questions } = await fichier('quiz.json');
  const groupes = [...new Set(VIZ.map(v => v.groupe))];
  vue.innerHTML = titre('Comprendre', 'Bouge les curseurs ou déplace les points, et regarde la statistique et la p-value changer : c\'est la meilleure façon de comprendre un test.') +
    `<div class="cols two"><div>${groupes.map(g => gh(g) + `<div class="grp">${VIZ.filter(v => v.groupe === g).map(v => ligne('#/viz/' + v.id, v.titre, v.sous, v.icone, v.couleur)).join('')}</div>`).join('')}</div>
    <div>${gh('Réviser')}<div class="grp">${ligne('#/reviser', 'Quel test pour cette situation ?', `${questions.length} énoncés corrigés, avec ton score`, 'cap', 'pink')}</div></div></div>`;
}
