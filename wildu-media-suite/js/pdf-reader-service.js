/* global WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  var PDFJS_VERSION = '3.11.174';
  var PDFJS_SCRIPT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/pdf.min.js';
  var PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/pdf.worker.min.js';

  var loadPromise = null;

  var DEFAULT_MAX_PAGES = 40;
  var HARD_MAX_PAGES = 120;
  var MAX_BLOCKS = 260;
  var MAX_TEXT_CHARS = 90000;
  var MAX_PATCH_JSON_BYTES = 850000;

  function safeString(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function normalizeText(value) {
    return safeString(value)
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function isPdfMedia(media) {
    if (!media) return false;

    var kind = safeString(media.kind || media.category).toLowerCase();
    var contentType = safeString(media.contentType).toLowerCase();
    var fileUrl = safeString(media.fileUrl).toLowerCase();
    var objectKey = safeString(media.objectKey).toLowerCase();

    return kind === 'pdf' ||
      contentType.indexOf('application/pdf') === 0 ||
      /\.pdf(\?|#|$)/i.test(fileUrl) ||
      /\.pdf(\?|#|$)/i.test(objectKey);
  }

  function normalizeMaxPages(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) n = DEFAULT_MAX_PAGES;
    if (n > HARD_MAX_PAGES) n = HARD_MAX_PAGES;
    return n;
  }

  function loadPdfJs() {
    if (window.pdfjsLib && typeof window.pdfjsLib.getDocument === 'function') {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      } catch (e) {}
      return Promise.resolve(window.pdfjsLib);
    }

    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      var existing = document.getElementById('wildu-admin-pdfjs-lib');

      if (existing) {
        existing.addEventListener('load', function () {
          try {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
          } catch (e) {}
          resolve(window.pdfjsLib);
        });
        existing.addEventListener('error', function () {
          reject(new Error('PDF.js non caricato.'));
        });
        return;
      }

      var script = document.createElement('script');
      script.id = 'wildu-admin-pdfjs-lib';
      script.src = PDFJS_SCRIPT_URL;
      script.async = true;

      script.onload = function () {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        } catch (e) {}

        if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== 'function') {
          reject(new Error('PDF.js caricato ma non disponibile.'));
          return;
        }

        resolve(window.pdfjsLib);
      };

      script.onerror = function () {
        reject(new Error('Impossibile caricare PDF.js dal CDN.'));
      };

      document.head.appendChild(script);
    });

    return loadPromise;
  }

  function buildReadableTextFromPdfItems(items) {
    var cleanItems = (items || [])
      .map(function (it) {
        var str = safeString(it.str);
        var tr = Array.isArray(it.transform) ? it.transform : [];

        return {
          text: str,
          x: Number(tr[4] || 0),
          y: Number(tr[5] || 0),
          w: Number(it.width || 0),
          h: Math.abs(Number(tr[3] || 0)) || 10
        };
      })
      .filter(function (it) { return !!it.text; });

    if (!cleanItems.length) return '';

    var lineTolerance = 4;
    var lines = [];

    cleanItems
      .sort(function (a, b) {
        if (Math.abs(b.y - a.y) > lineTolerance) return b.y - a.y;
        return a.x - b.x;
      })
      .forEach(function (item) {
        var line = lines.find(function (l) {
          return Math.abs(l.y - item.y) <= lineTolerance;
        });

        if (!line) {
          line = { y: item.y, h: item.h, items: [] };
          lines.push(line);
        }

        line.items.push(item);
        line.y = (line.y + item.y) / 2;
        line.h = Math.max(line.h, item.h);
      });

    lines.sort(function (a, b) { return b.y - a.y; });

    var renderedLines = lines.map(function (line) {
      line.items.sort(function (a, b) { return a.x - b.x; });

      var out = '';
      var prev = null;

      line.items.forEach(function (item) {
        if (!prev) {
          out += item.text;
          prev = item;
          return;
        }

        var prevEnd = prev.x + Math.max(prev.w, prev.text.length * 4);
        var gap = item.x - prevEnd;

        if (gap > 18) {
          out += '  ';
        } else if (gap > 2 && !/\s$/.test(out)) {
          out += ' ';
        }

        out += item.text;
        prev = item;
      });

      return {
        y: line.y,
        h: line.h,
        text: out.replace(/[ \t]+/g, ' ').trim()
      };
    }).filter(function (line) { return !!line.text; });

    if (!renderedLines.length) return '';

    var paragraphs = [];
    var current = [];

    for (var i = 0; i < renderedLines.length; i++) {
      var line = renderedLines[i];
      var prevLine = renderedLines[i - 1];

      if (!prevLine) {
        current.push(line.text);
        continue;
      }

      var verticalGap = Math.abs(prevLine.y - line.y);
      var normalLineHeight = Math.max(prevLine.h, line.h, 10);
      var previousLooksEnded =
        /[.!?:;…»")\]]$/.test(prevLine.text) ||
        prevLine.text.length < 55;

      var bigGap = verticalGap > normalLineHeight * 1.55;

      if (bigGap && previousLooksEnded) {
        if (current.length) paragraphs.push(current.join(' '));
        current = [line.text];
      } else {
        current.push(line.text);
      }
    }

    if (current.length) paragraphs.push(current.join(' '));

    return paragraphs
      .map(function (p) { return p.replace(/[ \t]+/g, ' ').trim(); })
      .filter(Boolean)
      .join('\n\n');
  }

  function normalizeForEditorialMatch(value) {
    return safeString(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^[\s\-–—•*]+/, '')
      .trim();
  }

  function isSourcesParagraph(text) {
    var clean = normalizeForEditorialMatch(text);
    return /^fonti(?:\b|\s|:|-|–|—)/i.test(clean);
  }

  function looksLikeNoteParagraph(text) {
    var clean = normalizeForEditorialMatch(text);
    return /^(nota|attenzione|curiosita|curiosità|consiglio|importante)(?:\b|\s|:|-|–|—)/i.test(clean);
  }

  function looksLikeHeadingParagraph(text) {
    var clean = safeString(text);
    if (!clean) return false;

    if (clean.length <= 78 && !/[.!?]$/.test(clean)) return true;

    var letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length >= 5) {
      var upper = clean.toUpperCase();
      if (clean === upper && clean.length <= 110) return true;
    }

    return false;
  }

  function moveSourcesBlocksToEnd(blocks) {
    var body = [];
    var sources = [];

    (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
      var text = safeString(block && block.text);

      if (isSourcesParagraph(text)) {
        sources.push(Object.assign({}, block, {
          type: 'note',
          role: 'sources',
          text: text
        }));
      } else {
        body.push(block);
      }
    });

    if (!sources.length) return body;

    return body.concat([
      { type: 'divider', role: 'sources-divider' },
      { type: 'heading', role: 'sources-heading', text: 'Fonti e riferimenti' }
    ]).concat(sources);
  }

  function splitTextToBlocks(rawText) {
    var text = normalizeText(rawText);
    if (!text) return [];

    var rough = text
      .split(/\n{2,}/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);

    var paragraphs = rough.length
      ? rough
      : text
        .replace(/([.!?])\s+/g, '$1\n')
        .split(/\n+/)
        .map(function (p) { return p.trim(); })
        .filter(Boolean);

    var blocks = [];
    var totalChars = 0;
    var firstTextBlockDone = false;

    paragraphs.forEach(function (p) {
      if (!p || blocks.length >= MAX_BLOCKS || totalChars >= MAX_TEXT_CHARS) return;

      if (totalChars + p.length > MAX_TEXT_CHARS) {
        p = p.slice(0, Math.max(0, MAX_TEXT_CHARS - totalChars)).trim();
      }

      if (!p) return;

      var type = 'paragraph';
      var role = '';

      if (isSourcesParagraph(p)) {
        type = 'note';
        role = 'sources';
      } else if (looksLikeNoteParagraph(p)) {
        type = 'note';
      } else if (looksLikeHeadingParagraph(p)) {
        type = 'heading';
      } else if (!firstTextBlockDone && p.length <= 520) {
        type = 'lead';
      }

      var block = { type: type, text: p };
      if (role) block.role = role;

      blocks.push(block);
      if (type !== 'divider') firstTextBlockDone = true;

      totalChars += p.length;
    });

    return moveSourcesBlocksToEnd(blocks);
  }

  function buildPreview(blocks, maxChars) {
    maxChars = maxChars || 900;

    var text = normalizeText((blocks || [])
      .filter(function (b) { return b && b.type !== 'image' && b.type !== 'html'; })
      .map(function (b) { return b.text || ''; })
      .join('\n\n'));

    if (!text) return '';

    return text.length > maxChars
      ? text.slice(0, maxChars).replace(/\s+\S*$/, '') + '…'
      : text;
  }

  function estimatePatchBytes(patch) {
    try {
      return new Blob([JSON.stringify(patch || {})]).size;
    } catch (e) {
      return JSON.stringify(patch || {}).length;
    }
  }

  function trimPatchToFirestoreLimit(patch) {
    var next = Object.assign({}, patch);
    next.readerBlocks = Array.isArray(next.readerBlocks) ? next.readerBlocks.slice() : [];

    while (next.readerBlocks.length > 20 && estimatePatchBytes(next) > MAX_PATCH_JSON_BYTES) {
      next.readerBlocks.pop();
    }

    next.readerPreview = buildPreview(next.readerBlocks, 900);
    next.readerBlockCount = next.readerBlocks.length;
    next.readerCharCount = next.readerBlocks.reduce(function (sum, block) {
      return sum + safeString(block.text).length;
    }, 0);

    return next;
  }

  function buildPatchFromBlocks(media, blocks, meta) {
    media = media || {};
    meta = meta || {};

    var sourceVersion = Math.max(1, Number(media.mediaVersion || media.readerSourceMediaVersion || 1));
    var nextReaderVersion = Math.max(1, Number(media.readerVersion || 0) + 1);
    var preview = buildPreview(blocks, 900);

    var patch = {
      readerStatus: 'READY',
      readerBuildMode: 'admin-browser-pdfjs-editorial-v2',
      readerEditorialVersion: 2,
      readerSourcesMovedToEnd: (blocks || []).some(function (block) { return block && block.role === 'sources'; }),
      readerVersion: nextReaderVersion,
      readerSourceMediaVersion: sourceVersion,
      readerGeneratedAt: root.FieldValue.serverTimestamp(),
      readerGeneratedByUid: root.requireCurrentUser().uid,
      readerGeneratedByEmail: root.requireCurrentUser().email || null,
      readerSourceFileUrl: safeString(media.fileUrl || ''),
      readerSourceObjectKey: safeString(media.objectKey || ''),
      readerSourceTitle: safeString(media.title || ''),
      readerOriginalPageCount: Number(meta.originalPageCount || 0),
      readerPagesProcessed: Number(meta.pagesProcessed || 0),
      readerBlockCount: Array.isArray(blocks) ? blocks.length : 0,
      readerCharCount: (blocks || []).reduce(function (sum, block) {
        return sum + safeString(block.text).length;
      }, 0),
      readerPreview: preview,
      readerBlocks: Array.isArray(blocks) ? blocks : [],

      // Pulizia intenzionale dei vecchi campi alternativi:
      // il client userà readerBlocks come fonte principale.
      readerText: null,
      readerHtml: null
    };

    return trimPatchToFirestoreLimit(patch);
  }

  async function buildReaderPatchFromMedia(media, options) {
    options = options || {};

    if (!media || !media.id) {
      throw new Error('Media non valido per Reader Build.');
    }

    if (!isPdfMedia(media)) {
      throw new Error('Reader Build disponibile solo per PDF.');
    }

    var fileUrl = safeString(media.fileUrl);
    if (!fileUrl) {
      throw new Error('fileUrl PDF mancante.');
    }

    var maxPages = normalizeMaxPages(options.maxPages);
    var onProgress = typeof options.onProgress === 'function' ? options.onProgress : function () {};

    onProgress('Caricamento PDF.js...');
    var pdfjs = await loadPdfJs();

    onProgress('Apertura PDF...');
    var loadingTask = pdfjs.getDocument({
      url: fileUrl,
      withCredentials: false
    });

    var pdfDoc = await loadingTask.promise;
    var pageCount = Number(pdfDoc.numPages || 0);
    var pagesToProcess = Math.max(1, Math.min(pageCount || 1, maxPages));

    var fullText = '';

    for (var pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      onProgress('Estrazione testo pagina ' + pageNum + ' / ' + pagesToProcess + '...');
      var page = await pdfDoc.getPage(pageNum);
      var textContent = await page.getTextContent();
      var pageText = buildReadableTextFromPdfItems(textContent.items || []);

      if (pageText) {
        fullText += '\n\n' + pageText;
      }

      if (fullText.length >= MAX_TEXT_CHARS) {
        fullText = fullText.slice(0, MAX_TEXT_CHARS);
        break;
      }
    }

    var blocks = splitTextToBlocks(fullText);

    if (!blocks.length) {
      throw new Error('Nessun testo estraibile dal PDF. Probabile scansione/immagine: servirà OCR esterno o contenuto manuale.');
    }

    onProgress('Preparazione reader editoriale e riordino Fonti...');
    return buildPatchFromBlocks(media, blocks, {
      originalPageCount: pageCount,
      pagesProcessed: pagesToProcess
    });
  }

  function buildClearReaderPatch(media) {
    media = media || {};

    return {
      readerStatus: 'CLEARED',
      readerBuildMode: null,
      readerVersion: Math.max(1, Number(media.readerVersion || 0) + 1),
      readerSourceMediaVersion: null,
      readerGeneratedAt: root.FieldValue.serverTimestamp(),
      readerGeneratedByUid: root.requireCurrentUser().uid,
      readerGeneratedByEmail: root.requireCurrentUser().email || null,
      readerSourceFileUrl: null,
      readerSourceObjectKey: null,
      readerSourceTitle: null,
      readerOriginalPageCount: null,
      readerPagesProcessed: null,
      readerBlockCount: 0,
      readerCharCount: 0,
      readerPreview: null,
      readerBlocks: null,
      readerText: null,
      readerHtml: null
    };
  }

  root.PdfReaderService = {
    isPdfMedia: isPdfMedia,
    loadPdfJs: loadPdfJs,
    buildReaderPatchFromMedia: buildReaderPatchFromMedia,
    buildClearReaderPatch: buildClearReaderPatch
  };
})();
