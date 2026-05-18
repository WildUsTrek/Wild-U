/* global WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  function catalogCol() {
    return root.db.collection(WILDU_MEDIA_CONFIG.collections.catalog);
  }

  function mediaRef(id) {
    return catalogCol().doc(id);
  }

  function getRuleForTag(tagSlug) {
    return (WILDU_MEDIA_CONFIG.tagRules || {})[root.slugify(tagSlug)] || null;
  }

  function normalizeSubcategory(value) {
    return root.slugify(value || '');
  }

  function validateMediaRouting(media) {
    var kind = root.slugify(media.kind || '');
    var tagSlug = root.slugify(media.tagSlug || '');
    var rule = getRuleForTag(tagSlug);

    if (WILDU_MEDIA_CONFIG.activeUploadKinds.indexOf(kind) === -1) {
      throw new Error('Tipo upload non ammesso: ' + kind);
    }
    if (kind === 'gpx') throw new Error('GPX escluso da questa app: usa la mini-app Map Viewer/Mappa dei Tesori.');
    if (!tagSlug) throw new Error('Tag principale obbligatorio.');
    if (!rule) throw new Error('Tag non previsto dalla Media Suite: ' + tagSlug);
    if (rule.allowedKinds.indexOf(kind) === -1) {
      throw new Error('Il tag ' + tagSlug + ' non accetta file di tipo ' + kind + '.');
    }

    if (rule.requiredSubcategory && !media.subcategory) {
      throw new Error('Sottocategoria obbligatoria per ' + tagSlug + '.');
    }
    if (media.subcategory && rule.allowedSubcategories && rule.allowedSubcategories.length) {
      if (rule.allowedSubcategories.indexOf(media.subcategory) === -1) {
        throw new Error('Sottocategoria non valida per ' + tagSlug + ': ' + media.subcategory);
      }
    }

    if (tagSlug === 'immagini' && media.visibility === 'PUBLIC') {
      throw new Error('Le immagini sono admin-only per ora: usa visibility PRIVATE. WildWall resta fuori da questa suite.');
    }
  }

  function normalizeMediaInput(input) {
    input = input || {};
    var tagSlug = root.slugify(input.tagSlug || '');
    var tagSlugs = Array.isArray(input.tagSlugs) && input.tagSlugs.length ? input.tagSlugs : [tagSlug];
    tagSlugs = tagSlugs.map(root.slugify).filter(Boolean).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
    var kind = root.slugify(input.kind || input.category || '');
    var extraTags = root.parseTags(input.tagsText || input.tags || '');
    var subcategory = normalizeSubcategory(input.subcategory || '');

    return {
      schemaVersion: 2,
      title: String(input.title || '').trim(),
      description: String(input.description || '').trim(),
      category: kind,
      kind: kind,
      subcategory: subcategory || null,
      subcategoryLabel: subcategory ? root.getSubcategoryLabel(subcategory) : null,
      tagSlug: tagSlug,
      tagSlugs: tagSlugs,
      tags: extraTags,
      searchTokens: root.parseTags([input.title, input.description, extraTags.join(',')].join(',')),
      status: input.status || WILDU_MEDIA_CONFIG.defaultStatus,
      visibility: input.visibility || WILDU_MEDIA_CONFIG.defaultVisibilityByKind[kind] || 'PUBLIC',
      clientRenderable: tagSlug !== 'immagini',
      sortOrder: Number(input.sortOrder || 0),
      fileUrl: input.fileUrl,
      objectKey: input.objectKey,
      storageProvider: 'cloudflare_r2',
      uploadMode: 'worker_presigned_put',
      originalFileName: input.originalFileName,
      contentType: input.contentType,
      sizeBytes: Number(input.sizeBytes || 0),
      durationSeconds: input.durationSeconds || null,
      width: input.width || null,
      height: input.height || null,
      pageCount: input.pageCount || null,
      mediaVersion: Math.max(1, parseInt(input.mediaVersion, 10) || 1),
      mediaVersionNote: String(input.mediaVersionNote || '').trim() || null,
      mediaVersionUpdatedAt: input.mediaVersionUpdatedAt || null,
      mediaVersionUpdatedByUid: input.mediaVersionUpdatedByUid || null,
      mediaVersionUpdatedByEmail: input.mediaVersionUpdatedByEmail || null
    };
  }

  async function createMedia(input) {
    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();
    var media = normalizeMediaInput(input);

    if (!media.title) throw new Error('Titolo media obbligatorio.');
    validateMediaRouting(media);
    if (!media.fileUrl || !media.objectKey) throw new Error('fileUrl/objectKey mancanti.');

    media.createdAt = now;
    media.updatedAt = now;
    media.mediaVersionUpdatedAt = now;
    media.createdByUid = user.uid;
    media.updatedByUid = user.uid;
    media.mediaVersionUpdatedByUid = user.uid;
    media.createdByEmail = user.email || null;
    media.updatedByEmail = user.email || null;
    media.mediaVersionUpdatedByEmail = user.email || null;

    var docRef = await catalogCol().add(media);
    media.id = docRef.id;

    await root.TagService.bumpTagVersionsForMediaChange(null, media, 'MEDIA_CREATED');
    return media;
  }

  async function getMedia(id) {
    var doc = await mediaRef(id).get();
    if (!doc.exists) return null;
    var data = doc.data() || {};
    data.id = doc.id;
    return data;
  }

  async function listMedia(filters) {
    filters = filters || {};
    var q = catalogCol();

    if (filters.tagSlug) q = q.where('tagSlug', '==', filters.tagSlug);
    if (filters.kind) q = q.where('kind', '==', filters.kind);
    if (filters.subcategory) q = q.where('subcategory', '==', filters.subcategory);
    if (filters.status) q = q.where('status', '==', filters.status);
    if (filters.visibility) q = q.where('visibility', '==', filters.visibility);

    q = q.orderBy('updatedAt', 'desc').limit(Number(filters.limit || 80));

    var snap = await q.get();
    return snap.docs.map(function (doc) {
      var data = doc.data() || {};
      data.id = doc.id;
      return data;
    });
  }

  async function updateMedia(id, patch) {
    var user = root.requireCurrentUser();
    var before = await getMedia(id);
    if (!before) throw new Error('Media non trovato: ' + id);

    var safePatch = Object.assign({}, patch || {});
    delete safePatch.id;
    delete safePatch.createdAt;
    delete safePatch.createdByUid;
    delete safePatch.createdByEmail;

    if (safePatch.tagSlug) safePatch.tagSlug = root.slugify(safePatch.tagSlug);
    if (safePatch.kind) safePatch.kind = root.slugify(safePatch.kind);
    if (safePatch.category) safePatch.category = root.slugify(safePatch.category);
    if (safePatch.subcategory !== undefined) safePatch.subcategory = normalizeSubcategory(safePatch.subcategory) || null;
    if (safePatch.tagSlugs) safePatch.tagSlugs = safePatch.tagSlugs.map(root.slugify).filter(Boolean);

    var afterCandidate = Object.assign({}, before, safePatch);
    validateMediaRouting(afterCandidate);

    safePatch.updatedAt = root.FieldValue.serverTimestamp();
    safePatch.updatedByUid = user.uid;
    safePatch.updatedByEmail = user.email || null;

    await mediaRef(id).set(safePatch, { merge: true });
    var after = Object.assign({}, before, safePatch);
    await root.TagService.bumpTagVersionsForMediaChange(before, after, 'MEDIA_UPDATED');
    return getMedia(id);
  }

  async function bumpMediaVersion(id, note) {
    var user = root.requireCurrentUser();
    var before = await getMedia(id);
    if (!before) throw new Error('Media non trovato: ' + id);

    var now = root.FieldValue.serverTimestamp();

    // Importante:
    // i media creati prima del campo mediaVersion vengono mostrati in UI come v1.
    // Quindi il primo "+1 versione" deve scrivere v2 reale, non increment(1) su campo mancante.
    var currentVersion = Math.max(1, Number(before.mediaVersion || 1));
    var nextVersion = currentVersion + 1;
    var cleanNote = String(note || '').trim() || 'VERSION_BUMP';

    await mediaRef(id).set({
      mediaVersion: nextVersion,
      mediaVersionNote: cleanNote,
      mediaVersionUpdatedAt: now,
      mediaVersionUpdatedByUid: user.uid,
      mediaVersionUpdatedByEmail: user.email || null,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    }, { merge: true });

    var after = Object.assign({}, before, {
      mediaVersion: nextVersion,
      mediaVersionNote: cleanNote,
      mediaVersionUpdatedAt: now,
      mediaVersionUpdatedByUid: user.uid,
      mediaVersionUpdatedByEmail: user.email || null,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    });

    await root.TagService.bumpTagVersionsForMediaChange(before, after, 'MEDIA_VERSION_BUMP');
    return getMedia(id);
  }

  async function archiveMedia(id) {
    return updateMedia(id, { status: 'ARCHIVED' });
  }

  async function deleteMediaDocument(id) {
    var before = await getMedia(id);
    if (!before) throw new Error('Media non trovato: ' + id);
    await mediaRef(id).delete();
    await root.TagService.bumpTagVersionsForMediaChange(before, null, 'MEDIA_DELETED');
    return before;
  }

  async function hardDeleteMediaAndR2(id) {
    var before = await getMedia(id);
    if (!before) throw new Error('Media non trovato: ' + id);

    await mediaRef(id).delete();
    await root.TagService.bumpTagVersionsForMediaChange(before, null, 'MEDIA_HARD_DELETED');

    var r2Result = null;
    var r2Error = null;
    if (before.objectKey) {
      try {
        r2Result = await root.R2WorkerService.deleteObject(before.objectKey);
      } catch (err) {
        r2Error = err && err.message ? err.message : String(err);
      }
    }
    return { media: before, r2: r2Result, r2Error: r2Error };
  }

  root.MediaService = {
    normalizeMediaInput: normalizeMediaInput,
    validateMediaRouting: validateMediaRouting,
    createMedia: createMedia,
    getMedia: getMedia,
    listMedia: listMedia,
    updateMedia: updateMedia,
    bumpMediaVersion: bumpMediaVersion,
    archiveMedia: archiveMedia,
    deleteMediaDocument: deleteMediaDocument,
    hardDeleteMediaAndR2: hardDeleteMediaAndR2
  };
})();
