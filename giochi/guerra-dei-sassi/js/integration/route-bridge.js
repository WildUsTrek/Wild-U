(function installRouteBridge(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  const ALLOWED = Object.freeze({
    'mother-menu': Object.freeze(['story-world']),
    'story-world': Object.freeze(['mother-menu', 'story-battle']),
    'story-battle': Object.freeze(['story-world'])
  });

  function RouteBridge(eventBus, flags) {
    this.eventBus = eventBus;
    this.flags = flags;
    this.state = 'mother-menu';
    this.transitioning = false;
  }

  RouteBridge.prototype.transition = function transition(nextState, detail) {
    if (this.transitioning) throw root.contracts.contractError('ROUTE_BUSY', 'A route transition is already active.');
    if (nextState === 'story-world' && !this.flags.enableStoryWorldAdapter) {
      throw root.contracts.contractError('FEATURE_DISABLED', 'Story world adapter is disabled.');
    }
    if (!(ALLOWED[this.state] || []).includes(nextState)) {
      throw root.contracts.contractError('INVALID_ROUTE_TRANSITION', `Cannot transition from ${this.state} to ${nextState}.`);
    }
    const previousState = this.state;
    this.transitioning = true;
    try {
      this.state = nextState;
      this.eventBus.emit('route:changed', Object.freeze({ previousState, nextState, detail: detail || null }));
      return this.state;
    } finally {
      this.transitioning = false;
    }
  };

  RouteBridge.prototype.toMotherMenu = function toMotherMenu(detail) {
    if (this.state === 'mother-menu') return this.state;
    if (this.state !== 'story-world') throw root.contracts.contractError('INVALID_ROUTE_TRANSITION', 'Mother menu is reachable only from story world.');
    return this.transition('mother-menu', detail);
  };

  root.RouteBridge = RouteBridge;
})(window);
