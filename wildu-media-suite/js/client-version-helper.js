/*
 * Helper opzionale per la FUTURA app client.
 * Non è usato dalla app sorella admin.
 * Strada B: modulo HTML statico + loader Firestore per tag.
 */
(function () {
  'use strict';

  var CACHE_PREFIX = 'wilduMediaCache:v1:tag:';

  function cacheKey(tagSlug) {
    return CACHE_PREFIX + String(tagSlug || '').trim();
  }

  function readTagCache(tagSlug) {
    try {
      var raw = localStorage.getItem(cacheKey(tagSlug));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeTagCache(tagSlug, publicVersion, items) {
    var payload = {
      tagSlug: tagSlug,
      publicVersion: Number(publicVersion || 0),
      savedAt: Date.now(),
      items: Array.isArray(items) ? items : []
    };
    localStorage.setItem(cacheKey(tagSlug), JSON.stringify(payload));
    return payload;
  }

  function clearTagCache(tagSlug) {
    localStorage.removeItem(cacheKey(tagSlug));
  }

  async function getPublicVersions(db, collections, docId) {
    collections = collections || { runtime: 'wildu_media_runtime' };
    docId = docId || 'public_versions';
    var doc = await db.collection(collections.runtime).doc(docId).get();
    if (!doc.exists) return { tags: {}, meta: {}, updatedAt: null };
    return doc.data() || { tags: {}, meta: {}, updatedAt: null };
  }

  async function loadPublicMediaForTag(db, tagSlug, options) {
    options = options || {};
    var collections = options.collections || { catalog: 'wildu_media_catalog' };
    var q = db.collection(collections.catalog)
      .where('tagSlug', '==', tagSlug)
      .where('status', '==', 'ACTIVE')
      .where('visibility', '==', 'PUBLIC');

    if (options.category) q = q.where('kind', '==', options.category);
    if (options.subcategory) q = q.where('subcategory', '==', options.subcategory);

    q = q.orderBy('sortOrder', 'asc').limit(Number(options.limit || 80));

    var snap = await q.get();
    return snap.docs.map(function (doc) {
      var data = doc.data() || {};
      data.id = doc.id;
      return data;
    });
  }

  async function loadTagWithVersionCache(db, tagSlug, options) {
    options = options || {};
    var manifest = await getPublicVersions(db, options.collections, options.runtimeDocId);
    var remoteVersion = Number((manifest.tags || {})[tagSlug] || 0);
    var local = readTagCache(tagSlug);

    if (local && Number(local.publicVersion || 0) === remoteVersion && Array.isArray(local.items)) {
      return {
        source: 'cache',
        tagSlug: tagSlug,
        publicVersion: remoteVersion,
        items: local.items,
        manifest: manifest
      };
    }

    var items = await loadPublicMediaForTag(db, tagSlug, options);
    writeTagCache(tagSlug, remoteVersion, items);

    return {
      source: 'firestore',
      tagSlug: tagSlug,
      publicVersion: remoteVersion,
      items: items,
      manifest: manifest
    };
  }

  window.WilduMediaClientVersion = {
    getPublicVersions: getPublicVersions,
    loadPublicMediaForTag: loadPublicMediaForTag,
    loadTagWithVersionCache: loadTagWithVersionCache,
    readTagCache: readTagCache,
    writeTagCache: writeTagCache,
    clearTagCache: clearTagCache
  };
})();
