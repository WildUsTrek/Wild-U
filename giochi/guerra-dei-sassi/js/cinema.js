window.__cinemaTimer = window.__cinemaTimer || null;
window.__cinemaVoiceTimer = window.__cinemaVoiceTimer || null;

function getCinemaOpponent(opponent) {
  return opponent || (typeof getCurrentOpponent === 'function' ? getCurrentOpponent() : null) || (window.OPPONENTS && window.OPPONENTS[0]) || null;
}

function cinemaSafeText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cinemaSlug(value) {
  return String(value || 'arena').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
}

function cinemaEnvLabel(opponent) {
  if (!opponent) return 'Arena dei Sassi';
  const labels = {
    stream: 'Torrente dei Ciottoli',
    quarry: 'Cava del Basalto',
    ravine: 'Forra della Selce',
    forge: 'Forgia Pietrafocaia',
    'volcano-dance': 'Pedana dei Lapilli',
    'moss-ruins': 'Rovine del Granito',
    'crystal-cave': 'Grotta del Quarzo',
    blackboard: 'Aula Ossidiana',
    'old-camp': 'Campo di Imperio'
  };
  return labels[opponent.environment] || 'Arena dei Sassi';
}

function getOpponentShortName(opponent) {
  if (!opponent || !opponent.name) return 'Sfidante';
  return String(opponent.name).split(' ')[0] || opponent.name;
}

function getSpriteMood(mood) {
  if (mood === 'win' || mood === 'happy') return 'win';
  if (mood === 'lose' || mood === 'mad' || mood === 'worried') return 'lose';
  return 'intro';
}

function getArenaAssetPath(opponent) {
  const op = getCinemaOpponent(opponent);
  return `assets/backgrounds/${cinemaSlug(op.environment || 'stream')}.svg`;
}

function getBodyAssetPath(opponent, mood) {
  const op = getCinemaOpponent(opponent);
  return `assets/bodies/${cinemaSlug(op.id || op.portrait || 'nina-ciottolo')}-${getSpriteMood(mood)}.svg`;
}

function getCharacterClass(opponent) {
  const p = opponent && opponent.portrait ? opponent.portrait : (opponent && opponent.id ? opponent.id : 'nina');
  return cinemaSlug(p);
}

function getHeadProfile(opponent) {
  const id = opponent && opponent.id ? opponent.id : 'nina-ciottolo';
  // V29: la testa non deve più galleggiare. Si abbassa il volto dentro il busto
  // e si elimina il collare/collo HTML: il raccordo è ottenuto per sovrapposizione.
  const profiles = {
    'nina-ciottolo': { size: 158, x: 50, y: 82, body: 112 },
    'bruno-basalto': { size: 154, x: 50, y: 86, body: 120 },
    'mara-selce': { size: 156, x: 50, y: 84, body: 111 },
    'teo-pietrafocaia': { size: 158, x: 50, y: 82, body: 112 },
    'lalla-lapillo': { size: 160, x: 50, y: 82, body: 112 },
    'orbo-granito': { size: 152, x: 50, y: 88, body: 123 },
    'zelda-quarzo': { size: 162, x: 50, y: 80, body: 114 },
    'prof-ossidiana': { size: 156, x: 50, y: 84, body: 112 },
    imperio: { size: 158, x: 50, y: 86, body: 116 }
  };
  return profiles[id] || profiles['nina-ciottolo'];
}

function renderStadiumFan(row, i, scaleBoost) {
  const hue = (row * 41 + i * 31) % 360;
  const delay = ((i % 11) * 0.11 + row * 0.09).toFixed(2);
  const scale = (scaleBoost + ((i + row) % 5) * 0.04).toFixed(2);
  return `<span class="v26-fan" style="--fan-h:${hue};--fan-d:${delay}s;--fan-s:${scale};"><i class="fan-head"></i><i class="fan-body"></i><i class="fan-arm fan-left"></i><i class="fan-arm fan-right"></i></span>`;
}

