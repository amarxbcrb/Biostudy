/* Ancien service worker propre à l'outil : remplacé par /sw.js (une seule application pour tout le site).
   Il se désinstalle et efface son cache. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== 'bs-v1').map(k => caches.delete(k))))
  .then(() => self.registration.unregister())));
