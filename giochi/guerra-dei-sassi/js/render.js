window.isStoneSelected = function isStoneSelected(rowIndex, colIndex) {
  const sel = GameState.selection;
  if (sel.row === null) return false;
  if (sel.row !== rowIndex) return false;
  const normalized = normalizeSelection(sel.start, sel.end);
  return colIndex >= normalized.start && colIndex <= normalized.end;
};

window.isStoneInLastMove = function isStoneInLastMove(rowIndex, colIndex) {
  const move = GameState.lastMove;
  if (!move) return false;
  return move.row === rowIndex && colIndex >= move.start && colIndex <= move.end;
};

window.getStoneRotation = function getStoneRotation(rowIndex, colIndex) {
  const raw = ((rowIndex + 3) * 17 + (colIndex + 5) * 23) % 29;
  return raw - 14;
};

window.renderBoard = function renderBoard() {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  const board = Array.isArray(GameState.board) ? GameState.board : [];
  const layoutSignature = board.map((row) => Array.isArray(row) ? row.length : 0).join('/');
  const needsStructure = boardEl.dataset.layoutSignature !== layoutSignature
    || boardEl.children.length !== board.length;

  if (needsStructure) {
    boardEl.innerHTML = '';
    board.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.style.setProperty('--row-index', String(rowIndex));

      row.forEach((stone, colIndex) => {
        const stoneEl = document.createElement('button');
        stoneEl.type = 'button';
        stoneEl.className = 'stone';
        stoneEl.style.setProperty('--row-index', String(rowIndex));
        stoneEl.style.setProperty('--stone-index', String(colIndex));
        stoneEl.style.setProperty('--stone-rot', `${getStoneRotation(rowIndex, colIndex)}deg`);
        stoneEl.dataset.row = String(rowIndex);
        stoneEl.dataset.col = String(colIndex);
        stoneEl.addEventListener('click', (ev) => onStoneClick(rowIndex, colIndex, ev));
        rowEl.appendChild(stoneEl);
      });

      boardEl.appendChild(rowEl);
    });
    boardEl.dataset.layoutSignature = layoutSignature;
  }

  boardEl.dataset.boardVersion = String(GameState.boardVersion || 0);
  const gameScreen = document.getElementById('game-screen');
  const boardRows = board.length;
  const maximumRowStones = board.length
    ? board.reduce((maximum, row) => Math.max(maximum, Array.isArray(row) ? row.length : 0), 0)
    : 0;
  boardEl.dataset.rowCount = String(boardRows);
  boardEl.dataset.maximumRowStones = String(maximumRowStones);
  if (gameScreen) {
    gameScreen.dataset.boardRows = String(boardRows);
    gameScreen.dataset.maximumRowStones = String(maximumRowStones);
    gameScreen.style.setProperty('--battle-row-count', String(Math.max(1, boardRows)));
    gameScreen.style.setProperty('--battle-max-row-stones', String(Math.max(1, maximumRowStones)));
  }
  const isFreshBoard = !GameState.lastMove && (Number(GameState.turnCount) || 0) === 0;
  boardEl.classList.toggle('board-enter', !!isFreshBoard);

  board.forEach((row, rowIndex) => {
    const rowEl = boardEl.children[rowIndex];
    if (!rowEl) return;
    rowEl.classList.toggle('row-hit', !!(GameState.lastMove && GameState.lastMove.row === rowIndex));
    row.forEach((stone, colIndex) => {
      const stoneEl = rowEl.children[colIndex];
      if (!stoneEl) return;
      const isAlive = stone === 1;
      stoneEl.dataset.alive = isAlive ? '1' : '0';
      stoneEl.dataset.boardVersion = String(GameState.boardVersion || 0);
      stoneEl.classList.toggle('stone-slot', !isAlive);
      stoneEl.classList.toggle('removed', !isAlive);
      stoneEl.classList.toggle('last-removed', !isAlive && isStoneInLastMove(rowIndex, colIndex));
      stoneEl.classList.toggle('selected', isAlive && isStoneSelected(rowIndex, colIndex));

      if (!isAlive) {
        stoneEl.disabled = true;
        stoneEl.tabIndex = -1;
        stoneEl.setAttribute('aria-hidden', 'true');
        stoneEl.removeAttribute('aria-label');
        stoneEl.setAttribute('aria-disabled', 'true');
        return;
      }

      stoneEl.removeAttribute('aria-hidden');
      stoneEl.removeAttribute('tabindex');
      stoneEl.setAttribute('aria-label', `Riga ${rowIndex + 1}, pietra ${colIndex + 1}`);
      if (GameState.inputLocked || GameState.gameOver) {
        stoneEl.disabled = true;
        stoneEl.setAttribute('aria-disabled', 'true');
      } else {
        stoneEl.disabled = false;
        stoneEl.removeAttribute('aria-disabled');
      }
    });
  });
};


