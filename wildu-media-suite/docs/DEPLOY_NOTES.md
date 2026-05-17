# Deploy notes — Wildu Media Suite

## 1. Caricamento su GitHub

Caricare la cartella scompattata come:

```text
Wild-U/wildu-media-suite/
```

Non creare doppia cartella:

```text
wildu-media-suite/wildu-media-suite/index.html
```

## 2. Prima apertura

Aprire:

```text
https://wildustrek.github.io/Wild-U/wildu-media-suite/?refresh=1
```

Poi:

1. Login Google admin.
2. Premere `Crea/aggiorna tag ufficiali`.
3. Premere `Sincronizza manifesto public_versions` se serve.

## 3. Service Worker app madre

Questa app vive sotto lo scope di `/Wild-U/`, quindi può essere intercettata dal Service Worker esistente.

Per lo STEP 5/5 dovremo fare una micro-patch SW per bypassare i file grandi R2/CDN, evitando che MP3/PDF/immagini finiscano nella `ASSET_CACHE`.

Regola futura probabile:

```js
if (url.hostname === "media.baffiwild.it" || url.hostname === "media.wildu.it") {
  return;
}
```

## 4. Cosa non fa questa suite

- Non carica GPX.
- Non gestisce Map Viewer / Mappa dei Tesori.
- Non gestisce Attrezzatura Amazon.
- Non alimenta WildWall.
- Non gestisce Giochi.
