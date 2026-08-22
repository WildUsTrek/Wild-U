(function installMotherStoryShellPort(global) {
  'use strict';

  const integration = global.UnifiedGameIntegration;
  if (!integration || !integration.runtime) throw new Error('Integration runtime must load before the mother shell port.');

  let storyEntryHandler = null;

  const port = Object.freeze({
    bindStoryEntry(handler) {
      if (typeof handler !== 'function') throw new TypeError('Story entry handler must be a function.');
      storyEntryHandler = handler;
      const button = document.getElementById('story-start-btn');
      if (!button || button.dataset.boundStoryEntry === '1') return;
      button.dataset.boundStoryEntry = '1';
      button.addEventListener('click', () => {
        if (button.disabled || !storyEntryHandler) return;
        if (typeof global.playSfx === 'function') global.playSfx('click');
        storyEntryHandler();
      });
    },
    setStoryAvailable(available) {
      const enabled = !!available;
      const button = document.getElementById('story-start-btn');
      if (button) {
        button.disabled = !enabled;
        button.setAttribute('aria-disabled', String(!enabled));
      }
      const option = document.querySelector('#mode-select option[value="story"]');
      if (option) {
        option.disabled = !enabled;
        option.textContent = enabled ? 'Storia' : 'Storia - non disponibile';
      }
    },
    getStoryContainer() {
      const container = document.getElementById('story-world-container');
      if (!container) throw new Error('Mother story container is missing.');
      return container;
    },
    showStoryScreen() {
      global.showScreen('story-screen');
      document.body.dataset.activeModule = 'story-world';
    },
    showMotherMenu() {
      global.showScreen('menu-screen');
      document.body.dataset.activeModule = 'mother-menu';
    },
    setStoryStatus(state, label) {
      const screen = document.getElementById('story-screen');
      const output = document.getElementById('story-world-status');
      if (screen) screen.dataset.storyState = String(state || 'idle');
      if (output) output.textContent = String(label || '');
    },
    suspendMotherMenuAudio() {
      if (typeof global.stopProceduralMusic === 'function') global.stopProceduralMusic();
    },
    restoreMotherMenuAudio() {
      if (typeof global.startProceduralMenuMusic === 'function') global.startProceduralMenuMusic({ fadeIn: 1.05 });
    }
  });

  integration.runtime.registry.register('mother-shell', port);
  document.addEventListener('DOMContentLoaded', () => {
    if (integration.runtime.story) integration.runtime.story.initialize();
  }, { once: true });
})(window);