function renderStadiumCrowd(type, rows, people) {
  const rowCount = Math.max(1, Number(rows) || 3);
  const peopleCount = Math.max(10, Number(people) || 22);
  let html = '';
  for (let r = 0; r < rowCount; r += 1) {
    html += `<div class="v26-crowd-row row-${r}">`;
    for (let i = 0; i < peopleCount; i += 1) html += renderStadiumFan(r, i, 0.95 + r * 0.04);
    html += '</div>';
  }
  return `<div class="v26-crowd v26-crowd-${cinemaSafeText(type)}" aria-hidden="true">${html}</div>`;
}

window.renderBattleCharacter = function renderBattleCharacter(opponent, mood, context) {
  const op = getCinemaOpponent(opponent);
  const safeMood = getSpriteMood(mood || 'intro');
  if (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(op) && typeof renderCharacter3DBattle === 'function') {
    return renderCharacter3DBattle(op, safeMood, context || 'cinema');
  }
  const cls = getCharacterClass(op);
  const colors = Array.isArray(op.colors) ? op.colors : ['#ffd166', '#4cc9f0', '#f72585'];
  const skin = Array.isArray(op.skin) ? op.skin : ['#d49a73', '#80523e', '#f7c7a2'];
  const hp = getHeadProfile(op);
  const faceMood = safeMood === 'win' ? 'win' : (safeMood === 'lose' ? 'lose' : 'neutral');
  const face = typeof renderOpponentFaceSvg === 'function'
    ? renderOpponentFaceSvg(op, faceMood, `battle-clean-v27-${op.id}-${safeMood}-${context || 'cinema'}`)
    : '';
  return `
    <div class="v26-battle-character v26-char-${cinemaSafeText(cls)} mood-${cinemaSafeText(safeMood)}" data-character="${cinemaSafeText(op.id || cls)}" data-context="${cinemaSafeText(context || 'cinema')}" style="--opponent-a:${colors[0]};--opponent-b:${colors[1]};--opponent-c:${colors[2]};--skin-main:${skin[0]};--skin-shade:${skin[1]};--skin-light:${skin[2]};--head-size:${hp.size}px;--head-x:${hp.x}%;--head-y:${hp.y}px;--body-scale:${hp.body}%;">
      <span class="v26-character-shadow"></span>
      <img class="v26-character-body" src="${cinemaSafeText(getBodyAssetPath(op, safeMood))}" alt="" aria-hidden="true" draggable="false">
      <div class="v26-character-head" aria-label="${cinemaSafeText(op.name || 'Sfidante')}">${face}</div>
    </div>`;
};


const V33_INTRO_PROFILES = {
  'nina-ciottolo': { key:'wave', transition:'wave', particle:'water', camera:'soft-left', title:'onda dei ciottoli' },
  'bruno-basalto': { key:'quake', transition:'quake', particle:'dust', camera:'heavy', title:'passo di basalto' },
  'mara-selce': { key:'slash', transition:'slash', particle:'shards', camera:'cut', title:'taglio di selce' },
  'teo-pietrafocaia': { key:'ember', transition:'ember', particle:'sparks', camera:'spark', title:'scintilla viva' },
  'lalla-lapillo': { key:'dance', transition:'dance', particle:'lapilli', camera:'sway', title:'danza dei lapilli' },
  'orbo-granito': { key:'moss', transition:'moss', particle:'moss', camera:'slow', title:'sentinella antica' },
  'zelda-quarzo': { key:'crystal', transition:'crystal', particle:'crystal', camera:'elegant', title:'riflesso di quarzo' },
  'prof-ossidiana': { key:'chalk', transition:'chalk', particle:'chalk', camera:'precise', title:'teorema dei sassi' },
  imperio: { key:'sunset', transition:'sunset', particle:'gold', camera:'solemn', title:'passo imperiale' }
};

