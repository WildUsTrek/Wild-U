(function installMotherBattlePort(global) {
  'use strict';

  const integration = global.UnifiedGameIntegration;
  if (!integration || !integration.runtime || !integration.BattleCatalog) {
    throw new Error('Integration runtime and battle catalog must load before mother battle port.');
  }

  let active = null;

  function clearBattlePresentation() {
    if (typeof global.clearCpuTimer === 'function') global.clearCpuTimer();
    if (typeof global.stopOpponentVoice === 'function') global.stopOpponentVoice();
    if (typeof global.dismissBattleCinema === 'function') {
      global.dismissBattleCinema({ invokeDone: false, reason: 'mother-battle-settled' });
    }
    if (typeof global.clearVisualEffects === 'function') global.clearVisualEffects();
    if (global.GameState) global.GameState.inputLocked = false;
  }

  function buildResult(request, status) {
    const playerWon = status === 'victory';
    return Object.freeze({
      requestId: request.requestId,
      status,
      winnerId: status === 'aborted' ? '' : (playerWon ? request.challengerId : request.opponentId),
      loserId: status === 'aborted' ? '' : (playerWon ? request.opponentId : request.challengerId),
      rewards: null,
      storyStatePatch: Object.freeze({
        owner: 'child',
        encounterId: request.encounterId,
        storyCheckpointId: request.storyCheckpointId
      }),
      returnTo: 'game-world'
    });
  }

  function settle(status) {
    if (!active || active.settled) return null;
    const current = active;
    current.settled = true;
    active = null;
    clearBattlePresentation();
    const result = buildResult(current.request, status);
    current.resolve(result);
    return result;
  }

  const port = Object.freeze({
    startBattle(input) {
      if (active) throw integration.contracts.contractError('MOTHER_BATTLE_BUSY', 'Mother battle engine is already serving a story battle.');
      const request = integration.BattleCatalog.validateRequest(input);
      const entry = integration.BattleCatalog.requireEncounter(request.encounterId);
      const opponents = Array.isArray(global.OPPONENTS) ? global.OPPONENTS : [];
      const opponent = opponents[entry.motherIndex];
      if (!opponent || opponent.id !== request.opponentId) {
        throw integration.contracts.contractError('MOTHER_OPPONENT_MISMATCH', `Mother opponent catalog mismatch for ${request.encounterId}.`);
      }
      if (!global.GameState || typeof global.resetMatchState !== 'function' || typeof global.resetGameState !== 'function') {
        throw integration.contracts.contractError('MOTHER_BATTLE_NOT_READY', 'Mother battle engine is not ready.');
      }

      const resultPromise = new Promise((resolve, reject) => {
        active = { request, resolve, reject, settled: false };
      });

      try {
        clearBattlePresentation();
        if (typeof global.setCurrentOpponentByIndex === 'function') global.setCurrentOpponentByIndex(entry.motherIndex);
        global.GameState.mode = 'cpu';
        global.GameState.adventureMode = 'free';
        global.GameState.tournamentActive = false;
        global.GameState.tournamentIndex = 0;
        global.resetMatchState();
        global.resetGameState();
        document.body.dataset.activeModule = 'story-battle';
        if (!integration.config.flags.enableUnifiedAudio && typeof global.startProceduralBattleMusic === 'function') {
          global.startProceduralBattleMusic(opponent, { fadeIn: 0.8 });
        }
        if (typeof global.renderAll === 'function') global.renderAll();
        if (typeof global.startChallengePresentation === 'function') {
          global.startChallengePresentation({ tournamentStart: false });
        } else if (typeof global.showScreen === 'function') {
          global.showScreen('game-screen');
        }
        integration.runtime.eventBus.emit('mother-battle:started', Object.freeze({
          requestId: request.requestId,
          encounterId: request.encounterId,
          opponentId: request.opponentId,
          motherIndex: entry.motherIndex
        }));
      } catch (error) {
        const failed = active;
        active = null;
        clearBattlePresentation();
        if (failed) failed.reject(error);
      }
      return resultPromise;
    },

    completeFromGameState() {
      if (!active) return null;
      const match = global.GameState && global.GameState.match;
      if (!match || !match.matchOver || (match.matchWinner !== 1 && match.matchWinner !== 2)) {
        throw integration.contracts.contractError('MOTHER_BATTLE_INCOMPLETE', 'Mother battle cannot complete before a valid match winner exists.');
      }
      return settle(match.matchWinner === 1 ? 'victory' : 'defeat');
    },

    abortBattle(requestId) {
      if (!active) return Promise.resolve(null);
      if (String(requestId || '') !== active.request.requestId) {
        throw integration.contracts.contractError('BATTLE_ABORT_REQUEST_MISMATCH', 'Abort requestId does not match the active mother battle.');
      }
      return Promise.resolve(settle('aborted'));
    },

    isStoryBattleActive() {
      return !!active;
    },

    getActiveRequest() {
      return active ? active.request : null;
    }
  });

  global.__UNIFIED_MOTHER_BATTLE_PORT__ = port;
  integration.runtime.registry.register('mother-battle', port);
})(window);
