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

  function normalizeMediaInput(input) {
    var tagSlug = root.slugify(input.tagSlug);
    var extraTags = root.parseTags(input.tagsText || input.tags || '');
    var tagSlugs = [tagSlug].concat(Array.isArray(input.tagSlugs) ? input.tagSlugs : []);
    tagSlugs = tagSlugs.map(root.slugify).filter(Boolean).filter(function (x, i, arr) { return arr.indexOf(x) === i; });

    return {
      schemaVersion: 1,
      title: String(input.title || '').trim(),
      description: String(input.description || '').trim(),
      category: input.kind,
      kind: input.kind,
      tagSlug: tagSlug,
      tagSlugs: tagSlugs,
      tags: extraTags,
      searchTokens: root.parseTags([input.title, input.description, extraTags.join(',')].join(',')),
      status: input.status || WILDU_MEDIA_CONFIG.defaultStatus,
      visibility: input.visibility || WILDU_MEDIA_CONFIG.defaultVisibility,
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
      pageCount: input.pageCount || null
    };
  }

  async function createMedia(input) {
    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();
    var media = normalizeMediaInput(input);

    if (!media.title) throw new Error('Titolo media obbligatorio.');
    if (!media.kind || WILDU_MEDIA_CONFIG.activeUploadKinds.indexOf(media.kind) === -1) {
      throw new Error('Categoria non ammessa: ' + media.kind);
    }
    if (media.kind === 'gpx') throw new Error('GPX escluso da questa app.');
    if (!media.tagSlug) throw new Error('Tag/modulo obbligatorio.');
    if (!media.fileUrl || !media.objectKey) throw new Error('fileUrl/objectKey mancanti.');

    media.createdAt = now;
    media.updatedAt = now;
    media.createdByUid = user.uid;
    media.updatedByUid = user.uid;
    media.createdByEmail = user.email || null;
    media.updatedByEmail = user.email || null;

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
    if (filters.status) q = q.where('status', '==', filters.status);
    if (filters.visibility) q = q.where('visibility', '==', filters.visibility);

    // Query semplice admin: updatedAt DESC. Se Firestore chiede index, usare firestore.indexes.sample.json.
    q = q.orderBy('updatedAt', 'desc').limit(Number(filters.limit || 50));

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
    if (safePatch.tagSlugs) safePatch.tagSlugs = safePatch.tagSlugs.map(root.slugify).filter(Boolean);

    safePatch.updatedAt = root.FieldValue.serverTimestamp();
    safePatch.updatedByUid = user.uid;
    safePatch.updatedByEmail = user.email || null;

    await mediaRef(id).set(safePatch, { merge: true });
    var after = Object.assign({}, before, safePatch);
    await root.TagService.bumpTagVersionsForMediaChange(before, after, 'MEDIA_UPDATED');
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

    // Prima togliamo visibilità da Firestore, così il client non lo renderizza più.
    await mediaRef(id).delete();
    await root.TagService.bumpTagVersionsForMediaChange(before, null, 'MEDIA_HARD_DELETED');

    // Poi proviamo a pulire R2. Se fallisce, il file può restare orfano ma non visibile dal catalogo.
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
    createMedia: createMedia,
    getMedia: getMedia,
    listMedia: listMedia,
    updateMedia: updateMedia,
    archiveMedia: archiveMedia,
    deleteMediaDocument: deleteMediaDocument,
    hardDeleteMediaAndR2: hardDeleteMediaAndR2
  };
})();
