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

    // Campi compatibili con il vecchio PARAMETERS_PARTNER/moduli_risorse.
    // Li salviamo qui per permettere al client di migrare senza dipendere
    // dalla raccolta legacy obsoleta.
    entry.Titolo = String(input.Titolo || input.title || '').trim() || entry.title;
    entry.Descrizione = String(input.Descrizione || input.description || '').trim() || entry.description;
    entry.Categoria = String(input.Categoria || '').trim();
    entry.Grado_Minimo = String(input.Grado_Minimo || input.gradeRequired || '').trim();
    entry.Link_Risorsa = normalizeRuntimeUrl(input.Link_Risorsa || input.linkRisorsa || entry.url);
    entry.Audio = String(input.Audio || '').trim();
    entry.Regione = String(input.Regione || '').trim();
    entry.link_interni = Array.isArray(input.link_interni) ? input.link_interni : [];
    entry.module_rev = String(Math.max(1, parseInt(entry.rev, 10) || 1));
    entry.openMode = ['module', 'redirect', 'new_tab', 'secure_redirect', 'secure_iframe'].indexOf(String(input.openMode || input.open_mode || 'module').trim()) >= 0
  ? String(input.openMode || input.open_mode || 'module').trim()
  : 'module';

    return entry;
  }

  async function writeEntry(ref, bucketName, url, entry) {
    var user = root.requireCurrentUser();
    var cleanUrl = normalizeRuntimeUrl(url || (entry && entry.url) || '');

    if (!cleanUrl) {
      throw new Error('URL obbligatorio per ' + bucketName + '.');
    }

    var docRef = ref();
    var snap = await docRef.get();
    var current = snap.exists ? (snap.data() || {}) : {};

    var bucket = current[bucketName] && typeof current[bucketName] === 'object'
      ? Object.assign({}, current[bucketName])
      : {};

    bucket[cleanUrl] = Object.assign({}, entry, {
      url: cleanUrl,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    });

    await docRef.set({
      schemaVersion: 1,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      [bucketName]: bucket
    }, { merge: true });

    return bucket[cleanUrl];
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

    // Fallback prudente: se la config non contiene ancora preset,
    // creiamo comunque i giochi noti reali invece di salvare "0" in silenzio.
    if (!defaults.length) {
      defaults = [
        {
          title: 'Sfida dei Sassi',
          url: 'giochi/sfida-dei-sassi/index.html',
          rev: 1,
          enabled: true,
          moduleUrl: 'modules/wildu-games.html',
          description: 'Mini-app gioco Sfida dei Sassi.',
          notes: 'Preset iniziale Media Suite.',
          cacheScope: 'giochi/sfida-dei-sassi/',
          extraUrls: '',
          clearNeedles: 'giochi/sfida-dei-sassi/'
        },
        {
          title: 'Costruisci il Rifugio',
          url: 'giochi/rifugio/index.html',
          rev: 1,
          enabled: true,
          moduleUrl: 'modules/wildu-games.html',
          description: 'Mini-app gioco Costruisci il Rifugio.',
          notes: 'Preset iniziale Media Suite.',
          cacheScope: 'giochi/rifugio/',
          extraUrls: '',
          clearNeedles: 'giochi/rifugio/'
        }
      ];
    }

    for (var i = 0; i < defaults.length; i++) {
      await saveGame(defaults[i]);
    }

    return listGames();
  }

  async function seedDefaultModules() {
    var defaults = WILDU_MEDIA_CONFIG.defaultModuleVersions || [];

    // Fallback prudente: se la config non contiene ancora preset,
    // creiamo i moduli contenitori noti senza dipendere da altri file.
    if (!defaults.length) {
      defaults = [
        {
          title: 'Radio Natura',
          url: 'modules/media-radio.html',
          rev: 1,
          enabled: true,
          renderer: 'audio-list',
          description: 'Modulo contenitore Radio.',
          notes: 'Preset iniziale Media Suite.',
          cacheScope: 'modules/media-radio.html',
          extraUrls: '',
          clearNeedles: 'modules/media-radio.html'
        },
        {
          title: 'Biblioteca Wild-U',
          url: 'modules/media-biblioteca.html',
          rev: 1,
          enabled: true,
          renderer: 'document-tabs',
          description: 'Modulo contenitore Biblioteca.',
          notes: 'Preset iniziale Media Suite.',
          cacheScope: 'modules/media-biblioteca.html',
          extraUrls: '',
          clearNeedles: 'modules/media-biblioteca.html'
        },
        {
          title: 'Modulo Giochi',
          url: 'modules/wildu-games.html',
          rev: 1,
          enabled: true,
          renderer: 'module-html',
          description: 'Modulo launcher dei giochi Wild-U.',
          notes: 'Preset iniziale Media Suite.',
          cacheScope: 'modules/wildu-games.html',
          extraUrls: '',
          clearNeedles: 'modules/wildu-games.html'
        }
      ];
    }

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