function getIntroProfile(opponent) {
  const op = getCinemaOpponent(opponent);
  return V33_INTRO_PROFILES[(op && op.id) || 'nina-ciottolo'] || V33_INTRO_PROFILES['nina-ciottolo'];
}

function renderV33Particles(profile) {
  const type = (profile && profile.particle) || 'water';
  let html = '';
  for (let i = 0; i < 18; i += 1) {
    const x = 8 + ((i * 17) % 86);
    const y = 18 + ((i * 23) % 58);
    const d = (0.12 + (i % 7) * 0.16).toFixed(2);
    const s = (0.72 + (i % 5) * 0.11).toFixed(2);
    html += `<i style="--p-x:${x}%;--p-y:${y}%;--p-d:${d}s;--p-s:${s};"></i>`;
  }
  return `<div class="v33-intro-particles particles-${cinemaSafeText(type)}" aria-hidden="true">${html}</div>`;
}

function renderV33IntroReveal(profile, opponent) {
  const key = (profile && profile.key) || 'wave';
  const title = (profile && profile.title) || cinemaEnvLabel(opponent);
  return `
    <div class="v33-reveal-layer reveal-${cinemaSafeText(key)}" aria-hidden="true">
      <span class="v33-silhouette-mark"></span>
      <b>${cinemaSafeText(title)}</b>
    </div>`;
}

function renderArenaStageV26(opponent, mood, context) {
  const op = getCinemaOpponent(opponent);
  const env = cinemaSlug(op.environment || 'stream');
  const ctx = context || 'cinema';
  const profile = getIntroProfile(op);
  // V35: Nina usa un pilot di arena con profondità e character integrato.
  // Gli altri 8 sfidanti restano identici al sistema V33 per evitare regressioni.
  if (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(op) && typeof renderCharacter3DArena === 'function') {
    return `
    <div class="v26-scene-world v26-personal-world v33-personal-world s3d-v35-personal-world profile-${cinemaSafeText(profile.key)}" data-env="${cinemaSafeText(env)}" data-profile="${cinemaSafeText(profile.key)}">
      ${renderCharacter3DArena(op, mood, ctx)}
    </div>`;
  }
  const introFx = ctx === 'intro'
    ? `${renderV33IntroReveal(profile, op)}${renderV33Particles(profile)}`
    : (ctx === 'outro' ? renderV33Particles(profile) : '');
  return `
    <div class="v26-scene-world v26-personal-world v33-personal-world profile-${cinemaSafeText(profile.key)}" data-env="${cinemaSafeText(env)}" data-profile="${cinemaSafeText(profile.key)}">
      <img class="v26-bg-img v26-arena-bg" src="${cinemaSafeText(getArenaAssetPath(op))}" alt="" aria-hidden="true" draggable="false">
      <div class="v26-parallax-haze v33-haze"></div>
      <div class="v26-ground-ring v33-ground-ring" aria-hidden="true"></div>
      ${introFx}
      <div class="v26-character-pad v33-character-pad">${renderBattleCharacter(op, mood, ctx)}</div>
    </div>`;
}

function renderTournamentStageV26(kind) {
  const end = kind === 'tournament-end';
  const bg = end ? 'assets/backgrounds/stadium-end.svg' : 'assets/backgrounds/stadium-start.svg';
  return `
    <div class="v26-scene-world v26-stadium-world ${end ? 'stadium-end' : 'stadium-start'}">
      <img class="v26-bg-img v26-stadium-bg" src="${bg}" alt="" aria-hidden="true" draggable="false">
      ${renderStadiumCrowd('stadium-back', 4, 24)}
      <div class="v26-stadium-light-sweep"><i></i><i></i><i></i></div>
      <div class="v26-trophy ${end ? 'trophy-end' : 'trophy-start'}" aria-hidden="true"><span class="cup-core"></span><span class="cup-handle left"></span><span class="cup-handle right"></span><i></i><i></i><i></i></div>
      ${renderStadiumCrowd('stadium-front', 3, 18)}
    </div>`;
}