window.updateBoardSelectionOnly = function updateBoardSelectionOnly() {
  const boardEl = document.getElementById('board');
  if (!boardEl) return false;

  const expectedVersion = String(GameState.boardVersion || 0);
  if (boardEl.dataset.boardVersion !== expectedVersion) {
    renderBoard();
    return true;
  }

  const disabled = !!(GameState.inputLocked || GameState.gameOver);
  const stones = boardEl.querySelectorAll('.stone[data-alive="1"]');
  stones.forEach((stoneEl) => {
    const row = Number(stoneEl.dataset.row);
    const col = Number(stoneEl.dataset.col);
    stoneEl.classList.toggle('selected', isStoneSelected(row, col));
    if (disabled) {
      stoneEl.disabled = true;
      stoneEl.setAttribute('aria-disabled', 'true');
    } else {
      stoneEl.disabled = false;
      stoneEl.removeAttribute('aria-disabled');
    }
  });

  return true;
};



window.getOpponentScoreName = function getOpponentScoreName(opponent) {
  if (!opponent || !opponent.name) return 'Sfidante';
  if (opponent.id === 'imperio') return 'Imperio';
  return String(opponent.name).split(/\s+/)[0] || opponent.name;
};

window.syncMotherBattleResponsiveOpponentCamera = function syncMotherBattleResponsiveOpponentCamera(faceEl) {
  const root = faceEl || document.getElementById('opponent-face');
  const viewer = root ? root.querySelector('model-viewer') : null;
  if (!viewer) return false;

  const isMobileBattle = !!(window.matchMedia && window.matchMedia('(max-width: 980px)').matches);
  if (!viewer.dataset.motherBattleDesktopOrbit) {
    viewer.dataset.motherBattleDesktopOrbit = viewer.getAttribute('camera-orbit') || '';
    viewer.dataset.motherBattleDesktopMinOrbit = viewer.getAttribute('min-camera-orbit') || '';
    viewer.dataset.motherBattleDesktopMaxOrbit = viewer.getAttribute('max-camera-orbit') || '';
    viewer.dataset.motherBattleDesktopTarget = viewer.getAttribute('camera-target') || '';
    viewer.dataset.motherBattleDesktopFov = viewer.getAttribute('field-of-view') || '';
  }

  let restored = false;
  if (viewer.dataset.motherBattleResponsiveCamera === 'true') {
    const fittedAttributes = {
      'camera-orbit': viewer.dataset.motherBattleDesktopOrbit,
      'min-camera-orbit': viewer.dataset.motherBattleDesktopMinOrbit,
      'max-camera-orbit': viewer.dataset.motherBattleDesktopMaxOrbit,
      'camera-target': viewer.dataset.motherBattleDesktopTarget,
      'field-of-view': viewer.dataset.motherBattleDesktopFov
    };
    Object.entries(fittedAttributes).forEach(([name, value]) => {
      if (value && viewer.getAttribute(name) !== value) {
        viewer.setAttribute(name, value);
        restored = true;
      }
    });
    delete viewer.dataset.motherBattleResponsiveCamera;
  }

  const landscape = !!(window.matchMedia && window.matchMedia('(orientation: landscape)').matches);
  viewer.dataset.motherBattleResponsiveProfile = isMobileBattle
    ? (landscape ? 'mobile-landscape-auto-fit' : 'mobile-portrait-auto-fit')
    : 'desktop-auto-fit';
  viewer.dataset.motherBattleCameraOwner = 'character-auto-fit';
  if (restored && typeof viewer.jumpCameraToGoal === 'function') viewer.jumpCameraToGoal();
  return restored;
};

if (!window.__MOTHER_BATTLE_RESPONSIVE_CAMERA_BOUND__) {
  window.__MOTHER_BATTLE_RESPONSIVE_CAMERA_BOUND__ = true;
  let responsiveCameraFrame = 0;
  window.addEventListener('resize', () => {
    if (responsiveCameraFrame) window.cancelAnimationFrame(responsiveCameraFrame);
    responsiveCameraFrame = window.requestAnimationFrame(() => {
      responsiveCameraFrame = 0;
      if (document.getElementById('game-screen')?.classList.contains('active')) {
        syncMotherBattleResponsiveOpponentCamera();
      }
    });
  }, { passive: true });
}

