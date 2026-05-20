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

    // Audio App: runtime moderno + mirror legacy client_config.
    systemAudio: null,
    systemAudioItems: [],

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
      renderClientConsoleSwitchCardState();
      renderGlobalCacheNukeCardState();
    } catch (e) {
      state.partnerClientConfig = { error: e.message || String(e) };
      state.legacyModuleResources = { error: e.message || String(e) };
      state.moduleGradeOptions = [];
      renderModuleGradeOptions();
      renderClientConsoleSwitchCardState();
      renderGlobalCacheNukeCardState();
    }
  }  


  // =========================================================
  // AUDIO APP — gestione audio di sistema client su R2 + mirror legacy
  // =========================================================
  // Fonte moderna:
  // - wildu_media_runtime/system_audio
  //
  // Mirror compatibilità client attuale:
  // - PARAMETERS_PARTNER/client_config.audio_*
  // - PARAMETERS_PARTNER/client_config.vol_musica
  // - PARAMETERS_PARTNER/client_config.vol_ambienza
  //
  // Nota:
  // Non usare wildu_media_catalog per questi asset: sono runtime app,
  // non contenuti Radio/Biblioteca sfogliabili.

  var SYSTEM_AUDIO_RUNTIME_COLLECTION = 'wildu_media_runtime';
  var SYSTEM_AUDIO_RUNTIME_DOC = 'system_audio';
  var SYSTEM_AUDIO_CLIENT_CONFIG_COLLECTION = 'PARAMETERS_PARTNER';
  var SYSTEM_AUDIO_CLIENT_CONFIG_DOC = 'client_config';

  var SYSTEM_AUDIO_SLOTS = [
    {
      key: 'audio_musica',
      label: 'Musica principale',
      role: 'music',
      fileName: 'audio_musica.mp3',
      allowStop: false
    },
    {
      key: 'audio_ambienza',
      label: 'Ambienza',
      role: 'ambience',
      fileName: 'audio_ambienza.mp3',
      allowStop: false
    },
    {
      key: 'audio_xp',
      label: 'Suono XP',
      role: 'effect',
      fileName: 'audio_xp.mp3',
      allowStop: false
    },
    {
      key: 'audio_reward',
      label: 'Ricompensa',
      role: 'effect',
      fileName: 'audio_reward.mp3',
      allowStop: false
    },
    {
      key: 'audio_levelup',
      label: 'Level Up',
      role: 'effect',
      fileName: 'audio_levelup.mp3',
      allowStop: false
    },
    {
      key: 'audio_spin',
      label: 'Ruota - avvio',
      role: 'effect',
      fileName: 'audio_spin.mp3',
      allowStop: false
    },
    {
      key: 'audio_end',
      label: 'Ruota - fine',
      role: 'effect',
      fileName: 'audio_end.mp3',
      allowStop: false
    },
    {
      key: 'audio_radio',
      label: 'Audio modulo Radio',
      role: 'module',
      fileName: 'audio_radio.mp3',
      allowStop: true
    },
    {
      key: 'audio_rifugio',
      label: 'Audio modulo Rifugio',
      role: 'module',
      fileName: 'audio_rifugio.mp3',
      allowStop: true
    },
    {
      key: 'audio_wildwall',
      label: 'Audio WildWall',
      role: 'module',
      fileName: 'audio_wildwall.mp3',
      allowStop: true
    }
  ];

  function systemAudioRuntimeRef() {
    return root.db
      .collection(SYSTEM_AUDIO_RUNTIME_COLLECTION)
      .doc(SYSTEM_AUDIO_RUNTIME_DOC);
  }

  function systemAudioClientConfigRef() {
    return root.db
      .collection(SYSTEM_AUDIO_CLIENT_CONFIG_COLLECTION)
      .doc(SYSTEM_AUDIO_CLIENT_CONFIG_DOC);
  }

  function getSystemAudioSlot(slotKey) {
    return SYSTEM_AUDIO_SLOTS.find(function (slot) {
      return slot.key === slotKey;
    }) || null;
  }

  function getSystemAudioItem(slotKey) {
    return (state.systemAudioItems || []).find(function (item) {
      return item.key === slotKey;
    }) || null;
  }

  function normalizeSystemAudioUrl(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function isStopAudioValue(value) {
    return normalizeSystemAudioUrl(value).toUpperCase() === 'STOP';
  }

  function getSystemAudioOrigin(value) {
    var url = normalizeSystemAudioUrl(value);

    if (!url) return 'MANCANTE';
    if (isStopAudioValue(url)) return 'STOP';

    try {
      var parsed = new URL(url, window.location.href);

      if (parsed.hostname === 'raw.githubusercontent.com') {
        return 'GITHUB RAW';
      }

      if (
        parsed.hostname === 'media.baffiwild.it' ||
        parsed.hostname === 'media.wildu.it'
      ) {
        if (parsed.pathname.indexOf('/wildu-system-audio/') !== -1) {
          return 'R2 SYSTEM';
        }

        return 'R2';
      }

      if (parsed.hostname.indexOf('github') !== -1) {
        return 'GITHUB';
      }

      return parsed.hostname || 'URL';
    } catch (e) {
      return 'VALORE';
    }
  }

  function getSystemAudioBadgeHtml(value) {
    var origin = getSystemAudioOrigin(value);
    var tone = 'rgba(255,255,255,.08)';
    var color = '#f3f8f4';

    if (origin === 'R2 SYSTEM') {
      tone = 'rgba(107,213,138,.14)';
      color = '#bff7cd';
    } else if (origin === 'R2') {
      tone = 'rgba(120,190,255,.13)';
      color = '#bde4ff';
    } else if (origin === 'GITHUB RAW' || origin === 'GITHUB') {
      tone = 'rgba(228,182,83,.16)';
      color = '#ffe7a5';
    } else if (origin === 'MANCANTE') {
      tone = 'rgba(238,106,106,.14)';
      color = '#ffc5c5';
    } else if (origin === 'STOP') {
      tone = 'rgba(255,255,255,.06)';
      color = '#aebcaf';
    }

    return '<span style="display:inline-flex; padding:4px 9px; border-radius:999px; background:' +
      tone + '; color:' + color + '; font-size:12px; font-weight:900;">' +
      root.escapeHtml(origin) +
      '</span>';
  }

  function buildSystemAudioItems(clientConfig, runtimeDoc) {
    clientConfig = clientConfig || {};
    runtimeDoc = runtimeDoc || {};

    var runtimeItems = runtimeDoc.items && typeof runtimeDoc.items === 'object'
      ? runtimeDoc.items
      : {};

    return SYSTEM_AUDIO_SLOTS.map(function (slot) {
      var runtimeItem = runtimeItems[slot.key] || {};
      var legacyValue = normalizeSystemAudioUrl(clientConfig[slot.key]);
      var runtimeValue = normalizeSystemAudioUrl(runtimeItem.fileUrl);

      var effectiveUrl = legacyValue || runtimeValue || '';

      return {
        key: slot.key,
        label: slot.label,
        role: slot.role,
        fileName: slot.fileName,
        allowStop: slot.allowStop === true,
        legacyUrl: legacyValue,
        runtimeUrl: runtimeValue,
        effectiveUrl: effectiveUrl,
        runtimeItem: runtimeItem
      };
    });
  }

  function renderSystemAudio() {
    var body = root.$('#system-audio-table-body');
    if (!body) return;

    var items = state.systemAudioItems || [];

    if (!state.currentUser) {
      body.innerHTML = '<tr><td colspan="6" class="muted">Login richiesto.</td></tr>';
      return;
    }

    if (!items.length) {
      body.innerHTML = '<tr><td colspan="6" class="muted">Audio App non ancora caricata. Premi “Ricarica Audio App”.</td></tr>';
      return;
    }

    body.innerHTML = items.map(function (item) {
      var url = normalizeSystemAudioUrl(item.effectiveUrl);
      var shortUrl = url || '—';

      return '' +
        '<tr>' +
          '<td><strong>' + root.escapeHtml(item.label) + '</strong></td>' +
          '<td><code>' + root.escapeHtml(item.key) + '</code></td>' +
          '<td>' + root.escapeHtml(item.role) + '</td>' +
          '<td>' + getSystemAudioBadgeHtml(url) + '</td>' +
          '<td style="max-width:420px; word-break:break-all;">' +
            (url && !isStopAudioValue(url)
              ? '<a href="' + root.escapeHtml(url) + '" target="_blank" rel="noopener">' + root.escapeHtml(shortUrl) + '</a>'
              : root.escapeHtml(shortUrl)) +
          '</td>' +
          '<td>' +
            '<button class="small" type="button" data-edit-system-audio="' + root.escapeHtml(item.key) + '">Modifica</button> ' +
            (url && !isStopAudioValue(url)
              ? '<button class="small" type="button" data-open-url="' + root.escapeHtml(url) + '">Ascolta</button>'
              : '') +
          '</td>' +
        '</tr>';
    }).join('');

    renderSystemAudioVolumeFields();
  }

  function renderSystemAudioVolumeFields() {
    var config = state.partnerClientConfig || {};
    var volMusica = root.$('#system-audio-vol-musica');
    var volAmbienza = root.$('#system-audio-vol-ambienza');

    if (volMusica && config.vol_musica !== undefined && config.vol_musica !== null) {
      volMusica.value = config.vol_musica;
    }

    if (volAmbienza && config.vol_ambienza !== undefined && config.vol_ambienza !== null) {
      volAmbienza.value = config.vol_ambienza;
    }
  }

  function clearSystemAudioForm() {
    var fields = [
      '#system-audio-slot-key',
      '#system-audio-slot-label',
      '#system-audio-current-url',
      '#system-audio-note'
    ];

    fields.forEach(function (selector) {
      var el = root.$(selector);
      if (el) el.value = '';
    });

    var fileInput = root.$('#system-audio-file');
    if (fileInput) fileInput.value = '';
  }

  function fillSystemAudioForm(slotKey) {
    var slot = getSystemAudioSlot(slotKey);
    if (!slot) {
      root.toast('Slot audio non trovato: ' + slotKey, 'error');
      return;
    }

    var item = getSystemAudioItem(slotKey) || {
      key: slot.key,
      label: slot.label,
      effectiveUrl: ''
    };

    root.$('#system-audio-slot-key').value = slot.key;
    root.$('#system-audio-slot-label').value = slot.label + ' — ' + slot.key;
    root.$('#system-audio-current-url').value = item.effectiveUrl || '';
    root.$('#system-audio-note').value = '';

    var fileInput = root.$('#system-audio-file');
    if (fileInput) fileInput.value = '';

    switchTab('audio');
  }

  async function refreshSystemAudio() {
    var clientConfigSnap = await systemAudioClientConfigRef().get();
    var runtimeSnap = await systemAudioRuntimeRef().get();

    var clientConfig = clientConfigSnap.exists ? (clientConfigSnap.data() || {}) : {};
    var runtimeDoc = runtimeSnap.exists ? (runtimeSnap.data() || {}) : {};

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, clientConfig);
    state.systemAudio = runtimeDoc;
    state.systemAudioItems = buildSystemAudioItems(clientConfig, runtimeDoc);

    renderSystemAudio();
    renderDebug();
  }

  function buildSystemAudioObjectKey(slot, file) {
    var originalName = String(file && file.name || slot.fileName || slot.key + '.mp3');
    var extMatch = originalName.match(/\.([a-z0-9]+)$/i);
    var ext = extMatch ? extMatch[1].toLowerCase() : 'mp3';

    return 'wildu-system-audio/' + slot.key + '.' + ext;
  }

  async function uploadSystemAudioSlot(evt) {
    evt.preventDefault();

    var slotKey = normalizeSystemAudioUrl(root.$('#system-audio-slot-key').value);
    var slot = getSystemAudioSlot(slotKey);

    if (!slot) {
      throw new Error('Seleziona prima uno slot audio dalla tabella.');
    }

    var fileInput = root.$('#system-audio-file');
    var file = fileInput && fileInput.files && fileInput.files[0];

    if (!file) {
      throw new Error('Seleziona un file audio da caricare.');
    }

    if (typeof root.validateFileForKind === 'function') {
      root.validateFileForKind(file, 'audio');
    }

    var note = normalizeSystemAudioUrl(root.$('#system-audio-note').value);
    var objectKey = buildSystemAudioObjectKey(slot, file);

    root.toast('Richiesta URL firmato R2 per ' + slot.key + '...', 'info');

    var uploadInfo = await root.R2WorkerService.requestUploadUrl({
      kind: 'audio',
      tagSlug: 'system-audio',
      subcategory: slot.key,
      fileName: objectKey,
      contentType: file.type || 'audio/mpeg',
      sizeBytes: file.size
    });

    root.toast('Upload R2 in corso...', 'info');

    await root.R2WorkerService.putFileToR2(
      uploadInfo.uploadUrl,
      file,
      file.type || 'audio/mpeg'
    );

    var publicUrl = normalizeSystemAudioUrl(uploadInfo.publicUrl);
    if (!publicUrl) {
      throw new Error('Upload completato ma publicUrl mancante.');
    }

    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();

    var itemPatch = {
      label: slot.label,
      role: slot.role,
      clientField: slot.key,
      fileUrl: publicUrl,
      objectKey: uploadInfo.objectKey || objectKey,
      originalFileName: file.name || null,
      contentType: file.type || 'audio/mpeg',
      sizeBytes: Number(file.size || 0),
      status: 'ACTIVE',
      cachePolicy: 'SYSTEM_AUDIO',
      note: note || null,
      uploadedAt: now,
      uploadedByUid: user.uid,
      uploadedByEmail: user.email || null,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    };

    var runtimePayload = {
      schemaVersion: 1,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      items: {}
    };

    runtimePayload.items[slot.key] = itemPatch;

    var clientPatch = {};
    clientPatch[slot.key] = publicUrl;

    await systemAudioRuntimeRef().set(runtimePayload, { merge: true });
    await systemAudioClientConfigRef().set(clientPatch, { merge: true });

    root.toast('Audio salvato e mirror client_config aggiornato: ' + slot.key, 'success');

    clearSystemAudioForm();
    await refreshSystemAudio();
  }

  async function saveSystemAudioVolumes(evt) {
    evt.preventDefault();

    var rawMusica = root.$('#system-audio-vol-musica').value;
    var rawAmbienza = root.$('#system-audio-vol-ambienza').value;

    function parseSystemAudioPercent(rawValue, label) {
      var raw = String(rawValue === undefined || rawValue === null ? '' : rawValue)
        .trim()
        .replace('%', '')
        .replace(',', '.');

      if (raw === '') {
        throw new Error('Volume ' + label + ' mancante.');
      }

      var n = Number(raw);

      if (!Number.isFinite(n)) {
        throw new Error('Volume ' + label + ' non valido. Usa valori come 0, 0,2, 0.5, 1, 5 o 100.');
      }

      if (n < 0 || n > 100) {
        throw new Error('Volume ' + label + ' non valido. Usa un numero percentuale tra 0 e 100.');
      }

      // Scala Wildu corretta:
      // 0,2 resta 0.2 nel DB, cioè 0,2%.
      // 1 resta 1 nel DB, cioè 1%.
      // La conversione in gain WebAudio /100 avviene SOLO nel client.
      return n;
    }

    var volMusica = parseSystemAudioPercent(rawMusica, 'musica');
    var volAmbienza = parseSystemAudioPercent(rawAmbienza, 'ambienza');

    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();

    await systemAudioRuntimeRef().set({
      schemaVersion: 1,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      volumes: {
        music: volMusica,
        ambience: volAmbienza,
        legacyFormat: true,
        updatedAt: now,
        updatedByUid: user.uid,
        updatedByEmail: user.email || null
      }
    }, { merge: true });

    await systemAudioClientConfigRef().set({
      vol_musica: volMusica,
      vol_ambienza: volAmbienza
    }, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, {
      vol_musica: volMusica,
      vol_ambienza: volAmbienza
    });

    root.toast('Volumi Audio App salvati e mirror client_config aggiornato.', 'success');

    await refreshSystemAudio();
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

  function normalizeCatalogTagText(value) {
    return String(value == null ? '' : value)
      .trim()
      .toLowerCase();
  }

  function getCatalogSecondaryTagFilter() {
    var input = document.getElementById('filter-secondary-tag');
    return normalizeCatalogTagText(input ? input.value : '');
  }

  function getMediaSecondaryTags(item) {
    if (!item || !Array.isArray(item.tags)) return [];

    return item.tags
      .map(function (tag) {
        return String(tag == null ? '' : tag).trim();
      })
      .filter(Boolean)
      .filter(function (tag, index, arr) {
        var key = normalizeCatalogTagText(tag);
        return arr.findIndex(function (x) {
          return normalizeCatalogTagText(x) === key;
        }) === index;
      });
  }

  function mediaMatchesSecondaryTag(item, wantedTag) {
    wantedTag = normalizeCatalogTagText(wantedTag);
    if (!wantedTag) return true;

    return getMediaSecondaryTags(item).some(function (tag) {
      var clean = normalizeCatalogTagText(tag);
      return clean === wantedTag || clean.indexOf(wantedTag) !== -1;
    });
  }

  function renderMediaSecondaryTagsHtml(item) {
    var tags = getMediaSecondaryTags(item);

    if (!tags.length) {
      return '<span class="chip">tag descr.: —</span>';
    }

    return tags.map(function (tag) {
      return '<span class="chip">#' + root.escapeHtml(tag) + '</span>';
    }).join('');
  }

  function fillCatalogSecondaryTagsDatalist(items) {
    var list = document.getElementById('catalog-secondary-tags-list');
    if (!list) return;

    var map = {};

    (Array.isArray(items) ? items : []).forEach(function (item) {
      getMediaSecondaryTags(item).forEach(function (tag) {
        var key = normalizeCatalogTagText(tag);
        if (key) map[key] = tag;
      });
    });

    list.innerHTML = Object.keys(map)
      .sort()
      .map(function (key) {
        return '<option value="' + root.escapeHtml(map[key]) + '"></option>';
      })
      .join('');
  }


  async function refreshMedia() {
    if (!root.db) return;

    var filters = {
      tagSlug: root.$('#filter-tag').value || '',
      kind: root.$('#filter-kind').value || '',
      subcategory: root.$('#filter-subcategory').value || '',
      status: root.$('#filter-status').value || '',
      visibility: root.$('#filter-visibility').value || '',

      // Il filtro "tag descrittivo" è locale.
      // Alziamo il limite per non perdere risultati prima del filtro.
      limit: 200
    };

    var secondaryTag = getCatalogSecondaryTagFilter();
    var fetchedMedia = await root.MediaService.listMedia(filters);

    fillCatalogSecondaryTagsDatalist(fetchedMedia);

    state.media = secondaryTag
      ? fetchedMedia.filter(function (item) {
          return mediaMatchesSecondaryTag(item, secondaryTag);
        })
      : fetchedMedia;

    renderMedia();
    renderDashboard();
    renderDebug();
  }

  function findMediaById(id) {
    id = String(id || '').trim();
    return state.media.find(function (item) {
      return String(item.id || '') === id;
    }) || null;
  }

  function mediaTagsToInputValue(item) {
    return Array.isArray(item && item.tags)
      ? item.tags.filter(Boolean).join(', ')
      : '';
  }

  function parseMediaTagsInput(value) {
    if (typeof root.parseTags === 'function') {
      return root.parseTags(value || '');
    }

    return String(value || '')
      .split(',')
      .map(function (x) { return x.trim().toLowerCase(); })
      .filter(Boolean)
      .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  function closeMediaMetadataEditor() {
    var modal = document.getElementById('media-metadata-modal');
    if (modal) modal.style.display = 'none';

    var form = document.getElementById('media-metadata-form');
    if (form) form.reset();
  }

  function openMediaMetadataEditor(id) {
    var item = findMediaById(id);

    if (!item) {
      root.toast('Media non trovato nel catalogo corrente. Ricarica il catalogo.', 'error');
      return;
    }

    var modal = document.getElementById('media-metadata-modal');
    if (!modal) {
      root.toast('Modale metadati non trovata: controlla index.html/cache.', 'error');
      return;
    }

    var fileLabel = [
      item.kind || '',
      item.objectKey || '',
      item.fileUrl || ''
    ].filter(Boolean).join(' | ');

    document.getElementById('media-edit-id').value = item.id || '';
    document.getElementById('media-edit-file-readonly').value = fileLabel;
    document.getElementById('media-edit-title').value = item.title || '';
    document.getElementById('media-edit-tags').value = mediaTagsToInputValue(item);
    document.getElementById('media-edit-description').value = item.description || '';
    document.getElementById('media-edit-sort').value = Number(item.sortOrder || 0);
    document.getElementById('media-edit-status').value = item.status || 'ACTIVE';
    document.getElementById('media-edit-visibility').value = item.visibility || 'PUBLIC';
    document.getElementById('media-edit-subcategory').value = item.subcategory || '';
    document.getElementById('media-edit-client-renderable').value = item.clientRenderable === false ? 'false' : 'true';
    document.getElementById('media-edit-version-note').value = item.mediaVersionNote || '';

    modal.style.display = 'flex';
  }

  async function saveMediaMetadata(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();

    var id = String(document.getElementById('media-edit-id').value || '').trim();
    if (!id) throw new Error('ID media mancante.');

    var title = String(document.getElementById('media-edit-title').value || '').trim();
    if (!title) throw new Error('Titolo obbligatorio.');

    var patch = {
      title: title,
      description: String(document.getElementById('media-edit-description').value || '').trim(),
      tags: parseMediaTagsInput(document.getElementById('media-edit-tags').value || ''),
      sortOrder: Number(document.getElementById('media-edit-sort').value || 0),
      status: document.getElementById('media-edit-status').value || 'ACTIVE',
      visibility: document.getElementById('media-edit-visibility').value || 'PUBLIC',
      subcategory: document.getElementById('media-edit-subcategory').value || null,
      clientRenderable: document.getElementById('media-edit-client-renderable').value === 'true',
      mediaVersionNote: String(document.getElementById('media-edit-version-note').value || '').trim() || null
    };

    await root.MediaService.updateMedia(id, patch);

    closeMediaMetadataEditor();

    root.toast('Metadati aggiornati. Versioni e manifesto riallineati se necessario.', 'success');

    await refreshTags();
    await refreshMedia();
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
            '<span class="chip">tag principale: ' + root.escapeHtml(item.tagSlug || '—') + '</span>' +
            renderMediaSecondaryTagsHtml(item) +
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
          '<button class="small" data-edit-media-metadata="' + root.escapeHtml(item.id) + '">Modifica metadati</button>' +
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


  function isAdminDumpText(value) {
    var raw = String(value == null ? '' : value).trim();

    return raw === 'ADMIN_TABLE_BUMP' ||
      raw === 'ADMIN_BUMP' ||
      raw === 'VERSION_BUMP';
  }

  function cleanAdminDumpText(value) {
    return isAdminDumpText(value) ? '' : String(value == null ? '' : value);
  }

  function cleanRuntimeEntryVisibleDumpFields(entry, fields, stats) {
    var src = entry && typeof entry === 'object' ? entry : {};
    var out = Object.assign({}, src);

    fields.forEach(function (field) {
      if (isAdminDumpText(out[field])) {
        out[field] = '';
        stats.cleaned++;
      }
    });

    return out;
  }

  function cleanRuntimeMapEntries(map, fields, stats) {
    var src = map && typeof map === 'object' ? map : {};
    var out = {};
    Object.keys(src).forEach(function (key) {
      out[key] = cleanRuntimeEntryVisibleDumpFields(src[key], fields, stats);
    });
    return out;
  }

  async function cleanAdminDumpsFromRuntimeDocs() {
    if (!root.db) throw new Error('Firestore non inizializzato.');
    if (!state.currentUser) throw new Error('Login richiesto.');

    var runtimeCol = root.db.collection(WILDU_MEDIA_CONFIG.collections.runtime);
    var gameRef = runtimeCol.doc('game_versions');
    var moduleRef = runtimeCol.doc('module_versions');

    var gameSnap = await gameRef.get();
    var moduleSnap = await moduleRef.get();

    var stats = {
      cleaned: 0,
      gameEntries: 0,
      moduleEntries: 0,
      docsWritten: 0
    };

    if (gameSnap.exists) {
      var gameData = gameSnap.data() || {};
      var gamePatch = {};
      var gameChanged = false;

      if (gameData.games && typeof gameData.games === 'object') {
        gamePatch.games = cleanRuntimeMapEntries(gameData.games, ['description', 'notes'], stats);
        stats.gameEntries += Object.keys(gameData.games).length;
        gameChanged = true;
      }

      // Pulizia prudente anche dei vecchi campi fantasma tipo:
      // "games.giochi/sfida-dei-sassi/index.html"
      Object.keys(gameData).forEach(function (key) {
        if (key.indexOf('games.') === 0 && gameData[key] && typeof gameData[key] === 'object') {
          gamePatch[key] = cleanRuntimeEntryVisibleDumpFields(gameData[key], ['description', 'notes'], stats);
          gameChanged = true;
        }
      });

      if (gameChanged) {
        await gameRef.set(gamePatch, { merge: true });
        stats.docsWritten++;
      }
    }

    if (moduleSnap.exists) {
      var moduleData = moduleSnap.data() || {};
      var modulePatch = {};
      var moduleChanged = false;

      if (moduleData.modules && typeof moduleData.modules === 'object') {
        modulePatch.modules = cleanRuntimeMapEntries(
          moduleData.modules,
          ['description', 'notes', 'Descrizione'],
          stats
        );
        stats.moduleEntries += Object.keys(moduleData.modules).length;
        moduleChanged = true;
      }

      // Pulizia prudente anche di eventuali vecchi campi fantasma "modules...."
      Object.keys(moduleData).forEach(function (key) {
        if (key.indexOf('modules.') === 0 && moduleData[key] && typeof moduleData[key] === 'object') {
          modulePatch[key] = cleanRuntimeEntryVisibleDumpFields(
            moduleData[key],
            ['description', 'notes', 'Descrizione'],
            stats
          );
          moduleChanged = true;
        }
      });

      if (moduleChanged) {
        await moduleRef.set(modulePatch, { merge: true });
        stats.docsWritten++;
      }
    }

    await refreshGameVersions();
    await refreshModuleVersions();

    root.toast(
      'Lavaggio completato. Dump rimossi: ' + stats.cleaned +
      ' | Giochi letti: ' + stats.gameEntries +
      ' | Moduli letti: ' + stats.moduleEntries,
      'success'
    );

    return stats;
  }


  function getClientConsoleSwitchValue() {
    return !!(
      state.partnerClientConfig &&
      state.partnerClientConfig.console_switch === true
    );
  }

  function getClientAudioDebugPanelSwitchValue() {
    return !!(
      state.partnerClientConfig &&
      state.partnerClientConfig.audio_debug_panel_switch === true
    );
  }

  function renderClientConsoleSwitchCardState() {
    var select = document.getElementById('client-console-switch');
    var audioSelect = document.getElementById('client-audio-debug-panel-switch');

    var label = document.getElementById('client-console-switch-current');
    var audioLabel = document.getElementById('client-audio-debug-panel-current');
    var updated = document.getElementById('client-console-switch-updated');

    var value = getClientConsoleSwitchValue();
    var audioValue = getClientAudioDebugPanelSwitchValue();

    if (select) {
      select.value = value ? 'true' : 'false';
    }

    if (audioSelect) {
      audioSelect.value = audioValue ? 'true' : 'false';
    }

    if (label) {
      label.innerHTML = value
        ? '<span class="badge warn">LOQUACE / DEBUG</span>'
        : '<span class="badge good">SILENZIOSO</span>';
    }

    if (audioLabel) {
      audioLabel.innerHTML = audioValue
        ? '<span class="badge warn">PANNELLO AUDIO ON</span>'
        : '<span class="badge good">PANNELLO AUDIO OFF</span>';
    }

    if (updated) {
      var cfg = state.partnerClientConfig || {};

      var who =
        cfg.console_switch_updatedByEmail ||
        cfg.audio_debug_panel_updatedByEmail ||
        cfg.console_switch_updatedByUid ||
        cfg.audio_debug_panel_updatedByUid ||
        '';

      var whenValue =
        cfg.console_switch_updatedAt ||
        cfg.audio_debug_panel_updatedAt ||
        null;

      var when = root.toDateTimeLabel && whenValue
        ? root.toDateTimeLabel(whenValue)
        : '';

      updated.textContent = who || when
        ? 'Ultimo aggiornamento: ' + [when, who].filter(Boolean).join(' — ')
        : 'Nessun aggiornamento registrato.';
    }
  }

  async function saveClientConsoleSwitchFromDebug() {
    if (!root.db) throw new Error('Firestore non inizializzato.');
    if (!state.currentUser) throw new Error('Login richiesto.');

    var select = document.getElementById('client-console-switch');
    if (!select) throw new Error('Controllo console switch non trovato.');

    var audioSelect = document.getElementById('client-audio-debug-panel-switch');

    var value = select.value === 'true';
    var audioValue = audioSelect ? audioSelect.value === 'true' : false;

    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();

    await root.db
      .collection('PARAMETERS_PARTNER')
      .doc('client_config')
      .set({
        console_switch: value,
        console_switch_updatedAt: now,
        console_switch_updatedByUid: user.uid,
        console_switch_updatedByEmail: user.email || null,

        // Switch separato: decide SOLO se mostrare il pannello audio debug nel client.
        // Il client lo userà insieme a console_switch:
        // console_switch=true + audio_debug_panel_switch=true => pannello visibile.
        audio_debug_panel_switch: audioValue,
        audio_debug_panel_updatedAt: now,
        audio_debug_panel_updatedByUid: user.uid,
        audio_debug_panel_updatedByEmail: user.email || null
      }, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, {
      console_switch: value,
      console_switch_updatedByUid: user.uid,
      console_switch_updatedByEmail: user.email || null,

      audio_debug_panel_switch: audioValue,
      audio_debug_panel_updatedByUid: user.uid,
      audio_debug_panel_updatedByEmail: user.email || null
    });

    renderClientConsoleSwitchCardState();
    renderDebug();

    root.toast(
      value
        ? (
            audioValue
              ? 'Console switch ON e pannello audio debug ON.'
              : 'Console switch ON, ma pannello audio debug OFF.'
          )
        : 'Console switch OFF: client, SW e pannello audio resteranno silenziosi.',
      'success'
    );
  }

  
    function getGlobalCacheEpochValue() {
    var cfg = state.partnerClientConfig || {};
    var raw = cfg.global_cache_epoch;

    if (raw === undefined || raw === null || raw === '') return 0;

    var n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function renderGlobalCacheNukeCardState() {
    var current = document.getElementById('global-cache-epoch-current');
    var updated = document.getElementById('global-cache-epoch-updated');
    var reasonInput = document.getElementById('global-cache-reason');

    var cfg = state.partnerClientConfig || {};
    var epoch = getGlobalCacheEpochValue();

    if (current) {
      current.innerHTML = epoch
        ? '<span class="badge warn">ATTIVO</span> <code>' + root.escapeHtml(String(epoch)) + '</code>'
        : '<span class="badge good">Mai forzato</span>';
    }

    if (updated) {
      var who = cfg.global_cache_updatedByEmail || cfg.global_cache_updatedByUid || '';
      var when = root.toDateTimeLabel ? root.toDateTimeLabel(cfg.global_cache_updatedAt) : '';
      var reason = cfg.global_cache_reason || '';

      updated.textContent = [when, who, reason].filter(Boolean).join(' — ') || 'Nessuna pulizia globale registrata.';
    }

    if (reasonInput && !String(reasonInput.value || '').trim()) {
      reasonInput.value = cfg.global_cache_reason || '';
    }
  }

  async function forceGlobalClientCacheRefreshFromDebug() {
    if (!root.db) throw new Error('Firestore non inizializzato.');
    if (!state.currentUser) throw new Error('Login richiesto.');

    var reasonInput = document.getElementById('global-cache-reason');
    var reason = reasonInput ? String(reasonInput.value || '').trim() : '';

    if (!reason) {
      reason = 'manual-admin-cache-refresh';
    }

    var ok = confirm(
      'Pulizia nucleare cache client?\n\n' +
      'I client aggiornati, al prossimo avvio, cancelleranno CacheStorage, cache pubblica, cache runtime e ricaricheranno il main index.\n\n' +
      'Motivo: ' + reason + '\n\n' +
      'Continuare?'
    );

    if (!ok) return;

    var user = root.requireCurrentUser();
    var epoch = Date.now();

    await root.db
      .collection('PARAMETERS_PARTNER')
      .doc('client_config')
      .set({
        global_cache_epoch: epoch,
        global_cache_mode: 'NUCLEAR',
        global_cache_reason: reason,
        global_cache_updatedAt: root.FieldValue.serverTimestamp(),
        global_cache_updatedByUid: user.uid,
        global_cache_updatedByEmail: user.email || null
      }, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, {
      global_cache_epoch: epoch,
      global_cache_mode: 'NUCLEAR',
      global_cache_reason: reason,
      global_cache_updatedByUid: user.uid,
      global_cache_updatedByEmail: user.email || null
    });

    renderGlobalCacheNukeCardState();
    renderDebug();

    root.toast(
      'Pulizia nucleare cache pubblicata. I client aggiornati la eseguiranno al prossimo avvio.',
      'success'
    );
  }

  function installGlobalClientCacheNukeCard() {
    var debugPanel = document.getElementById('tab-debug');
    if (!debugPanel) return;
    if (document.getElementById('wildu-global-cache-nuke-card')) return;

    var card = document.createElement('article');
    card.className = 'card';
    card.id = 'wildu-global-cache-nuke-card';
    card.innerHTML = '' +
      '<h2>☢️ Pulizia nucleare cache client</h2>' +
      '<p class="muted">' +
        'Scrive <code>global_cache_epoch</code> in <code>PARAMETERS_PARTNER/client_config</code>. ' +
        'I client aggiornati useranno questo valore per cancellare cache shell, dati pubblici, runtime moduli/giochi/media e ricaricare il main index.' +
      '</p>' +
      '<p class="small-text">' +
        'Nota: funziona sui client che hanno già ricevuto la patch di lettura <code>global_cache_epoch</code>. ' +
        'Per distribuirla la prima volta serve ancora un bump manuale di <code>version.json</code>.' +
      '</p>' +
      '<div class="form-grid">' +
        '<div class="field full">' +
          '<label for="global-cache-reason">Motivo pulizia</label>' +
          '<input id="global-cache-reason" placeholder="Esempio: audio-cors-volume-fix">' +
        '</div>' +
        '<div class="field half">' +
          '<label>Epoch attuale</label>' +
          '<div id="global-cache-epoch-current" style="padding-top:10px;">—</div>' +
        '</div>' +
        '<div class="field half">' +
          '<label>Audit</label>' +
          '<div id="global-cache-epoch-updated" class="small-text" style="padding-top:10px;">—</div>' +
        '</div>' +
        '<div class="form-actions full">' +
          '<button data-requires-auth type="button" id="btn-force-global-cache-refresh" class="danger">☢️ Forza refresh globale client</button>' +
        '</div>' +
      '</div>';

    debugPanel.insertBefore(card, debugPanel.firstChild);

    var btn = document.getElementById('btn-force-global-cache-refresh');
    if (btn) {
      btn.addEventListener('click', function () {
        run(forceGlobalClientCacheRefreshFromDebug);
      });
    }

    renderGlobalCacheNukeCardState();
  }
  
  function installClientConsoleSwitchCard() {
    var debugPanel = document.getElementById('tab-debug');
    if (!debugPanel) return;
    if (document.getElementById('wildu-client-console-switch-card')) return;

    var card = document.createElement('article');
    card.className = 'card';
    card.id = 'wildu-client-console-switch-card';
    card.innerHTML = '' +
      '<h2>🎛️ Console switch client / Service Worker</h2>' +
      '<p class="muted">' +
        'Scrive <code>console_switch</code> e <code>audio_debug_panel_switch</code> in <code>PARAMETERS_PARTNER/client_config</code>. ' +
        'Il primo controlla log/debug generali; il secondo decide solo se mostrare il pannello audio debug nel client.' +
      '</p>' +
      '<p class="small-text">' +
        'Regola consigliata: tieni <code>console_switch=true</code> solo durante debug. ' +
        'Accendi <code>audio_debug_panel_switch=true</code> solo quando vuoi vedere il pannello audio su smartphone.' +
      '</p>' +
      '<div class="form-grid">' +

        '<div class="field third">' +
          '<label for="client-console-switch">Console switch</label>' +
          '<select id="client-console-switch">' +
            '<option value="false">false — SW/log silenziosi</option>' +
            '<option value="true">true — SW/log loquaci</option>' +
          '</select>' +
        '</div>' +
        '<div class="field third">' +
          '<label>Stato console</label>' +
          '<div id="client-console-switch-current" style="padding-top:10px;">—</div>' +
        '</div>' +
        '<div class="field third">' +
          '<label>Audit</label>' +
          '<div id="client-console-switch-updated" class="small-text" style="padding-top:10px;">—</div>' +
        '</div>' +

        '<div class="field third">' +
          '<label for="client-audio-debug-panel-switch">Pannello audio debug</label>' +
          '<select id="client-audio-debug-panel-switch">' +
            '<option value="false">false — pannello nascosto</option>' +
            '<option value="true">true — pannello visibile</option>' +
          '</select>' +
        '</div>' +
        '<div class="field third">' +
          '<label>Stato pannello audio</label>' +
          '<div id="client-audio-debug-panel-current" style="padding-top:10px;">—</div>' +
        '</div>' +
        '<div class="field third">' +
          '<label>Regola</label>' +
          '<div class="small-text" style="padding-top:10px;">Il pannello audio si apre solo se entrambi gli switch sono ON.</div>' +
        '</div>' +

        '<div class="form-actions full">' +
          '<button data-requires-auth type="button" id="btn-save-client-console-switch">Salva switch client</button>' +
        '</div>' +
      '</div>';

    debugPanel.insertBefore(card, debugPanel.firstChild);

    var btn = document.getElementById('btn-save-client-console-switch');
    if (btn) {
      btn.addEventListener('click', function () {
        run(saveClientConsoleSwitchFromDebug);
      });
    }

    renderClientConsoleSwitchCardState();
  }


  function installAdminDumpCleanerButton() {
    var debugPanel = document.getElementById('tab-debug');
    if (!debugPanel) return;
    if (document.getElementById('btn-clean-admin-dumps')) return;

    var card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = '' +
      '<h2>🧼 Pulizia dump tecnici</h2>' +
      '<p class="muted">' +
        'Rimuove dai manifesti runtime le vecchie scritte tecniche ' +
        '<code>ADMIN_TABLE_BUMP</code>, <code>ADMIN_BUMP</code> e <code>VERSION_BUMP</code> ' +
        'da descrizioni e note visibili.' +
      '</p>' +
      '<p class="small-text">' +
        'Tocca solo <code>wildu_media_runtime/game_versions</code> e ' +
        '<code>wildu_media_runtime/module_versions</code>. Non tocca R2, catalogo media, tag o public_versions.' +
      '</p>' +
      '<div class="form-actions">' +
        '<button data-requires-auth type="button" id="btn-clean-admin-dumps">Lava dump tecnici</button>' +
      '</div>';

    debugPanel.insertBefore(card, debugPanel.firstChild);

    var btn = document.getElementById('btn-clean-admin-dumps');
    if (btn) {
      btn.addEventListener('click', function () {
        run(cleanAdminDumpsFromRuntimeDocs);
      });
    }
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
    '<td><strong>' + root.escapeHtml(item.title || item.url) + '</strong><br><span class="small-text">' + root.escapeHtml(cleanAdminDumpText(item.description || item.notes || '')) + '</span></td>' +
    '<td><code>' + root.escapeHtml(item.url || '') + '</code><br><span class="small-text">Modulo: ' + root.escapeHtml(item.moduleUrl || '—') + '</span></td>' +
    '<td><span class="badge">' + root.escapeHtml(item.openMode || 'secure_iframe') + '</span></td>' +
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
        '<td><strong>' + root.escapeHtml(item.title || item.Titolo || item.url) + '</strong><br><span class="small-text">' + root.escapeHtml(cleanAdminDumpText(item.description || item.Descrizione || item.notes || '')) + '</span></td>' +
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

      // Decide come il launcher giochi aprirà questo gioco.
      // Default consigliato: secure_iframe.
      openMode: root.$('#game-open-mode') ? root.$('#game-open-mode').value : 'secure_iframe',

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

    if (root.$('#game-open-mode')) {
      root.$('#game-open-mode').value = item.openMode || item.open_mode || 'secure_iframe';
    }

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


  function normalizeWilduModuleTechnicalUrl(rawLink) {
    var raw = String(rawLink || '').trim();
    if (!raw) return '';

    try {
      var parsed = new URL(raw, window.location.href);
      var path = String(parsed.pathname || '');

      // Caso principale: link reale GitHub Pages dentro /Wild-U/
      // https://wildustrek.github.io/Wild-U/wildu-map-suite/wildu-map-viewer/
      // -> wildu-map-suite/wildu-map-viewer/
      if (
        parsed.hostname === 'wildustrek.github.io' &&
        /^\/Wild-U\//i.test(path)
      ) {
        return path
          .replace(/^\/+/, '')
          .replace(/^Wild-U\//i, '')
          .split('?')[0]
          .split('#')[0];
      }

      // Caso same-origin GitHub Pages o path assoluto già interno.
      if (
        parsed.origin === window.location.origin &&
        /^\/Wild-U\//i.test(path)
      ) {
        return path
          .replace(/^\/+/, '')
          .replace(/^Wild-U\//i, '')
          .split('?')[0]
          .split('#')[0];
      }

      // Per URL assoluti esterni, manteniamo il link intero come chiave tecnica.
      // Non è il caso normale, ma non lo distruggiamo.
      if (/^https?:\/\//i.test(raw)) {
        return raw.split('#')[0];
      }
    } catch (e) {}

    // Path relativo interno:
    // ./modules/x.html -> modules/x.html
    // /Wild-U/modules/x.html -> modules/x.html
    return raw
      .split('?')[0]
      .split('#')[0]
      .replace(/^\/+/, '')
      .replace(/^Wild-U\//i, '')
      .replace(/^\.\//, '');
  }

  function syncModuleTechnicalUrlFromExecutableLink() {
    var linkInput = root.$('#module-link-resource');
    var urlInput = root.$('#module-url');

    if (!linkInput || !urlInput) return;

    var executableLink = String(linkInput.value || '').trim();
    var technicalUrl = normalizeWilduModuleTechnicalUrl(executableLink);

    urlInput.value = technicalUrl;

    var cacheInput = root.$('#module-cache-scope');
    if (cacheInput && !String(cacheInput.value || '').trim() && technicalUrl) {
      cacheInput.value = technicalUrl;
    }

    var needlesInput = root.$('#module-clear-needles');
    if (needlesInput && !String(needlesInput.value || '').trim() && technicalUrl) {
      needlesInput.value = technicalUrl;
    }
  }
  
  function readModuleForm() {
    var title = root.$('#module-title').value;
    var executableLink = String(root.$('#module-link-resource').value || '').trim();
    var technicalUrl = normalizeWilduModuleTechnicalUrl(executableLink);
    var rev = root.$('#module-rev').value;
    var description = root.$('#module-description').value;

    if (!executableLink) {
      throw new Error('Incolla il Link eseguibile reale del modulo.');
    }

    if (!technicalUrl) {
      throw new Error('Non riesco a generare l’URL tecnico dal link eseguibile.');
    }

    root.$('#module-url').value = technicalUrl;

    return {
      title: title,
      url: technicalUrl,
      rev: rev,
      enabled: root.$('#module-enabled').value === 'true',

      renderer: root.$('#module-renderer').value,
      openMode: root.$('#module-open-mode') ? root.$('#module-open-mode').value : 'module',
      description: description,
      cacheScope: root.$('#module-cache-scope').value || technicalUrl,

      extraUrls: root.$('#module-extra-urls').value,
      clearNeedles: root.$('#module-clear-needles').value || technicalUrl,

      // Campi compatibili/client-facing.
      Titolo: title,
      Descrizione: description,
      Categoria: root.$('#module-category').value,
      Grado_Minimo: root.$('#module-grade').value,

      // Questo è il link reale che il client userà per aprire.
      Link_Risorsa: executableLink,

      Audio: root.$('#module-audio').value,
      Regione: root.$('#module-region').value,
      link_interni: parseModuleInternalLinksInput(root.$('#module-internal-links').value),
      module_rev: String(Math.max(1, parseInt(rev, 10) || 1))
    };
  }

  function fillModuleForm(item) {
    item = item || {};
    root.$('#module-title').value = item.title || item.Titolo || '';

    var executableLink = item.Link_Risorsa || item.linkRisorsa || item.url || '';
    root.$('#module-link-resource').value = executableLink;
    root.$('#module-url').value = normalizeWilduModuleTechnicalUrl(executableLink);

    root.$('#module-rev').value = Number(item.rev || item.module_rev || 1);
    
    root.$('#module-enabled').value = item.enabled === false ? 'false' : 'true';
root.$('#module-renderer').value = item.renderer || 'module-html';

if (root.$('#module-open-mode')) {
  root.$('#module-open-mode').value = item.openMode || item.open_mode || 'module';
}

root.$('#module-description').value = item.description || item.Descrizione || item.notes || '';
    root.$('#module-cache-scope').value = item.cacheScope || '';
    root.$('#module-extra-urls').value = Array.isArray(item.extraUrls) ? item.extraUrls.join(', ') : '';
    root.$('#module-clear-needles').value = Array.isArray(item.clearNeedles) ? item.clearNeedles.join(', ') : '';

    root.$('#module-category').value = item.Categoria || '';
    root.$('#module-audio').value = item.Audio || '';
    root.$('#module-region').value = item.Regione || '';
 
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
    await root.RuntimeService.bumpGame(url, '');
    root.toast('Versione gioco incrementata: ' + url, 'success');
    await refreshGameVersions();
  }

  async function bumpSelectedModuleVersion() {
    var url = root.$('#module-url').value;
    await root.RuntimeService.bumpModule(url, '');
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
    await root.RuntimeService.bumpGame(url, '');
    root.toast('Versione gioco incrementata: ' + url, 'success');
    await refreshGameVersions();
  }

  async function bumpModuleFromTable(url) {
    await root.RuntimeService.bumpModule(url, '');
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
      systemAudio: state.systemAudio,
      systemAudioItems: state.systemAudioItems,
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
    
    installAdminDumpCleanerButton(); //AGGIUNTA PERICOLOSA
    installClientConsoleSwitchCard();
    installGlobalClientCacheNukeCard();
    
    var instructionsBtn = document.getElementById('btn-open-instructions');
    if (instructionsBtn) {
      instructionsBtn.addEventListener('click', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        if (typeof root.openInstructions === 'function') {
          root.openInstructions();

          var statusLine = document.getElementById('status-line');
          if (statusLine) statusLine.textContent = 'Istruzioni aperte.';
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

    var refreshSystemAudioBtn = root.$('#btn-refresh-system-audio');
    if (refreshSystemAudioBtn) {
      refreshSystemAudioBtn.addEventListener('click', function () { run(refreshSystemAudio); });
    }

    var systemAudioForm = root.$('#system-audio-form');
    if (systemAudioForm) {
      systemAudioForm.addEventListener('submit', function (evt) { run(uploadSystemAudioSlot, evt); });
    }

    var systemAudioVolumeForm = root.$('#system-audio-volume-form');
    if (systemAudioVolumeForm) {
      systemAudioVolumeForm.addEventListener('submit', function (evt) { run(saveSystemAudioVolumes, evt); });
    }

    var cancelSystemAudioBtn = root.$('#btn-system-audio-cancel');
    if (cancelSystemAudioBtn) {
      cancelSystemAudioBtn.addEventListener('click', clearSystemAudioForm);
    }

    var moduleExecutableLinkInput = root.$('#module-link-resource');
    if (moduleExecutableLinkInput) {
      moduleExecutableLinkInput.addEventListener('input', syncModuleTechnicalUrlFromExecutableLink);
      moduleExecutableLinkInput.addEventListener('blur', syncModuleTechnicalUrlFromExecutableLink);
      moduleExecutableLinkInput.addEventListener('paste', function () {
        setTimeout(syncModuleTechnicalUrlFromExecutableLink, 0);
      });
    }

    root.$('#catalog-filters').addEventListener('change', function () { run(refreshMedia); });
        var mediaMetadataForm = document.getElementById('media-metadata-form');
    if (mediaMetadataForm) {
      mediaMetadataForm.addEventListener('submit', function (evt) {
        run(saveMediaMetadata, evt);
      });
    }

    var mediaMetadataCancelBtn = document.getElementById('btn-media-metadata-cancel');
    if (mediaMetadataCancelBtn) {
      mediaMetadataCancelBtn.addEventListener('click', function () {
        closeMediaMetadataEditor();
      });
    }

    var mediaMetadataModal = document.getElementById('media-metadata-modal');
    if (mediaMetadataModal) {
      mediaMetadataModal.addEventListener('click', function (evt) {
        if (evt.target === mediaMetadataModal) closeMediaMetadataEditor();
      });
    }
        var secondaryTagFilter = document.getElementById('filter-secondary-tag');
    if (secondaryTagFilter) {
      secondaryTagFilter.addEventListener('input', function () {
        run(refreshMedia);
      });
    }
    document.body.addEventListener('click', function (evt) {
      var editBtn = evt.target.closest('[data-edit-tag]');
      if (editBtn) return editTag(editBtn.dataset.editTag);

      var toggleBtn = evt.target.closest('[data-toggle-tag]');
      if (toggleBtn) return run(toggleTag, toggleBtn.dataset.toggleTag, toggleBtn.dataset.nextStatus);

      var openBtn = evt.target.closest('[data-open-url]');
      if (openBtn) return window.open(openBtn.dataset.openUrl, '_blank', 'noopener');

            var editMediaMetadataBtn = evt.target.closest('[data-edit-media-metadata]');
      if (editMediaMetadataBtn) return openMediaMetadataEditor(editMediaMetadataBtn.dataset.editMediaMetadata);

      var editGameBtn = evt.target.closest('[data-edit-game]');
      if (editGameBtn) return fillGameForm(findGameVersion(editGameBtn.dataset.editGame));

      var bumpGameBtn = evt.target.closest('[data-bump-game]');
      if (bumpGameBtn) return run(bumpGameFromTable, bumpGameBtn.dataset.bumpGame);

      var editModuleBtn = evt.target.closest('[data-edit-module-version]');
      if (editModuleBtn) return fillModuleForm(findModuleVersion(editModuleBtn.dataset.editModuleVersion));

      var bumpModuleBtn = evt.target.closest('[data-bump-module]');
      if (bumpModuleBtn) return run(bumpModuleFromTable, bumpModuleBtn.dataset.bumpModule);

      var editSystemAudioBtn = evt.target.closest('[data-edit-system-audio]');
      if (editSystemAudioBtn) return fillSystemAudioForm(editSystemAudioBtn.dataset.editSystemAudio);

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
          await refreshSystemAudio();
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
        state.systemAudio = null;
        state.systemAudioItems = [];
        
        renderTags();
        renderMedia();
        renderGameVersions();
        renderModuleVersions();
        renderSystemAudio();
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
