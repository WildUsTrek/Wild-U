# Checklist test manuale

## 1. Boot

- Apri `/Wild-U/wildu-media-suite/`.
- Se Firebase config è placeholder, deve comparire avviso chiaro.
- Con `shared/firebase-config.js` già compilato, la pagina deve mostrare login Google.

## 2. Login

- Clicca Login Google.
- Verifica email/UID nel box auth.
- Verifica tab Debug.

## 3. Tag

- Crea tag `Radio` con slug `radio`.
- Verifica documento in `wildu_media_tags/radio`.
- Verifica `version` e `publicVersion` presenti, anche a zero.
- Crea tag `Biblioteca` con slug `biblioteca`.

## 4. Upload pubblico

- Carica un file audio con tag `radio`, status `ACTIVE`, visibility `PUBLIC`.
- Verifica PUT R2 riuscito.
- Verifica nuovo documento in `wildu_media_catalog`.
- Verifica `wildu_media_tags/radio.version +1`.
- Verifica `wildu_media_tags/radio.publicVersion +1`.

## 5. Upload privato/nascosto

- Carica un PDF con tag `biblioteca`, status `HIDDEN` o visibility `PRIVATE`.
- Verifica `biblioteca.version +1`.
- Verifica `biblioteca.publicVersion` invariata.

## 6. Catalogo

- Filtra per tag.
- Filtra per categoria.
- Apri preview audio/image/pdf.

## 7. Archive

- Archivia un media pubblico.
- Verifica che `publicVersion` del tag aumenti.
- Verifica che il media non sia più `ACTIVE`.

## 8. Delete + R2

- Usa solo su file test.
- Conferma eliminazione.
- Verifica documento Firestore rimosso.
- Verifica chiamata Worker `delete-object`.
- Se R2 fallisce, il file può restare orfano ma non deve più essere visibile dal catalogo client.

## 9. GPX

- Verifica che non esista categoria GPX in upload.
- Verifica che il codice blocchi `kind === 'gpx'`.
