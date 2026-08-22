/*
  Sfida dei Sassi V22 - Direct Banana, balanced SFX, delayed epic fanfare.
  Regola voce: lo sfidante CPU parla solo dopo le proprie azioni con il suo BANANA intero.
  Stati vocali ammessi: action, win, lose. Niente thinking, niente compositore sillabe, niente fallback sintetici.
*/

window.AudioKit = {
  ctx: null,
  master: null,
  compressor: null,
  unlocked: false,
  unlockInstalled: false,
  unlockPromise: null,
  lastResultFanfareAt: 0,
  lastRevealFanfareAt: 0,
  lastGameOverFanfareAt: 0,
  lastRoundJingleAt: 0,
  voiceAudio: null,
  voiceTimer: null,
  voiceBusyUntil: 0,
  voiceSerial: 0,
  lastVoiceKey: '',
  lastVoiceAt: 0,
  lastClipPath: '',
  fanfareAudio: null,
  lifecycleInstalled: false,
  userStarted: false,
  wasRunningBeforeHidden: false,
  hiddenAt: 0,
  lastUnlockState: 'not-requested',
  lastUnlockError: '',
  startGesturePrimed: false,
  startGestureType: '',
  htmlAudioUnlocked: false,
  htmlUnlockPromise: null,
  htmlUnlockAudio: null,
  lastHtmlUnlockState: 'not-requested',
  lastHtmlUnlockError: ''
};

window.AUDIO_SETTINGS_STORAGE_KEY = 'sfida_sassi_audio_settings_v37_12f';
window.AUDIO_APP_OUTPUT_BOOST = 1.20;
window.AUDIO_MUSIC_OUTPUT_BOOST = 1.20;
window.AUDIO_FANFARE_JINGLE_BOOST = 1.20;
// V37.14R: boost richiesto sopra V37.14Q.
// GLOBAL_OUTPUT: +20% su uscita app reale; MUSIC_GAIN: ulteriore +20% sulla musica.
// Musica finale a pari slider ≈ 1.20 * 1.20 = +44%.
window.AUDIO_GLOBAL_OUTPUT_GAIN = 1.20;
window.AUDIO_DIRECT_MUSIC_GAIN = 1.20;
// V37.14Q: niente makeup/limiter finale aggiuntivo. Musica diretta fuori dal compressor globale.
window.DEFAULT_AUDIO_SETTINGS = Object.freeze({ master: 0.72, voice: 0.31, effects: 0.40, music: 0.80 });

function clampAudio(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

window.loadAudioSettings = function loadAudioSettings() {
  const defaults = window.DEFAULT_AUDIO_SETTINGS || { master: 0.72, voice: 0.31, effects: 0.40, music: 0.80 };
  let master = defaults.master;
  let voice = defaults.voice;
  let effects = defaults.effects;
  let music = defaults.music;
  try {
    const raw = window.localStorage ? window.localStorage.getItem(window.AUDIO_SETTINGS_STORAGE_KEY) : '';
    if (raw) {
      const parsed = JSON.parse(raw);
      master = clampAudio(parsed.master, defaults.master);
      voice = clampAudio(parsed.voice, defaults.voice);
      effects = clampAudio(parsed.effects, defaults.effects);
      music = clampAudio(parsed.music, defaults.music);
      if (parsed.master === undefined && parsed.voice === undefined) {
        master = defaults.master;
        voice = defaults.voice;
        effects = clampAudio(parsed.effects, defaults.effects);
        music = clampAudio(parsed.music, defaults.music);
      }
      // V37.14M: migra il vecchio default musiche 65% al nuovo default 80%.
      // Se l'utente aveva salvato proprio il vecchio default storico, lo portiamo al nuovo valore.
      if (!parsed.v37_14mMusic80 && Math.abs(Number(parsed.music) - 0.65) < 0.001) {
        music = defaults.music;
        try {
          if (window.localStorage) {
            window.localStorage.setItem(window.AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(Object.assign({}, parsed, {
              music,
              v37_14mMusic80: true,
              migratedAt: Date.now()
            })));
          }
        } catch (err) {}
      }
    }
  } catch (err) {}
  GameState.audioVolume = master;
  GameState.audioMasterVolume = master;
  GameState.audioVoiceVolume = voice;
  GameState.audioEffectsVolume = effects;
  GameState.audioMusicVolume = music;
  return { master, voice, effects, music };
};

window.saveAudioSettings = function saveAudioSettings() {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(window.AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({
      master: clampAudio(GameState.audioMasterVolume, 0.72),
      voice: clampAudio(GameState.audioVoiceVolume, 0.31),
      effects: clampAudio(GameState.audioEffectsVolume, 0.40),
      music: clampAudio(GameState.audioMusicVolume, 0.80),
      v37_14mMusic80: true,
      updatedAt: Date.now()
    }));
  } catch (err) {}
};

window.getAudioVolumeValue = function getAudioVolumeValue() {
  return clampAudio(GameState.audioMasterVolume, clampAudio(GameState.audioVolume, 0.72));
};

window.getAudioMasterVolumeValue = function getAudioMasterVolumeValue() {
  return clampAudio(GameState.audioMasterVolume, getAudioVolumeValue());
};

window.getAudioVoiceVolumeValue = function getAudioVoiceVolumeValue() {
  return clampAudio(GameState.audioVoiceVolume, 0.31);
};

window.getAudioEffectsVolumeValue = function getAudioEffectsVolumeValue() {
  return clampAudio(GameState.audioEffectsVolume, 0.40);
};

window.getAudioMusicVolumeValue = function getAudioMusicVolumeValue() {
  return clampAudio(GameState.audioMusicVolume, 0.80);
};

window.getGlobalOutputGainValue = function getGlobalOutputGainValue() {
  return Math.max(1, Math.min(1.35, Number(window.AUDIO_GLOBAL_OUTPUT_GAIN) || 1.20));
};

window.getDirectMusicGainValue = function getDirectMusicGainValue() {
  return Math.max(1, Math.min(1.35, Number(window.AUDIO_DIRECT_MUSIC_GAIN) || 1.20));
};

window.getEffectiveEffectsVolumeValue = function getEffectiveEffectsVolumeValue() {
  return Math.max(0, Math.min(1.25, getAudioMasterVolumeValue() * getAudioEffectsVolumeValue()));
};

