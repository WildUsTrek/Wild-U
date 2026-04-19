const CACHE_NAME = 'wildu-cache-v5';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Mai toccare richieste non-GET
    if (e.request.method !== 'GET') return;

    // Intercetta solo richieste della tua stessa origin
    // Tutto il resto passa diretto al browser:
    // Firebase, Google Auth, Telegram, GitHub raw, mp3 esterni, API esterne, ecc.
    if (url.origin !== self.location.origin) return;

    e.respondWith(
        fetch(e.request, { signal: e.request.signal })
            .catch(async () => {
                const cached = await caches.match(e.request);
                return cached || Response.error();
            })
    );
});
