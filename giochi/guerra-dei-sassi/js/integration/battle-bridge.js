(function installBattleBridge(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;

  function BattleBridge(registry, eventBus, flags) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.flags = flags;
    this.activeRequest = null;
    this.completedRequestIds = new Set();
  }

  BattleBridge.prototype.requestBattle = async function requestBattle(input) {
    if (!this.flags.enableBattleBridge) {
      throw root.contracts.contractError('FEATURE_DISABLED', 'Battle bridge is disabled.');
    }
    if (this.activeRequest) {
      throw root.contracts.contractError('BATTLE_BUSY', 'Another story battle is already active.');
    }
    if (!root.BattleCatalog || typeof root.BattleCatalog.validateRequest !== 'function') {
      throw root.contracts.contractError('MISSING_BATTLE_CATALOG', 'Battle catalog is not installed.');
    }
    const request = root.BattleCatalog.validateRequest(input);
    if (this.completedRequestIds.has(request.requestId)) {
      throw root.contracts.contractError('DUPLICATE_BATTLE_REQUEST', 'Battle request was already completed.');
    }
    const motherPort = this.registry.require('mother-battle');
    if (typeof motherPort.startBattle !== 'function') {
      throw root.contracts.contractError('INVALID_MOTHER_BATTLE_PORT', 'Mother battle port does not implement startBattle.');
    }
    this.activeRequest = request;
    this.eventBus.emit('battle:requested', request);
    try {
      const rawResult = await motherPort.startBattle(request);
      const result = root.contracts.normalizeBattleResult(rawResult, request.requestId);
      this.completedRequestIds.add(request.requestId);
      this.eventBus.emit('battle:completed', result);
      return result;
    } catch (error) {
      this.eventBus.emit('battle:failed', Object.freeze({
        requestId: request.requestId,
        encounterId: request.encounterId,
        message: String(error && error.message || error)
      }));
      throw error;
    } finally {
      this.activeRequest = null;
    }
  };

  BattleBridge.prototype.abortActive = async function abortActive(reason) {
    if (!this.activeRequest) return null;
    const motherPort = this.registry.require('mother-battle');
    if (typeof motherPort.abortBattle !== 'function') {
      throw root.contracts.contractError('INVALID_MOTHER_BATTLE_PORT', 'Mother battle port does not implement abortBattle.');
    }
    return motherPort.abortBattle(this.activeRequest.requestId, String(reason || 'aborted'));
  };

  root.BattleBridge = BattleBridge;
})(window);