window.getEffectiveVoiceVolumeValue = function getEffectiveVoiceVolumeValue() {
  return Math.max(0, Math.min(1, getAudioMasterVolumeValue() * getAudioVoiceVolumeValue() * 0.72));
};

window.getEffectiveMusicVolumeValue = function getEffectiveMusicVolumeValue() {
  return Math.max(0, Math.min(3.50, getAudioMasterVolumeValue() * getAudioMusicVolumeValue() * 1.45 * (window.AUDIO_APP_OUTPUT_BOOST || 1.20) * (window.AUDIO_MUSIC_OUTPUT_BOOST || 1.20) * getGlobalOutputGainValue() * getDirectMusicGainValue()));
};

window.getMusicVolumeValue = function getMusicVolumeValue() {
  return getEffectiveMusicVolumeValue();
};

window.initAudio = function initAudio() {
  if (!GameState.audioEnabled) return false;
  if (AudioKit.ctx && AudioKit.master) return true;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return false;

  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    master.gain.value = Math.min(1.62, getEffectiveEffectsVolumeValue() * 1.18 * getGlobalOutputGainValue());
    compressor.threshold.setValueAtTime(-8, ctx.currentTime);
    compressor.knee.setValueAtTime(16, ctx.currentTime);
    compressor.ratio.setValueAtTime(1.55, ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);
    master.connect(compressor);
    compressor.connect(ctx.destination);
    AudioKit.ctx = ctx;
    AudioKit.master = master;
    AudioKit.compressor = compressor;
    AudioKit.unlocked = ctx.state === 'running';
    return true;
  } catch (err) {
    AudioKit.ctx = null;
    AudioKit.master = null;
    AudioKit.compressor = null;
    AudioKit.unlocked = false;
    return false;
  }
};

function primeSilentAudio() {
  if (!AudioKit.ctx || !AudioKit.master) return;
  try {
    const ctx = AudioKit.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.035);
    osc.frequency.setValueAtTime(220, now);
    osc.connect(gain);
    gain.connect(AudioKit.master);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {}
}

function createSilentWavUrl() {
  const bytes = new Uint8Array(45);
  const view = new DataView(bytes.buffer);
  const writeText = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 37, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeText(36, 'data');
  view.setUint32(40, 1, true);
  bytes[44] = 128;
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

window.primeHtmlAudioElement = function primeHtmlAudioElement() {
  if (AudioKit.htmlAudioUnlocked) return Promise.resolve(true);
  if (AudioKit.htmlUnlockPromise) return AudioKit.htmlUnlockPromise;
  try {
    const audio = AudioKit.htmlUnlockAudio || new Audio();
    AudioKit.htmlUnlockAudio = audio;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.setAttribute('playsinline', '');
    audio.volume = 0.0001;
    if (!audio.src) {
      audio.src = createSilentWavUrl();
      audio.dataset.sassiObjectUrl = audio.src;
    }
    AudioKit.lastHtmlUnlockState = 'playing';
    AudioKit.lastHtmlUnlockError = '';
    const result = audio.play();
    AudioKit.htmlUnlockPromise = Promise.resolve(result)
      .then(() => {
        AudioKit.htmlAudioUnlocked = true;
        AudioKit.lastHtmlUnlockState = 'unlocked';
        try { audio.pause(); } catch (err) {}
        try { audio.currentTime = 0; } catch (err) {}
        return true;
      })
      .catch((error) => {
        AudioKit.htmlAudioUnlocked = false;
        AudioKit.lastHtmlUnlockState = 'blocked';
        AudioKit.lastHtmlUnlockError = String(error && error.message || error || 'html-audio-play-failed').slice(0, 180);
        return false;
      })
      .finally(() => { AudioKit.htmlUnlockPromise = null; });
    return AudioKit.htmlUnlockPromise;
  } catch (error) {
    AudioKit.htmlAudioUnlocked = false;
    AudioKit.lastHtmlUnlockState = 'error';
    AudioKit.lastHtmlUnlockError = String(error && error.message || error || 'html-audio-init-failed').slice(0, 180);
    return Promise.resolve(false);
  }
};

window.markAudioUserStarted = function markAudioUserStarted() {
  AudioKit.userStarted = true;
  AudioKit.wasRunningBeforeHidden = true;
};

window.resumeAudio = function resumeAudio() {
  if (!GameState.audioEnabled) return null;
  primeHtmlAudioElement();
  if (!initAudio()) return null;
  if (!AudioKit.ctx) return null;

  if (AudioKit.ctx.state === 'running') {
    AudioKit.unlocked = true;
    AudioKit.lastUnlockState = 'running';
    AudioKit.lastUnlockError = '';
    primeSilentAudio();
    return Promise.resolve(true);
  }

  if (!AudioKit.unlockPromise) {
    AudioKit.lastUnlockState = 'resuming';
    AudioKit.lastUnlockError = '';
    // Accodare un segnale quasi silenzioso prima del resume mantiene il primo
    // quantum audio dentro il gesto utente anche su WebKit/iOS.
    primeSilentAudio();
    AudioKit.unlockPromise = AudioKit.ctx.resume()
      .then(() => {
        AudioKit.unlocked = AudioKit.ctx && AudioKit.ctx.state === 'running';
        AudioKit.lastUnlockState = AudioKit.ctx ? AudioKit.ctx.state : 'missing';
        primeSilentAudio();
        document.body.classList.toggle('audio-unlocked', AudioKit.unlocked);
        syncAudioVolumeControls();
        return AudioKit.unlocked;
      })
      .catch((error) => {
        AudioKit.unlocked = false;
        AudioKit.lastUnlockState = AudioKit.ctx ? AudioKit.ctx.state : 'error';
        AudioKit.lastUnlockError = String(error && error.message || error || 'resume-failed').slice(0, 180);
        return false;
      })
      .finally(() => { AudioKit.unlockPromise = null; });
  }
  return AudioKit.unlockPromise;
};


window.installAudioLifecycleHandlers = function installAudioLifecycleHandlers() {
  if (AudioKit.lifecycleInstalled) return;
  AudioKit.lifecycleInstalled = true;

  const onHidden = () => {
    try {
      AudioKit.hiddenAt = Date.now();
      AudioKit.wasRunningBeforeHidden = !!(AudioKit.ctx && AudioKit.ctx.state === 'running');
      if (window.SassiMusic && typeof SassiMusic.fadeOut === 'function') {
        SassiMusic.fadeOut(0.18, false);
      }
      if (AudioKit.ctx && AudioKit.ctx.state === 'running') {
        AudioKit.ctx.suspend().catch(() => {});
      }
    } catch (err) {}
  };

  const onVisible = () => {
    try {
      if (!GameState.audioEnabled) return;
      // V37.14Z: non tentare resume pre-Start. Su browser mobile può creare unlockPromise bloccante.
      if (!AudioKit.userStarted && !AudioKit.unlocked && !AudioKit.wasRunningBeforeHidden) return;
      const p = resumeAudio();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          applyAudioVolume();
          if (window.SassiMusic && typeof SassiMusic.syncFromScreen === 'function') {
            const active = document.querySelector('.screen.active');
            if (active && active.id !== 'boot-screen') SassiMusic.syncFromScreen(active.id);
          }
        }).catch(() => {});
      }
    } catch (err) {}
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onHidden();
    else onVisible();
  }, { passive: true });

  window.addEventListener('pagehide', onHidden, { passive: true });
  window.addEventListener('pageshow', () => {
    if (!document.hidden) onVisible();
  }, { passive: true });
};


