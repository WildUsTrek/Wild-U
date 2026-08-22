(function installExitBridge(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;

  function ExitBridge(routeBridge, registry, eventBus) {
    this.routeBridge = routeBridge;
    this.registry = registry;
    this.eventBus = eventBus;
  }

  ExitBridge.prototype.exitChildToMother = function exitChildToMother(reason) {
    const detail = Object.freeze({ reason: String(reason || 'user-exit') });
    const route = this.routeBridge.toMotherMenu(detail);
    this.eventBus.emit('child:exit-completed', detail);
    return route;
  };

  ExitBridge.prototype.exitMotherToWildu = function exitMotherToWildu() {
    const hostPort = this.registry.get('wildu-host');
    if (!root.config.flags.enableWilduHostedMode || !hostPort || typeof hostPort.openRewardsAndGames !== 'function') {
      throw root.contracts.contractError('HOST_CONTRACT_UNAVAILABLE', 'Wildu host exit is unavailable until its official contract is registered.');
    }
    return hostPort.openRewardsAndGames();
  };

  root.ExitBridge = ExitBridge;
})(window);
