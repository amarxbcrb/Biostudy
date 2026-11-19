// Onglet « Graphiques » : mise en forme des graphiques ggplot2 (titres, légende, ordre, thème, texte, axes) et couleurs.
// Fichiers de l'onglet : graphiques.js, couleurs.js, ggplot.json, couleurs.json, style.css.
import { json } from '../../js/app.js';

export const fichier = nom => json(new URL(nom, import.meta.url));

export default {
  titre: 'Graphiques', icone: 'chart', couleur: 'purple', css: 'style.css',
  pages: {
    graphiques: [() => import('./graphiques.js'), 'Graphiques R'],
    forme: [() => import('./graphiques.js'), 'Graphiques R'],
    couleurs: [() => import('./couleurs.js'), 'Couleurs']
  },
  async recherche() {
    const [G, C] = await Promise.all([fichier('ggplot.json'), fichier('couleurs.json')]);
    return [
      ...G.fiches.map(f => ({ t: f.titre, s: 'Graphiques · ' + f.sous, h: '#/forme/' + f.id, x: f.sections.map(x => [x.titre, x.texte, x.code]) })),
      ...C.familles.flatMap(f => f.palettes.map(p => ({ t: `${p.nom} · ${f.titre}`, s: 'Graphiques · couleurs', h: '#/couleurs', x: [f.sous, p.code, p.couleurs] }))),
      ...C.degrades.map(d => ({ t: d.nom, s: 'Graphiques · dégradé', h: '#/couleurs', x: [d.code] })),
      { t: 'Couleurs nommées de R', s: 'Graphiques · couleurs', h: '#/couleurs', x: [C.nommees, C.aide] }
    ];
  }
};
