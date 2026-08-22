window.MATCH_ROUND_CONFIGS = [
  { label: 'Round 1', rows: [5, 4, 3, 2, 1], name: 'Duello classico' },
  { label: 'Round 2', rows: [7, 5, 3, 1], name: 'Piramide secca' },
  { label: 'Round 3', rows: [6, 5, 4, 3, 2, 1], name: 'Campo lungo' }
];

window.GameState = {
  board: [],
  boardVersion: 0,
  currentPlayer: 1,
  mode: 'cpu',
  adventureMode: 'tournament',
  tournamentIndex: 0,
  tournamentActive: false,
  misere: false,
  gameOver: false,
  winner: null,
  configRows: MATCH_ROUND_CONFIGS[0].rows.slice(),
  match: {
    roundIndex: 0,
    playerOneScore: 0,
    playerTwoScore: 0,
    roundWinners: [],
    lastRoundWinner: null,
    matchOver: false,
    matchWinner: null,
    progressRecorded: false,
    progressReward: null
  },
  selection: {
    row: null,
    start: null,
    end: null
  },
  inputLocked: false,
  cpuThinking: false,
  cpuTimerId: null,
  currentOpponentIndex: 0,
  currentOpponentId: '',
  opponentMood: 'neutral',
  lastMove: null,
  turnCount: 0,
  audioEnabled: true,
  audioVolume: 0.72,
  audioMasterVolume: 0.72,
  audioVoiceVolume: 0.31,
  audioEffectsVolume: 0.40,
  audioMusicVolume: 0.80,
  lastQuip: '',
  progress: null
};

window.PROGRESS_STORAGE_KEY = 'sfida_sassi_progress_v22';
window.PROGRESS_GRADES = [
  { minWins: 0, label: 'Novizio dei sassi' },
  { minWins: 3, label: 'Custode del mucchio' },
  { minWins: 6, label: 'Stratega di pietra' },
  { minWins: 9, label: 'Maestro dei sassi' },
  { minWins: 12, label: 'Leggenda del campo' }
];

window.getDefaultProgress = function getDefaultProgress() {
  return {
    version: 1,
    cpuWins: 0,
    cpuLosses: 0,
    highestSkillBeaten: 0,
    lastOpponentBeaten: '',
    tournamentUnlockedIndex: 0,
    tournamentWins: 0,
    tournamentLosses: 0,
    tournamentClears: 0,
    playerAvatarId: '',
    updatedAt: 0
  };
};

window.loadProgress = function loadProgress() {
  const fallback = getDefaultProgress();
  try {
    const raw = window.localStorage ? window.localStorage.getItem(PROGRESS_STORAGE_KEY) : '';
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Object.assign(fallback, {
      cpuWins: Math.max(0, Number(parsed.cpuWins) || 0),
      cpuLosses: Math.max(0, Number(parsed.cpuLosses) || 0),
      highestSkillBeaten: Math.max(0, Number(parsed.highestSkillBeaten) || 0),
      lastOpponentBeaten: String(parsed.lastOpponentBeaten || ''),
      tournamentUnlockedIndex: Math.max(0, Math.min(8, Number(parsed.tournamentUnlockedIndex) || 0)),
      tournamentWins: Math.max(0, Number(parsed.tournamentWins) || 0),
      tournamentLosses: Math.max(0, Number(parsed.tournamentLosses) || 0),
      tournamentClears: Math.max(0, Number(parsed.tournamentClears) || 0),
      playerAvatarId: String(parsed.playerAvatarId || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64),
      updatedAt: Number(parsed.updatedAt) || 0
    });
  } catch (err) {
    return fallback;
  }
};

window.saveProgress = function saveProgress(progress) {
  const safe = Object.assign(getDefaultProgress(), progress || {});
  safe.cpuWins = Math.max(0, Number(safe.cpuWins) || 0);
  safe.cpuLosses = Math.max(0, Number(safe.cpuLosses) || 0);
  safe.highestSkillBeaten = Math.max(0, Number(safe.highestSkillBeaten) || 0);
  safe.lastOpponentBeaten = String(safe.lastOpponentBeaten || '').slice(0, 64);
  safe.tournamentUnlockedIndex = Math.max(0, Math.min(8, Number(safe.tournamentUnlockedIndex) || 0));
  safe.tournamentWins = Math.max(0, Number(safe.tournamentWins) || 0);
  safe.tournamentLosses = Math.max(0, Number(safe.tournamentLosses) || 0);
  safe.tournamentClears = Math.max(0, Number(safe.tournamentClears) || 0);
  safe.playerAvatarId = String(safe.playerAvatarId || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64);
  safe.updatedAt = Date.now();
  GameState.progress = safe;
  try {
    if (window.localStorage) window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(safe));
  } catch (err) {}
  return safe;
};

