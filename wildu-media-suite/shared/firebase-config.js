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
  CATALOG: "wildu_media_catalog",
  RUNTIME: "wildu_media_runtime"
});

export const WILDU_MEDIA_DEFAULT_TAGS = Object.freeze([
  Object.freeze({
    tagSlug: "biblioteca",
    title: "Biblioteca",
    description: "PDF divisi in Libri e Manuali e Guide.",
    status: "ACTIVE",
    visibility: "PUBLIC",
    sortOrder: 10,
    renderer: "document-tabs",
    clientRenderable: true,
    allowedCategories: ["pdf"],
    tabs: [
      Object.freeze({ id: "libri", label: "Libri", category: "pdf" }),
      Object.freeze({ id: "manuali-guide", label: "Manuali e Guide", category: "pdf" })
    ]
  }),
  Object.freeze({
    tagSlug: "radio",
    title: "Radio",
    description: "MP3 e contenuti audio per la sezione Radio.",
    status: "ACTIVE",
    visibility: "PUBLIC",
    sortOrder: 20,
    renderer: "audio-list",
    clientRenderable: true,
    allowedCategories: ["audio"],
    tabs: []
  }),
  Object.freeze({
    tagSlug: "immagini",
    title: "Immagini",
    description: "Immagini caricate su R2, per ora solo catalogo admin. Non alimenta WildWall.",
    status: "ACTIVE",
    visibility: "PRIVATE",
    sortOrder: 90,
    renderer: "none",
    clientRenderable: false,
    allowedCategories: ["image"],
    tabs: []
  })
]);

export const WILDU_MEDIA_CONFIG = Object.freeze({
  appName: "Wildu Media Suite",
  appVersion: "0.3.0",

  // URL pubblici non segreti.
  workerUrl: "https://wildu-upload-manager.baffiwild.workers.dev",
  cdnBaseUrl: "https://media.baffiwild.it/",

  // Solo i flussi reali decisi ora.
  // GPX fuori: resta nella mini-app Map Viewer/Mappa dei Tesori già pronta.
  // Attrezzatura/Amazon, WildWall e Giochi restano fuori da questo upload media.
  activeUploadKinds: ["pdf", "audio", "image"],

  kindLabels: Object.freeze({
    pdf: "PDF Biblioteca",
    audio: "MP3 Radio",
    image: "Immagine admin-only"
  }),

  pdfSubcategories: Object.freeze([
    Object.freeze({ id: "libri", label: "Libri" }),
    Object.freeze({ id: "manuali-guide", label: "Manuali e Guide" })
  ]),

  // Regole di indirizzamento: evitano upload nel tag sbagliato.
  tagRules: Object.freeze({
    biblioteca: Object.freeze({
      allowedKinds: ["pdf"],
      requiredSubcategory: true,
      allowedSubcategories: ["libri", "manuali-guide"],
      clientRenderable: true
    }),
    radio: Object.freeze({
      allowedKinds: ["audio"],
      requiredSubcategory: false,
      allowedSubcategories: [],
      clientRenderable: true
    }),
    immagini: Object.freeze({
      allowedKinds: ["image"],
      requiredSubcategory: false,
      allowedSubcategories: [],
      clientRenderable: false
    })
  }),

  defaultVisibilityByKind: Object.freeze({
    pdf: "PUBLIC",
    audio: "PUBLIC",
    image: "PRIVATE"
  }),

  defaultTagByKind: Object.freeze({
    pdf: "biblioteca",
    audio: "radio",
    image: "immagini"
  }),

  defaultStatus: "ACTIVE",

  // Limiti lato frontend: il Worker deve comunque validarli lato server.
  maxSizeBytesByKind: Object.freeze({
    audio: 150 * 1024 * 1024,
    pdf: 120 * 1024 * 1024,
    image: 20 * 1024 * 1024
  }),

  allowedMimePrefixesByKind: Object.freeze({
    audio: ["audio/"],
    image: ["image/"],
    pdf: ["application/pdf"]
  }),

  runtimePublicVersionsDocId: "public_versions",
  runtimeGameVersionsDocId: "game_versions",
  runtimeModuleVersionsDocId: "module_versions",

  defaultGameVersions: Object.freeze([
    Object.freeze({
      title: "Sfida dei Sassi",
      url: "giochi/sfida-dei-sassi/index.html",
      rev: 1,
      enabled: true,
      moduleUrl: "modules/wildu-games.html",
      cacheScope: "giochi/sfida-dei-sassi/",
      extraUrls: [],
      clearNeedles: ["giochi/sfida-dei-sassi/"]
    }),
    Object.freeze({
      title: "Costruisci il Rifugio",
      url: "giochi/rifugio/index.html",
      rev: 1,
      enabled: true,
      moduleUrl: "modules/wildu-games.html",
      cacheScope: "giochi/rifugio/",
      extraUrls: [],
      clearNeedles: ["giochi/rifugio/"]
    })
  ]),

  defaultModuleVersions: Object.freeze([
    Object.freeze({
      title: "Radio Natura",
      url: "modules/media-radio.html",
      rev: 1,
      enabled: true,
      renderer: "module-html",
      cacheScope: "modules/media-radio.html",
      extraUrls: [],
      clearNeedles: ["modules/media-radio.html"]
    }),
    Object.freeze({
      title: "Biblioteca Wild-U",
      url: "modules/media-biblioteca.html",
      rev: 1,
      enabled: true,
      renderer: "module-html",
      cacheScope: "modules/media-biblioteca.html",
      extraUrls: [],
      clearNeedles: ["modules/media-biblioteca.html"]
    }),
    Object.freeze({
      title: "Modulo Giochi",
      url: "modules/wildu-games.html",
      rev: 1,
      enabled: true,
      renderer: "module-html",
      cacheScope: "modules/wildu-games.html",
      extraUrls: [],
      clearNeedles: ["modules/wildu-games.html"]
    })
  ]),

  // Header extra verso il Worker.
  // Lasciare vuoto: il Worker attuale accetta Authorization + Content-Type.
  // Header custom come X-WILDU-CHANNEL causano errore CORS preflight
  // se non sono presenti in Access-Control-Allow-Headers lato Worker.
  requestHeaders: Object.freeze({})
});

// Compatibilità con gli script classici caricati dal bootstrap.
window.firebaseConfig = firebaseConfig;
window.WILDU_MEDIA_COLLECTIONS = WILDU_MEDIA_COLLECTIONS;
window.WILDU_MEDIA_DEFAULT_TAGS = WILDU_MEDIA_DEFAULT_TAGS;
window.WILDU_MEDIA_CONFIG = Object.freeze({
  ...WILDU_MEDIA_CONFIG,
  firebaseConfig,
  collections: Object.freeze({
    tags: WILDU_MEDIA_COLLECTIONS.TAGS,
    catalog: WILDU_MEDIA_COLLECTIONS.CATALOG,
    runtime: WILDU_MEDIA_COLLECTIONS.RUNTIME
  }),
  defaultTags: WILDU_MEDIA_DEFAULT_TAGS
});
