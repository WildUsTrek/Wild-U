(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function $all(selector, parent) {
    return Array.prototype.slice.call((parent || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function slugify(value) {
    var text = normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
    return text || 'senza-titolo';
  }

  function parseTags(value) {
    return String(value || '')
      .split(',')
      .map(function (x) { return slugify(x); })
      .filter(Boolean)
      .filter(function (x, index, arr) { return arr.indexOf(x) === index; });
  }

  function isPublicVisibleMedia(media) {
    return media && media.status === 'ACTIVE' && media.visibility === 'PUBLIC';
  }

  function formatBytes(bytes) {
    var n = Number(bytes || 0);
    if (!n) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) {
      n = n / 1024;
      i++;
    }
    return (i === 0 ? n.toFixed(0) : n.toFixed(1)) + ' ' + units[i];
  }

  function toDateTimeLabel(value) {
    if (!value) return '—';
    var date = null;
    if (typeof value.toDate === 'function') date = value.toDate();
    else if (value instanceof Date) date = value;
    else if (typeof value === 'number') date = new Date(value);
    if (!date || isNaN(date.getTime())) return '—';
    return date.toLocaleString('it-IT');
  }

  function setStatus(message, type) {
    var box = $('#status-line');
    if (!box) return;
    box.textContent = message || '';
    box.className = 'status-line ' + (type || '');
  }

  function toast(message, type) {
    setStatus(message, type || 'info');
    if (type === 'error') console.error('[WilduMedia]', message);
    else console.log('[WilduMedia]', message);
  }

  function requireCurrentUser() {
    var auth = root.auth;
    var user = auth && auth.currentUser;
    if (!user) throw new Error('Admin non loggato. Esegui il login prima di continuare.');
    return user;
  }

  function validateFileForKind(file, kind) {
    var cfg = window.WILDU_MEDIA_CONFIG;
    var max = cfg.maxSizeBytesByKind[kind];
    if (!file) throw new Error('Seleziona un file.');
    if (!kind) throw new Error('Seleziona una categoria.');
    if (kind === 'gpx') throw new Error('GPX escluso da questa app: usa la mini-app mappa.');
    if (max && file.size > max) {
      throw new Error('File troppo grande per ' + kind + ': ' + formatBytes(file.size) + ' / max ' + formatBytes(max));
    }

    var allowed = cfg.allowedMimePrefixesByKind[kind] || [];
    if (allowed.length) {
      var ok = allowed.some(function (prefix) {
        if (prefix.endsWith('/')) return String(file.type || '').indexOf(prefix) === 0;
        return String(file.type || '') === prefix;
      });
      if (!ok) {
        throw new Error('Content-Type non previsto per ' + kind + ': ' + (file.type || 'sconosciuto'));
      }
    }
  }

  root.$ = $;
  root.$all = $all;
  root.escapeHtml = escapeHtml;
  root.normalizeText = normalizeText;
  root.slugify = slugify;
  root.parseTags = parseTags;
  root.isPublicVisibleMedia = isPublicVisibleMedia;
  root.formatBytes = formatBytes;
  root.toDateTimeLabel = toDateTimeLabel;
  root.toast = toast;
  root.requireCurrentUser = requireCurrentUser;
  root.validateFileForKind = validateFileForKind;
})();
