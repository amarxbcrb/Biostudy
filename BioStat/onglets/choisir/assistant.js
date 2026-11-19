// Choisir : une question à la fois, puis le test conseillé et pourquoi ; « Vue d'ensemble » = tous les cas sur une page.
// Le chemin parcouru est dans le hash (#/choisir/1/0/2 = indices des choix) :
// le bouton Précédent du navigateur et les liens partagés fonctionnent.
import { data, esc, titre, gh, ico, astuce, ligne } from '../../js/app.js';
import { ficheTest, nomFonction, pastille } from './fiche.js';
import { fichier } from './onglet.js';

const lien = ch => '#/choisir' + (ch.length ? '/' + ch.join('/') : '');

export async function afficher(vue, reste, page) {
  const [arbre, { tests }] = await Promise.all([fichier('arbre.json'), data('tests')]);
  const T = Object.fromEntries(tests.map(t => [t.id, t]));

  if (page === 'synthese') {
    vue.innerHTML = titre('Vue d\'ensemble', 'Tous les cas sur une page. Touche une ligne pour voir pourquoi, les conditions et le code R.') +
      `<div class="cols two">${arbre.synthese.map(g => `<section>${gh(g.titre)}<div class="grp">${g.lignes.map(l => `<a class="row" href="${lien(l.ch)}">${pastille(T[l.test])}
        <div class="t"><small>${esc(l.cas)}</small><span class="vt"><b>${esc(T[l.test].titre)}</b><span class="mono">${esc(nomFonction(T[l.test]))}</span></span></div>${ico('chev')}</a>`).join('')}</div></section>`).join('')}</div>`;
    return;
  }

  // Suivre les réponses ; un chemin invalide est tronqué à sa partie valide
  const etapes = [], ch = [];
  let noeud = arbre.noeuds[arbre.racine], feuille = null;
  for (const s of reste) {
    const c = !feuille && /^\d+$/.test(s) && noeud.choix[+s];
    if (!c) break;
    etapes.push({ noeud, c }); ch.push(+s);
    if (c.feuille) feuille = c.feuille; else noeud = arbre.noeuds[c.vers];
  }
  if (ch.length !== reste.length) { location.replace(lien(ch)); return; }

  // Réponses déjà données, en liste verticale : toucher une réponse revient à cette question
  const reponses = (avecRaison, tit) => etapes.length ? gh(tit) + `<div class="grp why">${etapes.map((e, k) => `<a class="row top" href="${lien(ch.slice(0, k))}" title="Changer cette réponse"><span class="num">${k + 1}</span>
    <div class="t"><small>${esc(e.noeud.question)}</small><b>${esc(e.c.texte)}</b>${avecRaison && e.c.pourquoi ? `<p>${esc(e.c.pourquoi)}</p>` : ''}</div>${avecRaison ? '' : ico('chev')}</a>`).join('')}</div>` : '';

  if (!feuille) {
    vue.innerHTML = titre('Choisir un test', ch.length ? '' : 'Réponds aux questions, une à la fois : BioStat te donne le test, pourquoi, ses conditions et le code R.') +
      `<div class="narrow">${gh(`Question ${etapes.length + 1} · ${noeud.etape}`)}
      <section class="grp" aria-labelledby="q"><p class="q" id="q">${esc(noeud.question)}</p>${noeud.aide ? `<p class="qa">${esc(noeud.aide)}</p>` : ''}
      ${noeud.choix.map((c, i) => `<a class="row" href="${lien([...ch, i])}"><span class="pas">${i + 1}</span><div class="t"><b>${esc(c.texte)}</b>${c.detail ? `<small>${esc(c.detail)}</small>` : ''}</div>${ico('chev')}</a>`).join('')}</section>
      ${reponses(false, 'Tes réponses · touche pour changer')}
      ${ch.length ? '' : gh('Tu sais déjà quel test ?') + `<div class="grp">${ligne('#/tests', 'Tous les tests', `${tests.length} fiches : rôle, conditions, code R, exemple`, 'book', 'purple')}${ligne('#/synthese', 'Vue d\'ensemble', 'Tous les cas sur une page', 'route', 'indigo')}${ligne('#/pieges', 'Pièges d\'interprétation', 'p-value, non-rejet, causalité…', 'warn', 'pink')}</div>`}</div>`;
  } else {
    const ok = feuille.conseil !== null && T[feuille.tests[feuille.conseil]];
    const autres = feuille.tests.filter(id => T[id] !== ok);
    const note = feuille.note || (!ok ? 'Le choix entre ces tests dépend des conditions : vérifie-les avec le code proposé dans chaque fiche.' : '');
    const liste = (tit, ids) => gh(tit) + `<div class="grp">${ids.map(id => `<a class="row" href="#/fiche/${id}">${pastille(T[id])}<div class="t"><b>${esc(T[id].titre)}</b><small class="mono">${esc(nomFonction(T[id]))}</small></div>${ico('chev')}</a>`).join('')}</div>`;
    const plus = reponses(true, 'Pourquoi ce test ?') + (note ? astuce(`<b>À faire d'abord :</b> ${esc(note)}`, 'warn', 'warn') : '') +
      (ok && autres.length ? liste('Si une condition n\'est pas remplie', autres) : '') +
      `<p class="actions"><a class="btn" href="${lien(ch.slice(0, -1))}">${ico('back')}Retour</a><a class="btn pri" href="#/choisir">${ico('reset')}Recommencer</a></p>`;
    vue.innerHTML = titre('Choisir un test') + (ok
      ? ficheTest(ok, 'Test conseillé', plus, true)
      : `<div class="narrow">${liste('Tests possibles', feuille.tests)}${plus}</div>`);
  }
  if (vue.getBoundingClientRect().top < 0) scrollTo(0, 0);
}
