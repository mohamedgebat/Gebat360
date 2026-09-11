/**
 * GEBAT 360° — OFFICIAL PWA SERVICE WORKER v563
 * Network-first pour tous les assets JS/CSS afin de garantir la synchronisation SSOT.
 * Les assets statiques (images, icônes) sont en stale-while-revalidate.
 */

const CACHE_NAME = 'gebat360-pwa-v563-ssot';
const STATIC_ASSETS_ONLY = [
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/logo_gebat.png',
  '/logo_gebat_official.png',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  console.log('📱 [PWA v563] Service Worker Install — SSOT Sync');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS_ONLY).catch((err) => {
        console.warn('⚠️ [PWA] Pre-cache partiel:', err);
      });
    })
  );
  // Force activation immédiate sans attendre la fermeture des onglets
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('📱 [PWA v563] Service Worker Activated — Purge anciens caches');
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

  // Ne pas intercepter les requêtes API backend ou Supabase
  const url = new URL(event.request.url);
  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io')
  ) {
    return;
  }

  // Navigation (HTML) → TOUJOURS réseau, jamais cache
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Fichiers JS et CSS → NETWORK FIRST (garantit que la dernière version du moteur de calcul est toujours utilisée)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const contentType = networkResponse.headers.get('content-type') || '';
            // Si le serveur retourne du HTML pour un .js (hash obsolète SPA), purger
            if (url.pathname.endsWith('.js') && contentType.includes('text/html')) {
              console.warn('⚠️ [PWA v563] JS obsolète (HTML fallback détecté) — Purge et refresh');
              caches.keys().then(ns => ns.forEach(n => caches.delete(n)));
              return new Response(
                `window.location.replace(window.location.origin + window.location.pathname + "?_r=" + Date.now());`,
                { headers: { 'Content-Type': 'application/javascript' } }
              );
            }
            // Mettre en cache pour usage hors ligne
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Hors ligne : servir depuis le cache si disponible
          return caches.match(event.request);
        })
    );
    return;
  }

  // Autres assets (images, icônes, fonts) → stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      });
      return cached || networkFetch;
    })
  );
});
