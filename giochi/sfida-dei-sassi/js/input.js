window.onStoneClick = function onStoneClick(rowIndex, colIndex) {
  if (!canSelectStone(rowIndex, colIndex)) return;

  const sel = GameState.selection;

  if (sel.row === null) {
    sel.row = rowIndex;
    sel.start = colIndex;
    sel.end = colIndex;
    renderAll();
    return;
  }

  if (sel.row !== rowIndex) return;

  const normalized = normalizeSelection(sel.start, colIndex);
  if (!isContiguousSelection(GameState.board, rowIndex, normalized.start, normalized.end)) {
    return;
  }

  sel.start = normalized.start;
  sel.end = normalized.end;
  renderAll();
};

window.onConfirmMove = function onConfirmMove() {
  applyTurnFromSelection();
};

window.onCancelSelection = function onCancelSelection() {
  resetSelection();
  renderAll();
};

window.onResetGame = function onResetGame() {
  resetGameState();
  renderAll();
};

window.onStartGame = function onStartGame() {
  const modeSelect = document.getElementById('mode-select');
  const boardSelect = document.getElementById('board-select');
  const misereToggle = document.getElementById('misere-toggle');

  GameState.mode = modeSelect ? modeSelect.value : 'pvp';
  GameState.misere = misereToggle ? !!misereToggle.checked : false;
  GameState.configRows = boardSelect
    ? boardSelect.value.split(',').map((v) => Number(v.trim())).filter(Boolean)
    : [5, 4, 3, 2, 1];

  resetGameState();
  renderAll();
  showScreen('game-screen');
};
