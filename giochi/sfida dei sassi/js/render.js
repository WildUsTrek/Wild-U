window.isStoneSelected = function isStoneSelected(rowIndex, colIndex) {
  const sel = GameState.selection;
  if (sel.row === null) return false;
  if (sel.row !== rowIndex) return false;
  const normalized = normalizeSelection(sel.start, sel.end);
  return colIndex >= normalized.start && colIndex <= normalized.end;
};

window.renderBoard = function renderBoard() {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  boardEl.innerHTML = '';

  GameState.board.forEach((row, rowIndex) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.innerText = `R${rowIndex + 1}`;
    rowEl.appendChild(label);

    row.forEach((stone, colIndex) => {
      const stoneEl = document.createElement('button');
      stoneEl.type = 'button';
      stoneEl.className = 'stone';
      stoneEl.setAttribute('aria-label', `Riga ${rowIndex + 1}, pietra ${colIndex + 1}`);

      if (stone === 0) stoneEl.classList.add('removed');
      else if (isStoneSelected(rowIndex, colIndex)) stoneEl.classList.add('selected');

      stoneEl.addEventListener('click', () => onStoneClick(rowIndex, colIndex));
      rowEl.appendChild(stoneEl);
    });

    boardEl.appendChild(rowEl);
  });
};

window.renderHUD = function renderHUD() {
  const turnEl = document.getElementById('turn-label');
  const selectionEl = document.getElementById('selection-label');
  const confirmBtn = document.getElementById('confirm-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  if (turnEl) {
    const current = GameState.mode === 'cpu' && GameState.currentPlayer === 2
      ? 'CPU'
      : `Giocatore ${GameState.currentPlayer}`;
    turnEl.innerText = `Turno: ${current}`;
  }

  if (selectionEl) selectionEl.innerText = getSelectionSummary();

  const hasSelection = GameState.selection.row !== null;
  if (confirmBtn) confirmBtn.disabled = !hasSelection || GameState.gameOver;
  if (cancelBtn) cancelBtn.disabled = !hasSelection || GameState.gameOver;
};

window.renderEndScreen = function renderEndScreen() {
  const winnerEl = document.getElementById('winner-label');
  const detailEl = document.getElementById('result-detail');
  if (!winnerEl || !detailEl) return;

  const winner = GameState.mode === 'cpu' && GameState.winner === 2
    ? 'CPU'
    : `Giocatore ${GameState.winner}`;

  winnerEl.innerText = `Vince ${winner}`;
  detailEl.innerText = GameState.misere
    ? 'Variante misère attiva: chi ha preso l’ultima pietra ha perso.'
    : 'Modalità standard: chi prende l’ultima pietra vince.';
};

window.renderAll = function renderAll() {
  renderBoard();
  renderHUD();
};
