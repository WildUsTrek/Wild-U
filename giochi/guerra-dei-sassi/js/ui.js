window.showScreen = function showScreen(screenId) {
  if (screenId !== 'game-screen' && typeof window.hideBattleSelectionNotice === 'function') {
    window.hideBattleSelectionNotice();
  }
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
  if (document.body) document.body.dataset.motherScreen = screenId;
  if (screenId === 'menu-screen' && typeof window.renderProgressSummary === 'function') {
    window.renderProgressSummary();
  }
  if (typeof window.syncCharacter3DActivity === 'function') {
    window.syncCharacter3DActivity(screenId);
  }
};

window.showRulesModal = function showRulesModal() {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  playSfx('click');
};

window.hideRulesModal = function hideRulesModal() {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
};

window.showEndScreen = function showEndScreen() {
  renderEndScreen();
  showScreen('result-screen');
};

window.returnToMenu = function returnToMenu() {
  const integration = window.UnifiedGameIntegration;
  const story = integration && integration.runtime && integration.runtime.story;
  if (story
    && typeof story.requestChildMenuFromStoryBattle === 'function'
    && story.requestChildMenuFromStoryBattle('mother-battle-menu')) {
    return;
  }
  const route = integration && integration.runtime && integration.runtime.route;
  const childWorld = integration && integration.runtime && integration.runtime.childWorld;
  if (route && route.state === 'story-battle'
    && childWorld && ['mounted', 'paused'].includes(childWorld.state)) {
    if (integration.runtime.eventBus) {
      integration.runtime.eventBus.emit('story:child-menu-guarded', Object.freeze({
        reason: 'story-route-owned-but-handler-did-not-accept',
        route: route.state,
        childState: childWorld.state
      }));
    }
    return;
  }
  if (typeof stopOpponentVoice === 'function') stopOpponentVoice();
  if (typeof startProceduralMenuMusic === 'function') startProceduralMenuMusic({ fadeIn: 1.05 });
  clearCpuTimer();
  if (typeof clearVisualEffects === 'function') clearVisualEffects();
  resetSelection();
  renderAll();
  showScreen('menu-screen');
  if (typeof ensurePlayerAvatarChosen === 'function') ensurePlayerAvatarChosen();
};
