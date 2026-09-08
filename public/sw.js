/**
 * GEBAT 360° — OFFICIAL PWA SERVICE WORKER
 * Complies with Chrome, Edge, Safari & Mobile PWA Installation Criteria.
 */

const CACHE_NAME = 'gebat360-pwa-v505';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/logo_gebat.png',
  '/logo_gebat_official.png'
];

self.addEventListener('install', (event) => {
  console.log('📱 [PWA] Service Worker Install Engine Activated');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('⚠️ [PWA] Pre-cache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('📱 [PWA] Service Worker Activated & Claiming Clients');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 [PWA] Purge ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Ne pas intercepter les requêtes API backend
  if (event.request.url.includes('/api/')) {
    return;
  }

  const url = new URL(event.request.url);

  // Stratégie Network First pour les requêtes HTML (index.html)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Pour les requêtes de scripts et d'assets (.js, .css)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const contentType = networkResponse.headers.get('content-type') || '';
          // Protection contre la réponse text/html sur un fichier JS obsolète (Single Page Fallback)
          if (url.pathname.endsWith('.js') && contentType.includes('text/html')) {
            console.warn('⚠️ [PWA SW] Hash de script obsolète (404 Fallback HTML):', url.pathname);
            return new Response('console.warn("Script obsolète détecté, rechargement..."); window.location.reload();', {
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
