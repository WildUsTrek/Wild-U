/* global WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  function runtimeCol() {
    return root.db.collection(WILDU_MEDIA_CONFIG.collections.runtime);
  }

  function gameDocRef() {
    return runtimeCol().doc(WILDU_MEDIA_CONFIG.runtimeGameVersionsDocId || 'game_versions');
  }

  function moduleDocRef() {
    return runtimeCol().doc(WILDU_MEDIA_CONFIG.runtimeModuleVersionsDocId || 'module_versions');
  }

  function normalizeRuntimeUrl(value) {
    return String(value || '')
      .trim()
      .replace(/^\.?\//, '')
      .split('?')[0]
      .split('#')[0];
  }

  function uniqueList(value) {
    if (Array.isArray(value)) return value.map(normalizeRuntimeUrl).filter(Boolean).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
    return String(value || '')
      .split(',')
      .map(normalizeRuntimeUrl)
      .filter(Boolean)
      .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  async function readRuntime(ref, bucketName) {
    var doc = await ref().get();
    var data = doc.exists ? (doc.data() || {}) : {};
    var bucket = data[bucketName] && typeof data[bucketName] === 'object' ? data[bucketName] : {};
    return {
      schemaVersion: Number(data.schemaVersion || 1),
      updatedAt: data.updatedAt || null,
      updatedByUid: data.updatedByUid || null,
      updatedByEmail: data.updatedByEmail || null,
      raw: data,
      items: Object.keys(bucket).sort().map(function (key) {
        var item = Object.assign({}, bucket[key] || {});
        item.url = item.url || key;
        item.id = key;
        return item;
      })
    };
  }

  function normalizeEntry(input, kind) {
    input = input || {};
    var url = normalizeRuntimeUrl(input.url);
    if (!url) throw new Error('URL ' + kind + ' obbligatorio.');

    var rev = Math.max(1, parseInt(input.rev, 10) || 1);

    return {
      title: String(input.title || '').trim() || url,
      url: url,
      rev: rev,
      enabled: input.enabled !== false && input.enabled !== 'false',
      description: String(input.description || input.notes || '').trim(),
      notes: String(input.notes || input.description || '').trim(),
      cacheScope: normalizeRuntimeUrl(input.cacheScope || (kind === 'game' && /\/index\.html$/i.test(url) ? url.replace(/\/index\.html$/i, '/') : url)),
      extraUrls: uniqueList(input.extraUrls),
      clearNeedles: uniqueList(input.clearNeedles),
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: root.requireCurrentUser().uid,
      updatedByEmail: root.requireCurrentUser().email || null
    };
  }

  function normalizeGame(input) {
    var entry = normalizeEntry(input, 'game');
    entry.moduleUrl = normalizeRuntimeUrl(input.moduleUrl || '');
    return entry;
  }

  function normalizeModule(input) {
    var entry = normalizeEntry(input, 'module');
    entry.renderer = String(input.renderer || 'module-html').trim();
    return entry;
  }

  async function writeEntry(ref, bucketName, url, entry) {
    var user = root.requireCurrentUser();
    var payload = {
      schemaVersion: 1,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    };
    payload[bucketName + '.' + url] = entry;
    await ref().set(payload, { merge: true });
    return entry;
  }

  async function listGames() {
    return readRuntime(gameDocRef, 'games');
  }

  async function listModules() {
    return readRuntime(moduleDocRef, 'modules');
  }

  async function saveGame(input) {
    var entry = normalizeGame(input);
    return writeEntry(gameDocRef, 'games', entry.url, entry);
  }

  async function saveModule(input) {
    var entry = normalizeModule(input);
    return writeEntry(moduleDocRef, 'modules', entry.url, entry);
  }

  async function bumpGame(url, reason) {
    var clean = normalizeRuntimeUrl(url);
    if (!clean) throw new Error('URL gioco obbligatorio per +1 versione.');
    var data = await listGames();
    var current = data.items.find(function (item) { return item.url === clean; }) || { url: clean, title: clean, rev: 0 };
    current.rev = Math.max(1, Number(current.rev || 0) + 1);
    current.notes = reason || current.notes || '';
    return saveGame(current);
  }

  async function bumpModule(url, reason) {
    var clean = normalizeRuntimeUrl(url);
    if (!clean) throw new Error('URL modulo obbligatorio per +1 versione.');
    var data = await listModules();
    var current = data.items.find(function (item) { return item.url === clean; }) || { url: clean, title: clean, rev: 0 };
    current.rev = Math.max(1, Number(current.rev || 0) + 1);
    current.notes = reason || current.notes || '';
    return saveModule(current);
  }

  async function seedDefaultGames() {
    var defaults = WILDU_MEDIA_CONFIG.defaultGameVersions || [];
    for (var i = 0; i < defaults.length; i++) {
      await saveGame(defaults[i]);
    }
    return listGames();
  }

  async function seedDefaultModules() {
    var defaults = WILDU_MEDIA_CONFIG.defaultModuleVersions || [];
    for (var i = 0; i < defaults.length; i++) {
      await saveModule(defaults[i]);
    }
    return listModules();
  }

  root.RuntimeService = {
    normalizeRuntimeUrl: normalizeRuntimeUrl,
    uniqueList: uniqueList,
    listGames: listGames,
    listModules: listModules,
    saveGame: saveGame,
    saveModule: saveModule,
    bumpGame: bumpGame,
    bumpModule: bumpModule,
    seedDefaultGames: seedDefaultGames,
    seedDefaultModules: seedDefaultModules
  };
})();
