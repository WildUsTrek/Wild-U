#!/usr/bin/env node
/*
 * WILDU — YouTube playlists manifest generator
 * - Nessuna YouTube Data API
 * - Nessuna API key YouTube
 * - Legge i feed RSS pubblici delle playlist
 * - Genera data/youtube-playlists.json per la Client App
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_OUTPUT = 'data/youtube-playlists.json';
const DEFAULT_MIN_REFRESH_DAYS = 10;

const PLAYLISTS = {
  wildwall_shorts: {
    key: 'wildwall_shorts',
    label: 'WildWall Shorts',
    kind: 'shorts',
    orientation: 'vertical',
    playlistId: process.env.WILDU_SHORTS_PLAYLIST_ID || 'PLrxqst5TP2nI3GGeSe44lnLnCA_0US2hh',
    maxItems: toPositiveInt(process.env.WILDU_SHORTS_MAX_ITEMS, 50)
  },
  video_horizontal: {
    key: 'video_horizontal',
    label: 'Video orizzontali',
    kind: 'video',
    orientation: 'horizontal',
    playlistId: process.env.WILDU_HORIZONTAL_PLAYLIST_ID || '',
    maxItems: toPositiveInt(process.env.WILDU_HORIZONTAL_MAX_ITEMS, 50)
  }
};

function toPositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getArg(name, fallback = '') {
  const prefix = '--' + name + '=';
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  return fallback;
}

function boolFrom(value) {
  return ['1', 'true', 'yes', 'y', 'force'].includes(String(value || '').trim().toLowerCase());
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJsonIfChanged(filePath, data) {
  ensureDir(filePath);
  const next = JSON.stringify(data, null, 2) + '\n';
  let prev = '';
  try { prev = fs.readFileSync(filePath, 'utf8'); } catch (e) {}

  if (prev === next) {
    console.log('[WILDU YT] Manifest invariato:', filePath);
    return false;
  }

  fs.writeFileSync(filePath, next, 'utf8');
  console.log('[WILDU YT] Manifest scritto:', filePath);
  return true;
}

function daysSince(isoDate) {
  const d = new Date(isoDate || 0);
  if (!Number.isFinite(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (24 * 60 * 60 * 1000);
}

function stripCdata(value) {
  return String(value || '')
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .trim();
}

function decodeXml(value) {
  return stripCdata(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickTag(block, tagName) {
  const cleanTag = escapeRegExp(tagName);
  const re = new RegExp('<' + cleanTag + '[^>]*>([\\s\\S]*?)<\\/' + cleanTag + '>', 'i');
  const m = block.match(re);
  return m ? decodeXml(m[1]) : '';
}

function pickAttr(block, tagName, attrName) {
  const cleanTag = escapeRegExp(tagName);
  const cleanAttr = escapeRegExp(attrName);
  const tagRe = new RegExp('<' + cleanTag + '\\b[^>]*>', 'i');
  const tagMatch = block.match(tagRe);
  if (!tagMatch) return '';
  const attrRe = new RegExp(cleanAttr + "=[\\\"']([^\\\"']+)[\\\"']", 'i');
  const attrMatch = tagMatch[0].match(attrRe);
  return attrMatch ? decodeXml(attrMatch[1]) : '';
}

function parseYoutubeFeed(xml, playlist) {
  const entries = [];
  const entryRe = /<entry[\s\S]*?<\/entry>/gi;
  const blocks = xml.match(entryRe) || [];
  const seen = new Set();

  for (const block of blocks) {
    const videoId = pickTag(block, 'yt:videoId');
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);

    const title = pickTag(block, 'title');
    const publishedAt = pickTag(block, 'published');
    const updatedAt = pickTag(block, 'updated');
    const thumbnail = pickAttr(block, 'media:thumbnail', 'url') ||
      ('https://i.ytimg.com/vi/' + encodeURIComponent(videoId) + '/hqdefault.jpg');

    entries.push({
      videoId,
      title,
      publishedAt,
      updatedAt,
      thumbnail,
      watchUrl: 'https://www.youtube.com/watch?v=' + encodeURIComponent(videoId),
      embedUrl: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId)
    });

    if (entries.length >= playlist.maxItems) break;
  }

  return entries;
}

function isValidPlaylistId(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (/INSERISCI|DA_COMPILARE|TODO/i.test(raw)) return false;
  return /^[A-Za-z0-9_-]{10,}$/.test(raw);
}

async function fetchPlaylist(playlist) {
  const playlistId = String(playlist.playlistId || '').trim();

  if (!isValidPlaylistId(playlistId)) {
    return {
      ...playlist,
      playlistId,
      count: 0,
      items: [],
      fetchStatus: 'SKIPPED_MISSING_PLAYLIST_ID',
      fetchedAt: new Date().toISOString()
    };
  }

  const feedUrl = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + encodeURIComponent(playlistId);
  console.log('[WILDU YT] Leggo RSS:', playlist.key, feedUrl);

  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Wildu-YouTube-RSS-Manifest/1.0',
      'Accept': 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5'
    }
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error('Feed YouTube non leggibile per ' + playlist.key + ' HTTP ' + res.status + ': ' + text.slice(0, 200));
  }

  const items = parseYoutubeFeed(text, playlist);
  return {
    ...playlist,
    playlistId,
    feedUrl,
    count: items.length,
    items,
    fetchStatus: 'OK',
    fetchedAt: new Date().toISOString()
  };
}

function buildBaseManifest(previous) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: 'youtube-rss',
    minRefreshDays: DEFAULT_MIN_REFRESH_DAYS,
    playlists: previous && previous.playlists && typeof previous.playlists === 'object'
      ? previous.playlists
      : {}
  };
}

async function main() {
  const output = getArg('output', process.env.WILDU_YOUTUBE_MANIFEST_OUTPUT || DEFAULT_OUTPUT);
  const target = getArg('target', process.env.TARGET || process.env.INPUT_TARGET || 'all');
  const force = boolFrom(getArg('force', process.env.FORCE || process.env.INPUT_FORCE || 'false'));
  const minRefreshDays = toPositiveInt(process.env.WILDU_YOUTUBE_MIN_REFRESH_DAYS, DEFAULT_MIN_REFRESH_DAYS);
  const previous = readJson(output);

  if (!force && previous && daysSince(previous.generatedAt) < minRefreshDays) {
    console.log('[WILDU YT] Skip: ultimo update troppo recente.', {
      generatedAt: previous.generatedAt,
      days: Number(daysSince(previous.generatedAt).toFixed(2)),
      minRefreshDays
    });
    return;
  }

  const manifest = buildBaseManifest(previous);
  manifest.generatedAt = new Date().toISOString();
  manifest.minRefreshDays = minRefreshDays;
  manifest.refreshMode = force ? 'manual-force' : 'scheduled';
  manifest.target = target;

  const keys = Object.keys(PLAYLISTS).filter((key) => target === 'all' || key === target);
  if (!keys.length) {
    throw new Error('Target playlist non valido: ' + target);
  }

  for (const key of keys) {
    const playlist = PLAYLISTS[key];
    try {
      manifest.playlists[key] = await fetchPlaylist(playlist);
    } catch (err) {
      const prev = previous && previous.playlists ? previous.playlists[key] : null;
      if (prev && Array.isArray(prev.items) && prev.items.length) {
        manifest.playlists[key] = {
          ...prev,
          fetchStatus: 'FALLBACK_PREVIOUS_AFTER_ERROR',
          lastError: err.message,
          lastErrorAt: new Date().toISOString()
        };
        console.warn('[WILDU YT] Errore feed, preservo playlist precedente:', key, err.message);
      } else {
        manifest.playlists[key] = {
          ...playlist,
          playlistId: playlist.playlistId || '',
          count: 0,
          items: [],
          fetchStatus: 'ERROR_EMPTY',
          lastError: err.message,
          lastErrorAt: new Date().toISOString()
        };
        console.warn('[WILDU YT] Errore feed senza fallback:', key, err.message);
      }
    }
  }

  writeJsonIfChanged(output, manifest);
}

main().catch((err) => {
  console.error('[WILDU YT] FATAL:', err);
  process.exit(1);
});
