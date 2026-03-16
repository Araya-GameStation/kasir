const CACHE_NAME = 'garis-waktu-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/logo.png',
  '/js/state.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/kasir.js',
  '/js/history.js',
  '/js/menuManager.js',
  '/js/bahanManager.js',
  '/js/settings.js',
  '/js/printer.js'
];

// Install service worker dan cache semua file
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Caching files...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Aktifkan dan bersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Ambil dari cache, fallback ke network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Ambil dari cache
        }
        
        // Fallback ke network
        return fetch(event.request).then(networkResponse => {
          // Optional: cache file baru
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Kalau offline dan tidak ada di cache
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});