window.getAvatarChoices = function getAvatarChoices() {
  const opponents = Array.isArray(window.OPPONENTS) ? window.OPPONENTS : [];
  return opponents.filter(Boolean).map((op) => ({
    id: op.id,
    name: op.name,
    opponent: op
  }));
};

window.getCurrentAvatarChoice = function getCurrentAvatarChoice() {
  const avatarId = typeof getPlayerAvatarId === 'function' ? getPlayerAvatarId() : '';
  const choices = getAvatarChoices();
  return choices.find((choice) => choice.id === avatarId) || null;
};

window.getMotherRankingPortraitUrl = function getMotherRankingPortraitUrl(opponentId) {
  const safeId = String(opponentId || '').replace(/[^a-z0-9-]/g, '');
  return safeId ? `assets/ui/ranking-portraits/${safeId}.webp?v=20260821.18` : '';
};

window.renderMotherRankingPortraitImage = function renderMotherRankingPortraitImage(opponentId) {
  const src = getMotherRankingPortraitUrl(opponentId);
  return src ? `<img class="ranking-portrait-image" src="${src}" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">` : '';
};

window.renderPlayerAvatarMarkup = function renderPlayerAvatarMarkup() {
  const choice = getCurrentAvatarChoice();
  if (choice && choice.opponent && typeof renderOpponentFaceSvg === 'function') {
    return renderOpponentFaceSvg(choice.opponent, 'happy', 'player-avatar');
  }
  return '<span class="player-avatar-placeholder">?</span>';
};

window.renderAvatarGrid = function renderAvatarGrid() {
  const grid = document.getElementById('avatar-grid');
  if (!grid) return;
  const currentId = typeof getPlayerAvatarId === 'function' ? getPlayerAvatarId() : '';
  const choices = getAvatarChoices();
  const selectedId = grid.dataset.selectedAvatarId || currentId || (choices[0] ? choices[0].id : '');
  if (selectedId && !grid.dataset.selectedAvatarId) grid.dataset.selectedAvatarId = selectedId;
  grid.innerHTML = choices.map((choice) => {
    const active = choice.id === selectedId;
    const face = typeof renderOpponentFaceSvg === 'function'
      ? renderOpponentFaceSvg(choice.opponent, 'happy', 'avatar-choice')
      : '';
    return `<button class="avatar-choice ${active ? 'selected' : ''}" type="button" data-avatar-id="${choice.id}" aria-pressed="${active ? 'true' : 'false'}" aria-label="Scegli questo avatar">
      <span class="avatar-choice-face">${face}</span>
    </button>`;
  }).join('');
};

