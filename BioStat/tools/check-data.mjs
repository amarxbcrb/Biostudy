// Vérifie la cohérence des données : data/tests.json (commun) et les JSON de chaque onglet (onglets/<id>/).
// Un onglet absent (dossier supprimé) n'est pas une erreur : ses vérifications sont simplement sautées.
// Usage, depuis BioStat/ : node tools/check-data.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const erreurs = [], bilan = [];
const lire = (chemin, obligatoire = true) => {
  const f = new URL(chemin, racine);
  if (!existsSync(f)) { if (obligatoire) erreurs.push(`${chemin} absent`); return null; }
  try { return JSON.parse(readFileSync(f, 'utf8')); }
  catch (e) { erreurs.push(`${chemin} : JSON invalide (${e.message})`); return null; }
};
const PH = /<[A-Z][A-Z0-9_]*>/;

// Onglets : chaque dossier a son onglet.js
const onglets = existsSync(new URL('onglets/', racine)) ? readdirSync(new URL('onglets/', racine)) : [];
for (const o of onglets) if (!existsSync(new URL(`onglets/${o}/onglet.js`, racine))) erreurs.push(`onglets/${o} : onglet.js manquant`);
bilan.push(`${onglets.length} onglets (${onglets.join(', ')})`);

// tests.json : identifiants uniques, champs obligatoires, cibles des notes présentes dans la sortie
const tests = lire('data/tests.json');
const ids = new Set();
for (const t of tests?.tests || []) {
  if (ids.has(t.id)) erreurs.push(`tests : id en double « ${t.id} »`);
  ids.add(t.id);
  for (const k of ['titre', 'type', 'fonction', 'package', 'resume', 'h0', 'h1', 'code'])
    if (!t[k]) erreurs.push(`tests « ${t.id} » : champ ${k} manquant`);
  for (const n of t.exemple?.notes || [])
    if (!t.exemple.sortie.includes(n.cible)) erreurs.push(`tests « ${t.id} » : cible « ${n.cible} » absente de la sortie`);
  // un code « autonome » (bouton Essayer) ne doit contenir aucune pastille à remplir
  for (const s of t.situations || []) if (s.autonome && PH.test(s.code)) erreurs.push(`tests « ${t.id} » : situation autonome avec une pastille à remplir`);
  if (/diapo/i.test(JSON.stringify(t))) erreurs.push(`tests « ${t.id} » : mention d'une diapo`);
}
bilan.push(`${ids.size} tests`);

// Choisir : arbre (chaque « vers » existe, feuilles → tests existants, nœuds atteignables), vue d'ensemble, pièges
const arbre = lire('onglets/choisir/arbre.json', onglets.includes('choisir'));
if (arbre) {
  const N = arbre.noeuds || {};
  let feuilles = 0;
  if (!N[arbre.racine]) erreurs.push(`arbre : racine « ${arbre.racine} » introuvable`);
  const vus = new Set(), pile = [arbre.racine];
  while (pile.length) {
    const id = pile.pop();
    if (vus.has(id) || !N[id]) continue;
    vus.add(id);
    for (const [i, c] of (N[id].choix || []).entries()) {
      const ou = `arbre « ${id} » choix ${i + 1}`;
      if (!c.texte) erreurs.push(`${ou} : texte manquant`);
      if (!c.pourquoi) erreurs.push(`${ou} : « pourquoi » manquant`);
      if (!!c.vers === !!c.feuille) { erreurs.push(`${ou} : il faut soit « vers », soit « feuille »`); continue; }
      if (c.vers) { if (!N[c.vers]) erreurs.push(`${ou} : nœud « ${c.vers} » introuvable`); else pile.push(c.vers); continue; }
      feuilles++;
      const f = c.feuille;
      if (!f.tests?.length) erreurs.push(`${ou} : feuille sans test`);
      for (const t of f.tests || []) if (!ids.has(t)) erreurs.push(`${ou} : test « ${t} » absent de tests.json`);
      if (f.conseil !== null && !(f.conseil >= 0 && f.conseil < (f.tests || []).length)) erreurs.push(`${ou} : conseil ${f.conseil} hors limites`);
    }
  }
  for (const id of Object.keys(N)) if (!vus.has(id)) erreurs.push(`arbre : nœud « ${id} » inatteignable`);
  // vue d'ensemble : chaque ligne mène, par son chemin ch, à une feuille qui propose ce test
  for (const [g, grp] of (arbre.synthese || []).entries()) for (const l of grp.lignes) {
    let n = N[arbre.racine], f = null;
    for (const i of l.ch) { const c = !f && n?.choix[i]; if (!c) { f = null; break; } if (c.feuille) f = c.feuille; else n = N[c.vers]; }
    if (!f?.tests.includes(l.test)) erreurs.push(`synthese groupe ${g + 1} « ${l.cas} » : le chemin ${l.ch} ne mène pas à ${l.test}`);
  }
  bilan.push(`${Object.keys(N).length} nœuds, ${feuilles} feuilles, ${(arbre.synthese || []).reduce((n, g) => n + g.lignes.length, 0)} lignes de vue d'ensemble`);
}
const pieges = lire('onglets/choisir/pieges.json', onglets.includes('choisir'));
for (const p of pieges?.pieges || []) for (const k of ['id', 'titre', 'faux', 'juste']) if (!p[k]) erreurs.push(`pieges « ${p.id} » : champ ${k} manquant`);
if (pieges) bilan.push(`${pieges.pieges.length} pièges`);

