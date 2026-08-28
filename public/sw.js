// Auto-cleanup Service Worker pour réinitialiser les caches réseau obsolètes du navigateur
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
