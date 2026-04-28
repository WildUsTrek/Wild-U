window.GameState = {
  board: [],
  currentPlayer: 1,
  mode: 'pvp',
  misere: false,
  gameOver: false,
  winner: null,
  configRows: [5, 4, 3, 2, 1],
  selection: {
    row: null,
    start: null,
    end: null
  }
};

window.createBoardFromRows = function createBoardFromRows(rowConfig) {
  return rowConfig.map((length) => Array.from({ length }, () => 1));
};

window.resetSelection = function resetSelection() {
  GameState.selection.row = null;
  GameState.selection.start = null;
  GameState.selection.end = null;
};

window.resetGameState = function resetGameState() {
  GameState.board = createBoardFromRows(GameState.configRows);
  GameState.currentPlayer = 1;
  GameState.gameOver = false;
  GameState.winner = null;
  resetSelection();
};