window.installAudioUnlockListeners = function installAudioUnlockListeners() {
  if (AudioKit.unlockInstalled) return;
  AudioKit.unlockInstalled = true;
  if (typeof window.installAudioLifecycleHandlers === 'function') window.installAudioLifecycleHandlers();
  const unlock = (event) => {
    if (!GameState.audioEnabled) return;
    const active = document.querySelector('.screen.active');
    const startButton = event && event.target && event.target.closest ? event.target.closest('#boot-start-btn') : null;
    if (!AudioKit.userStarted && active && active.id === 'boot-screen') {
      if (!startButton) return;
      AudioKit.startGesturePrimed = true;
      AudioKit.startGestureType = String(event.type || 'start');
      markAudioUserStarted();
      loadAudioSettings();
    }
    resumeAudio();
    if (startButton && typeof startProceduralMenuMusic === 'function') {
      const status = window.SassiMusic && typeof SassiMusic.status === 'function' ? SassiMusic.status() : null;
      if (!status || status.mode !== 'menu' || !status.schedulerActive) startProceduralMenuMusic({ fadeIn: 1.25 });
    }
  };
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, unlock, { capture: true, passive: true });
  });
};

window.applyAudioVolume = function applyAudioVolume() {
  if (AudioKit.master) AudioKit.master.gain.value = Math.min(1.62, getEffectiveEffectsVolumeValue() * 1.18 * getGlobalOutputGainValue());
  if (AudioKit.voiceAudio) AudioKit.voiceAudio.volume = getVoiceVolume();
  if (AudioKit.fanfareAudio) AudioKit.fanfareAudio.volume = getFanfareVolume();
  if (window.SassiMusic && typeof SassiMusic.applyVolume === 'function') SassiMusic.applyVolume();
  window.dispatchEvent(new CustomEvent('mother-audio-settings-changed', { detail: {
    reason: 'volume-applied',
    enabled: !!GameState.audioEnabled,
    master: getAudioMasterVolumeValue(),
    voice: getAudioVoiceVolumeValue(),
    effects: getAudioEffectsVolumeValue(),
    music: getAudioMusicVolumeValue()
  } }));
};

function updateVolumeSlider(selector, labelSelector, value) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  document.querySelectorAll(selector).forEach((slider) => {
    if (Number(slider.value) !== percent) slider.value = String(percent);
  });
  document.querySelectorAll(labelSelector).forEach((label) => {
    label.textContent = `${percent}%`;
  });
}

window.syncAudioVolumeControls = function syncAudioVolumeControls() {
  updateVolumeSlider('[data-audio-volume], [data-audio-master-volume]', '[data-audio-volume-label], [data-audio-master-volume-label]', getAudioMasterVolumeValue());
  updateVolumeSlider('[data-audio-voice-volume]', '[data-audio-voice-volume-label]', getAudioVoiceVolumeValue());
  updateVolumeSlider('[data-audio-effects-volume]', '[data-audio-effects-volume-label]', getAudioEffectsVolumeValue());
  updateVolumeSlider('[data-audio-music-volume]', '[data-audio-music-volume-label]', getAudioMusicVolumeValue());
};

function setAudioChannel(channel, value, options) {
  const defaults = window.DEFAULT_AUDIO_SETTINGS || { master: 0.72, voice: 0.31, effects: 0.40, music: 0.80 };
  const clamped = clampAudio(value, defaults[channel] || 0.85);
  if (channel === 'master') {
    GameState.audioMasterVolume = clamped;
    GameState.audioVolume = clamped;
  } else if (channel === 'voice') {
    GameState.audioVoiceVolume = clamped;
  } else if (channel === 'effects') {
    GameState.audioEffectsVolume = clamped;
  } else if (channel === 'music') {
    GameState.audioMusicVolume = clamped;
  }
  if (clamped > 0 && !GameState.audioEnabled) GameState.audioEnabled = true;
  applyAudioVolume();
  syncAudioVolumeControls();
  saveAudioSettings();
  if (GameState.audioEnabled) resumeAudio();
  if (channel === 'music' || channel === 'master') {
    if (GameState.audioEnabled && window.SassiMusic && typeof SassiMusic.syncFromScreen === 'function') {
      const active = document.querySelector('.screen.active');
      if (active && active.id !== 'boot-screen') SassiMusic.syncFromScreen(active.id);
    }
  }
  if (!(options && options.silent)) renderAudioButton();
}

window.setAudioMasterVolume = function setAudioMasterVolume(value, options) { setAudioChannel('master', value, options); };
window.setAudioVoiceVolume = function setAudioVoiceVolume(value, options) { setAudioChannel('voice', value, options); };
window.setAudioEffectsVolume = function setAudioEffectsVolume(value, options) { setAudioChannel('effects', value, options); };
window.setMusicVolume = function setMusicVolume(value, options) { setAudioChannel('music', value, options); };

window.setAudioVolume = function setAudioVolume(value, options) {
  setAudioMasterVolume(value, options);
};

window.resetAudioVolumes = function resetAudioVolumes() {
  const defaults = window.DEFAULT_AUDIO_SETTINGS || { master: 0.72, voice: 0.31, effects: 0.40, music: 0.80 };
  GameState.audioMasterVolume = defaults.master;
  GameState.audioVolume = defaults.master;
  GameState.audioVoiceVolume = defaults.voice;
  GameState.audioEffectsVolume = defaults.effects;
  GameState.audioMusicVolume = defaults.music;
  saveAudioSettings();
  applyAudioVolume();
  syncAudioVolumeControls();
  renderAudioButton();
};

