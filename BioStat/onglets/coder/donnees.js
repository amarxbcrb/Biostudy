// Coder › Trouver un jeu de données : jeux conseillés, recherche dans tout Rdatasets (données extérieures),
// aperçu des premières lignes et code pour l'importer.
import { esc, titre, gh, ico, astuce, blocCode, sansAccent } from '../../js/app.js';
import { index, jeu, urlCSV, urlDoc } from '../../js/rdatasets.js';
import { fichier } from './onglet.js';

let recherche = '';
const credit = () => astuce('Données : <a href="https://github.com/vincentarelbundock/Rdatasets" target="_blank" rel="noopener"><b>Rdatasets</b></a>, catalogue public des jeux de données des packages R, téléchargé en direct.', '', 'database');

export async function afficher(vue, [pkg, item]) {
  const D = await fichier('donnees.json');
  if (pkg && item) return detail(vue, pkg, item, D);
  const conseil = D.conseilles.map(d => `<a class="row" href="#/donnees/${d.package}/${encodeURIComponent(d.item)}"><span class="pas" style="--pc:var(--c-orange)">${ico('database')}</span>
    <div class="t"><b class="mono">${esc(d.item)}</b><small>${esc(d.texte)}</small><small>Pour : ${esc(d.pour)}</small></div>${ico('chev')}</a>`).join('');
  vue.innerHTML = titre('Jeux de données', 'De vraies données pour t\'entraîner : regarde-les ici, puis importe-les dans RStudio en une ligne.') +
    `<div class="cols two"><div>${gh('Chercher dans tout Rdatasets')}<form class="grp" role="search" onsubmit="return false"><div class="vr"><input class="in" type="search" id="dq" value="${esc(recherche)}" placeholder="Un mot en anglais : plant, sleep, cancer…" aria-label="Chercher un jeu de données"></div></form>
      <div id="dr" aria-live="polite"></div>${credit()}</div>
      <div>${gh('Conseillés pour débuter · fournis avec R')}<div class="grp">${conseil}</div></div></div>`;
  const champ = vue.querySelector('#dq'), zone = vue.querySelector('#dr');
  let tous = null;
  const chercher = async () => {
    recherche = champ.value;
    const mots = sansAccent(recherche).split(/\s+/).filter(m => m.length > 1);
    if (!mots.length) { zone.innerHTML = ''; return; }
    if (!tous) {
      zone.innerHTML = astuce('Téléchargement du catalogue (environ 3 600 jeux de données)…');
      try { tous = (await index()).map(d => ({ ...d, k: sansAccent(`${d.item} ${d.titre} ${d.package}`) })); }
      catch (e) { zone.innerHTML = astuce(esc(e.message), 'err', 'warn'); return; }
    }
    const r = tous.filter(d => mots.every(m => d.k.includes(m)));
    zone.innerHTML = r.length ? `<div class="grp">${r.slice(0, 40).map(d => `<a class="row" href="#/donnees/${encodeURIComponent(d.package)}/${encodeURIComponent(d.item)}"><div class="t"><b class="mono">${esc(d.item)}</b><small>${esc(d.titre)}</small><small>${esc(d.package)} · ${d.lignes} lignes × ${d.colonnes} colonnes</small></div>${ico('chev')}</a>`).join('')}</div>` +
      (r.length > 40 ? astuce(`${r.length} jeux trouvés : les 40 premiers sont affichés. Ajoute un mot pour préciser.`) : '')
      : astuce('Aucun jeu de données ne correspond. Le catalogue est en anglais : essaie plant, weight, survival, cancer…');
  };
  champ.addEventListener('input', chercher);
  if (recherche) chercher();
}

async function detail(vue, pkg, item, D) {
  const c = D.conseilles.find(d => d.package === pkg && d.item === item);
  vue.innerHTML = titre(item, c ? esc(c.texte) : '', ['#/donnees', 'Jeux de données']) + astuce('Téléchargement des données…');
  let J;
  try { J = await jeu(pkg, item); }
  catch (e) { vue.innerHTML = titre(item, '', ['#/donnees', 'Jeux de données']) + astuce(esc(e.message), 'err', 'warn'); return; }
  const base = pkg === 'datasets';
  const type = i => J.lignes.every(r => r[i] === null || typeof r[i] === 'number') ? 'nombre' : 'texte';
  const code = base
    ? `# ${item} est fourni avec R : rien à importer\nhead(${item})   # 6 premières lignes\nstr(${item})    # type de chaque colonne`
    : `donnees <- read.csv("${urlCSV(pkg, item)}")\n# la colonne rownames numérote seulement les lignes\nhead(donnees)\nstr(donnees)`;
  const v = x => x === null ? '<i>NA</i>' : esc(typeof x === 'number' ? String(x) : x);
  vue.innerHTML = titre(item, c ? esc(c.texte) : '', ['#/donnees', 'Jeux de données']) +
    `<div class="cols side"><div>${gh('Importer dans RStudio')}<div class="grp">${blocCode(code, '', false, base)}</div>
      ${c?.test ? `<div class="grp" style="margin-top:10px"><a class="row" href="#/fiche/${c.test}">${ico('route')}<div class="t"><b>Pour t'entraîner : ${esc(c.pour)}</b></div>${ico('chev')}</a></div>` : ''}
      ${gh(`Colonnes · ${J.lignes.length} lignes`)}<div class="grp">${J.noms.map((n, i) => `<div class="row"><div class="t"><b class="mono">${esc(n)}</b></div><span class="tag">${type(i)}</span></div>`).join('')}</div>
      <div class="actions"><a class="btn" href="${urlDoc(pkg, item)}" target="_blank" rel="noopener">${ico('ext')}Documentation (en anglais)</a></div></div>
      <div>${gh('Aperçu · 8 premières lignes')}<div class="grp apercu"><table><thead><tr>${J.noms.map(n => `<th scope="col">${esc(n)}</th>`).join('')}</tr></thead>
      <tbody>${J.lignes.slice(0, 8).map(r => `<tr>${r.map(x => `<td>${v(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${credit()}</div></div>`;
}
