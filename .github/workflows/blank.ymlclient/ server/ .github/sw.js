// sw.js - basic service worker for offline shell caching
const CACHE = 'td-site-v1';
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./','/','index.html','styles.css','app.js']))
  );
  self.skipWaiting();
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
