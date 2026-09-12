/* Eurotrip 2026 · service worker
   index.html va por la red primero (para no quedarse con una versión vieja) y cae al caché sin señal.
   Fotos, íconos, fuentes y el SDK de Firebase se guardan en caché la primera vez. */
const V = 'eurotrip-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png',
  'photos/amsterdam.jpg', 'photos/madrid.jpg', 'photos/barcelona.jpg', 'photos/granada.jpg', 'photos/ronda.jpg', 'photos/sevilla.jpg', 'photos/cordoba.jpg'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(V).then(function(c){ return Promise.allSettled(SHELL.map(function(u){ return c.add(u); })); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== V; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firestore, Open-Meteo y Storage: siempre red (Firestore ya tiene su propio caché offline).
  if (/firestore|googleapis\.com\/v1|open-meteo|firebasestorage|identitytoolkit/.test(url.href)) return;
  const esShell = url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html'));
  if (esShell){
    e.respondWith(fetch(req).then(function(r){ const copy = r.clone(); caches.open(V).then(function(c){ c.put(req, copy); }); return r; })
      .catch(function(){ return caches.match(req).then(function(r){ return r || caches.match('index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){
    if (hit) return hit;
    return fetch(req).then(function(r){
      if (r && r.status === 200 && (url.origin === location.origin || /gstatic|googleapis|fonts/.test(url.hostname))){ const copy = r.clone(); caches.open(V).then(function(c){ c.put(req, copy); }); }
      return r;
    }).catch(function(){ return hit; });
  }));
});