window.openVolumeModal = function openVolumeModal() {
  const modal = document.getElementById('volume-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('volume-modal-open');
  document.querySelectorAll('[data-volume-toggle]').forEach((btn) => btn.setAttribute('aria-expanded', 'true'));
  syncAudioVolumeControls();
  if (GameState.audioEnabled) resumeAudio();
};

window.closeVolumeModal = function closeVolumeModal() {
  const modal = document.getElementById('volume-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('volume-modal-open');
  document.querySelectorAll('[data-volume-toggle]').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
};

// Compatibility alias for older callers.
window.closeVolumePanels = function closeVolumePanels() {
  closeVolumeModal();
};

window.bindAdvancedVolumeControls = function bindAdvancedVolumeControls() {
  document.querySelectorAll('[data-volume-toggle]').forEach((btn) => {
    if (btn.dataset.boundVolumeToggle === '1') return;
    btn.dataset.boundVolumeToggle = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const modal = document.getElementById('volume-modal');
      const open = !(modal && modal.classList.contains('open'));
      if (open) openVolumeModal();
      else closeVolumeModal();
      playSfx('click');
    });
  });

  document.querySelectorAll('[data-volume-close]').forEach((btn) => {
    if (btn.dataset.boundVolumeClose === '1') return;
    btn.dataset.boundVolumeClose = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeVolumeModal();
      playSfx('click');
    });
  });

  const bindings = [
    ['[data-audio-master-volume]', setAudioMasterVolume, 'boundAudioMaster'],
    ['[data-audio-voice-volume]', setAudioVoiceVolume, 'boundAudioVoice'],
    ['[data-audio-effects-volume]', setAudioEffectsVolume, 'boundAudioEffects'],
    ['[data-audio-music-volume]', setMusicVolume, 'boundAudioMusic']
  ];

  bindings.forEach(([selector, setter, flag]) => {
    document.querySelectorAll(selector).forEach((slider) => {
      if (slider.dataset[flag] === '1') return;
      slider.dataset[flag] = '1';
      slider.addEventListener('input', () => setter(Number(slider.value) / 100, { fromControl: slider }));
    });
  });

  document.querySelectorAll('[data-audio-reset]').forEach((btn) => {
    if (btn.dataset.boundAudioReset === '1') return;
    btn.dataset.boundAudioReset = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      resetAudioVolumes();
      playSfx('click');
    });
  });

  if (!document.body.dataset.boundVolumeEscape) {
    document.body.dataset.boundVolumeEscape = '1';
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeVolumeModal();
    });
  }
};

window.renderAudioButton = function renderAudioButton() {
  const audioButtons = [document.getElementById('audio-btn'), document.getElementById('audio-btn-game')].filter(Boolean);
  const supported = !!(window.AudioContext || window.webkitAudioContext);
  syncAudioVolumeControls();
  audioButtons.forEach((audioBtn) => {
    if (!supported) {
      audioBtn.innerText = 'Audio: non supportato';
      audioBtn.disabled = true;
    } else {
      const vol = Math.round(getAudioMasterVolumeValue() * 100);
      audioBtn.innerText = GameState.audioEnabled ? '🔊' : '🔇';
      audioBtn.setAttribute('aria-label', GameState.audioEnabled ? `Audio attivo, volume ${vol}%` : 'Audio disattivato');
      audioBtn.title = GameState.audioEnabled ? `Audio ${vol}%` : 'Audio disattivato';
      audioBtn.disabled = false;
    }
  });
};

window.toggleAudio = function toggleAudio() {
  GameState.audioEnabled = !GameState.audioEnabled;
  if (!GameState.audioEnabled) {
    stopOpponentVoice();
    if (typeof stopProceduralMusic === 'function') stopProceduralMusic();
  }
  if (GameState.audioEnabled) {
    resumeAudio();
    if (typeof SassiMusic !== 'undefined' && SassiMusic && typeof SassiMusic.syncFromScreen === 'function') {
      const active = document.querySelector('.screen.active');
      SassiMusic.syncFromScreen(active ? active.id : 'menu-screen');
    }
  }
  renderAudioButton();
  if (GameState.audioEnabled) {
    const p = resumeAudio();
    if (p && typeof p.then === 'function') p.then(() => playSfx('click'));
    else playSfx('click');
  }
  window.dispatchEvent(new CustomEvent('mother-audio-settings-changed', { detail: {
    reason: 'mute-toggled',
    enabled: !!GameState.audioEnabled,
    master: getAudioMasterVolumeValue(),
    voice: getAudioVoiceVolumeValue(),
    effects: getAudioEffectsVolumeValue(),
    music: getAudioMusicVolumeValue()
  } }));
};

function audioNow(offset) {
  return AudioKit.ctx.currentTime + (Number(offset) || 0);
}

function connectToMaster(source) {
  source.connect(AudioKit.master);
}

function getAudioEventOutputBoost() {
  return Math.max(1, Math.min(1.80, (window.AUDIO_APP_OUTPUT_BOOST || 1.20) * (window.AUDIO_FANFARE_JINGLE_BOOST || 1.20)));
}

function beginAudioEventBoost() {
  const prev = Number(AudioKit.eventGainBoost) || 1;
  AudioKit.eventGainBoost = prev * getAudioEventOutputBoost();
  return prev;
}

function endAudioEventBoost(prev) {
  AudioKit.eventGainBoost = Number(prev) || 1;
}

function boostEventGain(value) {
  const base = Math.max(0.0001, Number(value) || 0);
  const boost = Number(AudioKit.eventGainBoost) || 1;
  return Math.max(0.0001, Math.min(0.42, base * boost));
}

window.playTone = function playTone(freq, duration, type, startOffset, gainValue, options) {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  if (!AudioKit.ctx || !AudioKit.master) return;
  const opts = options || {};
  const ctx = AudioKit.ctx;
  const now = audioNow(startOffset);
  const dur = Math.max(0.025, Number(duration) || 0.08);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(Math.max(35, Number(freq) || 220), now);
  if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(35, opts.endFreq), now + Math.max(0.018, dur * 0.84));
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, boostEventGain(gainValue || 0.09)), now + Math.min(0.026, dur * 0.35));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  connectToMaster(gain);
  osc.start(now);
  osc.stop(now + dur + 0.03);
};

