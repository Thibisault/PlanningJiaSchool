// sw.js – v7 : HTML network-first, fond.jpg network-first, autres en SWR
const CACHE = 'garde-cache-v7';
const PRECACHE = [
  './manifest.webmanifest',
  './sw.js',
  // Icônes (stables) en cache-first
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];
// ⛔️ NOTA : PAS de './icons/fond.jpg' ici

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Supprime les anciens caches
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));

    // Purge toutes les occurrences précachées de fond.jpg (si une ancienne version traîne)
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      const keys = await c.keys();
      await Promise.all(keys
        .filter(req => new URL(req.url).pathname.endsWith('/icons/fond.jpg'))
        .map(req => c.delete(req)));
    }

    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const pathname = url.pathname;

  const accept = request.headers.get('accept') || '';
  const isHTML = request.mode === 'navigate' || accept.includes('text/html');
  const isFond = pathname.endsWith('/icons/fond.jpg');
  const isPrecached = PRECACHE.some(p => pathname.endsWith(p.replace('./','')));
  const isImage = /\.(png|jpg|jpeg|gif|webp|avif|svg)$/i.test(pathname);

  // 1) HTML -> NETWORK FIRST
  if (isHTML) {
    event.respondWith(
      fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return resp;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // 2) fond.jpg -> NETWORK FIRST (pour prendre la dernière version sans hard refresh)
  if (isFond) {
    event.respondWith(
      fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return resp;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // 3) Précache (icônes, sw, manifest) -> CACHE FIRST
  if (isPrecached) {
    event.respondWith(caches.match(request).then(r => r || fetch(request)));
    return;
  }

  // 4) Images & autres -> STALE-WHILE-REVALIDATE
  event.respondWith(
    caches.match(request).then(cacheRes => {
      const fetchPromise = fetch(request).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return networkRes;
      }).catch(() => cacheRes);
      return cacheRes || fetchPromise;
    })
  );
});
