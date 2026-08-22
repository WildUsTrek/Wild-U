window.populateOpponentSelect = function populateOpponentSelect(preferredOpponentId) {
  const opponentSelect = document.getElementById('opponent-select');
  if (!opponentSelect || !Array.isArray(OPPONENTS)) return;

  const progress = typeof getCurrentProgress === 'function' ? getCurrentProgress() : {};
  const unlocked = OPPONENTS
    .map((opponent, index) => ({ opponent, index }))
    .filter(({ opponent }) => {
      return typeof isOpponentChallengeUnlocked === 'function'
        ? isOpponentChallengeUnlocked(opponent, progress)
        : (Number(opponent && opponent.skill) || 1) === 1;
    });

  const list = unlocked.length ? unlocked : [{ opponent: OPPONENTS[0], index: 0 }];

  opponentSelect.innerHTML = '';
  list.forEach(({ opponent, index }) => {
    const option = document.createElement('option');
    option.value = String(index);
    const rankInfo = typeof getOpponentRankInfo === 'function' ? getOpponentRankInfo(opponent, progress) : { fullLabel: getCpuDifficultyLabel(opponent) };
    option.innerText = `${opponent.name} — ${opponent.title || rankInfo.fullLabel || rankInfo.label}`;
    opponentSelect.appendChild(option);
  });

  let targetIndex = Number(GameState.currentOpponentIndex) || 0;
  if (preferredOpponentId) {
    const found = OPPONENTS.findIndex((opponent) => opponent && opponent.id === preferredOpponentId);
    if (found >= 0) targetIndex = found;
  }

  const allowedIndexes = list.map(({ index }) => index);
  if (!allowedIndexes.includes(targetIndex)) targetIndex = allowedIndexes[0] || 0;

  if (typeof setCurrentOpponentByIndex === 'function') setCurrentOpponentByIndex(targetIndex);
  opponentSelect.value = String(targetIndex);
};

window.refreshMenuModeFields = function refreshMenuModeFields() {
  const modeSelect = document.getElementById('mode-select');
  const value = modeSelect ? modeSelect.value : 'tournament';
  const menuScreen = document.getElementById('menu-screen');
  if (menuScreen) menuScreen.dataset.menuMode = value;

  document.querySelectorAll('[data-menu-mode]').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.menuMode === value);
    if (btn.dataset.menuMode === value) btn.setAttribute('aria-pressed', 'true');
    else btn.setAttribute('aria-pressed', 'false');
  });
};


window.onBootStart = function onBootStart() {
  GameState.audioEnabled = true;
  if (typeof markAudioUserStarted === 'function') markAudioUserStarted();
  if (typeof loadAudioSettings === 'function') loadAudioSettings();
  if (typeof closeVolumePanels === 'function') closeVolumePanels();

  const startMusic = () => {
    if (typeof startProceduralMenuMusic !== 'function') return;
    const status = window.SassiMusic && typeof SassiMusic.status === 'function' ? SassiMusic.status() : null;
    if (!status || status.mode !== 'menu' || !status.schedulerActive) startProceduralMenuMusic({ fadeIn: 1.25 });
  };

  // WebKit richiede che creazione, resume e primo grafo audio partano nello stesso
  // gesto. Eseguiamo quindi l'audio prima del rendering del menu e dei suoi asset.
  let audioResume = null;
  try {
    audioResume = typeof resumeAudio === 'function' ? resumeAudio() : null;
    startMusic();
  } catch (err) {
    startMusic();
  }

  showScreen('menu-screen');
  if (typeof renderAudioButton === 'function') renderAudioButton();
  if (typeof ensurePlayerAvatarChosen === 'function') ensurePlayerAvatarChosen();

  if (audioResume && typeof audioResume.then === 'function') {
    audioResume.then((running) => {
      if (running && typeof applyAudioVolume === 'function') applyAudioVolume();
      const status = window.SassiMusic && typeof SassiMusic.status === 'function' ? SassiMusic.status() : null;
      if (!status || status.mode !== 'menu') startMusic();
    }).catch(() => {});
  }
};


window.setMenuMode = function setMenuMode(mode) {
  const modeSelect = document.getElementById('mode-select');
  if (!modeSelect) return;
  if (mode === 'story') return;
  modeSelect.value = mode;
  if (typeof refreshMenuModeFields === 'function') refreshMenuModeFields();
};

window.handleMenuModeButton = function handleMenuModeButton(btn) {
  if (!btn || btn.disabled) return;
  const mode = btn.dataset.menuMode || 'tournament';
  setMenuMode(mode);
  playSfx('click');
  if (btn.dataset.startMode === 'true') onStartGame();
};

