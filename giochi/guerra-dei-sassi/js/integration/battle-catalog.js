(function installBattleCatalog(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.contracts) throw new Error('Integration contracts must load before battle catalog.');
  if (root.BattleCatalog) throw new Error('Battle catalog already installed.');

  const ENCOUNTERS = Object.freeze([
    ['event.challenge.nina_ciottolo', 'nina-ciottolo', 'nina_ciottolo.challenge_started'],
    ['event.challenge.bruno_basalto', 'bruno-basalto', 'bruno_basalto.challenge_started'],
    ['event.challenge.mara_selce', 'mara-selce', 'mara_selce.challenge_started'],
    ['event.challenge.teo_pietrafocaia', 'teo-pietrafocaia', 'teo_pietrafocaia.challenge_started'],
    ['event.challenge.lalla_lapillo', 'lalla-lapillo', 'lalla_lapillo.challenge_started'],
    ['event.challenge.orbo_granito', 'orbo-granito', 'orbo_granito.challenge_started'],
    ['event.challenge.zelda_quarzo', 'zelda-quarzo', 'zelda_quarzo.challenge_started'],
    ['event.challenge.prof_ossidiana', 'prof-ossidiana', 'prof_ossidiana.challenge_started'],
    ['event.final.imperio_battle', 'imperio', 'final.imperio_battle_started']
  ].map(([encounterId, opponentId, storyCheckpointId], motherIndex) => Object.freeze({
    encounterId,
    opponentId,
    storyCheckpointId,
    motherIndex,
    challengerId: 'player',
    characterId: 'player'
  })));

  const BY_ENCOUNTER = new Map(ENCOUNTERS.map((entry) => [entry.encounterId, entry]));
  const BY_OPPONENT = new Map(ENCOUNTERS.map((entry) => [entry.opponentId, entry]));

  function requireEncounter(encounterId) {
    const id = root.contracts.assertId(encounterId, 'encounterId');
    const entry = BY_ENCOUNTER.get(id);
    if (!entry) throw root.contracts.contractError('UNKNOWN_STORY_ENCOUNTER', `Story encounter is not mapped: ${id}`);
    return entry;
  }

  function createRequest(input) {
    const source = root.contracts.assertRecord(input, 'childBattleRequest');
    const entry = requireEncounter(source.encounterId);
    return root.contracts.normalizeBattleRequest({
      requestId: source.requestId,
      source: 'story-world',
      command: source.command || 'battle',
      characterId: entry.characterId,
      challengerId: entry.challengerId,
      opponentId: entry.opponentId,
      encounterId: entry.encounterId,
      storyCheckpointId: entry.storyCheckpointId,
      difficulty: source.difficulty,
      seed: source.seed,
      returnTo: 'game-world'
    });
  }

  function validateRequest(input) {
    const request = root.contracts.normalizeBattleRequest(input);
    const entry = requireEncounter(request.encounterId);
    if (request.opponentId !== entry.opponentId
      || request.storyCheckpointId !== entry.storyCheckpointId
      || request.challengerId !== entry.challengerId
      || request.characterId !== entry.characterId) {
      throw root.contracts.contractError('BATTLE_CATALOG_MISMATCH', `Battle request does not match catalog entry: ${entry.encounterId}`);
    }
    return request;
  }

  root.BattleCatalog = Object.freeze({
    entries: ENCOUNTERS,
    requireEncounter,
    findByOpponent(opponentId) {
      return BY_OPPONENT.get(String(opponentId || '').trim()) || null;
    },
    createRequest,
    validateRequest
  });
})(window);