window.playNoiseBurst = function playNoiseBurst(duration, startOffset, gainValue, filterFreq, options) {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  if (!AudioKit.ctx || !AudioKit.master) return;
  const opts = options || {};
  const ctx = AudioKit.ctx;
  const dur = Math.max(0.018, Number(duration) || 0.055);
  const now = audioNow(startOffset);
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    const fade = Math.pow(1 - i / bufferSize, opts.soft ? 1.65 : 1.0);
    data[i] = (Math.random() * 2 - 1) * fade;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = opts.filterType || 'bandpass';
  filter.frequency.setValueAtTime(filterFreq || 900, now);
  filter.Q.setValueAtTime(opts.q || 2.2, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, boostEventGain(gainValue || 0.035)), now + 0.009);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  source.connect(filter);
  filter.connect(gain);
  connectToMaster(gain);
  source.start(now);
  source.stop(now + dur + 0.03);
};

function playStoneTick(startOffset, pitch, power) {
  const f = pitch || 360;
  const p = power || 1;
  playTone(f, 0.062, 'triangle', startOffset, 0.205 * p, { endFreq: f * 0.70 });
  playNoiseBurst(0.046, (startOffset || 0) + 0.004, 0.088 * p, f * 4.2, { soft: true, q: 3.2 });
}

window.playSfx = function playSfx(name) {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  switch (name) {
    case 'select':
      playStoneTick(0, 430 + Math.random() * 55, 2.25);
      break;
    case 'cancel':
      playTone(260, 0.070, 'sine', 0, 0.100, { endFreq: 175 });
      playNoiseBurst(0.035, 0.012, 0.034, 620, { soft: true });
      break;
    case 'click':
      playStoneTick(0, 335, 0.82);
      break;
    case 'confirm':
      playStoneTick(0, 245, 2.28);
      playStoneTick(0.055, 188, 1.92);
      playNoiseBurst(0.072, 0.018, 0.155, 720, { soft: true });
      break;
    case 'roundWin':
      playStoneTick(0, 520, 1.05);
      playTone(660, 0.10, 'triangle', 0.055, 0.085, { endFreq: 760 });
      break;
    case 'roundLose':
      playStoneTick(0, 215, 0.92);
      playTone(185, 0.11, 'sine', 0.055, 0.060, { endFreq: 132 });
      break;
    case 'gradeUp': {
      const __eventBoostPrev = beginAudioEventBoost();
      playTone(523, 0.16, 'triangle', 0, 0.115, { endFreq: 659 });
      playTone(784, 0.18, 'triangle', 0.13, 0.105, { endFreq: 988 });
      playTone(1175, 0.26, 'sine', 0.28, 0.090, { endFreq: 1318 });
      playNoiseBurst(0.18, 0.38, 0.030, 4200, { soft: true, filterType: 'highpass' });
      endAudioEventBoost(__eventBoostPrev);
      break;
    }
    case 'win':
      playResultFanfare(true, typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null);
      break;
    case 'lose':
      playResultFanfare(false, typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null);
      break;
    default:
      playStoneTick(0, 320, 0.75);
      break;
  }
};

window.WILDU_VOICE_DEBUG = window.WILDU_VOICE_DEBUG || false;
function voiceDebugLog() {
  if (!window.WILDU_VOICE_DEBUG) return;
  try { console.log.apply(console, ['[WILDU VOICE V21]'].concat(Array.from(arguments))); } catch (err) {}
}
function getVoiceVolume() { return Math.max(0, Math.min(1, getEffectiveVoiceVolumeValue() * getGlobalOutputGainValue())); }
function getFanfareVolume() { return Math.max(0, Math.min(1, getEffectiveEffectsVolumeValue() * 0.34 * getAudioEventOutputBoost() * getGlobalOutputGainValue())); }
function normalizeVoiceState(state) {
  if (state === 'win' || state === 'victory') return 'win';
  if (state === 'lose' || state === 'loss' || state === 'defeat') return 'lose';
  return 'action';
}
function getOpponentVoiceClips(opponent, state) {
  const manifest = window.WILDU_VOICE_MANIFEST;
  if (!manifest || !manifest.opponents || !opponent || !opponent.id) return [];
  const data = manifest.opponents[opponent.id];
  if (!data || !data.clips) return [];
  return Array.isArray(data.clips[state]) ? data.clips[state] : [];
}
function chooseClip(clips) {
  if (!clips || !clips.length) return '';
  const last = AudioKit.lastClipPath || '';
  const usable = clips.length > 1 ? clips.filter((clip) => clip !== last) : clips;
  return usable[Math.floor(Math.random() * usable.length)];
}

function stopCurrentVoiceOnly() {
  AudioKit.voiceSerial += 1;
  AudioKit.voiceBusyUntil = 0;
  if (AudioKit.voiceTimer) { window.clearTimeout(AudioKit.voiceTimer); AudioKit.voiceTimer = null; }
  if (AudioKit.voiceAudio) {
    try { AudioKit.voiceAudio.pause(); AudioKit.voiceAudio.currentTime = 0; AudioKit.voiceAudio.volume = getVoiceVolume(); } catch (err) {}
  }
  AudioKit.voiceAudio = null;
}