// Coder : chaque marqueur {x}, {x:q} ou {x.cle} d'un gabarit désigne un champ du même cas ; jeux conseillés
const manip = lire('onglets/coder/manip.json', onglets.includes('coder'));
for (const o of manip?.operations || []) {
  for (const k of ['groupe', 'icone', 'couleur']) if (!o[k]) erreurs.push(`manip « ${o.id} » : champ ${k} manquant`);
  o.variantes.forEach((v, i) => {
    const champs = Object.fromEntries(v.champs.map(c => typeof c === 'string' ? [c, manip.champs[c]] : [c.id, c]));
    for (const c of v.champs) if (typeof c === 'string' && !manip.champs[c]) erreurs.push(`manip « ${o.id} » cas ${i + 1} : champ commun « ${c} » inconnu`);
    const opts = Object.values(champs).flatMap(c => c?.options || []).flatMap(x => Object.values(x.val)).join(' ');
    for (const m of (v.base + ' ' + v.dplyr + ' ' + opts).matchAll(/\{(\w+)(?:\.(\w+)|:q)?\}/g))
      if (!champs[m[1]]) erreurs.push(`manip « ${o.id} » cas ${i + 1} : marqueur {${m[1]}} sans champ`);
  });
}
if (manip) bilan.push(`${manip.operations.length} opérations`);
const donnees = lire('onglets/coder/donnees.json', onglets.includes('coder'));
for (const d of donnees?.conseilles || []) if (d.test && !ids.has(d.test)) erreurs.push(`donnees « ${d.item} » : test « ${d.test} » absent de tests.json`);

// Graphiques : couleurs au format #RRGGBB, fiches ggplot2 avec un texte ou un code par section
const coul = lire('onglets/graphiques/couleurs.json', onglets.includes('graphiques')), hex = /^#[0-9A-F]{6}$/;
const toutes = [...(coul?.familles || []).flatMap(f => f.palettes.flatMap(p => p.couleurs)),
  ...(coul?.degrades || []).flatMap(d => [d.bas, d.milieu, d.haut].filter(Boolean)), ...(coul?.nommees || []).map(n => n[1])];
for (const h of toutes) if (!hex.test(h)) erreurs.push(`couleurs : « ${h} » n'est pas un code #RRGGBB`);
const gg = lire('onglets/graphiques/ggplot.json', onglets.includes('graphiques'));
for (const f of gg?.fiches || []) for (const s of f.sections) if (!s.titre || !(s.texte || s.code)) erreurs.push(`ggplot « ${f.id} » : section incomplète`);
if (coul) bilan.push(`${toutes.length} couleurs, ${gg?.fiches.length || 0} fiches ggplot2`);

// Comprendre : choix et réponse sont des tests existants, la réponse fait partie des choix
const quiz = lire('onglets/comprendre/quiz.json', onglets.includes('comprendre'));
for (const q of quiz?.questions || []) {
  for (const c of q.choix) if (!ids.has(c)) erreurs.push(`quiz « ${q.id} » : test « ${c} » absent de tests.json`);
  if (!q.choix.includes(q.reponse)) erreurs.push(`quiz « ${q.id} » : la réponse n'est pas parmi les choix`);
}
if (quiz) bilan.push(`${quiz.questions.length} questions`);

if (erreurs.length) {
  console.error(`${erreurs.length} erreur(s) :\n- ` + erreurs.join('\n- '));
  process.exit(1);
}
console.log('OK : ' + bilan.join(' ; ') + '.');
