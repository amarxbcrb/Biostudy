// Onglet « Comprendre » : une visualisation interactive par test (curseurs, points à déplacer, vraies données R)
// et « Réviser » (choisir le test d'un énoncé). Calculs dans js/stats.js (partagé), vérifiés contre R.
// Fichiers de l'onglet : accueil.js, viz-*.js, dessin.js, reviser.js, quiz.json, style.css.
import { data, json } from '../../js/app.js';

export const fichier = nom => json(new URL(nom, import.meta.url));
// Les visualisations : id = fichier viz-<id>.js
export const VIZ = [
  { id: 'pvaleur', titre: 'p-value et risque α', sous: 'Zone de rejet, test unilatéral ou bilatéral', icone: 'target', couleur: 'blue', groupe: 'Les bases' },
  { id: 'normalite', titre: 'Normalité', sous: 'Histogramme, Q-Q plot et test de Shapiro-Wilk', icone: 'okc', couleur: 'brown', groupe: 'Les bases' },
  { id: 't', titre: 'Test t (2 groupes)', sous: 'L\'écart des moyennes face à la dispersion', icone: 'scale', couleur: 'indigo', groupe: 'Comment marche chaque test' },
  { id: 'wilcoxon', titre: 'Wilcoxon-Mann-Whitney', sous: 'Les valeurs deviennent des rangs', icone: 'bars', couleur: 'orange', groupe: 'Comment marche chaque test' },
  { id: 'chi2', titre: 'χ² d\'indépendance', sous: 'Observé contre théorique, case par case', icone: 'table', couleur: 'pink', groupe: 'Comment marche chaque test' },
  { id: 'anova', titre: 'ANOVA', sous: 'Variance entre les groupes contre variance dans les groupes', icone: 'bars', couleur: 'purple', groupe: 'Comment marche chaque test' },
  { id: 'interaction', titre: 'ANOVA à 2 facteurs', sous: 'Effets de deux facteurs et leur interaction', icone: 'table', couleur: 'pink', groupe: 'Comment marche chaque test' },
  { id: 'correlation', titre: 'Corrélation', sous: 'Déplace les points : r de Pearson et ρ de Spearman', icone: 'grow', couleur: 'teal', groupe: 'Comment marche chaque test' }
];

export default {
  titre: 'Comprendre', icone: 'bulb', couleur: 'teal', css: 'style.css',
  pages: {
    comprendre: [() => import('./accueil.js'), 'Comprendre'],
    viz: [() => import('./accueil.js'), 'Comprendre'],
    reviser: [() => import('./reviser.js'), 'Réviser']
  },
  alias: { quiz: 'reviser' },
  async recherche() {
    const [{ questions }, { tests }] = await Promise.all([fichier('quiz.json'), data('tests')]);
    const T = Object.fromEntries(tests.map(t => [t.id, t.titre]));
    return [
      ...VIZ.map(v => ({ t: v.titre, s: 'Comprendre · visualisation', h: '#/viz/' + v.id, x: [v.sous] })),
      ...questions.map(q => ({ t: q.enonce, s: 'Comprendre · réviser', h: '#/reviser/' + q.id, x: [q.enonce, q.explication, T[q.reponse]] }))
    ];
  }
};
