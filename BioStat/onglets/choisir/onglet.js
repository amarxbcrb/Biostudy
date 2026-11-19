// Onglet « Choisir » : trouver le bon test pas à pas, toutes les fiches, les pièges d'interprétation.
// Fichiers de l'onglet : assistant.js, fiches.js, fiche.js, pieges.js, arbre.json, pieges.json, style.css.
import { data, json } from '../../js/app.js';
import { nomFonction } from './fiche.js';

export const fichier = nom => json(new URL(nom, import.meta.url));

export default {
  titre: 'Choisir', icone: 'route', couleur: 'blue', css: 'style.css',
  // la première page est l'accueil de l'onglet
  pages: {
    choisir: [() => import('./assistant.js'), 'Choisir un test'],
    synthese: [() => import('./assistant.js'), 'Vue d\'ensemble'],
    tests: [() => import('./fiches.js'), 'Tous les tests'],
    fiche: [() => import('./fiches.js'), 'Fiche'],
    pieges: [() => import('./pieges.js'), 'Pièges']
  },
  // anciennes adresses (liens partagés)
  alias: { assistant: 'choisir', fiches: 'fiche' },
  async recherche() {
    const [{ tests }, A, { pieges }] = await Promise.all([data('tests'), fichier('arbre.json'), fichier('pieges.json')]);
    const I = [
      ...tests.map(t => ({ t: t.titre, s: 'Fiche · ' + nomFonction(t), h: '#/fiche/' + t.id,
        x: [t.resume, t.h0, t.h1, t.conditions.map(c => [c.texte, c.code]), t.remarques, t.situations?.map(s => [s.texte, s.code]), t.exemple?.conclusion, t.exemple?.notes.map(n => n.texte), t.code, t.mots_cles] })),
      ...pieges.map(p => ({ t: p.titre, s: 'Pièges', h: '#/pieges/' + p.id, x: [p.faux, p.juste, p.exemple, p.code, p.mots_cles] }))
    ];
    // Chaque question de l'assistant, avec le chemin le plus court pour l'atteindre
    const ch = { [A.racine]: [] }, file = [A.racine];
    while (file.length) {
      const id = file.shift();
      A.noeuds[id].choix.forEach((c, i) => { if (c.vers && !(c.vers in ch)) { ch[c.vers] = [...ch[id], i]; file.push(c.vers); } });
    }
    for (const [id, c] of Object.entries(ch)) {
      const n = A.noeuds[id];
      I.push({ t: n.question, s: 'Choisir · ' + n.etape, h: '#/choisir' + c.map(i => '/' + i).join(''), x: [n.aide, n.choix.map(x => [x.texte, x.detail, x.pourquoi])] });
    }
    return I;
  }
};
