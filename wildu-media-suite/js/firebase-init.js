/* global firebase, WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  function isPlaceholder(value) {
    return !value || String(value).indexOf('INCOLLA_') === 0;
  }

  function validateFirebaseConfig(config) {
    var required = ['apiKey', 'authDomain', 'projectId', 'appId'];
    var missing = required.filter(function (key) { return isPlaceholder(config[key]); });
    return {
      ok: missing.length === 0,
      missing: missing
    };
  }

  function initFirebase() {
    if (!window.firebase) {
      throw new Error('Firebase SDK non caricato. Controlla gli script CDN in index.html.');
    }

    if (!window.WILDU_MEDIA_CONFIG || !window.WILDU_MEDIA_CONFIG.firebaseConfig) {
      throw new Error('WILDU_MEDIA_CONFIG.firebaseConfig mancante.');
    }

    var validation = validateFirebaseConfig(window.WILDU_MEDIA_CONFIG.firebaseConfig);
    if (!validation.ok) {
      root.firebaseReady = false;
      root.firebaseConfigMissing = validation.missing;
      return null;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(window.WILDU_MEDIA_CONFIG.firebaseConfig);
    }

    var auth = firebase.auth();
    var db = firebase.firestore();

    root.firebaseReady = true;
    root.auth = auth;
    root.db = db;
    root.FieldValue = firebase.firestore.FieldValue;
    root.Timestamp = firebase.firestore.Timestamp;

    return { auth: auth, db: db };
  }

  root.initFirebase = initFirebase;
})();
