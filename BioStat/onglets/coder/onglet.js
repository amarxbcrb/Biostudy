// Onglet « Coder » : écrire le code R (R de base et tidyverse), le tester, lire une sortie, tableau 2 × 2, jeux de données.
// Fichiers de l'onglet : codeur.js, tester.js, sortie.js, tableau.js, descriptives.js, donnees.js, manip.json, donnees.json, style.css.
import { json } from '../../js/app.js';

export const fichier = nom => json(new URL(nom, import.meta.url));

export default {
  titre: 'Coder', icone: 'code', couleur: 'orange', css: 'style.css',
  pages: {
    coder: [() => import('./codeur.js'), 'Coder en R'],
    codeur: [() => import('./codeur.js'), 'Coder en R'],
    tester: [() => import('./tester.js'), 'Tester du code R'],
    sortie: [() => import('./sortie.js'), 'Interpréter un résultat R'],
    tableau: [() => import('./tableau.js'), 'Tableau 2 × 2'],
    descriptives: [() => import('./descriptives.js'), 'Statistiques descriptives'],
    donnees: [() => import('./donnees.js'), 'Jeux de données']
  },
  alias: { runner: 'tester', calcul: 'tableau' },
  async recherche() {
    const [M, D] = await Promise.all([fichier('manip.json'), fichier('donnees.json')]);
    return [
      ...M.operations.map(o => ({ t: o.titre, s: 'Coder · ' + o.groupe, h: '#/codeur/' + o.id, x: [o.resume, o.note, o.variantes.map(v => [v.label, v.note, v.base, v.dplyr])] })),
      ...D.conseilles.map(d => ({ t: d.item, s: 'Coder · jeu de données', h: `#/donnees/${d.package}/${d.item}`, x: [d.texte, d.colonnes, d.pour] })),
      { t: 'Tester du code R', s: 'Coder', h: '#/tester', x: ['webR : R dans le navigateur, sans rien installer. Exécuter, essayer un exemple.'] },
      { t: 'Interpréter un résultat R', s: 'Coder', h: '#/sortie', x: ['Coller la sortie de R : phrases scientifiques pour le rapport, interprétation, conclusion, p-value, statistique, ANOVA à 1, 2 ou 3 facteurs, régression lm, glm, t.test, wilcox.test, chisq.test, cor.test, kruskal.test, comparaisons 2 à 2.'] },
      { t: 'Statistiques descriptives', s: 'Coder', h: '#/descriptives', x: ['Moyenne, médiane, écart-type, variance, quartiles, écart interquartile, erreur type, intervalle de confiance, coefficient de variation, mode, valeurs atypiques, boîte à moustaches, histogramme, par groupe.'] },
      { t: 'Tableau 2 × 2', s: 'Coder', h: '#/tableau', x: ['Sensibilité, spécificité, VPP, VPN, odds ratio, risque relatif, intervalle de confiance.'] }
    ];
  }
};