function renderTournamentStartPremiumBox() {
  return `
    <div class="tournament-premium-start-box" role="dialog" aria-label="Torneo dei Sassi">
      <div class="tournament-premium-glow" aria-hidden="true"></div>
      <div class="tournament-premium-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="tournament-premium-cup" aria-hidden="true">
        <span class="cup-bowl"></span>
        <span class="cup-handle left"></span>
        <span class="cup-handle right"></span>
        <span class="cup-stem"></span>
        <span class="cup-base"></span>
      </div>
      <div class="tournament-premium-copy">
        <span class="tournament-premium-kicker">Modalità torneo</span>
        <strong>Torneo dei Sassi</strong>
        <p>Sconfiggi gli sfidanti in sequenza e conquista la coppa.</p>
        <small>Regole rapide: scegli una fila, prendi pietre contigue. Standard: chi prende l’ultima pietra vince. Misère: chi prende l’ultima pietra perde.</small>
      </div>
      <button class="tournament-premium-start-btn" type="button" data-tournament-start-btn>Inizia torneo</button>
    </div>`;
}

function getCinemaCopy(kind, options, opponent) {
  const playerWon = !!options.playerWon;
  const gradeUp = !!options.gradeUp;
  const tournamentCompleted = !!options.tournamentCompleted;
  if (kind === 'tournament-start') {
    return { title: 'TORNEO DEI SASSI', subtitle: 'Lo stadio si accende. La scalata comincia.', badge: 'Apertura torneo', mood: 'intro', sceneClass: 'cinema-tournament-start' };
  }
  if (kind === 'tournament-end') {
    return { title: 'TORNEO COMPLETATO', subtitle: 'La coppa dei sassi è tua.', badge: 'Trionfo finale', mood: 'win', sceneClass: 'cinema-tournament-end' };
  }
  if (kind === 'outro') {
    return { title: playerWon ? 'SFIDA VINTA' : 'SFIDA PERSA', subtitle: playerWon ? `${getOpponentShortName(opponent)} arretra.` : `${getOpponentShortName(opponent)} domina la scena.`, badge: gradeUp ? 'Nuovo grado' : (tournamentCompleted ? 'Finale torneo' : cinemaEnvLabel(opponent)), mood: playerWon ? 'lose' : 'win', sceneClass: playerWon ? 'cinema-outro-win' : 'cinema-outro-lose' };
  }
  const rankInfo = typeof getOpponentRankInfo === 'function' ? getOpponentRankInfo(opponent) : { fullLabel: getCpuDifficultyLabel(opponent) };
  return { title: `${opponent.name} entra in campo`, subtitle: cinemaEnvLabel(opponent), badge: rankInfo.fullLabel || rankInfo.label, mood: 'intro', sceneClass: 'cinema-intro' };
}

