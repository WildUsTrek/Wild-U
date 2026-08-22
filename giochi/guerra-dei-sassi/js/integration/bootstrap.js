(function bootstrapIntegrationLayer(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || root.runtime) throw new Error('Integration layer is missing or already bootstrapped.');

  const eventBus = new root.EventBus();
  const registry = new root.AppRegistry();
  const route = new root.RouteBridge(eventBus, root.config.flags);
  const exit = new root.ExitBridge(route, registry, eventBus);
  const battle = new root.BattleBridge(registry, eventBus, root.config.flags);
  const audio = new root.AudioBridge(registry, eventBus, root.config.flags);
  const networkCache = new root.NetworkCacheBridge(eventBus);
  const playerSession = new root.PlayerSessionBridge(root.config.flags, eventBus);
  if (root.config.flags.enableWilduHostedMode) {
    registry.register('wildu-host', Object.freeze({
      openRewardsAndGames() {
        if (!global.parent || global.parent === global) {
          throw root.contracts.contractError('HOST_CONTRACT_UNAVAILABLE', 'Wildu parent frame is unavailable.');
        }
        global.parent.postMessage(Object.freeze({
          type: 'WILDU_GAME_CLOSE_REQUEST',
          source: 'guerra-dei-sassi',
          destination: 'taverna-gratis'
        }), global.location.origin);
        return Object.freeze({ ok: true, destination: 'taverna-gratis' });
      }
    }));
  }
  const ChildWorldAdapter = root.ChildWorldAdapter;
  if (root.config.flags.enableStoryWorldAdapter && typeof ChildWorldAdapter !== 'function') {
    throw new Error('ChildWorldAdapter is required when the story world feature is enabled.');
  }
  const childWorld = typeof ChildWorldAdapter === 'function' ? new ChildWorldAdapter({ networkCache }) : null;
  const StoryFlowController = root.StoryFlowController;
  if (root.config.flags.enableStoryWorldAdapter && typeof StoryFlowController !== 'function') {
    throw new Error('StoryFlowController is required when the story world feature is enabled.');
  }
  const story = typeof StoryFlowController === 'function'
    ? new StoryFlowController({ registry, eventBus, route, exitBridge: exit, childWorld, audio, battle, playerSession, networkCache, flags: root.config.flags })
    : null;

  root.runtime = Object.freeze({ eventBus, registry, route, exit, battle, audio, networkCache, playerSession, childWorld, story });
})(window);
