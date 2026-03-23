/* ══════════════════════════════════════════════════
   Service Worker — 해체감리 PWA
   건축물관리법 해체감리 산출기 MANMIN-Ver3.0
   ══════════════════════════════════════════════════ */

const CACHE = '해체감리-v3.0';
const OFFLINE = './offline.html';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',
  './favicon.ico',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isCDN = ['cdn.jsdelivr.net','fonts.googleapis.com',
    'fonts.gstatic.com','cdnjs.cloudflare.com','unpkg.com']
    .some(d => url.hostname.includes(d));

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  e.respondWith(isCDN ? networkFirst(req) : staleWhileRevalidate(req));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res?.status === 200)(await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch { return caches.match(req); }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
  const cached = await c.match(req);
  const fresh = fetch(req).then(res => {
    if (res?.status === 200 && res.type !== 'opaque') c.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fresh;
}
