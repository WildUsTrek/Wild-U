(function installIntegrationEventBus(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.config) throw new Error('Integration config must load before event bus.');

  function EventBus() {
    this.listeners = new Map();
  }

  EventBus.prototype.on = function on(eventName, listener) {
    if (typeof listener !== 'function') throw new TypeError('Event listener must be a function.');
    const listeners = this.listeners.get(eventName) || new Set();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(eventName);
    };
  };

  EventBus.prototype.emit = function emit(eventName, payload) {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return 0;
    Array.from(listeners).forEach((listener) => listener(payload));
    return listeners.size;
  };

  EventBus.prototype.clear = function clear() {
    this.listeners.clear();
  };

  root.EventBus = EventBus;
})(window);