function renderCinemaCard(kind, opts) {
  const options = opts || {};
  const opponent = getCinemaOpponent(options.opponent);
  const copy = getCinemaCopy(kind || 'intro', options, opponent);
  const colors = Array.isArray(opponent.colors) ? opponent.colors : ['#ffd166', '#4cc9f0', '#f72585'];
  const env = cinemaSlug(opponent.environment || 'arena');
  const isTournamentScene = kind === 'tournament-start' || kind === 'tournament-end';
  const profile = getIntroProfile(opponent);
  if (kind === 'tournament-start') {
    return `
      <div class="cinema-scene-v26 cinema-tournament-premium-start v37-tournament-premium" data-env="tournament" style="--opponent-a:${colors[0]};--opponent-b:${colors[1]};--opponent-c:${colors[2]};">
        ${renderTournamentStartPremiumBox()}
      </div>`;
  }
  const sceneWorld = isTournamentScene ? renderTournamentStageV26(kind || 'tournament-start') : renderArenaStageV26(opponent, copy.mood, kind || 'intro');
  const gradeSpark = options.gradeUp ? '<span class="lower-spark">GRADO!</span>' : '';
  const is3DScene = !isTournamentScene && typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(opponent);
  const isIntroScene = (kind || 'intro') === 'intro';
  const extraSceneClass = `${is3DScene ? ' s3d-cinema-scene' : ''}${is3DScene && isIntroScene ? ' s3d-intro-reveal-scene' : ''}`;
  return `
    <div class="cinema-scene-v26 ${copy.sceneClass} ${isTournamentScene ? 'cinema-stadium-scene' : 'cinema-personal-arena'} v33-profile-${cinemaSafeText(profile.key)}${extraSceneClass}" data-env="${cinemaSafeText(env)}" style="--opponent-a:${colors[0]};--opponent-b:${colors[1]};--opponent-c:${colors[2]};">
      ${!isTournamentScene && isIntroScene && !is3DScene ? `<div class="cinema-battle-transition-v33 transition-${cinemaSafeText(profile.transition)}" aria-hidden="true"><i></i><i></i><i></i><span></span></div>` : ''}
      <div class="cinema-camera-frame-v26">
        ${sceneWorld}
      </div>
      <div class="cinema-lower-third-v26">
        <span class="cinema-badge-v26">${cinemaSafeText(copy.badge)}</span>
        <strong>${cinemaSafeText(copy.title)}</strong>
        <small>${cinemaSafeText(copy.subtitle)}</small>
        ${gradeSpark}
      </div>
    </div>`;
}

window.renderChallengeResultSceneV27 = function renderChallengeResultSceneV27(opponent, mood, options) {
  const op = getCinemaOpponent(opponent);
  const opts = options || {};
  const colors = Array.isArray(op.colors) ? op.colors : ['#ffd166', '#4cc9f0', '#f72585'];
  const resultMood = opts.playerWon ? 'lose' : 'win';
  if (typeof hasCharacter3DPilot === 'function' && hasCharacter3DPilot(op) && typeof renderCharacter3DArena === 'function') {
    return `
    <div class="challenge-result-stage-v27 ${opts.playerWon ? 'player-victory' : 'opponent-victory'} s3d-v35-result-stage" data-env="${cinemaSafeText(op.environment || 'arena')}" style="--opponent-a:${colors[0]};--opponent-b:${colors[1]};--opponent-c:${colors[2]};">
      <div class="challenge-result-camera-v27">
        ${renderCharacter3DArena(op, resultMood, 'result-clean-v27')}
      </div>
    </div>`;
  }
  return `
    <div class="challenge-result-stage-v27 ${opts.playerWon ? 'player-victory' : 'opponent-victory'}" data-env="${cinemaSafeText(op.environment || 'arena')}" style="--opponent-a:${colors[0]};--opponent-b:${colors[1]};--opponent-c:${colors[2]};">
      <div class="challenge-result-camera-v27">
        <img class="v26-bg-img result-arena-bg-v26" src="${cinemaSafeText(getArenaAssetPath(op))}" alt="" aria-hidden="true" draggable="false">
        <div class="v26-parallax-haze result-haze-v26"></div>
        <div class="v26-ground-ring result-ring-v26" aria-hidden="true"></div>
        <div class="result-character-pad-v26">${renderBattleCharacter(op, resultMood, 'result-clean-v27')}</div>
      </div>
    </div>`;
};

window.dismissBattleCinema = function dismissBattleCinema(options) {
  const opts = options || {};
  const overlay = document.getElementById('battle-cinema');
  const card = document.getElementById('battle-cinema-card');
  const session = window.__battleCinemaSession || null;
  if (session && session.closed) return false;
  if (session) session.closed = true;
  if (window.__cinemaTimer) window.clearTimeout(window.__cinemaTimer);
  if (window.__cinemaVoiceTimer) window.clearTimeout(window.__cinemaVoiceTimer);
  window.__cinemaTimer = null;
  window.__cinemaVoiceTimer = null;
  if (overlay) {
    overlay.className = 'battle-cinema';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.removeProperty('--cinema-duration');
    overlay.onclick = null;
  }
  if (card) {
    if (typeof window.disposeCharacter3DWithin === 'function') window.disposeCharacter3DWithin(card);
    card.replaceChildren();
  }
  window.__battleCinemaSession = null;
  if (typeof window.syncCharacter3DActivity === 'function') window.syncCharacter3DActivity();
  if (opts.invokeDone && session && typeof session.onDone === 'function') session.onDone();
  return !!session;
};