window.stopOpponentVoice = function stopOpponentVoice() {
  AudioKit.voiceSerial += 1;
  AudioKit.voiceBusyUntil = 0;
  if (AudioKit.voiceTimer) { window.clearTimeout(AudioKit.voiceTimer); AudioKit.voiceTimer = null; }
  if (AudioKit.voiceAudio) {
    try { AudioKit.voiceAudio.pause(); AudioKit.voiceAudio.currentTime = 0; AudioKit.voiceAudio.volume = getVoiceVolume(); } catch (err) {}
  }
  AudioKit.voiceAudio = null;
  if (AudioKit.fanfareAudio) {
    try { AudioKit.fanfareAudio.pause(); AudioKit.fanfareAudio.currentTime = 0; AudioKit.fanfareAudio.volume = getFanfareVolume(); } catch (err) {}
  }
  AudioKit.fanfareAudio = null;
};
function playHtmlAudio(path, volume, options) {
  if (!path || !GameState.audioEnabled) return null;
  const opts = options || {};
  const audio = new Audio(path);
  audio.preload = 'auto';
  audio.volume = volume;
  if (opts.playbackRate) audio.playbackRate = opts.playbackRate;
  const play = () => {
    if (!GameState.audioEnabled) return;
    const p = audio.play();
    if (p && typeof p.catch === 'function') p.catch((err) => voiceDebugLog('audio blocked', path, err && err.message ? err.message : err));
  };
  if (opts.delay && opts.delay > 0) window.setTimeout(play, Math.round(opts.delay * 1000));
  else play();
  return audio;
}
function playVoiceFile(path, options) {
  if (!path || !GameState.audioEnabled || GameState.mode !== 'cpu') return;
  const opts = options || {};
  const serial = AudioKit.voiceSerial;
  if (AudioKit.voiceTimer) { window.clearTimeout(AudioKit.voiceTimer); AudioKit.voiceTimer = null; }
  if (AudioKit.voiceAudio && !AudioKit.voiceAudio.paused && !AudioKit.voiceAudio.ended) {
    try { AudioKit.voiceAudio.pause(); AudioKit.voiceAudio.currentTime = 0; } catch (err) {}
  }
  const audio = new Audio(path);
  audio.preload = 'auto';
  audio.volume = getVoiceVolume();
  audio.playbackRate = 1;
  AudioKit.voiceAudio = audio;
  AudioKit.lastClipPath = path;
  audio.addEventListener('loadedmetadata', () => {
    if (AudioKit.voiceAudio === audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      AudioKit.voiceBusyUntil = Math.max(AudioKit.voiceBusyUntil, Date.now() + Math.round((audio.duration + 0.10 + (opts.delay || 0)) * 1000));
    }
  });
  audio.addEventListener('ended', () => { if (AudioKit.voiceAudio === audio) AudioKit.voiceAudio = null; });
  const play = () => {
    if (serial !== AudioKit.voiceSerial || !GameState.audioEnabled || GameState.mode !== 'cpu') return;
    const p = audio.play();
    voiceDebugLog('PLAY', path);
    if (p && typeof p.catch === 'function') p.catch((err) => voiceDebugLog('voice blocked', err && err.message ? err.message : err));
  };
  if (opts.delay && opts.delay > 0) AudioKit.voiceTimer = window.setTimeout(play, Math.round(opts.delay * 1000));
  else play();
}
window.playOpponentBubbleVoice = function playOpponentBubbleVoice(state, opponent, options) {
  if (!GameState.audioEnabled || GameState.mode !== 'cpu') return;
  const op = opponent || (typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null);
  if (!op || !op.id) return;
  const opts = options || {};
  const normalized = normalizeVoiceState(state);
  const now = Date.now();
  const isFinal = normalized === 'win' || normalized === 'lose' || !!opts.finalLine;
  const key = `${op.id}:${normalized}`;

  // V21: niente treni vocali. Action non interrompe mai una voce già attiva.
  if (!isFinal && now < AudioKit.voiceBusyUntil) { voiceDebugLog('SKIP busy', key); return; }
  if (!isFinal && AudioKit.voiceAudio && !AudioKit.voiceAudio.paused && !AudioKit.voiceAudio.ended) { voiceDebugLog('SKIP active', key); return; }
  if (!isFinal && key === AudioKit.lastVoiceKey && now - AudioKit.lastVoiceAt < 850) { voiceDebugLog('SKIP duplicate', key); return; }

  const clips = getOpponentVoiceClips(op, normalized);
  if (!clips.length) { voiceDebugLog('NO CLIPS', op.id, normalized); return; }
  if (isFinal) stopCurrentVoiceOnly();

  const path = chooseClip(clips);
  AudioKit.lastVoiceKey = key;
  AudioKit.lastVoiceAt = now;
  AudioKit.voiceBusyUntil = now + (isFinal ? 1650 : 1050) + Math.round((Number(opts.delay) || 0) * 1000);
  playVoiceFile(path, { delay: Number(opts.delay) || 0 });
};
window.playOpponentStateSfx = function playOpponentStateSfx(state, opponent, options) {
  // Compatibilità vecchio nome, ma in V21 accetta solo action/win/lose.
  const normalized = normalizeVoiceState(state);
  playOpponentBubbleVoice(normalized, opponent, options || {});
};
window.playOpponentMoveReaction = function playOpponentMoveReaction(kind, opponent, options) {
  // V21: risposta dello sfidante alla mossa del giocatore, con un solo BANANA intero.
  playOpponentBubbleVoice('action', opponent, Object.assign({ delay: 0.06 }, options || {}));
};
function playFanfareFile(path) {
  if (!GameState.audioEnabled) return;
  if (AudioKit.fanfareAudio && !AudioKit.fanfareAudio.paused && !AudioKit.fanfareAudio.ended) {
    try { AudioKit.fanfareAudio.pause(); AudioKit.fanfareAudio.currentTime = 0; } catch (err) {}
  }
  AudioKit.fanfareAudio = playHtmlAudio(path, getFanfareVolume());
}



function playBrassHit(freq, duration, delay, gain, options) {
  if (!AudioKit.ctx || !AudioKit.master) return;
  const ctx = AudioKit.ctx;
  const opts = options || {};
  const t = ctx.currentTime + Math.max(0, delay || 0);
  const dur = Math.max(0.08, duration || 0.35);
  const out = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const vibrato = ctx.createOscillator();
  const vibGain = ctx.createGain();

  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(Math.max(0.0002, boostEventGain(gain || 0.06)), t + Math.min(0.08, dur * 0.18));
  out.gain.setTargetAtTime(Math.max(0.0001, boostEventGain(gain || 0.06) * 0.64), t + dur * 0.34, 0.11);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(opts.filterStart || Math.max(360, freq * 1.4), t);
  filter.frequency.exponentialRampToValueAtTime(opts.filterEnd || Math.max(780, freq * 2.8), t + dur * 0.55);
  filter.Q.setValueAtTime(opts.q || 1.15, t);

  vibrato.type = 'sine';
  vibrato.frequency.setValueAtTime(opts.vibratoRate || 5.8, t);
  vibGain.gain.setValueAtTime(opts.vibratoDepth || 5.5, t);
  vibrato.connect(vibGain);

  const partials = [
    [1.00, 'sawtooth', 0, 0.58],
    [1.00, 'triangle', 7, 0.42],
    [2.00, 'sawtooth', -5, 0.22],
    [3.00, 'triangle', 3, 0.12]
  ];

  partials.forEach(([mul, wave, detune, mulGain]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(24, freq * mul), t);
    osc.detune.setValueAtTime(detune + (opts.detune || 0), t);
    try { vibGain.connect(osc.detune); } catch (err) {}
    g.gain.setValueAtTime(Math.max(0.0001, mulGain), t);
    osc.connect(g);
    g.connect(filter);
    osc.start(t);
    osc.stop(t + dur + 0.06);
  });

  const breath = ctx.createBufferSource();
  const len = Math.max(1, Math.floor(ctx.sampleRate * Math.min(0.13, dur * 0.32)));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
  const breathGain = ctx.createGain();
  const breathFilter = ctx.createBiquadFilter();
  breath.buffer = buf;
  breathFilter.type = 'bandpass';
  breathFilter.frequency.setValueAtTime(opts.breathFreq || 950, t);
  breathFilter.Q.setValueAtTime(0.9, t);
  breathGain.gain.setValueAtTime(boostEventGain(gain || 0.06) * 0.16, t);
  breathGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.16, dur * 0.36));
  breath.connect(breathFilter);
  breathFilter.connect(breathGain);
  breathGain.connect(out);
  breath.start(t);
  breath.stop(t + Math.min(0.18, dur * 0.40));

  filter.connect(out);
  out.connect(AudioKit.master);
  vibrato.start(t);
  vibrato.stop(t + dur + 0.08);
}

