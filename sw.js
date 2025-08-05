// Service Worker : app-shell cache-first + SWR
const CACHE = 'garde-cache-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  // Icônes & fond
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/fond.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Cache-first pour l'app-shell
  if (ASSETS.some(a => request.url.endsWith(a.replace('./','')))) {
    event.respondWith(caches.match(request).then(r => r || fetch(request)));
    return;
  }

  // Stale-While-Revalidate pour le reste
  event.respondWith(
    caches.match(request).then(cacheRes => {
      const fetchPromise = fetch(request).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return networkRes;
      }).catch(()=>cacheRes);
      return cacheRes || fetchPromise;
    })
  );
});
