(function installNetworkCacheBridge(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.contracts) throw new Error('Integration contracts must load before network cache bridge.');

  function NetworkCacheBridge(eventBus, options) {
    const settings = options || {};
    this.eventBus = eventBus;
    this.maxEntries = Math.max(1, Math.min(32, Number(settings.maxEntries) || 8));
    this.memory = new Map();
    this.inFlight = new Map();
    this.metrics = { network: 0, memoryHits: 0, deduped: 0, failures: 0, evictions: 0 };
  }

  NetworkCacheBridge.prototype.normalizeOwnedShellUrl = function normalizeOwnedShellUrl(input) {
    const url = new URL(input, document.baseURI);
    if (url.origin !== global.location.origin) {
      throw root.contracts.contractError('NETWORK_OWNER_VIOLATION', 'Network cache bridge accepts same-origin game resources only.');
    }
    if (!url.pathname.endsWith('/story-world/story-world-shell.html')) {
      throw root.contracts.contractError('NETWORK_PATH_VIOLATION', 'Network cache bridge path is not an owned child shell resource.');
    }
    return url;
  };

  NetworkCacheBridge.prototype.remember = function remember(key, value) {
    if (this.memory.has(key)) this.memory.delete(key);
    this.memory.set(key, value);
    while (this.memory.size > this.maxEntries) {
      this.memory.delete(this.memory.keys().next().value);
      this.metrics.evictions += 1;
    }
  };

  NetworkCacheBridge.prototype.fetchOwnedShell = function fetchOwnedShell(input) {
    const url = this.normalizeOwnedShellUrl(input);
    const key = url.href;
    if (this.memory.has(key)) {
      const cached = this.memory.get(key);
      this.remember(key, cached);
      this.metrics.memoryHits += 1;
      return Promise.resolve(cached);
    }
    if (this.inFlight.has(key)) {
      this.metrics.deduped += 1;
      return this.inFlight.get(key);
    }
    this.metrics.network += 1;
    const pending = global.fetch(url, {
      cache: 'default',
      credentials: 'same-origin',
      redirect: 'error'
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Child shell load failed: HTTP ${response.status}`);
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > 2 * 1024 * 1024) throw new Error('Child shell exceeds the 2 MiB response budget.');
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > 2 * 1024 * 1024) throw new Error('Child shell exceeds the 2 MiB response budget.');
      this.remember(key, text);
      if (this.eventBus) this.eventBus.emit('network-cache:stored', Object.freeze({ resourceId: 'child-world-shell', url: key }));
      return text;
    }).catch((error) => {
      this.metrics.failures += 1;
      throw error;
    }).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, pending);
    return pending;
  };

  NetworkCacheBridge.prototype.clearOwnedMemory = function clearOwnedMemory() {
    const removed = this.memory.size;
    this.memory.clear();
    return Object.freeze({ ok: true, removed, cacheApiTouched: false, serviceWorkerTouched: false });
  };

  NetworkCacheBridge.prototype.status = function status() {
    return Object.freeze({
      strategy: 'same-origin-memory-dedupe',
      entries: this.memory.size,
      inFlight: this.inFlight.size,
      maxEntries: this.maxEntries,
      metrics: Object.freeze(Object.assign({}, this.metrics)),
      cacheApiTouched: false,
      serviceWorkerTouched: false
    });
  };

  root.NetworkCacheBridge = NetworkCacheBridge;
})(window);
