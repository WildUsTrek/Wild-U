window.CPU_SOLVER_MAX_STONES = 12;
window.CPU_SOLVER_HARD_LIMIT = 14;
window.CpuMemo = new Map();

window.normalizeSelection = function normalizeSelection(startIndex, endIndex) {
  return {
    start: Math.min(startIndex, endIndex),
    end: Math.max(startIndex, endIndex)
  };
};

window.cloneBoard = function cloneBoard(board) {
  return board.map((row) => row.slice());
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
  if (GameState.gameOver || GameState.inputLocked) return false;
  if (!isStoneAlive(rowIndex, colIndex)) return false;

  const sel = GameState.selection;
  if (sel.row === null) return true;
  if (sel.row !== rowIndex) return false;

  const normalized = normalizeSelection(sel.start, colIndex);
  return isContiguousSelection(GameState.board, rowIndex, normalized.start, normalized.end);
};

window.getMoveStoneCount = function getMoveStoneCount(move) {
  if (!move) return 0;
  return (move.end - move.start) + 1;
};

window.isMoveStillLegal = function isMoveStillLegal(board, move) {
  if (!move || !board || !board[move.row]) return false;
  return isContiguousSelection(board, move.row, move.start, move.end);
};

window.applyMoveToBoard = function applyMoveToBoard(board, move) {
  if (!isMoveStillLegal(board, move)) return cloneBoard(board);
  const next = cloneBoard(board);
  for (let i = move.start; i <= move.end; i += 1) {
    next[move.row][i] = 0;
  }
  return next;
};

window.applySelection = function applySelection() {
  const sel = GameState.selection;
  if (sel.row === null) return false;

  const normalized = normalizeSelection(sel.start, sel.end);
  if (!isContiguousSelection(GameState.board, sel.row, normalized.start, normalized.end)) {
    return false;
  }

  const move = {
    row: sel.row,
    start: normalized.start,
    end: normalized.end,
    count: (normalized.end - normalized.start) + 1
  };

  for (let i = normalized.start; i <= normalized.end; i += 1) {
    GameState.board[sel.row][i] = 0;
  }

  if (typeof bumpBoardVersion === 'function') bumpBoardVersion();
  GameState.lastMove = move;
  return move;
};

window.countRemainingStones = function countRemainingStones(board) {
  return board.reduce((sum, row) => {
    return sum + row.reduce((rowSum, stone) => rowSum + (stone === 1 ? 1 : 0), 0);
  }, 0);
};

window.checkGameOver = function checkGameOver() {
  return countRemainingStones(GameState.board) === 0;
};


window.stone = function stone() {
  if (!window.GameState) return 'stone-war: GameState non disponibile';
  if (typeof clearCpuTimer === 'function') clearCpuTimer();
  GameState.misere = false;
  GameState.configRows = [1];
  GameState.board = [[1]];
  GameState.currentPlayer = 1;
  GameState.gameOver = false;
  GameState.winner = null;
  GameState.inputLocked = false;
  GameState.cpuThinking = false;
  GameState.lastMove = null;
  GameState.lastQuip = '';
  GameState.opponentMood = 'worried';
  if (typeof resetSelection === 'function') resetSelection();
  if (typeof bumpBoardVersion === 'function') bumpBoardVersion();
  if (typeof renderAll === 'function') renderAll();
  if (typeof showScreen === 'function') showScreen('game-screen');
  if (typeof flashActionRibbon === 'function') flashActionRibbon('Cheat stone: resta una pietra', 'good');
  console.info('[stone-war admin] stone(): resta una sola pietra. Cliccala e conferma per vincere.');
  return 'stone-war stone: una pietra sul tavolo';
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
  if (sel.row === null) {
    return 'Nessuna selezione';
  }

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
            moves.push({ row: rowIndex, start: s, end: e, count: (e - s) + 1 });
          }
        }
        start = null;
      }
    }
  });
  return moves;
};

window.boardKey = function boardKey(board, misere) {
  return `${misere ? 'M' : 'N'}|${board.map((row) => row.join('')).join('/')}`;
};

window.isWinningBoard = function isWinningBoard(board, misere) {
  const remaining = countRemainingStones(board);
  if (remaining === 0) {
    return !!misere;
  }

  const key = boardKey(board, misere);
  if (CpuMemo.has(key)) return CpuMemo.get(key);

  const moves = getValidMoves(board);
  for (let i = 0; i < moves.length; i += 1) {
    const child = applyMoveToBoard(board, moves[i]);
    if (!isWinningBoard(child, misere)) {
      CpuMemo.set(key, true);
      return true;
    }
  }

  CpuMemo.set(key, false);
  return false;
};

window.getExactWinningMoves = function getExactWinningMoves(board, misere) {
  if (countRemainingStones(board) > CPU_SOLVER_MAX_STONES) return [];
  return getValidMoves(board).filter((move) => {
    const child = applyMoveToBoard(board, move);
    return !isWinningBoard(child, misere);
  });
};

