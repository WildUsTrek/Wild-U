const CACHE_NAME = 'wildu-cache-v2';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Lascia passare il login di Google e il database Firebase senza intromettersi!
    if (e.request.url.includes('firestore.googleapis.com') || 
        e.request.url.includes('identitytoolkit') || 
        e.request.url.includes('google.com') ||
        e.request.method !== 'GET') {
        return; 
    }

    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
