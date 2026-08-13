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

// Notificaciones push (FCM) — no depende del SDK de Firebase: FCM entrega
// vía el Push API estándar del navegador, así que basta con escuchar
// 'push' directamente. El token se obtiene en acuerdos.html con
// firebase-messaging-compat.js, pero mostrar la notificación en segundo
// plano no lo necesita.
const ICONO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%231f6f78'/%3E%3Ctext x='50' y='68' font-size='54' text-anchor='middle'%3E%F0%9F%A4%9D%3C/text%3E%3C/svg%3E";

self.addEventListener('push', (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch (e) {}
  const notif = datos.notification || {};
  const titulo = notif.title || 'Acuerdos';
  const cuerpo = notif.body || '';
  const link = (datos.fcm_options && datos.fcm_options.link) || SHELL_FILE;
  event.waitUntil(self.registration.showNotification(titulo, { body: cuerpo, icon: ICONO, badge: ICONO, data: { link } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || SHELL_FILE;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) { if (c.url.includes(SHELL_FILE) && 'focus' in c) return c.focus(); }
      return clients.openWindow(link);
    })
  );
});
