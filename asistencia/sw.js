/* ============================================================
   AsistenciaPro — Service Worker v2 (forced update)
   Strategy: Network-first + aggressive cache busting
   ============================================================ */

const APP_VERSION = '2.0';

// Install — skip waiting immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate — delete ALL old caches, claim all clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.matchAll()).then(clients => {
      // Tell all open tabs to reload with the new version
      clients.forEach(client => {
        client.postMessage({ type: 'FORCE_RELOAD', version: APP_VERSION });
      });
      return self.clients.claim();
    })
  );
});

// Fetch — network-first for everything
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open('asispro-live').then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
