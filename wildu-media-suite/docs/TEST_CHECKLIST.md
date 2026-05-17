# Test checklist — Wildu Media Suite

## STEP 1/5 — Base admin e tag

- [ ] Apri `/Wild-U/wildu-media-suite/?refresh=1`.
- [ ] Verifica che la pagina carichi senza errori JS.
- [ ] Esegui login Google admin.
- [ ] Premi `Crea/aggiorna tag ufficiali`.
- [ ] Verifica tre tag:
  - `biblioteca`, PUBLIC, clientRenderable true, allowedCategories `pdf`;
  - `radio`, PUBLIC, clientRenderable true, allowedCategories `audio`;
  - `immagini`, PRIVATE, clientRenderable false, allowedCategories `image`.
- [ ] Verifica documento `wildu_media_runtime/public_versions`.

## STEP 2/5 — Upload

### PDF Biblioteca

- [ ] Tipo upload: PDF Biblioteca.
- [ ] Tag auto-selezionato: biblioteca.
- [ ] Sottocategoria obbligatoria: Libri oppure Manuali e Guide.
- [ ] Upload completato.
- [ ] Documento creato in `wildu_media_catalog`.
- [ ] `biblioteca.version` incrementata.
- [ ] `biblioteca.publicVersion` incrementata se ACTIVE/PUBLIC.
- [ ] `public_versions.tags.biblioteca` aggiornato.

### MP3 Radio

- [ ] Tipo upload: MP3 Radio.
- [ ] Tag auto-selezionato: radio.
- [ ] Nessuna sottocategoria richiesta.
- [ ] `radio.version` incrementata.
- [ ] `radio.publicVersion` incrementata se ACTIVE/PUBLIC.

### Immagini admin-only

- [ ] Tipo upload: Immagine admin-only.
- [ ] Tag auto-selezionato: immagini.
- [ ] Visibility predefinita: PRIVATE.
- [ ] Upload immagine PRIVATE riuscito.
- [ ] `immagini.version` incrementata.
- [ ] `immagini.publicVersion` non deve obbligare refresh client.
- [ ] Provare PUBLIC deve essere bloccato.

## Esclusioni

- [ ] Non esiste tipo upload GPX.
- [ ] Non esistono tag Tesori/Mappe/Attrezzatura/Giochi come flussi media.
- [ ] WildWall non viene toccato.
