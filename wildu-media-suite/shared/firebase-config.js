// shared/firebase-config.js
// Config pubblica Firebase Web SDK per Wildu Media Suite.
// Non inserire qui service account, private key, token server, segreti Cloudflare/R2 o credenziali backend.

export const firebaseConfig = {
  apiKey: "AIzaSyDIPgFA_caKIMHFgEa-enO4Jk0d7eTCFLI",
  authDomain: "wild-u-server.firebaseapp.com",
  projectId: "wild-u-server",
  storageBucket: "wild-u-server.firebasestorage.app",
  messagingSenderId: "959006418837",
  appId: "1:959006418837:web:affce9510301b946e7389c",
  measurementId: "G-KC1R6VSMF5"
};

export const WILDU_MEDIA_COLLECTIONS = Object.freeze({
  TAGS: "wildu_media_tags",
  CATALOG: "wildu_media_catalog"
});

export const WILDU_MEDIA_CONFIG = Object.freeze({
  appName: "Wildu Media Suite",
  appVersion: "0.1.1",

  // URL pubblici non segreti.
  workerUrl: "https://wildu-upload-manager.baffiwild.workers.dev",
  cdnBaseUrl: "https://media.baffiwild.it/",

  // Categorie gestite dalla app sorella.
  // GPX escluso: resta nella mini-app mappa già esistente.
  activeUploadKinds: ["audio", "pdf", "book", "image"],
  futureKinds: ["video"],

  // Limiti lato frontend: il Worker deve comunque validarli lato server.
  maxSizeBytesByKind: {
    audio: 150 * 1024 * 1024,
    pdf: 120 * 1024 * 1024,
    book: 120 * 1024 * 1024,
    image: 20 * 1024 * 1024,
    video: 500 * 1024 * 1024
  },

  allowedMimePrefixesByKind: {
    audio: ["audio/"],
    image: ["image/"],
    pdf: ["application/pdf"],
    book: ["application/pdf", "application/epub+zip"],
    video: ["video/"]
  },

  defaultVisibility: "PUBLIC",
  defaultStatus: "ACTIVE",

  // Header non segreti utili al Worker per audit/canale.
  requestHeaders: Object.freeze({
    "X-WILDU-CHANNEL": "MEDIA_SUITE_ADMIN"
  })
});

// Compatibilità con gli script classici della suite.
// La app usa ancora IIFE non-module per restare semplice su GitHub Pages.
window.firebaseConfig = firebaseConfig;
window.WILDU_MEDIA_COLLECTIONS = WILDU_MEDIA_COLLECTIONS;
window.WILDU_MEDIA_CONFIG = Object.freeze({
  ...WILDU_MEDIA_CONFIG,
  firebaseConfig,
  collections: Object.freeze({
    tags: WILDU_MEDIA_COLLECTIONS.TAGS,
    catalog: WILDU_MEDIA_COLLECTIONS.CATALOG
  })
});
