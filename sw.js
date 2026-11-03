/* Service worker — offline režim aplikace Evidence OOPP.
   Data se ukládají do zařízení (localStorage / soubor) a volitelně do cloudu
   (Firebase), tady se cachuje jen aplikace. */
const CACHE = 'oopp-app-v19';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './dependencies/logo.png',
  './dependencies/logo-inverse.png',
  './dependencies/icons/icon-192.png',
  './dependencies/icons/icon-512.png',
  './dependencies/icons/icon-maskable-512.png',
  './dependencies/icons/apple-touch-icon.png',
  './dependencies/icons/favicon-32.png',
  './dependencies/icons/favicon-16.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          return key === CACHE ? null : caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return;
  const copy = response.clone();
  caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  // U otevření aplikace zkusit síť (aby se projevily nové verze), jinak paměť.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          putInCache('./index.html', response);
          return response;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (hit) {
            return hit || caches.match('./');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (response) {
        putInCache(request, response);
        return response;
      });
    })
  );
});
