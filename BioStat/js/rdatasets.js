// Données extérieures : Rdatasets (https://github.com/vincentarelbundock/Rdatasets), des milliers de jeux de données R
// en CSV, servis par raw.githubusercontent.com (accessible depuis le navigateur, CORS ouvert). Partagé par les onglets.
export const BRUT = 'https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/';
export const SITE = 'https://vincentarelbundock.github.io/Rdatasets/';

// CSV (RFC 4180) : guillemets doublés, séparateurs et retours à la ligne dans les champs entre guillemets
export function lireCSV(t) {
  const L = [];
  let l = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const x = t[i];
    if (q) { if (x === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += x; }
    else if (x === '"') q = true;
    else if (x === ',') { l.push(c); c = ''; }
    else if (x === '\n' || x === '\r') { if (x === '\r' && t[i + 1] === '\n') i++; l.push(c); L.push(l); l = []; c = ''; }
    else c += x;
  }
  if (c || l.length) { l.push(c); L.push(l); }
  return L.filter(r => r.length > 1 || r[0] !== '');
}

const cache = {};
const charger = url => cache[url] ??= fetch(url).then(r => {
  if (!r.ok) throw new Error(`Rdatasets répond ${r.status}`);
  return r.text();
}).catch(e => { delete cache[url]; throw new Error(`Impossible de télécharger les données (${e.message}). Vérifie ta connexion internet puis réessaie.`); });

// Index de tous les jeux : { package, item, titre, lignes, colonnes, csv, doc }
export async function index() {
  const [, ...L] = lireCSV(await charger(BRUT + 'datasets.csv'));
  return L.map(r => ({ package: r[0], item: r[1], titre: r[2], lignes: +r[3], colonnes: +r[4], csv: r[10], doc: r[11] }));
}
// Un jeu : noms de colonnes (sans « rownames ») et lignes ; nombres convertis, NA → null
export async function jeu(pkg, item) {
  const [tete, ...L] = lireCSV(await charger(`${BRUT}csv/${pkg}/${item}.csv`));
  const k = tete[0] === 'rownames' ? 1 : 0;
  const noms = tete.slice(k);
  const lignes = L.map(r => r.slice(k).map(v => v === 'NA' || v === '' ? null : v !== '' && !isNaN(v) ? +v : v));
  return { noms, lignes, col: n => lignes.map(r => r[noms.indexOf(n)]) };
}
export const urlCSV = (pkg, item) => `${SITE}csv/${pkg}/${item}.csv`;
export const urlDoc = (pkg, item) => `${SITE}doc/${pkg}/${item}.html`;
