// shared/firebase-config.js
// Config pubblica Firebase Web SDK per la mini-suite Mappa Wildu.
// Non inserire qui service account, private key, token server o segreti backend.

export const firebaseConfig = {
  apiKey: "AIzaSyDIPgFA_caKIMHFgEa-enO4Jk0d7eTCFLI",
  authDomain: "wild-u-server.firebaseapp.com",
  projectId: "wild-u-server",
  storageBucket: "wild-u-server.firebasestorage.app",
  messagingSenderId: "959006418837",
  appId: "1:959006418837:web:affce9510301b946e7389c",
  measurementId: "G-KC1R6VSMF5"
};

export const WILDU_MAP_COLLECTIONS = Object.freeze({
  AREAS: "wildu_map_areas",
  WAYPOINTS: "wildu_map_waypoints",
  TRACKS: "wildu_map_tracks",
  ROLES: "wildu_map_roles",
  SETTINGS: "wildu_map_settings"
});

export const WILDU_MAP_CONFIG = Object.freeze({
  appName: "Wildu Map",

  defaultCenter: [42.5, 12.5],
  defaultZoom: 6,

  // Fallback viewer: base topografica.
  // Più avanti lo renderemo configurabile da wildu_map_settings/viewer_public_config.
  tileUrl: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  tileAttribution: "Map data © OpenStreetMap contributors, SRTM | Style © OpenTopoMap (CC-BY-SA)",
  tileMaxZoom: 17,

  // I file pesanti non vanno su Firebase Storage:
  // GPX, immagini, audio e PDF verranno serviti da Cloudflare R2/CDN.
  // Firestore salverà solo metadati + URL pubblici.
  mediaBaseUrl: "https://media.wildu.it",

  // Compatibilità temporanea col codice attuale.
  // Verrà neutralizzata nello step GPX/R2.
  storageTrackRoot: "wildu-map-tracks"
});