function playBrassChord(freqs, duration, delay, gain, options) {
  const opts = options || {};
  freqs.forEach((freq, i) => {
    playBrassHit(freq, duration * (i === 0 ? 1.08 : 1), delay + (opts.strum || 0.018) * i, gain * (opts.gains ? opts.gains[i] || 1 : 1), Object.assign({}, opts, { detune: (opts.detune || 0) + i * 2 }));
  });
}

window.playOpponentRevealFanfare = function playOpponentRevealFanfare(opponent, options) {
  if (!GameState.audioEnabled || GameState.mode !== 'cpu') return;
  resumeAudio();
  const nowMs = Date.now();
  if (nowMs - AudioKit.lastRevealFanfareAt < 4200) return;
  AudioKit.lastRevealFanfareAt = nowMs;
  const __eventBoostPrev = beginAudioEventBoost();

  const baseDelay = Number((options || {}).delay) || 0.50;

  // Scintilla iniziale: resta come pre-reveal, ma più presente.
  playTone(784, 0.12, 'triangle', baseDelay + 0.00, 0.060, { endFreq: 988 });
  playTone(1175, 0.14, 'sine', baseDelay + 0.09, 0.055, { endFreq: 1397 });
  playTone(1568, 0.18, 'sine', baseDelay + 0.22, 0.045, { endFreq: 1975 });
  playNoiseBurst(0.22, baseDelay + 0.08, 0.020, 5600, { soft: true, filterType: 'highpass', q: 4.2 });
  playNoiseBurst(0.28, baseDelay + 0.26, 0.018, 7400, { soft: true, filterType: 'highpass', q: 4.8 });

  // V37.14G: vero stinger "creatura che appare": tensione -> pausa -> scoperta.
  // Non copia temi esistenti: usa grammatica da reveal, hook riconoscibile e risoluzione.
  const j = baseDelay + 0.58;
  const lead = [
    // domanda/tensione
    [0.00, 330, 0.18, 'triangle', 0.078, 349],
    [0.16, 392, 0.18, 'triangle', 0.084, 415],
    [0.32, 466, 0.20, 'sine',     0.088, 523],
    // micro-pausa percepita
    [0.62, 622, 0.16, 'triangle', 0.094, 698],
    [0.78, 740, 0.18, 'sine',     0.098, 831],
    [0.96, 932, 0.28, 'triangle', 0.094, 1046],
    // risposta/scoperta
    [1.28, 784, 0.20, 'triangle', 0.086, 880],
    [1.44, 1046,0.24, 'sine',     0.090, 1175],
    [1.66, 1245,0.38, 'triangle', 0.084, 1397],
    [1.94, 1568,0.62, 'sine',     0.070, 1975]
  ];
  lead.forEach(([offset, freq, dur, wave, gain, endFreq], i) => {
    playTone(freq, dur, wave, j + offset, gain, { endFreq });
    if (i === 2 || i === 5 || i === 9) {
      playNoiseBurst(0.18, j + offset + 0.04, 0.016, 4800 + i * 420, { soft: true, filterType: 'highpass', q: 4.0 });
    }
  });

  // Base drammatica breve, rende il reveal più "mostro appare" senza sporcare il mix.
  playTone(98, 1.10, 'sine', j + 0.02, 0.034, { endFreq: 110 });
  playTone(196, 1.34, 'triangle', j + 0.18, 0.030, { endFreq: 220 });
  playTone(294, 1.02, 'triangle', j + 0.50, 0.024, { endFreq: 330 });

  // Colpo finale brillante.
  playNoiseBurst(0.32, j + 1.82, 0.026, 6800, { soft: true, filterType: 'highpass', q: 4.8 });
  playTone(2093, 0.42, 'sine', j + 1.96, 0.044, { endFreq: 2637 });

  // V37.14I: vero TAAA-DAAN sintetico in stile brass/sax cartoon.
  // TAAA = accordo di apertura con fiato; DAAN = risoluzione forte e brillante.
  playBrassChord([392, 523, 622], 0.58, j + 2.26, 0.080, { filterStart: 520, filterEnd: 1600, breathFreq: 820, strum: 0.026, gains: [0.95, 0.82, 0.70], vibratoDepth: 4.0 });
  playNoiseBurst(0.22, j + 2.30, 0.026, 980, { soft: true, filterType: 'bandpass', q: 1.0 });
  playBrassChord([523, 784, 1046, 1568], 0.84, j + 2.88, 0.096, { filterStart: 760, filterEnd: 2600, breathFreq: 1250, strum: 0.020, gains: [1.00, 0.88, 0.66, 0.42], vibratoDepth: 6.0, vibratoRate: 6.4 });
  playTone(130, 0.78, 'sine', j + 2.88, 0.044, { endFreq: 196 });
  playNoiseBurst(0.38, j + 2.98, 0.038, 7400, { soft: true, filterType: 'highpass', q: 4.8 });

  window.setTimeout(() => {
    if (typeof flashActionRibbon === 'function') {
      const name = opponent && opponent.name ? opponent.name.split(' ')[0] : 'Sfidante';
      flashActionRibbon(`✨ ${name} appare!`, 'neutral');
    }
  }, Math.round((j + 1.35) * 1000));
  endAudioEventBoost(__eventBoostPrev);
};

