(function installIntegrationConfig(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.contracts) throw new Error('Integration contracts must load before config.');
  if (root.config) throw new Error('Integration config already installed.');

  const browserRuntime = !!(global.document && global.location && typeof global.location.search === 'string');
  const query = browserRuntime ? new URLSearchParams(global.location.search) : null;
  const safeOff = !browserRuntime || query.get('integrationProfile') === 'safe-off';
  const verifiedGameFeatures = !safeOff;

  root.config = Object.freeze({
    version: '1.1.0',
    profile: safeOff ? 'safe-off' : 'integrated-game',
    flags: Object.freeze({
      enableStoryWorldAdapter: verifiedGameFeatures,
      enableBattleBridge: verifiedGameFeatures,
      enableUnifiedAudio: verifiedGameFeatures,
      enableUnifiedServiceWorker: false,
      enableStorageMigration: false,
      enableWilduHostedMode: false,
      enableHostSafeServiceWorker: false,
      enableHostSafeCache: false,
      enableMobileSessionPersistence: verifiedGameFeatures
    }),
    host: Object.freeze({
      launchMechanism: 'unknown',
      origin: 'unknown',
      basePath: 'unknown',
      returnMechanism: 'unknown'
    })
  });
})(window);
