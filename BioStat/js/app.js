// BioStat : socle commun. Chaque onglet est un dossier onglets/<id>/ (onglet.js + ses pages, ses données, son style).
// Supprimer le dossier retire l'onglet de la barre ; modifier un onglet ne touche que son dossier.

const $ = id => document.getElementById(id), BC = $('bc'), root = document.documentElement;
const sto = { g: k => { try { return localStorage.getItem(k); } catch { return null; } }, s: (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } } };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const sansAccent = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------- Onglets : ordre de la barre. Un dossier absent est simplement ignoré. ---------- */
const ONGLETS = ['choisir', 'coder', 'graphiques', 'comprendre'];

/* ---------- Icônes : Lucide (ISC), comme les autres outils, rangées dans img/icones.svg ---------- */
export const ico = n => `<svg class="ic" aria-hidden="true"><use href="img/icones.svg#${n}"/></svg>`;

/* ---------- Données : data/*.json (communes) ou fichier d'un onglet, téléchargés une seule fois ---------- */
const cache = {};
export const json = url => cache[url] ??= fetch(url).then(r => {
  if (!r.ok) throw new Error(`${url} : erreur ${r.status}`);
  return r.json();
});
export const data = nom => json(`data/${nom}.json`);

/* ---------- Briques d'affichage ---------- */
let tabs = [], page = '', courante = null;
// En-tête de page : retour vers l'accueil de l'onglet (sauf sur l'accueil), icône, titre, phrase d'introduction
export function titre(t, sous = '', retour) {
  const o = courante, acc = o && Object.keys(o.pages)[0];
  retour ??= o && page !== acc ? [`#/${acc}`, o.titre] : null;
  return (retour ? `<a class="back" href="${retour[0]}">${ico('back')}<span>${esc(retour[1])}</span></a>` : '') +
    `<div class="thead">${ico(o?.icone || 'route')}<h2>${esc(t)}</h2></div>` + (sous ? `<p class="lead">${sous}</p>` : '');
}
export const gh = t => `<p class="gh">${esc(t)}</p>`;
export const astuce = (html, cls = '', ic = 'info') => `<p class="tip ${cls}">${ico(ic)}<span>${html}</span></p>`;
// Ligne de liste façon Réglages : pastille ronde colorée, titre, sous-titre, chevron
export const ligne = (href, b, sm = '', ic = '', c = '') => `<a class="row" href="${href}">${ic ? `<span class="pas" style="--pc:var(--c-${c || 'blue'})">${ico(ic)}</span>` : ''}<div class="t"><b>${esc(b)}</b>${sm ? `<small>${esc(sm)}</small>` : ''}</div>${ico('chev')}</a>`;

