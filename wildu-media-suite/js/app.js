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
      tbody.innerHTML = '<tr><td colspan="6" class="muted">Nessun modulo registrato. Usa “Preset moduli noti” oppure salva un URL modulo.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (item) {
      return '<tr>' +
        '<td><strong>' + root.escapeHtml(item.title || item.url) + '</strong><br><span class="small-text">' + root.escapeHtml(item.description || item.notes || '') + '</span></td>' +
        '<td><code>' + root.escapeHtml(item.url || '') + '</code><br><span class="small-text">Renderer: ' + root.escapeHtml(item.renderer || 'module-html') + '</span></td>' +
        '<td><strong>' + Number(item.rev || 1) + '</strong></td>' +
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

  function readModuleForm() {
    return {
      title: root.$('#module-title').value,
      url: root.$('#module-url').value,
      rev: root.$('#module-rev').value,
      enabled: root.$('#module-enabled').value === 'true',
      renderer: root.$('#module-renderer').value,
      description: root.$('#module-description').value,
      cacheScope: root.$('#module-cache-scope').value,
      extraUrls: root.$('#module-extra-urls').value,
      clearNeedles: root.$('#module-clear-needles').value
    };
  }

  function fillModuleForm(item) {
    item = item || {};
    root.$('#module-title').value = item.title || '';
    root.$('#module-url').value = item.url || '';
    root.$('#module-rev').value = Number(item.rev || 1);
    root.$('#module-enabled').value = item.enabled === false ? 'false' : 'true';
    root.$('#module-renderer').value = item.renderer || 'module-html';
    root.$('#module-description').value = item.description || item.notes || '';
    root.$('#module-cache-scope').value = item.cacheScope || '';
    root.$('#module-extra-urls').value = Array.isArray(item.extraUrls) ? item.extraUrls.join(', ') : '';
    root.$('#module-clear-needles').value = Array.isArray(item.clearNeedles) ? item.clearNeedles.join(', ') : '';
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
