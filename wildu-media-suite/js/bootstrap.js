import '../shared/firebase-config.js';

const scripts = [
  'js/firebase-init.js',
  'js/utils.js',
  'js/tag-service.js',
  'js/r2-worker-service.js',
  'js/media-service.js',
  'js/client-version-helper.js',
  'js/app.js'
];

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
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
