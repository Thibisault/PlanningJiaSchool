// sw.js – v6 : HTML en network-first, statiques en cache-first
const CACHE = 'garde-cache-v6';
const ASSETS = [
  './manifest.webmanifest',
  './sw.js',
  // Icônes & fond (statiques)
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/fond.jpg'
];
// 🔴 IMPORTANT: on NE met PAS ./index.html ici

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) Navigations HTML -> NETWORK FIRST + fallback cache
  const isHTML = request.mode === 'navigate' ||
                 (request.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request)) // offline fallback si déjà visité
    );
    return;
  }

  // 2) Statiques connus -> CACHE FIRST
  const pathname = url.pathname; // évite les soucis de ?v=...
  if (ASSETS.some(a => pathname.endsWith(a.replace('./','')))) {
    event.respondWith(caches.match(request).then(r => r || fetch(request)));
    return;
  }

  // 3) Le reste -> Stale-While-Revalidate
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
