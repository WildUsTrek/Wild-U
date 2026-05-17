/* global firebase, WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};
  var state = {
    currentUser: null,
    tags: [],
    media: [],
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

  function fillKindOptions() {
    var options = WILDU_MEDIA_CONFIG.activeUploadKinds.map(function (kind) {
      return '<option value="' + root.escapeHtml(kind) + '">' + root.escapeHtml(kind) + '</option>';
    }).join('');
    root.$('#upload-kind').innerHTML = '<option value="">Seleziona categoria</option>' + options;
    root.$('#filter-kind').innerHTML = '<option value="">Tutte le categorie</option>' + options;
  }

  async function refreshTags() {
    if (!root.db) return;
    state.tags = await root.TagService.listTags({ onlyActive: false });
    renderTags();
    fillTagDropdowns();
    renderDebug();
  }

  function fillTagDropdowns() {
    var activeTags = state.tags.filter(function (tag) { return tag.status === 'ACTIVE'; });
    var options = activeTags.map(function (tag) {
      return '<option value="' + root.escapeHtml(tag.tagSlug) + '">' +
        root.escapeHtml(tag.title || tag.tagSlug) + ' (' + root.escapeHtml(tag.tagSlug) + ')</option>';
    }).join('');

    root.$('#upload-tag').innerHTML = '<option value="">Seleziona tag/modulo</option>' + options;
    root.$('#filter-tag').innerHTML = '<option value="">Tutti i tag</option>' + state.tags.map(function (tag) {
      return '<option value="' + root.escapeHtml(tag.tagSlug) + '">' + root.escapeHtml(tag.title || tag.tagSlug) + '</option>';
    }).join('');
  }

  function renderTags() {
    var tbody = root.$('#tags-table-body');
    if (!state.tags.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted">Nessun tag creato.</td></tr>';
      return;
    }
    tbody.innerHTML = state.tags.map(function (tag) {
      return '<tr>' +
        '<td><strong>' + root.escapeHtml(tag.title || tag.tagSlug) + '</strong><br><code>' + root.escapeHtml(tag.tagSlug) + '</code></td>' +
        '<td>' + root.escapeHtml(tag.description || '') + '</td>' +
        '<td><span class="badge ' + (tag.status === 'ACTIVE' ? 'good' : 'warn') + '">' + root.escapeHtml(tag.status || '—') + '</span></td>' +
        '<td>' + root.escapeHtml(tag.visibility || '—') + '</td>' +
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
      sortOrder: root.$('#tag-sort').value
    };
    await root.TagService.createOrUpdateTag(input);
    root.toast('Tag salvato. Versioni preservate.', 'success');
    root.$('#tag-form').reset();
    root.$('#tag-status').value = 'ACTIVE';
    root.$('#tag-visibility').value = 'PUBLIC';
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
    switchTab('tags');
  }

  async function toggleTag(tagSlug, nextStatus) {
    await root.TagService.setTagStatus(tagSlug, nextStatus);
    root.toast('Stato tag aggiornato: ' + tagSlug + ' → ' + nextStatus, 'success');
    await refreshTags();
  }

  async function uploadMedia(evt) {
    evt.preventDefault();

    var file = root.$('#upload-file').files[0];
    var kind = root.$('#upload-kind').value;
    var tagSlug = root.$('#upload-tag').value;
    var title = root.$('#upload-title').value.trim();
    var description = root.$('#upload-description').value.trim();
    var tagsText = root.$('#upload-tags').value.trim();
    var status = root.$('#upload-status').value;
    var visibility = root.$('#upload-visibility').value;
    var sortOrder = Number(root.$('#upload-sort').value || 0);

    root.validateFileForKind(file, kind);
    if (!tagSlug) throw new Error('Scegli un tag/modulo.');
    if (!title) throw new Error('Titolo obbligatorio.');

    setUploadProgress(0, 'Richiesta URL firmato al Worker...');
    var signed = await root.R2WorkerService.requestUploadUrl({
      kind: kind,
      tagSlug: tagSlug,
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
      sizeBytes: file.size
    });

    setUploadProgress(100, 'Upload completato. Media ID: ' + media.id);
    root.toast('Media caricato e versione tag aggiornata.', 'success');
    root.$('#upload-form').reset();
    root.$('#upload-status').value = 'ACTIVE';
    root.$('#upload-visibility').value = 'PUBLIC';
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
      status: root.$('#filter-status').value || '',
      visibility: root.$('#filter-visibility').value || '',
      limit: 80
    };
    state.media = await root.MediaService.listMedia(filters);
    renderMedia();
    renderDashboard();
  }

  function mediaPreviewHtml(item) {
    if (item.kind === 'image') {
      return '<img class="media-thumb" src="' + root.escapeHtml(item.fileUrl) + '" alt="">';
    }
    if (item.kind === 'audio') {
      return '<audio controls preload="none" src="' + root.escapeHtml(item.fileUrl) + '"></audio>';
    }
    return '<a href="' + root.escapeHtml(item.fileUrl) + '" target="_blank" rel="noopener">Apri file</a>';
  }

  function renderMedia() {
    var wrap = root.$('#media-list');
    if (!state.media.length) {
      wrap.innerHTML = '<div class="empty">Nessun media trovato con questi filtri.</div>';
      return;
    }
    wrap.innerHTML = state.media.map(function (item) {
      return '<article class="media-card">' +
        '<div class="media-main">' +
          '<h3>' + root.escapeHtml(item.title || 'Senza titolo') + '</h3>' +
          '<p class="muted">' + root.escapeHtml(item.description || '') + '</p>' +
          '<div class="chip-row">' +
            '<span class="chip">' + root.escapeHtml(item.kind || '—') + '</span>' +
            '<span class="chip">tag: ' + root.escapeHtml(item.tagSlug || '—') + '</span>' +
            '<span class="chip ' + (item.status === 'ACTIVE' ? 'good' : 'warn') + '">' + root.escapeHtml(item.status || '—') + '</span>' +
            '<span class="chip">' + root.escapeHtml(item.visibility || '—') + '</span>' +
            '<span class="chip">' + root.formatBytes(item.sizeBytes) + '</span>' +
          '</div>' +
          '<p class="small-text"><code>' + root.escapeHtml(item.objectKey || '') + '</code></p>' +
          '<p class="small-text">Aggiornato: ' + root.toDateTimeLabel(item.updatedAt) + '</p>' +
        '</div>' +
        '<div class="media-preview">' + mediaPreviewHtml(item) + '</div>' +
        '<div class="media-actions">' +
          '<button class="small" data-open-url="' + root.escapeHtml(item.fileUrl || '') + '">Apri</button>' +
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

  function renderDebug() {
    var debug = {
      appVersion: WILDU_MEDIA_CONFIG.appVersion,
      workerUrl: WILDU_MEDIA_CONFIG.workerUrl,
      cdnBaseUrl: WILDU_MEDIA_CONFIG.cdnBaseUrl,
      collections: WILDU_MEDIA_CONFIG.collections,
      activeUploadKinds: WILDU_MEDIA_CONFIG.activeUploadKinds,
      currentUser: state.currentUser ? { uid: state.currentUser.uid, email: state.currentUser.email } : null,
      tags: state.tags.map(function (t) {
        return {
          tagSlug: t.tagSlug,
          version: Number(t.version || 0),
          publicVersion: Number(t.publicVersion || 0),
          status: t.status,
          visibility: t.visibility
        };
      })
    };
    root.$('#debug-json').textContent = JSON.stringify(debug, null, 2);
  }

  async function archiveMedia(id) {
    if (!confirm('Archiviare questo media? La client app non lo vedrà più se era pubblico.')) return;
    await root.MediaService.archiveMedia(id);
    root.toast('Media archiviato e versione tag aggiornata.', 'success');
    await refreshTags();
    await refreshMedia();
  }

  async function hardDeleteMedia(id) {
    if (!confirm('Eliminazione definitiva: cancella documento Firestore e prova a cancellare il file R2. Continuare?')) return;
    var result = await root.MediaService.hardDeleteMediaAndR2(id);
    if (result && result.r2Error) {
      root.toast('Media rimosso da Firestore e versione tag aggiornata, ma cleanup R2 fallito: ' + result.r2Error, 'error');
    } else {
      root.toast('Media eliminato e versione tag aggiornata. R2 pulito se il Worker ha confermato.', 'success');
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
    root.$('#btn-refresh-tags').addEventListener('click', function () { run(refreshTags); });
    root.$('#btn-refresh-media').addEventListener('click', function () { run(refreshMedia); });
    root.$('#catalog-filters').addEventListener('change', function () { run(refreshMedia); });

    document.body.addEventListener('click', function (evt) {
      var editBtn = evt.target.closest('[data-edit-tag]');
      if (editBtn) return editTag(editBtn.dataset.editTag);

      var toggleBtn = evt.target.closest('[data-toggle-tag]');
      if (toggleBtn) return run(toggleTag, toggleBtn.dataset.toggleTag, toggleBtn.dataset.nextStatus);

      var openBtn = evt.target.closest('[data-open-url]');
      if (openBtn) return window.open(openBtn.dataset.openUrl, '_blank', 'noopener');

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
          renderDashboard();
        });
      } else {
        state.tags = [];
        state.media = [];
        renderTags();
        renderMedia();
        renderDashboard();
        renderDebug();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    boot().catch(function (err) { root.toast(err.message || String(err), 'error'); });
  });
})();
