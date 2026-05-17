# Deploy notes — GitHub Pages

Percorso richiesto:

```text
Wild-U/wildu-media-suite/
```

URL previsto:

```text
https://wildustrek.github.io/Wild-U/wildu-media-suite/
```

## Passi

1. Scarica lo ZIP generato.
2. Estrai la cartella `wildu-media-suite`.
3. Copiala nella root del repo `Wild-U`.
4. Verifica `wildu-media-suite/shared/firebase-config.js` con la Firebase frontend config pubblica già impostata.
5. Commit e push.
6. Apri l'URL GitHub Pages.

## Attenzione SW

Se `Wild-U` ha un service worker con scope ampio, questa pagina può finire sotto quel controllo.

Non è un problema per la shell, ma bisogna evitare che audio/pdf/book grandi vengano cacheati automaticamente.

Prima verifica Network/Application nel browser. Se serve, si farà una patch minima nello `sw.js` madre per bypassare `media.baffiwild.it` o tipi file grandi.
