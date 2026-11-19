// Coder : accueil (opérations et outils en liste verticale) et une page par opération,
// code généré en R de base et en tidyverse. Gabarits dans manip.json : {x} = nom R (backticks si besoin) ou texte brut selon le type,
// {x:q} = entre guillemets, {x.cle} = valeur de l'option choisie dans un champ « choix ».
import { esc, titre, gh, ico, astuce, blocCode, ligne, RSTUDIO } from '../../js/app.js';
import { fichier } from './onglet.js';

const RESERVES = new Set('if else repeat while function for next break TRUE FALSE NULL Inf NaN NA NA_integer_ NA_real_ NA_character_ NA_complex_ in'.split(' '));
export const nomValide = s => /^((([A-Za-z]|[.][A-Za-z._])[A-Za-z0-9._]*)|[.])$/.test(s) && !RESERVES.has(s) && !/^\.\.(\.|\d+$)/.test(s);
export const ident = s => nomValide(s) ? s : '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`';
const quote = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const liste = v => (v.includes(';') ? v.split(';') : v.split(',')).map(x => x.trim()).filter(Boolean);
const vect = a => a.length === 1 ? a[0] : `c(${a.join(', ')})`;
const estNombre = s => /^-?(\d+(\.\d*)?|\.\d+)(e-?\d+)?$/i.test(s) || /^-?Inf$/.test(s);
const litteral = s => estNombre(s) || /^(TRUE|FALSE|NA)$/.test(s) ? s : quote(s);

// Valeur d'un champ, mise en forme pour le code
function valeur(c, v, q) {
  v = (v ?? '').trim();
  if (!v) return `<${c.id.toUpperCase()}>`;
  switch (c.type) {
    case 'nom': return q ? quote(v) : ident(v);
    case 'noms': { const a = liste(v); return q ? vect(a.map(quote)) : a.map(ident).join(', '); }
    case 'texte': return quote(v);
    case 'valeurs': return vect(liste(v).map(litteral));
    case 'nombres': return vect(liste(v).map(x => x.replace(',', '.')));
    default: return v; // cond, expr : écrits tels quels
  }
}

export function generer(tpl, champs, vals) {
  const C = Object.fromEntries(champs.map(c => [c.id, c]));
  return tpl
    .replace(/\{(\w+)\.(\w+)\}/g, (m, id, k) => C[id]?.options[+vals[id] || 0].val[k] ?? m)
    .replace(/\{(\w+)(:q)?\}/g, (m, id, q) => C[id] ? valeur(C[id], vals[id], q) : m);
}

