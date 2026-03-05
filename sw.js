const CACHE_NAME = 'wildu-cache-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through semplice per permettere all'app di parlare con Google Script
    event.respondWith(fetch(event.request));
});
