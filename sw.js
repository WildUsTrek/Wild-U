const META_CACHE = 'wildu-meta-v1';
const MODULE_CACHE = 'wildu-module-v1';
const ASSET_CACHE = 'wildu-asset-v1';
const SHELL_PREFIX = 'wildu-shell-';
const VERSION_KEY = '__wildu_shell_version__';
const FALLBACK_VERSION = 'bootstrap';

const SCOPE_URL = new URL(self.registration.scope);
const INDEX_URL = new URL('index.html', self.registration.scope).toString();
const VERSION_URL = new URL('version.json', self.registration.scope).toString();

const SHELL_URLS = [
    new URL('', self.registration.scope).toString(),
    INDEX_URL,
    new URL('manifest.json', self.registration.scope).toString(),
    new URL('favicon.ico', self.registration.scope).toString(),
    new URL('icon-192.png', self.registration.scope).toString(),
    new URL('sw.js', self.registration.scope).toString(),
    VERSION_URL
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        const version = await fetchShellVersion();
        await saveActiveShellVersion(version);
        await warmShellCache(version);
        await cleanupOldCaches(version);
        await clients.claim();
    })());
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);

    if (req.method !== 'GET') return;

    // Non tocchiamo risorse esterne: Firebase, Google, Telegram, GitHub raw, Cloud Run esterno, ecc.
    if (url.origin !== self.location.origin) return;

    // version.json deve arrivare sempre fresco
    if (url.href === VERSION_URL) {
        e.respondWith(fetch(req, { cache: 'no-store' }));
        return;
    }

    if (isShellRequest(req, url)) {
        e.respondWith(handleShellRequest(req));
        return;
    }

    if (isModuleRequest(url)) {
        e.respondWith(handleModuleRequest(req));
        return;
    }

    if (isAssetRequest(url)) {
        e.respondWith(handleAssetRequest(req));
        return;
    }

    e.respondWith(
        fetch(req).catch(async () => {
            const cached = await caches.match(req);
            return cached || Response.error();
        })
    );
});

function isShellRequest(req, url) {
    return (
        req.mode === 'navigate' ||
        req.destination === 'document' ||
        url.href === INDEX_URL ||
        url.pathname === SCOPE_URL.pathname
    );
}

function isModuleRequest(url) {
    return url.pathname.endsWith('.html') && url.href !== INDEX_URL;
}

function isAssetRequest(url) {
    return /\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|mp3|wav|ogg)$/i.test(url.pathname);
}

async function fetchShellVersion() {
    try {
        const res = await fetch(VERSION_URL + '?bust=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('version fetch failed');
        const data = await res.json();
        return String(data.version || FALLBACK_VERSION).trim() || FALLBACK_VERSION;
    } catch (e) {
        return FALLBACK_VERSION;
    }
}

async function saveActiveShellVersion(version) {
    const cache = await caches.open(META_CACHE);
    await cache.put(VERSION_KEY, new Response(JSON.stringify({ version }), {
        headers: { 'Content-Type': 'application/json' }
    }));
}

async function getActiveShellVersion() {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match(VERSION_KEY);
    if (!res) return FALLBACK_VERSION;

    try {
        const data = await res.json();
        return String(data.version || FALLBACK_VERSION).trim() || FALLBACK_VERSION;
    } catch (e) {
        return FALLBACK_VERSION;
    }
}

function getShellCacheName(version) {
    return SHELL_PREFIX + version;
}

async function warmShellCache(version) {
    const cache = await caches.open(getShellCacheName(version));

    for (const url of SHELL_URLS) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res && res.ok) {
                await cache.put(url, res.clone());
            }
        } catch (e) {
            // ignoriamo il singolo file fallito, non blocchiamo tutto
        }
    }
}

async function cleanupOldCaches(activeVersion) {
    const keepShell = getShellCacheName(activeVersion);
    const names = await caches.keys();

    await Promise.all(
        names.map((name) => {
            const isOldShell = name.startsWith(SHELL_PREFIX) && name !== keepShell;
            return isOldShell ? caches.delete(name) : Promise.resolve(false);
        })
    );
}

async function handleShellRequest(req) {
    const version = await getActiveShellVersion();
    const shellCache = await caches.open(getShellCacheName(version));

    try {
        const fresh = await fetch(req, { cache: 'no-store' });
        if (fresh && fresh.ok) {
            await shellCache.put(req, fresh.clone());
        }
        return fresh;
    } catch (e) {
        const cached = await shellCache.match(req) || await shellCache.match(INDEX_URL);
        return cached || Response.error();
    }
}

async function handleModuleRequest(req) {
    const cache = await caches.open(MODULE_CACHE);
    const cached = await cache.match(req);

    if (cached) {
        fetch(req).then((fresh) => {
            if (fresh && fresh.ok) cache.put(req, fresh.clone());
        }).catch(() => {});
        return cached;
    }

    const fresh = await fetch(req);
    if (fresh && fresh.ok) await cache.put(req, fresh.clone());
    return fresh;
}

async function handleAssetRequest(req) {
    const cache = await caches.open(ASSET_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    if (fresh && fresh.ok) await cache.put(req, fresh.clone());
    return fresh;
}
