(function installChildFramePrelude(global) {
  'use strict';

  const channelMeta = document.querySelector('meta[name="unified-game-channel"]');
  const parentOriginMeta = document.querySelector('meta[name="unified-game-parent-origin"]');
  const channelId = channelMeta ? channelMeta.content : '';
  const parentOrigin = parentOriginMeta ? parentOriginMeta.content : '';
  if (!channelId || !parentOrigin || parentOrigin === 'null' || global.parent === global) return;

  const native = Object.freeze({
    requestAnimationFrame: global.requestAnimationFrame.bind(global),
    cancelAnimationFrame: global.cancelAnimationFrame.bind(global),
    setTimeout: global.setTimeout.bind(global),
    clearTimeout: global.clearTimeout.bind(global),
    setInterval: global.setInterval.bind(global),
    clearInterval: global.clearInterval.bind(global),
    AudioContext: global.AudioContext,
    webkitAudioContext: global.webkitAudioContext,
    Worker: global.Worker
  });
  const state = {
    paused: false,
    disposed: false,
    nextToken: 1,
    raf: new Map(),
    timeouts: new Map(),
    intervals: new Map(),
    workers: new Set(),
    audioContexts: new Set()
  };

  function nowMs() {
    return global.performance && typeof global.performance.now === 'function'
      ? global.performance.now()
      : Date.now();
  }

  function scheduleAnimationFrame(token, entry) {
    if (!entry || entry.nativeId !== null || state.paused || state.disposed) return;
    entry.nativeId = native.requestAnimationFrame((time) => {
      const current = state.raf.get(token);
      if (!current || state.disposed) return;
      current.nativeId = null;
      if (state.paused) return;
      state.raf.delete(token);
      current.callback(time);
    });
  }

  function scheduleTimeout(token, entry) {
    if (!entry || entry.nativeId !== null || state.paused || state.disposed) return;
    entry.startedAt = nowMs();
    entry.nativeId = native.setTimeout(() => {
      const current = state.timeouts.get(token);
      if (!current || state.disposed) return;
      current.nativeId = null;
      if (state.paused) return;
      state.timeouts.delete(token);
      current.callback.apply(global, current.args);
    }, entry.remaining);
  }

  function scheduleInterval(token, entry) {
    if (!entry || entry.nativeId !== null || state.paused || state.disposed) return;
    entry.nativeId = native.setInterval(() => {
      if (!state.paused && !state.disposed) entry.callback.apply(global, entry.args);
    }, entry.delay);
  }

  function suspendSchedulers() {
    state.raf.forEach((entry) => {
      if (entry.nativeId !== null) native.cancelAnimationFrame(entry.nativeId);
      entry.nativeId = null;
    });
    const suspendedAt = nowMs();
    state.timeouts.forEach((entry) => {
      if (entry.nativeId !== null) {
        native.clearTimeout(entry.nativeId);
        entry.remaining = Math.max(0, entry.remaining - Math.max(0, suspendedAt - entry.startedAt));
      }
      entry.nativeId = null;
    });
    state.intervals.forEach((entry) => {
      if (entry.nativeId !== null) native.clearInterval(entry.nativeId);
      entry.nativeId = null;
    });
  }

  function resumeSchedulers() {
    state.raf.forEach((entry, token) => scheduleAnimationFrame(token, entry));
    state.timeouts.forEach((entry, token) => scheduleTimeout(token, entry));
    state.intervals.forEach((entry, token) => scheduleInterval(token, entry));
  }

  function schedulerStatus() {
    const activeCount = (entries) => Array.from(entries.values()).filter((entry) => entry.nativeId !== null).length;
    return Object.freeze({
      paused: state.paused,
      disposed: state.disposed,
      scheduled: Object.freeze({
        animationFrames: state.raf.size,
        timeouts: state.timeouts.size,
        intervals: state.intervals.size
      }),
      nativeActive: Object.freeze({
        animationFrames: activeCount(state.raf),
        timeouts: activeCount(state.timeouts),
        intervals: activeCount(state.intervals)
      }),
      audioContexts: Object.freeze(Array.from(state.audioContexts).map((context) => String(context && context.state || 'unknown')))
    });
  }

  function notify(type, payload, requestId) {
    global.parent.postMessage({ channelId, type, payload: payload || null, requestId: requestId || '' }, parentOrigin);
  }

  global.requestAnimationFrame = function managedRequestAnimationFrame(callback) {
    const token = state.nextToken++;
    const entry = { callback, nativeId: null };
    state.raf.set(token, entry);
    scheduleAnimationFrame(token, entry);
    return token;
  };
  global.cancelAnimationFrame = function managedCancelAnimationFrame(token) {
    const entry = state.raf.get(token);
    if (entry && entry.nativeId !== null) native.cancelAnimationFrame(entry.nativeId);
    else if (!entry) native.cancelAnimationFrame(token);
    state.raf.delete(token);
  };

  global.setTimeout = function managedSetTimeout(callback, delay) {
    if (typeof callback !== 'function') return native.setTimeout(callback, delay);
    const args = Array.prototype.slice.call(arguments, 2);
    const token = state.nextToken++;
    const entry = {
      callback,
      args,
      remaining: Math.max(0, Number(delay) || 0),
      startedAt: 0,
      nativeId: null
    };
    state.timeouts.set(token, entry);
    scheduleTimeout(token, entry);
    return token;
  };
  global.clearTimeout = function managedClearTimeout(token) {
    const entry = state.timeouts.get(token);
    if (entry && entry.nativeId !== null) native.clearTimeout(entry.nativeId);
    else if (!entry) native.clearTimeout(token);
    state.timeouts.delete(token);
  };

  global.setInterval = function managedSetInterval(callback, delay) {
    if (typeof callback !== 'function') return native.setInterval(callback, delay);
    const args = Array.prototype.slice.call(arguments, 2);
    const token = state.nextToken++;
    const entry = { callback, args, delay: Math.max(0, Number(delay) || 0), nativeId: null };
    state.intervals.set(token, entry);
    scheduleInterval(token, entry);
    return token;
  };
  global.clearInterval = function managedClearInterval(token) {
    const entry = state.intervals.get(token);
    if (entry && entry.nativeId !== null) native.clearInterval(entry.nativeId);
    else if (!entry) native.clearInterval(token);
    state.intervals.delete(token);
  };

  function installTrackedConstructor(name, NativeConstructor, collection, terminateMethod) {
    if (typeof NativeConstructor !== 'function') return;
    function TrackedConstructor() {
      const instance = Reflect.construct(NativeConstructor, Array.from(arguments), NativeConstructor);
      collection.add(instance);
      if (terminateMethod && typeof instance[terminateMethod] === 'function') {
        const original = instance[terminateMethod].bind(instance);
        instance[terminateMethod] = function trackedTermination() {
          collection.delete(instance);
          return original();
        };
      }
      return instance;
    }
    TrackedConstructor.prototype = NativeConstructor.prototype;
    global[name] = TrackedConstructor;
  }
  installTrackedConstructor('AudioContext', native.AudioContext, state.audioContexts, 'close');
  installTrackedConstructor('webkitAudioContext', native.webkitAudioContext, state.audioContexts, 'close');
  installTrackedConstructor('Worker', native.Worker, state.workers, 'terminate');

  const blockedInputEvents = ['keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel'];
  blockedInputEvents.forEach((eventName) => {
    global.addEventListener(eventName, (event) => {
      if (!state.paused) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, passive: false });
  });

  async function callLifecycle(method, reason) {
    const port = global.__UNIFIED_CHILD_LIFECYCLE_PORT__;
    if (!port || typeof port[method] !== 'function') return { ok: true, legacyPort: false };
    return Promise.resolve(port[method](reason));
  }

  async function suspendAudio() {
    const port = global.__UNIFIED_CHILD_AUDIO_PORT__;
    if (port && typeof port.suspend === 'function') return Promise.resolve(port.suspend());
    return Promise.all(Array.from(state.audioContexts).map((context) => {
      try { return context.state === 'running' && context.suspend ? context.suspend() : null; } catch (error) { return null; }
    }));
  }

  async function resumeAudio() {
    const port = global.__UNIFIED_CHILD_AUDIO_PORT__;
    if (port && typeof port.resume === 'function') return Promise.resolve(port.resume());
    return Promise.all(Array.from(state.audioContexts).map((context) => {
      try { return context.state === 'suspended' && context.resume ? context.resume() : null; } catch (error) { return null; }
    }));
  }

  async function pause(reason) {
    if (state.paused) return Object.assign({ ok: true, alreadyPaused: true }, schedulerStatus());
    state.paused = true;
    suspendSchedulers();
    document.documentElement.dataset.unifiedChildPaused = 'true';
    await callLifecycle('pause', reason);
    await suspendAudio();
    return Object.assign({ ok: true }, schedulerStatus());
  }

  async function resume(reason) {
    if (!state.paused) return Object.assign({ ok: true, alreadyRunning: true }, schedulerStatus());
    await callLifecycle('resume', reason);
    await resumeAudio();
    state.paused = false;
    document.documentElement.dataset.unifiedChildPaused = 'false';
    resumeSchedulers();
    return Object.assign({ ok: true }, schedulerStatus());
  }

  async function dispose(reason) {
    if (state.disposed) return { ok: true, alreadyDisposed: true };
    await callLifecycle('flushCheckpoint', reason);
    await callLifecycle('dispose', reason);
    state.disposed = true;
    state.raf.forEach((entry) => { if (entry.nativeId !== null) native.cancelAnimationFrame(entry.nativeId); });
    state.timeouts.forEach((entry) => { if (entry.nativeId !== null) native.clearTimeout(entry.nativeId); });
    state.intervals.forEach((entry) => { if (entry.nativeId !== null) native.clearInterval(entry.nativeId); });
    state.raf.clear();
    state.timeouts.clear();
    state.intervals.clear();
    state.workers.forEach((worker) => { try { worker.terminate(); } catch (error) {} });
    state.audioContexts.forEach((context) => { try { if (context.close) context.close(); } catch (error) {} });
    state.workers.clear();
    state.audioContexts.clear();
    return { ok: true, disposed: true };
  }

  global.__UNIFIED_CHILD_NOTIFY__ = function childNotify(type, payload) {
    notify(`child:${String(type || 'event')}`, payload || null);
  };

  global.__UNIFIED_CHILD_SCHEDULER_PORT__ = Object.freeze({ status: schedulerStatus });

  global.__UNIFIED_CHILD_UI_PORT__ = Object.freeze({
    openPauseMenu(reason) {
      const trigger = global.document.querySelector('button[data-hud-action="pause-menu"][aria-label="Apri menu partita"]');
      if (!trigger) throw new Error('Child pause menu trigger is not available.');
      trigger.click();
      const dialog = global.document.querySelector('[role="dialog"][aria-label="Menu pausa PERLA1"]');
      const visible = !!(dialog && dialog.classList.contains('visible') && dialog.getAttribute('aria-hidden') === 'false');
      if (!visible) throw new Error('Child pause menu did not become visible.');
      return { ok: true, visible: true, reason: String(reason || 'mother-story-battle-menu') };
    }
  });

  global.addEventListener('message', async (event) => {
    const message = event.data;
    if (event.source !== global.parent || event.origin !== parentOrigin || !message || message.channelId !== channelId || !message.command) return;
    try {
      let result;
      if (message.command === 'pause') result = await pause(message.reason);
      else if (message.command === 'resume') result = await resume(message.reason);
      else if (message.command === 'flush-checkpoint') result = await callLifecycle('flushCheckpoint', message.reason);
      else if (message.command === 'deliver-battle-result') {
        const battlePort = global.__UNIFIED_CHILD_BATTLE_PORT__;
        if (!battlePort || typeof battlePort.deliverResult !== 'function') throw new Error('Child battle result port is not available.');
        result = await battlePort.deliverResult(message.payload);
      }
      else if (message.command === 'apply-recovered-battle-result') {
        const battlePort = global.__UNIFIED_CHILD_BATTLE_PORT__;
        if (!battlePort || typeof battlePort.applyRecoveredResult !== 'function') throw new Error('Child recovered-result port is not available.');
        result = await battlePort.applyRecoveredResult(message.payload);
      }
      else if (message.command === 'apply-audio-policy') {
        const audioPort = global.__UNIFIED_CHILD_AUDIO_PORT__;
        if (!audioPort || typeof audioPort.applyPolicy !== 'function') throw new Error('Child audio policy port is not available.');
        result = await audioPort.applyPolicy(message.payload);
      }
      else if (message.command === 'open-pause-menu') {
        const uiPort = global.__UNIFIED_CHILD_UI_PORT__;
        if (!uiPort || typeof uiPort.openPauseMenu !== 'function') throw new Error('Child UI port is not available.');
        result = await uiPort.openPauseMenu(message.reason || 'mother-story-battle-menu');
      }
      else if (message.command === 'dispose') result = await dispose(message.reason);
      else throw new Error(`Unknown child lifecycle command: ${message.command}`);
      notify('child:lifecycle-ack', result, message.requestId);
    } catch (error) {
      notify('child:lifecycle-error', { message: String(error && error.message || error) }, message.requestId);
    }
  });

  global.addEventListener('DOMContentLoaded', () => notify('child:frame-loaded', { managed: true }), { once: true });
})(window);
