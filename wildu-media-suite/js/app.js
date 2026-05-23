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
    renderLibraryClientSettingsCardState();
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
    if (select) {
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

    renderLibraryBookRequiredGradeOptions();
  }

  function getBibliotecaTagFromState() {
    return (state.tags || []).find(function (tag) {
      return tag && tag.tagSlug === 'biblioteca';
    }) || null;
  }

  function renderLibraryBookRequiredGradeOptions() {
    var select = document.getElementById('library-books-required-grade');
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

    if (current) {
      var exists = options.some(function (item) {
        return item.value === current;
      });

      if (!exists) {
        var opt = document.createElement('option');
        opt.value = current;
        opt.textContent = current + ' (salvato)';
        select.appendChild(opt);
      }

      select.value = current;
    }
  }

  function renderLibraryClientSettingsCardState() {
    var tag = getBibliotecaTagFromState();

    renderLibraryBookRequiredGradeOptions();

    var gradeSelect = document.getElementById('library-books-required-grade');
    var newsInput = document.getElementById('library-real-news');
    var currentBox = document.getElementById('library-client-settings-current');

    if (!gradeSelect && !newsInput && !currentBox) return;

    var savedGrade = tag ? String(tag.bookRequiredGrade || '').trim() : '';
    var savedNews = tag ? String(tag.real_news || '').trim() : '';

    if (gradeSelect) {
      if (savedGrade) {
        var exists = Array.prototype.some.call(gradeSelect.options, function (opt) {
          return opt.value === savedGrade;
        });

        if (!exists) {
          var opt = document.createElement('option');
          opt.value = savedGrade;
          opt.textContent = savedGrade + ' (salvato)';
          gradeSelect.appendChild(opt);
        }
      }

      gradeSelect.value = savedGrade;
    }

    if (newsInput) {
      newsInput.value = savedNews;
    }

    if (currentBox) {
      currentBox.innerHTML =
        '<span class="chip">Libri: ' + root.escapeHtml(savedGrade || 'pubblico') + '</span> ' +
        '<span class="chip">real_news: ' + (savedNews ? 'presente' : 'vuoto') + '</span>';
    }
  }

  async function saveLibraryClientSettingsFromForm(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();

    if (!root.TagService || typeof root.TagService.updateBibliotecaClientSettings !== 'function') {
      throw new Error('TagService non aggiornato: manca updateBibliotecaClientSettings(). Controlla cache/versione bootstrap.');
    }

    var gradeSelect = document.getElementById('library-books-required-grade');
    var newsInput = document.getElementById('library-real-news');

    await root.TagService.updateBibliotecaClientSettings({
      bookRequiredGrade: gradeSelect ? gradeSelect.value : '',
      real_news: newsInput ? newsInput.value : ''
    });

    root.toast('Impostazioni Biblioteca salvate e public_versions.meta.biblioteca aggiornato.', 'success');

    await refreshTags();
  }

  // =========================================================
  // CLIENT APP CONFIG — Biblioteca Libri + real_news + YouTube playlist video
  // =========================================================
  // Fonte:
  // - PARAMETERS_PARTNER/client_config.biblioteca_libri_grado_minimo
  // - PARAMETERS_PARTNER/client_config.real_news
  // - PARAMETERS_PARTNER/client_config.youtube_video_horizontal_playlist_id
  //
  // Nota:
  // Non tocca catalogo media, R2, tag, giochi o moduli.
  // È configurazione globale della client app.
  // La playlist YouTube orizzontale viene salvata come ID pulito; nessun token GitHub nel frontend.

  var WILDU_YOUTUBE_GAS_BRIDGE_URL = 'https://script.google.com/macros/s/AKfycbw67v1hxoezw56hO6M6vSPG8IMGQKaFiRt7I4PhvI-DENy9GpS7VXG8RG7uWPI81LTyVA/exec';

  function getClientBooksMinGradeValue() {
    var cfg = state.partnerClientConfig || {};
    return String(cfg.biblioteca_libri_grado_minimo || '').trim();
  }

  function sanitizeYoutubePlaylistId(value) {
    var raw = String(value === undefined || value === null ? '' : value)
      .trim()
      .replace(/^["']+|["']+$/g, '');

    if (!raw) return '';

    // Playlist ID YouTube reali: PL..., UU..., OLAK5uy..., RD..., ecc.
    // Manteniamo solo caratteri ammessi negli ID pubblici.
    raw = raw.replace(/[^a-zA-Z0-9_-]/g, '');

    if (raw.length < 10 || raw.length > 120) return '';

    return raw;
  }

  function extractYoutubePlaylistId(value) {
    var raw = String(value === undefined || value === null ? '' : value)
      .trim()
      .replace(/&amp;/g, '&');

    if (!raw) return '';

    // Caso 1: l'admin incolla direttamente l'ID playlist.
    if (/^[a-zA-Z0-9_-]{10,120}$/.test(raw) && raw.indexOf('http') !== 0 && raw.indexOf('/') === -1) {
      return sanitizeYoutubePlaylistId(raw);
    }

    // Caso 2: URL completo YouTube con parametro list=...
    try {
      var parsed = new URL(raw, window.location.href);
      var fromListParam = parsed.searchParams.get('list');
      if (fromListParam) {
        return sanitizeYoutubePlaylistId(fromListParam);
      }
    } catch (e) {}

    // Caso 3: fallback regex per URL incollati parziali o con escaping strano.
    var listMatch = raw.match(/[?&]list=([a-zA-Z0-9_-]{10,120})/);
    if (listMatch && listMatch[1]) {
      return sanitizeYoutubePlaylistId(listMatch[1]);
    }

    // Caso 4: alcune forme custom /playlist/<id> o /videoseries/<id>.
    var pathMatch = raw.match(/\/(?:playlist|videoseries)\/([a-zA-Z0-9_-]{10,120})(?:[/?#&]|$)/i);
    if (pathMatch && pathMatch[1]) {
      return sanitizeYoutubePlaylistId(pathMatch[1]);
    }

    return '';
  }

  function getClientYoutubeShortsPlaylistIdValue() {
    var cfg = state.partnerClientConfig || {};

    return String(
      cfg.youtube_wildwall_shorts_playlist_id ||
      cfg.youtube_shorts_playlist_id ||
      cfg.WILDU_SHORTS_PLAYLIST_ID ||
      ''
    ).trim();
  }

  function getClientYoutubeShortsPlaylistRawValue() {
    var cfg = state.partnerClientConfig || {};
    return String(
      cfg.youtube_wildwall_shorts_playlist_raw ||
      cfg.youtube_wildwall_shorts_playlist_url ||
      getClientYoutubeShortsPlaylistIdValue() ||
      ''
    ).trim();
  }

  function getClientYoutubeHorizontalPlaylistIdValue() {
    var cfg = state.partnerClientConfig || {};

    return String(
      cfg.youtube_video_horizontal_playlist_id ||
      cfg.youtube_horizontal_playlist_id ||
      cfg.WILDU_HORIZONTAL_PLAYLIST_ID ||
      ''
    ).trim();
  }

  function getClientYoutubeHorizontalPlaylistRawValue() {
    var cfg = state.partnerClientConfig || {};
    return String(
      cfg.youtube_video_horizontal_playlist_raw ||
      cfg.youtube_video_horizontal_playlist_url ||
      getClientYoutubeHorizontalPlaylistIdValue() ||
      ''
    ).trim();
  }

  function syncYoutubePlaylistFields(rawId, normalizedId, options) {
    options = options || {};

    var rawInput = document.getElementById(rawId);
    var idInput = document.getElementById(normalizedId);

    if (!rawInput && !idInput) return '';

    var raw = rawInput ? String(rawInput.value || '').trim() : '';
    var id = extractYoutubePlaylistId(raw);

    if (idInput) {
      idInput.value = id;
    }

    if (options.rewriteInput === true && rawInput && id) {
      rawInput.value = id;
    }

    return id;
  }

  function syncClientYoutubeShortsPlaylistFields(options) {
    return syncYoutubePlaylistFields(
      'client-youtube-shorts-playlist-url',
      'client-youtube-shorts-playlist-id',
      options
    );
  }

  function syncClientYoutubeHorizontalPlaylistFields(options) {
    return syncYoutubePlaylistFields(
      'client-youtube-horizontal-playlist-url',
      'client-youtube-horizontal-playlist-id',
      options
    );
  }

  function syncClientYoutubePlaylistFields(options) {
    return {
      shortsPlaylistId: syncClientYoutubeShortsPlaylistFields(options),
      horizontalPlaylistId: syncClientYoutubeHorizontalPlaylistFields(options)
    };
  }

  function renderClientBooksGradeOptions() {
    var select = document.getElementById('client-books-min-grade');
    if (!select) return;

    var current = select.value || getClientBooksMinGradeValue();
    var options = state.moduleGradeOptions || [];

    select.innerHTML =
      '<option value="">Nessun grado / pubblico</option>' +
      options.map(function (item) {
        return '<option value="' + root.escapeHtml(item.value) + '">' +
          root.escapeHtml(item.label) +
          '</option>';
      }).join('');

    if (current) {
      var exists = Array.prototype.some.call(select.options, function (opt) {
        return opt.value === current;
      });

      if (!exists) {
        var opt = document.createElement('option');
        opt.value = current;
        opt.textContent = current + ' (salvato)';
        select.appendChild(opt);
      }

      select.value = current;
    }
  }

  function renderClientContentConfigState() {
    var cfg = state.partnerClientConfig || {};

    renderClientBooksGradeOptions();

    var newsField = document.getElementById('client-real-news');
    if (newsField && document.activeElement !== newsField) {
      newsField.value = String(cfg.real_news || '');
    }

    var rawShortsPlaylistField = document.getElementById('client-youtube-shorts-playlist-url');
    if (rawShortsPlaylistField && document.activeElement !== rawShortsPlaylistField) {
      rawShortsPlaylistField.value = getClientYoutubeShortsPlaylistRawValue();
    }

    var shortsPlaylistIdField = document.getElementById('client-youtube-shorts-playlist-id');
    if (shortsPlaylistIdField) {
      shortsPlaylistIdField.value = getClientYoutubeShortsPlaylistIdValue();
    }

    var rawPlaylistField = document.getElementById('client-youtube-horizontal-playlist-url');
    if (rawPlaylistField && document.activeElement !== rawPlaylistField) {
      rawPlaylistField.value = getClientYoutubeHorizontalPlaylistRawValue();
    }

    var playlistIdField = document.getElementById('client-youtube-horizontal-playlist-id');
    if (playlistIdField) {
      playlistIdField.value = getClientYoutubeHorizontalPlaylistIdValue();
    }

    var current = document.getElementById('client-content-config-current');
    if (!current) return;

    var grade = getClientBooksMinGradeValue();
    var news = String(cfg.real_news || '').trim();
    var shortsPlaylistId = getClientYoutubeShortsPlaylistIdValue();
    var playlistId = getClientYoutubeHorizontalPlaylistIdValue();

    var updatedBy = cfg.client_content_config_updatedByEmail ||
      cfg.youtube_playlists_updatedByEmail ||
      cfg.youtube_wildwall_shorts_playlist_updatedByEmail ||
      cfg.youtube_video_horizontal_playlist_updatedByEmail ||
      cfg.client_content_config_updatedByUid ||
      cfg.youtube_playlists_updatedByUid ||
      cfg.youtube_wildwall_shorts_playlist_updatedByUid ||
      cfg.youtube_video_horizontal_playlist_updatedByUid ||
      '';

    var updatedAt = root.toDateTimeLabel
      ? root.toDateTimeLabel(
          cfg.client_content_config_updatedAt ||
          cfg.youtube_playlists_updatedAt ||
          cfg.youtube_wildwall_shorts_playlist_updatedAt ||
          cfg.youtube_video_horizontal_playlist_updatedAt
        )
      : '';

    current.innerHTML =
      '<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">' +
        '<span class="badge ' + (grade ? 'warn' : 'good') + '">' +
          'Libri: ' + root.escapeHtml(grade || 'pubblici / nessun grado') +
        '</span>' +
        '<span class="badge ' + (news ? 'good' : 'warn') + '">' +
          'real_news: ' + root.escapeHtml(news ? 'presente' : 'vuota') +
        '</span>' +
        '<span class="badge ' + (shortsPlaylistId ? 'good' : 'warn') + '">' +
          'playlist verticale: ' + root.escapeHtml(shortsPlaylistId ? 'configurata' : 'vuota') +
        '</span>' +
        '<span class="badge ' + (playlistId ? 'good' : 'warn') + '">' +
          'playlist orizzontale: ' + root.escapeHtml(playlistId ? 'configurata' : 'vuota') +
        '</span>' +
      '</div>' +
      (shortsPlaylistId
        ? '<div style="margin-top:8px;">ID playlist verticale/WildWall: <code>' + root.escapeHtml(shortsPlaylistId) + '</code></div>'
        : '') +
      (playlistId
        ? '<div style="margin-top:8px;">ID playlist orizzontale: <code>' + root.escapeHtml(playlistId) + '</code></div>'
        : '') +
      '<div style="margin-top:8px;">' +
        root.escapeHtml(
          [updatedAt, updatedBy].filter(Boolean).join(' — ') ||
          'Nessun aggiornamento registrato.'
        ) +
      '</div>';
  }

  async function refreshClientContentConfig() {
    if (!root.db) throw new Error('Firestore non inizializzato.');

    var snap = await root.db
      .collection('PARAMETERS_PARTNER')
      .doc('client_config')
      .get();

    state.partnerClientConfig = snap.exists ? (snap.data() || {}) : {};

    state.moduleGradeOptions = buildModuleGradeOptions(
      state.partnerClientConfig,
      state.legacyModuleResources
    );

    renderModuleGradeOptions();
    renderClientContentConfigState();
    renderClientConsoleSwitchCardState();
    renderGlobalCacheNukeCardState();
    renderDebug();

    root.toast('Config client ricaricata.', 'success');
  }

  async function saveClientYoutubeHorizontalPlaylistOnly() {
    if (!root.db) throw new Error('Firestore non inizializzato.');
    if (!state.currentUser) throw new Error('Login richiesto.');

    var shortsRawField = document.getElementById('client-youtube-shorts-playlist-url');
    var horizontalRawField = document.getElementById('client-youtube-horizontal-playlist-url');

    var shortsRaw = shortsRawField ? String(shortsRawField.value || '').trim() : '';
    var horizontalRaw = horizontalRawField ? String(horizontalRawField.value || '').trim() : '';

    var shortsPlaylistId = extractYoutubePlaylistId(shortsRaw);
    var horizontalPlaylistId = extractYoutubePlaylistId(horizontalRaw);

    if (shortsRaw && !shortsPlaylistId) {
      throw new Error('Playlist YouTube verticale/WildWall non valida. Incolla un URL playlist con parametro list=... oppure un ID playlist.');
    }

    if (horizontalRaw && !horizontalPlaylistId) {
      throw new Error('Playlist YouTube orizzontale non valida. Incolla un URL playlist con parametro list=... oppure un ID playlist.');
    }

    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();

    var patch = {
      youtube_wildwall_shorts_playlist_id: shortsPlaylistId,
      youtube_wildwall_shorts_playlist_raw: shortsRaw,
      youtube_wildwall_shorts_playlist_updatedAt: now,
      youtube_wildwall_shorts_playlist_updatedByUid: user.uid,
      youtube_wildwall_shorts_playlist_updatedByEmail: user.email || null,

      youtube_video_horizontal_playlist_id: horizontalPlaylistId,
      youtube_video_horizontal_playlist_raw: horizontalRaw,
      youtube_video_horizontal_playlist_updatedAt: now,
      youtube_video_horizontal_playlist_updatedByUid: user.uid,
      youtube_video_horizontal_playlist_updatedByEmail: user.email || null,

      youtube_playlists_updatedAt: now,
      youtube_playlists_updatedByUid: user.uid,
      youtube_playlists_updatedByEmail: user.email || null
    };

    await root.db
      .collection('PARAMETERS_PARTNER')
      .doc('client_config')
      .set(patch, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, {
      youtube_wildwall_shorts_playlist_id: shortsPlaylistId,
      youtube_wildwall_shorts_playlist_raw: shortsRaw,
      youtube_wildwall_shorts_playlist_updatedByUid: user.uid,
      youtube_wildwall_shorts_playlist_updatedByEmail: user.email || null,

      youtube_video_horizontal_playlist_id: horizontalPlaylistId,
      youtube_video_horizontal_playlist_raw: horizontalRaw,
      youtube_video_horizontal_playlist_updatedByUid: user.uid,
      youtube_video_horizontal_playlist_updatedByEmail: user.email || null,

      youtube_playlists_updatedByUid: user.uid,
      youtube_playlists_updatedByEmail: user.email || null
    });

    var shortsIdField = document.getElementById('client-youtube-shorts-playlist-id');
    if (shortsIdField) shortsIdField.value = shortsPlaylistId;

    var idField = document.getElementById('client-youtube-horizontal-playlist-id');
    if (idField) idField.value = horizontalPlaylistId;

    renderClientContentConfigState();
    renderDebug();

    root.toast(
      'Playlist YouTube salvate. Verticale: ' + (shortsPlaylistId || 'vuota') +
      ' | Orizzontale: ' + (horizontalPlaylistId || 'vuota'),
      'success'
    );
  }

  async function copyClientYoutubeShortsPlaylistId() {
    var id = syncClientYoutubeShortsPlaylistFields();

    if (!id) {
      id = getClientYoutubeShortsPlaylistIdValue();
    }

    if (!id) {
      throw new Error('Nessun ID playlist verticale da copiare.');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(id);
      root.toast('ID playlist verticale copiato: ' + id, 'success');
      return;
    }

    window.prompt('Copia manualmente questo ID playlist verticale:', id);
  }

  async function copyClientYoutubeHorizontalPlaylistId() {
    var id = syncClientYoutubeHorizontalPlaylistFields();

    if (!id) {
      id = getClientYoutubeHorizontalPlaylistIdValue();
    }

    if (!id) {
      throw new Error('Nessun ID playlist orizzontale da copiare.');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(id);
      root.toast('ID playlist orizzontale copiato: ' + id, 'success');
      return;
    }

    window.prompt('Copia manualmente questo ID playlist orizzontale:', id);
  }

  function openClientYoutubeGasBridge() {
    var ids = syncClientYoutubePlaylistFields({ rewriteInput: false });
    var shortsPlaylistId = ids.shortsPlaylistId || getClientYoutubeShortsPlaylistIdValue();
    var horizontalPlaylistId = ids.horizontalPlaylistId || getClientYoutubeHorizontalPlaylistIdValue();

    if (!shortsPlaylistId && !horizontalPlaylistId) {
      throw new Error('Prima inserisci almeno una playlist YouTube valida: verticale/WildWall oppure orizzontale.');
    }

    var url = WILDU_YOUTUBE_GAS_BRIDGE_URL +
      '?shortsPlaylistId=' + encodeURIComponent(shortsPlaylistId || '') +
      '&horizontalPlaylistId=' + encodeURIComponent(horizontalPlaylistId || '');

    var opened = window.open(url, '_blank', 'noopener=no');

    if (!opened) {
      window.location.href = url;
      return;
    }

    root.toast('Bridge GAS aperto. Conferma il lancio nella nuova scheda privata.', 'info');
  }

  function handleYoutubeGasBridgeMessage(evt) {
    var data = evt && evt.data;
    if (!data || data.source !== 'wildu-youtube-gas-bridge') return;

    if (data.ok) {
      root.toast('Bridge GAS: workflow YouTube avviato correttamente.', 'success');
    } else {
      root.toast('Bridge GAS: errore. Controlla la scheda GAS per istruzioni token/permessi.', 'error');
    }
  }

  async function saveClientContentConfig(evt) {
    if (evt && evt.preventDefault) evt.preventDefault();

    if (!root.db) throw new Error('Firestore non inizializzato.');
    if (!state.currentUser) throw new Error('Login richiesto.');

    var gradeSelect = document.getElementById('client-books-min-grade');
    var newsField = document.getElementById('client-real-news');
    var youtubeShortsPlaylistField = document.getElementById('client-youtube-shorts-playlist-url');
    var youtubePlaylistField = document.getElementById('client-youtube-horizontal-playlist-url');

    var grade = gradeSelect ? String(gradeSelect.value || '').trim() : '';
    var realNews = newsField ? String(newsField.value || '').trim() : '';
    var youtubeShortsRaw = youtubeShortsPlaylistField ? String(youtubeShortsPlaylistField.value || '').trim() : '';
    var youtubeRaw = youtubePlaylistField ? String(youtubePlaylistField.value || '').trim() : '';

    var youtubeShortsPlaylistId = extractYoutubePlaylistId(youtubeShortsRaw);
    var youtubePlaylistId = extractYoutubePlaylistId(youtubeRaw);

    if (youtubeShortsRaw && !youtubeShortsPlaylistId) {
      throw new Error('Playlist YouTube verticale/WildWall non valida. Incolla un URL playlist con parametro list=... oppure un ID playlist.');
    }

    if (youtubeRaw && !youtubePlaylistId) {
      throw new Error('Playlist YouTube orizzontale non valida. Incolla un URL playlist con parametro list=... oppure un ID playlist.');
    }

    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();

    var patch = {
      biblioteca_libri_grado_minimo: grade,
      real_news: realNews,

      youtube_wildwall_shorts_playlist_id: youtubeShortsPlaylistId,
      youtube_wildwall_shorts_playlist_raw: youtubeShortsRaw,
      youtube_wildwall_shorts_playlist_updatedAt: now,
      youtube_wildwall_shorts_playlist_updatedByUid: user.uid,
      youtube_wildwall_shorts_playlist_updatedByEmail: user.email || null,

      youtube_video_horizontal_playlist_id: youtubePlaylistId,
      youtube_video_horizontal_playlist_raw: youtubeRaw,
      youtube_video_horizontal_playlist_updatedAt: now,
      youtube_video_horizontal_playlist_updatedByUid: user.uid,
      youtube_video_horizontal_playlist_updatedByEmail: user.email || null,

      youtube_playlists_updatedAt: now,
      youtube_playlists_updatedByUid: user.uid,
      youtube_playlists_updatedByEmail: user.email || null,

      client_content_config_updatedAt: now,
      client_content_config_updatedByUid: user.uid,
      client_content_config_updatedByEmail: user.email || null
    };

    await root.db
      .collection('PARAMETERS_PARTNER')
      .doc('client_config')
      .set(patch, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, {
      biblioteca_libri_grado_minimo: grade,
      real_news: realNews,

      youtube_wildwall_shorts_playlist_id: youtubeShortsPlaylistId,
      youtube_wildwall_shorts_playlist_raw: youtubeShortsRaw,
      youtube_wildwall_shorts_playlist_updatedByUid: user.uid,
      youtube_wildwall_shorts_playlist_updatedByEmail: user.email || null,

      youtube_video_horizontal_playlist_id: youtubePlaylistId,
      youtube_video_horizontal_playlist_raw: youtubeRaw,
      youtube_video_horizontal_playlist_updatedByUid: user.uid,
      youtube_video_horizontal_playlist_updatedByEmail: user.email || null,

      youtube_playlists_updatedByUid: user.uid,
      youtube_playlists_updatedByEmail: user.email || null,

      client_content_config_updatedByUid: user.uid,
      client_content_config_updatedByEmail: user.email || null
    });

    renderClientContentConfigState();
    renderDebug();

    root.toast('Configurazione client salvata: Libri + real_news + playlist YouTube.', 'success');
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
      renderClientContentConfigState();
      renderClientConsoleSwitchCardState();
      renderGlobalCacheNukeCardState();
    } catch (e) {
      state.partnerClientConfig = { error: e.message || String(e) };
      state.legacyModuleResources = { error: e.message || String(e) };
      state.moduleGradeOptions = [];
      renderModuleGradeOptions();
      renderClientContentConfigState();
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


  const SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT = 70;

  function normalizeSystemAudioVolumePercent(rawValue, fallbackValue) {
    var fallback = Number.isFinite(Number(fallbackValue)) ? Number(fallbackValue) : SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT;
    var raw = String(rawValue === undefined || rawValue === null ? '' : rawValue)
      .trim()
      .replace('%', '')
      .replace(',', '.');

    if (raw === '') return fallback;

    var n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    if (n < 0) return 0;
    if (n > 100) return 100;

    // Regola Wildu: 70 = 70%, 1 = 1%, 0,7 = 0,7%.
    // Qui salviamo sempre la percentuale umana; il client converte poi /100.
    return n;
  }

  function getSystemAudioVolumeAlias(slotKey) {
    var key = String(slotKey || '').trim();
    var aliases = {
      audio_musica: 'music',
      audio_ambienza: 'ambience',
      audio_xp: 'xp',
      audio_reward: 'reward',
      audio_levelup: 'levelup',
      audio_spin: 'spin',
      audio_end: 'end',
      audio_radio: 'radio',
      audio_rifugio: 'rifugio',
      audio_wildwall: 'wildwall'
    };

    return aliases[key] || key.replace(/^audio_/, '');
  }

  function getSystemAudioClientVolumeField(slotKey) {
    return String(slotKey || '').trim() + '_volume';
  }

  function getSystemAudioVolumePercent(item) {
    item = item || {};

    var runtimeItem = item.runtimeItem && typeof item.runtimeItem === 'object'
      ? item.runtimeItem
      : {};

    var config = state.partnerClientConfig || {};
    var runtimeDoc = state.systemAudio || {};
    var volumes = runtimeDoc.volumes && typeof runtimeDoc.volumes === 'object'
      ? runtimeDoc.volumes
      : {};

    var slotKey = String(item.key || runtimeItem.clientField || '').trim();
    var alias = getSystemAudioVolumeAlias(slotKey);
    var field = getSystemAudioClientVolumeField(slotKey);

    var candidates = [
      runtimeItem.volume,
      runtimeItem.volumePercent,
      runtimeItem.clientVolume,
      volumes[slotKey],
      volumes[alias],
      config[field]
    ];

    if (slotKey === 'audio_musica') {
      candidates.push(config.vol_musica, volumes.music);
    }

    if (slotKey === 'audio_ambienza') {
      candidates.push(config.vol_ambienza, volumes.ambience);
    }

    var systemAudioVolumes = config.system_audio_volumes || config.audio_volumes || config.systemAudioVolumes || config.audioVolumes;
    if (systemAudioVolumes && typeof systemAudioVolumes === 'object') {
      candidates.push(systemAudioVolumes[slotKey], systemAudioVolumes[alias]);
    }

    for (var i = 0; i < candidates.length; i++) {
      var raw = candidates[i];
      if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
        return normalizeSystemAudioVolumePercent(raw, SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT);
      }
    }

    return SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT;
  }

  function formatSystemAudioVolumeLabel(item) {
    var vol = getSystemAudioVolumePercent(item);
    var text = String(vol).replace('.', ',') + '%';

    return '<span style="display:inline-flex; padding:4px 9px; border-radius:999px; background:rgba(124,199,255,.10); color:#bde4ff; font-size:12px; font-weight:900; white-space:nowrap;">' +
      root.escapeHtml(text) +
      '</span>';
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
      body.innerHTML = '<tr><td colspan="7" class="muted">Login richiesto.</td></tr>';
      return;
    }

    if (!items.length) {
      body.innerHTML = '<tr><td colspan="7" class="muted">Audio App non ancora caricata. Premi “Ricarica Audio App”.</td></tr>';
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
          '<td>' + formatSystemAudioVolumeLabel(item) + '</td>' +
          '<td style="max-width:420px; word-break:break-all;">' +
            (url && !isStopAudioValue(url)
              ? '<a href="' + root.escapeHtml(url) + '" target="_blank" rel="noopener">' + root.escapeHtml(shortUrl) + '</a>'
              : root.escapeHtml(shortUrl)) +
          '</td>' +
          '<td>' +
            '<button class="small" type="button" data-edit-system-audio="' + root.escapeHtml(item.key) + '">Modifica</button> ' +
            '<button class="small" type="button" data-edit-system-audio-volume="' + root.escapeHtml(item.key) + '">Scegli volume</button> ' +
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

    var previousAudioItem = (getSystemAudioItem(slot.key) || {}).runtimeItem || {};
    var previousAudioVolume = getSystemAudioVolumePercent(getSystemAudioItem(slot.key) || { key: slot.key, runtimeItem: previousAudioItem });

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
      volume: previousAudioVolume,
      volumePercent: previousAudioVolume,
      volumeField: getSystemAudioClientVolumeField(slot.key),
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

  async function saveSystemAudioSlotVolume(slotKey) {
    var slot = getSystemAudioSlot(slotKey);
    if (!slot) {
      throw new Error('Slot audio non trovato: ' + slotKey);
    }

    var item = getSystemAudioItem(slot.key) || {
      key: slot.key,
      label: slot.label,
      runtimeItem: {}
    };

    var current = getSystemAudioVolumePercent(item);
    var raw = window.prompt(
      'Volume per "' + slot.label + '" (' + slot.key + ')\n\n' +
      'Inserisci un valore da 0 a 100.\n' +
      'Regola Wildu: 70 = 70%, 1 = 1%, 0,7 = 0,7%.',
      String(current).replace('.', ',')
    );

    if (raw === null) return;

    var volume = normalizeSystemAudioVolumePercent(raw, null);
    if (!Number.isFinite(volume) || volume < 0 || volume > 100) {
      throw new Error('Volume non valido. Usa un valore da 0 a 100. Esempi: 70, 1, 0,7, 0.');
    }

    var user = root.requireCurrentUser();
    var now = root.FieldValue.serverTimestamp();
    var alias = getSystemAudioVolumeAlias(slot.key);
    var fieldName = getSystemAudioClientVolumeField(slot.key);

    var runtimePayload = {
      schemaVersion: 1,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      items: {},
      volumes: {
        legacyFormat: true,
        updatedAt: now,
        updatedByUid: user.uid,
        updatedByEmail: user.email || null
      }
    };

    runtimePayload.items[slot.key] = {
      volume: volume,
      volumePercent: volume,
      volumeField: fieldName,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    };

    runtimePayload.volumes[slot.key] = volume;
    runtimePayload.volumes[alias] = volume;

    var existingVolumeObject = Object.assign(
      {},
      (state.partnerClientConfig && state.partnerClientConfig.system_audio_volumes) ||
      (state.partnerClientConfig && state.partnerClientConfig.audio_volumes) ||
      {}
    );

    existingVolumeObject[slot.key] = volume;
    existingVolumeObject[alias] = volume;

    var clientPatch = {
      system_audio_fallback_volume: SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT,
      system_audio_volumes: existingVolumeObject
    };

    clientPatch[fieldName] = volume;

    if (slot.key === 'audio_musica') {
      clientPatch.vol_musica = volume;
      runtimePayload.volumes.music = volume;
      existingVolumeObject.music = volume;
    }

    if (slot.key === 'audio_ambienza') {
      clientPatch.vol_ambienza = volume;
      runtimePayload.volumes.ambience = volume;
      existingVolumeObject.ambience = volume;
    }

    await systemAudioRuntimeRef().set(runtimePayload, { merge: true });
    await systemAudioClientConfigRef().set(clientPatch, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, clientPatch);

    root.toast('Volume salvato per ' + slot.label + ': ' + String(volume).replace('.', ',') + '%.', 'success');
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

    var existingVolumeObject = Object.assign(
      {},
      (state.partnerClientConfig && state.partnerClientConfig.system_audio_volumes) ||
      (state.partnerClientConfig && state.partnerClientConfig.audio_volumes) ||
      {}
    );

    existingVolumeObject.audio_musica = volMusica;
    existingVolumeObject.music = volMusica;
    existingVolumeObject.audio_ambienza = volAmbienza;
    existingVolumeObject.ambience = volAmbienza;

    await systemAudioRuntimeRef().set({
      schemaVersion: 1,
      updatedAt: now,
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      items: {
        audio_musica: {
          volume: volMusica,
          volumePercent: volMusica,
          volumeField: 'audio_musica_volume',
          updatedAt: now,
          updatedByUid: user.uid,
          updatedByEmail: user.email || null
        },
        audio_ambienza: {
          volume: volAmbienza,
          volumePercent: volAmbienza,
          volumeField: 'audio_ambienza_volume',
          updatedAt: now,
          updatedByUid: user.uid,
          updatedByEmail: user.email || null
        }
      },
      volumes: {
        audio_musica: volMusica,
        music: volMusica,
        audio_ambienza: volAmbienza,
        ambience: volAmbienza,
        legacyFormat: true,
        updatedAt: now,
        updatedByUid: user.uid,
        updatedByEmail: user.email || null
      }
    }, { merge: true });

    await systemAudioClientConfigRef().set({
      vol_musica: volMusica,
      vol_ambienza: volAmbienza,
      audio_musica_volume: volMusica,
      audio_ambienza_volume: volAmbienza,
      system_audio_fallback_volume: SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT,
      system_audio_volumes: existingVolumeObject
    }, { merge: true });

    state.partnerClientConfig = Object.assign({}, state.partnerClientConfig || {}, {
      vol_musica: volMusica,
      vol_ambienza: volAmbienza,
      audio_musica_volume: volMusica,
      audio_ambienza_volume: volAmbienza,
      system_audio_fallback_volume: SYSTEM_AUDIO_DEFAULT_VOLUME_PERCENT,
      system_audio_volumes: existingVolumeObject
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

  async function updateMediaMetadataWithForcedVersion(id, patch) {
    var user = root.requireCurrentUser();
    var before = await root.MediaService.getMedia(id);
    if (!before) throw new Error('Media non trovato: ' + id);

    var safePatch = Object.assign({}, patch || {});

    // Non toccare mai identità creazione o file fisico R2.
    delete safePatch.id;
    delete safePatch.createdAt;
    delete safePatch.createdByUid;
    delete safePatch.createdByEmail;
    delete safePatch.fileUrl;
    delete safePatch.objectKey;
    delete safePatch.storageProvider;
    delete safePatch.uploadMode;
    delete safePatch.originalFileName;
    delete safePatch.contentType;
    delete safePatch.sizeBytes;
    delete safePatch.durationSeconds;
    delete safePatch.width;
    delete safePatch.height;
    delete safePatch.pageCount;

    if (safePatch.title !== undefined) safePatch.title = String(safePatch.title || '').trim();
    if (!safePatch.title) throw new Error('Titolo obbligatorio.');
    if (safePatch.description !== undefined) safePatch.description = String(safePatch.description || '').trim();
    if (safePatch.status !== undefined) safePatch.status = String(safePatch.status || 'ACTIVE').trim().toUpperCase();
    if (safePatch.visibility !== undefined) safePatch.visibility = String(safePatch.visibility || 'PUBLIC').trim().toUpperCase();
    if (safePatch.sortOrder !== undefined) safePatch.sortOrder = Number(safePatch.sortOrder || 0);
    if (safePatch.clientRenderable !== undefined) safePatch.clientRenderable = safePatch.clientRenderable === true || String(safePatch.clientRenderable) === 'true';
    if (safePatch.tags !== undefined) safePatch.tags = root.parseTags(safePatch.tags);
    if (safePatch.subcategory !== undefined) safePatch.subcategory = root.slugify(safePatch.subcategory || '') || null;

    var afterCandidate = Object.assign({}, before, safePatch);

    if (
      safePatch.title !== undefined ||
      safePatch.description !== undefined ||
      safePatch.tags !== undefined
    ) {
      safePatch.searchTokens = root.parseTags([
        afterCandidate.title || '',
        afterCandidate.description || '',
        Array.isArray(afterCandidate.tags) ? afterCandidate.tags.join(',') : ''
      ].join(','));
      afterCandidate.searchTokens = safePatch.searchTokens;
    }

    root.MediaService.validateMediaRouting(afterCandidate);

    var currentVersion = Math.max(1, Number(before.mediaVersion || 1));
    var nextVersion = currentVersion + 1;
    var now = root.FieldValue.serverTimestamp();
    var cleanNote = String(safePatch.mediaVersionNote || '').trim() || 'METADATA_UPDATE';

    safePatch.mediaVersion = nextVersion;
    safePatch.mediaVersionNote = cleanNote;
    safePatch.mediaVersionUpdatedAt = now;
    safePatch.mediaVersionUpdatedByUid = user.uid;
    safePatch.mediaVersionUpdatedByEmail = user.email || null;
    safePatch.updatedAt = now;
    safePatch.updatedByUid = user.uid;
    safePatch.updatedByEmail = user.email || null;

    await root.db
      .collection(WILDU_MEDIA_CONFIG.collections.catalog)
      .doc(id)
      .set(safePatch, { merge: true });

    var after = Object.assign({}, before, safePatch);
    await root.TagService.bumpTagVersionsForMediaChange(before, after, 'MEDIA_METADATA_VERSIONED_UPDATE');
    return root.MediaService.getMedia(id);
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
      mediaVersionNote: String(document.getElementById('media-edit-version-note').value || '').trim() || 'METADATA_UPDATE'
    };

    var updated = await updateMediaMetadataWithForcedVersion(id, patch);

    closeMediaMetadataEditor();

    root.toast('Metadati aggiornati e mediaVersion incrementata a v' + Number(updated.mediaVersion || 1) + '.', 'success');

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

  function isPdfMediaForReader(item) {
    if (!item) return false;

    if (root.PdfReaderService && typeof root.PdfReaderService.isPdfMedia === 'function') {
      return root.PdfReaderService.isPdfMedia(item);
    }

    return String(item.kind || item.category || '').toLowerCase() === 'pdf' ||
      String(item.contentType || '').toLowerCase().indexOf('application/pdf') === 0 ||
      /\.pdf(\?|#|$)/i.test(String(item.fileUrl || item.objectKey || ''));
  }

  function hasReaderBuild(item) {
    return !!(
      item &&
      (
        (Array.isArray(item.readerBlocks) && item.readerBlocks.length) ||
        item.readerPreview ||
        item.readerText ||
        item.readerHtml
      )
    );
  }

  function readerBuildChipHtml(item) {
    if (!isPdfMediaForReader(item)) return '';

    if (hasReaderBuild(item)) {
      var count = Number(item.readerBlockCount || (Array.isArray(item.readerBlocks) ? item.readerBlocks.length : 0) || 0);
      var version = Number(item.readerVersion || 1);
      var imgCount = Number(item.readerImageCount || 0);
      var quality = item.readerQualityScore !== undefined && item.readerQualityScore !== null
        ? Number(item.readerQualityScore || 0)
        : null;
      var qualityLabel = quality !== null ? ' · Q' + quality + '%' : '';
      var qualityClass = quality !== null && quality < 60 ? ' warn' : ' good';
      var label = 'reader v' + version + (count ? ' · ' + count + ' blocchi' : '') + (imgCount ? ' · ' + imgCount + ' immagini' : '') + qualityLabel;
      return '<span class="chip' + qualityClass + '">' + root.escapeHtml(label) + '</span>';
    }

    return '<span class="chip warn">reader: da generare</span>';
  }

  function readerBuildActionsHtml(item) {
    if (!isPdfMediaForReader(item)) return '';

    var id = root.escapeHtml(item.id || '');

    return '' +
      '<button class="small" data-build-pdf-reader="' + id + '">Genera reader + anteprima</button>' +
      (hasReaderBuild(item)
        ? '<button class="small" data-preview-pdf-reader="' + id + '">Anteprima reader</button>' +
          '<button class="small warn" data-clear-pdf-reader="' + id + '">Pulisci reader</button>'
        : '');
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
            readerBuildChipHtml(item) +
          '</div>' +
          '<p class="small-text"><code>' + root.escapeHtml(item.objectKey || '') + '</code></p>' +
          '<p class="small-text">Aggiornato: ' + root.toDateTimeLabel(item.updatedAt) + '</p>' +
        '</div>' +
        '<div class="media-preview">' + mediaPreviewHtml(item) + '</div>' +
        '<div class="media-actions">' +
          '<button class="small" data-open-url="' + root.escapeHtml(item.fileUrl || '') + '">Apri</button>' +
          '<button class="small" data-edit-media-metadata="' + root.escapeHtml(item.id) + '">Modifica metadati</button>' +
          readerBuildActionsHtml(item) +
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
      var rawKey = item.id || item.url || '';
      var canonical = normalizeAdminRuntimeUrl(item.url || rawKey);
      var suspicious = rawKey && canonical && rawKey !== canonical;
      var cacheScope = normalizeAdminRuntimeUrl(item.cacheScope || '');
      var cacheLooksWrong = canonical.indexOf('wildu-map-suite/') === 0 && cacheScope.indexOf('modules/') === 0;
      var warningHtml = (suspicious || cacheLooksWrong)
        ? '<br><span class="badge warn">controllo runtime</span> <span class="small-text">canonico: <code>' + root.escapeHtml(canonical) + '</code></span>'
        : '';

      return '<tr>' +
        '<td><strong>' + root.escapeHtml(item.title || item.Titolo || item.url) + '</strong><br><span class="small-text">' + root.escapeHtml(cleanAdminDumpText(item.description || item.Descrizione || item.notes || '')) + '</span></td>' +
        '<td><code>' + root.escapeHtml(item.url || '') + '</code><br><span class="small-text">Renderer: ' + root.escapeHtml(item.renderer || 'module-html') + '</span>' + warningHtml + '</td>' +
        '<td>' + (item.Grado_Minimo ? '<span class="badge">' + root.escapeHtml(item.Grado_Minimo) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td><strong>' + Number(item.rev || item.module_rev || 1) + '</strong></td>' +
        '<td>' + (item.enabled === false ? '<span class="badge warn">NO</span>' : '<span class="badge good">SÌ</span>') + '</td>' +
        '<td><code>' + root.escapeHtml(item.cacheScope || '') + '</code></td>' +
        '<td class="actions">' +
          '<button class="small" data-edit-module-version="' + root.escapeHtml(item.url || '') + '">Modifica</button>' +
          '<button class="small" data-bump-module="' + root.escapeHtml(item.url || '') + '">+1</button>' +
          '<button class="small danger" data-delete-module-runtime="' + root.escapeHtml(rawKey) + '">Elimina record</button>' +
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

  // =========================================================
  // WILDU RUNTIME ADMIN GUARD — solo app.js
  // =========================================================
  // Obiettivo: impedire cloni tecnici tipo:
  // - wildu-map-suite/wildu-map-viewer/
  // - wildu-map-suite/wildu-map-viewer
  // mantenendo chiavi coerenti con client, Firestore e cache runtime.
  // Non accorpa URL diversi: modules/wildu-games22.html resta distinto.

  function normalizeAdminRuntimeUrl(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';

    var path = raw;

    try {
      if (/^https?:\/\//i.test(raw)) {
        var parsed = new URL(raw, window.location.href);
        path = parsed.pathname || raw;
      }
    } catch (e) {
      path = raw;
    }

    path = String(path || '')
      .trim()
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^\.\/+/, '')
      .replace(/^Wild-U\//i, '');

    // La Media Suite è admin shell, non identità runtime client.
    // La togliamo solo davanti a percorsi runtime reali.
    path = path.replace(/^wildu-media-suite\/(?=modules\/|giochi\/|wildu-map-suite\/)/i, '');

    // Regola canonica runtime: niente slash finale.
    return path.replace(/\/+/g, '/').replace(/\/+$/, '');
  }

  function uniqueAdminRuntimeList(value) {
    if (Array.isArray(value)) {
      return value
        .map(normalizeAdminRuntimeUrl)
        .filter(Boolean)
        .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
    }

    return String(value || '')
      .split(',')
      .map(normalizeAdminRuntimeUrl)
      .filter(Boolean)
      .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  }

  function runtimeDocRefForAdmin(kind) {
    var docId = kind === 'game'
      ? (WILDU_MEDIA_CONFIG.runtimeGameVersionsDocId || 'game_versions')
      : (WILDU_MEDIA_CONFIG.runtimeModuleVersionsDocId || 'module_versions');

    return root.db.collection(WILDU_MEDIA_CONFIG.collections.runtime).doc(docId);
  }

  function runtimeBucketNameForAdmin(kind) {
    return kind === 'game' ? 'games' : 'modules';
  }

  function runtimeTimestampMsForAdmin(value) {
    try {
      if (!value) return 0;
      if (typeof value.toMillis === 'function') return value.toMillis();
      if (Number.isFinite(Number(value.seconds))) return Number(value.seconds) * 1000;
      if (Number.isFinite(Number(value))) return Number(value);
    } catch (e) {}
    return 0;
  }

  function chooseRuntimeWinnerForAdmin(entries, canonicalKey) {
    if (!entries || !entries.length) return null;

    // Protezione principale: se esiste già la chiave canonica esatta, resta quella.
    // Così il clone con slash finale non può vincere solo perché ha rev/updatedAt più alto.
    var exact = entries.find(function (entry) { return entry.key === canonicalKey; });
    if (exact) return exact;

    var enabled = entries.filter(function (entry) {
      var item = entry.item || {};
      return item.enabled !== false && item.enabled !== 'false';
    });

    var pool = enabled.length ? enabled : entries;
    pool.sort(function (a, b) {
      return runtimeTimestampMsForAdmin((b.item || {}).updatedAt) - runtimeTimestampMsForAdmin((a.item || {}).updatedAt);
    });

    return pool[0];
  }

  function cleanupRuntimeBucketForAdmin(bucket) {
    bucket = bucket && typeof bucket === 'object' ? Object.assign({}, bucket) : {};

    var groups = {};

    Object.keys(bucket).forEach(function (key) {
      var item = bucket[key] || {};
      var canonical = normalizeAdminRuntimeUrl(item.url || key);
      if (!canonical) return;
      if (!groups[canonical]) groups[canonical] = [];
      groups[canonical].push({ key: key, item: item });
    });

    var cleaned = Object.assign({}, bucket);
    var removed = [];
    var repaired = [];

    Object.keys(groups).forEach(function (canonical) {
      var entries = groups[canonical];
      if (!entries || entries.length <= 1) return;

      var winner = chooseRuntimeWinnerForAdmin(entries, canonical);
      if (!winner) return;

      entries.forEach(function (entry) {
        if (entry.key !== winner.key) {
          delete cleaned[entry.key];
          removed.push({ from: entry.key, kept: canonical });
        }
      });

      var winnerItem = Object.assign({}, winner.item || {}, { url: canonical });
      delete cleaned[winner.key];
      cleaned[canonical] = winnerItem;
      repaired.push({ canonical: canonical, keptFrom: winner.key, count: entries.length });
    });

    return { bucket: cleaned, removed: removed, repaired: repaired };
  }

  async function readRuntimeBucketForAdmin(kind) {
    var ref = runtimeDocRefForAdmin(kind);
    var bucketName = runtimeBucketNameForAdmin(kind);
    var snap = await ref.get();
    var doc = snap.exists ? (snap.data() || {}) : {};
    var bucket = doc[bucketName] && typeof doc[bucketName] === 'object'
      ? Object.assign({}, doc[bucketName])
      : {};

    return { ref: ref, doc: doc, bucketName: bucketName, bucket: bucket };
  }

  function findRuntimeEntryByCanonicalForAdmin(bucket, canonicalUrl) {
    canonicalUrl = normalizeAdminRuntimeUrl(canonicalUrl);
    if (!canonicalUrl) return null;

    var keys = Object.keys(bucket || {});
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var item = bucket[key] || {};
      if (normalizeAdminRuntimeUrl(item.url || key) === canonicalUrl) {
        return { key: key, item: item };
      }
    }

    return null;
  }

  function normalizeAdminGameEntry(input, existing, options) {
    input = input || {};
    existing = existing || null;
    options = options || {};

    var url = normalizeAdminRuntimeUrl(input.url);
    if (!url) throw new Error('URL gioco obbligatorio.');

    var baseRev = Math.max(1, parseInt(input.rev, 10) || 1);
    if (existing && !options.preserveRev) {
      baseRev = Math.max(baseRev, Number(existing.rev || 1) + 1);
    }

    var cacheScope = normalizeAdminRuntimeUrl(input.cacheScope || (/\/index\.html$/i.test(url) ? url.replace(/\/index\.html$/i, '') : url));
    var clearNeedles = uniqueAdminRuntimeList(input.clearNeedles || cacheScope || url);

    var mode = String(input.openMode || input.open_mode || 'secure_iframe').trim();
    if (['secure_iframe', 'secure_redirect', 'iframe', 'redirect'].indexOf(mode) < 0) mode = 'secure_iframe';

    return {
      title: String(input.title || '').trim() || url,
      url: url,
      rev: baseRev,
      enabled: input.enabled !== false && input.enabled !== 'false',
      openMode: mode,
      moduleUrl: normalizeAdminRuntimeUrl(input.moduleUrl || ''),
      description: String(input.description || input.notes || '').trim(),
      notes: String(input.notes || input.description || '').trim(),
      cacheScope: cacheScope,
      extraUrls: uniqueAdminRuntimeList(input.extraUrls),
      clearNeedles: clearNeedles
    };
  }

  function normalizeAdminModuleEntry(input, existing, options) {
    input = input || {};
    existing = existing || null;
    options = options || {};

    var url = normalizeAdminRuntimeUrl(input.url);
    if (!url) throw new Error('URL tecnico modulo obbligatorio.');

    var baseRev = Math.max(1, parseInt(input.rev, 10) || 1);
    if (existing && !options.preserveRev) {
      baseRev = Math.max(baseRev, Number(existing.rev || existing.module_rev || 1) + 1);
    }

    var cacheScope = normalizeAdminRuntimeUrl(input.cacheScope || url);
    var clearNeedles = uniqueAdminRuntimeList(input.clearNeedles || cacheScope || url);
    var mode = String(input.openMode || input.open_mode || 'module').trim();
    if (['module', 'redirect', 'new_tab', 'secure_redirect', 'secure_iframe'].indexOf(mode) < 0) mode = 'module';

    var title = String(input.title || input.Titolo || '').trim() || url;
    var description = String(input.description || input.Descrizione || input.notes || '').trim();

    return {
      title: title,
      url: url,
      rev: baseRev,
      enabled: input.enabled !== false && input.enabled !== 'false',
      renderer: String(input.renderer || 'module-html').trim(),
      openMode: mode,
      description: description,
      notes: String(input.notes || description || '').trim(),
      cacheScope: cacheScope,
      extraUrls: uniqueAdminRuntimeList(input.extraUrls),
      clearNeedles: clearNeedles,
      Titolo: String(input.Titolo || title).trim() || title,
      Descrizione: String(input.Descrizione || description).trim() || description,
      Categoria: String(input.Categoria || '').trim(),
      Grado_Minimo: String(input.Grado_Minimo || input.gradeRequired || '').trim(),
      // Regola progetto: Link_Risorsa resta il link reale/eseguibile, url è la chiave tecnica.
      Link_Risorsa: String(input.Link_Risorsa || input.linkRisorsa || url).trim(),
      Audio: String(input.Audio || '').trim(),
      Regione: String(input.Regione || '').trim(),
      link_interni: Array.isArray(input.link_interni) ? input.link_interni : [],
      module_rev: String(baseRev)
    };
  }

  async function saveRuntimeEntryForAdmin(kind, input, options) {
    options = options || {};
    var user = root.requireCurrentUser();
    var read = await readRuntimeBucketForAdmin(kind);
    var canonicalUrl = normalizeAdminRuntimeUrl(input && input.url);
    if (!canonicalUrl) throw new Error('URL runtime obbligatorio.');

    var cleaned = cleanupRuntimeBucketForAdmin(read.bucket);
    var bucket = cleaned.bucket;
    var existing = findRuntimeEntryByCanonicalForAdmin(bucket, canonicalUrl);
    var entry = kind === 'game'
      ? normalizeAdminGameEntry(input, existing && existing.item, options)
      : normalizeAdminModuleEntry(input, existing && existing.item, options);

    // Distrugge alias equivalenti prima di scrivere il canonico.
    Object.keys(bucket).forEach(function (key) {
      var item = bucket[key] || {};
      if (key !== canonicalUrl && normalizeAdminRuntimeUrl(item.url || key) === canonicalUrl) {
        delete bucket[key];
      }
    });

    bucket[canonicalUrl] = Object.assign({}, entry, {
      url: canonicalUrl,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null
    });

    var nextDoc = Object.assign({}, read.doc, {
      schemaVersion: 1,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      appGuardUpdatedAt: root.FieldValue.serverTimestamp(),
      appGuardReason: options.reason || (kind === 'game' ? 'GAME_SAVE_APP_GUARD' : 'MODULE_SAVE_APP_GUARD')
    });

    nextDoc[read.bucketName] = bucket;
    await read.ref.set(nextDoc);
    return bucket[canonicalUrl];
  }

  async function repairRuntimeForAdmin(kind) {
    var user = root.requireCurrentUser();
    var read = await readRuntimeBucketForAdmin(kind);
    var cleaned = cleanupRuntimeBucketForAdmin(read.bucket);
    var removedCount = cleaned.removed.length;

    if (!removedCount) {
      return { removedCount: 0, removed: [], repaired: [], bucket: cleaned.bucket };
    }

    var nextDoc = Object.assign({}, read.doc, {
      schemaVersion: 1,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      appGuardRepairAt: root.FieldValue.serverTimestamp(),
      appGuardRepairRemovedCount: removedCount
    });

    nextDoc[read.bucketName] = cleaned.bucket;
    await read.ref.set(nextDoc);

    return {
      removedCount: removedCount,
      removed: cleaned.removed,
      repaired: cleaned.repaired,
      bucket: cleaned.bucket
    };
  }

  async function deleteRuntimeRecordForAdmin(kind, rawKey) {
    rawKey = String(rawKey || '').trim();
    if (!rawKey) throw new Error('Chiave runtime mancante.');

    var read = await readRuntimeBucketForAdmin(kind);
    var bucket = Object.assign({}, read.bucket || {});

    if (!Object.prototype.hasOwnProperty.call(bucket, rawKey)) {
      throw new Error('Record runtime non trovato con chiave esatta: ' + rawKey);
    }

    delete bucket[rawKey];

    var user = root.requireCurrentUser();
    var nextDoc = Object.assign({}, read.doc, {
      schemaVersion: 1,
      updatedAt: root.FieldValue.serverTimestamp(),
      updatedByUid: user.uid,
      updatedByEmail: user.email || null,
      appGuardDeletedAt: root.FieldValue.serverTimestamp(),
      appGuardDeletedKey: rawKey
    });

    nextDoc[read.bucketName] = bucket;
    await read.ref.set(nextDoc);
  }

function readGameForm() {
    var url = normalizeAdminRuntimeUrl(root.$('#game-url').value);
    var moduleUrl = normalizeAdminRuntimeUrl(root.$('#game-module-url').value);
    var cacheScope = normalizeAdminRuntimeUrl(root.$('#game-cache-scope').value || (/\/index\.html$/i.test(url) ? url.replace(/\/index\.html$/i, '') : url));
    var clearNeedles = uniqueAdminRuntimeList(root.$('#game-clear-needles').value || cacheScope || url);

    root.$('#game-url').value = url;
    root.$('#game-module-url').value = moduleUrl;
    root.$('#game-cache-scope').value = cacheScope;
    root.$('#game-clear-needles').value = clearNeedles.join(', ');

    return {
      title: root.$('#game-title').value,
      url: url,
      rev: root.$('#game-rev').value,
      enabled: root.$('#game-enabled').value === 'true',

      // Decide come il launcher giochi aprirà questo gioco.
      // Default consigliato: secure_iframe.
      openMode: root.$('#game-open-mode') ? root.$('#game-open-mode').value : 'secure_iframe',

      moduleUrl: moduleUrl,
      description: root.$('#game-description').value,
      cacheScope: cacheScope,
      extraUrls: uniqueAdminRuntimeList(root.$('#game-extra-urls').value).join(', '),
      clearNeedles: clearNeedles.join(', ')
    };
  }

function fillGameForm(item) {
    item = item || {};
    root.$('#game-title').value = item.title || '';
    root.$('#game-url').value = normalizeAdminRuntimeUrl(item.url || '');
    root.$('#game-rev').value = Number(item.rev || 1);
    root.$('#game-enabled').value = item.enabled === false ? 'false' : 'true';

    if (root.$('#game-open-mode')) {
      root.$('#game-open-mode').value = item.openMode || item.open_mode || 'secure_iframe';
    }

    root.$('#game-module-url').value = normalizeAdminRuntimeUrl(item.moduleUrl || '');
    root.$('#game-description').value = item.description || item.notes || '';
    root.$('#game-cache-scope').value = normalizeAdminRuntimeUrl(item.cacheScope || '');
    root.$('#game-extra-urls').value = uniqueAdminRuntimeList(item.extraUrls || '').join(', ');
    root.$('#game-clear-needles').value = uniqueAdminRuntimeList(item.clearNeedles || item.cacheScope || item.url || '').join(', ');
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
    // Unica fonte canonica per l'URL tecnico moduli lato Admin.
    // Coerente con client/cache/Firestore: niente dominio, niente /Wild-U, niente query/hash, niente slash finale.
    return normalizeAdminRuntimeUrl(rawLink);
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

    var cacheScope = normalizeAdminRuntimeUrl(root.$('#module-cache-scope').value || technicalUrl);
    var clearNeedles = uniqueAdminRuntimeList(root.$('#module-clear-needles').value || cacheScope || technicalUrl);
    var extraUrls = uniqueAdminRuntimeList(root.$('#module-extra-urls').value);

    root.$('#module-url').value = technicalUrl;
    root.$('#module-cache-scope').value = cacheScope;
    root.$('#module-clear-needles').value = clearNeedles.join(', ');
    root.$('#module-extra-urls').value = extraUrls.join(', ');

    return {
      title: title,
      url: technicalUrl,
      rev: rev,
      enabled: root.$('#module-enabled').value === 'true',

      renderer: root.$('#module-renderer').value,
      openMode: root.$('#module-open-mode') ? root.$('#module-open-mode').value : 'module',
      description: description,
      cacheScope: cacheScope,

      extraUrls: extraUrls,
      clearNeedles: clearNeedles,

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
    var technicalUrl = normalizeAdminRuntimeUrl(item.url || executableLink);
    root.$('#module-link-resource').value = executableLink;
    root.$('#module-url').value = technicalUrl;

    root.$('#module-rev').value = Number(item.rev || item.module_rev || 1);
    
    root.$('#module-enabled').value = item.enabled === false ? 'false' : 'true';
root.$('#module-renderer').value = item.renderer || 'module-html';

if (root.$('#module-open-mode')) {
  root.$('#module-open-mode').value = item.openMode || item.open_mode || 'module';
}

root.$('#module-description').value = item.description || item.Descrizione || item.notes || '';
    root.$('#module-cache-scope').value = normalizeAdminRuntimeUrl(item.cacheScope || technicalUrl || '');
    root.$('#module-extra-urls').value = uniqueAdminRuntimeList(item.extraUrls || '').join(', ');
    root.$('#module-clear-needles').value = uniqueAdminRuntimeList(item.clearNeedles || item.cacheScope || technicalUrl || '').join(', ');

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
    var saved = await saveRuntimeEntryForAdmin('game', readGameForm(), { reason: 'GAME_SAVE_VERSION_GUARD' });
    root.toast('Versione gioco salvata in game_versions. Rev attuale: ' + Number(saved.rev || 1), 'success');
    await refreshGameVersions();
  }

  async function saveModuleVersion(evt) {
    evt.preventDefault();
    var saved = await saveRuntimeEntryForAdmin('module', readModuleForm(), { reason: 'MODULE_SAVE_VERSION_GUARD' });
    root.toast('Versione modulo salvata in module_versions. Rev attuale: ' + Number(saved.rev || saved.module_rev || 1), 'success');
    await refreshModuleVersions();
  }

  async function repairModuleDuplicates() {
    var result = await repairRuntimeForAdmin('module');
    var removed = result && Number.isFinite(Number(result.removedCount))
      ? Number(result.removedCount)
      : 0;

    root.toast('Riparazione duplicati moduli completata. Rimossi: ' + removed + '.', 'success');
    await refreshModuleVersions();
  }

  async function bumpSelectedGameVersion() {
    var url = normalizeAdminRuntimeUrl(root.$('#game-url').value);
    var data = state.gameRuntime && Array.isArray(state.gameRuntime.items) ? state.gameRuntime.items : [];
    var current = data.find(function (item) { return normalizeAdminRuntimeUrl(item.url || item.id) === url; }) || { url: url, title: url, rev: 0 };
    current.rev = Math.max(1, Number(current.rev || 0) + 1);
    var saved = await saveRuntimeEntryForAdmin('game', current, { preserveRev: true, reason: 'GAME_MANUAL_BUMP' });
    root.toast('Versione gioco incrementata: ' + url + ' → rev ' + Number(saved.rev || 1), 'success');
    await refreshGameVersions();
  }

  async function bumpSelectedModuleVersion() {
    var url = normalizeAdminRuntimeUrl(root.$('#module-url').value);
    var data = state.moduleRuntime && Array.isArray(state.moduleRuntime.items) ? state.moduleRuntime.items : [];
    var current = data.find(function (item) { return normalizeAdminRuntimeUrl(item.url || item.id) === url; }) || { url: url, title: url, rev: 0 };
    current.rev = Math.max(1, Number(current.rev || current.module_rev || 0) + 1);
    var saved = await saveRuntimeEntryForAdmin('module', current, { preserveRev: true, reason: 'MODULE_MANUAL_BUMP' });
    root.toast('Versione modulo incrementata: ' + url + ' → rev ' + Number(saved.rev || saved.module_rev || 1), 'success');
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
    url = normalizeAdminRuntimeUrl(url);
    var data = state.gameRuntime && Array.isArray(state.gameRuntime.items) ? state.gameRuntime.items : [];
    var current = data.find(function (item) { return normalizeAdminRuntimeUrl(item.url || item.id) === url; }) || { url: url, title: url, rev: 0 };
    current.rev = Math.max(1, Number(current.rev || 0) + 1);
    var saved = await saveRuntimeEntryForAdmin('game', current, { preserveRev: true, reason: 'GAME_TABLE_BUMP' });
    root.toast('Versione gioco incrementata: ' + url + ' → rev ' + Number(saved.rev || 1), 'success');
    await refreshGameVersions();
  }

  async function bumpModuleFromTable(url) {
    url = normalizeAdminRuntimeUrl(url);
    var data = state.moduleRuntime && Array.isArray(state.moduleRuntime.items) ? state.moduleRuntime.items : [];
    var current = data.find(function (item) { return normalizeAdminRuntimeUrl(item.url || item.id) === url; }) || { url: url, title: url, rev: 0 };
    current.rev = Math.max(1, Number(current.rev || current.module_rev || 0) + 1);
    var saved = await saveRuntimeEntryForAdmin('module', current, { preserveRev: true, reason: 'MODULE_TABLE_BUMP' });
    root.toast('Versione modulo incrementata: ' + url + ' → rev ' + Number(saved.rev || saved.module_rev || 1), 'success');
    await refreshModuleVersions();
  }

  async function deleteModuleRuntimeRecord(rawKey) {
    if (!confirm('Eliminare definitivamente il record runtime modulo con chiave esatta:\n\n' + rawKey + '\n\nUsa solo per cloni/fantasmi non modificabili.')) return;
    await deleteRuntimeRecordForAdmin('module', rawKey);
    root.toast('Record runtime modulo eliminato: ' + rawKey, 'success');
    await refreshModuleVersions();
  }



  function buildPdfReaderPreviewHtmlFromSavedItem(item) {
    if (!item) return '<div class="empty">Media mancante.</div>';

    if (item.readerAdminPreviewHtml) return item.readerAdminPreviewHtml;

    if (root.PdfReaderService && typeof root.PdfReaderService.buildAdminPreviewHtmlFromBlocks === 'function') {
      return root.PdfReaderService.buildAdminPreviewHtmlFromBlocks(
        item,
        Array.isArray(item.readerBlocks) ? item.readerBlocks : [],
        item.readerBuildReport || null
      );
    }

    return '<pre>' + root.escapeHtml(JSON.stringify({
      title: item.title,
      readerPreview: item.readerPreview,
      readerBlocks: item.readerBlocks || []
    }, null, 2)) + '</pre>';
  }

  function sanitizeReaderPatchForSave(patch) {
    var out = Object.assign({}, patch || {});

    // Proprietà temporanee della modale admin: non devono finire nel catalogo Firestore.
    delete out.readerAdminPreviewHtml;

    // Limite prudente sui sospetti salvati: il report completo resta in readerBuildReport.
    if (Array.isArray(out.readerSuspiciousBlocks)) {
      out.readerSuspiciousBlocks = out.readerSuspiciousBlocks.slice(0, 24);
    }

    return out;
  }

  function showPdfReaderPreviewModal(item, patch, options) {
    options = options || {};

    return new Promise(function (resolve) {
      var existing = document.getElementById('wildu-reader-preview-overlay');
      if (existing) existing.remove();

      var report = (patch && patch.readerBuildReport) || (item && item.readerBuildReport) || {};
      var warnings = Array.isArray((patch && patch.readerWarnings) || (report && report.warnings))
        ? ((patch && patch.readerWarnings) || report.warnings)
        : [];
      var suspicious = Array.isArray((patch && patch.readerSuspiciousBlocks) || (report && report.suspiciousBlocks))
        ? ((patch && patch.readerSuspiciousBlocks) || report.suspiciousBlocks)
        : [];
      var confidence = patch && patch.readerQualityScore !== undefined
        ? patch.readerQualityScore
        : (item && item.readerQualityScore !== undefined ? item.readerQualityScore : report.confidence);

      var html = (patch && patch.readerAdminPreviewHtml) || buildPdfReaderPreviewHtmlFromSavedItem(Object.assign({}, item || {}, patch || {}));

      var overlay = document.createElement('div');
      overlay.id = 'wildu-reader-preview-overlay';
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:999999',
        'background:rgba(0,0,0,.76)',
        'backdrop-filter:blur(10px)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:18px'
      ].join(';');

      function badge(label, tone) {
        var bg = tone === 'good' ? 'rgba(107,213,138,.16)' : tone === 'warn' ? 'rgba(228,182,83,.16)' : tone === 'bad' ? 'rgba(238,106,106,.16)' : 'rgba(255,255,255,.08)';
        var color = tone === 'good' ? '#bff7cd' : tone === 'warn' ? '#ffe7a5' : tone === 'bad' ? '#ffc5c5' : '#eef6ef';
        return '<span style="display:inline-flex; padding:6px 9px; border-radius:999px; background:' + bg + '; color:' + color + '; font-size:12px; font-weight:950;">' + root.escapeHtml(label) + '</span>';
      }

      var conf = Number(confidence || 0);
      var confTone = conf >= 82 ? 'good' : conf >= 60 ? 'warn' : 'bad';
      var canSave = options.readOnly !== true;

      overlay.innerHTML = '' +
        '<div role="dialog" aria-modal="true" style="width:min(1180px,96vw); max-height:92vh; overflow:hidden; border-radius:24px; background:#17211b; color:#f3f8f4; border:1px solid rgba(255,255,255,.16); box-shadow:0 28px 100px rgba(0,0,0,.62); display:flex; flex-direction:column;">' +
          '<div style="padding:16px 18px; border-bottom:1px solid rgba(255,255,255,.12); display:flex; gap:12px; align-items:flex-start; justify-content:space-between;">' +
            '<div style="min-width:0;">' +
              '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">' +
                badge('Anteprima Reader V6.2', 'good') +
                badge('Confidenza ' + (Number.isFinite(conf) ? conf + '%' : '—'), confTone) +
                badge('Blocchi ' + root.escapeHtml((patch && patch.readerBlockCount) || (report && report.blockCount) || 0), 'neutral') +
                badge('Immagini ' + root.escapeHtml((patch && patch.readerImageCount) || (report && report.imageCount) || 0), 'neutral') +
                badge('Fonti ' + root.escapeHtml((report && report.sourceCount) || 0), 'neutral') +
              '</div>' +
              '<h2 style="margin:0; color:#f6d889; font-size:24px; line-height:1.15;">' + root.escapeHtml((item && item.title) || 'PDF') + '</h2>' +
              '<div style="margin-top:6px; color:#aebcaf; font-size:13px;">Controlla titoli, fonti e immagini prima di salvare nel catalogo.</div>' +
            '</div>' +
            '<button type="button" id="wildu-reader-preview-close" style="border:0; border-radius:999px; padding:10px 14px; background:#d6b25e; color:#1b1509; font-weight:950; cursor:pointer;">Chiudi</button>' +
          '</div>' +
          ((warnings.length || suspicious.length) ?
            '<details open style="margin:12px 18px 0; border:1px solid rgba(228,182,83,.25); border-radius:15px; background:rgba(228,182,83,.08); padding:10px 12px; color:#ffe7a5;">' +
              '<summary style="cursor:pointer; font-weight:950;">Diagnostica e blocchi sospetti</summary>' +
              (warnings.length ? '<div style="margin-top:8px;"><strong>Avvisi:</strong><br>' + root.escapeHtml(warnings.join('\n')).replace(/\n/g, '<br>') + '</div>' : '') +
              (suspicious.length ? '<pre style="white-space:pre-wrap; word-break:break-word; max-height:180px; overflow:auto; margin:10px 0 0; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.10); border-radius:12px; padding:10px; color:#f4e6ba;">' + root.escapeHtml(JSON.stringify(suspicious.slice(0, 24), null, 2)) + '</pre>' : '') +
            '</details>' : '') +
          '<div style="flex:1; overflow:auto; padding:16px 18px;">' + html + '</div>' +
          '<div style="padding:13px 18px; border-top:1px solid rgba(255,255,255,.12); display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">' +
            '<button type="button" id="wildu-reader-preview-download" style="border:1px solid rgba(255,255,255,.16); border-radius:999px; padding:10px 14px; background:rgba(255,255,255,.08); color:#f3f8f4; font-weight:900; cursor:pointer;">Scarica JSON debug</button>' +
            (canSave ? '<button type="button" id="wildu-reader-preview-cancel" style="border:1px solid rgba(255,255,255,.16); border-radius:999px; padding:10px 14px; background:rgba(255,255,255,.08); color:#f3f8f4; font-weight:900; cursor:pointer;">Annulla</button>' : '') +
            (canSave ? '<button type="button" id="wildu-reader-preview-save" style="border:0; border-radius:999px; padding:10px 15px; background:#6bd58a; color:#092013; font-weight:950; cursor:pointer;">Salva reader</button>' : '') +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      function close(value) {
        overlay.remove();
        resolve(value);
      }

      var closeBtn = document.getElementById('wildu-reader-preview-close');
      var cancelBtn = document.getElementById('wildu-reader-preview-cancel');
      var saveBtn = document.getElementById('wildu-reader-preview-save');
      var dlBtn = document.getElementById('wildu-reader-preview-download');

      if (closeBtn) closeBtn.addEventListener('click', function () { close(false); });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });
      if (saveBtn) saveBtn.addEventListener('click', function () { close(true); });
      if (dlBtn) dlBtn.addEventListener('click', function () {
        var payload = {
          media: item || null,
          patch: patch ? sanitizeReaderPatchForSave(patch) : null,
          report: report,
          warnings: warnings,
          suspicious: suspicious
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'wildu-reader-preview-debug.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });

      overlay.addEventListener('click', function (evt) {
        if (evt.target === overlay) close(false);
      });
    });
  }


  async function cleanupPdfReaderImagesQuietly(source, reason) {
    if (!root.PdfReaderService || typeof root.PdfReaderService.cleanupReaderImages !== 'function') {
      return { ok: false, skipped: true, deleted: [], failed: [] };
    }

    var result = await root.PdfReaderService.cleanupReaderImages(source, { reason: reason || 'READER_REPLACE' });

    if (result && Array.isArray(result.failed) && result.failed.length) {
      console.warn('[WILDU READER] Immagini reader non cancellate:', result.failed);
      root.toast('Reader ok, ma alcune vecchie immagini R2 non sono state cancellate. Vedi console.', 'info');
    }

    if (result && Array.isArray(result.deleted) && result.deleted.length) {
      console.log('[WILDU READER] Immagini reader cancellate:', result.deleted);
    }

    return result || { ok: true, deleted: [], failed: [] };
  }

  async function previewPdfReaderForMedia(id) {
    var item = findMediaById(id);
    if (!item) throw new Error('Media non trovato nel catalogo corrente. Ricarica il catalogo.');
    if (!hasReaderBuild(item)) throw new Error('Questo PDF non ha un reader generato da mostrare.');
    await showPdfReaderPreviewModal(item, null, { readOnly: true });
  }

  async function buildPdfReaderForMedia(id) {
    var item = findMediaById(id);

    if (!item) {
      throw new Error('Media non trovato nel catalogo corrente. Ricarica il catalogo.');
    }

    if (!root.PdfReaderService || typeof root.PdfReaderService.buildReaderPatchFromMedia !== 'function') {
      throw new Error('PdfReaderService non caricato: controlla bootstrap.js e cache browser.');
    }

    if (!isPdfMediaForReader(item)) {
      throw new Error('Reader Build disponibile solo per PDF.');
    }

    var ok = confirm(
      'Genero automaticamente il reader per:\n\n' +
      (item.title || 'PDF senza titolo') +
      '\n\nL’app leggerà da sola quante pagine ha il PDF, riordinerà Fonte/Fonti in fondo e proverà a creare immagini editoriali ottimizzate.' +
      '\n\nIl PDF originale R2 NON verrà modificato. Eventuali immagini reader saranno salvate come WebP leggeri su R2 e il catalogo riceverà solo i metadati reader.'
    );

    if (!ok) return;

    var lastMessage = '';

    var patch = await root.PdfReaderService.buildReaderPatchFromMedia(item, {
      onProgress: function (message) {
        lastMessage = message || lastMessage;
        root.toast(lastMessage, 'info');
      }
    });

    var approved = await showPdfReaderPreviewModal(item, patch, { readOnly: false });

    if (!approved) {
      // Le immagini della preview vengono caricate su R2 prima del salvataggio: se annulli, le ripuliamo subito.
      await cleanupPdfReaderImagesQuietly(patch, 'READER_PREVIEW_CANCELLED');
      root.toast('Reader generato in anteprima ma non salvato. Immagini provvisorie cancellate se note.', 'info');
      return;
    }

    // Prima di sostituire il reader salvato, elimina le vecchie immagini reader già note.
    // Non tocca mai il PDF originale: cancella solo objectKey generati dal reader.
    await cleanupPdfReaderImagesQuietly(item, 'READER_REPLACE_OLD_IMAGES');

    var patchToSave = sanitizeReaderPatchForSave(patch);
    await root.MediaService.updateMedia(item.id, patchToSave);

    root.toast(
      'Reader editoriale V6.2 salvato: ' +
      Number(patch.readerBlockCount || 0) +
      ' blocchi, ' +
      Number(patch.readerPagesProcessed || 0) +
      ' pagine, ' +
      Number(patch.readerImageCount || 0) +
      ' immagini, qualità ' + Number(patch.readerQualityScore || 0) + '%.',
      'success'
    );

    if (Array.isArray(patch.readerImageErrors) && patch.readerImageErrors.length) {
      console.warn('[WILDU READER] Alcune immagini non sono state generate/caricate:', patch.readerImageErrors);
      root.toast('Reader generato, ma alcune immagini sono state saltate. Vedi console/debug.', 'info');
    }

    await refreshTags();
    await refreshMedia();
  }

  async function clearPdfReaderForMedia(id) {
    var item = findMediaById(id);

    if (!item) {
      throw new Error('Media non trovato nel catalogo corrente. Ricarica il catalogo.');
    }

    if (!root.PdfReaderService || typeof root.PdfReaderService.buildClearReaderPatch !== 'function') {
      throw new Error('PdfReaderService non caricato: controlla bootstrap.js e cache browser.');
    }

    if (!hasReaderBuild(item)) {
      root.toast('Questo PDF non ha reader generato.', 'info');
      return;
    }

    if (!confirm('Pulire i campi reader generati per questo PDF? Il PDF originale R2 non verrà toccato. Le immagini reader note verranno cancellate da R2.')) return;

    await cleanupPdfReaderImagesQuietly(item, 'READER_CLEAR');
    await root.MediaService.updateMedia(item.id, root.PdfReaderService.buildClearReaderPatch(item));

    root.toast('Reader pulito, immagini reader note cancellate e manifesto Biblioteca riallineato.', 'success');

    await refreshTags();
    await refreshMedia();
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

  function installModuleRuntimeGuardButton() {
    if (document.getElementById('btn-repair-module-duplicates')) return;

    var refreshBtn = document.getElementById('btn-refresh-modules');
    var parent = refreshBtn ? refreshBtn.parentElement : null;
    if (!parent) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-repair-module-duplicates';
    btn.setAttribute('data-requires-auth', '');
    btn.textContent = 'Ripara duplicati moduli';
    btn.title = 'Normalizza URL tecnici equivalenti e distrugge cloni slash/no-slash.';
    parent.appendChild(btn);
  }

  function bindEvents() {
    
    installAdminDumpCleanerButton(); //AGGIUNTA PERICOLOSA
    installClientConsoleSwitchCard();
    installGlobalClientCacheNukeCard();
    installModuleRuntimeGuardButton();
    
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

    var repairModuleDuplicatesBtn = root.$('#btn-repair-module-duplicates');
    if (repairModuleDuplicatesBtn) {
      repairModuleDuplicatesBtn.addEventListener('click', function () { run(repairModuleDuplicates); });
    }

    root.$('#btn-refresh-module-grades').addEventListener('click', function () { run(loadPartnerModuleContextQuietly); });
        var librarySettingsForm = document.getElementById('library-client-settings-form');
    if (librarySettingsForm) {
      librarySettingsForm.addEventListener('submit', function (evt) {
        run(saveLibraryClientSettingsFromForm, evt);
      });
    }

    var refreshLibrarySettingsBtn = document.getElementById('btn-refresh-library-client-settings');
    if (refreshLibrarySettingsBtn) {
      refreshLibrarySettingsBtn.addEventListener('click', function () {
        run(async function () {
          await loadPartnerModuleContextQuietly();
          await refreshTags();
          root.toast('Impostazioni Biblioteca ricaricate.', 'success');
        });
      });
    }

        var clientContentConfigForm = document.getElementById('client-content-config-form');
    if (clientContentConfigForm) {
      clientContentConfigForm.addEventListener('submit', function (evt) {
        run(saveClientContentConfig, evt);
      });
    }

    var refreshClientContentConfigBtn = document.getElementById('btn-refresh-client-content-config');
    if (refreshClientContentConfigBtn) {
      refreshClientContentConfigBtn.addEventListener('click', function () {
        run(refreshClientContentConfig);
      });
    }

    var youtubeShortsInput = document.getElementById('client-youtube-shorts-playlist-url');
    if (youtubeShortsInput) {
      youtubeShortsInput.addEventListener('input', function () {
        syncClientYoutubeShortsPlaylistFields();
      });
      youtubeShortsInput.addEventListener('blur', function () {
        syncClientYoutubeShortsPlaylistFields({ rewriteInput: false });
      });
      youtubeShortsInput.addEventListener('paste', function () {
        setTimeout(function () {
          syncClientYoutubeShortsPlaylistFields({ rewriteInput: false });
        }, 0);
      });
    }

    var youtubeHorizontalInput = document.getElementById('client-youtube-horizontal-playlist-url');
    if (youtubeHorizontalInput) {
      youtubeHorizontalInput.addEventListener('input', function () {
        syncClientYoutubeHorizontalPlaylistFields();
      });
      youtubeHorizontalInput.addEventListener('blur', function () {
        syncClientYoutubeHorizontalPlaylistFields({ rewriteInput: false });
      });
      youtubeHorizontalInput.addEventListener('paste', function () {
        setTimeout(function () {
          syncClientYoutubeHorizontalPlaylistFields({ rewriteInput: false });
        }, 0);
      });
    }

    var saveYoutubeHorizontalBtn = document.getElementById('btn-save-client-youtube-horizontal-playlist');
    if (saveYoutubeHorizontalBtn) {
      saveYoutubeHorizontalBtn.addEventListener('click', function () {
        run(saveClientYoutubeHorizontalPlaylistOnly);
      });
    }

    var copyYoutubeShortsBtn = document.getElementById('btn-copy-client-youtube-shorts-id');
    if (copyYoutubeShortsBtn) {
      copyYoutubeShortsBtn.addEventListener('click', function () {
        run(copyClientYoutubeShortsPlaylistId);
      });
    }

    var copyYoutubeHorizontalBtn = document.getElementById('btn-copy-client-youtube-horizontal-id');
    if (copyYoutubeHorizontalBtn) {
      copyYoutubeHorizontalBtn.addEventListener('click', function () {
        run(copyClientYoutubeHorizontalPlaylistId);
      });
    }

    var openYoutubeGasBridgeBtn = document.getElementById('btn-open-youtube-gas-bridge');
    if (openYoutubeGasBridgeBtn) {
      openYoutubeGasBridgeBtn.addEventListener('click', function () {
        run(openClientYoutubeGasBridge);
      });
    }

    window.addEventListener('message', handleYoutubeGasBridgeMessage);

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

      var deleteModuleRuntimeBtn = evt.target.closest('[data-delete-module-runtime]');
      if (deleteModuleRuntimeBtn) return run(deleteModuleRuntimeRecord, deleteModuleRuntimeBtn.dataset.deleteModuleRuntime);

      var editSystemAudioBtn = evt.target.closest('[data-edit-system-audio]');
      if (editSystemAudioBtn) return fillSystemAudioForm(editSystemAudioBtn.dataset.editSystemAudio);

      var editSystemAudioVolumeBtn = evt.target.closest('[data-edit-system-audio-volume]');
      if (editSystemAudioVolumeBtn) return run(saveSystemAudioSlotVolume, editSystemAudioVolumeBtn.dataset.editSystemAudioVolume);

      var buildReaderBtn = evt.target.closest('[data-build-pdf-reader]');
      if (buildReaderBtn) return run(buildPdfReaderForMedia, buildReaderBtn.dataset.buildPdfReader);

      var previewReaderBtn = evt.target.closest('[data-preview-pdf-reader]');
      if (previewReaderBtn) return run(previewPdfReaderForMedia, previewReaderBtn.dataset.previewPdfReader);

      var clearReaderBtn = evt.target.closest('[data-clear-pdf-reader]');
      if (clearReaderBtn) return run(clearPdfReaderForMedia, clearReaderBtn.dataset.clearPdfReader);

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
        renderLibraryClientSettingsCardState();
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
