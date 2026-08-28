/**
 * GEBAT 360° — ACTIVE PWA SERVICE WORKER
 * Full offline support, asset caching, and background synchronization.
 */

const CACHE_NAME = 'gebat360-pwa-v195';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_gebat.png',
  '/logo_gebat_official.png',
  '/favicon.svg'
];

// 1. INSTALL EVENT: Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [PWA Service Worker] Installation & Pre-caching des assets GEBAT 360');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 [PWA Service Worker] Nettoyage ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('⚡ [PWA Service Worker] Service Worker actif et prêt !');
      return self.clients.claim();
    })
  );
});

// 3. FETCH EVENT: Cache-First for static assets, Network-First for API/dynamic requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or browser extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Strategy for API calls: Network-First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Strategy for static assets & pages: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('⚠️ [PWA Service Worker] Mode hors-ligne actif pour:', request.url);
        });

      return cachedResponse || fetchPromise;
    })
  );
});
