const META_CACHE = 'wildu-meta-v1';
const MODULE_CACHE = 'wildu-module-v1';
const ASSET_CACHE = 'wildu-asset-v1';
const SHELL_PREFIX = 'wildu-shell-';
const VERSION_KEY = '__wildu_shell_version__';
const FALLBACK_VERSION = 'bootstrap';

const WILDU_SW_CONSOLE_SWITCH_KEY = '__wildu_console_switch__';

// Default sicuro: Service Worker silenzioso.
let WILDU_SW_CONSOLE_SWITCH = false;

async function saveSwConsoleSwitch(value) {
    try {
        const cache = await caches.open(META_CACHE);
        await cache.put(
            WILDU_SW_CONSOLE_SWITCH_KEY,
            new Response(JSON.stringify({
                value: value === true,
                updatedAt: new Date().toISOString()
            }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } catch (e) {}
}

async function loadSwConsoleSwitch() {
    try {
        const cache = await caches.open(META_CACHE);
        const res = await cache.match(WILDU_SW_CONSOLE_SWITCH_KEY);
        if (!res) return false;

        const data = await res.json();
        return data && data.value === true;
    } catch (e) {
        return false;
    }
}

function setSwConsoleSwitch(value) {
    WILDU_SW_CONSOLE_SWITCH = value === true;
    saveSwConsoleSwitch(WILDU_SW_CONSOLE_SWITCH).catch(() => {});
}

loadSwConsoleSwitch()
    .then((value) => {
        WILDU_SW_CONSOLE_SWITCH = value === true;
    })
    .catch(() => {
        WILDU_SW_CONSOLE_SWITCH = false;
    });

self.addEventListener('message', (event) => {
    const data = event && event.data;
    if (!data || data.type !== 'WILDU_CONSOLE_SWITCH') return;

    setSwConsoleSwitch(data.value === true);

    swDebug('CONSOLE_SWITCH_UPDATED', {
        enabled: WILDU_SW_CONSOLE_SWITCH,
        source: data.source || 'unknown'
    });
});

function swDebug(type, details) {
    if (!WILDU_SW_CONSOLE_SWITCH) return;

    const payload = {
        source: 'SW',
        type,
        details: details || {},
        ts: new Date().toISOString()
    };

    try {
        console.log('[WILDU SW]', type, details || {});
    } catch (e) {}

    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
            clients.forEach((client) => {
                client.postMessage({ __WILDU_DEBUG__: payload });
            });
        })
        .catch(() => {});
}

const SCOPE_URL = new URL(self.registration.scope);
const INDEX_URL = new URL('index.html', self.registration.scope).toString();
const INDEX_PATHNAME = new URL(INDEX_URL).pathname.toLowerCase();
const VERSION_URL = new URL('version.json', self.registration.scope).toString();
const VERSION_PATHNAME = new URL(VERSION_URL).pathname.toLowerCase();

const SHELL_URLS = [
    new URL('', self.registration.scope).toString(),
    INDEX_URL,
    new URL('manifest.json', self.registration.scope).toString(),
    new URL('favicon.ico', self.registration.scope).toString(),
    new URL('icon-192.png', self.registration.scope).toString(),
    new URL('sw.js', self.registration.scope).toString(),
    VERSION_URL
];

const MODULE_CACHE_MAX_ENTRIES = 40;
const MODULE_CACHE_TRIM_TO = 24;

// AUMENTIAMO LA CAPIENZA PER LE FOTO:
const ASSET_CACHE_MAX_ENTRIES = 300; 
const ASSET_CACHE_TRIM_TO = 250;

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        const version = await fetchShellVersion();
        await saveActiveShellVersion(version);
        await warmShellCache(version);
        await cleanupOldCaches(version);
        await trimRuntimeCaches();
        await clients.claim();
    })());
});