window.updateChallengeModalPreview = function updateChallengeModalPreview() {
  const host = document.getElementById('challenge-modal-preview');
  const select = document.getElementById('opponent-select');
  if (!host || !select || !Array.isArray(window.OPPONENTS)) return;
  const opponent = window.OPPONENTS[Number(select.value) || 0] || window.OPPONENTS[0];
  if (!opponent) return;
  host.style.setProperty('--opponent-a', opponent.colors[0]);
  host.style.setProperty('--opponent-b', opponent.colors[1]);
  host.style.setProperty('--opponent-c', opponent.colors[2]);
  const rankInfo = typeof getOpponentRankInfo === 'function' ? getOpponentRankInfo(opponent) : { fullLabel: getCpuDifficultyLabel(opponent) };
  const face = (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof renderCharacter3DFace === 'function')
    ? renderCharacter3DFace(opponent, 'neutral', 'menu')
    : (typeof renderOpponentFaceSvg === 'function' ? renderOpponentFaceSvg(opponent, 'neutral', 'menu') : '');
  host.innerHTML = `<div class="challenge-preview-face">${face}</div><strong>${opponent.name}</strong><span>${rankInfo.fullLabel || rankInfo.label}</span>`;
  if (typeof hydrateCharacter3DWithin === 'function') window.setTimeout(() => hydrateCharacter3DWithin(host, opponent, 'neutral', 'menu'), 0);
};

