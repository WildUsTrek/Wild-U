# Wildu Media Suite

App sorella admin per gestire media su Cloudflare R2 e metadati su Firestore.

## Scopo reale

Questa suite gestisce solo:

- **Biblioteca**: PDF divisi in due tab client, `Libri` e `Manuali e Guide`.
- **Radio**: MP3/audio.
- **Immagini**: upload R2 e catalogo admin-only, per ora non renderizzate nella client app.

Restano fuori da questo lavoro:

- Map Viewer / Mappa dei Tesori / GPX;
- Attrezzatura Amazon;
- WildWall immagini viaggi;
- Giochi.

## Percorso consigliato

Caricare la cartella scompattata dentro il repo GitHub Pages:

```text
Wild-U/wildu-media-suite/
```

URL atteso:

```text
https://wildustrek.github.io/Wild-U/wildu-media-suite/
```

## Collection Firestore

```text
wildu_media_tags
wildu_media_catalog
wildu_media_runtime/public_versions
```

## Tag ufficiali

Alla prima apertura, dopo login admin, premere:

```text
Crea/aggiorna tag ufficiali
```

Crea/aggiorna senza azzerare le versioni:

```text
biblioteca
radio
immagini
```

## Versioning

- `version`: cambia a ogni modifica media collegata al tag.
- `publicVersion`: cambia solo quando cambia un media pubblico di un tag renderizzabile dalla client app.
- `wildu_media_runtime/public_versions`: manifesto leggero usato dalla client app per confrontare le versioni prima di leggere il catalogo.

Le immagini hanno `clientRenderable:false`, quindi non aggiornano `publicVersion` e non forzano refresh client.

## Upload ammessi

```text
pdf   -> biblioteca -> subcategory libri | manuali_guide
audio -> radio
image -> immagini -> visibility PRIVATE
```

GPX non è ammesso in questa suite.

## Sicurezza

Il frontend contiene solo config Firebase pubblica, endpoint Worker pubblico e CDN pubblico. Non inserire mai segreti Cloudflare/R2, service account, private key o token statici.
