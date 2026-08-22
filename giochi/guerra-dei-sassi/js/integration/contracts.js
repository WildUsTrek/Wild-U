(function installIntegrationContracts(global) {
  'use strict';

  const root = global.UnifiedGameIntegration || {};
  if (root.contracts) throw new Error('Integration contracts already installed.');

  const BATTLE_COMMANDS = Object.freeze(['battle', 'battaglia']);
  const BATTLE_STATUSES = Object.freeze(['victory', 'defeat', 'draw', 'aborted']);
  const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;

  function contractError(code, message) {
    const error = new Error(message);
    error.name = 'IntegrationContractError';
    error.code = code;
    return error;
  }

  function assertRecord(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw contractError('INVALID_RECORD', `${field} must be an object.`);
    }
    return value;
  }

  function assertId(value, field) {
    const normalized = String(value || '').trim();
    if (!ID_PATTERN.test(normalized)) {
      throw contractError('INVALID_ID', `${field} is invalid.`);
    }
    return normalized;
  }

  function createRequestId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return `integration-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeBattleRequest(value) {
    const request = assertRecord(value, 'battleRequest');
    const command = String(request.command || '').toLowerCase();
    if (!BATTLE_COMMANDS.includes(command)) {
      throw contractError('INVALID_BATTLE_COMMAND', 'Battle command must be battle or battaglia.');
    }
    if (request.source !== 'story-world' || request.returnTo !== 'game-world') {
      throw contractError('INVALID_BATTLE_ROUTE', 'Battle request must originate from and return to the story world.');
    }
    return Object.freeze({
      requestId: request.requestId ? assertId(request.requestId, 'requestId') : createRequestId(),
      source: 'story-world',
      command,
      characterId: assertId(request.characterId, 'characterId'),
      challengerId: assertId(request.challengerId, 'challengerId'),
      opponentId: assertId(request.opponentId, 'opponentId'),
      encounterId: request.encounterId ? assertId(request.encounterId, 'encounterId') : '',
      storyCheckpointId: request.storyCheckpointId ? assertId(request.storyCheckpointId, 'storyCheckpointId') : '',
      difficulty: request.difficulty ? String(request.difficulty).slice(0, 64) : '',
      seed: request.seed ? String(request.seed).slice(0, 128) : '',
      returnTo: 'game-world'
    });
  }

  function normalizeBattleResult(value, expectedRequestId) {
    const result = assertRecord(value, 'battleResult');
    const requestId = assertId(result.requestId, 'requestId');
    if (expectedRequestId && requestId !== expectedRequestId) {
      throw contractError('BATTLE_RESULT_REQUEST_MISMATCH', 'Battle result requestId does not match the active request.');
    }
    const status = String(result.status || '').toLowerCase();
    if (!BATTLE_STATUSES.includes(status) || result.returnTo !== 'game-world') {
      throw contractError('INVALID_BATTLE_RESULT', 'Battle result status or return route is invalid.');
    }
    return Object.freeze({
      requestId,
      status,
      winnerId: result.winnerId ? assertId(result.winnerId, 'winnerId') : '',
      loserId: result.loserId ? assertId(result.loserId, 'loserId') : '',
      rewards: result.rewards === undefined ? null : result.rewards,
      storyStatePatch: result.storyStatePatch === undefined ? null : result.storyStatePatch,
      returnTo: 'game-world'
    });
  }

  function assertChildContext(value) {
    const context = assertRecord(value, 'childContext');
    ['audio', 'battle', 'cache', 'networkCache', 'savegame', 'playerSession', 'router', 'exit'].forEach((key) => {
      if (!context[key] || typeof context[key] !== 'object') {
        throw contractError('MISSING_CHILD_CAPABILITY', `Child context capability is missing: ${key}`);
      }
    });
    return context;
  }

  root.contracts = Object.freeze({
    BATTLE_COMMANDS,
    BATTLE_STATUSES,
    contractError,
    assertRecord,
    assertId,
    assertChildContext,
    normalizeBattleRequest,
    normalizeBattleResult
  });
  global.UnifiedGameIntegration = root;
})(window);
