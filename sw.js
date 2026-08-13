// Service Worker de Acuerdos — red primero, caché como respaldo sin conexión.
// Mismo patrón que comidas/sw.js: cache:'no-store' en el documento principal
// para que la app instalada nunca se quede viendo una copia vieja.
const CACHE_NAME = 'acuerdos-shell-v1';
const SHELL_FILE = 'acuerdos.html';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const esMismoOrigen = new URL(req.url).origin === self.location.origin;
  if (req.method !== 'GET' || !esMismoOrigen) return;

  const esDocumentoPrincipal = req.mode === 'navigate' || req.url.includes(SHELL_FILE);
  const opciones = esDocumentoPrincipal ? { cache: 'no-store' } : {};

  event.respondWith(
    fetch(req, opciones)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((cacheado) => cacheado || caches.match(SHELL_FILE)))
  );
});
