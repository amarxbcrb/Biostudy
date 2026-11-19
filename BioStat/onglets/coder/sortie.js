// Coder › Interpréter un résultat R : colle la sortie, BioStat surligne l'essentiel et rédige des phrases scientifiques
// (lecture dans interpretation.js). Un format inconnu est signalé, jamais deviné.
import { data, esc, titre, gh, ico, astuce } from '../../js/app.js';
import { interpreter } from './interpretation.js';

let texte = '';
const EXEMPLES = [['t-test-welch', 'Test t de Welch'], ['anova-2', 'ANOVA à 2 facteurs'], ['kruskal', 'Kruskal-Wallis et comparaisons 2 à 2'], ['chisq', 'Test du χ²'], ['cor-pearson', 'Corrélation de Pearson'], ['lm-reg', 'Régression linéaire']];

export async function afficher(vue) {
  const { tests } = await data('tests');
  vue.innerHTML = titre('Interpréter un résultat R', 'Colle ce que RStudio a affiché : BioStat surligne les valeurs importantes et rédige des phrases scientifiques claires, prêtes pour ton rapport.') +
    `<div class="cols side"><div>${gh('Sortie R')}<div class="grp"><div style="padding:12px"><textarea class="ta" id="so" rows="13" wrap="off" spellcheck="false" autocapitalize="off" aria-label="Sortie R à interpréter"
      placeholder="Colle ici la sortie complète, depuis le nom du test (par exemple « Welch Two Sample t-test ») ou depuis la ligne « Df Sum Sq … » d'une ANOVA."></textarea></div></div>
      ${astuce('Reconnus : t.test, wilcox.test, chisq.test, fisher.test, mcnemar.test, cor.test, shapiro.test, kruskal.test, friedman.test, bartlett.test, var.test, oneway.test, prop.test, binom.test, summary(aov()) (1, 2 ou 3 facteurs, mesures répétées), summary(lm()), summary(glm(…, family = binomial)) et pairwise.t.test / pairwise.wilcox.test.')}
      ${gh('Ou essaie avec un exemple')}<div class="grp">${EXEMPLES.map(([id, l]) => `<button type="button" class="opt" data-ex="${id}"><span>${esc(l)}</span>${ico('play')}</button>`).join('')}</div></div>
      <div aria-live="polite" id="lu"></div></div>`;
  const zone = vue.querySelector('#so'), lu = vue.querySelector('#lu');
  const maj = () => {
    texte = zone.value;
    if (!texte.trim()) { lu.innerHTML = gh('Interprétation') + astuce('Dans RStudio, sélectionne la sortie dans la console, copie-la et colle-la ici. Ou touche un exemple.'); return; }
    const { texte: t, resultats } = interpreter(texte);
    if (!resultats.length) { lu.innerHTML = gh('Interprétation') + astuce('Format non reconnu : colle la sortie complète, sans la modifier, depuis la ligne du nom du test (ou la ligne « Df Sum Sq » d\'une ANOVA, ou « Call: » d\'un modèle) jusqu\'à la fin. La liste des sorties reconnues est sous le champ.', 'err', 'warn'); return; }
    const zones = resultats.flatMap(r => r.zones).sort((a, b) => a.d - b.d);
    let html = '', pos = 0;
    for (const z of zones) { if (z.d < pos) continue; html += esc(t.slice(pos, z.d)) + `<mark class="k-${z.cls}">${esc(t.slice(z.d, z.f))}</mark>`; pos = z.f; }
    const rapport = resultats.flatMap(r => r.phrases).join(' ');
    lu.innerHTML = gh('Sortie lue') + `<div class="grp"><pre class="out">${html + esc(t.slice(pos))}</pre>
      <p class="leg"><span class="k-stat">statistique</span><span class="k-ddl">ddl</span><span class="k-p">p-value</span><span class="k-ic">IC, R²</span><span class="k-est">estimation</span></p></div>` +
      resultats.map(r => gh(`Interprétation · ${r.nom}`) + `<div class="grp">${r.phrases.map((p, i) => `<p class="concl ${i === 0 ? (r.significatif ? 'ok' : 'no') : ''}">${esc(p)}</p>`).join('')}</div>`).join('') +
      `<div class="grp" style="margin-top:12px"><div class="acts"><button class="ab" type="button" data-copie="${esc(rapport)}">${ico('copy')}<span>Copier les phrases pour le rapport</span></button></div></div>` +
      astuce('Au risque α = 5 %. « Non significatif » ne prouve pas l\'absence d\'effet : cela veut dire que les données ne permettent pas de le montrer.');
  };
  vue.onclick = e => {
    const b = e.target.closest('[data-ex]');
    if (!b) return;
    zone.value = tests.find(t => t.id === b.dataset.ex).exemple.sortie;
    maj(); lu.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  zone.value = texte;
  zone.addEventListener('input', maj);
  maj();
}
