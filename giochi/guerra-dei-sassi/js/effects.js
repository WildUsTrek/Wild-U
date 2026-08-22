window.clearMoveFxTimers = window.clearMoveFxTimers || [];

window.clearVisualEffects = function clearVisualEffects() {
  if (Array.isArray(window.clearMoveFxTimers)) {
    window.clearMoveFxTimers.forEach((id) => window.clearTimeout(id));
    window.clearMoveFxTimers = [];
  }
  document.querySelectorAll('.stone-sparks, .action-ribbon').forEach((el) => el.remove());
  document.querySelectorAll('.move-impact, .cpu-impact, .player-impact, .win-impact, .lose-impact').forEach((el) => {
    el.classList.remove('move-impact', 'cpu-impact', 'player-impact', 'win-impact', 'lose-impact');
  });
};

window.flashActionRibbon = function flashActionRibbon(text, tone) {
  const screen = document.getElementById('game-screen');
  if (!screen || !text) return;

  const old = screen.querySelector('.action-ribbon');
  if (old) old.remove();

  const ribbon = document.createElement('div');
  ribbon.className = `action-ribbon ${tone || 'neutral'}`;
  ribbon.textContent = text;
  screen.appendChild(ribbon);

  const timer = window.setTimeout(() => ribbon.remove(), 1050);
  window.clearMoveFxTimers.push(timer);
};

window.spawnStoneSparks = function spawnStoneSparks(move, actor) {
  // V31: rimosso. Le vecchie scintille partivano sempre dal centro tavolo, creando un pallino sporco.
  return;
};

window.flashMoveEffect = function flashMoveEffect(actor, move) {
  // V30: nessun flash globale del tavolo e nessun colpo sul ritratto/sfondo sfidante.
  // La reazione visiva alla mossa resta locale: scintille sui sassi rimossi e ribbon breve.
  if (typeof clearVisualEffects === 'function') clearVisualEffects();
  const tone = actor === 'cpu' ? 'cpu' : 'player';

  // V31: niente più stone-sparks centrali sulle mosse normali.

  if (move && move.count) {
    const opponent = typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null;
    const who = actor === 'cpu'
      ? (typeof getOpponentScoreName === 'function' ? getOpponentScoreName(opponent) : 'Sfidante')
      : 'Tu';
    flashActionRibbon(`${who}: -${move.count} sasso${move.count > 1 ? 'i' : ''}`, tone);
  }
};

window.flashResultEffect = function flashResultEffect(playerWon) {
  const result = document.querySelector('.panel-result');
  if (!result) return;
  result.classList.remove('win-impact', 'lose-impact');
  void result.offsetWidth;
  result.classList.add(playerWon ? 'win-impact' : 'lose-impact');
};
