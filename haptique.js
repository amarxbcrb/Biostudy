/* Retour haptique BioStudy, commun à toutes les pages.
   Android : navigator.vibrate. iPhone (iOS 18+) : clic sur un interrupteur <input switch> caché, seul moyen de déclencher le moteur haptique.
   Chargé par menu-flottant.js (ou directement par les pages sans menu). Les pages qui gèrent déjà leur haptique
   (BioChem, BioPCR, BioMicro, BioCampus, accueil) portent data-haptic="own" sur <html> : rien n'est ajouté chez elles.
   window.bsBuzz(motif) reste disponible pour un appel manuel. */
(() => {
  if (window.bsBuzz) return;
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let last = 0;
  function buzz(p = 10) {
    const now = Date.now();
    if (now - last < 70) return;   // un seul retour par geste (ex. label + case associée)
    last = now;
    try {
      if (navigator.vibrate) { navigator.vibrate(p); return; }
      if (!IOS) return;
      const l = document.createElement('label'), i = document.createElement('input');
      i.type = 'checkbox'; i.setAttribute('switch', '');
      l.dataset.hap = ''; l.style.display = 'none'; l.appendChild(i);
      l.addEventListener('click', e => e.stopPropagation());   // ce clic technique ne doit pas atteindre les scripts de la page
      document.head.appendChild(l); l.click(); l.remove();
    } catch (e) {}
  }
  window.bsBuzz = buzz;
  if (document.documentElement.dataset.haptic === 'own') return;

  const TAP = 'button,a[href],[role=button],[role=tab],[role=switch],[role=menuitem],[role=option],summary,label,select,input[type=checkbox],input[type=radio],[data-menu],[onclick]';
  const FORT = 'input[type=checkbox],input[type=radio],[role=switch],[role=tab],[aria-pressed]';
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest || t.closest('[data-hap]')) return;
    const el = t.closest(TAP);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    buzz(el.matches(FORT) ? [14] : 9);
  }, true);
  /* listes déroulantes et curseurs : retour au changement de valeur */
  document.addEventListener('change', e => { const t = e.target; if (t && t.matches && t.matches('select,input[type=range]')) buzz(8); }, true);
})();
