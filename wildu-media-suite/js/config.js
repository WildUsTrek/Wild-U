/*
 * WILDU MEDIA SUITE — CONFIG PUBBLICA
 * Percorso previsto: /Wild-U/wildu-media-suite/
 *
 * ATTENZIONE:
 * - Qui NON vanno mai inseriti segreti Cloudflare/R2, access key, secret key, bearer statici.
 * - La firebaseConfig frontend è pubblica per natura, ma va comunque gestita con regole Firestore corrette.
 * - Il Worker deve validare il Firebase ID token admin lato server/Cloudflare.
 */
(function () {
  'use strict';

  window.WILDU_MEDIA_CONFIG = {
    appName: 'Wildu Media Suite',
    appVersion: '0.1.0',

    // URL pubblici non segreti
    workerUrl: 'https://wildu-upload-manager.baffiwild.workers.dev',
    cdnBaseUrl: 'https://media.baffiwild.it/',

    // Firestore collections ufficiali
    collections: {
      tags: 'wildu_media_tags',
      catalog: 'wildu_media_catalog'
    },

    // Firebase frontend config: incolla qui la config web del progetto Firebase.
    // Non inserire service account, private key, secret Cloudflare o token interni.
    firebaseConfig: {
      apiKey: 'INCOLLA_FIREBASE_API_KEY_FRONTEND',
      authDomain: 'INCOLLA_AUTH_DOMAIN',
      projectId: 'INCOLLA_PROJECT_ID',
      storageBucket: 'INCOLLA_STORAGE_BUCKET',
      messagingSenderId: 'INCOLLA_MESSAGING_SENDER_ID',
      appId: 'INCOLLA_APP_ID'
    },

    // Categorie gestite dalla app sorella.
    // GPX escluso: resta nella mini-app mappa già esistente.
    activeUploadKinds: ['audio', 'pdf', 'book', 'image'],
    futureKinds: ['video'],

    // Limiti lato frontend: il Worker deve comunque validarli lato server.
    maxSizeBytesByKind: {
      audio: 150 * 1024 * 1024,
      pdf: 120 * 1024 * 1024,
      book: 120 * 1024 * 1024,
      image: 20 * 1024 * 1024,
      video: 500 * 1024 * 1024
    },

    allowedMimePrefixesByKind: {
      audio: ['audio/'],
      image: ['image/'],
      pdf: ['application/pdf'],
      book: ['application/pdf', 'application/epub+zip'],
      video: ['video/']
    },

    defaultVisibility: 'PUBLIC',
    defaultStatus: 'ACTIVE',

    // Header non segreti utili al Worker per audit/canale.
    requestHeaders: {
      'X-WILDU-CHANNEL': 'MEDIA_SUITE_ADMIN'
    }
  };
})();