self.addEventListener('fetch', (e) => {
    const req = e.request;
    const url = new URL(req.url);

    if (req.method !== 'GET') return;

    const isSameOrigin = url.origin === self.location.origin;

// Se è una richiesta verso un server esterno
if (!isSameOrigin) {
    // 🛑 BYPASS AMAZON:
    // Lasciamo che il browser gestisca Amazon da solo.
    if (url.hostname.includes('amazon') || url.hostname.includes('ssl-images')) {
        return;
    }

    // 🗺️ BYPASS TILE MAPPA:
    // Le tile OpenTopoMap / Waymarked Trails / OSM sono numerose e spesso opaque/status 0.
    // Non le cacheiamo nel nostro SW: lasciamo che Leaflet/browser/provider le gestiscano.
    if (
        url.hostname.endsWith('tile.opentopomap.org') ||
        url.hostname === 'tile.waymarkedtrails.org' ||
        url.hostname.endsWith('tile.openstreetmap.org')
    ) {
        return;
    }

    // 🎧📚 BYPASS MEDIA SUITE R2:
    // I file grandi caricati dalla Media Suite vivono su R2/CDN.
    // NON devono finire automaticamente in ASSET_CACHE.
    // Importante: NON bypassiamo www.wildu.it/public/ né Cloudinary,
    // perché servono a immagini viaggio, cover e WildWall.
    if (
        url.hostname === 'media.baffiwild.it' ||
        url.hostname === 'media.wildu.it'
    ) {
        return;
    }

    // Continuiamo invece a cacheare gli asset esterni utili già previsti:
    // Cloudinary, www.wildu.it/public/, Google Docs, immagini viaggio, cover, ecc.
    if (isAssetRequest(req, url)) {
        e.respondWith(handleAssetRequest(req));
    }
    return;
}
    
    if (url.origin !== self.location.origin) return;


// version.json deve arrivare sempre fresco anche con querystring (?t=..., ?bust=...)
// ma offline non deve generare errore rumoroso in console
if (url.pathname.toLowerCase() === VERSION_PATHNAME) {
    swDebug('VERSION_BYPASS_NO_STORE', {
        request: req.url
    });

    e.respondWith(
        fetch(req, { cache: 'no-store' }).catch(() => {
            swDebug('VERSION_FETCH_OFFLINE', {
                request: req.url
            });

            return new Response(
                JSON.stringify({ offline: true, version: null }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        })
    );
    return;
}

    if (isShellRequest(req, url)) {
        e.respondWith(handleShellRequest(req, url));
        return;
    }

    if (isModuleRequest(url)) {
        e.respondWith(handleModuleRequest(req));
        return;
    }

    if (isAssetRequest(req, url)) {
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

function getScopeRelativePath(url) {
    const scopePath = SCOPE_URL.pathname.toLowerCase().replace(/\/+$/, '') + '/';
    let path = String(url.pathname || '').toLowerCase().replace(/\/{2,}/g, '/');

    if (path.indexOf(scopePath) === 0) {
        path = path.slice(scopePath.length);
    }

    return path.replace(/^\/+/, '');
}

function isStandaloneRuntimePath(url) {
    const rel = getScopeRelativePath(url);

    return (
        rel.indexOf('wildu-map-suite/') === 0 ||
        rel.indexOf('giochi/') === 0 ||
        rel.indexOf('wildu-media-suite/') === 0
    );
}

function isShellRequest(req, url) {
    const path = url.pathname.toLowerCase();
    const scopePath = SCOPE_URL.pathname.toLowerCase();

    const isExactShellEntry =
        path === INDEX_PATHNAME ||
        path === scopePath ||
        path === scopePath.replace(/\/$/, '');

    if (isExactShellEntry) return true;

    // Shell solo per navigazioni "pulite" senza estensione file.
    // Correzione conservativa:
    // - l'index principale /Wild-U/index.html resta shell madre;
    // - i nested index.html di giochi / MapViewer / Media Suite NON vengono scambiati per shell madre;
    // - le route pulite standalone possono usare ancora network-first + cache esatta, ma senza fallback a INDEX_URL.
    const hasFileExtension = /\.[a-z0-9]+$/i.test(path);

    if (isStandaloneRuntimePath(url) && hasFileExtension) return false;

    return req.mode === 'navigate' && !hasFileExtension;
}

function isModuleRequest(url) {
    return url.pathname.endsWith('.html') && url.href !== INDEX_URL;
}

function isAssetRequest(req, url) {
    const destination = req.destination || '';
    const path = url.pathname.toLowerCase();
    const href = url.href.toLowerCase();

    // Il browser sa già che è un'immagine tramite il tag <img>
    if ([
        'style', 'script', 'image', 'font', 'audio', 'video', 'iframe'
    ].includes(destination)) {
        return true;
    }

    // Forza la cattura per i tuoi server specifici (Cloudinary, Wildu.it, Google Docs)
    if (href.includes('res.cloudinary.com') || href.includes('www.wildu.it/public/') || href.includes('docs.google.com/uc')) {
        return true;
    }

    // Controllo classico tramite estensione del file
    return /\.(css|js|mjs|json|png|jpg|jpeg|gif|svg|webp|ico|bmp|woff|woff2|ttf|eot|mp3|wav|ogg|m4a|aac|mp4|webm|pdf|txt|zip|rar|7z|doc|docx|xls|xlsx|ppt|pptx)$/i.test(path);
}

async function fetchShellVersion() {
    try {
        const res = await fetch(VERSION_URL + '?bust=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error('version fetch failed');
        const data = await res.json();
        const version = String(data.version || '').trim();
        return version || await getActiveShellVersion();
    } catch (e) {
        // Se version.json non risponde durante activate, non degradare subito a bootstrap:
        // conserva la shell attiva precedente e usa bootstrap solo se non esiste nulla.
        const previousVersion = await getActiveShellVersion();

        swDebug('VERSION_FETCH_FAILED_KEEP_PREVIOUS', {
            previousVersion: previousVersion,
            fallbackVersion: FALLBACK_VERSION,
            error: e && e.message ? e.message : 'unknown'
        });

        return previousVersion || FALLBACK_VERSION;
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

async function trimRuntimeCaches() {
    await trimCacheByLimit(MODULE_CACHE, MODULE_CACHE_MAX_ENTRIES, MODULE_CACHE_TRIM_TO);
    await trimCacheByLimit(ASSET_CACHE, ASSET_CACHE_MAX_ENTRIES, ASSET_CACHE_TRIM_TO);
}

async function trimCacheByLimit(cacheName, maxEntries, trimTo) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length <= maxEntries) return;

    const deleteCount = Math.max(0, keys.length - trimTo);

    for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
    }
}

function isQuotaLikeError(err) {
    const raw = String(
        (err && err.name) ||
        (err && err.message) ||
        err ||
        ''
    ).toLowerCase();

    return (
        raw.includes('quota') ||
        raw.includes('storage') ||
        raw.includes('space') ||
        raw.includes('exceeded')
    );
}

async function safeCachePut(cacheName, req, response, maxEntries, trimTo) {
    if (!response || !response.ok) return;

    const cache = await caches.open(cacheName);

    try {
        await cache.put(req, response.clone());
    } catch (err) {
        if (!isQuotaLikeError(err)) return;

        await trimCacheByLimit(cacheName, 0, trimTo);

        try {
            await cache.put(req, response.clone());
        } catch (_) {
            // fallback silenzioso: meglio servire la rete che rompere tutto
        }
    }
}

async function handleShellRequest(req, url) {
    const version = await getActiveShellVersion();
    const shellCache = await caches.open(getShellCacheName(version));

    try {
        const fresh = await fetch(req, { cache: 'no-store' });

        if (fresh && fresh.ok) {
            await shellCache.put(req, fresh.clone());

            swDebug('SHELL_NETWORK_OK', {
                request: req.url,
                cacheName: getShellCacheName(version),
                version: version
            });
        } else {
            swDebug('SHELL_NETWORK_NON_OK', {
                request: req.url,
                status: fresh ? fresh.status : 'NO_RESPONSE',
                cacheName: getShellCacheName(version),
                version: version
            });
        }

        return fresh;
    } catch (e) {
        const exactCached = await shellCache.match(req);
        const allowIndexFallback = !isStandaloneRuntimePath(url);
        const cached = exactCached || (allowIndexFallback ? await shellCache.match(INDEX_URL) : null);

        if (cached) {
            swDebug('SHELL_CACHE_FALLBACK', {
                request: req.url,
                cacheName: getShellCacheName(version),
                version: version,
                exactMatch: !!exactCached,
                indexFallbackAllowed: allowIndexFallback
            });
            return cached;
        }

        swDebug('SHELL_TOTAL_FAILURE', {
            request: req.url,
            cacheName: getShellCacheName(version),
            version: version,
            error: e && e.message ? e.message : 'unknown'
        });

        return Response.error();
    }
}

async function handleModuleRequest(req) {
    const cache = await caches.open(MODULE_CACHE);
    const cached = await cache.match(req);

    if (cached) {
        swDebug('MODULE_CACHE_HIT', {
            request: req.url,
            cacheName: MODULE_CACHE
        });

        fetch(req).then(async (fresh) => {
            if (fresh && fresh.ok) {
                await safeCachePut(
                    MODULE_CACHE,
                    req,
                    fresh,
                    MODULE_CACHE_MAX_ENTRIES,
                    MODULE_CACHE_TRIM_TO
                );

                swDebug('MODULE_CACHE_REFRESHED', {
                    request: req.url,
                    cacheName: MODULE_CACHE,
                    status: fresh.status
                });
            } else {
                swDebug('MODULE_NETWORK_NON_OK', {
                    request: req.url,
                    cacheName: MODULE_CACHE,
                    status: fresh ? fresh.status : 'NO_RESPONSE'
                });
            }
        }).catch((e) => {
            swDebug('MODULE_REFRESH_ERROR', {
                request: req.url,
                cacheName: MODULE_CACHE,
                error: e && e.message ? e.message : 'unknown'
            });
        });

        return cached;
    }

    const fresh = await fetch(req);

    if (fresh && fresh.ok) {
        await safeCachePut(
            MODULE_CACHE,
            req,
            fresh,
            MODULE_CACHE_MAX_ENTRIES,
            MODULE_CACHE_TRIM_TO
        );

        swDebug('MODULE_NETWORK_OK', {
            request: req.url,
            cacheName: MODULE_CACHE,
            status: fresh.status
        });
    } else {
        swDebug('MODULE_NETWORK_NON_OK', {
            request: req.url,
            cacheName: MODULE_CACHE,
            status: fresh ? fresh.status : 'NO_RESPONSE'
        });
    }

    return fresh;
}

async function handleAssetRequest(req) {
    const cache = await caches.open(ASSET_CACHE);
    const cached = await cache.match(req);

    const networkPromise = fetch(req)
        .then(async (fresh) => {
            if (fresh && fresh.ok) {
                await safeCachePut(
                    ASSET_CACHE,
                    req,
                    fresh,
                    ASSET_CACHE_MAX_ENTRIES,
                    ASSET_CACHE_TRIM_TO
                );

                swDebug('ASSET_NETWORK_OK', {
                    request: req.url,
                    cacheName: ASSET_CACHE,
                    status: fresh.status
                });
            } else {
                swDebug('ASSET_NETWORK_NON_OK', {
                    request: req.url,
                    cacheName: ASSET_CACHE,
                    status: fresh ? fresh.status : 'NO_RESPONSE'
                });
            }
            return fresh;
        })
        .catch((e) => {
            swDebug('ASSET_NETWORK_ERROR', {
                request: req.url,
                cacheName: ASSET_CACHE,
                error: e && e.message ? e.message : 'unknown'
            });
            return null;
        });

    if (cached) {
        swDebug('ASSET_CACHE_HIT', {
            request: req.url,
            cacheName: ASSET_CACHE
        });
        return cached;
    }

    const fresh = await networkPromise;
    return fresh || Response.error();
}
