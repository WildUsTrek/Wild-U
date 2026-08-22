(function installSharedAudioPort(global) {
  'use strict';

  const integration = global.UnifiedGameIntegration;
  if (!integration || !integration.runtime) throw new Error('Integration runtime must load before the shared audio port.');

  const allowedScenes = new Set(['mother-menu', 'story-world', 'mother-battle', 'story-intro']);
  let currentScene = 'mother-menu';

  function readValue(name, fallback) {
    return typeof global[name] === 'function' ? Number(global[name]()) : fallback;
  }

  function getChildPolicy() {
    const muted = !global.GameState || global.GameState.audioEnabled === false;
    return Object.freeze({
      muted,
      master: muted ? 0 : readValue('getAudioMasterVolumeValue', 1),
      effects: muted ? 0 : readValue('getAudioEffectsVolumeValue', 1),
      music: muted ? 0 : readValue('getAudioMusicVolumeValue', 1),
      voice: muted ? 0 : readValue('getAudioVoiceVolumeValue', 1)
    });
  }

  function resolveOpponent(detail) {
    const opponentId = detail && String(detail.opponentId || '');
    if (!opponentId) return typeof global.getCurrentOpponent === 'function' ? global.getCurrentOpponent() : null;
    const opponents = Array.isArray(global.OPPONENTS) ? global.OPPONENTS : [];
    return opponents.find((opponent) => opponent && opponent.id === opponentId) || null;
  }

  function transitionTo(scene, detail) {
    const normalized = String(scene || '');
    if (!allowedScenes.has(normalized)) throw new Error(`Unsupported shared audio scene: ${normalized}`);
    currentScene = normalized;
    if (!global.GameState || global.GameState.audioEnabled === false) {
      if (typeof global.stopProceduralMusic === 'function') global.stopProceduralMusic();
      return status();
    }
    if (normalized === 'mother-menu' && typeof global.startProceduralMenuMusic === 'function') {
      global.startProceduralMenuMusic({ fadeIn: 1.05 });
    } else if ((normalized === 'story-world' || normalized === 'story-intro') && typeof global.startProceduralStoryMusic === 'function') {
      global.startProceduralStoryMusic({ fadeIn: 1.05 });
    } else if (normalized === 'mother-battle' && typeof global.startProceduralBattleMusic === 'function') {
      const opponent = resolveOpponent(detail);
      if (!opponent) throw new Error('Mother battle audio requires a known opponent.');
      global.startProceduralBattleMusic(opponent, { fadeIn: 0.8 });
    }
    return status();
  }

  function status() {
    return Object.freeze({
      scene: currentScene,
      policy: getChildPolicy(),
      music: global.SassiMusic && typeof global.SassiMusic.status === 'function' ? global.SassiMusic.status() : null
    });
  }

  const port = Object.freeze({ transitionTo, getChildPolicy, status });
  integration.runtime.registry.register('shared-audio', port);

  global.addEventListener('mother-audio-settings-changed', (event) => {
    const reason = String(event && event.detail && event.detail.reason || 'mother-audio-settings-changed');
    if (reason === 'mute-toggled' && global.GameState && global.GameState.audioEnabled) {
      transitionTo(currentScene, null);
    }
    integration.runtime.eventBus.emit('audio:policy-changed', Object.freeze({
      reason,
      policy: getChildPolicy()
    }));
  });

  global.__UNIFIED_SHARED_AUDIO_PORT__ = port;
})(window);
