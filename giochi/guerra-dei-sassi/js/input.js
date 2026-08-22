window.hideBattleSelectionNotice = function hideBattleSelectionNotice() {
  const toast = document.getElementById('battle-selection-toast');
  if (window.__MOTHER_BATTLE_SELECTION_NOTICE_TIMER__) {
    window.clearTimeout(window.__MOTHER_BATTLE_SELECTION_NOTICE_TIMER__);
    window.__MOTHER_BATTLE_SELECTION_NOTICE_TIMER__ = 0;
  }
  if (!toast) return false;
  toast.dataset.visible = 'false';
  toast.setAttribute('aria-hidden', 'true');
  return true;
};

window.showBattleSelectionNotice = function showBattleSelectionNotice(message) {
  const toast = document.getElementById('battle-selection-toast');
  if (!toast) return false;
  hideBattleSelectionNotice();
  toast.textContent = String(message || 'Mossa non valida.');
  toast.dataset.visible = 'true';
  toast.setAttribute('aria-hidden', 'false');
  window.__MOTHER_BATTLE_SELECTION_NOTICE_TIMER__ = window.setTimeout(() => {
    hideBattleSelectionNotice();
  }, 1800);
  return true;
};

window.onStoneClick = function onStoneClick(rowIndex, colIndex, ev) {
  const target = ev && ev.currentTarget ? ev.currentTarget : null;
  if (target) {
    if (target.dataset.alive !== '1') return;
    if (target.dataset.boardVersion !== String(GameState.boardVersion || 0)) return;
    if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;
  }

  const sel = GameState.selection;
  if (!GameState.gameOver
    && !GameState.inputLocked
    && sel.row !== null
    && sel.row !== rowIndex
    && isStoneAlive(rowIndex, colIndex)) {
    showBattleSelectionNotice('Non puoi selezionare righe diverse di sassi.');
    return;
  }

  if (!canSelectStone(rowIndex, colIndex)) return;

  resumeAudio();

  // V37.15J UX: se ho una sola pietra selezionata e la riclicco, è un annulla.
  if (sel.row === rowIndex && sel.start === colIndex && sel.end === colIndex) {
    resetSelection();
    playSfx('cancel');
    if (typeof updateBoardSelectionOnly === 'function') updateBoardSelectionOnly();
    renderHUD();
    return;
  }

  playSfx('select');

  if (sel.row === null) {
    sel.row = rowIndex;
    sel.start = colIndex;
    sel.end = colIndex;
    if (typeof updateBoardSelectionOnly === 'function') updateBoardSelectionOnly();
    renderHUD();
    return;
  }

  const normalized = normalizeSelection(sel.start, colIndex);
  if (!isContiguousSelection(GameState.board, rowIndex, normalized.start, normalized.end)) {
    return;
  }

  sel.start = normalized.start;
  sel.end = normalized.end;
  if (typeof updateBoardSelectionOnly === 'function') updateBoardSelectionOnly();
  renderHUD();
};

window.onConfirmMove = function onConfirmMove() {
  if (GameState.inputLocked || GameState.gameOver) return;
  applyTurnFromSelection({ actor: 'player' });
};

window.onCancelSelection = function onCancelSelection() {
  if (GameState.inputLocked || GameState.gameOver) return;
  resetSelection();
  playSfx('cancel');
  if (typeof updateBoardSelectionOnly === 'function') updateBoardSelectionOnly();
  renderHUD();
};

window.onResetGame = function onResetGame() {
  if (typeof stopOpponentVoice === 'function') stopOpponentVoice();
  resetGameState();
  playSfx('click');
  renderAll();
};

window.readGameOptionsFromMenu = function readGameOptionsFromMenu() {
  const modeSelect = document.getElementById('mode-select');
  const misereToggle = document.getElementById('misere-toggle');
  const opponentSelect = document.getElementById('opponent-select');

  const selectedMode = modeSelect ? modeSelect.value : 'pvp';
  GameState.adventureMode = selectedMode === 'tournament' ? 'tournament' : 'free';
  GameState.mode = selectedMode === 'pvp' ? 'pvp' : 'cpu';
  GameState.tournamentActive = selectedMode === 'tournament';
  GameState.misere = misereToggle ? !!misereToggle.checked : false;
  if (GameState.adventureMode === 'tournament') {
    GameState.tournamentIndex = 0;
    if (typeof setCurrentOpponentByIndex === 'function') setCurrentOpponentByIndex(0);
  } else if (opponentSelect && typeof setCurrentOpponentByIndex === 'function') {
    setCurrentOpponentByIndex(Number(opponentSelect.value));
  }
};

window.onStartGame = function onStartGame() {
  if (typeof stopOpponentVoice === 'function') stopOpponentVoice();
  resumeAudio();
  readGameOptionsFromMenu();
  if (typeof resetMatchState === 'function') resetMatchState();
  resetGameState();
  if (typeof startProceduralBattleMusic === 'function') startProceduralBattleMusic(typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null, { fadeIn: 1.10 });
  playSfx('click');
  renderAll();
  if (typeof startChallengePresentation === 'function') {
    startChallengePresentation({ tournamentStart: GameState.adventureMode === 'tournament' });
  } else {
    showScreen('game-screen');
  }
};

window.onResultPrimaryAction = function onResultPrimaryAction() {
  resumeAudio();
  if (GameState.match && GameState.match.matchOver) {
    playSfx('click');
    const playerWon = GameState.match.matchWinner === 1;
    if (GameState.adventureMode === 'tournament' && playerWon && GameState.tournamentIndex < (window.OPPONENTS.length - 1)) {
      GameState.tournamentIndex += 1;
      if (typeof setCurrentOpponentByIndex === 'function') setCurrentOpponentByIndex(GameState.tournamentIndex);
      if (typeof resetMatchState === 'function') resetMatchState();
      resetGameState();
      renderAll();
      if (typeof startProceduralBattleMusic === 'function') startProceduralBattleMusic(typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null, { fadeIn: 1.0 });
      if (typeof startChallengePresentation === 'function') startChallengePresentation({ tournamentStart: false });
      else showScreen('game-screen');
      return;
    }
    if (GameState.adventureMode === 'tournament' && playerWon && GameState.match && GameState.match.progressReward && GameState.match.progressReward.tournamentCompleted) {
      if (typeof showTournamentChampionScreen === 'function') {
        showTournamentChampionScreen();
        return;
      }
    }
    if (GameState.adventureMode === 'tournament' && !playerWon) {
      if (typeof showTournamentGameOverScreen === 'function') {
        showTournamentGameOverScreen();
        return;
      }
    }
    returnToMenu();
    return;
  }
  if (typeof canStartNextRound === 'function' && canStartNextRound()) {
    if (typeof advanceToNextRound === 'function') advanceToNextRound();
    playSfx('click');
    renderAll();
    showScreen('game-screen');
    if (GameState.mode === 'cpu' && GameState.currentPlayer === 2 && typeof scheduleCpuTurn === 'function') {
      scheduleCpuTurn();
    }
    return;
  }
  playSfx('click');
  returnToMenu();
};
