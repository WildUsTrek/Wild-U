/* global firebase, WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};
  
  var state = {
    currentUser: null,
    tags: [],
    media: [],
    runtimeManifest: null,
    gameRuntime: null,
    moduleRuntime: null,

    // Letture legacy/partner solo per popolare campi admin compatibili.
    // Non diventano fonte di verità dei nuovi moduli.
    partnerClientConfig: null,
    legacyModuleResources: null,
    moduleGradeOptions: [],

    selectedTab: 'dashboard'
  };

  function renderConfigWarning() {
    var missing = root.firebaseConfigMissing || [];
    if (!missing.length) return '';
    return '<div class="alert error"><strong>Config Firebase incompleta.</strong><br>' +
      'Controlla <code>shared/firebase-config.js</code>: ' + root.escapeHtml(missing.join(', ')) + '</div>';
  }

  function setAuthUi(user) {
    state.currentUser = user || null;
    var logged = !!user;
    root.$('#auth-status').innerHTML = logged
      ? '<span class="badge good">LOGGATO</span> ' + root.escapeHtml(user.email || user.uid)
      : '<span class="badge warn">NON LOGGATO</span>';
    root.$('#btn-login').style.display = logged ? 'none' : '';
    root.$('#btn-logout').style.display = logged ? '' : 'none';
    root.$all('[data-requires-auth]').forEach(function (el) { el.disabled = !logged; });
  }

  async function login() {
    if (!root.auth) throw new Error('Firebase non inizializzato.');
    var provider = new firebase.auth.GoogleAuthProvider();
    await root.auth.signInWithPopup(provider);
  }

  async function logout() {
    await root.auth.signOut();
  }

  function switchTab(tabName) {
    state.selectedTab = tabName;
    root.$all('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    root.$all('.tab-panel').forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    });
  }


  function openInstructions() {
    var activeTab = state.selectedTab || 'dashboard';

    function esc(value) {
      return root.escapeHtml ? root.escapeHtml(value) : String(value == null ? '' : value);
    }

    function code(value) {
      return '<code style="color:#f6d889; background:rgba(0,0,0,.22); padding:2px 6px; border-radius:7px;">' + esc(value) + '</code>';
    }

    function badge(value, tone) {
      var bg = tone === 'good'
        ? 'rgba(107,213,138,.14)'
        : tone === 'warn'
          ? 'rgba(228,182,83,.16)'
          : tone === 'danger'
            ? 'rgba(238,106,106,.14)'
            : 'rgba(255,255,255,.08)';

      var color = tone === 'good'
        ? '#bff7cd'
        : tone === 'warn'
          ? '#ffe7a5'
          : tone === 'danger'
            ? '#ffc5c5'
            : '#f3f8f4';

      return '<span style="display:inline-flex; align-items:center; border-radius:999px; padding:4px 9px; background:' + bg + '; color:' + color + '; font-size:12px; font-weight:900;">' + esc(value) + '</span>';
    }

    function list(items) {
      return '<ul style="margin:8px 0 0; padding-left:20px;">' + (items || []).map(function (item) {
        return '<li style="margin:7px 0;">' + item + '</li>';
      }).join('') + '</ul>';
    }

    function ordered(items) {
      return '<ol style="margin:8px 0 0; padding-left:22px;">' + (items || []).map(function (item) {
        return '<li style="margin:7px 0;">' + item + '</li>';
      }).join('') + '</ol>';
    }

    function details(title, body, open) {
      return '' +
        '<details ' + (open ? 'open' : '') + ' style="' +
          'border:1px solid rgba(255,255,255,.12);' +
          'border-radius:16px;' +
          'padding:13px 15px;' +
          'background:rgba(255,255,255,.045);' +
          'margin:12px 0;' +
        '">' +
          '<summary style="cursor:pointer; font-weight:950; color:#f6d889; font-size:15px;">' + esc(title) + '</summary>' +
          '<div style="margin-top:11px; color:#dfe9df; line-height:1.58; font-size:14px;">' + body + '</div>' +
        '</details>';
    }

    function actionTable(rows) {
      return '' +
        '<div style="overflow:auto; border:1px solid rgba(255,255,255,.12); border-radius:16px; margin-top:10px;">' +
          '<table style="width:100%; border-collapse:collapse; min-width:760px; font-size:13px;">' +
            '<thead>' +
              '<tr style="background:rgba(214,178,94,.10); color:#f6d889; text-transform:uppercase; letter-spacing:.04em;">' +
                '<th style="text-align:left; padding:10px;">Azione admin</th>' +
                '<th style="text-align:left; padding:10px;">Firestore toccato</th>' +
                '<th style="text-align:left; padding:10px;">Cache/versione</th>' +
                '<th style="text-align:left; padding:10px;">Effetto client</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              (rows || []).map(function (row) {
                return '<tr style="border-top:1px solid rgba(255,255,255,.10);">' +
                  '<td style="padding:10px; vertical-align:top;">' + row.action + '</td>' +
                  '<td style="padding:10px; vertical-align:top;">' + row.firestore + '</td>' +
                  '<td style="padding:10px; vertical-align:top;">' + row.cache + '</td>' +
                  '<td style="padding:10px; vertical-align:top;">' + row.client + '</td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>';
    }

    function dependencyMap(rows) {
      return '' +
        '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:10px; margin-top:10px;">' +
          (rows || []).map(function (row) {
            return '' +
              '<div style="border:1px solid rgba(255,255,255,.12); border-radius:15px; padding:12px; background:rgba(0,0,0,.16);">' +
                '<div style="font-weight:950; color:#f6d889; margin-bottom:6px;">' + row.name + '</div>' +
                '<div style="color:#dfe9df; font-size:13px; line-height:1.48;">' + row.role + '</div>' +
                (row.fields ? '<div style="margin-top:8px; color:#aebcaf; font-size:12px; line-height:1.45;">Campi: ' + row.fields + '</div>' : '') +
              '</div>';
          }).join('') +
        '</div>';
    }

    function summaryCards(data) {
      return '' +
        '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:12px; margin:16px 0;">' +
          '<div style="border:1px solid rgba(107,213,138,.22); background:rgba(107,213,138,.08); border-radius:18px; padding:14px;">' +
            '<div style="font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.06em; color:#bff7cd;">Scopo</div>' +
            '<div style="margin-top:7px; font-size:14px; line-height:1.45;">' + data.purpose + '</div>' +
          '</div>' +
          '<div style="border:1px solid rgba(214,178,94,.26); background:rgba(214,178,94,.08); border-radius:18px; padding:14px;">' +
            '<div style="font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.06em; color:#f6d889;">Decisione rapida</div>' +
            '<div style="margin-top:7px; font-size:14px; line-height:1.45;">' + data.fastDecision + '</div>' +
          '</div>' +
          '<div style="border:1px solid rgba(120,190,255,.22); background:rgba(120,190,255,.07); border-radius:18px; padding:14px;">' +
            '<div style="font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.06em; color:#9ed6ff;">Effetto client</div>' +
            '<div style="margin-top:7px; font-size:14px; line-height:1.45;">' + data.clientImpact + '</div>' +
          '</div>' +
          '<div style="border:1px solid rgba(238,106,106,.20); background:rgba(238,106,106,.07); border-radius:18px; padding:14px;">' +
            '<div style="font-size:12px; font-weight:950; text-transform:uppercase; letter-spacing:.06em; color:#ffc5c5;">Non fare</div>' +
            '<div style="margin-top:7px; font-size:14px; line-height:1.45;">' + data.doNot + '</div>' +
          '</div>' +
        '</div>';
    }

    var docs = {
      dashboard: {
        icon: '🧭',
        title: 'Dashboard',
        subtitle: 'Cabina di controllo generale della Media Suite.',
        purpose: 'Verificare lo stato base della suite, creare i tag ufficiali e sincronizzare il manifesto pubblico.',
        fastDecision: 'Usala al primo avvio o dopo una patch. Non usarla per gestire singoli file, giochi o moduli.',
        clientImpact: 'Aggiorna solo il manifesto ' + code('public_versions') + ' usato da Radio/Biblioteca.',
        doNot: 'Non confondere tag media con moduli client o giochi. Qui non si caricano file.',
        questions: [
          '<strong>Prima apertura: cosa faccio?</strong> Login → Crea/aggiorna tag ufficiali → Sincronizza manifesto public_versions.',
          '<strong>Se Radio o Biblioteca non aggiornano?</strong> Controlla qui se ' + code('public_versions') + ' contiene ' + code('radio') + ' e ' + code('biblioteca') + '.',
          '<strong>Se vedo dati vecchi?</strong> Verifica la versione caricata dagli script e usa refresh/nocache solo per test.'
        ],
        steps: [
          'Accedi con Google admin.',
          'Premi “Crea/aggiorna tag ufficiali” solo quando vuoi garantire la presenza di biblioteca, radio e immagini.',
          'Premi “Sincronizza manifesto public_versions” per rigenerare il manifesto leggero letto dal client.',
          'Vai in Debug se vuoi controllare JSON e dipendenze reali.'
        ],
        actions: [
          {
            action: 'Crea/aggiorna tag ufficiali',
            firestore: code('wildu_media_tags/biblioteca') + ', ' + code('radio') + ', ' + code('immagini'),
            cache: 'Preserva versioni esistenti; non azzera publicVersion.',
            client: 'Prepara Radio/Biblioteca/Immagini, ma non forza da solo il download dei cataloghi.'
          },
          {
            action: 'Sincronizza public_versions',
            firestore: code('wildu_media_runtime/public_versions'),
            cache: 'Aggiorna il semaforo pubblico dei tag renderizzabili.',
            client: 'Il client confronta queste versioni con la cache locale.'
          }
        ],
        deps: [
          { name: 'wildu_media_tags', role: 'Fonte dei tag tecnici media.', fields: 'tagSlug, renderer, allowedCategories, version, publicVersion' },
          { name: 'wildu_media_runtime/public_versions', role: 'Manifesto leggero letto dal client.', fields: 'tags.radio, tags.biblioteca, meta' },
          { name: 'wildu_media_catalog', role: 'Catalogo dei file caricati.', fields: 'kind, tagSlug, status, visibility, mediaVersion' }
        ],
        risks: [
          'Non creare tag “gpx”, “giochi”, “amazon” o “wildwall” nella Media Suite.',
          'Non usare Dashboard per versionare moduli o giochi: esistono tab dedicate.'
        ]
      },

      tags: {
        icon: '🏷️',
        title: 'Tag',
        subtitle: 'Gestione dei canali logici dei media.',
        purpose: 'Definire come i media vengono raggruppati e renderizzati: Biblioteca, Radio, Immagini.',
        fastDecision: 'Modifica i tag solo se devi cambiare regole di rendering, categorie ammesse o visibilità del canale.',
        clientImpact: 'Solo tag con ' + code('clientRenderable:true') + ' e ' + code('visibility:PUBLIC') + ' entrano in public_versions.',
        doNot: 'Non usare i tag come sostituti dei moduli client o delle versioni gioco.',
        questions: [
          '<strong>Devo creare nuovi tag?</strong> Quasi mai. I tag ufficiali bastano: biblioteca, radio, immagini.',
          '<strong>Quando cambia publicVersion?</strong> Quando cambia un contenuto pubblico/renderizzabile collegato al tag.',
          '<strong>Immagini aggiorna il client?</strong> No: immagini è admin-only e ' + code('clientRenderable:false') + '.'
        ],
        steps: [
          'Controlla che biblioteca accetti solo PDF.',
          'Controlla che radio accetti solo audio.',
          'Controlla che immagini sia privata e non renderizzabile dal client.',
          'Salva solo modifiche intenzionali a renderer/categorie/visibilità.'
        ],
        actions: [
          {
            action: 'Salva tag',
            firestore: code('wildu_media_tags/{tagSlug}'),
            cache: 'Preserva version/publicVersion con increment(0) dove previsto.',
            client: 'Cambia come il client può interpretare quel tag nei manifesti.'
          },
          {
            action: 'Disattiva tag',
            firestore: code('wildu_media_tags/{tagSlug}.status'),
            cache: 'Sincronizza public_versions.',
            client: 'Un tag disattivato non deve governare nuove viste pubbliche.'
          }
        ],
        deps: [
          { name: 'biblioteca', role: 'PDF pubblici in due tab.', fields: 'renderer=document-tabs, tabs=libri/manuali-guide' },
          { name: 'radio', role: 'Audio/MP3 pubblici.', fields: 'renderer=audio-list, allowedCategories=audio' },
          { name: 'immagini', role: 'Upload immagini admin-only.', fields: 'visibility=PRIVATE, clientRenderable=false' }
        ],
        risks: [
          'Se trasformi immagini in PUBLIC/renderizzabile potresti forzare refresh client non desiderati.',
          'Se sbagli allowedCategories, l’upload può finire in tag errato o essere bloccato.'
        ]
      },

      upload: {
        icon: '☁️',
        title: 'Upload',
        subtitle: 'Caricamento file su R2 e metadati su Firestore.',
        purpose: 'Caricare PDF, MP3/audio e immagini admin-only senza far passare file grandi dal backend applicativo.',
        fastDecision: 'Usa Upload per nuovi file. Usa Catalogo per versionare o gestire file già caricati.',
        clientImpact: 'PDF/MP3 pubblici aggiornano il semaforo del tag; immagini private no.',
        doNot: 'Non caricare GPX, giochi, moduli HTML, WildWall o materiale Amazon qui.',
        questions: [
          '<strong>Voglio caricare un MP3 Radio.</strong> Tipo audio → tag radio → status ACTIVE → visibility PUBLIC.',
          '<strong>Voglio caricare un PDF Biblioteca.</strong> Tipo PDF → tag biblioteca → scegli Libri oppure Manuali e Guide.',
          '<strong>Voglio caricare immagine.</strong> Tipo image → tag immagini → visibility PRIVATE.'
        ],
        steps: [
          'Scegli file e tipo upload.',
          'Verifica che il tag principale venga selezionato correttamente.',
          'Per PDF scegli obbligatoriamente la sottocategoria.',
          'Compila titolo, descrizione e sortOrder.',
          'Avvia upload: il Worker genera URL firmato, il browser carica su R2, poi Firestore salva metadati.'
        ],
        actions: [
          {
            action: 'Carica PDF pubblico',
            firestore: code('wildu_media_catalog') + ' + ' + code('wildu_media_tags/biblioteca') + ' + ' + code('public_versions'),
            cache: 'Incrementa biblioteca.version e biblioteca.publicVersion.',
            client: 'Biblioteca vedrà versione diversa e rileggerà il catalogo del tag.'
          },
          {
            action: 'Carica MP3 pubblico',
            firestore: code('wildu_media_catalog') + ' + ' + code('wildu_media_tags/radio') + ' + ' + code('public_versions'),
            cache: 'Incrementa radio.version e radio.publicVersion.',
            client: 'Radio vedrà versione diversa e rileggerà il catalogo del tag.'
          },
          {
            action: 'Carica immagine privata',
            firestore: code('wildu_media_catalog') + ' + ' + code('wildu_media_tags/immagini'),
            cache: 'Incrementa eventualmente version interna, non deve forzare publicVersion client.',
            client: 'Nessun impatto su WildWall o viste pubbliche.'
          }
        ],
        deps: [
          { name: 'Cloudflare R2', role: 'Conserva file grandi.', fields: 'objectKey, publicUrl' },
          { name: 'Worker upload manager', role: 'Firma upload e valida richiesta admin.', fields: 'Authorization Firebase ID token' },
          { name: 'wildu_media_catalog', role: 'Metadati del media.', fields: 'fileUrl, objectKey, kind, tagSlug, status, visibility' },
          { name: 'TagService', role: 'Aggiorna versioni tag dopo creazione media.', fields: 'version, publicVersion, public_versions' }
        ],
        risks: [
          'Un file pubblico errato aggiorna il client: controlla tag/status/visibility prima dell’upload.',
          'Non usare questa suite per file sorgente giochi o moduli HTML.'
        ]
      },

      catalog: {
        icon: '🗂️',
        title: 'Catalogo',
        subtitle: 'Gestione e versioning dei media già caricati.',
        purpose: 'Ispezionare, filtrare, versionare, archiviare e controllare i media esistenti.',
        fastDecision: 'Se cambi o vuoi ripubblicare un file audio/PDF, usa “+1 versione”.',
        clientImpact: 'Versionare audio/PDF pubblici deve aggiornare sempre la cache client del relativo tag.',
        doNot: 'Non confondere mediaVersion con rev gioco/modulo: sono livelli diversi.',
        questions: [
          '<strong>+1 versione su MP3 Radio cosa fa?</strong> Aggiorna mediaVersion e publicVersion radio.',
          '<strong>+1 versione su PDF Biblioteca cosa fa?</strong> Aggiorna mediaVersion e publicVersion biblioteca.',
          '<strong>+1 versione su immagine privata?</strong> Aggiorna il media, ma non deve forzare la client app pubblica.'
        ],
        steps: [
          'Filtra per tag/kind/status/visibility.',
          'Controlla il media e la versione attuale.',
          'Premi +1 versione quando vuoi dichiarare che il contenuto è cambiato o va riletto dal client.',
          'Verifica Debug: tag.version/publicVersion e public_versions devono essere coerenti.'
        ],
        actions: [
          {
            action: '+1 versione su PDF pubblico',
            firestore: code('wildu_media_catalog/{mediaId}.mediaVersion') + ' + ' + code('wildu_media_tags/biblioteca.publicVersion'),
            cache: 'Aggiorna public_versions.tags.biblioteca.',
            client: 'Biblioteca invalida cache locale e rilegge solo il catalogo biblioteca.'
          },
          {
            action: '+1 versione su MP3 pubblico',
            firestore: code('wildu_media_catalog/{mediaId}.mediaVersion') + ' + ' + code('wildu_media_tags/radio.publicVersion'),
            cache: 'Aggiorna public_versions.tags.radio.',
            client: 'Radio invalida cache locale e rilegge solo il catalogo radio.'
          },
          {
            action: 'Archivia/nascondi media pubblico',
            firestore: code('wildu_media_catalog/{mediaId}.status/visibility'),
            cache: 'Se prima o dopo era pubblico, aggiorna publicVersion del tag.',
            client: 'La lista pubblica viene ricalcolata.'
          }
        ],
        deps: [
          { name: 'mediaVersion', role: 'Versione del singolo file/media.', fields: 'mediaVersion, mediaVersionNote, mediaVersionUpdatedAt' },
          { name: 'tag.publicVersion', role: 'Semaforo cache client per il tag.', fields: 'radio, biblioteca' },
          { name: 'public_versions', role: 'Manifesto letto dal client.', fields: 'tags, meta' }
        ],
        risks: [
          'Se un vecchio media non aveva mediaVersion, il primo +1 deve diventare v2 reale.',
          'Se publicVersion non cambia, il client può continuare a usare cache vecchia.'
        ]
      },

      games: {
        icon: '🎮',
        title: 'Giochi',
        subtitle: 'Versioning dei singoli giochi, separati dai moduli contenitori.',
        purpose: 'Governare la rev di ogni mini-app gioco senza caricare file e senza contaminare altri giochi.',
        fastDecision: 'Aumenta rev gioco solo quando cambia quel gioco specifico.',
        clientImpact: 'Il client deve aggiornare solo cacheScope/clearNeedles del gioco versionato.',
        doNot: 'Non usare game_versions per versionare il modulo launcher giochi.',
        questions: [
          '<strong>Ho modificato Sfida dei Sassi.</strong> Aumenta rev solo di giochi/sfida-dei-sassi/index.html.',
          '<strong>Ho aggiunto un nuovo gioco al menu.</strong> Aumenta anche il modulo contenitore in tab Moduli.',
          '<strong>Qui devo caricare il codice del gioco?</strong> No, qui salvi solo URL e versione.'
        ],
        steps: [
          'Crea preset giochi noti se il documento è vuoto.',
          'Controlla URL, titolo, rev, moduleUrl, cacheScope e clearNeedles.',
          'Usa +1 quando cambia codice/CSS/asset di quel gioco.',
          'Verifica Debug: la mappa corretta è gameRuntime.games.'
        ],
        actions: [
          {
            action: '+1 su Sfida dei Sassi',
            firestore: code('wildu_media_runtime/game_versions.games["giochi/sfida-dei-sassi/index.html"].rev'),
            cache: 'Il client pulirà/aggiornerà cache correlata al cacheScope del gioco.',
            client: 'Solo quel gioco viene aggiornato. Rifugio e modulo giochi restano invariati.'
          },
          {
            action: 'Salva nuovo gioco',
            firestore: code('wildu_media_runtime/game_versions.games["giochi/..."].*'),
            cache: 'Registra rev e area cache del nuovo gioco.',
            client: 'Il gioco sarà versionabile quando il client lo referenzia.'
          }
        ],
        deps: [
          { name: 'game_versions', role: 'Fonte runtime per singoli giochi.', fields: 'games[url].rev, moduleUrl, cacheScope, clearNeedles' },
          { name: 'moduleUrl', role: 'Indica il launcher/contenitore del gioco.', fields: 'modules/wildu-games.html' },
          { name: 'cacheScope', role: 'Ambito cache da invalidare quando cambia rev.', fields: 'giochi/nome-gioco/' }
        ],
        risks: [
          'Non confondere gioco specifico con modulo contenitore.',
          'Vecchi campi piatti tipo games.giochi/... sono fantasma: comanda la mappa games.'
        ]
      },

      modules: {
        icon: '🧩',
        title: 'Moduli',
        subtitle: 'Sorgente moderna dei moduli client e dei gradi richiesti.',
        purpose: 'Gestire moduli client, rev contenitore e campi client-facing, incluso Grado_Minimo.',
        fastDecision: 'Usa questa tab per decidere chi può aprire un modulo e quando il modulo contenitore deve aggiornarsi.',
        clientImpact: 'Nel nuovo client 2/5 la sorgente sarà module_versions, non moduli_risorse legacy.',
        doNot: 'Non fare migrazione/merge. La vecchia raccolta serve solo lettura/diagnosi gradi.',
        questions: [
          '<strong>Dove scelgo il grado richiesto?</strong> Nel menu Grado richiesto, popolato da Firestore.',
          '<strong>Da dove arrivano i gradi?</strong> Da client_config e dai valori reali già presenti nei moduli legacy.',
          '<strong>Quando aumento rev modulo?</strong> Quando cambia HTML/layout/wrapper/logica del modulo contenitore.'
        ],
        steps: [
          'Ricarica gradi da Firestore se il menu è vuoto.',
          'Compila Titolo, URL, rev, enabled, renderer.',
          'Scegli Grado_Minimo dal menu, senza inventare valori.',
          'Compila Categoria, Audio, Regione, Link_Risorsa e link_interni se il client dovrà usarli.',
          'Salva il modulo: il nuovo client leggerà questa sorgente.'
        ],
        actions: [
          {
            action: 'Salva modulo con grado',
            firestore: code('wildu_media_runtime/module_versions.modules["modules/..."].Grado_Minimo'),
            cache: 'Aggiorna solo la sorgente runtime moduli.',
            client: 'Il nuovo client userà questo grado per decidere accesso al modulo.'
          },
          {
            action: '+1 versione modulo',
            firestore: code('wildu_media_runtime/module_versions.modules["modules/..."].rev'),
            cache: 'Il client aggiornerà il contenitore HTML del modulo.',
            client: 'Non aggiorna PDF/MP3, non aggiorna giochi specifici.'
          },
          {
            action: 'Ricarica gradi',
            firestore: code('PARAMETERS_PARTNER/client_config') + ' + ' + code('PARAMETERS_PARTNER/moduli_risorse'),
            cache: 'Solo lettura admin, nessuna scrittura.',
            client: 'Nessun effetto diretto; serve a popolare il menu gradi.'
          }
        ],
        deps: [
          { name: 'module_versions', role: 'Nuova fonte dei moduli client.', fields: 'modules[url].rev, Grado_Minimo, Link_Risorsa, module_rev, link_interni' },
          { name: 'PARAMETERS_PARTNER/client_config', role: 'Solo lettura per gradi/soglie reali.', fields: 'Soglia_*, grado_*' },
          { name: 'PARAMETERS_PARTNER/moduli_risorse', role: 'Legacy solo diagnosi/schema storico.', fields: 'items[].Grado_Minimo, Link_Risorsa, module_rev' }
        ],
        risks: [
          'Non scrivere nella vecchia moduli_risorse per i nuovi moduli.',
          'Non inventare gradi manualmente: il menu deve derivare da Firestore.',
          'Non usare module_versions per versionare il singolo gioco.'
        ]
      },

      debug: {
        icon: '🧪',
        title: 'Debug',
        subtitle: 'Ispezione tecnica dei manifesti e dello stato admin.',
        purpose: 'Verificare che Firestore, cache e UI siano coerenti prima di passare al client.',
        fastDecision: 'Usa Debug dopo ogni seed, bump, patch o comportamento sospetto.',
        clientImpact: 'Mostra se il client riceverà manifesti coerenti o cache/versioni contaminate.',
        doNot: 'Non ignorare campi fantasma o versioni incoerenti: annotali prima di andare avanti.',
        questions: [
          '<strong>public_versions è corretto?</strong> Deve contenere solo radio/biblioteca.',
          '<strong>game_versions è corretto?</strong> Deve contenere mappa games, non comandare moduli.',
          '<strong>module_versions è corretto?</strong> Deve contenere mappa modules e campi client-facing.'
        ],
        steps: [
          'Controlla appVersion e script caricati.',
          'Controlla runtimeManifest.tags.',
          'Controlla gameRuntime.games.',
          'Controlla moduleRuntime.modules.',
          'Controlla tags version/publicVersion.',
          'Se trovi campi fantasma, non usarli come fonte: pianifica cleanup.'
        ],
        actions: [
          {
            action: 'Ispezione public_versions',
            firestore: code('wildu_media_runtime/public_versions'),
            cache: 'Controlla semafori cache Radio/Biblioteca.',
            client: 'Determina se Radio/Biblioteca useranno cache o Firestore.'
          },
          {
            action: 'Ispezione game_versions',
            firestore: code('wildu_media_runtime/game_versions'),
            cache: 'Controlla rev/cacheScope dei giochi.',
            client: 'Determina refresh dei singoli giochi.'
          },
          {
            action: 'Ispezione module_versions',
            firestore: code('wildu_media_runtime/module_versions'),
            cache: 'Controlla rev/campi client-facing dei moduli.',
            client: 'Determina accesso e refresh dei moduli.'
          }
        ],
        deps: [
          { name: 'state.runtimeManifest', role: 'Debug del manifesto pubblico.', fields: 'tags, meta' },
          { name: 'state.gameRuntime.raw', role: 'Debug runtime giochi.', fields: 'games' },
          { name: 'state.moduleRuntime.raw', role: 'Debug runtime moduli.', fields: 'modules' },
          { name: 'state.moduleGradeOptions', role: 'Debug gradi caricati da Firestore.', fields: 'value, label, source' }
        ],
        risks: [
          'Script vecchi in cache possono farti credere che una patch non funzioni.',
          'Campi vecchi piatti possono comparire nel debug ma non devono diventare fonte.',
          'Debug positivo è prerequisito per Fase 2/5.'
        ]
      }
    };

    var data = docs[activeTab] || docs.dashboard;

    var existing = document.getElementById('wildu-instructions-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'wildu-instructions-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'background:rgba(0,0,0,.74)',
      'backdrop-filter:blur(10px)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:18px'
    ].join(';');

    overlay.innerHTML = '' +
      '<div role="dialog" aria-modal="true" aria-label="Istruzioni Media Suite" style="' +
        'width:min(1100px,96vw);' +
        'max-height:91vh;' +
        'overflow:auto;' +
        'background:#17211b;' +
        'color:#f3f8f4;' +
        'border:1px solid rgba(255,255,255,.16);' +
        'border-radius:24px;' +
        'box-shadow:0 28px 100px rgba(0,0,0,.62);' +
      '">' +
        '<div style="' +
          'position:sticky;' +
          'top:0;' +
          'z-index:2;' +
          'background:linear-gradient(180deg,#17211b 0%,#17211b 84%,rgba(23,33,27,.90) 100%);' +
          'padding:20px 22px;' +
          'border-bottom:1px solid rgba(255,255,255,.10);' +
          'display:flex;' +
          'gap:14px;' +
          'justify-content:space-between;' +
          'align-items:flex-start;' +
        '">' +
          '<div style="min-width:0;">' +
            '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
              '<span style="font-size:25px;">' + esc(data.icon) + '</span>' +
              badge('Tab attiva: ' + data.title, 'good') +
              badge('Guida operativa', 'warn') +
            '</div>' +
            '<h2 style="margin:8px 0 4px; font-size:30px; line-height:1.08; letter-spacing:-.03em;">' + esc(data.title) + '</h2>' +
            '<p style="margin:0; color:#aebcaf; max-width:820px; line-height:1.45;">' + esc(data.subtitle) + '</p>' +
          '</div>' +
          '<button type="button" id="wildu-instructions-close" style="' +
            'border:0;' +
            'border-radius:999px;' +
            'padding:10px 15px;' +
            'background:#d6b25e;' +
            'color:#1b1509;' +
            'font-weight:950;' +
            'cursor:pointer;' +
            'white-space:nowrap;' +
          '">Chiudi</button>' +
        '</div>' +

        '<div style="padding:18px 22px 24px;">' +
          '<div style="border:1px solid rgba(214,178,94,.25); background:linear-gradient(135deg,rgba(214,178,94,.12),rgba(107,213,138,.06)); border-radius:20px; padding:16px 17px; margin-bottom:14px;">' +
            '<div style="font-size:12px; text-transform:uppercase; letter-spacing:.08em; font-weight:950; color:#f6d889;">Riassunto strategico enterprise</div>' +
            '<div style="margin-top:8px; font-size:15px; line-height:1.56; color:#eef6ef;">' +
              data.purpose + '<br>' +
              '<span style="color:#aebcaf;">Decisione rapida:</span> ' + data.fastDecision + '<br>' +
              '<span style="color:#aebcaf;">Effetto client:</span> ' + data.clientImpact +
            '</div>' +
          '</div>' +

          summaryCards(data) +

          details('1. Domande rapide per casi d’uso comuni', list(data.questions), true) +
          details('2. Procedura operativa sintetica', ordered(data.steps), true) +
          details('3. Azioni, Firestore, cache ed effetto client', actionTable(data.actions), true) +
          details('4. Mappa dipendenze e struttura reale', dependencyMap(data.deps), false) +
          details('5. Rischi, paradossi e cose da non fare', list(data.risks), false) +

          '<div style="margin-top:16px; display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:10px;">' +
            '<div style="padding:13px 14px; border-radius:16px; background:rgba(107,213,138,.08); border:1px solid rgba(107,213,138,.22); font-size:13px; line-height:1.45;">' +
              '<strong style="color:#bff7cd;">Regola fonti nuove:</strong><br>' +
              'Per i nuovi moduli il client leggerà ' + code('wildu_media_runtime/module_versions') + '. Nessuna migrazione/merge con la vecchia sorgente.' +
            '</div>' +
            '<div style="padding:13px 14px; border-radius:16px; background:rgba(120,190,255,.07); border:1px solid rgba(120,190,255,.22); font-size:13px; line-height:1.45;">' +
              '<strong style="color:#9ed6ff;">Regola cache:</strong><br>' +
              'Versionare audio/PDF, giochi e moduli deve aggiornare la cache relativa, ma senza contaminare livelli diversi.' +
            '</div>' +
            '<div style="padding:13px 14px; border-radius:16px; background:rgba(238,106,106,.07); border:1px solid rgba(238,106,106,.20); font-size:13px; line-height:1.45;">' +
              '<strong style="color:#ffc5c5;">Regola anti-paradosso:</strong><br>' +
              'Media, giochi e moduli sono tre piani diversi: ' + code('public_versions') + ', ' + code('game_versions') + ', ' + code('module_versions') + '.' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
    }

    function onKeyDown(evt) {
      if (evt.key === 'Escape') close();
    }

    overlay.addEventListener('click', function (evt) {
      if (evt.target === overlay) close();
    });

    var closeBtn = document.getElementById('wildu-instructions-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', onKeyDown);
  }

  root.openInstructions = openInstructions;
  

  function kindLabel(kind) {
    return (WILDU_MEDIA_CONFIG.kindLabels || {})[kind] || kind;
  }

  function fillKindOptions() {
    var options = WILDU_MEDIA_CONFIG.activeUploadKinds.map(function (kind) {
      return '<option value="' + root.escapeHtml(kind) + '">' + root.escapeHtml(kindLabel(kind)) + '</option>';
    }).join('');
    root.$('#upload-kind').innerHTML = '<option value="">Seleziona tipo upload</option>' + options;
    root.$('#filter-kind').innerHTML = '<option value="">Tutti i tipi</option>' + options;

    var subOptions = (WILDU_MEDIA_CONFIG.pdfSubcategories || []).map(function (item) {
      return '<option value="' + root.escapeHtml(item.id) + '">' + root.escapeHtml(item.label) + '</option>';
    }).join('');
    root.$('#upload-subcategory').innerHTML = '<option value="">Seleziona sottocategoria</option>' + subOptions;
  }

  async function refreshTags() {
    if (!root.db) return;
    state.tags = await root.TagService.listTags({ onlyActive: false });
    await loadRuntimeManifestQuietly();
    renderTags();
    fillTagDropdowns();
    renderDashboard();
    renderDebug();
  }

  async function loadRuntimeManifestQuietly() {
    try {
      var doc = await root.db
        .collection(WILDU_MEDIA_CONFIG.collections.runtime)
        .doc(WILDU_MEDIA_CONFIG.runtimePublicVersionsDocId)
        .get();
      state.runtimeManifest = doc.exists ? (doc.data() || {}) : null;
    } catch (e) {
      state.runtimeManifest = { error: e.message || String(e) };
    }
  }


  function titleCaseGrade(value) {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function addGradeOption(map, value, source) {
    var label = titleCaseGrade(value);
    if (!label) return;

    var key = label.toLowerCase();
    if (!map[key]) {
      map[key] = {
        value: label,
        label: label,
        source: source || 'firestore'
      };
    }
  }

  function buildModuleGradeOptions(clientConfig, legacyModulesDoc) {
    var map = {};

    // 1) Valori esatti già presenti nei vecchi moduli.
    // Sono i più importanti perché il client li conosce già come Grado_Minimo.
    var items = legacyModulesDoc && Array.isArray(legacyModulesDoc.items)
      ? legacyModulesDoc.items
      : [];

    items.forEach(function (item) {
      if (item && item.Grado_Minimo) {
        addGradeOption(map, item.Grado_Minimo, 'PARAMETERS_PARTNER/moduli_risorse');
      }
    });

    // 2) Campi grado_* presenti in client_config.
    Object.keys(clientConfig || {}).forEach(function (key) {
      if (/^grado_/i.test(key)) {
        addGradeOption(map, clientConfig[key], 'PARAMETERS_PARTNER/client_config.' + key);
      }
    });

    // 3) Soglie XP presenti in client_config.
    // Non inventiamo gradi: deriviamo solo dai nomi Soglia_* esistenti nel documento.
    Object.keys(clientConfig || {}).forEach(function (key) {
      var match = key.match(/^Soglia_(.+)$/i);
      if (!match) return;

      var raw = match[1];

      // Compatibilità con il vecchio valore reale “Socio Novizio” già presente nei moduli.
      if (/^novizio$/i.test(raw) && map['socio novizio']) return;

      addGradeOption(map, raw, 'PARAMETERS_PARTNER/client_config.' + key);
    });

    return Object.keys(map)
      .sort(function (a, b) {
        var order = {
          'socio novizio': 10,
          'novizio': 10,
          'esploratore': 20,
          'sentinella': 30,
          'veterano': 40,
          'leggenda': 50,
          'divinità': 60,
          'divinita': 60
        };

        var oa = order[a] || 999;
        var ob = order[b] || 999;
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b);
      })
      .map(function (key) { return map[key]; });
  }

  function renderModuleGradeOptions() {
    var select = root.$('#module-grade');
    if (!select) return;

    var current = select.value || '';
    var options = state.moduleGradeOptions || [];

    select.innerHTML =
      '<option value="">Nessun grado / pubblico</option>' +
      options.map(function (item) {
        return '<option value="' + root.escapeHtml(item.value) + '">' +
          root.escapeHtml(item.label) +
          '</option>';
      }).join('');

    if (current && options.some(function (item) { return item.value === current; })) {
      select.value = current;
    }
  }

  async function loadPartnerModuleContextQuietly() {
    try {
      var configSnap = await root.db
        .collection('PARAMETERS_PARTNER')
        .doc('client_config')
        .get();

      var modulesSnap = await root.db
        .collection('PARAMETERS_PARTNER')
        .doc('moduli_risorse')
        .get();

      state.partnerClientConfig = configSnap.exists ? (configSnap.data() || {}) : {};
      state.legacyModuleResources = modulesSnap.exists ? (modulesSnap.data() || {}) : {};
      state.moduleGradeOptions = buildModuleGradeOptions(
        state.partnerClientConfig,
        state.legacyModuleResources
      );

      renderModuleGradeOptions();
    } catch (e) {
      state.partnerClientConfig = { error: e.message || String(e) };
      state.legacyModuleResources = { error: e.message || String(e) };
      state.moduleGradeOptions = [];
      renderModuleGradeOptions();
    }
  }  

  
  function tagAllowsKind(tag, kind) {
    var allowed = Array.isArray(tag.allowedCategories) ? tag.allowedCategories : [];
    return !kind || allowed.indexOf(kind) !== -1;
  }

  function fillTagDropdowns() {
    updateUploadUiByKind();
    root.$('#filter-tag').innerHTML = '<option value="">Tutti i tag</option>' + state.tags.map(function (tag) {
      return '<option value="' + root.escapeHtml(tag.tagSlug) + '">' + root.escapeHtml(tag.title || tag.tagSlug) + '</option>';
    }).join('');
  }

  function updateUploadUiByKind() {
    var kind = root.$('#upload-kind').value || '';
    var activeTags = state.tags.filter(function (tag) {
      return tag.status === 'ACTIVE' && tagAllowsKind(tag, kind);
    });

    var options = activeTags.map(function (tag) {
      var label = tag.title || tag.tagSlug;
      return '<option value="' + root.escapeHtml(tag.tagSlug) + '">' + root.escapeHtml(label) + ' (' + root.escapeHtml(tag.tagSlug) + ')</option>';
    }).join('');

    root.$('#upload-tag').innerHTML = '<option value="">Seleziona tag</option>' + options;

    var defaultTag = (WILDU_MEDIA_CONFIG.defaultTagByKind || {})[kind];
    if (defaultTag && activeTags.some(function (tag) { return tag.tagSlug === defaultTag; })) {
      root.$('#upload-tag').value = defaultTag;
    } else if (activeTags.length === 1) {
      root.$('#upload-tag').value = activeTags[0].tagSlug;
    }

    var isPdf = kind === 'pdf';
    root.$('#upload-subcategory-wrap').style.display = isPdf ? '' : 'none';
    root.$('#upload-subcategory').required = isPdf;
    if (!isPdf) root.$('#upload-subcategory').value = '';

    var defaultVis = (WILDU_MEDIA_CONFIG.defaultVisibilityByKind || {})[kind];
    if (defaultVis) root.$('#upload-visibility').value = defaultVis;
  }

  function renderTags() {
    var tbody = root.$('#tags-table-body');
    if (!state.tags.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="muted">Nessun tag creato. Usa “Crea/aggiorna tag ufficiali”.</td></tr>';
      return;
    }
    tbody.innerHTML = state.tags.map(function (tag) {
      var cats = Array.isArray(tag.allowedCategories) ? tag.allowedCategories.join(', ') : '';
      return '<tr>' +
        '<td><strong>' + root.escapeHtml(tag.title || tag.tagSlug) + '</strong><br><code>' + root.escapeHtml(tag.tagSlug) + '</code></td>' +
        '<td><code>' + root.escapeHtml(tag.renderer || 'none') + '</code></td>' +
        '<td>' + root.escapeHtml(cats || '—') + '</td>' +
        '<td><span class="badge ' + (tag.status === 'ACTIVE' ? 'good' : 'warn') + '">' + root.escapeHtml(tag.status || '—') + '</span></td>' +
        '<td>' + root.escapeHtml(tag.visibility || '—') + '</td>' +
        '<td>' + (tag.clientRenderable === false ? '<span class="badge warn">NO</span>' : '<span class="badge good">SÌ</span>') + '</td>' +
        '<td>' + Number(tag.sortOrder || 0) + '</td>' +
        '<td><strong>' + Number(tag.version || 0) + '</strong></td>' +
        '<td><strong>' + Number(tag.publicVersion || 0) + '</strong></td>' +
        '<td class="actions">' +
          '<button class="small" data-edit-tag="' + root.escapeHtml(tag.tagSlug) + '">Modifica</button>' +
          '<button class="small danger" data-toggle-tag="' + root.escapeHtml(tag.tagSlug) + '" data-next-status="' + (tag.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE') + '">' + (tag.status === 'ACTIVE' ? 'Disattiva' : 'Riattiva') + '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  async function saveTagFromForm(evt) {
    evt.preventDefault();
    var input = {
      tagSlug: root.$('#tag-slug').value,
      title: root.$('#tag-title').value,
      description: root.$('#tag-description').value,
      status: root.$('#tag-status').value,
      visibility: root.$('#tag-visibility').value,
      sortOrder: root.$('#tag-sort').value,
      renderer: root.$('#tag-renderer').value,
      clientRenderable: root.$('#tag-client-renderable').value === 'true',
      allowedCategoriesText: root.$('#tag-allowed-categories').value
    };
    await root.TagService.createOrUpdateTag(input);
    root.toast('Tag salvato. Versioni preservate e manifesto sincronizzato.', 'success');
    root.$('#tag-form').reset();
    root.$('#tag-status').value = 'ACTIVE';
    root.$('#tag-visibility').value = 'PUBLIC';
    root.$('#tag-renderer').value = 'document-tabs';
    root.$('#tag-client-renderable').value = 'true';
    await refreshTags();
  }

  function editTag(tagSlug) {
    var tag = state.tags.find(function (x) { return x.tagSlug === tagSlug; });
    if (!tag) return;
    root.$('#tag-slug').value = tag.tagSlug;
    root.$('#tag-title').value = tag.title || '';
    root.$('#tag-description').value = tag.description || '';
    root.$('#tag-status').value = tag.status || 'ACTIVE';
    root.$('#tag-visibility').value = tag.visibility || 'PUBLIC';
    root.$('#tag-sort').value = Number(tag.sortOrder || 0);
    root.$('#tag-renderer').value = tag.renderer || 'none';
    root.$('#tag-client-renderable').value = tag.clientRenderable === false ? 'false' : 'true';
    root.$('#tag-allowed-categories').value = Array.isArray(tag.allowedCategories) ? tag.allowedCategories.join(',') : '';
    switchTab('tags');
  }

  async function toggleTag(tagSlug, nextStatus) {
    await root.TagService.setTagStatus(tagSlug, nextStatus);
    root.toast('Stato tag aggiornato e manifesto sincronizzato: ' + tagSlug + ' → ' + nextStatus, 'success');
    await refreshTags();
  }

  async function seedDefaultTags() {
    await root.TagService.seedDefaultTags();
    root.toast('Tag ufficiali creati/aggiornati: biblioteca, radio, immagini.', 'success');
    await refreshTags();
  }

  async function syncRuntimeManifest() {
    var manifest = await root.TagService.syncRuntimePublicVersions();
    state.runtimeManifest = manifest;
    root.toast('Manifesto public_versions sincronizzato.', 'success');
    await refreshTags();
  }

  async function uploadMedia(evt) {
    evt.preventDefault();

    var file = root.$('#upload-file').files[0];
    var kind = root.$('#upload-kind').value;
    var subcategory = root.$('#upload-subcategory').value;
    var tagSlug = root.$('#upload-tag').value;
    var title = root.$('#upload-title').value.trim();
    var description = root.$('#upload-description').value.trim();
    var tagsText = root.$('#upload-tags').value.trim();
    var status = root.$('#upload-status').value;
    var visibility = root.$('#upload-visibility').value;
    var sortOrder = Number(root.$('#upload-sort').value || 0);
    var mediaVersion = Math.max(1, parseInt(root.$('#upload-media-version').value, 10) || 1);

    root.validateFileForKind(file, kind);
    if (!tagSlug) throw new Error('Scegli un tag.');
    if (!title) throw new Error('Titolo obbligatorio.');

    if (kind === 'pdf' && !subcategory) throw new Error('Scegli Libri oppure Manuali e Guide.');
    if (kind !== 'pdf') subcategory = '';

    setUploadProgress(0, 'Richiesta URL firmato al Worker...');
    var signed = await root.R2WorkerService.requestUploadUrl({
      kind: kind,
      tagSlug: tagSlug,
      subcategory: subcategory || '',
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size
    });

    setUploadProgress(5, 'Upload diretto su R2...');
    await root.R2WorkerService.putFileToR2(signed.uploadUrl, file, file.type, function (pct) {
      setUploadProgress(Math.max(5, Math.min(95, pct)), 'Upload R2 ' + pct + '%');
    });

    setUploadProgress(96, 'Salvataggio metadati Firestore e versioning tag...');
    var media = await root.MediaService.createMedia({
      title: title,
      description: description,
      kind: kind,
      subcategory: subcategory || null,
      tagSlug: tagSlug,
      tagSlugs: [tagSlug],
      tagsText: tagsText,
      status: status,
      visibility: visibility,
      sortOrder: sortOrder,
      fileUrl: signed.publicUrl,
      objectKey: signed.objectKey,
      originalFileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      mediaVersion: mediaVersion
    });

    setUploadProgress(100, 'Upload completato. Media ID: ' + media.id);
    root.toast('Media caricato e versioni/manifesto aggiornati.', 'success');
    root.$('#upload-form').reset();
    root.$('#upload-status').value = 'ACTIVE';
    root.$('#upload-visibility').value = 'PUBLIC';
    root.$('#upload-media-version').value = '1';
    updateUploadUiByKind();
    await refreshTags();
    await refreshMedia();
    switchTab('catalog');
  }

  function setUploadProgress(percent, label) {
    root.$('#upload-progress-bar').style.width = Number(percent || 0) + '%';
    root.$('#upload-progress-label').textContent = label || '';
  }

  async function refreshMedia() {
    if (!root.db) return;
    var filters = {
      tagSlug: root.$('#filter-tag').value || '',
      kind: root.$('#filter-kind').value || '',
      subcategory: root.$('#filter-subcategory').value || '',
      status: root.$('#filter-status').value || '',
      visibility: root.$('#filter-visibility').value || '',
      limit: 80
    };
    state.media = await root.MediaService.listMedia(filters);
    renderMedia();
    renderDashboard();
    renderDebug();
  }

  function mediaPreviewHtml(item) {
    if (item.kind === 'image') {
      return '<img class="media-thumb" src="' + root.escapeHtml(item.fileUrl) + '" alt="">';
    }
    if (item.kind === 'audio') {
      return '<audio controls preload="none" src="' + root.escapeHtml(item.fileUrl) + '"></audio>';
    }
    return '<a href="' + root.escapeHtml(item.fileUrl) + '" target="_blank" rel="noopener">Apri PDF</a>';
  }

  function renderMedia() {
    var wrap = root.$('#media-list');
    if (!state.media.length) {
      wrap.innerHTML = '<div class="empty">Nessun media trovato con questi filtri.</div>';
      return;
    }
    wrap.innerHTML = state.media.map(function (item) {
      var sub = item.subcategory ? root.getSubcategoryLabel(item.subcategory) : '';
      return '<article class="media-card">' +
        '<div class="media-main">' +
          '<h3>' + root.escapeHtml(item.title || 'Senza titolo') + '</h3>' +
          '<p class="muted">' + root.escapeHtml(item.description || '') + '</p>' +
          '<div class="chip-row">' +
            '<span class="chip">' + root.escapeHtml(kindLabel(item.kind || '—')) + '</span>' +
            (sub ? '<span class="chip">' + root.escapeHtml(sub) + '</span>' : '') +
            '<span class="chip">tag: ' + root.escapeHtml(item.tagSlug || '—') + '</span>' +
            '<span class="chip ' + (item.status === 'ACTIVE' ? 'good' : 'warn') + '">' + root.escapeHtml(item.status || '—') + '</span>' +
            '<span class="chip">' + root.escapeHtml(item.visibility || '—') + '</span>' +
            '<span class="chip">' + root.formatBytes(item.sizeBytes) + '</span>' +
            '<span class="chip">v' + Number(item.mediaVersion || 1) + '</span>' +
          '</div>' +
          '<p class="small-text"><code>' + root.escapeHtml(item.objectKey || '') + '</code></p>' +
          '<p class="small-text">Aggiornato: ' + root.toDateTimeLabel(item.updatedAt) + '</p>' +
        '</div>' +
        '<div class="media-preview">' + mediaPreviewHtml(item) + '</div>' +
        '<div class="media-actions">' +
          '<button class="small" data-open-url="' + root.escapeHtml(item.fileUrl || '') + '">Apri</button>' +
          '<button class="small" data-version-media="' + root.escapeHtml(item.id) + '">+1 versione</button>' +
          '<button class="small warn" data-archive-media="' + root.escapeHtml(item.id) + '">Archivia</button>' +
          '<button class="small danger" data-hard-delete-media="' + root.escapeHtml(item.id) + '">Elimina + R2</button>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderDashboard() {
    root.$('#dashboard-count-tags').textContent = String(state.tags.length);
    root.$('#dashboard-count-media').textContent = String(state.media.length);
    root.$('#dashboard-version').textContent = WILDU_MEDIA_CONFIG.appVersion;
  }


  async function refreshGameVersions() {
    if (!root.db || !root.RuntimeService) return;
    state.gameRuntime = await root.RuntimeService.listGames();
    renderGameVersions();
    renderDebug();
  }

  async function refreshModuleVersions() {
    if (!root.db || !root.RuntimeService) return;
    state.moduleRuntime = await root.RuntimeService.listModules();
    renderModuleVersions();
    renderDebug();
  }

  function renderGameVersions() {
    var tbody = root.$('#games-table-body');
    if (!tbody) return;

    var items = state.gameRuntime && Array.isArray(state.gameRuntime.items) ? state.gameRuntime.items : [];
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Nessun gioco registrato. Usa “Preset giochi noti” oppure salva un URL gioco.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (item) {
      return '<tr>' +
        '<td><strong>' + root.escapeHtml(item.title || item.url) + '</strong><br><span class="small-text">' + root.escapeHtml(item.description || item.notes || '') + '</span></td>' +
        '<td><code>' + root.escapeHtml(item.url || '') + '</code><br><span class="small-text">Modulo: ' + root.escapeHtml(item.moduleUrl || '—') + '</span></td>' +
        '<td><strong>' + Number(item.rev || 1) + '</strong></td>' +
        '<td>' + (item.enabled === false ? '<span class="badge warn">NO</span>' : '<span class="badge good">SÌ</span>') + '</td>' +
        '<td><code>' + root.escapeHtml(item.cacheScope || '') + '</code></td>' +
        '<td class="actions">' +
          '<button class="small" data-edit-game="' + root.escapeHtml(item.url || '') + '">Modifica</button>' +
          '<button class="small" data-bump-game="' + root.escapeHtml(item.url || '') + '">+1</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  function renderModuleVersions() {
    var tbody = root.$('#modules-table-body');
    if (!tbody) return;

    var items = state.moduleRuntime && Array.isArray(state.moduleRuntime.items) ? state.moduleRuntime.items : [];
    
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted">Nessun modulo registrato. Usa “Preset moduli noti” oppure salva un URL modulo.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (item) {
      return '<tr>' +
        '<td><strong>' + root.escapeHtml(item.title || item.Titolo || item.url) + '</strong><br><span class="small-text">' + root.escapeHtml(item.description || item.Descrizione || item.notes || '') + '</span></td>' +
        '<td><code>' + root.escapeHtml(item.url || '') + '</code><br><span class="small-text">Renderer: ' + root.escapeHtml(item.renderer || 'module-html') + '</span></td>' +
        '<td>' + (item.Grado_Minimo ? '<span class="badge">' + root.escapeHtml(item.Grado_Minimo) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td><strong>' + Number(item.rev || item.module_rev || 1) + '</strong></td>' +
        '<td>' + (item.enabled === false ? '<span class="badge warn">NO</span>' : '<span class="badge good">SÌ</span>') + '</td>' +
        '<td><code>' + root.escapeHtml(item.cacheScope || '') + '</code></td>' +
        '<td class="actions">' +
          '<button class="small" data-edit-module-version="' + root.escapeHtml(item.url || '') + '">Modifica</button>' +
          '<button class="small" data-bump-module="' + root.escapeHtml(item.url || '') + '">+1</button>' +
        '</td>' +
      '</tr>';
    }).join('');
    
  }

  function findGameVersion(url) {
    var clean = root.RuntimeService.normalizeRuntimeUrl(url);
    var items = state.gameRuntime && Array.isArray(state.gameRuntime.items) ? state.gameRuntime.items : [];
    return items.find(function (item) { return item.url === clean; }) || null;
  }

  function findModuleVersion(url) {
    var clean = root.RuntimeService.normalizeRuntimeUrl(url);
    var items = state.moduleRuntime && Array.isArray(state.moduleRuntime.items) ? state.moduleRuntime.items : [];
    return items.find(function (item) { return item.url === clean; }) || null;
  }

  function readGameForm() {
    return {
      title: root.$('#game-title').value,
      url: root.$('#game-url').value,
      rev: root.$('#game-rev').value,
      enabled: root.$('#game-enabled').value === 'true',
      moduleUrl: root.$('#game-module-url').value,
      description: root.$('#game-description').value,
      cacheScope: root.$('#game-cache-scope').value,
      extraUrls: root.$('#game-extra-urls').value,
      clearNeedles: root.$('#game-clear-needles').value
    };
  }

  function fillGameForm(item) {
    item = item || {};
    root.$('#game-title').value = item.title || '';
    root.$('#game-url').value = item.url || '';
    root.$('#game-rev').value = Number(item.rev || 1);
    root.$('#game-enabled').value = item.enabled === false ? 'false' : 'true';
    root.$('#game-module-url').value = item.moduleUrl || '';
    root.$('#game-description').value = item.description || item.notes || '';
    root.$('#game-cache-scope').value = item.cacheScope || '';
    root.$('#game-extra-urls').value = Array.isArray(item.extraUrls) ? item.extraUrls.join(', ') : '';
    root.$('#game-clear-needles').value = Array.isArray(item.clearNeedles) ? item.clearNeedles.join(', ') : '';
    switchTab('games');
  }

  function parseModuleInternalLinksInput(value) {
    var raw = String(value || '').trim();
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}

    return raw
      .split(',')
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function readModuleForm() {
    var title = root.$('#module-title').value;
    var url = root.$('#module-url').value;
    var rev = root.$('#module-rev').value;
    var description = root.$('#module-description').value;
    var linkRisorsa = root.$('#module-link-resource').value || url;

    return {
      title: title,
      url: url,
      rev: rev,
      enabled: root.$('#module-enabled').value === 'true',
      renderer: root.$('#module-renderer').value,
      description: description,
      cacheScope: root.$('#module-cache-scope').value,
      extraUrls: root.$('#module-extra-urls').value,
      clearNeedles: root.$('#module-clear-needles').value,

      // Campi compatibili con PARAMETERS_PARTNER/moduli_risorse.
      Titolo: title,
      Descrizione: description,
      Categoria: root.$('#module-category').value,
      Grado_Minimo: root.$('#module-grade').value,
      Link_Risorsa: linkRisorsa,
      Audio: root.$('#module-audio').value,
      Regione: root.$('#module-region').value,
      link_interni: parseModuleInternalLinksInput(root.$('#module-internal-links').value),
      module_rev: String(Math.max(1, parseInt(rev, 10) || 1))
    };
  }

  function fillModuleForm(item) {
    item = item || {};
    root.$('#module-title').value = item.title || item.Titolo || '';
    root.$('#module-url').value = item.url || '';
    root.$('#module-rev').value = Number(item.rev || item.module_rev || 1);
    root.$('#module-enabled').value = item.enabled === false ? 'false' : 'true';
    root.$('#module-renderer').value = item.renderer || 'module-html';
    root.$('#module-description').value = item.description || item.Descrizione || item.notes || '';
    root.$('#module-cache-scope').value = item.cacheScope || '';
    root.$('#module-extra-urls').value = Array.isArray(item.extraUrls) ? item.extraUrls.join(', ') : '';
    root.$('#module-clear-needles').value = Array.isArray(item.clearNeedles) ? item.clearNeedles.join(', ') : '';

    root.$('#module-category').value = item.Categoria || '';
    root.$('#module-audio').value = item.Audio || '';
    root.$('#module-region').value = item.Regione || '';
    root.$('#module-link-resource').value = item.Link_Risorsa || item.url || '';
    root.$('#module-internal-links').value = Array.isArray(item.link_interni)
      ? JSON.stringify(item.link_interni, null, 2)
      : '';

    renderModuleGradeOptions();
    if (item.Grado_Minimo) {
      var select = root.$('#module-grade');
      var exists = Array.prototype.some.call(select.options, function (opt) {
        return opt.value === item.Grado_Minimo;
      });

      if (!exists) {
        var opt = document.createElement('option');
        opt.value = item.Grado_Minimo;
        opt.textContent = item.Grado_Minimo + ' (salvato)';
        select.appendChild(opt);
      }

      select.value = item.Grado_Minimo;
    } else {
      root.$('#module-grade').value = '';
    }

    switchTab('modules');
  }

  async function saveGameVersion(evt) {
    evt.preventDefault();
    await root.RuntimeService.saveGame(readGameForm());
    root.toast('Versione gioco salvata in game_versions.', 'success');
    await refreshGameVersions();
  }

  async function saveModuleVersion(evt) {
    evt.preventDefault();
    await root.RuntimeService.saveModule(readModuleForm());
    root.toast('Versione modulo salvata in module_versions.', 'success');
    await refreshModuleVersions();
  }

  async function bumpSelectedGameVersion() {
    var url = root.$('#game-url').value;
    await root.RuntimeService.bumpGame(url, root.$('#game-description').value || 'ADMIN_BUMP');
    root.toast('Versione gioco incrementata: ' + url, 'success');
    await refreshGameVersions();
  }

  async function bumpSelectedModuleVersion() {
    var url = root.$('#module-url').value;
    await root.RuntimeService.bumpModule(url, root.$('#module-description').value || 'ADMIN_BUMP');
    root.toast('Versione modulo incrementata: ' + url, 'success');
    await refreshModuleVersions();
  }

  async function seedGames() {
    await root.RuntimeService.seedDefaultGames();
    root.toast('Preset giochi noti creati/aggiornati.', 'success');
    await refreshGameVersions();
  }

  async function seedModules() {
    await root.RuntimeService.seedDefaultModules();
    root.toast('Preset moduli noti creati/aggiornati.', 'success');
    await refreshModuleVersions();
  }

  async function bumpGameFromTable(url) {
    await root.RuntimeService.bumpGame(url, 'ADMIN_TABLE_BUMP');
    root.toast('Versione gioco incrementata: ' + url, 'success');
    await refreshGameVersions();
  }

  async function bumpModuleFromTable(url) {
    await root.RuntimeService.bumpModule(url, 'ADMIN_TABLE_BUMP');
    root.toast('Versione modulo incrementata: ' + url, 'success');
    await refreshModuleVersions();
  }

  async function bumpMediaVersion(id) {
    var note = prompt('Nota versione media (+1):', 'Aggiornamento file/metadati pubblico');
    if (note === null) return;
    await root.MediaService.bumpMediaVersion(id, note);
    root.toast('Versione media incrementata e manifesti aggiornati.', 'success');
    await refreshTags();
    await refreshMedia();
  }

  function exportRuntimeJsonToDebug() {
    var payload = {
      public_versions: state.runtimeManifest,
      game_versions: state.gameRuntime ? state.gameRuntime.raw : null,
      module_versions: state.moduleRuntime ? state.moduleRuntime.raw : null
    };
    root.$('#debug-json').textContent = JSON.stringify(payload, null, 2);
    switchTab('debug');
  }

  async function syncAllRuntimeDebug() {
    await loadRuntimeManifestQuietly();
    await refreshGameVersions();
    await refreshModuleVersions();
    exportRuntimeJsonToDebug();
    root.toast('Runtime debug sincronizzato.', 'success');
  }

  function renderDebug() {
    var debug = {
      appVersion: WILDU_MEDIA_CONFIG.appVersion,
      workerUrl: WILDU_MEDIA_CONFIG.workerUrl,
      cdnBaseUrl: WILDU_MEDIA_CONFIG.cdnBaseUrl,
      collections: WILDU_MEDIA_CONFIG.collections,
      activeUploadKinds: WILDU_MEDIA_CONFIG.activeUploadKinds,
      currentUser: state.currentUser ? { uid: state.currentUser.uid, email: state.currentUser.email } : null,
      runtimeManifest: state.runtimeManifest,
      gameRuntime: state.gameRuntime ? state.gameRuntime.raw : null,
      moduleRuntime: state.moduleRuntime ? state.moduleRuntime.raw : null,
      partnerClientConfig: state.partnerClientConfig,
      legacyModuleResources: state.legacyModuleResources,
      moduleGradeOptions: state.moduleGradeOptions,
      tags: state.tags.map(function (t) {
        return {
          tagSlug: t.tagSlug,
          version: Number(t.version || 0),
          publicVersion: Number(t.publicVersion || 0),
          renderer: t.renderer,
          clientRenderable: t.clientRenderable !== false,
          allowedCategories: t.allowedCategories,
          status: t.status,
          visibility: t.visibility
        };
      })
    };
    root.$('#debug-json').textContent = JSON.stringify(debug, null, 2);
  }

  async function archiveMedia(id) {
    if (!confirm('Archiviare questo media? Se era pubblico/renderizzabile, la versione client verrà aggiornata.')) return;
    await root.MediaService.archiveMedia(id);
    root.toast('Media archiviato e versioni/manifesto aggiornati.', 'success');
    await refreshTags();
    await refreshMedia();
  }

  async function hardDeleteMedia(id) {
    if (!confirm('Eliminazione definitiva: cancella documento Firestore e prova a cancellare il file R2. Continuare?')) return;
    var result = await root.MediaService.hardDeleteMediaAndR2(id);
    if (result && result.r2Error) {
      root.toast('Media rimosso da Firestore e versioni aggiornate, ma cleanup R2 fallito: ' + result.r2Error, 'error');
    } else {
      root.toast('Media eliminato e versioni aggiornate. R2 pulito se il Worker ha confermato.', 'success');
    }
    await refreshTags();
    await refreshMedia();
  }

  function bindEvents() {

    var instructionsBtn = document.getElementById('btn-open-instructions');
    if (instructionsBtn) {
      instructionsBtn.addEventListener('click', function (evt) {
        evt.preventDefault();

        if (typeof root.openInstructions === 'function') {
          root.openInstructions();
          return;
        }

        if (typeof root.toast === 'function') {
          root.toast('Istruzioni non caricate: controlla versione app.js / cache.', 'error');
        } else {
          alert('Istruzioni non caricate: controlla versione app.js / cache.');
        }
      });
    }
    
    root.$('#btn-login').addEventListener('click', function () { run(login); });
    root.$('#btn-logout').addEventListener('click', function () { run(logout); });

    root.$all('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });

    root.$('#tag-form').addEventListener('submit', function (evt) { run(saveTagFromForm, evt); });
    root.$('#upload-form').addEventListener('submit', function (evt) { run(uploadMedia, evt); });
    root.$('#game-version-form').addEventListener('submit', function (evt) { run(saveGameVersion, evt); });
    root.$('#module-version-form').addEventListener('submit', function (evt) { run(saveModuleVersion, evt); });
    root.$('#upload-kind').addEventListener('change', updateUploadUiByKind);
    root.$('#btn-refresh-tags').addEventListener('click', function () { run(refreshTags); });
    root.$('#btn-refresh-media').addEventListener('click', function () { run(refreshMedia); });
    root.$('#btn-seed-default-tags').addEventListener('click', function () { run(seedDefaultTags); });
    root.$('#btn-sync-runtime').addEventListener('click', function () { run(syncRuntimeManifest); });
    root.$('#btn-refresh-games').addEventListener('click', function () { run(refreshGameVersions); });
    root.$('#btn-refresh-modules').addEventListener('click', function () { run(refreshModuleVersions); });
    root.$('#btn-game-bump').addEventListener('click', function () { run(bumpSelectedGameVersion); });
    root.$('#btn-module-bump').addEventListener('click', function () { run(bumpSelectedModuleVersion); });
    root.$('#btn-seed-games').addEventListener('click', function () { run(seedGames); });
    root.$('#btn-seed-modules').addEventListener('click', function () { run(seedModules); });
    root.$('#btn-export-runtime-json').addEventListener('click', exportRuntimeJsonToDebug);
        root.$('#btn-sync-all-runtime').addEventListener('click', function () { run(syncAllRuntimeDebug); });
    root.$('#btn-refresh-module-grades').addEventListener('click', function () { run(loadPartnerModuleContextQuietly); });
    root.$('#catalog-filters').addEventListener('change', function () { run(refreshMedia); });

    document.body.addEventListener('click', function (evt) {
      var editBtn = evt.target.closest('[data-edit-tag]');
      if (editBtn) return editTag(editBtn.dataset.editTag);

      var toggleBtn = evt.target.closest('[data-toggle-tag]');
      if (toggleBtn) return run(toggleTag, toggleBtn.dataset.toggleTag, toggleBtn.dataset.nextStatus);

      var openBtn = evt.target.closest('[data-open-url]');
      if (openBtn) return window.open(openBtn.dataset.openUrl, '_blank', 'noopener');

      var editGameBtn = evt.target.closest('[data-edit-game]');
      if (editGameBtn) return fillGameForm(findGameVersion(editGameBtn.dataset.editGame));

      var bumpGameBtn = evt.target.closest('[data-bump-game]');
      if (bumpGameBtn) return run(bumpGameFromTable, bumpGameBtn.dataset.bumpGame);

      var editModuleBtn = evt.target.closest('[data-edit-module-version]');
      if (editModuleBtn) return fillModuleForm(findModuleVersion(editModuleBtn.dataset.editModuleVersion));

      var bumpModuleBtn = evt.target.closest('[data-bump-module]');
      if (bumpModuleBtn) return run(bumpModuleFromTable, bumpModuleBtn.dataset.bumpModule);

      var versionMediaBtn = evt.target.closest('[data-version-media]');
      if (versionMediaBtn) return run(bumpMediaVersion, versionMediaBtn.dataset.versionMedia);

      var archiveBtn = evt.target.closest('[data-archive-media]');
      if (archiveBtn) return run(archiveMedia, archiveBtn.dataset.archiveMedia);

      var deleteBtn = evt.target.closest('[data-hard-delete-media]');
      if (deleteBtn) return run(hardDeleteMedia, deleteBtn.dataset.hardDeleteMedia);
    });
  }

  async function run(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    try {
      root.toast('Operazione in corso...', 'info');
      await fn.apply(null, args);
      renderDebug();
    } catch (err) {
      root.toast(err && err.message ? err.message : String(err), 'error');
    }
  }

  async function boot() {
    root.$('#app-title').textContent = WILDU_MEDIA_CONFIG.appName;
    root.$('#app-version').textContent = 'v' + WILDU_MEDIA_CONFIG.appVersion;
    fillKindOptions();
    bindEvents();
    switchTab('dashboard');

    var initResult = root.initFirebase();
    if (!initResult) {
      root.$('#boot-warning').innerHTML = renderConfigWarning();
      setAuthUi(null);
      return;
    }

    root.auth.onAuthStateChanged(function (user) {
      setAuthUi(user);
      if (user) {
        run(async function () {
          
          await loadPartnerModuleContextQuietly();
          await refreshTags();
          await refreshMedia();
          await refreshGameVersions();
          await refreshModuleVersions();
          renderDashboard();
          
        });
      } else {
        state.tags = [];
        state.media = [];
        
        state.runtimeManifest = null;
        state.gameRuntime = null;
        state.moduleRuntime = null;
        state.partnerClientConfig = null;
        state.legacyModuleResources = null;
        state.moduleGradeOptions = [];
        
        renderTags();
        renderMedia();
        renderGameVersions();
        renderModuleVersions();
        renderDashboard();
        renderDebug();
      }
    });
  }

  function startBoot() {
    boot().catch(function (err) { root.toast(err.message || String(err), 'error'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBoot);
  } else {
    startBoot();
  }
})();