window.showBattleCinema = function showBattleCinema(kind, options) {
  const overlay = document.getElementById('battle-cinema');
  const card = document.getElementById('battle-cinema-card');
  if (!overlay || !card) {
    if (options && typeof options.onDone === 'function') options.onDone();
    return;
  }
  const opts = options || {};
  window.dismissBattleCinema({ invokeDone: false, reason: 'replace-cinema' });
  const session = { closed: false, onDone: typeof opts.onDone === 'function' ? opts.onDone : null };
  window.__battleCinemaSession = session;
  overlay.className = `battle-cinema visible ${kind || 'intro'} v26-cinema v27-cinema v28-cinema v29-cinema v30-cinema v31-cinema v33-cinema`;
  overlay.setAttribute('aria-hidden', 'false');
  card.innerHTML = renderCinemaCard(kind || 'intro', opts);
  if (typeof hydrateCharacter3DWithin === 'function') {
    hydrateCharacter3DWithin(card, getCinemaOpponent(opts.opponent), null, kind || 'intro');
  }
  if (typeof window.syncCharacter3DActivity === 'function') window.syncCharacter3DActivity();
  if ((kind || 'intro') === 'intro' && GameState.mode === 'cpu' && typeof playOpponentBubbleVoice === 'function') {
    window.__cinemaVoiceTimer = window.setTimeout(() => {
      playOpponentBubbleVoice('win', getCinemaOpponent(opts.opponent), { delay: 0, finalLine: true, presentationLine: true });
    }, 4300);
  }
  const duration = kind === 'tournament-start'
    ? 0
    : (kind === 'tournament-end' ? 8400 : (kind === 'outro' ? 7350 : 8600));
  overlay.style.setProperty('--cinema-duration', `${duration || 1}ms`);
  const finish = () => {
    if (window.__battleCinemaSession !== session || session.closed) return;
    window.dismissBattleCinema({ invokeDone: true, reason: 'cinema-finished' });
  };

  if (kind === 'tournament-start') {
    const startBtn = card.querySelector('[data-tournament-start-btn]');
    if (startBtn) {
      startBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        finish();
      }, { once: true });
      window.setTimeout(function () { try { startBtn.focus({ preventScroll: true }); } catch (_) {} }, 60);
    }
    overlay.onclick = function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('[data-tournament-start-btn]')) finish();
    };
    return;
  }

  overlay.onclick = finish;
  window.__cinemaTimer = window.setTimeout(finish, duration);
};

window.startChallengePresentation = function startChallengePresentation(options) {
  const opts = options || {};
  if (GameState.mode !== 'cpu') {
    showScreen('game-screen');
    return;
  }
  GameState.inputLocked = true;
  renderAll();
  showScreen('game-screen');
  const unlock = () => {
    GameState.inputLocked = false;
    renderAll();
    if (GameState.currentPlayer === 2 && typeof scheduleCpuTurn === 'function') scheduleCpuTurn();
  };
  const showIntro = () => {
    const opponent = getCurrentOpponent();
    if (typeof preloadOpponentAssets === 'function') preloadOpponentAssets(opponent);
    if (typeof playOpponentRevealFanfare === 'function') playOpponentRevealFanfare(opponent, { delay: 0.50 });
    showBattleCinema('intro', { opponent, onDone: unlock });
  };
  if (opts.tournamentStart) showBattleCinema('tournament-start', { opponent: getCurrentOpponent(), onDone: showIntro });
  else showIntro();
};
