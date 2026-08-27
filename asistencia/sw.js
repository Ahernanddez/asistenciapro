/* ============================================================
   AsistenciaPro — Service Worker (PWA offline support)
   Strategy: Network-first (always serve latest version)
   ============================================================ */

const CACHE_NAME = 'asispro-live';
const OFFLINE_PAGE = './index.html';

// Install — activate immediately, no pre-cache needed
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — clean ALL old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.matchAll()).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      return self.clients.claim();
    })
  );
});

// Fetch — network-first for ALL requests (HTML, JS, CSS, images, etc.)
// Falls back to cache only when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Save a copy in cache for offline use
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Last resort: serve index.html for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_PAGE);
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
