/* Logic Lab service worker. Generated at build time: VERSION and PRECACHE are
 * filled in by the `logiclab-pwa` plugin in vite.config.ts.
 *
 * - App shell and the built JS/CSS are cached on install, so the site opens
 *   offline after the first visit.
 * - Page navigations go to the network first and fall back to the cached shell.
 * - Other same-origin files (compiler WASM, board images) are cached the first
 *   time they are used.
 */
const CACHE = `logiclab-${VERSION}`;
const RUNTIME = 'logiclab-runtime-v1';
const SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One failing file must not stop the rest from being cached.
    await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)));
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('logiclab-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(SHELL, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(SHELL)) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    // Hashed build files never change; other files are kept for offline use.
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(url.pathname.startsWith('/assets/') ? CACHE : RUNTIME);
      cache.put(req, res.clone());
    }
    return res;
  })());
});
