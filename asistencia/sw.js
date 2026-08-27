// AsistenciaPro SW — version bumped to force update
const APP_VERSION = '3.0';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.matchAll())
      .then(clients => {
        clients.forEach(c => c.postMessage({ type: 'FORCE_RELOAD' }));
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.status === 200) {
          const c = res.clone();
          caches.open('asp-v3').then(cache => cache.put(event.request, c));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(r => r || new Response('Offline', { status: 503 })))
  );
});