window.openChallengeModal = function openChallengeModal(opponentId) {
  setMenuMode('cpu');
  const list = Array.isArray(window.OPPONENTS) ? window.OPPONENTS : [];
  const target = opponentId ? list.find((opponent) => opponent && opponent.id === opponentId) : null;
  const progress = typeof getCurrentProgress === 'function' ? getCurrentProgress() : {};
  if (target && typeof isOpponentChallengeUnlocked === 'function' && !isOpponentChallengeUnlocked(target, progress)) {
    if (typeof flashActionRibbon === 'function') flashActionRibbon('Sfidante non ancora sbloccato', 'bad');
    console.warn('[stone-war] Sfidante bloccato:', target.name);
    return;
  }

  if (typeof populateOpponentSelect === 'function') populateOpponentSelect(opponentId || '');
  const modal = document.getElementById('challenge-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('challenge-modal-open');
  if (typeof updateChallengeModalPreview === 'function') updateChallengeModalPreview();
};

window.closeChallengeModal = function closeChallengeModal() {
  const modal = document.getElementById('challenge-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('challenge-modal-open');
};

window.openAvatarModal = function openAvatarModal(options) {
  const modal = document.getElementById('avatar-modal');
  const grid = document.getElementById('avatar-grid');
  if (!modal) return;
  const current = typeof getPlayerAvatarId === 'function' ? getPlayerAvatarId() : '';
  if (grid && !grid.dataset.selectedAvatarId) grid.dataset.selectedAvatarId = current;
  if (typeof renderAvatarGrid === 'function') renderAvatarGrid();
  modal.classList.add('open');
  modal.classList.toggle('is-required', !!(options && options.required));
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('avatar-modal-open');
};

window.closeAvatarModal = function closeAvatarModal() {
  const modal = document.getElementById('avatar-modal');
  if (modal) {
    modal.classList.remove('open', 'is-required');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('avatar-modal-open');
};

window.ensurePlayerAvatarChosen = function ensurePlayerAvatarChosen() {
  if (typeof getPlayerAvatarId !== 'function') return;
  if (!getPlayerAvatarId()) {
    window.setTimeout(() => {
      if (typeof openAvatarModal === 'function') openAvatarModal({ required: true });
    }, 280);
  }
};

window.renderBootOpponentPreview = function renderBootOpponentPreview() {
  const host = document.getElementById('boot-character-preview');
  if (!host || host.dataset.rendered === '1' || !Array.isArray(window.OPPONENTS)) return;
  const pool = window.OPPONENTS.filter((op) => op && op.id !== 'imperio' && op.id !== 'orbo-granito');
  const opponent = pool[Math.floor(Math.random() * pool.length)] || window.OPPONENTS[0];
  host.dataset.rendered = '1';
  host.dataset.opponentId = opponent.id;
  host.style.setProperty('--opponent-a', opponent.colors[0]);
  host.style.setProperty('--opponent-b', opponent.colors[1]);
  host.style.setProperty('--opponent-c', opponent.colors[2]);
  try {
    if (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof updateCharacter3DFace === 'function') {
      updateCharacter3DFace(host, opponent, 'happy', 'menu');
    } else if (typeof renderOpponentFaceSvg === 'function') {
      host.innerHTML = renderOpponentFaceSvg(opponent, 'happy', 'menu');
    }
    if (typeof preloadOpponentAssets === 'function') preloadOpponentAssets(opponent);
  } catch (err) {
    console.warn('[SASSI] boot opponent preview failed', err);
  }
};

window.bindUI = function bindUI() {
  const bootStartBtn = document.getElementById('boot-start-btn');
  const startBtn = document.getElementById('start-btn');
  const rulesBtn = document.getElementById('rules-btn');
  const rulesCloseBtn = document.getElementById('rules-close-btn');
  const confirmBtn = document.getElementById('confirm-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const resetBtn = document.getElementById('reset-btn');
  const menuBtn = document.getElementById('menu-btn');
  const playAgainBtn = document.getElementById('play-again-btn');
  const backMenuBtn = document.getElementById('back-menu-btn');
  const audioBtn = document.getElementById('audio-btn');
  const audioBtnGame = document.getElementById('audio-btn-game');
  const championMenuBtn = document.getElementById('champion-menu-btn');
  const championReplayBtn = document.getElementById('champion-replay-btn');
  const gameOverMenuBtn = document.getElementById('game-over-menu-btn');
  const opponentSelect = document.getElementById('opponent-select');
  const modeSelect = document.getElementById('mode-select');
  const volumeSliders = Array.from(document.querySelectorAll('[data-audio-volume]'));

  if (bootStartBtn) bootStartBtn.addEventListener('click', onBootStart);
  if (startBtn) startBtn.addEventListener('click', onStartGame);
  if (rulesBtn) rulesBtn.addEventListener('click', showRulesModal);
  if (rulesCloseBtn) rulesCloseBtn.addEventListener('click', hideRulesModal);
  if (confirmBtn) confirmBtn.addEventListener('click', onConfirmMove);
  if (cancelBtn) cancelBtn.addEventListener('click', onCancelSelection);
  if (resetBtn) resetBtn.addEventListener('click', onResetGame);
  if (menuBtn) menuBtn.addEventListener('click', returnToMenu);
  if (playAgainBtn) playAgainBtn.addEventListener('click', onResultPrimaryAction);
  if (backMenuBtn) backMenuBtn.addEventListener('click', returnToMenu);
  if (audioBtn) audioBtn.addEventListener('click', toggleAudio);
  if (audioBtnGame) audioBtnGame.addEventListener('click', toggleAudio);
  if (championMenuBtn) championMenuBtn.addEventListener('click', returnToMenu);
  if (gameOverMenuBtn) gameOverMenuBtn.addEventListener('click', returnToMenu);
  if (championReplayBtn) championReplayBtn.addEventListener('click', () => {
    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) modeSelect.value = 'tournament';
    if (typeof refreshMenuModeFields === 'function') refreshMenuModeFields();
    onStartGame();
  });

  volumeSliders.forEach((slider) => {
    slider.addEventListener('input', () => {
      if (typeof setAudioVolume === 'function') setAudioVolume(Number(slider.value) / 100, { fromControl: slider });
    });
  });
  if (typeof bindAdvancedVolumeControls === 'function') bindAdvancedVolumeControls();

  document.querySelectorAll('[data-open-challenge-modal]').forEach((btn) => {
    if (btn.dataset.boundChallengeOpen === '1') return;
    btn.dataset.boundChallengeOpen = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      openChallengeModal();
      playSfx('click');
    });
  });


  if (!document.body.dataset.boundRankingChallenge) {
    document.body.dataset.boundRankingChallenge = '1';
    document.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-ranking-challenge]') : null;
      if (!btn) return;
      ev.preventDefault();
      const opponentId = btn.dataset.rankingChallenge || '';
      openChallengeModal(opponentId);
      playSfx('click');
    });
  }

  document.querySelectorAll('[data-challenge-close]').forEach((btn) => {
    if (btn.dataset.boundChallengeClose === '1') return;
    btn.dataset.boundChallengeClose = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      closeChallengeModal();
      playSfx('click');
    });
  });

  const challengeStartBtn = document.getElementById('challenge-start-btn');
  if (challengeStartBtn && challengeStartBtn.dataset.boundChallengeStart !== '1') {
    challengeStartBtn.dataset.boundChallengeStart = '1';
    challengeStartBtn.addEventListener('click', () => {
      const select = document.getElementById('opponent-select');
      const idx = select ? Number(select.value) : Number(GameState.currentOpponentIndex) || 0;
      const opponent = Array.isArray(window.OPPONENTS) ? window.OPPONENTS[idx] : null;
      const progress = typeof getCurrentProgress === 'function' ? getCurrentProgress() : {};
      if (opponent && typeof isOpponentChallengeUnlocked === 'function' && !isOpponentChallengeUnlocked(opponent, progress)) {
        if (typeof flashActionRibbon === 'function') flashActionRibbon('Sfidante bloccato', 'bad');
        return;
      }
      if (typeof setCurrentOpponentByIndex === 'function') setCurrentOpponentByIndex(idx);
      setMenuMode('cpu');
      closeChallengeModal();
      onStartGame();
    });
  }

  const chooseAvatarBtn = document.getElementById('choose-avatar-btn');
  if (chooseAvatarBtn && chooseAvatarBtn.dataset.boundAvatarOpen !== '1') {
    chooseAvatarBtn.dataset.boundAvatarOpen = '1';
    chooseAvatarBtn.addEventListener('click', () => {
      const grid = document.getElementById('avatar-grid');
      if (grid) grid.dataset.selectedAvatarId = (typeof getPlayerAvatarId === 'function' ? getPlayerAvatarId() : '');
      openAvatarModal({ required: false });
      playSfx('click');
    });
  }

  document.querySelectorAll('[data-avatar-close]').forEach((btn) => {
    if (btn.dataset.boundAvatarClose === '1') return;
    btn.dataset.boundAvatarClose = '1';
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      closeAvatarModal();
      playSfx('click');
    });
  });

  const avatarGrid = document.getElementById('avatar-grid');
  if (avatarGrid && avatarGrid.dataset.boundAvatarGrid !== '1') {
    avatarGrid.dataset.boundAvatarGrid = '1';
    avatarGrid.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('[data-avatar-id]') : null;
      if (!btn) return;
      avatarGrid.dataset.selectedAvatarId = btn.dataset.avatarId || '';
      if (typeof renderAvatarGrid === 'function') renderAvatarGrid();
      playSfx('click');
    });
  }

  const avatarConfirmBtn = document.getElementById('avatar-confirm-btn');
  if (avatarConfirmBtn && avatarConfirmBtn.dataset.boundAvatarConfirm !== '1') {
    avatarConfirmBtn.dataset.boundAvatarConfirm = '1';
    avatarConfirmBtn.addEventListener('click', () => {
      const grid = document.getElementById('avatar-grid');
      const selected = grid ? (grid.dataset.selectedAvatarId || '') : '';
      if (selected && typeof setPlayerAvatarId === 'function') setPlayerAvatarId(selected);
      closeAvatarModal();
      if (typeof renderProgressSummary === 'function') renderProgressSummary();
      playSfx('click');
    });
  }


  document.querySelectorAll('[data-menu-mode]').forEach((btn) => {
    if (btn.dataset.boundModeButton === '1') return;
    btn.dataset.boundModeButton = '1';
    btn.addEventListener('click', () => handleMenuModeButton(btn));
  });


  if (opponentSelect) {
    opponentSelect.addEventListener('change', () => {
      const idx = Number(opponentSelect.value);
      if (typeof setCurrentOpponentByIndex === 'function') {
        setCurrentOpponentByIndex(idx);
      } else {
        GameState.currentOpponentIndex = Number.isFinite(idx) ? idx : 0;
      }
      playSfx('click');
      if (typeof updateChallengeModalPreview === 'function') updateChallengeModalPreview();
    });
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      refreshMenuModeFields();
      if (typeof updateChallengeModalPreview === 'function') updateChallengeModalPreview();
      if (modeSelect.value === 'story') {
        modeSelect.value = 'tournament';
        refreshMenuModeFields();
      }
    });
  }

  document.querySelectorAll('[data-close-modal="true"]').forEach((el) => {
    el.addEventListener('click', hideRulesModal);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      hideRulesModal();
      closeChallengeModal();
      closeAvatarModal();
    }
  });
};

window.init = function init() {
  if (typeof installAudioUnlockListeners === 'function') installAudioUnlockListeners();
  if (typeof getCurrentProgress === 'function') getCurrentProgress();
  if (typeof loadAudioSettings === 'function') loadAudioSettings();
  populateOpponentSelect();
  refreshMenuModeFields();
  bindUI();
  if (typeof syncAudioVolumeControls === 'function') syncAudioVolumeControls();
  // V28: all'avvio non renderizzare board/HUD/pannello di gioco invisibili.
  // Si renderizza solo il menu; renderAll() viene chiamato quando parte davvero la partita.
  if (typeof renderProgressSummary === 'function') renderProgressSummary();
  if (typeof renderAudioButton === 'function') renderAudioButton();
  if (typeof renderBootOpponentPreview === 'function') renderBootOpponentPreview();
  showScreen('boot-screen');
};

document.addEventListener('DOMContentLoaded', init);
