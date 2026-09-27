// Wild-U-owned wrapper. No game Auth, global cache, external SDK or reload.
const target = 'giochi/temple-run';
const shell = document.getElementById('shell');
const stage = document.getElementById('stage');
const notice = document.getElementById('notice');
const message = document.getElementById('message');
const retry = document.getElementById('retry');
let frame = null, generation = 0, phase = 'idle', deadline = null;
function normalize(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try { return new URL(value, location.origin + '/Wild-U/').pathname.replace(/^\/+/,'').replace(/^Wild-U\//i,'').replace(/\/index\.html$/i,'').replace(/\/+$/,''); }
  catch { return ''; }
}
function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function fresh(v) { const n=Number(v); return Number.isFinite(n) && n > Date.now() + 1000; }
// Fail closed before the shared guard's historical remote Firebase fallback.
// This preflight does NOT authorize launch: the unmodified guard still must pass.
function localLaunchAvailable() {
  const session = read('wildu_secure_session_game:giochi_temple-run');
  if (session && normalize(session.targetKey) === target && fresh(session.expiresAt)) return true;
  const id = (new URLSearchParams(location.search).get('launch') || '').trim();
  const b = id && read('wildu_secure_launch_bridge:' + id);
  return !!(b && b.launchId === id && b.source === 'wild-u-client' && b.targetKind === 'secure_iframe' &&
    normalize(b.targetKey || b.targetUrl) === target && fresh(b.expiresAt));
}
function clearDeadline() { if (deadline !== null) clearTimeout(deadline); deadline = null; }
function destroyRuntime() {
  const old = frame; frame = null;
  try { old?.contentWindow?.WilduTempleLifecycle?.dispose(); } catch { /* Removal is unconditional. */ }
  finally { old?.remove(); stage.replaceChildren(); }
}
function show(text, canRetry=true) {
  if (!shell.isConnected) document.body.replaceChildren(shell);
  message.textContent = text; notice.hidden = false; retry.hidden = !canRetry;
}
window.WilduTempleContainer = Object.freeze({
  authorizeChild(child) { return phase === 'loading' && !!frame && frame.contentWindow === child; }
});
async function start() {
  if (phase === 'checking' || phase === 'loading' || phase === 'running') return;
  const token = ++generation; phase = 'checking'; clearDeadline(); destroyRuntime();
  show('Verifica dell’avvio…', false);
  if (!localLaunchAvailable()) {
    phase = 'blocked'; show('Riapri Temple Run dal launcher Wild-U. Il collegamento locale di avvio non è disponibile.', false); return;
  }
  deadline = setTimeout(() => {
    if (token !== generation) return;
    generation++; phase = 'error'; destroyRuntime(); show('Avvio non completato. Puoi riprovare oppure uscire.');
  }, 15000);
  try {
    const { guardWilduGame } = await import('../../shared/wildu-secure-game-guard.js');
    if (token !== generation) return;
    const result = await guardWilduGame({targetKey:target+'/index.html',allowedKind:'secure_iframe'});
    if (token !== generation || !result?.ok) return;
    phase = 'loading';
    frame = document.createElement('iframe'); frame.title = 'Temple Run';
    frame.setAttribute('allow','autoplay');
    frame.src = './runtime/index.html'; stage.append(frame);
    show('Caricamento del gioco…', false);
  } catch {
    if (token !== generation) return;
    clearDeadline(); phase = 'error'; destroyRuntime();
    show('Avvio non autorizzato o non disponibile. Riapri dal launcher Wild-U.', false);
  }
}
function exit() {
  ++generation; clearDeadline(); phase = 'closed'; destroyRuntime();
  show('Gioco chiuso. Se questa schermata resta aperta, riprova «Esci dal gioco» oppure riapri.');
  if (parent !== window) {
    try { parent.postMessage({type:'WILDU_GAME_CLOSE_REQUEST',source:'temple-run',destination:'taverna-gratis'}, location.origin); }
    catch { show('Il contenitore non ha ricevuto la chiusura. Puoi riprovare oppure riaprire.'); }
  }
}
window.addEventListener('message', event => {
  if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow || phase !== 'loading') return;
  if (event.data?.type === 'WILDU_TEMPLE_READY') {
    clearDeadline(); phase = 'running'; notice.hidden = true;
  }
});
document.getElementById('exit').addEventListener('click', exit);
retry.addEventListener('click', start);
window.addEventListener('pagehide', () => { ++generation; clearDeadline(); phase='closed'; destroyRuntime(); });
window.addEventListener('pageshow', event => {
  if (event.persisted) { phase='closed'; show('Sessione sospesa. Premi Riapri gioco per ricominciare.'); }
});
void start();
