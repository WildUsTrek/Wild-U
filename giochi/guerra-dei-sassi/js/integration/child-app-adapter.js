(function installChildWorldAdapter(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.contracts) throw new Error('Integration contracts must load before child adapter.');

  function createChannelId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return global.crypto.randomUUID();
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      const bytes = global.crypto.getRandomValues(new Uint8Array(16));
      return `child-${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
    }
    throw new Error('Secure randomness is required for the child message channel.');
  }

  function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function ChildWorldAdapter(options) {
    const settings = options || {};
    this.assetRoot = settings.assetRoot || 'story-world/';
    this.assetRevision = settings.assetRevision || '20260821.18';
    this.networkCache = settings.networkCache || null;
    this.state = 'idle';
    this.frame = null;
    this.container = null;
    this.context = null;
    this.channelId = '';
    this.expectedOrigin = '';
    this.pending = new Map();
    this.sequence = 0;
    this.messageListener = this.handleMessage.bind(this);
  }

  ChildWorldAdapter.prototype.loadShell = async function loadShell(baseUrl) {
    const url = new URL('story-world-shell.html', baseUrl);
    if (this.networkCache && typeof this.networkCache.fetchOwnedShell === 'function') return this.networkCache.fetchOwnedShell(url);
    const response = await fetch(url, { cache: 'default', credentials: 'same-origin', redirect: 'error' });
    if (!response.ok) throw new Error(`Child shell load failed: HTTP ${response.status}`);
    return response.text();
  };

  ChildWorldAdapter.prototype.createDocument = function createDocument(baseUrl, shell) {
    const safeBase = escapeAttribute(baseUrl);
    const safeChannel = escapeAttribute(this.channelId);
    const safeParentOrigin = escapeAttribute(this.expectedOrigin);
    const safeRevision = encodeURIComponent(this.assetRevision);
    return [
      '<!doctype html><html lang="it"><head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">',
      `<meta name="unified-game-channel" content="${safeChannel}">`,
      `<meta name="unified-game-parent-origin" content="${safeParentOrigin}">`,
      `<base href="${safeBase}">`,
      '<link rel="icon" href="assets/pwa/perla-icon.svg">',
      `<link rel="stylesheet" href="story-world.css?v=${safeRevision}">`,
      '<title>Camping Sole, Mare & Zanzare</title>',
      '</head><body>',
      shell,
      `<script src="child-frame-prelude.js?v=${safeRevision}"><\/script>`,
      `<script src="story-world-runtime.js?v=${safeRevision}"><\/script>`,
      '</body></html>'
    ].join('');
  };

  ChildWorldAdapter.prototype.waitForMessage = function waitForMessage(type, timeoutMs) {
    return new Promise((resolve, reject) => {
      const requestId = `wait-${++this.sequence}`;
      const timer = global.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Timed out waiting for child message: ${type}`));
      }, timeoutMs || 20000);
      this.pending.set(requestId, { type, resolve, reject, timer, eventWait: true });
    });
  };

  ChildWorldAdapter.prototype.handleMessage = function handleMessage(event) {
    if (!this.frame || event.source !== this.frame.contentWindow || event.origin !== this.expectedOrigin) return;
    const message = event.data;
    if (!message || message.channelId !== this.channelId || typeof message.type !== 'string') return;

    if (message.requestId && this.pending.has(message.requestId)) {
      const pending = this.pending.get(message.requestId);
      global.clearTimeout(pending.timer);
      this.pending.delete(message.requestId);
      if (message.type === 'child:lifecycle-error') pending.reject(new Error(message.payload && message.payload.message || 'Child lifecycle command failed.'));
      else pending.resolve(message.payload || null);
      return;
    }

    for (const [requestId, pending] of this.pending.entries()) {
      if (pending.eventWait && pending.type === message.type) {
        global.clearTimeout(pending.timer);
        this.pending.delete(requestId);
        pending.resolve(message.payload || null);
        break;
      }
    }

    if (this.context && this.context.events && typeof this.context.events.emit === 'function') {
      this.context.events.emit(message.type, message.payload || null);
    }
  };

  ChildWorldAdapter.prototype.command = function command(commandName, reason, timeoutMs, payload) {
    if (!this.frame || !this.frame.contentWindow) return Promise.reject(new Error('Child frame is not mounted.'));
    const requestId = `command-${++this.sequence}`;
    return new Promise((resolve, reject) => {
      const timer = global.setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Child lifecycle command timed out: ${commandName}`));
      }, timeoutMs || 5000);
      this.pending.set(requestId, { resolve, reject, timer, eventWait: false });
      this.frame.contentWindow.postMessage({
        channelId: this.channelId,
        command: commandName,
        reason: String(reason || ''),
        requestId,
        payload: payload === undefined ? null : payload
      }, this.expectedOrigin);
    });
  };

  ChildWorldAdapter.prototype.mount = async function mount(container, context) {
    if (this.state !== 'idle') throw root.contracts.contractError('CHILD_ALREADY_MOUNTED', `Child adapter cannot mount from state ${this.state}.`);
    if (!container || container.nodeType !== 1) throw root.contracts.contractError('INVALID_MOUNT_CONTAINER', 'Child mount container must be an element.');
    root.contracts.assertChildContext(context);
    const expectedOrigin = String(global.location && global.location.origin || '');
    if (!expectedOrigin || expectedOrigin === 'null') throw new Error('A concrete web origin is required to mount the child world.');

    this.state = 'mounting';
    this.container = container;
    this.context = context;
    this.channelId = createChannelId();
    this.expectedOrigin = expectedOrigin;
    global.addEventListener('message', this.messageListener);

    try {
      const baseUrl = new URL(this.assetRoot, document.baseURI).href;
      const shell = await this.loadShell(baseUrl);
      const frame = document.createElement('iframe');
      frame.className = 'unified-story-world-frame';
      frame.title = 'Mondo storia';
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock allow-downloads');
      frame.setAttribute('allow', 'fullscreen; gamepad; clipboard-write');
      frame.setAttribute('referrerpolicy', 'same-origin');
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
      frame.style.display = 'block';
      this.frame = frame;
      const ready = this.waitForMessage('child:frame-loaded', 30000);
      frame.srcdoc = this.createDocument(baseUrl, shell);
      container.replaceChildren(frame);
      await ready;
      this.state = 'mounted';
      return Object.freeze({ state: this.state, channelId: this.channelId });
    } catch (error) {
      await this.unmount('mount-failed').catch(() => null);
      throw error;
    }
  };

  ChildWorldAdapter.prototype.pause = async function pause(reason) {
    if (this.state === 'paused') return { ok: true, alreadyPaused: true };
    if (this.state !== 'mounted') throw root.contracts.contractError('INVALID_CHILD_STATE', `Cannot pause child from state ${this.state}.`);
    const result = await this.command('pause', reason || 'mother-pause');
    this.state = 'paused';
    return result;
  };

  ChildWorldAdapter.prototype.resume = async function resume(reason) {
    if (this.state === 'mounted') return { ok: true, alreadyRunning: true };
    if (this.state !== 'paused') throw root.contracts.contractError('INVALID_CHILD_STATE', `Cannot resume child from state ${this.state}.`);
    const result = await this.command('resume', reason || 'mother-resume');
    this.state = 'mounted';
    return result;
  };

  ChildWorldAdapter.prototype.flushCheckpoint = function flushCheckpoint(reason) {
    if (!this.frame || !['mounted', 'paused', 'unmounting'].includes(this.state)) return Promise.resolve({ ok: true, skipped: true });
    return this.command('flush-checkpoint', reason || 'mother-checkpoint');
  };

  ChildWorldAdapter.prototype.deliverBattleResult = function deliverBattleResult(result) {
    if (!result || typeof result !== 'object') return Promise.reject(new Error('Battle result payload is required.'));
    return this.command('deliver-battle-result', 'mother-battle-completed', 5000, result);
  };

  ChildWorldAdapter.prototype.applyRecoveredBattleResult = function applyRecoveredBattleResult(record) {
    if (!record || typeof record !== 'object') return Promise.reject(new Error('Recovered battle record is required.'));
    return this.command('apply-recovered-battle-result', 'player-session-recovery', 15000, record);
  };

  ChildWorldAdapter.prototype.applyAudioPolicy = function applyAudioPolicy(policy) {
    if (!policy || typeof policy !== 'object') return Promise.reject(new Error('Child audio policy is required.'));
    return this.command('apply-audio-policy', 'mother-audio-policy', 5000, policy);
  };

  ChildWorldAdapter.prototype.openPauseMenu = function openPauseMenu(reason) {
    if (this.state !== 'mounted') {
      return Promise.reject(root.contracts.contractError('INVALID_CHILD_STATE', `Cannot open child menu from state ${this.state}.`));
    }
    return this.command('open-pause-menu', reason || 'mother-story-battle-menu');
  };

  ChildWorldAdapter.prototype.unmount = async function unmount(reason) {
    if (this.state === 'idle') return { ok: true, alreadyUnmounted: true };
    this.state = 'unmounting';
    try {
      if (this.frame && this.frame.contentWindow) {
        await this.command('dispose', reason || 'mother-unmount', 3000).catch(() => null);
      }
    } finally {
      this.pending.forEach((pending) => {
        global.clearTimeout(pending.timer);
        pending.reject(new Error('Child adapter unmounted.'));
      });
      this.pending.clear();
      global.removeEventListener('message', this.messageListener);
      if (this.frame) this.frame.remove();
      if (this.container) this.container.replaceChildren();
      this.frame = null;
      this.container = null;
      this.context = null;
      this.channelId = '';
      this.expectedOrigin = '';
      this.state = 'idle';
    }
    return { ok: true, state: this.state };
  };

  root.ChildWorldAdapter = ChildWorldAdapter;

  function installLocalLifecycleHarness() {
    const localHost = global.location && ['127.0.0.1', 'localhost'].includes(global.location.hostname);
    const enabled = localHost && new URLSearchParams(global.location.search).get('integrationTest') === 'child-lifecycle';
    if (!enabled) return;
    global.addEventListener('DOMContentLoaded', () => {
      const panel = document.createElement('section');
      panel.id = 'child-lifecycle-test-harness';
      panel.style.cssText = 'position:fixed;inset:8px;z-index:2147483647;background:#101418;color:#fff;padding:12px;font:14px system-ui;display:grid;grid-template-rows:auto auto 1fr;gap:8px';
      panel.innerHTML = '<button type="button" data-run-lifecycle>Avvia test lifecycle figlia</button><output data-lifecycle-status data-state="idle">Pronto</output><div data-lifecycle-mount style="min-height:0"></div>';
      document.body.appendChild(panel);
      const button = panel.querySelector('[data-run-lifecycle]');
      const status = panel.querySelector('[data-lifecycle-status]');
      const mountPoint = panel.querySelector('[data-lifecycle-mount]');
      button.addEventListener('click', async () => {
        button.disabled = true;
        status.dataset.state = 'running';
        status.textContent = 'Test in corso';
        const adapter = new ChildWorldAdapter();
        const eventBus = root.runtime.eventBus;
        let worldReady = false;
        const offReady = eventBus.on('child:world-ready', () => { worldReady = true; });
        const context = {
          audio: {}, battle: {}, cache: {}, networkCache: {}, savegame: {}, playerSession: {}, router: {}, exit: {}, events: eventBus
        };
        try {
          await adapter.mount(mountPoint, context);
          const deadline = Date.now() + 30000;
          while (!worldReady && Date.now() < deadline) await new Promise((resolve) => global.setTimeout(resolve, 50));
          if (!worldReady) throw new Error('world-ready timeout');
          await adapter.pause('local-browser-test');
          await adapter.flushCheckpoint('local-browser-test');
          await adapter.resume('local-browser-test');
          await adapter.unmount('local-browser-test');
          if (mountPoint.childElementCount !== 0 || adapter.state !== 'idle') throw new Error('unmount cleanup incomplete');
          status.dataset.state = 'passed';
          status.textContent = 'PASS: mount, world-ready, pause, checkpoint, resume, unmount';
        } catch (error) {
          await adapter.unmount('local-browser-test-failed').catch(() => null);
          status.dataset.state = 'failed';
          status.textContent = `FAIL: ${String(error && error.message || error)}`;
        } finally {
          offReady();
          button.disabled = false;
        }
      });
    }, { once: true });
  }

  installLocalLifecycleHarness();
})(window);
