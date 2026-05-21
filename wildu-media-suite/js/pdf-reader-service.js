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

  // V6.2: crop più deciso: elimina il bianco e rosicchia leggermente il bordo reale.
  // Non cambia il PDF originale e non tocca il client: agisce solo sulle nuove immagini reader generate.
  var IMAGE_CROP_AUTO_TIGHTEN = true;
  var IMAGE_CROP_TIGHTEN_MAX_SIDE_RATIO = 0.36;
  var IMAGE_CROP_TIGHTEN_PADDING_RATIO = 0;
  var IMAGE_CROP_TIGHTEN_MIN_PADDING = 0;
  var IMAGE_CROP_TIGHTEN_SAMPLE_STEP = 4;
  var IMAGE_CROP_INNER_BLEED_RATIO = 0.046;
  var IMAGE_CROP_INNER_BLEED_MAX_PX = 36;
  var IMAGE_CROP_INNER_BLEED_MIN_PX = 4;
  var IMAGE_CROP_HERO_BLEED_RATIO = 0.022;
  var IMAGE_CROP_HERO_BLEED_MAX_PX = 20;
  var IMAGE_CROP_CENTER_PRESERVE = true;
  var IMAGE_CROP_TEXT_SAFE_GAP_PX = 18;
  var IMAGE_CROP_HERO_TEXT_TOP_ZONE_RATIO = 0.44;
  var IMAGE_CROP_INLINE_TEXT_EDGE_ZONE_RATIO = 0.24;

  // V6.3.3: la hero può contenere più componenti visuali nella stessa fascia
  // (foto principale + logo/badge isolato in alto a destra). In quel caso non
  // va fatta l'unione di tutto: scegliamo il componente dominante e ignoriamo
  // il piccolo overlay, così non resta una grande fascia bianca laterale.
  var IMAGE_CROP_HERO_DOMINANT_COMPONENT = true;
  var IMAGE_CROP_HERO_DOMINANT_SAMPLE_STEP = 4;
  var IMAGE_CROP_HERO_DOMINANT_MIN_RATIO = 0.18;
  var IMAGE_CROP_HERO_DOMINANT_SECONDARY_RATIO = 1.65;

  // V6.3.4: alcuni header hanno aloni/sfumature o badge/logo integrati
  // nella stessa fascia della foto. Il componente dominante non basta:
  // imponiamo un crop orizzontale hero guidato da densità/centro visivo,
  // così non teniamo grandi code laterali quasi bianche o badge isolati.
  var IMAGE_CROP_HERO_HORIZONTAL_SMART_TRIM = true;
  var IMAGE_CROP_HERO_MAX_ASPECT_RATIO = 2.06;
  var IMAGE_CROP_HERO_CENTER_SAMPLE_STEP = 5;
  var IMAGE_CROP_HERO_CENTER_TOP_SKIP_RATIO = 0.18;
  var IMAGE_CROP_HERO_CENTER_BOTTOM_SKIP_RATIO = 0.05;
  var IMAGE_CROP_HERO_MIN_ASPECT_TRIM_RATIO = 0.08;

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

  function sourceMarkerKind(text) {
    var clean = normalizeForEditorialMatch(text);
    if (/^fonte(?:\b|\s|:|-|–|—)/.test(clean)) return 'single';
    if (/^(fonti|bibliografia|riferimenti|riferimento|sitografia|fonti consultate|fonti e riferimenti|fonti e approfondimenti)(?:\b|\s|:|-|–|—)/.test(clean)) return 'final';
    return '';
  }

  function isFinalSourcesMarker(text) {
    return sourceMarkerKind(text) === 'final';
  }

  function lineLooksLikeStrongArticleHeading(text) {
    var raw = safeString(text);
    if (!raw) return false;
    if (isSourcesParagraph(raw) || looksLikeNoteParagraph(raw) || /^scritto\s+da\b/i.test(raw) || /^nella\s+foto\s*:/i.test(raw)) return false;
    if (/[,;]$/.test(raw)) return false;
    if (/^[a-zà-ÿ]/.test(raw)) return false;

    var words = raw.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 13) return false;
    if (raw.length > 115) return false;

    if (/:/.test(raw) || /\?$/.test(raw) || /\([^)]+\)$/.test(raw)) return true;
    if (!/[.!]$/.test(raw) && words.length <= 9) return true;
    return false;
  }

  function looksLikePureSourceLine(text) {
    var raw = safeString(text);
    if (!raw) return false;
    if (isSourcesParagraph(raw)) return true;
    if (/https?:\/\//i.test(raw) || /\bwww\./i.test(raw)) return true;
    if (/\bdoi\s*:/i.test(raw) || /\bisbn\s*:/i.test(raw)) return true;
    if (lineLooksLikeListItem(raw) && (/\([12][0-9]{3}\)/.test(raw) || /\b(nature|journal|plos|scientific|communications|senses|shinrin|mother tree|wohlleben|gagliano|simard|polak|joung|bear)\b/i.test(raw))) return true;
    if (/\([12][0-9]{3}\)/.test(raw) && /[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+,\s*[A-Z]/.test(raw)) return true;
    if (/\b(Nature|PLOS\s+ONE|Journal|Scientific Reports|Chemical Senses|Nature Communications)\b/i.test(raw)) return true;
    if (/\b[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+,\s*[A-Z]\./.test(raw) && raw.length < 360) return true;
    if (/\b[a-z0-9-]+\.(it|com|org|net|edu|gov|eu)(\/|\b)/i.test(raw)) return true;
    return false;
  }


  function looksLikeArticleContinuation(text) {
    var raw = safeString(text);
    if (!raw) return false;
    if (looksLikePureSourceLine(raw) || isSourcesParagraph(raw)) return false;
    if (/^nella\s+foto\s*:/i.test(raw)) return false;
    if (/^scritto\s+da\b/i.test(raw)) return false;

    var words = raw.split(/\s+/).filter(Boolean);

    // Blocchi lunghi o frasi complete sono quasi sempre testo narrativo/articolo,
    // non continuazioni bibliografiche. Serve come guardia anti-overcapture fonti.
    if (raw.length > 180) return true;
    if (words.length >= 12 && /[.!?]$/.test(raw)) return true;
    if (words.length >= 9 && /^[A-ZÀ-Ý][a-zà-ÿ]/.test(raw) && /[,.;:!?]/.test(raw)) return true;

    // Titoli/sezioni articolo riconoscibili: non sono fonti.
    if (lineLooksLikeStrongArticleHeading(raw)) return true;

    return false;
  }

  function looksLikeSourceContinuationLine(text, previousWasSource) {
    var raw = safeString(text);
    if (!raw || !previousWasSource) return false;
    if (lineLooksLikeStrongArticleHeading(raw)) return false;
    if (looksLikeArticleContinuation(raw) && raw.length > 90) return false;

    // Continuazioni tipiche di citazioni mandate a capo dal PDF.
    if (/^[a-zà-ÿ][^.!?]{0,180}(?:\.|,|;)?$/.test(raw) && /\b(field|journal|nature|plos|senses|communications|reports|intoxication|species|plants|soil)\b/i.test(raw)) return true;
    if (/^['"“][^"”]{8,220}/.test(raw)) return true;
    if (/\b[0-9]{3,4}\s*[-–,]\s*[0-9]{2,5}\.?$/.test(raw)) return true;
    if (/\be\d{3,8}\.?$/i.test(raw)) return true;
    if (/^[A-Z]\.$/.test(raw)) return true;
    return false;
  }

  function sourceCitationHasLikelyEnd(text) {
    var raw = safeString(text);
    return /\b[0-9]{3,4}\s*[-–,]\s*[0-9]{2,5}\.?$/.test(raw) ||
      /\be\d{3,8}\.?$/i.test(raw) ||
      /\b(Nature|PLOS\s+ONE|Journal|Scientific Reports|Chemical Senses|Nature Communications)\b[^\n]{0,180}\.?$/i.test(raw);
  }

  function looksLikeSourceCitation(text) {
    var raw = safeString(text);
    var clean = normalizeForEditorialMatch(raw);
    if (!clean) return false;

    if (isSourcesParagraph(raw)) return true;

    // Anti-overcapture: un blocco lungo che contiene anche narrazione o titoli articolo
    // non è una fonte pura. Verrà eventualmente spezzato da splitMixedSourceBlocks().
    var lines = raw.split(/\n+/).map(function (x) { return safeString(x); }).filter(Boolean);
    if (raw.length > 520 && !lineLooksLikeListItem(raw)) return false;
    if (lines.length >= 3) {
      var articleish = lines.some(function (line) {
        return lineLooksLikeStrongArticleHeading(line) || (looksLikeArticleContinuation(line) && !looksLikePureSourceLine(line));
      });
      var sourcish = lines.some(function (line) { return looksLikePureSourceLine(line); });
      if (articleish && sourcish) return false;
    }

    return looksLikePureSourceLine(raw);
  }
  function looksLikeNoteParagraph(text) {
    var clean = normalizeForEditorialMatch(text);
    return /^(nota|attenzione|curiosita|curiosità|consiglio|importante)(?:\b|\s|:|-|–|—)/i.test(clean);
  }

  function looksLikeHeadingParagraph(text, meta) {
    var clean = safeString(text);
    if (!clean) return false;

    meta = meta || {};

    if (isSourcesParagraph(clean) || looksLikeNoteParagraph(clean) || lineLooksLikeListItem(clean)) return false;
    if (/^scritto\s+da\b/i.test(clean)) return false;
    if (/^nella\s+foto\s*:/i.test(clean)) return false;

    var lines = clean.split(/\n+/).map(function (x) { return safeString(x); }).filter(Boolean);
    var lineCount = Number(meta.lineCount || lines.length || 1);
    var words = clean.split(/\s+/).filter(Boolean);

    // Se il blocco è fatto da molte righe, quasi sempre è un paragrafo colonnare,
    // non una serie di titoli.
    if (lineCount > 2) return false;
    if (clean.length > 125) return false;
    if (words.length > 16) return false;

    // Le righe che finiscono con virgola/semicolon sono quasi sempre wrap di paragrafo.
    if (/[,;]$/.test(clean)) return false;

    // Titoli forti: hanno due punti, punto interrogativo, parentesi esplicative
    // o sono sezioni brevi senza punteggiatura finale.
    if (/:/.test(clean) && clean.length <= 115) return true;
    if (/\?$/.test(clean) && clean.length <= 90) return true;
    if (/\([^)]+\)$/.test(clean) && clean.length <= 105) return true;

    if (!/[.!]$/.test(clean) && clean.length <= 82 && words.length <= 10) {
      if (!/^[a-zà-ÿ]/.test(clean)) return true;
    }

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

  function shouldAbsorbIntoOpenSourceCluster(text, previousSourceText) {
    var raw = safeString(text);
    if (!raw) return false;
    if (/^nella\s+foto\s*:/i.test(raw)) return false;
    if (/^scritto\s+da\b/i.test(raw)) return false;
    if (lineLooksLikeStrongArticleHeading(raw)) return false;
    if (looksLikeArticleContinuation(raw) && raw.length > 90) return false;

    if (isSourcesParagraph(raw) || looksLikePureSourceLine(raw)) return true;
    if (looksLikeSourceContinuationLine(raw, !!previousSourceText)) return true;
    return false;
  }

  function moveSourcesBlocksToEnd(blocks) {
    var body = [];
    var sources = [];
    var pendingSourcesHeading = false;
    var openSourceCluster = false;

    (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
      if (!block) return;

      var text = safeString(block.text);
      var role = safeString(block.role).toLowerCase();
      var isTextLike = block.type !== 'image' && block.type !== 'heroImage' && block.type !== 'html' && text;

      if (!isTextLike) {
        body.push(block);
        return;
      }

      if (role === 'image-caption') {
        body.push(block);
        return;
      }

      var explicitSource = role === 'sources' || isSourcesParagraph(text);
      var headingOnly = explicitSource && isSourcesHeadingOnly(text);

      if (headingOnly) {
        pendingSourcesHeading = true;
        openSourceCluster = true;
        return;
      }

      if (explicitSource) {
        pushSourceBlock(sources, block, text);
        pendingSourcesHeading = false;
        // Fonte: singolare è una citazione inline e NON deve aprire una modalità infinita.
        // Solo intestazioni finali tipo Fonti/Bibliografia possono raccogliere i blocchi successivi.
        openSourceCluster = isFinalSourcesMarker(text) || headingOnly;
        return;
      }

      if (pendingSourcesHeading || openSourceCluster) {
        var lastSource = sources.length ? sources[sources.length - 1].text : '';
        if (shouldAbsorbIntoOpenSourceCluster(text, lastSource) && !looksLikeHeadingParagraph(text, { lineCount: 1 })) {
          pushSourceBlock(sources, block, text);
          pendingSourcesHeading = false;
          openSourceCluster = isFinalSourcesMarker(lastSource) || isFinalSourcesMarker(text);
          return;
        }

        pendingSourcesHeading = false;
        openSourceCluster = false;
      }

      // Liste bibliografiche finali anche senza intestazione agganciata.
      if (lineLooksLikeListItem(text) && looksLikeSourceCitation(text)) {
        pushSourceBlock(sources, block, text);
        openSourceCluster = true;
        return;
      }

      body.push(block);
    });

    if (!sources.length) return body;

    return body.concat([
      { type: 'divider', role: 'sources-divider' },
      { type: 'heading', role: 'sources-heading', text: 'Fonti e riferimenti' }
    ]).concat(sources);
  }
  function classifyReaderParagraph(p, firstTextBlockDone, meta) {
    var type = 'paragraph';
    var role = '';
    meta = meta || {};

    if (isSourcesParagraph(p) || looksLikeSourceCitation(p)) {
      type = 'note';
      role = 'sources';
    } else if (/^nella\s+foto\s*:/i.test(safeString(p))) {
      type = 'note';
      role = 'image-caption';
    } else if (/^scritto\s+da\b/i.test(safeString(p))) {
      type = 'note';
      role = 'author';
    } else if (looksLikeNoteParagraph(p)) {
      type = 'note';
    } else if (looksLikeHeadingParagraph(p, meta)) {
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

  function estimatePersistedPatchBytes(patch) {
    var clone = Object.assign({}, patch || {});
    // HTML di anteprima: utile alla modale admin, ma non deve forzare tagli ai readerBlocks.
    delete clone.readerAdminPreviewHtml;
    return estimatePatchBytes(clone);
  }

  function trimPatchToFirestoreLimit(patch) {
    var next = Object.assign({}, patch);
    next.readerBlocks = Array.isArray(next.readerBlocks) ? next.readerBlocks.slice() : [];

    while (next.readerBlocks.length > 20 && estimatePersistedPatchBytes(next) > MAX_PATCH_JSON_BYTES) {
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
    // Include anche il bullet "" che spesso arriva dai PDF Word/LibreOffice.
    return /^\s*([•\u2022\uF0B7▪▫◦‣\-*–—]|[0-9]{1,3}[.)]|[A-Za-z][.)])\s+/.test(safeString(text));
  }

  function lineLooksLikeStandalone(text) {
    var raw = safeString(text);
    if (!raw) return false;
    if (lineLooksLikeListItem(raw)) return true;
    if (isSourcesParagraph(raw) || looksLikeNoteParagraph(raw)) return true;
    return false;
  }

  function shouldSplitParagraph(prevLine, line, verticalGap, normalLineHeight) {
    if (!prevLine) return false;

    var prevText = safeString(prevLine.text);
    var text = safeString(line.text);
    var bigGap = verticalGap > normalLineHeight * 1.45;
    var veryBigGap = verticalGap > normalLineHeight * 2.15;
    var indentShift = Math.abs((line.xPdfMin || 0) - (prevLine.xPdfMin || 0));

    // Nuova fonte o nuovo bullet: nuovo blocco.
    if (isSourcesParagraph(text)) return true;
    if (lineLooksLikeListItem(text)) return true;
    if (looksLikeNoteParagraph(text)) return true;

    // Mai spezzare una citazione fonte solo perché la riga precedente iniziava con Fonte:
    // il PDF la manda spesso su più righe.
    if (isSourcesParagraph(prevText) || looksLikeSourceCitation(prevText)) {
      if (!bigGap && !looksLikeHeadingParagraph(text, { lineCount: 1 })) return false;
    }

    if (veryBigGap) return true;

    // Heading solo se c'è un vero stacco verticale: non basta una riga corta.
    if (bigGap && looksLikeHeadingParagraph(text, { lineCount: 1 })) return true;

    if (bigGap && (/[.!?:;…»")\]]$/.test(prevText) || prevText.length < 70 || text.length < 70)) return true;
    if (indentShift > 34 && bigGap && (lineLooksLikeStandalone(text) || lineLooksLikeStandalone(prevText))) return true;

    return false;
  }
  function shouldKeepLineBreakInsideParagraph(prevLine, line, verticalGap, normalLineHeight) {
    if (!prevLine) return false;

    var prevText = safeString(prevLine.text);
    var text = safeString(line.text);
    var bigGap = verticalGap > normalLineHeight * 1.25;
    var indentShift = Math.abs((line.xPdfMin || 0) - (prevLine.xPdfMin || 0));

    if (lineLooksLikeListItem(text)) return true;
    if (isSourcesParagraph(text) || looksLikeNoteParagraph(text)) return true;
    if (bigGap && (prevText.length < 95 || text.length < 95)) return true;
    if (indentShift > 32 && bigGap && (prevText.length < 120 || text.length < 120)) return true;

    // Se la riga precedente finisce con punteggiatura forte e la riga dopo parte maiuscola,
    // preserva un a capo solo quando il blocco sembra davvero frase autonoma, non wrap stretto.
    if (/[.!?…]$/.test(prevText) && /^[A-ZÀ-Ý0-9]/.test(text) && prevText.length < 115 && bigGap) return true;

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
        lineCount: current.length,
        maxLineHeight: Math.max.apply(null, current.map(function (line) { return line.hPdf || 0; })),
        avgLineHeight: current.reduce(function (sum, line) { return sum + (line.hPdf || 0); }, 0) / Math.max(1, current.length)
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

      var block = classifyReaderParagraph(p, !!firstTextBlockDoneRef.value, paragraph);
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



  function horizontalOverlapRatioForRects(a, b) {
    var x1 = Math.max(a.x1, b.x1);
    var x2 = Math.min(a.x2, b.x2);
    var inter = Math.max(0, x2 - x1);
    var minW = Math.max(1, Math.min(a.x2 - a.x1, b.x2 - b.x1));
    return inter / minW;
  }

  function verticalOverlapAmountForRects(a, b) {
    var y1 = Math.max(a.y1, b.y1);
    var y2 = Math.min(a.y2, b.y2);
    return Math.max(0, y2 - y1);
  }

  function clampImageCandidateAwayFromText(candidate, textRects, canvas, isHero) {
    if (!candidate || !textRects || !textRects.length || !canvas) return candidate;

    var x = Math.max(0, Math.floor(candidate.x || 0));
    var y = Math.max(0, Math.floor(candidate.y || 0));
    var w = Math.min(canvas.width - x, Math.ceil(candidate.w || 0));
    var h = Math.min(canvas.height - y, Math.ceil(candidate.h || 0));
    if (w < MIN_IMAGE_CROP_WIDTH || h < MIN_IMAGE_CROP_HEIGHT) return candidate;

    var box = { x1: x, y1: y, x2: x + w, y2: y + h };
    var safeGap = IMAGE_CROP_TEXT_SAFE_GAP_PX;
    var topLimit = y;
    var bottomLimit = y + h;
    var topZone = y + h * (isHero ? IMAGE_CROP_HERO_TEXT_TOP_ZONE_RATIO : IMAGE_CROP_INLINE_TEXT_EDGE_ZONE_RATIO);
    var bottomZone = y + h * (1 - IMAGE_CROP_INLINE_TEXT_EDGE_ZONE_RATIO);

    textRects.forEach(function (r) {
      if (!r) return;
      var textRect = { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 };
      if (horizontalOverlapRatioForRects(box, textRect) < 0.18) return;
      if (verticalOverlapAmountForRects(box, textRect) <= 0) return;

      // Caso più importante: header/hero page 1. Se il candidato immagine invade un titolo
      // già riconosciuto come testo PDF, il crop deve iniziare DOPO il testo, non sopra.
      if (textRect.y1 <= topZone) {
        topLimit = Math.max(topLimit, Math.ceil(textRect.y2 + safeGap));
      }

      // Per immagini inline, evita anche di inglobare testo/caption sotto il soggetto.
      // Sulle hero non tagliamo il basso con aggressività: il rischio maggiore era il titolo in alto.
      if (!isHero && textRect.y2 >= bottomZone) {
        bottomLimit = Math.min(bottomLimit, Math.floor(textRect.y1 - safeGap));
      }
    });

    var newY = Math.max(0, Math.min(topLimit, canvas.height));
    var newBottom = Math.max(newY, Math.min(bottomLimit, canvas.height));
    var newH = newBottom - newY;

    if (newH < MIN_IMAGE_CROP_HEIGHT) return candidate;
    if (newY === y && newH === h) return candidate;

    return Object.assign({}, candidate, {
      y: Math.round(newY),
      h: Math.round(newH),
      yCanvasTop: Math.round(newY),
      yCanvasBottom: Math.round(newY + newH),
      textClamped: true,
      textClampMode: isHero ? 'hero-text-top-exclusion-v6-3-3' : 'inline-text-edge-exclusion-v6-3-3'
    });
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



  function findDominantHeroVisualLocalBoundsFromData(data, w0, h0) {
    if (!IMAGE_CROP_HERO_DOMINANT_COMPONENT || !data || w0 < MIN_IMAGE_CROP_WIDTH || h0 < MIN_IMAGE_CROP_HEIGHT) return null;

    var step = IMAGE_CROP_HERO_DOMINANT_SAMPLE_STEP;
    var cols = Math.ceil(w0 / step);
    var rows = Math.ceil(h0 / step);
    var mask = new Uint8Array(cols * rows);
    var visited = new Uint8Array(cols * rows);
    var queue = [];
    var totalVisual = 0;

    function idx(col, row) { return row * cols + col; }

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var x = Math.min(w0 - 1, Math.floor(col * step + step / 2));
        var y = Math.min(h0 - 1, Math.floor(row * step + step / 2));
        var p = ((y * w0) + x) * 4;
        if (isPixelVisual(data[p], data[p + 1], data[p + 2], data[p + 3])) {
          mask[idx(col, row)] = 1;
          totalVisual++;
        }
      }
    }

    if (totalVisual < 30) return null;

    var components = [];

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

        if (count < 18) continue;

        var x1 = Math.max(0, minC * step);
        var y1 = Math.max(0, minR * step);
        var x2 = Math.min(w0, (maxC + 1) * step);
        var y2 = Math.min(h0, (maxR + 1) * step);
        var cw = x2 - x1;
        var ch = y2 - y1;
        var area = cw * ch;

        if (cw < MIN_IMAGE_CROP_WIDTH || ch < MIN_IMAGE_CROP_HEIGHT) continue;

        components.push({
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2,
          w: cw,
          h: ch,
          count: count,
          area: area,
          score: area * Math.min(0.65, count / Math.max(1, (maxC - minC + 1) * (maxR - minR + 1)))
        });
      }
    }

    if (!components.length) return null;

    components.sort(function (a, b) { return b.score - a.score; });
    var main = components[0];
    var second = components[1] || null;
    var bboxArea = w0 * h0;

    // Se il componente dominante è minuscolo rispetto al crop, non facciamo nulla.
    // Se invece è chiaramente più importante del secondo, stiamo probabilmente vedendo
    // foto principale + overlay/logo separato: tagliamo sul componente dominante.
    var largeEnough = main.area / Math.max(1, bboxArea) >= IMAGE_CROP_HERO_DOMINANT_MIN_RATIO;
    var dominatesSecond = !second || main.score / Math.max(1, second.score) >= IMAGE_CROP_HERO_DOMINANT_SECONDARY_RATIO;
    var trimsMeaningfully = (main.w < w0 * 0.92) || (main.h < h0 * 0.92);

    if (!largeEnough || !dominatesSecond || !trimsMeaningfully) return null;

    // Padding minimo per non mordere il soggetto prima del bleed center-preserving.
    var padX = Math.max(4, Math.round(main.w * 0.012));
    var padY = Math.max(4, Math.round(main.h * 0.012));

    return {
      minX: Math.max(0, main.x1 - padX),
      minY: Math.max(0, main.y1 - padY),
      maxX: Math.min(w0 - 1, main.x2 + padX),
      maxY: Math.min(h0 - 1, main.y2 + padY),
      reason: 'dominant-hero-component-v6-3-3',
      removedSecondaryComponents: components.length - 1
    };
  }

  function isHeroInformativePixel(r, g, b, a) {
    if (a < 20) return false;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var chroma = max - min;
    var lum = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);

    // Più severo di isPixelVisual: ignora sfondi quasi bianchi, aloni e ombre morbide.
    // Mantiene però cielo/verde/rocce/foto reali quando hanno colore o contrasto sufficiente.
    if (lum > 247 && chroma < 18) return false;
    if (lum > 238 && chroma < 10) return false;
    if (chroma >= 18 && lum < 252) return true;
    if (lum < 218) return true;
    return false;
  }

  function estimateHeroInformativeCenterX(data, w0, h0) {
    if (!data || w0 <= 0 || h0 <= 0) return null;

    var step = IMAGE_CROP_HERO_CENTER_SAMPLE_STEP;
    var yStart = Math.max(0, Math.floor(h0 * IMAGE_CROP_HERO_CENTER_TOP_SKIP_RATIO));
    var yEnd = Math.min(h0, Math.ceil(h0 * (1 - IMAGE_CROP_HERO_CENTER_BOTTOM_SKIP_RATIO)));

    if (yEnd - yStart < Math.max(40, h0 * 0.30)) {
      yStart = 0;
      yEnd = h0;
    }

    var total = 0;
    var weighted = 0;
    var minX = w0;
    var maxX = -1;

    for (var y = yStart; y < yEnd; y += step) {
      for (var x = 0; x < w0; x += step) {
        var idx = ((y * w0) + x) * 4;
        var r = data[idx];
        var g = data[idx + 1];
        var b = data[idx + 2];
        var a = data[idx + 3];

        if (!isHeroInformativePixel(r, g, b, a)) continue;

        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var chroma = max - min;
        var lum = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
        var weight = 1 + Math.min(4, chroma / 34) + Math.max(0, (225 - lum) / 85);

        total += weight;
        weighted += x * weight;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }

    if (total <= 0 || maxX < minX) return null;

    return {
      centerX: weighted / total,
      minX: minX,
      maxX: maxX,
      informativeWidth: maxX - minX + 1,
      sampleWeight: total
    };
  }

  function applyHeroHorizontalSmartTrim(nx1, nx2, ny1, ny2, x0, y0, w0, h0, data) {
    if (!IMAGE_CROP_HERO_HORIZONTAL_SMART_TRIM) return null;

    var currentW = nx2 - nx1;
    var currentH = ny2 - ny1;
    if (currentW < MIN_IMAGE_CROP_WIDTH || currentH < MIN_IMAGE_CROP_HEIGHT) return null;

    var currentAspect = currentW / Math.max(1, currentH);
    if (currentAspect <= IMAGE_CROP_HERO_MAX_ASPECT_RATIO) return null;

    var targetW = Math.round(currentH * IMAGE_CROP_HERO_MAX_ASPECT_RATIO);
    targetW = Math.max(MIN_IMAGE_CROP_WIDTH, Math.min(currentW, targetW));

    // Evita micro-crop inutili: se taglia meno dell'8% della larghezza non vale il rischio.
    if ((currentW - targetW) / Math.max(1, currentW) < IMAGE_CROP_HERO_MIN_ASPECT_TRIM_RATIO) return null;

    var info = estimateHeroInformativeCenterX(data, w0, h0);
    var localCenter = info && Number.isFinite(info.centerX) ? info.centerX : ((nx1 + nx2) / 2 - x0);
    var centerAbs = x0 + localCenter;

    var tx1 = Math.round(centerAbs - targetW / 2);
    var tx2 = Math.round(centerAbs + targetW / 2);

    if (tx1 < x0) { tx2 += (x0 - tx1); tx1 = x0; }
    if (tx2 > x0 + w0) { tx1 -= (tx2 - (x0 + w0)); tx2 = x0 + w0; }

    tx1 = Math.max(x0, tx1);
    tx2 = Math.min(x0 + w0, tx2);

    if (tx2 - tx1 < MIN_IMAGE_CROP_WIDTH) return null;
    if (tx1 <= nx1 && tx2 >= nx2) return null;

    return {
      nx1: tx1,
      nx2: tx2,
      centerMode: info ? 'informative-density-center' : 'geometric-center',
      informativeCenterX: info ? Number(info.centerX.toFixed ? info.centerX.toFixed(2) : info.centerX) : null,
      informativeMinX: info ? info.minX : null,
      informativeMaxX: info ? info.maxX : null,
      reason: 'hero-horizontal-smart-aspect-trim-v6-3-4'
    };
  }

  function tightenReaderImageBounds(sourceCanvas, bounds) {
    if (!IMAGE_CROP_AUTO_TIGHTEN || !sourceCanvas || !bounds) return bounds;

    var ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    var canvasW = sourceCanvas.width;
    var canvasH = sourceCanvas.height;

    var x0 = Math.max(0, Math.floor(bounds.x || 0));
    var y0 = Math.max(0, Math.floor(bounds.y || 0));
    var w0 = Math.min(canvasW - x0, Math.ceil(bounds.w || 0));
    var h0 = Math.min(canvasH - y0, Math.ceil(bounds.h || 0));

    if (w0 < MIN_IMAGE_CROP_WIDTH || h0 < MIN_IMAGE_CROP_HEIGHT) return bounds;

    var data;
    try {
      data = ctx.getImageData(x0, y0, w0, h0).data;
    } catch (e) {
      return bounds;
    }

    var step = IMAGE_CROP_TIGHTEN_SAMPLE_STEP;
    var minX = w0;
    var minY = h0;
    var maxX = -1;
    var maxY = -1;
    var visualCount = 0;

    for (var y = 0; y < h0; y += step) {
      for (var x = 0; x < w0; x += step) {
        var idx = ((y * w0) + x) * 4;
        var r = data[idx];
        var g = data[idx + 1];
        var b = data[idx + 2];
        var a = data[idx + 3];

        if (isPixelVisual(r, g, b, a)) {
          visualCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!visualCount || maxX < minX || maxY < minY) return bounds;

    var visualW = maxX - minX + 1;
    var visualH = maxY - minY + 1;
    if (visualW < 24 || visualH < 24) return bounds;

    var isHero = safeString(bounds.roleHint || bounds.role).toLowerCase() === 'hero';

    var dominantHeroLocal = null;
    if (isHero) {
      dominantHeroLocal = findDominantHeroVisualLocalBoundsFromData(data, w0, h0);
      if (dominantHeroLocal) {
        minX = dominantHeroLocal.minX;
        minY = dominantHeroLocal.minY;
        maxX = dominantHeroLocal.maxX;
        maxY = dominantHeroLocal.maxY;
        visualW = maxX - minX + 1;
        visualH = maxY - minY + 1;
        if (visualW < MIN_IMAGE_CROP_WIDTH || visualH < MIN_IMAGE_CROP_HEIGHT) return bounds;
      }
    }

    var bleedRatio = isHero ? IMAGE_CROP_HERO_BLEED_RATIO : IMAGE_CROP_INNER_BLEED_RATIO;
    var bleedMax = isHero ? IMAGE_CROP_HERO_BLEED_MAX_PX : IMAGE_CROP_INNER_BLEED_MAX_PX;

    var bleedX = Math.max(IMAGE_CROP_INNER_BLEED_MIN_PX, Math.min(bleedMax, Math.round(visualW * bleedRatio)));
    var bleedY = Math.max(IMAGE_CROP_INNER_BLEED_MIN_PX, Math.min(bleedMax, Math.round(visualH * bleedRatio)));

    var desiredW = Math.max(MIN_IMAGE_CROP_WIDTH, visualW - (bleedX * 2));
    var desiredH = Math.max(MIN_IMAGE_CROP_HEIGHT, visualH - (bleedY * 2));

    // V6.3: crop center-preserving. Prima V6.2 rosicchiava dai bordi del bbox e,
    // in alcune hero, dava l'impressione di tagliare prendendo un lato come ancora.
    // Ora il taglio resta simmetrico intorno al centro del contenuto visivo.
    var centerX = x0 + minX + (visualW / 2);
    var centerY = y0 + minY + (visualH / 2);

    var nx1 = Math.round(centerX - desiredW / 2);
    var ny1 = Math.round(centerY - desiredH / 2);
    var nx2 = Math.round(centerX + desiredW / 2);
    var ny2 = Math.round(centerY + desiredH / 2);

    // Clamp mantenendo quanto più possibile il centro.
    if (nx1 < x0) { nx2 += (x0 - nx1); nx1 = x0; }
    if (ny1 < y0) { ny2 += (y0 - ny1); ny1 = y0; }
    if (nx2 > x0 + w0) { nx1 -= (nx2 - (x0 + w0)); nx2 = x0 + w0; }
    if (ny2 > y0 + h0) { ny1 -= (ny2 - (y0 + h0)); ny2 = y0 + h0; }

    nx1 = Math.max(x0, nx1);
    ny1 = Math.max(y0, ny1);
    nx2 = Math.min(x0 + w0, nx2);
    ny2 = Math.min(y0 + h0, ny2);

    var maxInsetX = Math.round(w0 * (isHero ? 0.22 : IMAGE_CROP_TIGHTEN_MAX_SIDE_RATIO));
    var maxInsetY = Math.round(h0 * (isHero ? 0.22 : IMAGE_CROP_TIGHTEN_MAX_SIDE_RATIO));

    nx1 = Math.min(nx1, x0 + maxInsetX);
    ny1 = Math.min(ny1, y0 + maxInsetY);
    nx2 = Math.max(nx2, x0 + w0 - maxInsetX);
    ny2 = Math.max(ny2, y0 + h0 - maxInsetY);

    var heroHorizontalTrim = null;
    if (isHero) {
      heroHorizontalTrim = applyHeroHorizontalSmartTrim(nx1, nx2, ny1, ny2, x0, y0, w0, h0, data);
      if (heroHorizontalTrim) {
        nx1 = heroHorizontalTrim.nx1;
        nx2 = heroHorizontalTrim.nx2;
      }
    }

    var nw = Math.round(nx2 - nx1);
    var nh = Math.round(ny2 - ny1);

    if (nw < MIN_IMAGE_CROP_WIDTH || nh < MIN_IMAGE_CROP_HEIGHT) return bounds;

    var oldArea = w0 * h0;
    var newArea = nw * nh;
    if (!oldArea || newArea / oldArea > 0.965) return bounds;

    return Object.assign({}, bounds, {
      x: Math.round(nx1),
      y: Math.round(ny1),
      w: nw,
      h: nh,
      yCanvasTop: Math.round(ny1),
      yCanvasBottom: Math.round(ny1 + nh),
      tightened: true,
      dominantHeroComponent: !!dominantHeroLocal,
      removedSecondaryComponents: dominantHeroLocal ? dominantHeroLocal.removedSecondaryComponents : 0,
      heroHorizontalSmartTrim: !!heroHorizontalTrim,
      heroHorizontalTrimReason: heroHorizontalTrim ? heroHorizontalTrim.reason : null,
      heroHorizontalCenterMode: heroHorizontalTrim ? heroHorizontalTrim.centerMode : null,
      heroInformativeCenterX: heroHorizontalTrim ? heroHorizontalTrim.informativeCenterX : null,
      heroInformativeMinX: heroHorizontalTrim ? heroHorizontalTrim.informativeMinX : null,
      heroInformativeMaxX: heroHorizontalTrim ? heroHorizontalTrim.informativeMaxX : null,
      tightenMode: isHero ? 'center-preserving-hero-horizontal-smart-trim-v6-3-4' : 'center-preserving-inline-bleed-v6-3-4'
    });
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

  async function cropCanvasToOptimizedImage(sourceCanvas, bounds) {
    var tightenedBounds = tightenReaderImageBounds(sourceCanvas, bounds);

    var scaleDown = tightenedBounds.w > IMAGE_OUTPUT_MAX_WIDTH ? IMAGE_OUTPUT_MAX_WIDTH / tightenedBounds.w : 1;
    var outW = Math.max(1, Math.round(tightenedBounds.w * scaleDown));
    var outH = Math.max(1, Math.round(tightenedBounds.h * scaleDown));

    var out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;

    var ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, tightenedBounds.x, tightenedBounds.y, tightenedBounds.w, tightenedBounds.h, 0, 0, outW, outH);

    return {
      blob: await canvasToBlob(out, 'image/webp', IMAGE_WEBP_QUALITY),
      bounds: tightenedBounds,
      outputWidth: outW,
      outputHeight: outH
    };
  }

  async function cropCanvasToOptimizedBlob(sourceCanvas, bounds) {
    var optimized = await cropCanvasToOptimizedImage(sourceCanvas, bounds);
    return optimized.blob;
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


  function objectKeyFromReaderImageUrl(url) {
    var raw = safeString(url);
    if (!raw) return '';

    try {
      var parsed = new URL(raw, window.location.href);
      var path = safeString(parsed.pathname).replace(/^\/+/, '');
      return path;
    } catch (e) {
      return raw.replace(/^https?:\/\/[^/]+\//i, '').replace(/^\/+/, '');
    }
  }

  function collectReaderImageObjectKeys(source) {
    var keys = [];

    function add(value) {
      var key = safeString(value);
      if (!key) return;
      key = key.replace(/^\/+/, '');
      if (!key) return;
      if (keys.indexOf(key) === -1) keys.push(key);
    }

    if (!source || typeof source !== 'object') return keys;

    if (Array.isArray(source.readerImageObjectKeys)) {
      source.readerImageObjectKeys.forEach(add);
    }

    if (Array.isArray(source.readerBlocks)) {
      source.readerBlocks.forEach(function (block) {
        if (!block || block.type !== 'image') return;
        add(block.objectKey);
        if (!block.objectKey && block.url) add(objectKeyFromReaderImageUrl(block.url));
      });
    }

    if (Array.isArray(source.readerImageUrls)) {
      source.readerImageUrls.forEach(function (url) {
        add(objectKeyFromReaderImageUrl(url));
      });
    }

    return keys.filter(function (key) {
      // Cancelliamo solo asset reader generati dalla suite, mai PDF originali o immagini generiche.
      return /^wildu-reader\/pdf\//i.test(key) || /^image\/[^/]*wildu-reader-pdf-/i.test(key);
    });
  }

  async function cleanupReaderImages(source, options) {
    options = options || {};

    if (!root.R2WorkerService || typeof root.R2WorkerService.deleteObject !== 'function') {
      return {
        ok: false,
        skipped: true,
        deleted: [],
        failed: [],
        message: 'R2WorkerService.deleteObject non disponibile.'
      };
    }

    var exclude = Array.isArray(options.excludeKeys) ? options.excludeKeys : [];
    var keys = collectReaderImageObjectKeys(source).filter(function (key) {
      return exclude.indexOf(key) === -1;
    });

    var deleted = [];
    var failed = [];

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      try {
        await root.R2WorkerService.deleteObject(key);
        deleted.push(key);
      } catch (e) {
        failed.push({ objectKey: key, error: e && e.message ? e.message : String(e) });
      }
    }

    return {
      ok: failed.length === 0,
      skipped: false,
      deleted: deleted,
      failed: failed,
      count: keys.length
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
        var willBeHero = imageState.total === 0 && (pageNum === 1 || c.yCanvasTop < canvas.height * 0.28) && c.w >= canvas.width * 0.42;
        c.roleHint = willBeHero ? 'hero' : 'inline';

        // V6.3.2: prima di stringere/bleedare, escludi hard il testo PDF riconosciuto.
        // Risolve la hero che inglobava il titolo in alto: il crop viene ricentrato sotto il testo.
        c = clampImageCandidateAwayFromText(c, textRects, canvas, willBeHero);
        c.roleHint = willBeHero ? 'hero' : 'inline';

        onProgress('Ottimizzo immagine pagina ' + pageNum + '...');
        var optimizedImage = await cropCanvasToOptimizedImage(canvas, c);
        var blob = optimizedImage.blob;
        var finalBounds = optimizedImage.bounds || c;

        // Se è minuscola, è probabilmente un fregio, una linea o rumore visivo.
        if (!blob || blob.size < 3200) continue;

        imageState.total += 1;
        onProgress('Carico immagine reader ' + imageState.total + ' su R2...');
        var uploaded = await uploadReaderImage(media, blob, imageState.total, pageNum, nextReaderVersion);

        var isHero = willBeHero;

        blocks.push({
          type: 'image',
          role: isHero ? 'hero' : 'inline',
          url: uploaded.publicUrl,
          objectKey: uploaded.objectKey,
          alt: 'Immagine dal PDF originale, pagina ' + pageNum,
          caption: 'Dal PDF originale · pagina ' + pageNum,
          page: pageNum,
          yCanvasTop: finalBounds.yCanvasTop,
          yCanvasBottom: finalBounds.yCanvasBottom,
          xCanvasLeft: finalBounds.x,
          xCanvasRight: finalBounds.x + finalBounds.w,
          width: finalBounds.w,
          height: finalBounds.h,
          outputWidth: optimizedImage.outputWidth,
          outputHeight: optimizedImage.outputHeight,
          sizeBytes: uploaded.sizeBytes,
          visualRatio: Number((c.visualRatio || 0).toFixed ? c.visualRatio.toFixed(4) : c.visualRatio || 0),
          detector: c.detector || 'visual-component-v4',
          tightened: !!finalBounds.tightened,
          tightenMode: finalBounds.tightenMode || null,
          heroHorizontalSmartTrim: !!finalBounds.heroHorizontalSmartTrim,
          heroHorizontalTrimReason: finalBounds.heroHorizontalTrimReason || null,
          heroHorizontalCenterMode: finalBounds.heroHorizontalCenterMode || null,
          heroInformativeCenterX: finalBounds.heroInformativeCenterX || null,
          heroInformativeMinX: finalBounds.heroInformativeMinX || null,
          heroInformativeMaxX: finalBounds.heroInformativeMaxX || null
        });
      } catch (e) {
        imageState.errors.push('Pagina ' + pageNum + ': ' + (e && e.message ? e.message : String(e)));
      }
    }

    return blocks;
  }


  function isImageCaptionBlock(block) {
    var text = safeString(block && block.text);
    return !!text && /^nella\s+foto\s*:/i.test(text);
  }

  function normalizeImageCaption(text) {
    return safeString(text).replace(/^nella\s+foto\s*:\s*/i, 'Nella foto: ').trim();
  }

  function attachImageCaptionsToNearestImages(blocks) {
    var list = Array.isArray(blocks) ? blocks.slice() : [];
    var images = list.filter(function (b) { return b && b.type === 'image'; });
    var out = [];

    list.forEach(function (block) {
      if (!isImageCaptionBlock(block)) {
        out.push(block);
        return;
      }

      var samePage = images.filter(function (img) {
        return Number(img.page || 0) === Number(block.page || 0);
      });

      if (!samePage.length) {
        return; // meglio non mostrare caption come titolo/paragrafo spurio.
      }

      var target = samePage
        .map(function (img) {
          var imgMid = ((img.yCanvasTop || 0) + (img.yCanvasBottom || img.yCanvasTop || 0)) / 2;
          var blockMid = ((block.yCanvasTop || 0) + (block.yCanvasBottom || block.yCanvasTop || 0)) / 2;
          return { img: img, d: Math.abs(imgMid - blockMid) };
        })
        .sort(function (a, b) { return a.d - b.d; })[0].img;

      target.caption = normalizeImageCaption(block.text) || target.caption || '';
      target.alt = target.caption || target.alt || '';
    });

    return out;
  }


  function isTextLikeReaderBlock(block) {
    if (!block) return false;
    if (block.type === 'image' || block.type === 'html' || block.type === 'divider') return false;
    return !!safeString(block.text);
  }

  function normalizeReaderBlockTextInline(text) {
    return safeString(text)
      .replace(/[ \t]*\n+[ \t]*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function sentenceEndsStrong(text) {
    return /[.!?…»")\]]$/.test(safeString(text));
  }

  function startsLowercaseOrContinuation(text) {
    var raw = safeString(text);
    if (!raw) return false;
    return /^[a-zà-ÿ(]/.test(raw) || /^(per|di|da|della|dell|del|e|ma|che|come|una|un|il|la|lo|le|gli|nel|nella|dei|delle)\b/i.test(raw);
  }

  function isWeakHeadingBlock(block, prevBlock, nextBlock) {
    if (!block || block.type !== 'heading') return false;
    var text = safeString(block.text);
    var words = text.split(/\s+/).filter(Boolean);

    if (!text) return true;
    if (isSourcesParagraph(text) || looksLikeSourceCitation(text)) return true;
    if (/^scritto\s+da\b/i.test(text) || /^nella\s+foto\s*:/i.test(text)) return true;

    // Una riga che sembra frase spezzata dal layout non deve diventare titolo.
    if (/[,;]$/.test(text)) return true;
    if (startsLowercaseOrContinuation(text)) return true;
    if (words.length > 13) return true;
    if (text.length > 110) return true;

    // Se è tra paragrafi e il precedente non è concluso, è quasi certamente wrap.
    if (prevBlock && isTextLikeReaderBlock(prevBlock) && !sentenceEndsStrong(prevBlock.text)) return true;

    // Se il blocco successivo è un'altra heading debole, questa è probabilmente una cascata di righe-paragrafo.
    if (nextBlock && nextBlock.type === 'heading') {
      var nt = safeString(nextBlock.text);
      if (startsLowercaseOrContinuation(nt) || /[,;]$/.test(nt) || nt.split(/\s+/).length > 10) return true;
    }

    return false;
  }

  function mergeTextIntoBlock(target, addition, separator) {
    if (!target) return;
    var left = safeString(target.text);
    var right = safeString(addition);
    if (!right) return;
    target.text = (left ? left + (separator || ' ') : '') + right;
    target.text = target.text.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').trim();
  }

  function normalizeHeadingRuns(blocks) {
    var src = Array.isArray(blocks) ? blocks.slice() : [];
    var out = [];
    var i = 0;

    while (i < src.length) {
      var block = src[i];
      if (!block || block.type !== 'heading' || safeString(block.role).toLowerCase() === 'sources-heading') {
        out.push(block);
        i++;
        continue;
      }

      var prev = out.length ? out[out.length - 1] : null;
      var next = src[i + 1] || null;

      if (!isWeakHeadingBlock(block, prev, next)) {
        out.push(block);
        i++;
        continue;
      }

      // Heading debole: se il precedente è paragrafo/lead e non sembra chiuso, fondila lì.
      if (prev && (prev.type === 'paragraph' || prev.type === 'lead') && !sentenceEndsStrong(prev.text)) {
        mergeTextIntoBlock(prev, block.text, ' ');
        i++;
        continue;
      }

      // Altrimenti crea un paragrafo e assorbi eventuali heading deboli consecutive.
      var paragraph = Object.assign({}, block, {
        type: 'paragraph',
        role: '',
        text: normalizeReaderBlockTextInline(block.text)
      });
      delete paragraph.role;
      i++;

      while (i < src.length) {
        var candidate = src[i];
        if (!candidate || candidate.type !== 'heading' || !isWeakHeadingBlock(candidate, paragraph, src[i + 1] || null)) break;
        mergeTextIntoBlock(paragraph, candidate.text, ' ');
        paragraph.yCanvasBottom = Math.max(Number(paragraph.yCanvasBottom || 0), Number(candidate.yCanvasBottom || 0));
        i++;
      }

      // Se il paragrafo creato termina ancora aperto, assorbi il primo paragrafo seguente di continuazione.
      if (i < src.length && src[i] && src[i].type === 'paragraph' && (!sentenceEndsStrong(paragraph.text) || startsLowercaseOrContinuation(src[i].text))) {
        mergeTextIntoBlock(paragraph, src[i].text, ' ');
        paragraph.yCanvasBottom = Math.max(Number(paragraph.yCanvasBottom || 0), Number(src[i].yCanvasBottom || 0));
        i++;
      }

      out.push(paragraph);
    }

    return out;
  }

  function hasBibliographyMarker(text) {
    var clean = normalizeForEditorialMatch(text);
    return /^(fonti|fonte|bibliografia|riferimenti|sitografia|fonti e approfondimenti|fonti consultate)(\b|\s|:|-|–|—)/.test(clean);
  }

  function insertReaderSourceBoundaries(text) {
    var out = safeString(text);
    if (!out) return '';

    out = out.replace(/\b(Fonte|Fonti|Bibliografia|Riferimenti|Riferimento|Sitografia|Fonti consultate|Fonti e riferimenti|Fonti e approfondimenti scientifici)\s*:\s*/ig, '\n@@WILDU_SOURCE_MARKER@@$1: ');

    // Se dopo una citazione bibliografica completa riparte un titolo/sezione,
    // forza un confine. Evita blocchi tipo fonte + nuovo capitolo.
    out = out.replace(/((?:Nature|PLOS\s+ONE|Journal\s+of\s+African\s+Zoology|Journal|Scientific\s+Reports|Chemical\s+Senses|Nature\s+Communications)[^\n]{0,220}?(?:\d{1,4}\s*[-–,]\s*\d{2,5}|e\d{3,8})\.?)\s+([A-ZÀ-Ý][^\n.!?]{4,115}(?:\([^)]{2,80}\)|:|\?)?)/g, '$1\n$2');

    return out.replace(/^\n+/, '').trim();
  }

  function pushLineGroupAsBlocks(out, proto, groupType, lines) {
    lines = (lines || []).map(function (line) { return safeString(line); }).filter(Boolean);
    if (!lines.length) return;

    var base = Object.assign({}, proto || {});
    delete base.role;

    function pushBody(text, lineCount) {
      var clean = safeString(text);
      if (!clean) return;
      var block = classifyReaderParagraph(clean, true, { lineCount: lineCount || 1 });
      out.push(Object.assign({}, base, block, { text: clean }));
    }

    if (groupType === 'source') {
      out.push(Object.assign({}, base, {
        type: 'note',
        role: 'sources',
        text: stripSourcesHeadingPrefix(lines.join('\n')) || lines.join('\n')
      }));
      return;
    }

    if (groupType === 'caption') {
      out.push(Object.assign({}, base, { type: 'note', role: 'image-caption', text: normalizeImageCaption(lines.join(' ')) }));
      return;
    }

    if (groupType === 'author') {
      out.push(Object.assign({}, base, { type: 'note', role: 'author', text: lines.join(' ') }));
      return;
    }

    // Corpo: se il primo rigo è un titolo forte e dopo c'è testo, separa titolo/paragrafo.
    if (lines.length > 1 && lineLooksLikeStrongArticleHeading(lines[0])) {
      out.push(Object.assign({}, base, { type: 'heading', text: lines[0] }));
      pushBody(lines.slice(1).join(' '), lines.length - 1);
      return;
    }

    pushBody(lines.join(' '), lines.length);
  }

  function splitMixedSourceBlock(block) {
    var text = safeString(block && block.text);
    if (!text) return [block];

    var role = safeString(block && block.role).toLowerCase();
    var prepared = insertReaderSourceBoundaries(text);
    var lines = prepared.split(/\n+/).map(function (line) { return safeString(line); }).filter(Boolean);

    var hasMarker = /@@WILDU_SOURCE_MARKER@@/.test(prepared);
    var hasSourceLine = lines.some(function (line) {
      var cleanLine = line.replace('@@WILDU_SOURCE_MARKER@@', '');
      return isSourcesParagraph(cleanLine) || looksLikePureSourceLine(cleanLine);
    });
    var hasArticleLine = lines.some(function (line) {
      var cleanLine = line.replace('@@WILDU_SOURCE_MARKER@@', '');
      return lineLooksLikeStrongArticleHeading(cleanLine) || (looksLikeArticleContinuation(cleanLine) && !looksLikePureSourceLine(cleanLine));
    });

    if (!hasMarker && !(role === 'sources' && hasSourceLine && hasArticleLine)) {
      return [block];
    }

    var out = [];
    var group = [];
    var groupType = '';
    var previousWasSource = false;
    var finalBibliographyMode = false;

    function flush() {
      if (group.length) pushLineGroupAsBlocks(out, block, groupType || 'body', group);
      group = [];
      groupType = '';
    }

    function start(type, line) {
      if (groupType && groupType !== type) flush();
      groupType = type;
      if (line) group.push(line);
    }

    lines.forEach(function (rawLine) {
      var marker = rawLine.indexOf('@@WILDU_SOURCE_MARKER@@') !== -1;
      var line = rawLine.replace('@@WILDU_SOURCE_MARKER@@', '').trim();
      if (!line) return;

      if (/^nella\s+foto\s*:/i.test(line)) {
        flush();
        start('caption', line);
        flush();
        previousWasSource = false;
        return;
      }

      if (/^scritto\s+da\b/i.test(line)) {
        flush();
        start('author', line);
        flush();
        previousWasSource = false;
        return;
      }

      if (marker) {
        var kind = sourceMarkerKind(line);
        if (kind === 'final') finalBibliographyMode = true;
        var stripped = stripSourcesHeadingPrefix(line);
        if (stripped) {
          start('source', stripped);
          previousWasSource = true;
        } else {
          flush();
          previousWasSource = false;
        }
        return;
      }

      if (finalBibliographyMode) {
        if (lineLooksLikeListItem(line) || looksLikePureSourceLine(line) || looksLikeSourceContinuationLine(line, previousWasSource)) {
          start('source', line);
          previousWasSource = true;
          return;
        }
        // Se dopo una bibliografia appare testo narrativo vero, esci dalla modalità fonti.
        finalBibliographyMode = false;
      }

      if (looksLikePureSourceLine(line) || looksLikeSourceContinuationLine(line, previousWasSource)) {
        start('source', line);
        previousWasSource = true;
        if (sourceCitationHasLikelyEnd(line)) previousWasSource = false;
        return;
      }

      start('body', line);
      previousWasSource = false;
    });

    flush();
    return out.length ? out : [block];
  }

  function splitMixedSourceBlocks(blocks) {
    var out = [];
    (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
      if (!block || !isTextLikeReaderBlock(block)) {
        out.push(block);
        return;
      }
      splitMixedSourceBlock(block).forEach(function (part) { out.push(part); });
    });
    return out;
  }

  function strengthenSourceBlocks(blocks) {
    var src = splitMixedSourceBlocks(Array.isArray(blocks) ? blocks.slice() : []);
    var out = [];
    var inFinalBibliography = false;

    src.forEach(function (block) {
      if (!block) return;
      var text = safeString(block.text);
      var role = safeString(block.role).toLowerCase();

      if (!isTextLikeReaderBlock(block)) {
        out.push(block);
        return;
      }

      if (isFinalSourcesMarker(text)) {
        var stripped = stripSourcesHeadingPrefix(text);
        inFinalBibliography = true;
        if (stripped && !isSourcesHeadingOnly(text)) {
          out.push(Object.assign({}, block, { type: 'note', role: 'sources', text: stripped }));
        }
        return;
      }

      if (sourceMarkerKind(text) === 'single') {
        out.push(Object.assign({}, block, { type: 'note', role: 'sources', text: stripSourcesHeadingPrefix(text) || text }));
        inFinalBibliography = false;
        return;
      }

      if (inFinalBibliography) {
        if (/^nella\s+foto\s*:/i.test(text)) {
          out.push(Object.assign({}, block, { type: 'note', role: 'image-caption' }));
          inFinalBibliography = false;
          return;
        }
        if (/^scritto\s+da\b/i.test(text)) {
          out.push(Object.assign({}, block, { type: 'note', role: 'author' }));
          inFinalBibliography = false;
          return;
        }
        if (lineLooksLikeListItem(text) || looksLikePureSourceLine(text) || looksLikeSourceContinuationLine(text, true)) {
          out.push(Object.assign({}, block, { type: 'note', role: 'sources' }));
          return;
        }
        inFinalBibliography = false;
      }

      if (role === 'sources' || isSourcesParagraph(text) || looksLikeSourceCitation(text)) {
        out.push(Object.assign({}, block, { type: 'note', role: 'sources', text: stripSourcesHeadingPrefix(text) || text }));
        return;
      }

      out.push(block);
    });

    return out;
  }

  function compactAdjacentSourceBlocks(blocks) {
    var out = [];
    (Array.isArray(blocks) ? blocks : []).forEach(function (block) {
      if (!block) return;
      var last = out.length ? out[out.length - 1] : null;
      if (
        last && block.role === 'sources' && last.role === 'sources' &&
        Number(last.page || 0) === Number(block.page || 0) &&
        safeString(last.text).length + safeString(block.text).length < 900
      ) {
        mergeTextIntoBlock(last, block.text, '\n');
        last.yCanvasBottom = Math.max(Number(last.yCanvasBottom || 0), Number(block.yCanvasBottom || 0));
        return;
      }
      out.push(block);
    });
    return out;
  }

  function postProcessReaderBlocks(blocks) {
    var out = Array.isArray(blocks) ? blocks.slice() : [];
    out = normalizeHeadingRuns(out);
    out = strengthenSourceBlocks(out);
    out = compactAdjacentSourceBlocks(out);
    out = attachImageCaptionsToNearestImages(out);
    out = moveSourcesBlocksToEnd(out);
    return out;
  }

  function analyzeReaderBlocks(blocks, meta) {
    meta = meta || {};
    var list = Array.isArray(blocks) ? blocks : [];
    var report = {
      schemaVersion: 1,
      engine: 'reader-v6',
      pageCount: Number(meta.originalPageCount || 0),
      pagesProcessed: Number(meta.pagesProcessed || 0),
      blockCount: list.length,
      paragraphCount: 0,
      headingCount: 0,
      imageCount: 0,
      sourceCount: 0,
      leadCount: 0,
      noteCount: 0,
      suspiciousBlocks: [],
      warnings: [],
      confidence: 100
    };

    list.forEach(function (block, index) {
      if (!block) return;
      var type = safeString(block.type || 'paragraph');
      var role = safeString(block.role).toLowerCase();
      var text = safeString(block.text);
      if (type === 'paragraph') report.paragraphCount++;
      if (type === 'heading') report.headingCount++;
      if (type === 'image') report.imageCount++;
      if (type === 'lead') report.leadCount++;
      if (type === 'note') report.noteCount++;
      if (role === 'sources') report.sourceCount++;

      if (type === 'heading' && (isWeakHeadingBlock(block, list[index - 1], list[index + 1]) || text.length > 115)) {
        report.suspiciousBlocks.push({ index: index, type: type, reason: 'heading_sospetto', text: text.slice(0, 160) });
      }
      if (type === 'paragraph' && looksLikeSourceCitation(text) && role !== 'sources') {
        report.suspiciousBlocks.push({ index: index, type: type, reason: 'fonte_forse_non_spostata', text: text.slice(0, 160) });
      }
      if (role === 'sources' && text.length < 8) {
        report.suspiciousBlocks.push({ index: index, type: type, reason: 'fonte_troppo_corta', text: text });
      }
    });

    if (report.headingCount > Math.max(8, report.paragraphCount * 0.45)) {
      report.warnings.push('Molti titoli rispetto ai paragrafi: controllare classificazione heading.');
      report.confidence -= 18;
    }
    if (Number(meta.pagesProcessed || 0) >= 2 && report.imageCount === 0) {
      report.warnings.push('Nessuna immagine rilevata: PDF forse testuale o detector troppo prudente.');
      report.confidence -= 10;
    }
    if (report.sourceCount === 0 && list.some(function (b) { return looksLikeSourceCitation(safeString(b && b.text)); })) {
      report.warnings.push('Possibili fonti rimaste nel corpo del testo.');
      report.confidence -= 20;
    }
    if (report.suspiciousBlocks.length) {
      report.confidence -= Math.min(35, report.suspiciousBlocks.length * 5);
    }

    report.confidence = Math.max(0, Math.min(100, report.confidence));
    if (report.confidence >= 82) report.status = 'OK';
    else if (report.confidence >= 60) report.status = 'CHECK';
    else report.status = 'LOW_CONFIDENCE';

    return report;
  }

  function buildAdminPreviewHtmlFromBlocks(media, blocks, report) {
    function esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    function textHtml(text) {
      return esc(text).replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
    }
    var list = Array.isArray(blocks) ? blocks : [];
    var body = list.slice(0, 80).map(function (block, index) {
      var type = safeString(block && block.type || 'paragraph');
      var role = safeString(block && block.role || '');
      var badge = '<span style="font-size:10px; padding:3px 7px; border-radius:999px; background:rgba(255,255,255,.10); color:#d9e6d9;">' + esc(type + (role ? ':' + role : '')) + '</span>';
      if (type === 'image') {
        return '<figure style="margin:14px 0; padding:8px; border-radius:14px; border:1px solid rgba(255,255,255,.14); background:rgba(0,0,0,.18);">' + badge + '<img src="' + esc(block.url || '') + '" style="display:block; width:100%; max-height:260px; object-fit:contain; margin-top:8px; border-radius:12px; background:#111;">' + (block.caption ? '<figcaption style="color:#cdbb7c; font-size:12px; margin-top:6px;">' + esc(block.caption) + '</figcaption>' : '') + '</figure>';
      }
      if (type === 'divider') return '<hr style="border:0; border-top:1px solid rgba(214,178,94,.35); margin:18px 0;">';
      var tag = type === 'heading' ? 'h3' : 'div';
      var color = role === 'sources' ? '#f4e6ba' : (type === 'heading' ? '#fff' : '#eaf1e7');
      var bg = role === 'sources' ? 'rgba(214,178,94,.08)' : 'rgba(255,255,255,.035)';
      return '<' + tag + ' style="margin:10px 0; padding:10px 12px; border-radius:12px; background:' + bg + '; color:' + color + '; line-height:1.48; font-size:' + (type === 'heading' ? '17px' : '14px') + ';">' + badge + '<div style="margin-top:6px;">' + textHtml(block.text || '') + '</div></' + tag + '>';
    }).join('');
    var r = report || {};
    return '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif; color:#eef6ef;">' +
      '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">' +
      '<span style="padding:6px 9px; border-radius:999px; background:rgba(107,213,138,.14); color:#bff7cd; font-weight:900;">Confidenza ' + esc(r.confidence == null ? '—' : r.confidence + '%') + '</span>' +
      '<span style="padding:6px 9px; border-radius:999px; background:rgba(255,255,255,.08);">Blocchi ' + esc(r.blockCount || list.length) + '</span>' +
      '<span style="padding:6px 9px; border-radius:999px; background:rgba(255,255,255,.08);">Titoli ' + esc(r.headingCount || 0) + '</span>' +
      '<span style="padding:6px 9px; border-radius:999px; background:rgba(255,255,255,.08);">Fonti ' + esc(r.sourceCount || 0) + '</span>' +
      '<span style="padding:6px 9px; border-radius:999px; background:rgba(255,255,255,.08);">Immagini ' + esc(r.imageCount || 0) + '</span>' +
      '</div>' +
      ((r.warnings || []).length ? '<div style="border:1px solid rgba(228,182,83,.35); background:rgba(228,182,83,.10); border-radius:14px; padding:10px 12px; margin-bottom:12px; color:#ffe7a5;"><strong>Avvisi:</strong><br>' + esc((r.warnings || []).join('\n')).replace(/\n/g, '<br>') + '</div>' : '') +
      '<h2 style="margin:0 0 10px; color:#f6d889;">' + esc(media && media.title || 'Anteprima reader') + '</h2>' +
      body +
      (list.length > 80 ? '<div style="margin:14px 0; color:#aebcaf;">Anteprima ridotta: mostrati primi 80 blocchi su ' + esc(list.length) + '.</div>' : '') +
      '</div>';
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

    return postProcessReaderBlocks(out);
  }

  function buildPatchFromBlocks(media, blocks, meta) {
    media = media || {};
    meta = meta || {};

    var sourceVersion = Math.max(1, Number(media.mediaVersion || media.readerSourceMediaVersion || 1));
    var nextReaderVersion = Math.max(1, Number(meta.nextReaderVersion || media.readerVersion || 0) + (meta.nextReaderVersion ? 0 : 1));
    var preview = buildPreview(blocks, 900);
    var imageCount = (blocks || []).filter(function (block) { return block && block.type === 'image'; }).length;
    var report = analyzeReaderBlocks(blocks, meta);
    var previewHtml = buildAdminPreviewHtmlFromBlocks(media, blocks, report);

    var patch = {
      readerStatus: 'READY',
      readerBuildMode: 'admin-browser-pdfjs-editorial-v6-diagnostics-preview',
      readerEditorialVersion: 6,
      readerSourcesMovedToEnd: (blocks || []).some(function (block) { return block && block.role === 'sources'; }),
      readerImageStrategy: 'pdf-visual-components-plus-native-layout-captions-v6-3-4-hero-horizontal-smart-trim',
      readerImageCount: imageCount,
      readerImageObjectKeys: collectReaderImageObjectKeys({ readerBlocks: blocks }),
      readerImageUrls: (blocks || []).filter(function (block) { return block && block.type === 'image' && block.url; }).map(function (block) { return block.url; }),
      readerImageCleanupPolicy: 'delete-known-reader-images-before-replace-or-clear-v6-2',
      readerImageErrors: Array.isArray(meta.imageErrors) ? meta.imageErrors.slice(0, 12) : [],
      readerQualityScore: report.confidence,
      readerQualityStatus: report.status,
      readerBuildReport: report,
      readerWarnings: report.warnings || [],
      readerSuspiciousBlocks: report.suspiciousBlocks || [],
      readerAdminPreviewHtml: previewHtml,
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

    onProgress('Preparazione reader editoriale V6.2: diagnostica, fonti, titoli, preview e immagini pulibili...');
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
      readerImageObjectKeys: null,
      readerImageUrls: null,
      readerImageCleanupPolicy: null,
      readerImageErrors: null,
      readerQualityScore: null,
      readerQualityStatus: null,
      readerBuildReport: null,
      readerWarnings: null,
      readerSuspiciousBlocks: null,
      readerAdminPreviewHtml: null,
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
    buildClearReaderPatch: buildClearReaderPatch,
    buildAdminPreviewHtmlFromBlocks: buildAdminPreviewHtmlFromBlocks,
    analyzeReaderBlocks: analyzeReaderBlocks,
    collectReaderImageObjectKeys: collectReaderImageObjectKeys,
    cleanupReaderImages: cleanupReaderImages
  };
})();
