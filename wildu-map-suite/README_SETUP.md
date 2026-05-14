# Wildu Map Suite — Admin + Viewer

Pacchetto iniziale per due mini-app separate:

1. `wildu-map-admin/`  
   Mini-app privata per creare/modificare aree territoriali, Wildu Waypoints e tracce GPX.

2. `wildu-map-viewer/`  
   App pubblica/embeddabile per navigazione su mappa, pensata per iframe dentro la app principale.

Nessun riferimento a collection eventi esistenti. Le collection nuove sono:

```text
wildu_map_areas
wildu_map_waypoints
wildu_map_tracks
wildu_map_roles
```

`wildu_map_roles` serve solo per autorizzare chi può scrivere dal pannello admin.

---

## 1. Configurazione Firebase

Apri:

```text
shared/firebase-config.js
```

Sostituisci i placeholder con la tua configurazione Firebase Web.

Non inserire mai service account, token privati, chiavi server o secret.

---

## 2. Modello dati

### `wildu_map_areas/{areaSlug}`

```js
{
  schemaVersion: 1,
  status: "ACTIVE",
  visibility: "PUBLIC",
  areaSlug: "monte-adone",
  title: "Monte Adone",
  subtitle: "Contrafforti pliocenici dell’Appennino bolognese",
  description: "Area escursionistica Wildu.",
  regione: "Emilia-Romagna",
  provincia: "Bologna",
  comune: "Monzuno",
  centerLat: 44.323,
  centerLng: 11.266,
  defaultZoom: 13,
  coverImageUrl: "https://...",
  sortOrder: 10,
  createdAt: serverTimestamp,
  updatedAt: serverTimestamp
}
```

### `wildu_map_waypoints/{autoId}`

```js
{
  schemaVersion: 1,
  status: "ACTIVE",
  visibility: "PUBLIC",
  areaSlug: "monte-adone",
  title: "Belvedere Monte Adone",
  description: "Punto consigliato da Wildu.",
  lat: 44.325123,
  lng: 11.245678,
  imageUrl: "https://...",
  imageAlt: "Vista dal Monte Adone",
  imageCredit: "Wildu / fonte autorizzata",
  iconType: "VIEWPOINT",
  sortOrder: 10,
  createdAt: serverTimestamp,
  updatedAt: serverTimestamp
}
```

### `wildu_map_tracks/{autoId}`

```js
{
  schemaVersion: 1,
  status: "ACTIVE",
  visibility: "PUBLIC",
  areaSlug: "monte-adone",
  title: "Anello Monte Adone",
  description: "Traccia GPX consigliata.",
  fileType: "GPX",
  fileUrl: "https://...",
  storagePath: "wildu-map-tracks/monte-adone/file.gpx",
  originalFileName: "file.gpx",
  sizeBytes: 123456,
  distanceKm: 8.4,
  elevationGainM: 520,
  difficulty: "E",
  sortOrder: 10,
  createdAt: serverTimestamp,
  updatedAt: serverTimestamp
}
```

---

## 3. Ruoli scrittura

Crea manualmente in Firestore:

```text
wildu_map_roles/{UID_UTENTE}
```

con:

```js
{
  canWriteMap: true,
  role: "ADMIN",
  email: "admin@example.com"
}
```

La mini-app admin fa login Google, ma la scrittura è protetta dalle regole.

---

## 4. Regole Firestore e Storage

Esempi in:

```text
firebase-rules/firestore.rules.example
firebase-rules/storage.rules.example
```

Per Storage, il pacchetto MVP usa scrittura autenticata. In produzione è meglio stringere con custom claims, gateway o regole avanzate collegate ai ruoli mappa.

---

## 5. Embed nella app principale

Esempio:

```html
<iframe
  src="https://TUO_DOMINIO/wildu-map-viewer/index.html?area=monte-adone"
  allow="geolocation"
  style="width:100%;height:100%;border:0;display:block;"
></iframe>
```

L’app viewer è già pensata per iframe: niente login obbligatorio, UI compatta, mobile-first, GPS con permesso browser.

---

## 6. Note importanti

- Le immagini dei Wildu Waypoints sono solo `imageUrl`: non vengono copiate, scaricate o ricodificate.
- Le tracce GPX possono essere caricate in Storage dalla mini-app admin.
- I clienti possono caricare un GPX personale nel viewer: resta locale nel browser e non viene inviato al server.
- La base map escursionistica è configurabile da `shared/firebase-config.js`.
- Per produzione, scegli un provider tile con policy chiara e sostenibile.