window.playTournamentGameOverFanfare = function playTournamentGameOverFanfare() {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  const nowMs = Date.now();
  if (nowMs - AudioKit.lastGameOverFanfareAt < 900) return;
  AudioKit.lastGameOverFanfareAt = nowMs;
  const __eventBoostPrev = beginAudioEventBoost();
  if (typeof fadeOutProceduralMusicForFanfare === 'function') fadeOutProceduralMusicForFanfare(0.75);
  const base = 0.16;
  playTone(392, 0.24, 'triangle', base + 0.00, 0.116, { endFreq: 349 });
  playTone(330, 0.28, 'triangle', base + 0.20, 0.108, { endFreq: 294 });
  playTone(262, 0.38, 'sine', base + 0.42, 0.112, { endFreq: 220 });
  playTone(196, 0.64, 'sine', base + 0.70, 0.098, { endFreq: 147 });
  playTone(98, 0.88, 'sine', base + 0.92, 0.070, { endFreq: 82 });
  playNoiseBurst(0.38, base + 0.46, 0.050, 680, { soft: true, filterType: 'bandpass', q: 1.3 });
  playNoiseBurst(0.52, base + 0.86, 0.044, 420, { soft: true, filterType: 'bandpass', q: 1.0 });
  endAudioEventBoost(__eventBoostPrev);
};

window.playTournamentChampionFanfare = function playTournamentChampionFanfare() {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  if (typeof fadeOutProceduralMusicForFanfare === 'function') fadeOutProceduralMusicForFanfare(0.55);
  const __eventBoostPrev = beginAudioEventBoost();
  const base = 0.20;
  const seq = [
    [0.00, 392, 0.18, 'triangle', 0.105, 523],
    [0.10, 523, 0.20, 'triangle', 0.110, 659],
    [0.20, 659, 0.22, 'triangle', 0.112, 784],
    [0.34, 784, 0.28, 'sine', 0.105, 1046],
    [0.56, 523, 0.24, 'triangle', 0.092, 659],
    [0.72, 659, 0.26, 'triangle', 0.098, 880],
    [0.90, 1046, 0.42, 'sine', 0.082, 1318],
    [1.02, 784, 0.48, 'triangle', 0.070, 1046],
    [1.20, 1318, 0.64, 'sine', 0.058, 1568]
  ];
  seq.forEach(([offset, freq, dur, wave, gain, endFreq]) => {
    playTone(freq, dur, wave, base + offset, gain, { endFreq });
  });
  playNoiseBurst(0.32, base + 0.34, 0.042, 5200, { soft: true, filterType: 'highpass' });
  playNoiseBurst(0.48, base + 0.92, 0.050, 6200, { soft: true, filterType: 'highpass' });
  window.setTimeout(() => {
    if (typeof flashActionRibbon === 'function') flashActionRibbon('🏆 Torneo conquistato!', 'player');
  }, 820);
  endAudioEventBoost(__eventBoostPrev);
};


window.playRoundResultJingle = function playRoundResultJingle(playerWon) {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  const nowMs = Date.now();
  if (nowMs - AudioKit.lastRoundJingleAt < 650) return;
  AudioKit.lastRoundJingleAt = nowMs;

  const __eventBoostPrev = beginAudioEventBoost();
  try {
    // V37.14G: più udibile e più musicale, ma resta minore rispetto alle fanfare di sfida.
    const b = 0.22;
    if (playerWon) {
      playTone(523, 0.14, 'triangle', b + 0.00, 0.088, { endFreq: 587 });
      playTone(659, 0.15, 'sine',     b + 0.12, 0.094, { endFreq: 784 });
      playTone(784, 0.18, 'triangle', b + 0.26, 0.096, { endFreq: 988 });
      playTone(1046,0.30, 'sine',     b + 0.44, 0.084, { endFreq: 1175 });
      playTone(1318,0.34, 'triangle', b + 0.66, 0.066, { endFreq: 1568 });
      playNoiseBurst(0.18, b + 0.26, 0.018, 4700, { soft: true, filterType: 'highpass', q: 3.2 });
      return;
    }

    // Round perso: più incisivo e più alto, con caduta riconoscibile.
    playTone(466, 0.16, 'triangle', b + 0.00, 0.126, { endFreq: 415 });
    playTone(392, 0.18, 'sine',     b + 0.14, 0.128, { endFreq: 349 });
    playTone(311, 0.22, 'triangle', b + 0.32, 0.122, { endFreq: 262 });
    playTone(247, 0.32, 'sine',     b + 0.56, 0.110, { endFreq: 196 });
    playTone(123, 0.52, 'sine',     b + 0.70, 0.082, { endFreq: 98 });
    playNoiseBurst(0.30, b + 0.18, 0.046, 760, { soft: true, filterType: 'bandpass', q: 1.1 });
    playNoiseBurst(0.36, b + 0.58, 0.040, 420, { soft: true, filterType: 'bandpass', q: 0.9 });
  } finally {
    endAudioEventBoost(__eventBoostPrev);
  }
};

window.playResultFanfare = function playResultFanfare(playerWon, opponent) {
  if (!GameState.audioEnabled) return;
  resumeAudio();
  if (typeof fadeOutProceduralMusicForFanfare === 'function') fadeOutProceduralMusicForFanfare(0.95);
  const nowMs = Date.now();
  if (nowMs - AudioKit.lastResultFanfareAt < 650) return;
  AudioKit.lastResultFanfareAt = nowMs;

  const hasOpponentVoice = GameState.mode === 'cpu' && opponent && opponent.id;
  const fanfareDelay = hasOpponentVoice ? 1.55 : 0.18;

  if (playerWon) {
    if (hasOpponentVoice) playOpponentBubbleVoice('lose', opponent, { delay: 0.04, finalLine: true });
    window.setTimeout(() => {
      playFanfareFile('audio/sfx/fanfare_player_victory.ogg');
      if (GameState.match && GameState.match.progressReward && GameState.match.progressReward.gradeUp) {
        window.setTimeout(() => playSfx('gradeUp'), 720);
      }
    }, Math.round(fanfareDelay * 1000));
    return;
  }

  if (hasOpponentVoice) playOpponentBubbleVoice('win', opponent, { delay: 0.04, finalLine: true });
  window.setTimeout(() => playFanfareFile('audio/sfx/fanfare_cpu_victory.ogg'), Math.round(fanfareDelay * 1000));
};
