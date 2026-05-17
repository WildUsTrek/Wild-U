# Wildu Media Suite

Scheletro iniziale della app sorella media Wildu, pensata per essere caricata come sottocartella del repository GitHub Pages:

```text
Wild-U/wildu-media-suite/
```

URL previsto dopo deploy:

```text
https://wildustrek.github.io/Wild-U/wildu-media-suite/
```

## Cosa fa

- Login admin con Firebase Auth.
- Gestione tag/moduli dinamici in Firestore.
- Upload media su Cloudflare R2 tramite Worker presigned PUT.
- Salvataggio metadati in Firestore.
- Versioning dei tag per permettere alla futura app client di capire quando aggiornare la propria cache.
- Catalogo admin con filtri, preview, archive e delete fisico R2.

## Cosa NON fa

- Non gestisce upload GPX: quello resta nella mini-app mappa già esistente.
- Non salva file grandi su Firestore.
- Non passa file grandi da Cloud Run o Apps Script.
- Non contiene segreti Cloudflare/R2.
- Non gestisce la cache della app client: aggiorna solo `version` e `publicVersion` dei tag.

## File da configurare

Apri:

```text
js/config.js
```

Compila solo la config Firebase frontend:

```js
firebaseConfig: {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...'
}
```

Non inserire secret key, access key, bearer statici, account ID Cloudflare o service account.

## Collection Firestore

```text
wildu_media_tags
wildu_media_catalog
```

### wildu_media_tags

Documento esempio:

```js
{
  tagSlug: "radio",
  title: "Radio",
  description: "Contenuti audio",
  status: "ACTIVE",
  visibility: "PUBLIC",
  sortOrder: 10,
  version: 3,
  publicVersion: 2,
  createdAt,
  updatedAt,
  lastContentChangeAt
}
```

`version` cambia quando cambia qualunque contenuto collegato al tag.

`publicVersion` cambia solo quando cambia qualcosa che la app client pubblica deve vedere.

### wildu_media_catalog

Documento esempio:

```js
{
  schemaVersion: 1,
  title: "Podcast Monte Adone",
  description: "...",
  category: "audio",
  kind: "audio",
  tagSlug: "radio",
  tagSlugs: ["radio"],
  tags: ["radio", "appennino"],
  status: "ACTIVE",
  visibility: "PUBLIC",
  fileUrl: "https://media.baffiwild.it/audio/radio/...",
  objectKey: "audio/radio/...mp3",
  storageProvider: "cloudflare_r2",
  uploadMode: "worker_presigned_put",
  originalFileName: "podcast.mp3",
  contentType: "audio/mpeg",
  sizeBytes: 123456,
  sortOrder: 10,
  createdAt,
  updatedAt
}
```

## Worker

Endpoint pubblico già impostato:

```text
https://wildu-upload-manager.baffiwild.workers.dev
```

La app invia Firebase ID token admin in header:

```text
Authorization: Bearer <Firebase ID token>
X-WILDU-CHANNEL: MEDIA_SUITE_ADMIN
```

Payload upload previsto:

```js
{
  action: "create-upload-url",
  kind: "audio",
  moduleSlug: "radio",
  tagSlug: "radio",
  fileName: "podcast.mp3",
  contentType: "audio/mpeg",
  sizeBytes: 123456
}
```

Risposta attesa:

```js
{
  ok: true,
  uploadUrl: "...",
  publicUrl: "https://media.baffiwild.it/...",
  objectKey: "audio/radio/...mp3"
}
```

Se il Worker usa un nome azione diverso, cambia solo `action` in:

```text
js/r2-worker-service.js
```

## Deploy

1. Copia la cartella `wildu-media-suite` dentro il repo `Wild-U`.
2. Compila `js/config.js`.
3. Carica su GitHub.
4. Apri:

```text
https://wildustrek.github.io/Wild-U/wildu-media-suite/
```

## Nota Service Worker

Se la cartella è sotto lo scope della app madre, il Service Worker esistente potrebbe intercettare asset e file. Questo scheletro non modifica il SW.

Regola: non cacheare automaticamente file grandi R2 nel SW. Se serve, fare una micro-patch mirata dopo aver letto lo `sw.js` reale.