window.getCurrentProgress = function getCurrentProgress() {
  if (!GameState.progress) GameState.progress = loadProgress();
  return GameState.progress;
};

window.setPlayerAvatarId = function setPlayerAvatarId(avatarId) {
  const progress = getCurrentProgress();
  progress.playerAvatarId = String(avatarId || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64);
  return saveProgress(progress);
};

window.getPlayerAvatarId = function getPlayerAvatarId() {
  const progress = getCurrentProgress();
  return String(progress.playerAvatarId || '');
};


window.getProgressGradeInfo = function getProgressGradeInfo(progress) {
  const p = progress || getCurrentProgress();
  const wins = Math.max(0, Number(p.cpuWins) || 0);
  let grade = PROGRESS_GRADES[0];
  PROGRESS_GRADES.forEach((candidate) => {
    if (wins >= candidate.minWins) grade = candidate;
  });
  return grade;
};

window.getProgressGrade = function getProgressGrade(progress) {
  return getProgressGradeInfo(progress).label;
};

window.getNextGradeInfo = function getNextGradeInfo(progress) {
  const p = progress || getCurrentProgress();
  const wins = Math.max(0, Number(p.cpuWins) || 0);
  return PROGRESS_GRADES.find((grade) => grade.minWins > wins) || null;
};

window.recordCpuMatchProgress = function recordCpuMatchProgress(playerWon, opponent) {
  const progress = getCurrentProgress();
  const previousGrade = getProgressGrade(progress);
  const previousWins = Number(progress.cpuWins) || 0;
  const opponentSkill = opponent ? (Number(opponent.skill) || 0) : 0;
  const opponentName = opponent ? (opponent.name || '') : '';
  const wasTournament = GameState.adventureMode === 'tournament';
  const beforeUnlocked = Math.max(0, Math.min(8, Number(progress.tournamentUnlockedIndex) || 0));

  if (playerWon) {
    progress.cpuWins += 1;
    if (opponent) {
      progress.highestSkillBeaten = Math.max(progress.highestSkillBeaten || 0, opponentSkill);
      progress.lastOpponentBeaten = opponentName || progress.lastOpponentBeaten || '';
    }
    if (wasTournament) {
      progress.tournamentWins += 1;
      const currentIdx = Math.max(0, Number(GameState.tournamentIndex) || 0);
      progress.tournamentUnlockedIndex = Math.max(beforeUnlocked, Math.min(8, currentIdx + 1));
      if (currentIdx >= 8) progress.tournamentClears += 1;
    }
  } else {
    progress.cpuLosses += 1;
    if (wasTournament) progress.tournamentLosses += 1;
  }

  const saved = saveProgress(progress);
  const currentGrade = getProgressGrade(saved);
  return {
    progress: saved,
    playerWon: !!playerWon,
    wasTournament,
    previousWins,
    currentWins: saved.cpuWins,
    previousGrade,
    currentGrade,
    gradeUp: currentGrade !== previousGrade,
    unlockedNewOpponent: wasTournament && playerWon && saved.tournamentUnlockedIndex > beforeUnlocked,
    tournamentCompleted: wasTournament && playerWon && (Number(GameState.tournamentIndex) || 0) >= 8,
    opponentName,
    opponentSkill
  };
};


window.createBoardFromRows = function createBoardFromRows(rowConfig) {
  return rowConfig.map((length) => Array.from({ length }, () => 1));
};

window.getCurrentRoundConfig = function getCurrentRoundConfig() {
  const configs = Array.isArray(window.MATCH_ROUND_CONFIGS) ? window.MATCH_ROUND_CONFIGS : [];
  const idx = Math.max(0, Math.min(configs.length - 1, GameState.match.roundIndex || 0));
  return configs[idx] || { label: 'Round 1', rows: [5, 4, 3, 2, 1], name: 'Duello classico' };
};

window.resetMatchState = function resetMatchState() {
  GameState.match.roundIndex = 0;
  GameState.match.playerOneScore = 0;
  GameState.match.playerTwoScore = 0;
  GameState.match.roundWinners = [];
  GameState.match.lastRoundWinner = null;
  GameState.match.matchOver = false;
  GameState.match.matchWinner = null;
  GameState.match.progressRecorded = false;
  GameState.match.progressReward = null;
  GameState.configRows = getCurrentRoundConfig().rows.slice();
};

