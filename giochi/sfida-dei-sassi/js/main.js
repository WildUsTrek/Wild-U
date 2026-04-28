window.bindUI = function bindUI() {
  const startBtn = document.getElementById('start-btn');
  const rulesBtn = document.getElementById('rules-btn');
  const rulesCloseBtn = document.getElementById('rules-close-btn');
  const confirmBtn = document.getElementById('confirm-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const resetBtn = document.getElementById('reset-btn');
  const menuBtn = document.getElementById('menu-btn');
  const playAgainBtn = document.getElementById('play-again-btn');
  const backMenuBtn = document.getElementById('back-menu-btn');

  if (startBtn) startBtn.addEventListener('click', onStartGame);
  if (rulesBtn) rulesBtn.addEventListener('click', showRulesModal);
  if (rulesCloseBtn) rulesCloseBtn.addEventListener('click', hideRulesModal);
  if (confirmBtn) confirmBtn.addEventListener('click', onConfirmMove);
  if (cancelBtn) cancelBtn.addEventListener('click', onCancelSelection);
  if (resetBtn) resetBtn.addEventListener('click', onResetGame);
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      resetSelection();
      showScreen('menu-screen');
    });
  }
  if (playAgainBtn) playAgainBtn.addEventListener('click', onStartGame);
  if (backMenuBtn) backMenuBtn.addEventListener('click', () => showScreen('menu-screen'));

  document.querySelectorAll('[data-close-modal="true"]').forEach((el) => {
    el.addEventListener('click', hideRulesModal);
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hideRulesModal();
  });
};

window.init = function init() {
  bindUI();
  resetGameState();
  renderAll();
  showScreen('menu-screen');
};

document.addEventListener('DOMContentLoaded', init);
