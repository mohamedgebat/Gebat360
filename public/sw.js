/**
 * GEBAT 360° — OFFICIAL PWA SERVICE WORKER
 * Complies with Chrome, Edge, Safari & Mobile PWA Installation Criteria.
 */

const CACHE_NAME = 'gebat360-pwa-v197';

self.addEventListener('install', (event) => {
  console.log('[PWA] Service Worker Install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[PWA] Service Worker Activate');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});
