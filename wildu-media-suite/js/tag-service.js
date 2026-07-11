/* global WILDU_MEDIA_CONFIG, WILDU_MEDIA_DEFAULT_TAGS */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  function tagsCol() {
    return root.db.collection(WILDU_MEDIA_CONFIG.collections.tags);
  }

  function tagRef(tagSlug) {
    return tagsCol().doc(tagSlug);
  }

  function runtimePublicVersionsRef() {
    return root.db
      .collection(WILDU_MEDIA_CONFIG.collections.runtime)
      .doc(WILDU_MEDIA_CONFIG.runtimePublicVersionsDocId);
  }

  function normalizeAllowedCategories(value) {
    if (Array.isArray(value)) return value.map(root.slugify).filter(Boolean);
    return String(value || '')
      .split(',')
      .map(function (x) { return root.slugify(x); })
      .filter(Boolean)
      .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  function normalizeTabs(tabs) {
    if (!Array.isArray(tabs)) return [];
    return tabs.map(function (tab) {
      return {
        id: root.slugify(tab.id || tab.label || ''),
        label: String(tab.label || tab.id || '').trim(),
        category: root.slugify(tab.category || 'pdf')
      };
    }).filter(function (tab) { return tab.id && tab.label; });
  }

  function getDefaultTag(slug) {
    var defaults = WILDU_MEDIA_DEFAULT_TAGS || [];
    return defaults.find(function (tag) { return tag.tagSlug === slug; }) || null;
  }

  function normalizeTagInput(input) {
    input = input || {};
    var slug = root.slugify(input.tagSlug || input.title || '');
    var defaultRule = (WILDU_MEDIA_CONFIG.tagRules || {})[slug] || {};
    var defaultTag = getDefaultTag(slug) || {};
    var rawTabs = input.tabs !== undefined ? input.tabs : (defaultTag.tabs || []);
    var rawAllowed = input.allowedCategories && input.allowedCategories.length
      ? input.allowedCategories
      : (input.allowedCategoriesText || defaultTag.allowedCategories || defaultRule.allowedKinds || []);

    return {
      tagSlug: slug,
      title: String(input.title || defaultTag.title || slug).trim(),
      description: String(input.description || defaultTag.description || '').trim(),
      status: input.status || defaultTag.status || 'ACTIVE',
      visibility: input.visibility || defaultTag.visibility || (slug === 'immagini' ? 'PRIVATE' : 'PUBLIC'),
      sortOrder: Number(input.sortOrder !== undefined ? input.sortOrder : (defaultTag.sortOrder || 0)),
      renderer: input.renderer || defaultTag.renderer || (slug === 'radio' ? 'audio-list' : slug === 'biblioteca' ? 'document-tabs' : 'none'),
      clientRenderable: input.clientRenderable === undefined
        ? (defaultTag.clientRenderable !== undefined ? defaultTag.clientRenderable : defaultRule.clientRenderable !== false)
        : !!input.clientRenderable,
      allowedCategories: normalizeAllowedCategories(rawAllowed),
      tabs: normalizeTabs(rawTabs)
    };
  }

  async function listTags(options) {
    options = options || {};
    var query = tagsCol().orderBy('sortOrder', 'asc').orderBy('title', 'asc');
    if (options.onlyActive) query = query.where('status', '==', 'ACTIVE');
    var snap = await query.get();
    return snap.docs.map(function (doc) {
      var data = doc.data() || {};
      data.id = doc.id;
      return data;
    });
  }

  async function getTag(tagSlug) {
    var doc = await tagRef(tagSlug).get();
    if (!doc.exists) return null;
    var data = doc.data() || {};
    data.id = doc.id;
    return data;
  }

  async function createOrUpdateTag(rawInput) {
    var user = root.requireCurrentUser();
    var input = normalizeTagInput(rawInput);
    var now = root.FieldValue.serverTimestamp();

    await tagRef(input.tagSlug).set({
      tagSlug: input.tagSlug,
      title: input.title,
      description: input.description,
      status: input.status,
      visibility: input.visibility,
      sortOrder: input.sortOrder,
      renderer: input.renderer,
      clientRenderable: input.clientRenderable,
      allowedCategories: input.allowedCategories,
      tabs: input.tabs,
      version: root.FieldValue.increment(0),
      publicVersion: root.FieldValue.increment(0),
      createdAt: now,
      updatedAt: now,
      createdByUid: user.uid,
      updatedByUid: user.uid,
      createdByEmail: user.email || null,
      updatedByEmail: user.email || null
    }, { merge: true });

    await syncRuntimePublicVersions();
    return getTag(input.tagSlug);
  }

  async function seedDefaultTags() {
    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();
    var batch = root.db.batch();

    (WILDU_MEDIA_DEFAULT_TAGS || []).forEach(function (raw) {
      var tag = normalizeTagInput(raw);
      batch.set(tagRef(tag.tagSlug), {
        tagSlug: tag.tagSlug,
        title: tag.title,
        description: tag.description,
        status: tag.status,
        visibility: tag.visibility,
        sortOrder: tag.sortOrder,
        renderer: tag.renderer,
        clientRenderable: tag.clientRenderable,
        allowedCategories: tag.allowedCategories,
        tabs: tag.tabs,
        version: root.FieldValue.increment(0),
        publicVersion: root.FieldValue.increment(0),
        createdAt: now,
        updatedAt: now,
        createdByUid: user.uid,
        updatedByUid: user.uid,
        createdByEmail: user.email || null,
        updatedByEmail: user.email || null
      }, { merge: true });
    });

    await batch.commit();
    await syncRuntimePublicVersions();
  }

  async function setTagStatus(tagSlug, status) {
    var user = root.requireCurrentUser();
    await tagRef(tagSlug).set({
      status: status,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    }, { merge: true });
    await syncRuntimePublicVersions();
  }

  function uniqueSlugs(slugs) {
    return (slugs || [])
      .map(function (x) { return root.slugify(x); })
      .filter(Boolean)
      .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  function mediaPublicImpact(media) {
    return !!(media && media.status === 'ACTIVE' && media.visibility === 'PUBLIC');
  }

  function collectMediaTagSlugs(media) {
    if (!media) return [];
    var list = [];
    if (media.tagSlug) list.push(media.tagSlug);
    if (Array.isArray(media.tagSlugs)) list = list.concat(media.tagSlugs);
    return uniqueSlugs(list);
  }

  function tagAllowsClientPublicVersion(tag) {
    if (!tag) return true;
    return tag.clientRenderable !== false && tag.status !== 'DISABLED' && tag.visibility === 'PUBLIC';
  }

  async function getTagsMap(slugs) {
    var map = {};
    await Promise.all(uniqueSlugs(slugs).map(async function (slug) {
      map[slug] = await getTag(slug);
    }));
    return map;
  }

  function sanitizePublicCatalogItem(docId, data, publicVersion) {
    data = data || {};

    return {
      id: docId,
      schemaVersion: Number(data.schemaVersion || 2),
      title: String(data.title || '').trim(),
      description: String(data.description || '').trim(),
      category: root.slugify(data.category || data.kind || ''),
      kind: root.slugify(data.kind || data.category || ''),
      subcategory: data.subcategory ? root.slugify(data.subcategory) : null,
      subcategoryLabel: data.subcategoryLabel || null,
      tagSlug: root.slugify(data.tagSlug || ''),
      tagSlugs: Array.isArray(data.tagSlugs) ? data.tagSlugs.map(root.slugify).filter(Boolean) : [],
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 24).map(String) : [],
      searchTokens: Array.isArray(data.searchTokens) ? data.searchTokens.slice(0, 40).map(String) : [],
      status: data.status || 'ACTIVE',
      visibility: data.visibility || 'PUBLIC',
      clientRenderable: data.clientRenderable !== false,
      sortOrder: Number(data.sortOrder || 0),
      fileUrl: String(data.fileUrl || '').trim(),
      contentType: String(data.contentType || '').trim(),
      sizeBytes: Number(data.sizeBytes || 0),
      durationSeconds: data.durationSeconds || null,
      pageCount: data.pageCount || null,
      mediaVersion: Math.max(1, Number(data.mediaVersion || 1)),
      publicVersion: Number(publicVersion || 0),
      readerStatus: data.readerStatus || null,
      readerStorageMode: data.readerStorageMode || null,
      readerPayloadLocation: data.readerPayloadLocation || null,
      readerPayloadUrl: data.readerPayloadUrl || data.readerJsonUrl || null,
      readerPayloadVerifiedAtClient: data.readerPayloadVerifiedAtClient || null,
      readerPayloadVerifiedBlockCount: Number(data.readerPayloadVerifiedBlockCount || 0),
      readerVersion: data.readerVersion || null,
      readerSourceMediaVersion: data.readerSourceMediaVersion || null,
      readerBlockCount: Number(data.readerBlockCount || 0),
      readerCharCount: Number(data.readerCharCount || 0),
      readerImageCount: Number(data.readerImageCount || 0),
      readerPreview: data.readerPreview || ''
    };
  }

  async function loadPublicCatalogItemsForManifest(tagSlug, publicVersion) {
    var snap = await root.db
      .collection(WILDU_MEDIA_CONFIG.collections.catalog)
      .where('tagSlug', '==', tagSlug)
      .where('status', '==', 'ACTIVE')
      .where('visibility', '==', 'PUBLIC')
      .get();

    var items = snap.docs.map(function (doc) {
      return sanitizePublicCatalogItem(doc.id, doc.data() || {}, publicVersion);
    });

    items.sort(function (a, b) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });

    return items;
  }

  function buildCatalogManifestObjectKey(tagSlug, publicVersion) {
    var cleanTag = root.slugify(tagSlug || 'media') || 'media';
    var cleanVersion = Math.max(0, Number(publicVersion || 0));
    return 'wildu-media/catalog/' + cleanTag + '/v' + cleanVersion + '/catalog.json';
  }

  async function tryUploadPublicCatalogManifest(tagSlug, publicVersion, metaEntry) {
    if (!root.R2WorkerService || typeof root.R2WorkerService.requestUploadUrl !== 'function') {
      return null;
    }

    try {
      var items = await loadPublicCatalogItemsForManifest(tagSlug, publicVersion);
      var payload = {
        schemaVersion: 1,
        tagSlug: tagSlug,
        publicVersion: Number(publicVersion || 0),
        generatedAtClient: new Date().toISOString(),
        meta: metaEntry || {},
        items: items
      };
      var json = JSON.stringify(payload);
      var blob = new Blob([json], { type: 'application/json' });
      var objectKey = buildCatalogManifestObjectKey(tagSlug, publicVersion);

      var uploadInfo = await root.R2WorkerService.requestUploadUrl({
        kind: 'json',
        tagSlug: tagSlug,
        subcategory: 'catalog-manifest',
        fileName: objectKey,
        contentType: 'application/json',
        sizeBytes: blob.size
      });

      await root.R2WorkerService.putFileToR2(uploadInfo.uploadUrl, blob, 'application/json');

      return {
        catalogManifestUrl: uploadInfo.publicUrl || '',
        catalogManifestObjectKey: uploadInfo.objectKey || objectKey,
        catalogManifestVersion: Number(publicVersion || 0),
        catalogManifestSizeBytes: blob.size,
        catalogManifestItemCount: items.length,
        catalogManifestGeneratedAtClient: payload.generatedAtClient
      };
    } catch (err) {
      console.warn('[WILDU MEDIA] Manifest catalogo R2 non pubblicato: il client pubblico mostrera contenuto in aggiornamento finche non viene pubblicato.', err);
      return null;
    }
  }

  async function syncRuntimePublicVersions() {
    var tags = await listTags({ onlyActive: false });
    var publicMap = {};
    var meta = {};

    tags.forEach(function (tag) {
      if (tagAllowsClientPublicVersion(tag)) {
        var metaEntry = {
          title: tag.title || tag.tagSlug,
          renderer: tag.renderer || 'none',
          allowedCategories: Array.isArray(tag.allowedCategories) ? tag.allowedCategories : [],
          tabs: Array.isArray(tag.tabs) ? tag.tabs : []
        };

        // Impostazioni leggere Biblioteca client.
        // Restano nel tag "biblioteca" e vengono esposte al client tramite public_versions.meta.
        if (tag.tagSlug === 'biblioteca') {
          metaEntry.bookRequiredGrade = String(tag.bookRequiredGrade || '').trim();
          metaEntry.real_news = String(tag.real_news || '').trim();
        }

        publicMap[tag.tagSlug] = Number(tag.publicVersion || 0);
        meta[tag.tagSlug] = metaEntry;
      }
    });

    for (var i = 0; i < tags.length; i++) {
      var tag = tags[i];
      if (!tag || !meta[tag.tagSlug]) continue;

      var manifestInfo = await tryUploadPublicCatalogManifest(
        tag.tagSlug,
        publicMap[tag.tagSlug],
        meta[tag.tagSlug]
      );

      if (manifestInfo) {
        meta[tag.tagSlug] = Object.assign({}, meta[tag.tagSlug], manifestInfo);
      }
    }

    await runtimePublicVersionsRef().set({
      schemaVersion: 1,
      updatedAt: root.FieldValue.serverTimestamp(),
      tags: publicMap,
      meta: meta
    }, { merge: false });

    return { tags: publicMap, meta: meta };
  }

  /*
   * Incrementa le versioni dei tag coinvolti.
   * Regola corretta:
   * - version cambia per ogni media collegato al tag;
   * - publicVersion cambia solo se il media impatta la vista pubblica e il tag è clientRenderable.
   */
  async function bumpTagVersionsForMediaChange(beforeMedia, afterMedia, reason) {
    var user = root.requireCurrentUser();
    var beforeSlugs = collectMediaTagSlugs(beforeMedia);
    var afterSlugs = collectMediaTagSlugs(afterMedia);
    var allSlugs = uniqueSlugs(beforeSlugs.concat(afterSlugs));
    if (!allSlugs.length) return;

    var beforePublic = mediaPublicImpact(beforeMedia);
    var afterPublic = mediaPublicImpact(afterMedia);
    var publicChanged = beforePublic || afterPublic;
    var tagMap = await getTagsMap(allSlugs);

    var batch = root.db.batch();
    var now = root.FieldValue.serverTimestamp();

    allSlugs.forEach(function (slug) {
      var tag = tagMap[slug];
      var payload = {
        tagSlug: slug,
        version: root.FieldValue.increment(1),
        updatedAt: now,
        lastContentChangeAt: now,
        lastContentChangeReason: reason || 'MEDIA_CHANGE',
        updatedByUid: user.uid,
        updatedByEmail: user.email || null
      };
      if (publicChanged && tagAllowsClientPublicVersion(tag)) {
        payload.publicVersion = root.FieldValue.increment(1);
      }
      batch.set(tagRef(slug), payload, { merge: true });
    });

    await batch.commit();
    await syncRuntimePublicVersions();
  }

  async function updateBibliotecaClientSettings(input) {
    var user = root.requireCurrentUser();
    input = input || {};

    var now = root.FieldValue.serverTimestamp();

    var bookRequiredGrade = String(input.bookRequiredGrade || '').trim();
    var realNews = String(input.real_news || '').trim();

    await tagRef('biblioteca').set({
      tagSlug: 'biblioteca',

      // Campi client-facing leggeri.
      bookRequiredGrade: bookRequiredGrade,
      real_news: realNews,

      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,

      bibliotecaSettingsUpdatedAt: now,
      bibliotecaSettingsUpdatedByUid: user.uid,
      bibliotecaSettingsUpdatedByEmail: user.email || null
    }, { merge: true });

    await syncRuntimePublicVersions();
    return getTag('biblioteca');
  }

  root.TagService = {
    listTags: listTags,
    getTag: getTag,
    createOrUpdateTag: createOrUpdateTag,
    seedDefaultTags: seedDefaultTags,
    setTagStatus: setTagStatus,
    syncRuntimePublicVersions: syncRuntimePublicVersions,
    bumpTagVersionsForMediaChange: bumpTagVersionsForMediaChange,
    collectMediaTagSlugs: collectMediaTagSlugs,
    mediaPublicImpact: mediaPublicImpact,
    tagAllowsClientPublicVersion: tagAllowsClientPublicVersion,
    normalizeAllowedCategories: normalizeAllowedCategories,
    updateBibliotecaClientSettings: updateBibliotecaClientSettings
  };
})();
