(function installAudioBridge(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;

  function AudioBridge(registry, eventBus, flags) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.flags = flags;
    this.sceneStack = ['mother-menu'];
  }

  AudioBridge.prototype.requirePort = function requirePort() {
    const audioPort = this.registry.require('shared-audio');
    if (typeof audioPort.transitionTo !== 'function') {
      throw root.contracts.contractError('INVALID_AUDIO_PORT', 'Shared audio port does not implement transitionTo.');
    }
    return audioPort;
  };

  AudioBridge.prototype.transitionTo = function transitionTo(scene, detail) {
    const normalized = root.contracts.assertId(scene, 'audioScene');
    if (!this.flags.enableUnifiedAudio) {
      throw root.contracts.contractError('FEATURE_DISABLED', 'Unified audio is disabled.');
    }
    const audioPort = this.requirePort();
    if (this.sceneStack[this.sceneStack.length - 1] !== normalized) this.sceneStack.push(normalized);
    const status = audioPort.transitionTo(normalized, detail || null);
    this.eventBus.emit('audio:scene-changed', Object.freeze({ scene: normalized, status }));
    return status;
  };

  AudioBridge.prototype.restorePreviousScene = function restorePreviousScene(detail) {
    if (!this.flags.enableUnifiedAudio) return this.sceneStack[this.sceneStack.length - 1];
    if (this.sceneStack.length > 1) this.sceneStack.pop();
    const scene = this.sceneStack[this.sceneStack.length - 1];
    const status = this.requirePort().transitionTo(scene, detail || null);
    this.eventBus.emit('audio:scene-changed', Object.freeze({ scene, restored: true, status }));
    return status;
  };

  AudioBridge.prototype.resetTo = function resetTo(scene, detail) {
    const normalized = root.contracts.assertId(scene, 'audioScene');
    if (!this.flags.enableUnifiedAudio) return normalized;
    this.sceneStack = [normalized];
    const status = this.requirePort().transitionTo(normalized, detail || null);
    this.eventBus.emit('audio:scene-changed', Object.freeze({ scene: normalized, reset: true, status }));
    return status;
  };

  AudioBridge.prototype.getChildPolicy = function getChildPolicy() {
    if (!this.flags.enableUnifiedAudio) return Object.freeze({ muted: false, master: 1, effects: 1, music: 1, voice: 1 });
    const port = this.requirePort();
    if (typeof port.getChildPolicy !== 'function') {
      throw root.contracts.contractError('INVALID_AUDIO_PORT', 'Shared audio port does not implement getChildPolicy.');
    }
    return port.getChildPolicy();
  };

  AudioBridge.prototype.status = function status() {
    const port = this.flags.enableUnifiedAudio ? this.requirePort() : null;
    return Object.freeze({
      enabled: !!this.flags.enableUnifiedAudio,
      sceneStack: this.sceneStack.slice(),
      port: port && typeof port.status === 'function' ? port.status() : null
    });
  };

  root.AudioBridge = AudioBridge;
})(window);
