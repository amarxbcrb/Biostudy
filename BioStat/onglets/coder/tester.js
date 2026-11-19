// Coder › Tester : exécuter un petit bout de R dans le navigateur avec webR, chargé seulement au premier clic.
// API d'après docs.r-wasm.org : new WebR(), init(), new webR.Shelter(), captureR(), purge().
import { titre, tampon, gh, ico, astuce } from '../../js/app.js';

export const WEBR_URL = 'https://webr.r-wasm.org/latest/webr.mjs';
let webR = null, chargement = null, code = '# Écris ton code R ici\nmean(c(1, 2, 3))';

async function demarrer(etat) {
  if (!navigator.onLine) throw new Error('Tu es hors ligne : webR doit être téléchargé depuis webr.r-wasm.org la première fois. Reconnecte-toi puis réessaie.');
  etat('Chargement de R (WebAssembly) : quelques dizaines de secondes la première fois…');
  let mod;
  try { mod = await import(WEBR_URL); }
  catch { throw new Error('Impossible de télécharger webR depuis webr.r-wasm.org. Vérifie ta connexion internet (ou un bloqueur) puis réessaie.'); }
  const w = new mod.WebR({ interactive: false, baseUrl: new URL('./', WEBR_URL).href });
  await w.init();
  return w;
}

export function afficher(vue) {
  if (tampon.code) { code = tampon.code; tampon.code = ''; }
  vue.innerHTML = titre('Tester du code R', 'Essaie un bout de code sans rien installer : R tourne dans ton navigateur et rien n\'est envoyé. Pour ton vrai travail, sur tes données, utilise RStudio.') +
    `<div class="cols two"><div>${gh('Code R')}<div class="grp"><div style="padding:12px"><textarea class="ta" id="rc" rows="12" spellcheck="false" autocapitalize="off" aria-label="Code R à exécuter"></textarea></div>
      <div class="acts"><button type="button" class="ab" id="go">${ico('play')}<span>Exécuter</span></button></div></div>
      ${astuce('Seul R de base est disponible. Pour un autre package, exécute d\'abord par exemple <b>webr::install("car")</b>.')}</div>
      <div>${gh('Sortie')}<div class="grp"><p class="tip" id="etat" aria-live="polite"></p><pre class="out" id="out" aria-live="polite"></pre><div id="img"></div></div></div></div>`;
  const zone = vue.querySelector('#rc'), go = vue.querySelector('#go'), out = vue.querySelector('#out'), img = vue.querySelector('#img');
  const etat = t => { const e = vue.querySelector('#etat'); e.textContent = t; e.hidden = !t; };
  etat(webR ? '' : 'Touche « Exécuter » : la première fois, R met quelques dizaines de secondes à se charger.');
  zone.value = code;
  zone.addEventListener('input', () => (code = zone.value));
  go.addEventListener('click', async () => {
    go.disabled = true; out.textContent = ''; img.replaceChildren();
    try {
      webR ??= await (chargement ??= demarrer(etat).catch(e => { chargement = null; throw e; }));
      etat('Exécution…');
      const sh = await new webR.Shelter();
      try {
        const r = await sh.captureR(zone.value, { withAutoprint: true, captureStreams: true, captureConditions: false });
        for (const o of r.output) {
          const l = document.createElement('span');
          l.textContent = o.data + '\n';
          if (o.type === 'stderr') l.className = 'err';
          out.append(l);
        }
        for (const b of r.images) {
          const c = Object.assign(document.createElement('canvas'), { width: b.width, height: b.height });
          c.getContext('2d').drawImage(b, 0, 0);
          img.append(c);
        }
        etat(r.output.length || r.images.length ? '' : 'Code exécuté, sans sortie.');
      } finally { sh.purge(); }
    } catch (e) {
      etat('');
      out.innerHTML = '';
      out.append(Object.assign(document.createElement('span'), { className: 'err', textContent: 'Erreur : ' + (e.message || e) }));
    }
    go.disabled = false;
  });
}