window.pickRandomMove = function pickRandomMove(moves) {
  if (!moves.length) return null;
  return moves[Math.floor(Math.random() * moves.length)];
};

window.scoreMove = function scoreMove(board, move, misere) {
  const remainingAfter = countRemainingStones(applyMoveToBoard(board, move));
  let score = getMoveStoneCount(move) * 10;

  if (remainingAfter === 0 && misere) score -= 1000;
  if (remainingAfter === 1 && !misere) score += 25;
  if (remainingAfter === 1 && misere) score -= 35;

  const row = board[move.row] || [];
  const center = (row.length - 1) / 2;
  const moveCenter = (move.start + move.end) / 2;
  score -= Math.abs(center - moveCenter) * 0.35;
  score += Math.random() * 0.4;
  return score;
};

window.pickBestScoredMove = function pickBestScoredMove(board, moves, misere) {
  if (!moves.length) return null;
  return moves.slice().sort((a, b) => scoreMove(board, b, misere) - scoreMove(board, a, misere))[0];
};

window.chooseCpuMove = function chooseCpuMove() {
  const moves = getValidMoves(GameState.board);
  if (!moves.length) return null;

  const opponent = getCurrentOpponent();
  const skill = opponent ? opponent.skill : 1;
  const style = opponent ? opponent.cpuStyle : 'random';
  const remainingNow = countRemainingStones(GameState.board);
  const exactMoves = remainingNow <= CPU_SOLVER_MAX_STONES ? getExactWinningMoves(GameState.board, GameState.misere) : [];
  const exactChanceBySkill = [0, 0.00, 0.08, 0.16, 0.28, 0.44, 0.60, 0.76, 0.90, 1.00];
  const exactChance = exactChanceBySkill[skill] || 0;

  if (exactMoves.length && Math.random() < exactChance) {
    return pickBestScoredMove(GameState.board, exactMoves, GameState.misere);
  }

  if (style === 'random') return pickRandomMove(moves);
  if (style === 'greedy') return pickBestScoredMove(GameState.board, moves, GameState.misere);

  if (style === 'mixed') {
    return Math.random() < 0.45
      ? pickBestScoredMove(GameState.board, moves, GameState.misere)
      : pickRandomMove(moves);
  }

  if (style === 'tactical') {
    const safeMoves = moves.filter((move) => {
      const remainingAfter = countRemainingStones(applyMoveToBoard(GameState.board, move));
      return !(GameState.misere && remainingAfter === 0);
    });
    return pickBestScoredMove(GameState.board, safeMoves.length ? safeMoves : moves, GameState.misere);
  }

  return exactMoves.length
    ? pickBestScoredMove(GameState.board, exactMoves, GameState.misere)
    : pickBestScoredMove(GameState.board, moves, GameState.misere);
};

window.updateMoodForNextTurn = function updateMoodForNextTurn(previousActor) {
  // V28: niente solver ricorsivo nel mood. Il mood deve essere leggero e non deve mai freezare l'interfaccia.
  if (GameState.mode !== 'cpu' || GameState.gameOver) return;

  if (GameState.currentPlayer === 2) {
    setOpponentMood('thinking');
    return;
  }

  if (previousActor === 'cpu') {
    const remaining = countRemainingStones(GameState.board);
    setOpponentMood(remaining <= 3 ? 'smug' : 'watch');
  } else {
    setOpponentMood('watch');
  }
};

window.scheduleCpuTurn = function scheduleCpuTurn() {
  if (GameState.gameOver || GameState.mode !== 'cpu' || GameState.currentPlayer !== 2) return;

  clearCpuTimer();
  GameState.cpuThinking = true;
  GameState.inputLocked = true;
  setOpponentMood('thinking');
  // V21: niente voce di thinking. Lo sfidante risponde solo alle azioni del giocatore e ai finali.
  renderAll();

  GameState.cpuTimerId = window.setTimeout(() => {
    if (GameState.gameOver || GameState.mode !== 'cpu' || GameState.currentPlayer !== 2) {
      clearCpuTimer();
      renderAll();
      return;
    }

    const move = chooseCpuMove();
    if (!move || !isMoveStillLegal(GameState.board, move)) {
      clearCpuTimer();
      renderAll();
      return;
    }

    GameState.selection.row = move.row;
    GameState.selection.start = move.start;
    GameState.selection.end = move.end;
    GameState.cpuThinking = false;
    // V5: niente audio/flash nella fase di sola anteprima scelta.
    // La CPU applica una sola mossa: il feedback forte parte solo in applyTurnFromSelection().
    setOpponentMood('smug');
    renderAll();

    GameState.cpuTimerId = window.setTimeout(() => {
      GameState.cpuTimerId = null;
      applyTurnFromSelection({ actor: 'cpu' });
    }, 520);
  }, 620);
};


