/**
 * GEBAT 360° — OFFICIAL PWA SERVICE WORKER
 * Complies with Chrome, Edge, Safari & Mobile PWA Installation Criteria.
 */

const CACHE_NAME = 'gebat360-pwa-v507-final';

// Ne PAS inclure index.html ni '/' dans le precache pour forcer le chargement de la dernière version du HTML
const STATIC_ASSETS = [
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

  // Navigation (HTML index.html) -> TOUJOURS EN DIRECT DU RÉSEAU SANS CACHE
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets JS / CSS / Images
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          if (url.pathname.endsWith('.js')) {
            console.warn('⚠️ [PWA SW] Fichier JS non-200 ou introuvable:', url.pathname);
            return new Response(
              'console.warn("Script obsolète détecté. Purge et réinitialisation..."); if("caches" in window){caches.keys().then(ns=>ns.forEach(n=>caches.delete(n)));} window.location.replace(window.location.origin + window.location.pathname + "?_t=" + Date.now());',
              { headers: { 'Content-Type': 'application/javascript' } }
            );
          }
          return networkResponse;
        }

        const contentType = networkResponse.headers.get('content-type') || '';
        // Si un fichier JS renvoie text/html (Single Page App 404 Fallback), le hash est obsolète
        if (url.pathname.endsWith('.js') && contentType.includes('text/html')) {
          console.warn('⚠️ [PWA SW] Fichier JS obsolète retourné sous forme text/html:', url.pathname);
          return new Response(
            'console.warn("Script obsolète détecté (Fallback HTML). Purge et réinitialisation..."); if("caches" in window){caches.keys().then(ns=>ns.forEach(n=>caches.delete(n)));} window.location.replace(window.location.origin + window.location.pathname + "?_t=" + Date.now());',
            { headers: { 'Content-Type': 'application/javascript' } }
          );
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