window.prepareCurrentRound = function prepareCurrentRound() {
  const cfg = getCurrentRoundConfig();
  GameState.configRows = cfg.rows.slice();
};

window.recordRoundWin = function recordRoundWin(winner) {
  const safeWinner = winner === 2 ? 2 : 1;
  GameState.match.lastRoundWinner = safeWinner;
  GameState.match.roundWinners[GameState.match.roundIndex] = safeWinner;
  if (safeWinner === 1) GameState.match.playerOneScore += 1;
  else GameState.match.playerTwoScore += 1;

  if (GameState.match.playerOneScore >= 2 || GameState.match.playerTwoScore >= 2 || GameState.match.roundIndex >= MATCH_ROUND_CONFIGS.length - 1) {
    GameState.match.matchOver = true;
    GameState.match.matchWinner = GameState.match.playerOneScore >= GameState.match.playerTwoScore ? 1 : 2;
    if (GameState.mode === 'cpu' && !GameState.match.progressRecorded && typeof recordCpuMatchProgress === 'function') {
      GameState.match.progressRecorded = true;
      const storyBattlePort = window.__UNIFIED_MOTHER_BATTLE_PORT__;
      const storyOwnsProgress = !!(storyBattlePort
        && typeof storyBattlePort.isStoryBattleActive === 'function'
        && storyBattlePort.isStoryBattleActive());
      GameState.match.progressReward = storyOwnsProgress
        ? { owner: 'child', skippedMotherProgress: true }
        : recordCpuMatchProgress(GameState.match.matchWinner === 1, typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null);
    }
  }
};

window.canStartNextRound = function canStartNextRound() {
  return !GameState.match.matchOver && GameState.match.roundIndex < MATCH_ROUND_CONFIGS.length - 1;
};

window.advanceToNextRound = function advanceToNextRound() {
  if (!canStartNextRound()) return false;
  GameState.match.roundIndex += 1;
  prepareCurrentRound();
  resetGameState();
  return true;
};

window.bumpBoardVersion = function bumpBoardVersion() {
  GameState.boardVersion = (GameState.boardVersion || 0) + 1;
};

window.resetSelection = function resetSelection() {
  GameState.selection.row = null;
  GameState.selection.start = null;
  GameState.selection.end = null;
};

window.clearCpuTimer = function clearCpuTimer() {
  if (GameState.cpuTimerId !== null) {
    window.clearTimeout(GameState.cpuTimerId);
    GameState.cpuTimerId = null;
  }
  GameState.cpuThinking = false;
  GameState.inputLocked = false;
};

window.setInputLocked = function setInputLocked(isLocked) {
  GameState.inputLocked = !!isLocked;
};

window.setOpponentMood = function setOpponentMood(mood, quip) {
  GameState.opponentMood = mood || 'neutral';
  if (quip) GameState.lastQuip = quip;
};

window.getOpponentById = function getOpponentById(id) {
  const list = Array.isArray(window.OPPONENTS) ? window.OPPONENTS : [];
  return list.find((opponent) => opponent && opponent.id === id) || null;
};

window.setCurrentOpponentByIndex = function setCurrentOpponentByIndex(index) {
  const list = Array.isArray(window.OPPONENTS) ? window.OPPONENTS : [];
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  const clamped = Math.max(0, Math.min(list.length - 1, safeIndex));
  GameState.currentOpponentIndex = clamped;
  GameState.currentOpponentId = list[clamped] ? list[clamped].id : '';
};

window.getCurrentOpponent = function getCurrentOpponent() {
  const list = Array.isArray(window.OPPONENTS) ? window.OPPONENTS : [];
  return getOpponentById(GameState.currentOpponentId) || list[GameState.currentOpponentIndex] || list[0] || null;
};

window.resetGameState = function resetGameState() {
  clearCpuTimer();
  if (typeof clearVisualEffects === 'function') clearVisualEffects();
  prepareCurrentRound();
  GameState.board = createBoardFromRows(GameState.configRows);
  bumpBoardVersion();
  GameState.currentPlayer = 1;
  GameState.gameOver = false;
  GameState.winner = null;
  GameState.turnCount = 0;
  GameState.lastMove = null;
  GameState.lastQuip = '';
  GameState.opponentMood = 'neutral';
  resetSelection();
};
