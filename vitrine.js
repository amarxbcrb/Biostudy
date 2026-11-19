/* =========================================================================
   VITRINE BIOSTUDY — affiche les contenus mis en avant (gérés dans /studio/)
   Formats : fenetre (fenêtre centrée), carte (carte flottante), bande (avant le pied de page)
   Chargé par menu-flottant.js sur toutes les pages (ou par une balise <script>).
   Vitrine.render(item, { cible }) sert aussi à l'aperçu du studio.
   ========================================================================= */
(function () {
  'use strict';
  if (window.Vitrine) return;
  const API = '/api/vitrine';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, s) { try { return JSON.parse((s ? sessionStorage : localStorage).getItem(k)) || {}; } catch (e) { return {}; } },
    set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const pageKey = () => (decodeURIComponent(location.pathname).split('/').filter(Boolean)[0] || 'accueil').replace(/\.html$/i, '').toLowerCase();

  /* ---------- thème : suit la page (data-theme, body.theme-*, sinon le système) ---------- */
  function isDark() {
    const r = document.documentElement, b = document.body;
    if (r.dataset.theme) return r.dataset.theme === 'dark';
    if (b && b.classList.contains('theme-light')) return false;
    if (b && (b.classList.contains('theme-dark') || b.classList.contains('dark-mode') || b.classList.contains('dark'))) return true;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  const CSS = `
.vt-root{--vt-bg:rgba(255,255,255,.86);--vt-tx:#1c1c1e;--vt-tx2:#5c5c62;--vt-line:rgba(60,60,67,.14);--vt-sh:0 24px 60px rgba(20,30,60,.18);--vt-veil:rgba(20,22,30,.32);
  --vt-acc:#0a84ff;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;color:var(--vt-tx);-webkit-font-smoothing:antialiased;line-height:1.4;text-align:left}
.vt-root.vt-dark{--vt-bg:rgba(30,30,34,.86);--vt-tx:#fff;--vt-tx2:#a1a1a6;--vt-line:rgba(255,255,255,.1);--vt-sh:0 24px 60px rgba(0,0,0,.55);--vt-veil:rgba(0,0,0,.5)}
.vt-root *{box-sizing:border-box;margin:0;padding:0}
.vt-box{position:relative;background:var(--vt-bg);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
  border:1px solid var(--vt-line);border-radius:28px;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),var(--vt-sh);overflow:hidden}
.vt-media{display:block;width:100%;background:#000;aspect-ratio:16/9;object-fit:cover;border:0}
img.vt-media{background:transparent;aspect-ratio:auto;max-height:340px}
.vt-body{padding:18px 20px 20px;display:flex;flex-direction:column;gap:8px}
.vt-t{font-size:19px;font-weight:800;letter-spacing:-.3px;line-height:1.2}
.vt-p{font-size:14.5px;color:var(--vt-tx2);white-space:pre-line;overflow-wrap:anywhere}
.vt-btn{align-self:flex-start;margin-top:6px;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 20px;border-radius:999px;background:var(--vt-acc);color:#fff;
  font-weight:700;font-size:15px;text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 6px 16px rgba(0,0,0,.18);transition:transform .3s cubic-bezier(.34,1.45,.64,1)}
.vt-btn:active{transform:scale(.95)}
.vt-x{position:absolute;top:10px;right:10px;z-index:2;width:34px;height:34px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;
  background:rgba(0,0,0,.42);color:#fff;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.vt-x svg{width:14px;height:14px}
/* fenêtre centrée */
.vt-veil{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--vt-veil);
  -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:vt-fade .3s ease}
.vt-veil .vt-box{width:min(440px,100%);max-height:calc(100dvh - 40px);overflow:auto;animation:vt-pop .55s cubic-bezier(.3,1.25,.5,1)}
/* carte flottante */
.vt-float{position:fixed;z-index:9000;right:16px;bottom:max(16px,env(safe-area-inset-bottom));width:min(340px,calc(100vw - 32px));animation:vt-up .55s cubic-bezier(.3,1.25,.5,1)}
.vt-float img.vt-media{max-height:180px}
@media(max-width:767px){.vt-float{left:12px;right:12px;width:auto;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 92px)}.vt-float img.vt-media{max-height:130px}.vt-float .vt-body{padding:14px 16px 16px}}
/* bande dans la page */
.vt-band{width:min(1100px,calc(100% - 24px));margin:24px auto}
.vt-band .vt-box{display:flex;align-items:stretch}
.vt-band .vt-media{width:40%;max-width:420px;aspect-ratio:auto;max-height:none;min-height:100%;flex-shrink:0}
.vt-band .vt-body{justify-content:center}
@media(max-width:640px){.vt-band .vt-box{flex-direction:column}.vt-band .vt-media{width:100%;max-width:none}}
@keyframes vt-fade{from{opacity:0}}@keyframes vt-pop{from{opacity:0;transform:scale(.92)}}@keyframes vt-up{from{opacity:0;transform:translateY(30px)}}
@media(prefers-reduced-motion:reduce){.vt-root *{animation:none!important;transition:none!important}}`;
  function css() { if (document.getElementById('vtCss')) return; const s = document.createElement('style'); s.id = 'vtCss'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- médias ---------- */
  const src = m => (m && m.id ? API + '/m/' + m.id : m && m.url) || '';
  function yt(u) { const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(u || ''); return m && m[1]; }
  function media(c, autoplay) {
    const v = c.video, i = c.image;
    if (v && (v.id || v.url)) {
      const id = yt(v.url);
      if (id) return `<iframe class="vt-media" src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1${autoplay ? '&autoplay=1&mute=1' : ''}" title="${esc(c.titre || 'Vidéo')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
      return `<video class="vt-media" src="${esc(src(v))}" ${autoplay ? 'autoplay muted loop' : ''} controls playsinline preload="metadata"${i && (i.id || i.url) ? ` poster="${esc(src(i))}"` : ''}></video>`;
    }
    if (i && (i.id || i.url)) return `<img class="vt-media" src="${esc(src(i))}" alt="${esc(c.titre || '')}" loading="lazy">`;
    return '';
  }
  const X = '<button class="vt-x" type="button" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  function inner(it, closable) {
    const c = it.contenu || {}, b = c.bouton || {};
    const ext = b.lien && /^https?:/i.test(b.lien) && !b.lien.startsWith(location.origin);
    return `<div class="vt-box" style="--vt-acc:${esc(c.couleur || '#0a84ff')}">${closable ? X : ''}${media(c, it.format === 'carte')}
      <div class="vt-body">${c.titre ? `<div class="vt-t">${esc(c.titre)}</div>` : ''}${c.texte ? `<div class="vt-p">${esc(c.texte)}</div>` : ''}
      ${b.texte && b.lien ? `<a class="vt-btn" href="${esc(b.lien)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(b.texte)}</a>` : ''}</div></div>`;
  }

  /* ---------- règles d'affichage par visiteur ----------
     maxVues (0 = illimité) par jour / par visite / au total, appareils, à partir de la n-ième page vue */
  const key = it => it.id + ':' + (it.rev || 0);
  const isMobile = () => matchMedia('(max-width: 767px)').matches;
  function count(it) {
    if (it.par === 'visite') return store.get('vt-v', true)[key(it)] || 0;
    const c = store.get('vt-c')[key(it)];
    if (!c) return 0;
    return it.par === 'jour' && Date.now() - c.t > 864e5 ? 0 : c.n;
  }
  function due(it, pv) {
    if (it.appareils === 'mobile' && !isMobile()) return false;
    if (it.appareils === 'ordi' && isMobile()) return false;
    if (pv < (it.apresPages || 1)) return false;
    return !it.maxVues || count(it) < it.maxVues;
  }
  function seen(it) {
    if (it.par === 'visite') { const v = store.get('vt-v', true); v[key(it)] = (v[key(it)] || 0) + 1; store.set('vt-v', v, true); return; }
    const all = store.get('vt-c'), c = all[key(it)];
    all[key(it)] = c && !(it.par === 'jour' && Date.now() - c.t > 864e5) ? { n: c.n + 1, t: c.t } : { n: 1, t: Date.now() };
    store.set('vt-c', all);
  }

  /* ---------- rendu ---------- */
  const roots = new Set();
  function root(el) { el.classList.add('vt-root'); el.classList.toggle('vt-dark', isDark()); roots.add(el); return el; }
  function render(it, opts) {
    css();
    const o = opts || {}, preview = !!o.cible, fmt = it.format || 'carte';
    const el = root(document.createElement(fmt === 'bande' ? 'section' : 'div'));
    el.setAttribute('aria-label', (it.contenu && it.contenu.titre) || 'BioStudy');
    if (fmt === 'fenetre') {
      el.className += ' vt-veil'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      el.innerHTML = inner(it, true);
      if (preview) el.style.position = 'absolute';
    } else if (fmt === 'carte') {
      el.className += ' vt-float'; el.innerHTML = inner(it, true);
      if (preview) Object.assign(el.style, { position: 'absolute', left: 'auto', right: '12px', bottom: '12px', width: 'min(340px, calc(100% - 24px))' });
    } else { el.className += ' vt-band'; el.innerHTML = inner(it, false); }
    const close = () => { el.remove(); roots.delete(el); };
    el.addEventListener('click', e => { if (e.target.closest('.vt-x') || e.target === el && fmt === 'fenetre') close(); });
    if (!preview && fmt === 'fenetre') document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    if (preview) { o.cible.innerHTML = ''; o.cible.appendChild(el); return el; }
    if (fmt === 'bande') {
      const foot = document.querySelector('.modern-transparent-footer, body > footer, main ~ footer, .shell > footer');
      if (foot && foot.parentNode) foot.parentNode.insertBefore(el, foot); else (document.querySelector('main') || document.body).appendChild(el);
    } else { document.body.appendChild(el); if (fmt === 'fenetre') { const ae = document.activeElement; if (!ae || !ae.matches('input,textarea,select,[contenteditable]')) el.querySelector('.vt-x').focus({ preventScroll: true }); } }
    seen(it);
    return el;
  }

  /* ---------- chargement : après le contenu de la page, pour ne pas la ralentir ---------- */
  async function mount() {
    if (/^\/studio(\/|$)/i.test(location.pathname)) return;
    let data;
    try { const r = await fetch(API + '/live?p=' + encodeURIComponent(pageKey()), { credentials: 'omit' }); if (!r.ok) return; data = await r.json(); } catch (e) { return; }
    const items = (data && data.items) || [];
    /* pages vues pendant cette visite (pour « à partir de la n-ième page ») */
    const pv = (store.get('vt-p', true).n || 0) + 1; store.set('vt-p', { n: pv }, true);
    const show = it => it.delai ? setTimeout(() => render(it), it.delai * 1000) : render(it);
    items.filter(it => it.format === 'bande' && due(it, pv)).forEach(show);
    const pop = items.find(it => it.format === 'fenetre' && due(it, pv));       // une seule fenêtre à la fois
    if (pop) show(pop);
    const card = items.find(it => it.format === 'carte' && due(it, pv));
    if (card) show(card);
  }
  /* suit les changements de thème de la page */
  const syncTheme = () => roots.forEach(el => el.classList.toggle('vt-dark', isDark()));
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  const watchBody = () => document.body && new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  window.Vitrine = { render, mount, isDark };
  if (window.__vtNoAuto) return;
  const start = () => { watchBody(); if (window.requestIdleCallback) requestIdleCallback(() => mount(), { timeout: 2500 }); else setTimeout(mount, 1200); };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
