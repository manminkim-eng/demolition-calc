// Service Worker — 건축물 해체감리 대가 산출기 PWA
// ★ 업데이트 시 CACHE_VERSION 숫자를 올려주세요

const CACHE_VERSION = 'v1.3.0';
const CACHE_NAME = `demolition-app-${CACHE_VERSION}`;

const LOCAL_FILES = [
    './', './index.html', './manifest.json',
    './icons/icon-192.png', './icons/icon-512.png',
    './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/favicon-16.png'
];
const CDN_FILES = [
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then(async (c) => {
        await c.addAll(LOCAL_FILES);
        for (const u of CDN_FILES) { try { await c.add(u); } catch(x) { console.warn('[SW] CDN 캐시 실패:', u); } }
    }));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((ks) =>
        Promise.all(ks.map((k) => k !== CACHE_NAME ? caches.delete(k) : undefined))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    // Fonts: Stale While Revalidate
    if (e.request.url.includes('fonts.googleapis.com') ||
        e.request.url.includes('fonts.gstatic.com') ||
        e.request.url.includes('cdn.jsdelivr.net')) {
        e.respondWith(caches.open(CACHE_NAME).then(async (c) => {
            const cached = await c.match(e.request);
            const fetched = fetch(e.request).then((r) => {
                if (r.ok) c.put(e.request, r.clone());
                return r;
            }).catch(() => cached);
            return cached || fetched;
        }));
        return;
    }

    // Default: Cache First
    e.respondWith(caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((r) => {
            if (r && r.ok) {
                const clone = r.clone();
                caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
            }
            return r;
        }).catch(() => {
            if (e.request.headers.get('accept')?.includes('text/html'))
                return caches.match('./index.html');
            return new Response('오프라인 상태입니다.', { status: 503 });
        });
    }));
});
