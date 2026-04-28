window.normalizeSelection = function normalizeSelection(startIndex, endIndex) {
  return {
    start: Math.min(startIndex, endIndex),
    end: Math.max(startIndex, endIndex)
  };
};

window.isStoneAlive = function isStoneAlive(rowIndex, colIndex) {
  return !!(GameState.board[rowIndex] && GameState.board[rowIndex][colIndex] === 1);
};

window.isContiguousSelection = function isContiguousSelection(board, rowIndex, startIndex, endIndex) {
  if (!board[rowIndex]) return false;
  const normalized = normalizeSelection(startIndex, endIndex);

  for (let i = normalized.start; i <= normalized.end; i += 1) {
    if (board[rowIndex][i] !== 1) return false;
  }
  return true;
};

window.canSelectStone = function canSelectStone(rowIndex, colIndex) {
  if (GameState.gameOver) return false;
  if (!isStoneAlive(rowIndex, colIndex)) return false;

  const sel = GameState.selection;
  if (sel.row === null) return true;
  if (sel.row !== rowIndex) return false;

  const normalized = normalizeSelection(sel.start, colIndex);
  return isContiguousSelection(GameState.board, rowIndex, normalized.start, normalized.end);
};

window.applySelection = function applySelection() {
  const sel = GameState.selection;
  if (sel.row === null) return false;

  const normalized = normalizeSelection(sel.start, sel.end);
  if (!isContiguousSelection(GameState.board, sel.row, normalized.start, normalized.end)) {
    return false;
  }

  for (let i = normalized.start; i <= normalized.end; i += 1) {
    GameState.board[sel.row][i] = 0;
  }
  return true;
};

window.countRemainingStones = function countRemainingStones(board) {
  return board.reduce((sum, row) => {
    return sum + row.reduce((rowSum, stone) => rowSum + (stone === 1 ? 1 : 0), 0);
  }, 0);
};

window.checkGameOver = function checkGameOver() {
  return countRemainingStones(GameState.board) === 0;
};

window.switchPlayer = function switchPlayer(currentPlayer) {
  return currentPlayer === 1 ? 2 : 1;
};

window.computeWinner = function computeWinner() {
  if (!GameState.gameOver) return null;
  return GameState.misere ? switchPlayer(GameState.currentPlayer) : GameState.currentPlayer;
};

window.getSelectionSummary = function getSelectionSummary() {
  const sel = GameState.selection;
  if (sel.row === null) return 'Nessuna selezione';
  const normalized = normalizeSelection(sel.start, sel.end);
  const total = (normalized.end - normalized.start) + 1;
  return `Riga ${sel.row + 1} • ${total} pietra${total > 1 ? 'e' : ''}`;
};

window.getValidMoves = function getValidMoves(board) {
  const moves = [];
  board.forEach((row, rowIndex) => {
    let start = null;
    for (let i = 0; i <= row.length; i += 1) {
      if (row[i] === 1 && start === null) start = i;
      const endsRun = (row[i] !== 1 || i === row.length) && start !== null;
      if (endsRun) {
        const end = i - 1;
        for (let s = start; s <= end; s += 1) {
          for (let e = s; e <= end; e += 1) {
            moves.push({ row: rowIndex, start: s, end: e });
          }
        }
        start = null;
      }
    }
  });
  return moves;
};

window.cpuMakeMove = function cpuMakeMove() {
  const moves = getValidMoves(GameState.board);
  if (!moves.length) return;
  const randomMove = moves[Math.floor(Math.random() * moves.length)];
  GameState.selection.row = randomMove.row;
  GameState.selection.start = randomMove.start;
  GameState.selection.end = randomMove.end;
  applyTurnFromSelection();
};

window.applyTurnFromSelection = function applyTurnFromSelection() {
  if (GameState.gameOver) return;

  const applied = applySelection();
  if (!applied) return;

  if (checkGameOver()) {
    GameState.gameOver = true;
    GameState.winner = computeWinner();
    renderAll();
    showEndScreen();
    return;
  }

  GameState.currentPlayer = switchPlayer(GameState.currentPlayer);
  resetSelection();
  renderAll();

  if (GameState.mode === 'cpu' && GameState.currentPlayer === 2) {
    setTimeout(() => cpuMakeMove(), 350);
  }
};
