/**
 * Kalpanā LLM PWA Service Worker
 * Network-First Caching Strategy with Instant Offline Fallback & Auto-Cache Purge
 */

const VERSION = '5.5.0';
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
  './assets/icon-512.png'
];

// Install: Cache new core assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`⚡ Kalpanā Service Worker v${VERSION}: Pre-caching core assets...`);
      return Promise.allSettled(
        ASSETS_TO_PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
    })
  );
});

// Activate: Delete all old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log(`🗑️ Kalpanā SW: Purging old cache: ${name}`);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First Strategy for HTML/JS/CSS (Always get latest version when online)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Let WebLLM / HuggingFace model CDN requests pass through directly
  if (event.request.url.includes('huggingface.co') || event.request.url.includes('esm.run') || event.request.url.includes('jsdelivr.net')) {
    return;
  }

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
        // Offline Fallback: Serve from Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