window.renderProgressSummary = function renderProgressSummary() {
  const gradeEl = document.getElementById('progress-grade');
  const summaryEl = document.getElementById('progress-summary');
  const rankEl = document.getElementById('ranking-position');
  const ladderEl = document.getElementById('ranking-ladder');
  if (!gradeEl || !summaryEl || typeof getCurrentProgress !== 'function') return;

  const progress = getCurrentProgress();
  const grade = typeof getProgressGrade === 'function' ? getProgressGrade(progress) : 'Novizio dei sassi';
  const wins = Number(progress.cpuWins) || 0;
  const losses = Number(progress.cpuLosses) || 0;
  const total = wins + losses;
  const playerRankInfo = typeof getPlayerRankInfo === 'function'
    ? getPlayerRankInfo(progress)
    : { rank: 10, total: 10, label: 'grado #10' };

  gradeEl.innerText = grade;
  if (rankEl) rankEl.innerText = `#${playerRankInfo.rank} / ${playerRankInfo.total}`;

  const clears = progress.tournamentClears ? ` · Coppe ${progress.tournamentClears}` : '';
  summaryEl.innerText = `Vittorie ${wins} · Sconfitte ${losses} · Match ${total}${clears}`;

  const menuScreen = document.getElementById('menu-screen');
  const menuIsActive = !!(menuScreen && menuScreen.classList.contains('active'));
  if (ladderEl && menuIsActive) {
    const opponents = Array.isArray(window.OPPONENTS) ? window.OPPONENTS : [];
    const bySkill = {};
    opponents.forEach((op) => { if (op && Number(op.skill)) bySkill[Number(op.skill)] = op; });

    const rows = [];
    for (let rank = 1; rank <= 10; rank += 1) {
      if (rank === playerRankInfo.rank) {
        rows.push({ rank, kind: 'player', name: 'TU', title: grade, beaten: true });
        continue;
      }

      const skill = rank < playerRankInfo.rank ? (10 - rank) : (11 - rank);
      const op = bySkill[skill] || null;
      const rankInfo = op && typeof getOpponentRankInfo === 'function'
        ? getOpponentRankInfo(op, progress)
        : { label: `grado #${rank}`, fullLabel: `grado #${rank}/10`, beaten: false };
      const unlocked = op && typeof isOpponentChallengeUnlocked === 'function'
        ? isOpponentChallengeUnlocked(op, progress)
        : skill === 1;
      rows.push({
        rank,
        kind: 'opponent',
        id: op ? op.id : '',
        opponent: op,
        name: op ? String(op.name || `Sfidante ${skill}`) : `Sfidante ${skill}`,
        title: op && op.title ? op.title : rankInfo.fullLabel,
        skill,
        beaten: !!rankInfo.beaten,
        unlocked: !!unlocked,
        colors: op && op.colors ? op.colors : ['#ffe08a', '#7bdff2', '#ffffff']
      });
    }

    const liveRanking3D = !!(window.matchMedia
      && window.matchMedia('(min-width: 981px) and (hover: hover) and (pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const avatarId = typeof getPlayerAvatarId === 'function' ? getPlayerAvatarId() : '';
    const renderSignature = JSON.stringify({
      rank: playerRankInfo.rank,
      wins,
      losses,
      clears: Number(progress.tournamentClears) || 0,
      avatarId,
      liveRanking3D,
      rows: rows.map((row) => [row.rank, row.id || '', !!row.beaten, !!row.unlocked])
    });

    if (ladderEl.dataset.renderSignature !== renderSignature) {
      if (typeof disposeCharacter3DWithin === 'function') disposeCharacter3DWithin(ladderEl);
      ladderEl.innerHTML = rows.map((row) => {
      const classes = ['ranking-row', row.kind === 'player' ? 'is-player' : '', row.beaten ? 'is-beaten' : 'is-locked', row.rank === 1 ? 'is-crown' : ''].filter(Boolean).join(' ');
      const badge = row.rank === 1 ? '👑' : row.rank;
      const portrait = row.kind === 'player'
        ? `<span class="ranking-portrait ranking-portrait-player">${renderPlayerAvatarMarkup()}</span>`
        : `<span class="ranking-portrait ${liveRanking3D ? 'ranking-portrait-3d' : 'ranking-portrait-static'}" data-opponent-id="${row.id}" style="--opponent-a:${row.colors[0]};--opponent-b:${row.colors[1]};--opponent-c:${row.colors[2]};">${liveRanking3D && row.opponent && typeof renderCharacter3DFace === 'function'
          ? renderCharacter3DFace(row.opponent, 'neutral', 'ranking')
          : (renderMotherRankingPortraitImage(row.id) || row.name.charAt(0))}</span>`;
      const action = row.kind === 'opponent' && row.unlocked
        ? `<button class="ranking-challenge-btn" type="button" data-ranking-challenge="${row.id}" aria-label="Sfida ${row.name}">Sfida</button>`
        : '';
      return `<li class="${classes}">
        <span class="ranking-badge">${badge}</span>
        ${portrait}
        <span class="ranking-name">${row.name}</span>
        <span class="ranking-sub">${row.title}</span>
        ${action}
      </li>`;
      }).join('');
      ladderEl.dataset.renderSignature = renderSignature;

      if (liveRanking3D && typeof hydrateCharacter3DWithin === 'function') {
        window.setTimeout(() => {
          hydrateCharacter3DWithin(ladderEl, null, 'neutral', 'ranking');
          if (typeof syncCharacter3DActivity === 'function') syncCharacter3DActivity('menu-screen');
        }, 0);
      }
    }
  }

  const chooseAvatarBtn = document.getElementById('choose-avatar-btn');
  if (chooseAvatarBtn) {
    const hasAvatar = !!(typeof getPlayerAvatarId === 'function' && getPlayerAvatarId());
    chooseAvatarBtn.classList.toggle('has-avatar', hasAvatar);
    chooseAvatarBtn.innerText = hasAvatar ? 'Scegli avatar' : 'Configura avatar';
  }

  if (menuIsActive && typeof renderAvatarGrid === 'function') renderAvatarGrid();
};

window.renderHUD = function renderHUD() {
  const matchEl = document.getElementById('match-label');
  const turnEl = document.getElementById('turn-label');
  const confirmBtn = document.getElementById('confirm-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const remainingEl = document.getElementById('remaining-label');
  const roundBoardEl = document.getElementById('round-board-label');
  const arenaNote = document.getElementById('arena-note');

  const roundCfg = typeof getCurrentRoundConfig === 'function' ? getCurrentRoundConfig() : { rows: GameState.configRows || [], name: 'Board' };
  const roundNumber = (GameState.match && Number.isFinite(GameState.match.roundIndex)) ? GameState.match.roundIndex + 1 : 1;
  const opponent = typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null;
  const p1Label = GameState.mode === 'cpu' ? 'Tu' : 'G1';
  const p2Label = GameState.mode === 'cpu' ? getOpponentScoreName(opponent) : 'G2';
  if (matchEl && GameState.match) {
    matchEl.innerText = `R${roundNumber}/3 · ${p1Label} ${GameState.match.playerOneScore} - ${p2Label} ${GameState.match.playerTwoScore}`;
  }
  if (roundBoardEl) {
    roundBoardEl.innerText = `Round ${roundNumber}`;
  }

  if (turnEl) {
    let current = GameState.mode === 'cpu'
      ? (GameState.currentPlayer === 1 ? 'Tu' : (opponent ? opponent.name : 'sfidante'))
      : `G${GameState.currentPlayer}`;
    turnEl.innerText = `Turno: ${current}`;
  }


  const hasSelection = GameState.selection.row !== null;
  const controlsDisabled = GameState.gameOver || GameState.inputLocked;
  const selectionActionActive = hasSelection && !controlsDisabled;
  const gameScreen = document.getElementById('game-screen');
  const moveActionPopup = document.getElementById('move-action-popup');
  if (confirmBtn) confirmBtn.disabled = !hasSelection || controlsDisabled;
  if (cancelBtn) cancelBtn.disabled = !hasSelection || controlsDisabled;
  if (gameScreen) {
    gameScreen.dataset.selectionActive = selectionActionActive ? 'true' : 'false';
    gameScreen.dataset.inputLocked = controlsDisabled ? 'true' : 'false';
  }
  if (moveActionPopup) moveActionPopup.setAttribute('aria-hidden', selectionActionActive ? 'false' : 'true');

  const remaining = countRemainingStones(GameState.board);
  if (remainingEl) remainingEl.innerText = `${remaining} pietr${remaining === 1 ? 'a' : 'e'}`;

  if (arenaNote) {
    arenaNote.innerText = GameState.misere
      ? 'Misère attiva: non essere tu a prendere l’ultima pietra.'
      : 'Standard: chi prende l’ultima pietra vince.';
  }
};

window.renderOpponentPanel = function renderOpponentPanel() {
  const card = document.getElementById('opponent-card');
  const faceEl = document.getElementById('opponent-face');
  const nameEl = document.getElementById('opponent-name');
  const titleEl = document.getElementById('opponent-title');
  const contextNameEl = document.getElementById('opponent-context-name');
  const contextTitleEl = document.getElementById('opponent-context-title');
  const quipEl = document.getElementById('opponent-quip');
  const moodEl = document.getElementById('opponent-mood');
  const difficultyEl = document.getElementById('opponent-difficulty');
  const envEl = document.getElementById('opponent-environment-scene');
  if (!card || !faceEl || !nameEl || !titleEl || !quipEl || !moodEl || !difficultyEl) return;

  if (GameState.mode !== 'cpu') {
    card.dataset.mood = 'neutral';
    card.dataset.opponentId = 'pvp';
    delete card.dataset.environment;
    document.body.dataset.environment = 'pvp';
    if (envEl && envEl.dataset.sceneKey !== 'pvp') {
      envEl.innerHTML = '';
      envEl.dataset.sceneKey = 'pvp';
    }
    if (faceEl.dataset.faceKey !== 'pvp') {
      faceEl.innerHTML = '<div class="pvp-emblem" aria-hidden="true"><span>⚔</span><i></i><i></i><i></i></div>';
      faceEl.dataset.faceKey = 'pvp';
    }
    nameEl.innerText = 'Duello locale';
    titleEl.innerText = 'Giocatore 1 contro Giocatore 2';
    if (contextNameEl) contextNameEl.innerText = nameEl.innerText;
    if (contextTitleEl) contextTitleEl.innerText = titleEl.innerText;
    quipEl.innerText = '«Qui non c’è sfidante automatico: vince chi legge meglio il mucchio.»';
    moodEl.innerText = 'PvP';
    difficultyEl.innerText = '2P';
    return;
  }

  const opponent = getCurrentOpponent();
  const mood = GameState.opponentMood || 'neutral';
  card.dataset.mood = mood;
  card.dataset.opponentId = opponent.id;
  card.dataset.environment = opponent.environment || opponent.id;
  document.body.dataset.environment = opponent.environment || opponent.id;
  document.body.style.setProperty('--opponent-a', opponent.colors[0]);
  document.body.style.setProperty('--opponent-b', opponent.colors[1]);
  document.body.style.setProperty('--opponent-c', opponent.colors[2]);
  card.style.setProperty('--opponent-a', opponent.colors[0]);
  card.style.setProperty('--opponent-b', opponent.colors[1]);
  card.style.setProperty('--opponent-c', opponent.colors[2]);
  const environmentKey = `${opponent.id}:${opponent.environment || opponent.id}`;
  if (envEl && typeof renderOpponentEnvironmentScene === 'function' && envEl.dataset.sceneKey !== environmentKey) {
    envEl.innerHTML = renderOpponentEnvironmentScene(opponent);
    envEl.dataset.sceneKey = environmentKey;
  }
  if (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof updateCharacter3DFace === 'function') {
    updateCharacter3DFace(faceEl, opponent, mood, 'game');
    faceEl.dataset.faceKey = `3d:${opponent.id}`;
  } else {
    const faceKey = `svg:${opponent.id}:${mood}`;
    if (faceEl.dataset.faceKey !== faceKey) {
      faceEl.innerHTML = (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof renderCharacter3DFace === 'function')
        ? renderCharacter3DFace(opponent, mood, 'game')
        : renderOpponentFaceSvg(opponent, mood, 'game');
      faceEl.dataset.faceKey = faceKey;
    }
  }
  syncMotherBattleResponsiveOpponentCamera(faceEl);
  nameEl.innerText = opponent.name;
  titleEl.innerText = opponent.title;
  if (contextNameEl) contextNameEl.innerText = opponent.name;
  if (contextTitleEl) contextTitleEl.innerText = opponent.title;
  quipEl.innerText = GameState.lastQuip || getOpponentQuip(opponent, mood);
  moodEl.innerText = getMoodLabel(mood);
  difficultyEl.innerText = getCpuDifficultyLabel(opponent);
};

window.renderMenuOpponentPreview = function renderMenuOpponentPreview() {
  const preview = document.getElementById('menu-opponent-preview');
  const select = document.getElementById('opponent-select');
  if (!preview || !select) return;

  const idx = Number(select.value) || 0;
  const opponent = OPPONENTS[idx] || OPPONENTS[0];
  preview.dataset.opponentId = opponent.id;
  preview.dataset.environment = opponent.environment || opponent.id;
  preview.style.setProperty('--opponent-a', opponent.colors[0]);
  preview.style.setProperty('--opponent-b', opponent.colors[1]);
  preview.style.setProperty('--opponent-c', opponent.colors[2]);
  preview.innerHTML = `
    <div class="preview-face">${(typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof renderCharacter3DFace === 'function') ? renderCharacter3DFace(opponent, 'neutral', 'menu') : renderOpponentFaceSvg(opponent, 'neutral', 'menu')}</div>
    <div>
      <strong>${opponent.name}</strong>
      <span>${opponent.title}</span>
      <em>${getCpuDifficultyLabel(opponent)}</em>
    </div>`;
  if (typeof preloadOpponentAssets === 'function') preloadOpponentAssets(opponent);
};

window.renderEndScreen = function renderEndScreen() {
  const winnerEl = document.getElementById('winner-label');
  const detailEl = document.getElementById('result-detail');
  const resultFaceEl = document.getElementById('result-face');
  const resultRewardEl = document.getElementById('result-reward');
  const panel = document.querySelector('#result-screen .panel-result');
  const resultScreen = document.getElementById('result-screen');
  if (!winnerEl || !detailEl) return;

  const opponent = GameState.mode === 'cpu' && typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null;
  const winner = GameState.mode === 'cpu'
    ? (GameState.winner === 1 ? 'Tu' : (opponent ? opponent.name : 'sfidante'))
    : `G${GameState.winner}`;

  const playAgainBtn = document.getElementById('play-again-btn');
  const backMenuBtn = document.getElementById('back-menu-btn');
  const roundNumber = (GameState.match && Number.isFinite(GameState.match.roundIndex)) ? GameState.match.roundIndex + 1 : 1;
  const isMatchOver = !!(GameState.match && GameState.match.matchOver);
  const reward = GameState.match ? GameState.match.progressReward : null;
  const p1ScoreLabel = GameState.mode === 'cpu' ? 'Tu' : 'G1';
  const p2ScoreLabel = GameState.mode === 'cpu' ? getOpponentScoreName(opponent) : 'G2';
  const scoreText = GameState.match ? `${p1ScoreLabel} ${GameState.match.playerOneScore} - ${p2ScoreLabel} ${GameState.match.playerTwoScore}` : '';
  const playerWon = GameState.winner === 1;
  const isTournament = GameState.adventureMode === 'tournament';
  const shortOpponent = opponent ? getOpponentScoreName(opponent) : 'Sfidante';

  if (resultScreen) {
    resultScreen.classList.toggle('challenge-over', isMatchOver);
    resultScreen.classList.toggle('round-over', !isMatchOver);
    resultScreen.classList.toggle('player-won', playerWon);
    resultScreen.classList.toggle('player-lost', !playerWon);
  }
  if (panel) {
    panel.classList.toggle('panel-challenge-result', isMatchOver);
    panel.classList.toggle('panel-round-result', !isMatchOver);
  }

  if (isMatchOver) {
    if (GameState.mode === 'cpu' && playerWon) {
      winnerEl.innerText = 'SFIDA VINTA';
    } else if (GameState.mode === 'cpu') {
      winnerEl.innerText = 'SFIDA PERSA';
    } else {
      winnerEl.innerText = `Vince la sfida: ${winner}`;
    }
    detailEl.innerText = scoreText;
  } else if (GameState.mode === 'cpu') {
    winnerEl.innerText = playerWon ? 'ROUND VINTO' : 'ROUND PERSO';
    detailEl.innerText = scoreText;
  } else {
    winnerEl.innerText = `Round ${roundNumber}: vince ${winner}`;
    detailEl.innerText = scoreText;
  }

  if (playAgainBtn) {
    if (!isMatchOver) {
      playAgainBtn.innerText = 'Round successivo';
      playAgainBtn.dataset.finalAction = 'next-round';
    } else if (isTournament && playerWon && GameState.tournamentIndex < (window.OPPONENTS.length - 1)) {
      playAgainBtn.innerText = 'Prossimo sfidante';
      playAgainBtn.dataset.finalAction = 'next-opponent';
    } else {
      if (reward && reward.tournamentCompleted) {
        playAgainBtn.innerText = 'Alza la coppa';
        playAgainBtn.dataset.finalAction = 'champion';
      } else if (isTournament && !playerWon) {
        playAgainBtn.innerText = 'Avanti';
        playAgainBtn.dataset.finalAction = 'game-over';
      } else {
        playAgainBtn.innerText = 'Torna al menu';
        playAgainBtn.dataset.finalAction = 'menu';
      }
    }
  }
  if (backMenuBtn) backMenuBtn.innerText = 'Menu';

  if (resultFaceEl) {
    resultFaceEl.className = 'result-face';
    resultFaceEl.classList.add(isMatchOver ? 'challenge-result-face' : 'round-result-face');
    if (GameState.mode === 'cpu') {
      const mood = playerWon ? 'lose' : 'win';
      const tier = opponent ? Math.max(1, Math.ceil((Number(opponent.skill) || 1) / 3)) : 1;
      resultFaceEl.dataset.mood = mood;
      resultFaceEl.classList.add(playerWon ? 'player-triumph' : 'opponent-triumph', `triumph-tier-${tier}`);
      if (isMatchOver && typeof renderChallengeResultSceneV27 === 'function') {
        resultFaceEl.classList.add('clean-cinematic-result');
        resultFaceEl.innerHTML = renderChallengeResultSceneV27(opponent, mood, { playerWon, tier });
      } else if (isMatchOver && typeof renderBattleCharacter === 'function') {
        resultFaceEl.innerHTML = `<div class="challenge-result-stage-v25 fallback">${renderBattleCharacter(opponent, mood, 'result-fallback-v25')}</div>`;
      } else {
        resultFaceEl.innerHTML = `
          <div class="round-result-portrait-v24 ${playerWon ? 'round-player' : 'round-opponent'}" style="--opponent-a:${opponent.colors[0]};--opponent-b:${opponent.colors[1]};--opponent-c:${opponent.colors[2]};">
            <div class="round-face-v24">${(typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof renderCharacter3DFace === 'function') ? renderCharacter3DFace(opponent, mood, 'round-result-v24') : renderOpponentFaceSvg(opponent, mood, 'round-result-v24')}</div>
            <div class="round-emotion-v24"><strong>${playerWon ? `${shortOpponent} cede` : `${shortOpponent} esulta`}</strong><span>Round ${roundNumber}</span></div>
          </div>`;
      }
    } else {
      resultFaceEl.innerHTML = isMatchOver
        ? '<div class="result-stones challenge-stones"><i></i><i></i><i></i></div>'
        : '<div class="round-result-badge round-player"><strong>Round</strong><span>Punto assegnato</span></div>';
    }
  }

  if (resultRewardEl) {
    if (isMatchOver && GameState.mode === 'cpu') {
      const progress = typeof getCurrentProgress === 'function' ? getCurrentProgress() : null;
      const grade = typeof getProgressGrade === 'function' ? getProgressGrade(progress) : 'Novizio dei sassi';
      const gradeLine = reward && reward.gradeUp
        ? `<strong class="grade-up">Nuovo grado: ${reward.currentGrade}</strong>`
        : `<strong>Il tuo grado: ${grade}</strong>`;
      const cupLine = reward && reward.tournamentCompleted ? '<span class="tournament-cup-line">Coppa del torneo conquistata · scheda finale pronta</span>' : '';
      resultRewardEl.innerHTML = `${gradeLine}<span>Vittorie ${progress ? progress.cpuWins : 0} · Sconfitte ${progress ? progress.cpuLosses : 0}</span>${cupLine}`;
      resultRewardEl.classList.remove('hidden');
    } else {
      resultRewardEl.innerHTML = '';
      resultRewardEl.classList.add('hidden');
    }
  }


  if (resultFaceEl && GameState.mode === 'cpu' && opponent && typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent) && typeof hydrateCharacter3DWithin === 'function') {
    hydrateCharacter3DWithin(resultFaceEl, opponent, playerWon ? 'lose' : 'win', isMatchOver ? 'result' : 'round-result-v36');
  }

  if (typeof flashResultEffect === 'function') {
    flashResultEffect(GameState.mode !== 'cpu' || playerWon);
  }
};


window.renderTournamentChampionScreen = function renderTournamentChampionScreen() {
  const title = document.getElementById('champion-title');
  const detail = document.getElementById('champion-detail');
  const summary = document.getElementById('champion-summary');
  const progress = typeof getCurrentProgress === 'function' ? getCurrentProgress() : null;
  const grade = typeof getProgressGrade === 'function' ? getProgressGrade(progress) : 'Leggenda del campo';
  if (title) title.innerText = 'TORNEO VINTO!';
  if (detail) detail.innerText = 'Hai sconfitto tutti gli sfidanti della Guerra dei Sassi. La coppa è tua.';
  if (summary) {
    summary.innerHTML = `
      <span><strong>Coppa</strong><em>Campione dei Sassi</em></span>
      <span><strong>Il tuo grado</strong><em>${grade}</em></span>
      <span><strong>Vittorie</strong><em>${progress ? progress.cpuWins : 0}</em></span>`;
  }
};

window.showTournamentChampionScreen = function showTournamentChampionScreen() {
  if (typeof stopOpponentVoice === 'function') stopOpponentVoice();
  if (typeof renderTournamentChampionScreen === 'function') renderTournamentChampionScreen();
  if (typeof playTournamentChampionFanfare === 'function') playTournamentChampionFanfare();
  showScreen('champion-screen');
};


window.renderTournamentGameOverScreen = function renderTournamentGameOverScreen() {
  const title = document.getElementById('game-over-title');
  const detail = document.getElementById('game-over-detail');
  const summary = document.getElementById('game-over-summary');
  const opponent = typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null;
  const progress = typeof getCurrentProgress === 'function' ? getCurrentProgress() : null;
  const grade = typeof getProgressGrade === 'function' ? getProgressGrade(progress) : 'Novizio dei sassi';
  const name = opponent && opponent.name ? opponent.name : 'lo sfidante';
  if (title) title.innerText = 'GAME OVER';
  if (detail) detail.innerText = `${name} ha fermato la tua corsa nel torneo. Respira, torna al menu e prepara la rivincita.`;
  if (summary) {
    const score = GameState.match ? `Tu ${GameState.match.playerOneScore} - ${getOpponentScoreName(opponent)} ${GameState.match.playerTwoScore}` : 'Sfida conclusa';
    summary.innerHTML = `
      <span><strong>Esito</strong><em>Torneo perso</em></span>
      <span><strong>Ultima sfida</strong><em>${score}</em></span>
      <span><strong>Il tuo grado</strong><em>${grade}</em></span>`;
  }
};

window.showTournamentGameOverScreen = function showTournamentGameOverScreen() {
  if (typeof stopOpponentVoice === 'function') stopOpponentVoice();
  renderTournamentGameOverScreen();
  if (typeof playTournamentGameOverFanfare === 'function') playTournamentGameOverFanfare();
  showScreen('game-over-screen');
};

window.renderAll = function renderAll() {
  renderBoard();
  renderHUD();
  renderOpponentPanel();
  renderAudioButton();
  if (typeof renderProgressSummary === 'function') renderProgressSummary();
};
