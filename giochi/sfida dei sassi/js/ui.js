window.showScreen = function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
};

window.showRulesModal = function showRulesModal() {
  const modal = document.getElementById('rules-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
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
