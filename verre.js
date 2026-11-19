/* verre.js : comportement du design de BioConvert, partagé par les autres outils (voir verre.css).
   - reflet du verre qui suit le doigt / la souris sur les cartes
   - bsResAnim : la carte résultat se révèle (clip + ressort)
   - fenêtre d'unités #upop : ressort qui part de la capsule touchée (+ bsUpOut à la fermeture)
   - bsEnter : entrée en cascade d'un onglet
   Chargé par menu-flottant.js. BioConvert (html[data-verre=own]) garde son propre code. */
(() => {
  'use strict';
  const root = document.documentElement, mode = root.dataset.verre;
  if (!mode || mode === 'own' || window.bsVerre) return;
  window.bsVerre = 1;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, SPRING = 'cubic-bezier(.34,1.45,.64,1)';

  /* 1. reflet sur les cartes */
  const SEL = '.grp,.rg,.cta,.fold,.seg.cal,.out,.fcard,.aa-card,.pmap';
  let cur = null;
  const aim = (el, e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px'); };
  const hover = e => {
    const el = e.target.closest && e.target.closest(SEL);
    if (el !== cur) { if (cur) cur.classList.remove('lit'); cur = el; if (el) el.classList.add('lit'); }
    if (el) aim(el, e);
  };
  document.addEventListener('pointermove', hover, { passive: true });
  document.addEventListener('pointerdown', hover, { passive: true });
  ['pointerup', 'pointercancel'].forEach(n => document.addEventListener(n, e => { if (e.pointerType !== 'mouse' && cur) { cur.classList.remove('lit'); cur = null; } }));
  document.addEventListener('pointerleave', () => { if (cur) { cur.classList.remove('lit'); cur = null; } });

  /* 2. révélation de la carte résultat */
  window.bsResAnim = (dir, delay) => {
    if (RM) return;
    const g = document.querySelector('.rg'); if (!g) return;
    g.animate([{ opacity: 0, transform: 'translateY(18px)', clipPath: 'inset(0 40% round 44px)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0% round 22px)' }],
      { duration: 800, delay: delay || 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
  };

  /* 3. fenêtre d'unités : ressort qui part de la capsule touchée */
  let trig = null;
  addEventListener('click', e => { const t = e.target.closest && e.target.closest('button,.ucap,.uc,.nf'); if (t) trig = t; }, true);
  window.bsUpOut = (el, done) => {
    const a = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    a.onfinish = () => { done && done(); a.cancel(); };
  };
  const up = document.getElementById('upop');
  if (up) {
    const inAnim = (el, b) => {
      el.getAnimations().forEach(a => a.cancel());
      const r = b.getBoundingClientRect(), L = parseFloat(el.style.left) || 0, T = parseFloat(el.style.top) || 0, below = T >= r.top,
        ox = Math.max(0, Math.min(el.offsetWidth, r.left + r.width / 2 - L));
      el.style.transformOrigin = `${ox}px ${below ? '0' : '100%'}`;
      el.animate([{ opacity: 0, transform: `scale(.82) translateY(${below ? -10 : 10}px)` }, { opacity: 1, transform: 'none' }], { duration: 460, easing: SPRING });
      el.querySelectorAll('.up-n button').forEach((x, k) => x.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 70 + k * 22, easing: SPRING, fill: 'backwards' }));
    };
    let was = !up.hidden;
    new MutationObserver(() => { const v = !up.hidden; if (v && !was && !RM && trig) inAnim(up, trig); was = v; }).observe(up, { attributes: true, attributeFilter: ['hidden'] });
  }

  /* 4. entrée d'un onglet en cascade */
  window.bsEnter = (box, dir) => {
    if (RM || !box) return;
    [...box.children].slice(0, 10).forEach((e, k) => e.animate([{ opacity: 0, transform: `translateX(${(dir || 1) * 30}px)` }, { opacity: 1, transform: 'none' }],
      { duration: 520, delay: k * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  };
  /* 5. formule et aide repliées (outils de calcul), comme BioConvert */
  const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
  const head = t => `<button type="button" class="fh" aria-expanded="false"><span>${t}</span>${CHEV}</button>`;
  const HINT = ['Touchez la grandeur recherchée.', 'Saisissez les données. Touchez une unité pour la changer ou pour écrire en 1,5 × 10ⁿ.', 'Le résultat s’affiche tout de suite. « Préparer au labo » donne le pas à pas quand il existe.'];
  const folds = () => document.querySelectorAll('#bc .view').forEach(v => {
    if (v.dataset.fold) return;
    const fl = v.querySelector('p.fl'); if (!fl) return;
    v.dataset.fold = 1;
    const sp = fl.querySelector('span[id$="-fml"]'), sm = fl.querySelector('small'); if (sm) sm.remove();
    fl.classList.add('fold'); fl.dataset.t = 'f';
    fl.innerHTML = head('Afficher la formule') + '<div class="fx"><div></div></div>'; fl.querySelector('.fx>div').appendChild(sp);
    const how = document.createElement('div'); how.className = 'fold'; how.dataset.t = 'h';
    how.innerHTML = head('Comment ça marche ?') + `<div class="fx"><div><div class="how"><ol>${HINT.map(x => `<li>${x}</li>`).join('')}</ol><button type="button" class="ex">Essayer un exemple</button></div></div></div>`;
    v.insertBefore(how, v.firstChild);
  });
  if (mode === 'calc') {
    folds();
    document.addEventListener('click', e => {
      const fh = e.target.closest && e.target.closest('#bc .fh');
      if (fh) {
        const f = fh.parentNode, on = !f.classList.contains('open');
        f.classList.toggle('open', on); fh.setAttribute('aria-expanded', on);
        fh.firstElementChild.textContent = f.dataset.t === 'f' ? (on ? 'Masquer la formule' : 'Afficher la formule') : (on ? 'Masquer l’aide' : 'Comment ça marche ?');
        return;
      }
      const ex = e.target.closest && e.target.closest('#bc .how .ex');
      if (ex) ex.closest('.view').querySelectorAll('.vr:not([hidden]) input[placeholder]').forEach(el => {
        if (el.offsetParent === null) return;
        el.value = el.placeholder.replace(/\s/g, ''); el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }
})();
