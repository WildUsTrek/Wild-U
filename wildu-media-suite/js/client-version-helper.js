/*
 * Helper opzionale per la FUTURA app client.
 * Non è usato dalla app sorella admin.
 * Serve solo come riferimento pronto: la client app legge publicVersion del tag e decide se aggiornare la propria cache.
 */
(function () {
  'use strict';

  window.WilduMediaClientVersion = {
    async getTagPublicVersion(db, tagSlug, collections) {
      collections = collections || { tags: 'wildu_media_tags' };
      var doc = await db.collection(collections.tags).doc(tagSlug).get();
      if (!doc.exists) return { exists: false, publicVersion: 0, tag: null };
      var data = doc.data() || {};
      return {
        exists: true,
        publicVersion: Number(data.publicVersion || 0),
        version: Number(data.version || 0),
        tag: data
      };
    },

    shouldRefreshByVersion(localVersion, remoteVersion) {
      return Number(localVersion || 0) !== Number(remoteVersion || 0);
    },

    async loadPublicMediaForTag(db, tagSlug, collections, limit) {
      collections = collections || { catalog: 'wildu_media_catalog' };
      var snap = await db.collection(collections.catalog)
        .where('tagSlug', '==', tagSlug)
        .where('status', '==', 'ACTIVE')
        .where('visibility', '==', 'PUBLIC')
        .orderBy('sortOrder', 'asc')
        .limit(Number(limit || 50))
        .get();

      return snap.docs.map(function (doc) {
        var data = doc.data() || {};
        data.id = doc.id;
        return data;
      });
    }
  };
})();
