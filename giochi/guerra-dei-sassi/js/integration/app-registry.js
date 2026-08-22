(function installAppRegistry(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.EventBus) throw new Error('Event bus must load before app registry.');

  function AppRegistry() {
    this.ports = new Map();
  }

  AppRegistry.prototype.register = function register(portId, port) {
    const id = root.contracts.assertId(portId, 'portId');
    root.contracts.assertRecord(port, `port:${id}`);
    if (this.ports.has(id)) throw root.contracts.contractError('DUPLICATE_PORT', `Port already registered: ${id}`);
    this.ports.set(id, port);
    return () => this.ports.delete(id);
  };

  AppRegistry.prototype.get = function get(portId) {
    return this.ports.get(portId) || null;
  };

  AppRegistry.prototype.require = function requirePort(portId) {
    const port = this.get(portId);
    if (!port) throw root.contracts.contractError('MISSING_PORT', `Required port is not registered: ${portId}`);
    return port;
  };

  AppRegistry.prototype.clear = function clear() {
    this.ports.clear();
  };

  root.AppRegistry = AppRegistry;
})(window);
