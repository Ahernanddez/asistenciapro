/* ============================================================
   AsistenciaPro — Service Worker (PWA offline support)
   ============================================================ */

// Cambia esta version cada vez que actualices archivos
const CACHE_NAME = 'asispro-v4';

// Detect base path for GitHub Pages subpath support
const BASE = self.registration.scope;
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './jspdf.umd.min.js',
  './jspdf.plugin.autotable.min.js'
];

// Install — cache all critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches and notify clients of update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.matchAll()).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
      return self.clients.claim();
    })
  );
});

// Fetch — network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  // Always try network first for navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })  .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // For assets: cache-first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
