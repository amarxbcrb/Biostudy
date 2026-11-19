// Fiche complète d'un test (data/tests.json) : utilisée par le résultat de l'assistant et par « Tous les tests ».
import { esc, gh, ico, astuce, blocCode, RSTUDIO } from '../../js/app.js';

export const nomFonction = t => (t.package === 'stats' ? '' : t.package + '::') + t.fonction + '()';
const BASE = ['base', 'stats', 'utils', 'graphics'];
// Aide officielle : R de base sous /R/refmans, packages CRAN sous /CRAN/refmans ; « aide » = nom de la page s'il diffère
export const urlAide = t => `https://search.r-project.org/${BASE.includes(t.package) ? 'R' : 'CRAN'}/refmans/${t.package}/html/${t.aide || t.fonction}.html`;
const FAM = { ref: ['target', 'blue'], deux: ['scale', 'indigo'], trois: ['bars', 'purple'], fact: ['table', 'pink'], quali: ['table', 'orange'], lien: ['grow', 'teal'], survie: ['heart', 'pink'], cond: ['okc', 'brown'] };
export const pastille = t => { const [i, c] = FAM[t.famille] || FAM.cond; return `<span class="pas" style="--pc:var(--c-${c})">${ico(i)}</span>`; };

export function sortieAnnotee(sortie, notes = []) {
  const zones = [];
  notes.forEach((n, i) => {
    const d = sortie.indexOf(n.cible);
    if (d >= 0 && !zones.some(z => d < z.f && d + n.cible.length > z.d)) zones.push({ d, f: d + n.cible.length, i: i + 1 });
  });
  zones.sort((a, b) => a.d - b.d);
  let html = '', pos = 0;
  for (const z of zones) { html += esc(sortie.slice(pos, z.d)) + `<mark>${esc(sortie.slice(z.d, z.f))}</mark><sup>${z.i}</sup>`; pos = z.f; }
  return `<pre class="out">${html + esc(sortie.slice(pos))}</pre>` +
    notes.map((n, i) => `<div class="row top"><span class="num">${i + 1}</span><div class="t"><p>${esc(n.texte)}</p></div></div>`).join('');
}

const info = (txt, code, run) => `<div class="row top">${ico('info')}<div class="t"><p>${esc(txt)}</p>${code ? blocCode(code, '', true, run) : ''}</div></div>`;

// role : petite étiquette au-dessus (« Test conseillé ») ; apres : HTML inséré juste sous la carte du test ;
// deux : sur PC, la carte (et apres) à gauche, le reste de la fiche à droite
export function ficheTest(t, role = '', apres = '', deux = false) {
  const ex = t.exemple, pkg = !BASE.includes(t.package);
  return `<article class="fiche${deux ? ' cols side' : ''}" aria-labelledby="t-${t.id}"><div>
    <div class="rg">${role ? `<p class="reco">${ico('okc')}${esc(role)}</p>` : ''}<div class="rv">${pastille(t)}<span class="fn">${esc(nomFonction(t))}</span><h3 class="tn" id="t-${t.id}">${esc(t.titre)}</h3><span class="tag">${esc(t.type)}</span></div>
      <p class="eq">${esc(t.resume)}</p>
      <div class="acts"><a class="ab" href="${urlAide(t)}" target="_blank" rel="noopener">${ico('ext')}<span>Aide officielle de ${esc(t.fonction)}()</span></a></div></div>
    ${apres}</div><div>
    ${gh('Hypothèses')}<div class="grp"><div class="row top"><span class="hy">H<sub>0</sub></span><div class="t"><p>${esc(t.h0)}</p></div></div><div class="row top"><span class="hy">H<sub>1</sub></span><div class="t"><p>${esc(t.h1)}</p></div></div></div>
    ${gh('Conditions')}<div class="grp">${t.conditions.length ? t.conditions.map(c => `<div class="row top">${ico('okc')}<div class="t"><p>${esc(c.texte)}</p>${c.code ? blocCode(c.code, '', true) : ''}</div></div>`).join('') : '<div class="row"><div class="t"><p>Aucune condition particulière.</p></div></div>'}</div>
    ${gh('Code R')}<div class="grp">${blocCode(t.code)}</div>
    ${astuce(pkg ? `Ce test utilise le package <b>${esc(t.package)}</b> : installe-le une seule fois avec install.packages("${esc(t.package)}"). ${RSTUDIO}` : RSTUDIO)}
    ${t.remarques?.length ? gh('À savoir') + `<div class="grp">${t.remarques.map(r => info(r)).join('')}</div>` : ''}
    ${t.situations?.length ? gh('Exemples de situations') + `<div class="grp">${t.situations.map(s => info(s.texte, s.code, s.autonome)).join('')}</div>` : ''}
    ${ex ? gh('Exemple de sortie annotée') + `<div class="grp">${blocCode(ex.code, 'Code de l\'exemple', false, true)}</div><div class="grp">${sortieAnnotee(ex.sortie, ex.notes)}
      <p class="concl"><b>Conclusion au risque 5 % :</b> ${esc(ex.conclusion)}</p></div>` : ''}</div></article>`;
}
