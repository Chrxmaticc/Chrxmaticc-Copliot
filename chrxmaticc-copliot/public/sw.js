// Chrxmaticc Copilot — Service Worker
// Offline support + caching
// Author: Chrxmee-Midnightt

var CACHE_NAME = 'chrxmaticc-v1.1.0';
var ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/settings.html',
  '/style.css',
  '/app.js',
  '/auth.js',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.url.indexOf('/api/') !== -1) return;
  
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetched = fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return cached || new Response('Offline — check your connection.', { status: 503 });
      });
      
      return cached || fetched;
    })
  );
});
