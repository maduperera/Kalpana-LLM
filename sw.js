/**
 * Kalpanā LLM PWA Service Worker
 * Robust Offline-First Caching Strategy with Model Cache Persistence & Auto-Purge
 * (c) Vijñāna AI | Kalpanā
 */

const VERSION = '8.0.0';
const CACHE_NAME = `kalpana-llm-cache-v${VERSION}`;

const ASSETS_TO_PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './kalpana-phase-kernel.js',
  './kalpana_core.wasm',
  './spectrum-visualizer.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-1024.png',
  './assets/curl-white.svg',
  './assets/curl-black.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
];

// Install: Cache all core assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`⚡ Kalpanā Service Worker v${VERSION}: Pre-caching core offline assets...`);
      return Promise.allSettled(
        ASSETS_TO_PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
    })
  );
});

// Activate: Delete old cache versions and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && !name.startsWith('webllm/')) {
            console.log(`🗑️ Kalpanā SW: Purging old cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// 1. App shell & local files: Network-first with Cache fallback
// 2. External CDN JS/CSS/Fonts: Stale-While-Revalidate / Cache-First
// 3. Navigation requests: Fallback to index.html when offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. External CDN libraries (esm.run, cdnjs, jsdelivr): Cache-first with Network update
  if (url.origin.includes('esm.run') || url.origin.includes('jsdelivr.net') || url.origin.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version immediately, optionally fetch in background to update
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {/* offline, ignore */});
            return cachedResponse;
          }

          // If not in cache, fetch from network and cache for next time
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
        });
      })
    );
    return;
  }

  // 2. Standard App Shell files: Network-first with instant offline cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: Serve from Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline: Content not cached yet', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
