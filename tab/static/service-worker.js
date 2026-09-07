const CACHE_NAME = 'tab-v1';
const OFFLINE_URL = '/groups/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy: always try the real server first,
  // since this app's data changes constantly (balances, expenses).
  // Only fall back to cache if genuinely offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});