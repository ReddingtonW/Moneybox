'use strict';

// Bump on every deploy so the new service worker installs and old caches are cleared.
const CACHE_NAME = 'moneybox-v3.14';
const ASSETS = [
  '/Moneybox/',
  '/Moneybox/index.html',
  '/Moneybox/manifest.json'
];

// On install — cache core assets, bypassing the browser's HTTP cache
// so a fresh deploy can never be cached as the previous version.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

// On activate — delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// On fetch:
// - The page itself: network first, so a new deploy shows on the next open.
//   The fresh copy is saved for offline use; if offline, the saved copy is used.
// - Everything else (manifest, icons): cache first, fall back to network.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url    = new URL(req.url);
  const isPage = req.mode === 'navigate'
              || url.pathname === '/Moneybox/'
              || url.pathname === '/Moneybox/index.html';

  if (isPage) {
    event.respondWith(
      fetch(req.url, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/Moneybox/index.html', copy));
          }
          return res;
        })
        .catch(() =>
          caches.match('/Moneybox/index.html').then(cached => cached || caches.match('/Moneybox/'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
