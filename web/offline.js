/* global __FILES__ */
const cachePrefix = 'mortal-web-';
const cacheName = cachePrefix + '__VERSION__';
const files = __FILES__;
const scope = self.registration.scope;
const assets = new Set(files.map((file) => new URL(file, scope).href));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(files)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
    .map((key) => caches.delete(key)))));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(new URL('./index.html', scope), { ignoreVary: true })) ?? Response.error();
    }));
    return;
  }
  if (!assets.has(event.request.url)) return;
  event.respondWith(caches.open(cacheName).then(async (cache) =>
    (await cache.match(event.request.url, { ignoreVary: true })) ?? fetch(event.request)));
});
