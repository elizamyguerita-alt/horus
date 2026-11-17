/* =====================================================================
   HORUS · Service Worker
   Guarda la aplicación en el teléfono o la computadora para que abra y
   funcione sin internet después de la primera visita.
   - Página principal: primero intenta la red (para recibir actualizaciones)
     y, si no hay conexión, usa la copia guardada.
   - Íconos y manifiesto: usa la copia guardada.
   - Peticiones a otros sitios (IA en la nube, fotos de iNaturalist) no se
     guardan: siempre van a la red.
   ===================================================================== */
const VERSION = 'horus-v1.0.0';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-maskable-512.png',
  './iconos/icono-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // IA y fotos externas: directo a la red

  // Navegación (abrir la app): red primero, copia guardada si no hay conexión
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copia = res.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copia)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto de archivos propios: copia guardada primero
  e.respondWith(
    caches.match(req).then((guardado) => guardado || fetch(req).then((res) => {
      const copia = res.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); return res;
    }))
  );
});