/* ---------- Code R ---------- */
// Commentaires atténués, paramètres <A_REMPLIR> en pastilles
const colorer = code => esc(code).split('\n').map(l => l
  .replace(/&lt;([A-Z][A-Z0-9_]*)&gt;/g, '<span class="ph">&lt;$1&gt;</span>')
  .replace(/(^|\s)(#.*)$/, '$1<span class="com">$2</span>')).join('\n');
// « Copier pour RStudio » toujours ; « Essayer ici » seulement pour un code autonome (run),
// qui crée lui-même ses données : un code qui attend ton tableau ne peut pas tourner ici
export const tampon = { code: '' };
export function blocCode(code, leg = '', mini = false, run = false) {
  const pre = `<pre class="code"><code>${colorer(code)}</code></pre>`;
  run &&= tabs.some(o => o.pages.tester); // sans l'onglet Coder, pas d'endroit où l'exécuter
  return mini
    ? `<div class="cb mini">${pre}<div class="mact">${run ? `<button class="cap" type="button" data-essayer>${ico('play')}<span>Essayer</span></button>` : ''}<button class="cap" type="button" data-copier>${ico('copy')}<span>Copier</span></button></div></div>`
    : `<div class="cb">${leg ? `<p class="ct">${esc(leg)}</p>` : ''}${pre}<div class="acts"><button class="ab" type="button" data-copier>${ico('copy')}<span>Copier pour RStudio</span></button>${run ? `<button class="ab" type="button" data-essayer>${ico('play')}<span>Essayer ici</span></button>` : ''}</div></div>`;
}
export const RSTUDIO = 'Dans RStudio : Fichier › Nouveau fichier › Script R, colle le code, remplace les pastilles par tes noms, puis Ctrl + Entrée (⌘ + Entrée sur Mac).';

/* ---------- Copier, Essayer ---------- */
// Copie puis confirme sur le bouton (texte du <span> remplacé 1,5 s) ; data-copie = texte à copier
export async function copier(texte, b) {
  try { await navigator.clipboard.writeText(texte); }
  catch {
    const t = Object.assign(document.createElement('textarea'), { value: texte });
    document.body.append(t); t.select();
    try { document.execCommand('copy'); } catch { /* rien d'autre à tenter */ }
    t.remove();
  }
  const s = b.querySelector('span');
  if (!s) return;
  const avant = s.textContent;
  s.textContent = 'Copié'; b.classList.add('ok');
  setTimeout(() => { s.textContent = avant; b.classList.remove('ok'); }, 1500);
}
document.addEventListener('click', e => {
  const x = e.target.closest('[data-essayer]');
  if (x) {
    tampon.code = x.closest('.cb').querySelector('pre').textContent;
    location.hash = tabs.some(o => o.pages.tester) ? '#/tester' : location.hash;
    return;
  }
  const b = e.target.closest('[data-copier],[data-copie]');
  if (b) copier(b.dataset.copie ?? b.closest('.cb').querySelector('pre').textContent, b);
});

/* ---------- Recherche plein texte : chaque onglet fournit ses entrées { t, s, h, x } ---------- */
const plat = a => [a].flat(9).filter(Boolean).join(' · ');
let index;
async function construire() {
  const I = (await Promise.all(tabs.map(o => o.recherche ? o.recherche().catch(() => []) : []))).flat();
  for (const x of I) { x.x = plat(x.x); x.k = sansAccent(`${x.t} ${x.s} ${x.x}`); x.ti = sansAccent(x.t); }
  return I;
}
// Extrait d'environ 150 caractères autour du premier mot trouvé, mots surlignés
// (sansAccent garde la longueur du texte : les positions valent pour l'original)
function extrait(x, mots) {
  const k = sansAccent(x.x), d = Math.max(0, k.indexOf(mots.find(m => k.includes(m))) - 50), f = Math.min(k.length, d + 150);
  const bout = x.x.slice(d, f), kb = k.slice(d, f), z = [];
  for (const m of mots) for (let i = kb.indexOf(m); i >= 0; i = kb.indexOf(m, i + m.length)) z.push([i, i + m.length]);
  z.sort((a, b) => a[0] - b[0]);
  let h = d ? '…' : '', p = 0;
  for (const [a, b] of z) if (a >= p) { h += esc(bout.slice(p, a)) + `<mark>${esc(bout.slice(a, b))}</mark>`; p = b; }
  return h + esc(bout.slice(p)) + (f < k.length ? '…' : '');
}
const rq = $('rq'), rr = $('rr'), srch = $('srch'), sBtn = $('sBtn'), voile = $('voile');
const ouvrir = () => { srch.hidden = voile.hidden = false; sBtn.classList.add('on'); sBtn.setAttribute('aria-expanded', 'true'); rq.focus(); };
const fermer = () => { srch.hidden = voile.hidden = true; rq.value = ''; rr.hidden = true; sBtn.classList.remove('on'); sBtn.setAttribute('aria-expanded', 'false'); };
sBtn.addEventListener('click', () => (srch.hidden ? ouvrir() : fermer()));
$('rqx').addEventListener('click', fermer);
voile.addEventListener('click', fermer);
rq.addEventListener('input', async () => {
  const mots = sansAccent(rq.value).split(/[\s,;]+/).filter(m => m.length > 1);
  if (!mots.length) { rr.hidden = true; return; }
  index ??= await construire();
  const titreOk = x => mots.every(m => x.ti.includes(m));
  const res = index.filter(x => mots.every(m => x.k.includes(m))).sort((a, b) => titreOk(b) - titreOk(a));
  rr.innerHTML = res.length ? `<p class="rn">${res.length} résultat${res.length > 1 ? 's' : ''}</p>` + res.slice(0, 30).map(x =>
    `<a class="row top" href="${x.h}"><div class="t"><small>${esc(x.s)}</small><b>${esc(x.t.length > 90 ? x.t.slice(0, 88) + '…' : x.t)}</b><p>${extrait(x, mots)}</p></div>${ico('chev')}</a>`).join('')
    : '<div class="row"><div class="t"><small>Aucun résultat. Essaie un autre mot, sans faute de frappe, ou le nom d\'une fonction R (t.test, chisq.test…).</small></div></div>';
  rr.hidden = false;
});
rq.addEventListener('keydown', e => { if (e.key === 'Enter') rr.querySelector('a')?.click(); });
rr.addEventListener('click', e => { if (e.target.closest('a')) fermer(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !srch.hidden) fermer(); });

/* ---------- Thème, menu des outils, verre, clavier ---------- */
const period = () => { const h = new Date().getHours(); return h >= 7 && h < 20 ? 'day' : 'night'; };
let sombre = root.dataset.theme === 'dark';
function theme() {
  root.dataset.theme = sombre ? 'dark' : 'light';
  document.body.classList.toggle('theme-light', !sombre); document.body.classList.toggle('theme-dark', sombre);
  $('themeBtn').innerHTML = ico(sombre ? 'sun' : 'moon'); $('metaTheme').content = sombre ? '#000000' : '#f2f2f7';
}
$('themeBtn').addEventListener('click', () => { sombre = !sombre; sto.s('bioStatTheme', sombre ? 'dark' : 'light'); sto.s('bioStatThemePeriod', period()); theme(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { if (sto.g('bioStatTheme') && sto.g('bioStatThemePeriod') === period()) return; sombre = e.matches; theme(); });
const icones = () => document.querySelectorAll('[data-ic]').forEach(e => { e.insertAdjacentHTML('afterbegin', ico(e.dataset.ic)); e.removeAttribute('data-ic'); });
icones(); theme();
// Menu des outils (menu-flottant.js, chargé en fin de page)
$('mb').addEventListener('click', () => { let n = 0; const go = () => typeof window.openCapsuleMenu === 'function' ? window.openCapsuleMenu() : ++n < 40 && setTimeout(go, 100); go(); });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
const reflet = b => {
  const aim = e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', e.clientX - r.left + 'px'); b.style.setProperty('--my', e.clientY - r.top + 'px'); };
  b.addEventListener('pointerenter', e => { aim(e); b.classList.add('lit'); });
  b.addEventListener('pointerdown', e => { aim(e); b.classList.add('lit'); });
  b.addEventListener('pointermove', aim);
  b.addEventListener('pointerleave', () => b.classList.remove('lit'));
  ['pointerup', 'pointercancel'].forEach(n => b.addEventListener(n, e => e.pointerType !== 'mouse' && b.classList.remove('lit')));
};
document.querySelectorAll('.tools,.mb,.nav-in,.sbtn,.sbar').forEach(reflet);
// Clavier ouvert sur mobile : la barre du bas se cache
if (window.visualViewport) visualViewport.addEventListener('resize', () => BC.classList.toggle('kb', visualViewport.height < innerHeight * 0.75));
// Pied de page commun : placé dans la page, sous le contenu
const pied = () => { const f = document.querySelector('.modern-transparent-footer'); if (f) $('shell').appendChild(f); };
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', pied) : setTimeout(pied);

/* ---------- Chargement des onglets puis routeur ---------- */
const vue = $('vue');
let nav, nbs = [], dernier = [];
const aller = i => { if (location.hash !== dernier[i]) location.hash = dernier[i]; else scrollTo(0, 0); };

async function demarrer() {
  const r = await Promise.allSettled(ONGLETS.map(id => import(`../onglets/${id}/onglet.js`).then(m => ({ id, ...m.default }))));
  tabs = r.filter(x => x.status === 'fulfilled').map(x => x.value);
  r.forEach((x, i) => x.status === 'rejected' && console.info(`Onglet « ${ONGLETS[i]} » absent : il n'apparaît pas dans la barre.`));
  for (const o of tabs) {
    for (const [p, v] of Object.entries(o.pages)) o.pages[p] = Array.isArray(v) ? v : [v, o.titre];
    if (o.css) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `onglets/${o.id}/${o.css}` }));
  }
  dernier = tabs.map(o => '#/' + Object.keys(o.pages)[0]);
  BC.style.setProperty('--n', tabs.length);
  $('nav').insertAdjacentHTML('beforeend', tabs.map(o => `<button class="nb" type="button" style="--nc:var(--c-${o.couleur})">${ico(o.icone)}<span>${esc(o.titre)}</span></button>`).join(''));
  nbs = [...document.querySelectorAll('.nb')];
  const sl = $('sl');
  nav = window.LiquidGlass
    ? LiquidGlass.tabs({ wrap: $('navWrap'), inner: $('nav'), indicator: sl, items: nbs, onSelect: aller, glass: false })
    : { select(i) { sl.style.translate = nbs[i].offsetLeft + 'px 0'; sl.style.width = nbs[i].offsetWidth + 'px'; } };
  if (!window.LiquidGlass) { nbs.forEach((b, i) => b.addEventListener('click', () => aller(i))); addEventListener('resize', () => nav.select(tabs.indexOf(courante))); }
  addEventListener('hashchange', router);
  router();
}

async function router() {
  const [p, ...reste] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const avant = page;
  if (!tabs.length) { vue.innerHTML = astuce('Aucun onglet trouvé dans le dossier onglets/.', 'err', 'warn'); return; }
  const o = tabs.find(x => x.pages[p] || x.alias?.[p]) || tabs[0];
  page = o.pages[p] ? p : o.alias?.[p] || Object.keys(o.pages)[0];
  courante = o;
  const i = tabs.indexOf(o), [charger, nom] = o.pages[page];
  dernier[i] = location.hash || dernier[i];
  BC.style.setProperty('--acc', `var(--c-${o.couleur})`);
  nbs.forEach((b, k) => { b.classList.toggle('on', k === i); b.toggleAttribute('aria-current', k === i); });
  nav.select(i);
  document.title = `${nom} · BioStat`;
  try {
    const m = await charger();
    vue.onclick = vue.oninput = null; // chaque page installe les siens
    await m.afficher(vue, reste.filter(Boolean), page);
  } catch (err) {
    console.error(err);
    vue.innerHTML = `${titre(nom)}<div class="grp"><div class="row top">${ico('warn')}<div class="t"><p>Cette page n'a pas pu s'afficher : ${esc(err.message)}</p><small>Vérifie ta connexion puis recharge la page. En local, lance un serveur (python3 -m http.server) au lieu d'ouvrir le fichier directement.</small></div></div></div>`;
  }
  if (page !== avant) { vue.classList.add('go'); void vue.offsetWidth; vue.classList.remove('go'); vue.focus({ preventScroll: true }); scrollTo(0, 0); }
}
demarrer();
