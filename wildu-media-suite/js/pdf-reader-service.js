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

  var IMAGE_RENDER_TARGET_WIDTH = 1180;
  var IMAGE_OUTPUT_MAX_WIDTH = 980;
  var IMAGE_WEBP_QUALITY = 0.74;
  var MAX_READER_IMAGES = 8;
  var MAX_IMAGES_PER_PAGE = 3;
  var MIN_IMAGE_CROP_WIDTH = 170;
  var MIN_IMAGE_CROP_HEIGHT = 92;
  var MIN_VISUAL_RATIO = 0.010;
  var VISUAL_SAMPLE_STEP = 6;

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
    return /^(fonte|fonti|bibliografia|riferimenti|riferimento|sitografia|fonti consultate|fonti e riferimenti)(?:\b|\s|:|-|–|—)/i.test(clean);
  }

  function isSourcesHeadingOnly(text) {
    var clean = normalizeForEditorialMatch(text).replace(/[:\-–—]+$/g, '').trim();
    return /^(fonte|fonti|bibliografia|riferimenti|riferimento|sitografia|fonti consultate|fonti e riferimenti)$/.test(clean);
  }

  function stripSourcesHeadingPrefix(text) {
    var raw = safeString(text);
    return raw.replace(/^\s*(fonte|fonti|bibliografia|riferimenti|riferimento|sitografia|fonti consultate|fonti e riferimenti)\s*[:\-–—]?\s*/i, '').trim();
  }

  function looksLikeSourceCitation(text) {
    var raw = safeString(text);
    var clean = normalizeForEditorialMatch(raw);
    if (!clean) return false;

    if (isSourcesParagraph(raw)) return true;
    if (/https?:\/\//i.test(raw) || /\bwww\./i.test(raw)) return true;
    if (/\bdoi\s*:/i.test(raw) || /\bisbn\s*:/i.test(raw)) return true;
    if (/\b(consultato|accesso|fonte dati|elaborazione|archivio|biblioteca|ministero|istat|wikipedia|treccani|universita|università)\b/i.test(raw)) return true;
    if (/^\s*(\[[0-9]+\]|[0-9]+[.)])\s+/.test(raw) && raw.length < 360) return true;
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(raw)) return true;
    if (/\b[a-z0-9-]+\.(it|com|org|net|edu|gov|eu)(\/|\b)/i.test(raw)) return true;

    return false;
  }

  function looksLikeArticleContinuation(text) {
    var raw = safeString(text);
    if (!raw) return false;
    if (looksLikeSourceCitation(raw)) return false;
    if (looksLikeHeadingParagraph(raw)) return true;
    if (raw.length > 180) return true;
    if (/^[A-ZÀ-Ý][a-zà-ÿ].*[.!?]$/.test(raw) && raw.split(/\s+/).length >= 8) return true;
    return false;
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

  function pushSourceBlock(sources, block, text) {
    var cleanText = stripSourcesHeadingPrefix(text) || safeString(text);
    if (!cleanText) return;
    if (isSourcesHeadingOnly(cleanText)) return;

    sources.push(Object.assign({}, block, {
      type: 'note',
      role: 'sources',
      text: cleanText
    }));
  }

  function moveSourcesBlocksToEnd(blocks) {
    var body = [];
    var sources = [];
    var pendingSourcesHeading = false;

    (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
      if (!block) return;

      var text = safeString(block.text);
      var role = safeString(block.role).toLowerCase();
      var isTextLike = block.type !== 'image' && block.type !== 'heroImage' && block.type !== 'html' && text;

      if (!isTextLike) {
        body.push(block);
        return;
      }

      var explicitSource = role === 'sources' || isSourcesParagraph(text);
      var headingOnly = explicitSource && isSourcesHeadingOnly(text);

      // Caso “Fonti” / “Bibliografia” come intestazione: non sposta tutto il seguito.
      // Attiva solo una finestra breve; appena trova un paragrafo articolo vero, si ferma.
      if (headingOnly) {
        pendingSourcesHeading = true;
        return;
      }

      // Caso “Fonte: ...” nello stesso blocco: sposta solo quel blocco.
      if (explicitSource) {
        pushSourceBlock(sources, block, text);
        pendingSourcesHeading = false;
        return;
      }

      // Caso blocchi immediatamente dopo una intestazione Fonti/Bibliografia.
      if (pendingSourcesHeading) {
        if (looksLikeSourceCitation(text) && !looksLikeArticleContinuation(text)) {
          pushSourceBlock(sources, block, text);
          return;
        }

        pendingSourcesHeading = false;
      }

      body.push(block);
    });

    if (!sources.length) return body;

    return body.concat([
      { type: 'divider', role: 'sources-divider' },
      { type: 'heading', role: 'sources-heading', text: 'Fonti e riferimenti' }
    ]).concat(sources);
  }

  function classifyReaderParagraph(p, firstTextBlockDone) {
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
    return block;
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

      var block = classifyReaderParagraph(p, firstTextBlockDone);
      blocks.push(block);
      if (block.type !== 'divider') firstTextBlockDone = true;

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


  function lineLooksLikeListItem(text) {
    return /^\s*([•\-*–—]|[0-9]{1,3}[.)]|[A-Za-z][.)])\s+/.test(safeString(text));
  }

  function lineLooksLikeStandalone(text) {
    var raw = safeString(text);
    if (!raw) return false;
    if (lineLooksLikeListItem(raw)) return true;
    if (isSourcesParagraph(raw) || looksLikeNoteParagraph(raw)) return true;
    if (looksLikeHeadingParagraph(raw) && raw.length <= 110) return true;
    return false;
  }

  function shouldSplitParagraph(prevLine, line, verticalGap, normalLineHeight) {
    if (!prevLine) return false;

    var prevText = safeString(prevLine.text);
    var text = safeString(line.text);
    var bigGap = verticalGap > normalLineHeight * 1.45;
    var veryBigGap = verticalGap > normalLineHeight * 2.15;
    var indentShift = Math.abs((line.xPdfMin || 0) - (prevLine.xPdfMin || 0));

    if (veryBigGap) return true;
    if (bigGap && (/[.!?:;…»")\]]$/.test(prevText) || prevText.length < 70 || text.length < 70)) return true;
    if (lineLooksLikeListItem(text)) return true;
    if (isSourcesParagraph(text) || isSourcesParagraph(prevText)) return true;
    if (looksLikeNoteParagraph(text)) return true;
    if (looksLikeHeadingParagraph(text) && (bigGap || text.length <= 80)) return true;
    if (indentShift > 34 && (bigGap || lineLooksLikeStandalone(text) || lineLooksLikeStandalone(prevText))) return true;

    return false;
  }

  function shouldKeepLineBreakInsideParagraph(prevLine, line, verticalGap, normalLineHeight) {
    if (!prevLine) return false;

    var prevText = safeString(prevLine.text);
    var text = safeString(line.text);
    var bigGap = verticalGap > normalLineHeight * 1.25;
    var indentShift = Math.abs((line.xPdfMin || 0) - (prevLine.xPdfMin || 0));

    if (lineLooksLikeListItem(text)) return true;
    if (lineLooksLikeStandalone(text) || lineLooksLikeStandalone(prevText)) return true;
    if (bigGap && (prevText.length < 95 || text.length < 95)) return true;
    if (indentShift > 26 && (prevText.length < 120 || text.length < 120)) return true;

    // Se la riga precedente finisce con punteggiatura forte e la riga dopo parte maiuscola,
    // spesso nel PDF era un a capo intenzionale, non solo wrap tipografico.
    if (/[.!?…]$/.test(prevText) && /^[A-ZÀ-Ý0-9]/.test(text) && prevText.length < 150) return true;

    return false;
  }

  function joinLinesPreservingSemanticBreaks(lines) {
    var out = '';

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var text = safeString(line.text);
      if (!text) continue;

      if (!out) {
        out = text;
        continue;
      }

      var prev = lines[i - 1];
      var verticalGap = Math.abs((prev && prev.yPdf) - line.yPdf);
      var normalLineHeight = Math.max((prev && prev.hPdf) || 10, line.hPdf || 10, 10);

      if (shouldKeepLineBreakInsideParagraph(prev, line, verticalGap, normalLineHeight)) {
        out += '\n' + text;
      } else {
        out += ' ' + text;
      }
    }

    return out.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
  }

  function buildReadableParagraphObjectsFromPdfItems(items) {
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

    if (!cleanItems.length) return [];

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
          line = { y: item.y, h: item.h, xMin: item.x, xMax: item.x + item.w, items: [] };
          lines.push(line);
        }

        line.items.push(item);
        line.y = (line.y + item.y) / 2;
        line.h = Math.max(line.h, item.h);
        line.xMin = Math.min(line.xMin, item.x);
        line.xMax = Math.max(line.xMax, item.x + item.w);
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

        if (gap > 18) out += '  ';
        else if (gap > 2 && !/\s$/.test(out)) out += ' ';

        out += item.text;
        prev = item;
      });

      return {
        yPdf: line.y,
        hPdf: line.h,
        xPdfMin: line.xMin,
        xPdfMax: line.xMax,
        text: out.replace(/[ \t]+/g, ' ').trim()
      };
    }).filter(function (line) { return !!line.text; });

    if (!renderedLines.length) return [];

    var paragraphs = [];
    var current = [];

    function flushCurrent() {
      if (!current.length) return;
      var text = joinLinesPreservingSemanticBreaks(current);
      if (!text) {
        current = [];
        return;
      }
      paragraphs.push({
        text: text,
        yPdfTop: Math.max.apply(null, current.map(function (line) { return line.yPdf + line.hPdf; })),
        yPdfBottom: Math.min.apply(null, current.map(function (line) { return line.yPdf - line.hPdf; })),
        xPdfMin: Math.min.apply(null, current.map(function (line) { return line.xPdfMin; })),
        xPdfMax: Math.max.apply(null, current.map(function (line) { return line.xPdfMax; })),
        lineCount: current.length
      });
      current = [];
    }

    for (var i = 0; i < renderedLines.length; i++) {
      var line = renderedLines[i];
      var prevLine = renderedLines[i - 1];

      if (!prevLine) {
        current.push(line);
        continue;
      }

      var verticalGap = Math.abs(prevLine.yPdf - line.yPdf);
      var normalLineHeight = Math.max(prevLine.hPdf, line.hPdf, 10);

      if (shouldSplitParagraph(prevLine, line, verticalGap, normalLineHeight)) {
        flushCurrent();
        current.push(line);
      } else {
        current.push(line);
      }
    }

    flushCurrent();
    return paragraphs;
  }

  function buildTextBlocksForPage(textContent, pageNum, pageHeight, scale, firstTextBlockDoneRef) {
    var paragraphs = buildReadableParagraphObjectsFromPdfItems(textContent.items || []);
    var blocks = [];

    paragraphs.forEach(function (paragraph) {
      var p = safeString(paragraph.text);
      if (!p) return;

      var block = classifyReaderParagraph(p, !!firstTextBlockDoneRef.value);
      block.page = pageNum;
      block.yCanvasTop = Math.max(0, (pageHeight - paragraph.yPdfTop) * scale);
      block.yCanvasBottom = Math.max(block.yCanvasTop, (pageHeight - paragraph.yPdfBottom) * scale);
      block.xPdfMin = paragraph.xPdfMin;
      block.xPdfMax = paragraph.xPdfMax;

      blocks.push(block);
      firstTextBlockDoneRef.value = true;
    });

    return blocks;
  }

  function mergeRanges(ranges, gap) {
    gap = gap || 8;
    var sorted = (ranges || [])
      .filter(function (r) { return r && r.end > r.start; })
      .sort(function (a, b) { return a.start - b.start; });

    var out = [];
    sorted.forEach(function (r) {
      if (!out.length || r.start > out[out.length - 1].end + gap) {
        out.push({ start: r.start, end: r.end });
      } else {
        out[out.length - 1].end = Math.max(out[out.length - 1].end, r.end);
      }
    });
    return out;
  }

  function getTextCoverageRanges(textContent, pageHeight, scale, canvasHeight) {
    var ranges = [];

    (textContent.items || []).forEach(function (it) {
      var str = safeString(it.str);
      if (!str) return;

      var tr = Array.isArray(it.transform) ? it.transform : [];
      var yPdf = Number(tr[5] || 0);
      var hPdf = Math.abs(Number(tr[3] || 0)) || 10;
      var y = (pageHeight - yPdf) * scale;
      var h = Math.max(10, hPdf * scale);

      ranges.push({
        start: Math.max(0, y - h * 1.45),
        end: Math.min(canvasHeight, y + h * 0.85)
      });
    });

    return mergeRanges(ranges, 10);
  }

  function getTextRects(textContent, pageHeight, scale, canvasWidth, canvasHeight) {
    var rects = [];

    (textContent.items || []).forEach(function (it) {
      var str = safeString(it.str);
      if (!str) return;

      var tr = Array.isArray(it.transform) ? it.transform : [];
      var xPdf = Number(tr[4] || 0);
      var yPdf = Number(tr[5] || 0);
      var wPdf = Number(it.width || 0);
      var hPdf = Math.abs(Number(tr[3] || 0)) || 10;

      var x = xPdf * scale;
      var y = (pageHeight - yPdf) * scale;
      var w = Math.max(8, wPdf * scale);
      var h = Math.max(10, hPdf * scale);

      rects.push({
        x1: Math.max(0, x - 5),
        y1: Math.max(0, y - h * 1.60),
        x2: Math.min(canvasWidth, x + w + 5),
        y2: Math.min(canvasHeight, y + h * 0.90)
      });
    });

    return rects;
  }

  function pointInTextRect(x, y, rects) {
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) return true;
    }
    return false;
  }

  function findVerticalVisualGaps(textRanges, canvasHeight) {
    var gaps = [];
    var cursor = 18;
    var ranges = textRanges && textRanges.length ? textRanges : [];

    ranges.forEach(function (range) {
      var start = Math.max(0, range.start);
      var end = Math.min(canvasHeight, range.end);

      if (start - cursor >= MIN_IMAGE_CROP_HEIGHT) {
        gaps.push({ y1: cursor, y2: start });
      }

      cursor = Math.max(cursor, end);
    });

    if (canvasHeight - 18 - cursor >= MIN_IMAGE_CROP_HEIGHT) {
      gaps.push({ y1: cursor, y2: canvasHeight - 18 });
    }

    return gaps;
  }

  function isPixelVisual(r, g, b, a) {
    if (a < 20) return false;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var lum = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);

    // Scarta bianco/grigio quasi uniforme di sfondo, accetta foto, grafici, linee colorate.
    return lum < 238 || (max - min) > 24;
  }

  function analyzeVisualBounds(canvas, y1, y2) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var width = canvas.width;
    var height = canvas.height;
    var top = Math.max(0, Math.floor(y1));
    var bottom = Math.min(height, Math.ceil(y2));
    var cropH = bottom - top;

    if (cropH < MIN_IMAGE_CROP_HEIGHT) return null;

    var step = 7;
    var visualCount = 0;
    var sampleCount = 0;
    var minX = width;
    var minY = bottom;
    var maxX = 0;
    var maxY = top;

    var data;
    try {
      data = ctx.getImageData(0, top, width, cropH).data;
    } catch (e) {
      return null;
    }

    for (var y = 0; y < cropH; y += step) {
      for (var x = 0; x < width; x += step) {
        var idx = ((y * width) + x) * 4;
        var r = data[idx];
        var g = data[idx + 1];
        var b = data[idx + 2];
        var a = data[idx + 3];
        sampleCount++;

        if (isPixelVisual(r, g, b, a)) {
          visualCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          var absY = top + y;
          if (absY < minY) minY = absY;
          if (absY > maxY) maxY = absY;
        }
      }
    }

    var ratio = sampleCount ? visualCount / sampleCount : 0;
    if (ratio < MIN_VISUAL_RATIO) return null;

    var pad = 22;
    minX = Math.max(0, minX - pad);
    maxX = Math.min(width, maxX + pad);
    minY = Math.max(0, minY - pad);
    maxY = Math.min(height, maxY + pad);

    var w = maxX - minX;
    var h = maxY - minY;

    if (w < MIN_IMAGE_CROP_WIDTH || h < MIN_IMAGE_CROP_HEIGHT) return null;
    if (h < 70 && w < width * 0.70) return null;

    return {
      x: Math.floor(minX),
      y: Math.floor(minY),
      w: Math.ceil(w),
      h: Math.ceil(h),
      yCanvasTop: Math.floor(minY),
      yCanvasBottom: Math.ceil(maxY),
      visualRatio: ratio,
      score: (w * h) * Math.min(0.35, ratio)
    };
  }


  function normalizeCandidateBounds(bounds, canvas) {
    if (!bounds) return null;
    var width = canvas.width;
    var height = canvas.height;
    var x = Math.max(0, Math.floor(bounds.x));
    var y = Math.max(0, Math.floor(bounds.y));
    var w = Math.min(width - x, Math.ceil(bounds.w));
    var h = Math.min(height - y, Math.ceil(bounds.h));

    if (w < MIN_IMAGE_CROP_WIDTH || h < MIN_IMAGE_CROP_HEIGHT) return null;
    if (w > width * 0.96 && h > height * 0.78) return null;
    if (h < 70 && w < width * 0.70) return null;

    return Object.assign({}, bounds, {
      x: x,
      y: y,
      w: w,
      h: h,
      yCanvasTop: y,
      yCanvasBottom: y + h
    });
  }

  function overlapRatio(a, b) {
    var x1 = Math.max(a.x, b.x);
    var y1 = Math.max(a.y, b.y);
    var x2 = Math.min(a.x + a.w, b.x + b.w);
    var y2 = Math.min(a.y + a.h, b.y + b.h);
    var inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (!inter) return 0;
    var minArea = Math.min(a.w * a.h, b.w * b.h) || 1;
    return inter / minArea;
  }

  function dedupeCandidates(candidates, canvas) {
    var out = [];
    (candidates || [])
      .map(function (c) { return normalizeCandidateBounds(c, canvas); })
      .filter(Boolean)
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0); })
      .forEach(function (c) {
        var duplicate = out.some(function (existing) {
          return overlapRatio(c, existing) > 0.55;
        });
        if (!duplicate) out.push(c);
      });

    return out;
  }

  function findVisualComponentCandidates(canvas, textRects) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var width = canvas.width;
    var height = canvas.height;
    var step = VISUAL_SAMPLE_STEP;
    var cols = Math.ceil(width / step);
    var rows = Math.ceil(height / step);
    var data;

    try {
      data = ctx.getImageData(0, 0, width, height).data;
    } catch (e) {
      return [];
    }

    var mask = new Uint8Array(cols * rows);

    function idx(col, row) { return row * cols + col; }

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var x = Math.min(width - 1, Math.floor(col * step + step / 2));
        var y = Math.min(height - 1, Math.floor(row * step + step / 2));

        if (pointInTextRect(x, y, textRects)) continue;

        var p = ((y * width) + x) * 4;
        if (isPixelVisual(data[p], data[p + 1], data[p + 2], data[p + 3])) {
          mask[idx(col, row)] = 1;
        }
      }
    }

    var visited = new Uint8Array(cols * rows);
    var candidates = [];
    var queue = [];

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var start = idx(c, r);
        if (!mask[start] || visited[start]) continue;

        var minC = c;
        var maxC = c;
        var minR = r;
        var maxR = r;
        var count = 0;

        queue.length = 0;
        queue.push(start);
        visited[start] = 1;

        while (queue.length) {
          var cur = queue.pop();
          var cr = Math.floor(cur / cols);
          var cc = cur - cr * cols;
          count++;

          if (cc < minC) minC = cc;
          if (cc > maxC) maxC = cc;
          if (cr < minR) minR = cr;
          if (cr > maxR) maxR = cr;

          var neighbors = [
            [cc + 1, cr], [cc - 1, cr], [cc, cr + 1], [cc, cr - 1],
            [cc + 1, cr + 1], [cc - 1, cr - 1], [cc + 1, cr - 1], [cc - 1, cr + 1]
          ];

          for (var n = 0; n < neighbors.length; n++) {
            var nc = neighbors[n][0];
            var nr = neighbors[n][1];
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
            var ni = idx(nc, nr);
            if (!mask[ni] || visited[ni]) continue;
            visited[ni] = 1;
            queue.push(ni);
          }
        }

        var x1 = Math.max(0, minC * step - 20);
        var y1 = Math.max(0, minR * step - 20);
        var x2 = Math.min(width, (maxC + 1) * step + 20);
        var y2 = Math.min(height, (maxR + 1) * step + 20);
        var w = x2 - x1;
        var h = y2 - y1;
        var sampledArea = Math.max(1, (maxC - minC + 1) * (maxR - minR + 1));
        var density = count / sampledArea;

        if (count < 18) continue;
        if (w < MIN_IMAGE_CROP_WIDTH || h < MIN_IMAGE_CROP_HEIGHT) continue;
        if (density < 0.025 && w * h < width * height * 0.06) continue;

        candidates.push({
          x: x1,
          y: y1,
          w: w,
          h: h,
          yCanvasTop: y1,
          yCanvasBottom: y2,
          visualRatio: Number(density.toFixed(4)),
          score: (w * h) * Math.min(0.42, density)
        });
      }
    }

    return candidates;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (!blob) reject(new Error('Impossibile generare immagine dal canvas.'));
          else resolve(blob);
        }, type || 'image/webp', quality || IMAGE_WEBP_QUALITY);
      } catch (e) {
        reject(e);
      }
    });
  }

  async function cropCanvasToOptimizedBlob(sourceCanvas, bounds) {
    var scaleDown = bounds.w > IMAGE_OUTPUT_MAX_WIDTH ? IMAGE_OUTPUT_MAX_WIDTH / bounds.w : 1;
    var outW = Math.max(1, Math.round(bounds.w * scaleDown));
    var outH = Math.max(1, Math.round(bounds.h * scaleDown));

    var out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;

    var ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, outW, outH);

    return canvasToBlob(out, 'image/webp', IMAGE_WEBP_QUALITY);
  }

  function cleanObjectKeyPart(value) {
    return safeString(value)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'media';
  }

  function padNumber(num, size) {
    var s = String(num || 0);
    while (s.length < size) s = '0' + s;
    return s;
  }

  async function uploadReaderImage(media, blob, imageIndex, pageNum, readerVersion) {
    if (!root.R2WorkerService || typeof root.R2WorkerService.requestUploadUrl !== 'function') {
      throw new Error('R2WorkerService non disponibile per upload immagini reader.');
    }

    var mediaKey = cleanObjectKeyPart(media.id || media.objectKey || media.title || 'pdf');
    var fileName = 'wildu-reader/pdf/' + mediaKey + '/v' + readerVersion + '/p' + padNumber(pageNum, 3) + '-img' + padNumber(imageIndex, 2) + '.webp';

    var uploadInfo = await root.R2WorkerService.requestUploadUrl({
      kind: 'image',
      tagSlug: 'immagini',
      subcategory: 'pdf-reader',
      fileName: fileName,
      contentType: 'image/webp',
      sizeBytes: blob.size
    });

    await root.R2WorkerService.putFileToR2(uploadInfo.uploadUrl, blob, 'image/webp');

    return {
      publicUrl: uploadInfo.publicUrl,
      objectKey: uploadInfo.objectKey || fileName,
      sizeBytes: blob.size
    };
  }

  async function renderPageCanvas(page) {
    var viewport1 = page.getViewport({ scale: 1 });
    var scale = IMAGE_RENDER_TARGET_WIDTH / Math.max(1, viewport1.width);
    scale = Math.max(0.75, Math.min(2.25, scale));

    var viewport = page.getViewport({ scale: scale });
    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    var ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    return {
      canvas: canvas,
      scale: scale,
      pageWidth: viewport1.width,
      pageHeight: viewport1.height
    };
  }

  async function buildImageBlocksForPage(media, page, pageNum, textContent, nextReaderVersion, imageState, onProgress) {
    if (imageState.total >= MAX_READER_IMAGES) return [];

    var rendered = await renderPageCanvas(page);
    var canvas = rendered.canvas;
    var textRanges = getTextCoverageRanges(textContent, rendered.pageHeight, rendered.scale, canvas.height);
    var textRects = getTextRects(textContent, rendered.pageHeight, rendered.scale, canvas.width, canvas.height);
    var gaps = findVerticalVisualGaps(textRanges, canvas.height);

    // Se non c'è testo, consideriamo una tavola unica ma ottimizzata: serve per PDF scansionati/illustrati.
    if (!textRanges.length && canvas.height >= MIN_IMAGE_CROP_HEIGHT) {
      gaps = [{ y1: 18, y2: canvas.height - 18 }];
    }

    var candidates = [];

    // V4: componenti visuali reali, anche affiancate o vicine al testo.
    candidates = candidates.concat(findVisualComponentCandidates(canvas, textRects));

    // Fallback V3: fasce verticali libere, utile per hero/header e immagini a tutta larghezza.
    gaps.forEach(function (gap) {
      var bounds = analyzeVisualBounds(canvas, gap.y1, gap.y2);
      if (bounds) candidates.push(bounds);
    });

    candidates = dedupeCandidates(candidates, canvas)
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, MAX_IMAGES_PER_PAGE)
      .sort(function (a, b) { return a.yCanvasTop - b.yCanvasTop; });

    var blocks = [];

    for (var i = 0; i < candidates.length && imageState.total < MAX_READER_IMAGES; i++) {
      var c = candidates[i];
      try {
        onProgress('Ottimizzo immagine pagina ' + pageNum + '...');
        var blob = await cropCanvasToOptimizedBlob(canvas, c);

        // Se è minuscola, è probabilmente un fregio, una linea o rumore visivo.
        if (!blob || blob.size < 3200) continue;

        imageState.total += 1;
        onProgress('Carico immagine reader ' + imageState.total + ' su R2...');
        var uploaded = await uploadReaderImage(media, blob, imageState.total, pageNum, nextReaderVersion);

        var isHero = imageState.total === 1 && (pageNum === 1 || c.yCanvasTop < canvas.height * 0.28) && c.w >= canvas.width * 0.42;

        blocks.push({
          type: 'image',
          role: isHero ? 'hero' : 'inline',
          url: uploaded.publicUrl,
          objectKey: uploaded.objectKey,
          alt: 'Immagine dal PDF originale, pagina ' + pageNum,
          caption: 'Dal PDF originale · pagina ' + pageNum,
          page: pageNum,
          yCanvasTop: c.yCanvasTop,
          yCanvasBottom: c.yCanvasBottom,
          width: c.w,
          height: c.h,
          sizeBytes: uploaded.sizeBytes,
          visualRatio: Number((c.visualRatio || 0).toFixed ? c.visualRatio.toFixed(4) : c.visualRatio || 0),
          detector: c.detector || 'visual-component-v4'
        });
      } catch (e) {
        imageState.errors.push('Pagina ' + pageNum + ': ' + (e && e.message ? e.message : String(e)));
      }
    }

    return blocks;
  }

  function mergeTextAndImageBlocks(textBlocks, imageBlocks) {
    var text = (textBlocks || []).slice().sort(function (a, b) {
      if ((a.page || 0) !== (b.page || 0)) return (a.page || 0) - (b.page || 0);
      return (a.yCanvasTop || 0) - (b.yCanvasTop || 0);
    });

    var images = (imageBlocks || []).slice().sort(function (a, b) {
      if ((a.page || 0) !== (b.page || 0)) return (a.page || 0) - (b.page || 0);
      return (a.yCanvasTop || 0) - (b.yCanvasTop || 0);
    });

    var out = [];
    var imageIndex = 0;

    text.forEach(function (block) {
      while (imageIndex < images.length) {
        var img = images[imageIndex];
        var imgMid = ((img.yCanvasTop || 0) + (img.yCanvasBottom || img.yCanvasTop || 0)) / 2;

        if ((img.page || 0) < (block.page || 0) || ((img.page || 0) === (block.page || 0) && imgMid <= (block.yCanvasTop || 0))) {
          out.push(img);
          imageIndex++;
        } else {
          break;
        }
      }

      out.push(block);
    });

    while (imageIndex < images.length) {
      out.push(images[imageIndex++]);
    }

    return moveSourcesBlocksToEnd(out);
  }

  function buildPatchFromBlocks(media, blocks, meta) {
    media = media || {};
    meta = meta || {};

    var sourceVersion = Math.max(1, Number(media.mediaVersion || media.readerSourceMediaVersion || 1));
    var nextReaderVersion = Math.max(1, Number(meta.nextReaderVersion || media.readerVersion || 0) + (meta.nextReaderVersion ? 0 : 1));
    var preview = buildPreview(blocks, 900);
    var imageCount = (blocks || []).filter(function (block) { return block && block.type === 'image'; }).length;

    var patch = {
      readerStatus: 'READY',
      readerBuildMode: 'admin-browser-pdfjs-editorial-v4-images-lines-sources',
      readerEditorialVersion: 4,
      readerSourcesMovedToEnd: (blocks || []).some(function (block) { return block && block.role === 'sources'; }),
      readerImageStrategy: 'pdf-visual-components-plus-gaps-r2-webp-coordinate-merge-v4',
      readerImageCount: imageCount,
      readerImageErrors: Array.isArray(meta.imageErrors) ? meta.imageErrors.slice(0, 12) : [],
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
    var includeImages = options.includeImages !== false;
    var onProgress = typeof options.onProgress === 'function' ? options.onProgress : function () {};

    var nextReaderVersion = Math.max(1, Number(media.readerVersion || 0) + 1);

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

    var allTextBlocks = [];
    var allImageBlocks = [];
    var imageState = { total: 0, errors: [] };
    var firstTextBlockDoneRef = { value: false };
    var totalChars = 0;

    for (var pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      onProgress('Analizzo pagina ' + pageNum + ' / ' + pagesToProcess + '...');
      var page = await pdfDoc.getPage(pageNum);
      var textContent = await page.getTextContent();
      var viewport1 = page.getViewport({ scale: 1 });

      var scaleForText = IMAGE_RENDER_TARGET_WIDTH / Math.max(1, viewport1.width);
      scaleForText = Math.max(0.75, Math.min(2.25, scaleForText));

      var pageTextBlocks = buildTextBlocksForPage(
        textContent,
        pageNum,
        viewport1.height,
        scaleForText,
        firstTextBlockDoneRef
      );

      pageTextBlocks.forEach(function (block) {
        if (allTextBlocks.length >= MAX_BLOCKS || totalChars >= MAX_TEXT_CHARS) return;
        var text = safeString(block.text);
        if (totalChars + text.length > MAX_TEXT_CHARS) {
          block.text = text.slice(0, Math.max(0, MAX_TEXT_CHARS - totalChars)).trim();
        }
        if (!block.text) return;
        allTextBlocks.push(block);
        totalChars += block.text.length;
      });

      if (includeImages && imageState.total < MAX_READER_IMAGES) {
        onProgress('Cerco immagini editoriali pagina ' + pageNum + '...');
        var imageBlocks = await buildImageBlocksForPage(
          media,
          page,
          pageNum,
          textContent,
          nextReaderVersion,
          imageState,
          onProgress
        );
        allImageBlocks = allImageBlocks.concat(imageBlocks);
      }

      if (totalChars >= MAX_TEXT_CHARS) break;
    }

    var blocks = mergeTextAndImageBlocks(allTextBlocks, allImageBlocks);

    if (!blocks.length) {
      throw new Error('Nessun contenuto estraibile dal PDF. Probabile scansione/immagine: servirà OCR esterno o contenuto manuale.');
    }

    onProgress('Preparazione reader editoriale V4: immagini, a capo reali e Fonti a cluster...');
    return buildPatchFromBlocks(media, blocks, {
      originalPageCount: pageCount,
      pagesProcessed: pagesToProcess,
      nextReaderVersion: nextReaderVersion,
      imageErrors: imageState.errors
    });
  }

  function buildClearReaderPatch(media) {
    media = media || {};

    return {
      readerStatus: 'CLEARED',
      readerBuildMode: null,
      readerEditorialVersion: null,
      readerImageStrategy: null,
      readerImageCount: 0,
      readerImageErrors: null,
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
