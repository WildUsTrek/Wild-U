// shared/firebase-config.js
// Sostituisci solo i valori del tuo progetto Firebase.
// La firebaseConfig web NON è un segreto, ma non inserire qui token privati, service account o chiavi server.

export const firebaseConfig = {
  apiKey: "INSERISCI_FIREBASE_WEB_API_KEY",
  authDomain: "TUO_PROGETTO.firebaseapp.com",
  projectId: "TUO_PROGETTO",
  storageBucket: "TUO_PROGETTO.appspot.com",
  messagingSenderId: "INSERISCI_MESSAGING_SENDER_ID",
  appId: "INSERISCI_APP_ID"
};

export const WILDU_MAP_COLLECTIONS = Object.freeze({
  AREAS: "wildu_map_areas",
  WAYPOINTS: "wildu_map_waypoints",
  TRACKS: "wildu_map_tracks",
  ROLES: "wildu_map_roles"
});

export const WILDU_MAP_CONFIG = Object.freeze({
  appName: "Wildu Map",
  defaultCenter: [42.5, 12.5],
  defaultZoom: 6,

  // Provider escursionistico configurabile.
  // Per produzione valuta un provider con policy chiara / chiave personale.
  tileUrl: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  tileAttribution: "Map data © OpenStreetMap contributors, SRTM | Style © OpenTopoMap (CC-BY-SA)",
  tileMaxZoom: 17,

  storageTrackRoot: "wildu-map-tracks"
});
