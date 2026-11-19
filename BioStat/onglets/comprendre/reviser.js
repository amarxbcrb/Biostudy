// Comprendre › Réviser : un énoncé, l'étudiant choisit le test. Score dans localStorage (lecture et écriture protégées).
import { data, esc, titre, gh, ico } from '../../js/app.js';
import { fichier } from './onglet.js';

const CLE = 'biostudy-quiz';
const vide = () => ({ bonnes: 0, total: 0, vues: [] });
const lireScore = () => { try { return JSON.parse(localStorage.getItem(CLE)) || vide(); } catch { return vide(); } };
const ecrire = s => { try { localStorage.setItem(CLE, JSON.stringify(s)); } catch { /* stockage indisponible : score gardé pour cette page seulement */ } };

export async function afficher(vue, [qid]) {
  const [{ questions }, { tests }] = await Promise.all([fichier('quiz.json'), data('tests')]);
  const T = Object.fromEntries(tests.map(t => [t.id, t]));
  const s = lireScore();
  let q = questions.find(x => x.id === qid);
  if (!q) {
    let reste = questions.filter(x => !s.vues.includes(x.id));
    if (!reste.length) { s.vues = []; ecrire(s); reste = questions; }
    q = reste[Math.floor(Math.random() * reste.length)];
  }
  const score = () => `${ico('cap')}<span>Score : <b>${s.bonnes} / ${s.total}</b>${s.total ? ` (${Math.round(100 * s.bonnes / s.total)} %)` : ''} · ${s.vues.length} / ${questions.length} énoncés vus</span>`;
  vue.innerHTML = titre('Réviser', 'Lis la situation et choisis le test adapté. La correction explique pourquoi.') +
    `<div class="narrow">${gh('Énoncé')}<section class="grp" aria-labelledby="qe"><p class="q" id="qe">${esc(q.enonce)}</p></section>
      ${gh('Quel test choisis-tu ?')}<div class="grp" id="rep">${q.choix.map((id, i) => `<button type="button" class="row" data-r="${id}"><span class="pas">${'ABCD'[i]}</span><div class="t"><b>${esc(T[id].titre)}</b></div></button>`).join('')}</div>
      <div id="corr" aria-live="polite"></div>
      <p class="actions"><button type="button" class="btn pri" id="suiv">Question suivante</button><button type="button" class="btn" id="raz">${ico('reset')}Remettre à zéro</button></p>
      <p class="tip" id="sc">${score()}</p></div>`;
  const corr = vue.querySelector('#corr');
  vue.querySelector('#rep').addEventListener('click', e => {
    const b = e.target.closest('[data-r]');
    if (!b || corr.textContent) return;
    const ok = b.dataset.r === q.reponse, bonne = T[q.reponse];
    vue.querySelectorAll('[data-r]').forEach(x => {
      x.disabled = true;
      if (x.dataset.r === q.reponse) { x.classList.add('juste'); x.querySelector('.pas').innerHTML = ico('check'); }
    });
    if (!ok) { b.classList.add('faux'); b.querySelector('.pas').innerHTML = ico('x'); }
    s.total++; s.bonnes += ok; if (!s.vues.includes(q.id)) s.vues.push(q.id); ecrire(s);
    corr.innerHTML = gh(ok ? 'Bonne réponse' : 'Pas tout à fait') + `<div class="grp"><p class="concl ${ok ? 'ok' : 'no'}">${ok ? '' : `<b>La réponse attendue est ${esc(bonne.titre)}.</b> `}${esc(q.explication)}</p>
      <div class="acts"><a class="ab" href="#/fiche/${bonne.id}">${ico('book')}<span>Voir la fiche</span></a></div></div>`;
    vue.querySelector('#sc').innerHTML = score();
  });
  vue.querySelector('#suiv').addEventListener('click', () => (location.hash === '#/reviser' ? afficher(vue, []) : (location.hash = '#/reviser')));
  vue.querySelector('#raz').addEventListener('click', () => { Object.assign(s, vide()); ecrire(s); vue.querySelector('#sc').innerHTML = score(); });
}
