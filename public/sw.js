/**
 * GEBAT 360° — AUTO-PURGE SERVICE WORKER v567
 * Purge immédiatement tous les caches et désactive le Service Worker
 * pour garantir que chaque client exécute toujours le dernier bundle JS.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Ne jamais mettre en cache les scripts ou HTML
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => caches.match(event.request))
  );
});
