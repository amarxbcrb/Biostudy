/* BioStudy — service worker unique du site (une seule application installable).
   Réseau d'abord : les mises à jour arrivent tout de suite ; copie locale en secours hors connexion. */
const CACHE = 'bs-v3';
const CORE = ['/', '/manifest.webmanifest', '/Pictures/icon-192.png', '/Pictures/favicon.png',
  '/liquid-glass.js', '/footer-global.js', '/menu-flottant.js', '/vitrine.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /^\/(api|studio)\//.test(u.pathname)) return;
  /* fichier versionné (app.js?v=48…) ou image : copie locale tout de suite, mise à jour en arrière-plan (chargement instantané) */
  if (/[?&]v=/.test(u.search) || /\.(png|jpe?g|webp|svg|gif|ico|woff2?)$/i.test(u.pathname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res.ok && !res.redirected) c.put(r, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    })));
    return;
  }
  e.respondWith(fetch(r, r.mode === 'navigate' ? { cache: 'no-cache' } : undefined).then(res => {
    if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('/') : Response.error()))));
});

/* notifications push : le message arrive sans contenu, on lit la dernière notification sur le serveur puis on l'affiche */
self.addEventListener('push', e => {
  const show = n => self.registration.showNotification(n.title || 'BioStudy', { body: n.body || '', icon: '/Pictures/icon-192.png', image: n.image || undefined, tag: n.id || 'biostudy',
    actions: (n.actions || []).map(a => ({ action: a.action, title: a.title })), data: { url: n.url || '/', actions: n.actions || [] } });
  e.waitUntil(fetch('/api/vitrine/push-last', { cache: 'no-store' }).then(r => r.json()).then(d => show(d.notif || {})).catch(() => show({ body: 'Nouveauté sur BioStudy' })));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {}, act = (d.actions || []).find(a => a.action === e.action);   // bouton touché, sinon la notification
  const url = new URL((act && act.url) || d.url || '/', self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if (c.url === url && 'focus' in c) return c.focus();
    return clients.openWindow(url);
  }));
});
