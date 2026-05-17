/* global WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  function tagsCol() {
    return root.db.collection(WILDU_MEDIA_CONFIG.collections.tags);
  }

  function tagRef(tagSlug) {
    return tagsCol().doc(tagSlug);
  }

  function normalizeTagInput(input) {
    var slug = root.slugify(input.tagSlug || input.title || '');
    return {
      tagSlug: slug,
      title: String(input.title || slug).trim(),
      description: String(input.description || '').trim(),
      status: input.status || 'ACTIVE',
      visibility: input.visibility || 'PUBLIC',
      sortOrder: Number(input.sortOrder || 0)
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
      version: root.FieldValue.increment(0),
      publicVersion: root.FieldValue.increment(0),
      createdAt: now,
      updatedAt: now,
      createdByUid: user.uid,
      updatedByUid: user.uid,
      createdByEmail: user.email || null,
      updatedByEmail: user.email || null
    }, { merge: true });

    return getTag(input.tagSlug);
  }

  async function setTagStatus(tagSlug, status) {
    var user = root.requireCurrentUser();
    await tagRef(tagSlug).set({
      status: status,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    }, { merge: true });
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

  /*
   * Incrementa le versioni dei tag coinvolti.
   * Questa è la regola chiave: la app sorella scrive versioni; la client app userà publicVersion
   * per capire quando aggiornare la propria cache/render.
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

    var batch = root.db.batch();
    var now = root.FieldValue.serverTimestamp();

    allSlugs.forEach(function (slug) {
      var payload = {
        tagSlug: slug,
        version: root.FieldValue.increment(1),
        updatedAt: now,
        lastContentChangeAt: now,
        lastContentChangeReason: reason || 'MEDIA_CHANGE',
        updatedByUid: user.uid,
        updatedByEmail: user.email || null
      };
      if (publicChanged) payload.publicVersion = root.FieldValue.increment(1);
      batch.set(tagRef(slug), payload, { merge: true });
    });

    await batch.commit();
  }

  root.TagService = {
    listTags: listTags,
    getTag: getTag,
    createOrUpdateTag: createOrUpdateTag,
    setTagStatus: setTagStatus,
    bumpTagVersionsForMediaChange: bumpTagVersionsForMediaChange,
    collectMediaTagSlugs: collectMediaTagSlugs,
    mediaPublicImpact: mediaPublicImpact
  };
})();