// Messages sous les champs : erreurs (bloquantes pour l'élève) ou simples informations
function verifier(c, v) {
  v = (v ?? '').trim();
  if (c.type === 'choix') return null;
  if (!v) return { err: 1, txt: 'Champ vide : il apparaît comme une pastille à remplacer.' };
  if (c.type === 'nom' || c.type === 'noms') {
    const mauvais = (c.type === 'nom' ? [v] : liste(v)).filter(x => !nomValide(x));
    if (mauvais.length) return { txt: `${mauvais.map(x => `« ${x} »`).join(', ')} n'est pas un nom R valide : il est écrit entre backticks (${mauvais.map(ident).join(', ')}).` };
  }
  if (c.type === 'cond' || c.type === 'expr') {
    let p = 0;
    for (const ch of v.replace(/"[^"]*"|'[^']*'/g, '')) { p += ch === '(' ? 1 : ch === ')' ? -1 : 0; if (p < 0) break; }
    if (p) return { err: 1, txt: 'Parenthèses mal équilibrées.' };
    if ((v.split('"').length - 1) % 2) return { err: 1, txt: 'Guillemet non fermé.' };
    if (c.type === 'cond' && /(^|[^=!<>])=([^=]|$)/.test(v.replace(/"[^"]*"/g, ''))) return { err: 1, txt: 'Pour tester une égalité, écris == (deux signes égal).' };
  }
  if (c.type === 'nombres') {
    const a = liste(v).map(x => x.replace(',', '.'));
    const pas = a.filter(x => !estNombre(x));
    if (pas.length) return { err: 1, txt: `${pas.map(x => `« ${x} »`).join(', ')} n'est pas un nombre.` };
    const n = a.map(Number);
    if (n.some((x, i) => i && x <= n[i - 1])) return { err: 1, txt: 'Les bornes doivent être rangées dans l\'ordre croissant.' };
  }
  return null;
}

function controles(v, vals) {
  const msg = [];
  for (const [type, a, b] of v.controles || []) {
    const na = liste(vals[a] || '').length, nb = liste(vals[b] || '').length;
    if (type === 'meme_nombre' && na !== nb) msg.push(`Il faut autant d'étiquettes que de codes (${na} codes, ${nb} étiquettes).`);
    if (type === 'classes' && nb !== na - 1) msg.push(`Avec ${na} bornes, il faut ${na - 1} étiquettes (il y en a ${nb}).`);
  }
  return msg;
}

const etat = {}; // valeurs saisies par opération et par cas, gardées tant que la page est ouverte
const AIDE = { noms: 'Sépare les noms par des virgules.', valeurs: 'Sépare par des virgules (ou des points-virgules si une valeur contient une virgule).', nombres: 'Sépare par des virgules ; Inf pour l\'infini.' };

export async function afficher(vue, [opId], page) {
  const M = await fichier('manip.json');
  if (page === 'coder') {
    const groupes = [...new Set(M.operations.map(o => o.groupe))];
    vue.innerHTML = titre('Coder en R', 'Choisis ce que tu veux faire : BioStat écrit le code, en R de base et en tidyverse, prêt à coller dans RStudio.') +
      `<div class="cols two"><div>${groupes.map(g => gh(g) + `<div class="grp">${M.operations.filter(o => o.groupe === g).map(o => ligne('#/codeur/' + o.id, o.titre, '', o.icone, o.couleur)).join('')}</div>`).join('')}</div>
      <div>${gh('Outils')}<div class="grp">${ligne('#/descriptives', 'Statistiques descriptives', 'Moyenne, médiane, écart-type, quartiles…', 'bars', 'blue')}${ligne('#/tester', 'Tester du code R', 'R tourne dans ton navigateur', 'play', 'green')}${ligne('#/sortie', 'Interpréter un résultat R', 'Colle la sortie : des phrases scientifiques pour ton rapport', 'pulse', 'teal')}${ligne('#/tableau', 'Tableau 2 × 2', 'Se, Sp, VPP, VPN, OR, RR', 'table', 'indigo')}</div>
      ${gh('Données pour t\'entraîner')}<div class="grp">${ligne('#/donnees', 'Trouver un jeu de données', 'Des milliers de vrais jeux de données R, à importer en une ligne', 'database', 'orange')}</div></div></div>`;
    return;
  }
  const op = M.operations.find(o => o.id === opId);
  if (!op) { location.replace('#/coder'); return; }
  const e = etat[op.id] ??= { v: 0, cas: [] };
  const v = op.variantes[e.v];
  e.vals = e.cas[e.v] ??= {};
  const champs = v.champs.map(c => typeof c === 'string' ? { id: c, ...M.champs[c] } : c);
  for (const c of champs) e.vals[c.id] ??= c.type === 'choix' ? '0' : c.defaut;

  // Choix en liste verticale avec coche ; champ texte : libellé à gauche, capsule bordée à droite, message dessous
  const options = (attr, opts, cur, lab) => `<div role="radiogroup" aria-label="${esc(lab)}">${opts.map((o, i) =>
    `<button type="button" class="opt" role="radio" aria-checked="${i === cur}" ${attr}="${i}"><span>${esc(o)}</span>${ico('check')}</button>`).join('')}</div>`;
  const ligneChamp = c => {
    const id = `c-${c.id}`;
    if (c.type === 'choix') return `<div class="vr"><span class="lb">${esc(c.label)}</span></div>` + options(`data-champ="${c.id}" data-i`, c.options.map(o => o.label), +e.vals[c.id], c.label);
    return `<div class="vr"><label for="${id}">${esc(c.label)}</label>
      <input class="in mono" id="${id}" name="${c.id}" value="${esc(e.vals[c.id])}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${id}-m"${AIDE[c.type] ? ` placeholder="${esc(AIDE[c.type])}"` : ''}>
      <p class="msg" id="${id}-m"></p></div>`;
  };
  const pkgs = [...new Set([...v.dplyr.matchAll(/(\w+)::/g)].map(m => m[1]))];

  vue.innerHTML = titre(op.titre, esc(op.resume)) +
    `<div class="cols side"><div>
      ${op.variantes.length > 1 ? gh('Cas') + `<div class="grp">${options('data-v', op.variantes.map(x => x.label), e.v, 'Cas')}</div>` : ''}
      ${gh('Tes noms')}<form class="grp" onsubmit="return false">${champs.map(ligneChamp).join('')}</form>
      <div class="glob" role="alert"></div></div>
      <section aria-label="Code généré">${gh('Ton code')}<div class="grp"><div class="c-base"></div></div><div class="grp"><div class="c-dplyr"></div></div>
      ${[v.note, op.note].filter(Boolean).map(n => astuce(esc(n))).join('')}
      ${/\|>/.test(v.dplyr) ? astuce('<b>|></b> est le « pipe » de R (version 4.1 ou plus) : il passe le tableau à la fonction suivante.') : ''}
      ${pkgs.length ? astuce(`La version tidyverse utilise ${pkgs.map(p => `<b>${p}</b>`).join(', ')} : installe une seule fois avec install.packages(${pkgs.length > 1 ? `c(${pkgs.map(p => `"${p}"`).join(', ')})` : `"${pkgs[0]}"`}).`) : ''}
      ${astuce(RSTUDIO)}</section></div>`;

  const maj = () => {
    for (const c of champs) {
      const m = vue.querySelector(`#c-${c.id}-m`);
      if (!m) continue;
      const r = verifier(c, e.vals[c.id]);
      m.textContent = r?.txt || '';
      m.className = 'msg' + (r?.err ? ' err' : '');
      vue.querySelector(`#c-${c.id}`).toggleAttribute('aria-invalid', !!r?.err);
    }
    vue.querySelector('.glob').innerHTML = controles(v, e.vals).map(t => astuce(esc(t), 'err', 'warn')).join('');
    vue.querySelector('.c-base').innerHTML = blocCode(generer(v.base, champs, e.vals), M.colonnes.base);
    vue.querySelector('.c-dplyr').innerHTML = blocCode(generer(v.dplyr, champs, e.vals), M.colonnes.dplyr);
  };
  vue.querySelector('form').addEventListener('input', ev => { e.vals[ev.target.name] = ev.target.value; maj(); });
  vue.onclick = ev => {
    const b = ev.target.closest('[data-v],[data-champ]');
    if (!b) return;
    if (b.dataset.v) { e.v = +b.dataset.v; afficher(vue, [op.id], page); return; }
    e.vals[b.dataset.champ] = b.dataset.i;
    b.parentNode.querySelectorAll('.opt').forEach(x => x.setAttribute('aria-checked', x === b));
    maj();
  };
  maj();
}