window.getCpuReactionForAppliedMove = function getCpuReactionForAppliedMove(actor) {
  // V28: reazione euristica, nessun isWinningBoard() nel flusso UI.
  if (GameState.mode !== 'cpu' || GameState.gameOver) return null;
  const remaining = countRemainingStones(GameState.board);
  const lastCount = GameState.lastMove ? getMoveStoneCount(GameState.lastMove) : 1;
  if (actor === 'player') {
    if (remaining <= 2 || lastCount >= 3) return 'sigh';
    return 'laugh';
  }
  if (actor === 'cpu') {
    if (remaining <= 2) return 'laugh';
    return lastCount >= 3 ? 'laugh' : 'sigh';
  }
  return null;
};

window.applyTurnFromSelection = function applyTurnFromSelection(options) {
  const opts = options || {};
  const actor = opts.actor || 'player';

  if (GameState.gameOver) return;
  if (GameState.inputLocked && actor !== 'cpu') return;

  const appliedMove = applySelection();
  if (!appliedMove) {
    if (actor === 'cpu') {
      clearCpuTimer();
      renderAll();
    }
    return;
  }

  GameState.turnCount += 1;
  if (typeof flashMoveEffect === 'function') flashMoveEffect(actor, appliedMove);
  // V5: un solo suono di applicazione per ogni mossa reale.
  playSfx('confirm');

  if (checkGameOver()) {
    GameState.gameOver = true;
    GameState.winner = computeWinner();
    if (typeof recordRoundWin === 'function') recordRoundWin(GameState.winner);
    GameState.inputLocked = false;
    GameState.cpuThinking = false;

    const isMatchOver = !!(GameState.match && GameState.match.matchOver);
    if (GameState.mode === 'cpu') {
      const playerWon = GameState.winner !== 2;
      const opponent = getCurrentOpponent();
      setOpponentMood(playerWon ? 'lose' : 'win');
      if (isMatchOver) {
        if (typeof playResultFanfare === 'function') {
          playResultFanfare(playerWon, opponent);
        } else {
          playSfx(playerWon ? 'win' : 'lose');
        }
      } else {
        // V23: il round è un evento minore, ma lo sfidante reagisce comunque.
        // Se tu vinci il round, lui brontola/cede; se lo vince lui, esulta.
        if (typeof playOpponentBubbleVoice === 'function') {
          playOpponentBubbleVoice(playerWon ? 'lose' : 'win', opponent, { delay: 0.08, roundLine: true });
        }
        if (typeof playRoundResultJingle === 'function') window.setTimeout(() => playRoundResultJingle(playerWon), 180);
        else playSfx(playerWon ? 'roundWin' : 'roundLose');
      }
      if (typeof flashActionRibbon === 'function') {
        const opponentName = opponent ? opponent.name : 'Lo sfidante';
        const msg = isMatchOver
          ? (playerWon ? 'Sfida vinta!' : `${opponentName} vince la sfida!`)
          : (playerWon ? 'Round vinto!' : `${opponentName} vince il round`);
        flashActionRibbon(msg, playerWon ? 'player' : 'cpu');
      }
    } else {
      if (isMatchOver) {
        if (typeof playResultFanfare === 'function') playResultFanfare(true, null);
        else playSfx('win');
      } else {
        playSfx('roundWin');
      }
      if (typeof flashActionRibbon === 'function') flashActionRibbon(isMatchOver ? 'Sfida finita!' : 'Round finito!', 'neutral');
    }

    renderAll();
    const showResult = () => showEndScreen();
    // V30: niente scena cinematica ridondante prima del quadro finale.
    // Il quadro "sfida vinta/persa" contiene già sfidante, arena, win/lose e pulsanti.
    showResult();
    const storyBattlePort = window.__UNIFIED_MOTHER_BATTLE_PORT__;
    if (isMatchOver && storyBattlePort
      && typeof storyBattlePort.isStoryBattleActive === 'function'
      && storyBattlePort.isStoryBattleActive()
      && typeof storyBattlePort.completeFromGameState === 'function') {
      storyBattlePort.completeFromGameState();
    }
    return;
  }

  GameState.currentPlayer = switchPlayer(GameState.currentPlayer);
  resetSelection();

  if (actor === 'cpu') {
    GameState.inputLocked = false;
    GameState.cpuThinking = false;
  }

  updateMoodForNextTurn(actor);
  if (GameState.mode === 'cpu' && actor === 'player' && typeof playOpponentMoveReaction === 'function') {
    // V21: lo sfidante risponde subito alla tua azione, non dopo la propria mossa.
    playOpponentMoveReaction('action', getCurrentOpponent(), { delay: 0.06 });
  }
  renderAll();

  if (GameState.mode === 'cpu' && GameState.currentPlayer === 2) {
    scheduleCpuTurn();
  }
};
