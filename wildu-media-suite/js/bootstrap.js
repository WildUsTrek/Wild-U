const WILDU_MEDIA_BOOT_VERSION = '0.4.7';
 
// Import versionato della config pubblica.
// Serve a evitare che il Service Worker o il browser tengano una config vecchia.
await import('../shared/firebase-config.js?v=' + encodeURIComponent(WILDU_MEDIA_BOOT_VERSION));

const scripts = [
  'js/firebase-init.js',
  'js/utils.js',
  'js/tag-service.js',
  'js/runtime-service.js',
  'js/r2-worker-service.js',
  'js/media-service.js',
  'js/client-version-helper.js',
  'js/app.js'
];

function withVersion(src) {
  return src + '?v=' + encodeURIComponent(WILDU_MEDIA_BOOT_VERSION);
}

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = withVersion(src);
    s.onload = resolve;
    s.onerror = () => reject(new Error('Impossibile caricare ' + src));
    document.body.appendChild(s);
  });
}

(async function bootWilduMediaSuite() {
  for (const src of scripts) {
    await loadClassicScript(src);
  }
})();
