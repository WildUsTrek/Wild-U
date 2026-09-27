(function installStoryFlowController(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.contracts) throw new Error('Integration contracts must load before story flow.');

  function unavailableCapability(capabilityId) {
    return Object.freeze({ capabilityId, available: false });
  }

  function StoryFlowController(options) {
    const settings = options || {};
    this.registry = settings.registry;
    this.eventBus = settings.eventBus;
    this.route = settings.route;
    this.exitBridge = settings.exitBridge;
    this.childWorld = settings.childWorld;
    this.audio = settings.audio;
    this.battle = settings.battle;
    this.playerSession = settings.playerSession;
    this.networkCache = settings.networkCache;
    this.flags = settings.flags;
    this.state = 'idle';
    this.initialized = false;
    this.exitPromise = null;
    this.entryPromise = null;
    this.entryOperation = null;
    this.battlePromise = null;
    this.battleMenuReturnPromise = null;
    this.battleApplicationWaiters = new Map();

    this.eventBus.on('child:exit-requested', (payload) => {
      this.exitToMother(payload && payload.reason || 'child-close-game').catch((error) => {
        this.reportError(error, 'exit-failed');
      });
    });
    // ENTRY-07: enter() alone owns readiness UI and battle recovery.
    // The adapter latches channel-bound readiness even if it arrives early.
    this.eventBus.on('child:world-error', (payload) => {
      if (this.state !== 'mounted') return;
      const error = new Error(payload && payload.message || 'Child world failed to initialize.');
      this.reportError(error, 'world-error');
    });
    this.eventBus.on('child:battle-requested', (payload) => {
      this.startStoryBattle(payload).catch((error) => {
        const requestId = payload && payload.requestId;
        if (requestId && this.childWorld && this.childWorld.state === 'mounted') {
          try {
            const aborted = this.createAbortedBattleResult(requestId);
            this.childWorld.deliverBattleResult(aborted).catch(() => null);
          } catch (ignored) {}
        }
        this.reportError(error, 'battle-failed');
      });
    });
    this.eventBus.on('child:battle-result-applied', (payload) => {
      const waiter = payload && this.battleApplicationWaiters.get(payload.requestId);
      if (waiter) waiter.resolve(payload);
      this.eventBus.emit('story:battle-result-applied', payload || null);
    });
    this.eventBus.on('audio:policy-changed', (payload) => {
      if (!this.flags.enableUnifiedAudio || !this.childWorld || !['mounted','paused'].includes(this.childWorld.state)) return;
      // Read current authority, including changes while the world is in battle.
      this.childWorld.applyAudioPolicy(this.audio.getChildPolicy()).catch((error) => {
        this.reportError(error, 'child-audio-policy-failed');
      });
    });
  }

  StoryFlowController.prototype.reportError = function reportError(error, phase) {
    const shell = this.registry.get('mother-shell');
    if (shell && typeof shell.setStoryStatus === 'function') {
      shell.setStoryStatus('error', 'Impossibile aprire il mondo storia');
    }
    this.eventBus.emit('story:error', Object.freeze({
      phase: String(phase || 'unknown'),
      message: String(error && error.message || error)
    }));
  };

  StoryFlowController.prototype.createChildContext = function createChildContext() {
    return Object.freeze({
      audio: this.audio,
      battle: this.battle,
      cache: unavailableCapability('cache'),
      networkCache: this.networkCache || unavailableCapability('network-cache'),
      savegame: unavailableCapability('savegame'),
      playerSession: this.playerSession && this.playerSession.isEnabled()
        ? this.playerSession
        : unavailableCapability('player-session'),
      router: this.route,
      exit: this.exitBridge,
      events: this.eventBus
    });
  };

  StoryFlowController.prototype.initialize = function initialize() {
    if (this.initialized) return;
    if (global.document && global.document.body) {
      global.document.body.dataset.storyMenuContract = 'route-owned-v2';
    }
    const shell = this.registry.require('mother-shell');
    const enabled = !!(this.flags.enableStoryWorldAdapter && this.childWorld);
    shell.setStoryAvailable(enabled);
    if (enabled) {
      if (this.playerSession && this.playerSession.isEnabled()) {
        this.playerSession.initialize().catch((error) => this.reportError(error, 'player-session-init-failed'));
      }
      shell.bindStoryEntry(() => this.enter().catch((error) => {
        if (error && error.code === 'STORY_ENTRY_CANCELLED') return;
        this.reportError(error, 'enter-failed');
      }));
    }
    this.initialized = true;
  };

  StoryFlowController.prototype.assertEntryCurrent = function assertEntryCurrent(operation) {
    if (operation && (operation !== this.entryOperation || operation.error)) {
      throw operation.error || root.contracts.contractError('STORY_ENTRY_CANCELLED', 'Story entry was cancelled.');
    }
  };

  StoryFlowController.prototype.enter = function enter() {
    if (this.entryPromise) return this.entryPromise;
    if (!this.flags.enableStoryWorldAdapter || !this.childWorld) return Promise.reject(root.contracts.contractError('FEATURE_DISABLED', 'Story world adapter is disabled.'));
    if (this.state !== 'idle') return Promise.reject(root.contracts.contractError('STORY_FLOW_BUSY', `Cannot enter story from state ${this.state}.`));
    const shell = this.registry.require('mother-shell');
    const container = shell.getStoryContainer();
    const operation = { error: null };
    this.entryOperation = operation;
    const cancelled = new Promise((resolve, reject) => {
      operation.cancel = (code) => {
        if (operation.error) return;
        operation.error = root.contracts.contractError(code || 'STORY_ENTRY_CANCELLED', 'Story entry interrupted; retry from the menu.');
        reject(operation.error);
      };
    });
    cancelled.catch(() => null);
    const step = async (work) => {
      this.assertEntryCurrent(operation);
      const value = await Promise.race([Promise.resolve().then(() => { this.assertEntryCurrent(operation); return work(); }), cancelled]);
      this.assertEntryCurrent(operation);
      return value;
    };
    const timer = global.setTimeout(() => operation.cancel('STORY_ENTRY_TIMEOUT'), 60000);
    this.state = 'mounting';
    this.entryPromise = (async () => { try {
      shell.setStoryStatus('loading', 'Caricamento mondo');
      if (this.flags.enableUnifiedAudio) this.audio.transitionTo('story-world', { source: 'mother-menu' });
      else shell.suspendMotherMenuAudio();
      this.route.transition('story-world', { source: 'mother-menu' });
      shell.showStoryScreen();
      if (this.playerSession && this.playerSession.isEnabled()) {
        await step(() => this.playerSession.initialize());
        const restored = await step(() => this.playerSession.restoreLatestIfNeeded(() => this.assertEntryCurrent(operation)));
        if (restored && restored.ok === false) throw root.contracts.contractError('STORY_RESTORE_FAILED', 'Existing story save could not be restored safely.');
      }
      try {
        const cloudSave = global.GuerraDeiSassiCloudSave;
        if (cloudSave && typeof cloudSave.initialize === 'function') await step(() => cloudSave.initialize());
      } catch (_) { this.assertEntryCurrent(operation); }
      await step(() => this.childWorld.mount(container, this.createChildContext()));
      const ready = await step(() => this.childWorld.waitForWorldReady());
      if (!ready || ready.entryReady !== true) throw root.contracts.contractError('STORY_WORLD_NOT_READY', `Story state/restore not ready: ${ready && ready.reason || 'unknown'}`);
      if (this.flags.enableUnifiedAudio) await step(() => this.childWorld.applyAudioPolicy(this.audio.getChildPolicy()));
      await step(() => this.recoverPendingBattle(operation));
      let checkpointWarning = false;
      try {
        const checkpoint = await step(() => this.checkpointStory('enter-story-world', { route: 'story-world' }, operation));
        checkpointWarning = !!(checkpoint && checkpoint.ok === false);
      } catch (error) {
        this.assertEntryCurrent(operation);
        checkpointWarning = true;
        this.eventBus.emit('story:entry-checkpoint-warning', Object.freeze({ message: String(error && error.message || error) }));
      }
      this.assertEntryCurrent(operation);
      this.state = 'mounted';
      this.childWorld.setInteractive(true);
      shell.setStoryStatus('ready', checkpointWarning ? 'Mondo pronto - salvataggio locale non confermato' : 'Mondo pronto');
      this.eventBus.emit('story:entered', Object.freeze({ route: 'story-world' }));
      return { ok: true, state: this.state };
    } catch (error) {
      if (this.entryOperation === operation) {
        await this.childWorld.unmount('story-enter-failed').catch(() => null);
        if (this.entryOperation === operation) {
          if (this.route.state === 'story-world') this.route.toMotherMenu({ reason: 'story-enter-failed' });
          shell.showMotherMenu();
          if (this.flags.enableUnifiedAudio) this.audio.resetTo('mother-menu', { reason: 'story-enter-failed' });
          else shell.restoreMotherMenuAudio();
          this.state = 'idle';
        }
      }
      throw error;
    } finally {
      global.clearTimeout(timer);
      if (this.entryOperation === operation) { this.entryOperation = null; this.entryPromise = null; }
    } })();
    return this.entryPromise;
  };

  StoryFlowController.prototype.createAbortedBattleResult = function createAbortedBattleResult(requestId) {
    return root.contracts.normalizeBattleResult({
      requestId,
      status: 'aborted',
      rewards: null,
      storyStatePatch: null,
      returnTo: 'game-world'
    }, requestId);
  };

  StoryFlowController.prototype.checkpointStory = async function checkpointStory(reason, detail, entryOperation) {
    const childCheckpoint = await this.childWorld.flushCheckpoint(reason);
    if (entryOperation) this.assertEntryCurrent(entryOperation);
    if (!childCheckpoint || childCheckpoint.ok !== true || childCheckpoint.localCheckpointConfirmed !== true) {
      const error = root.contracts.contractError('CHILD_CHECKPOINT_UNCONFIRMED', 'Latest story checkpoint was not confirmed.');
      error.saveOutcome = {ok:false,localCheckpointConfirmed:false,reason:'child-checkpoint-unconfirmed'};
      throw error;
    }
    let durable;
    try {
      if (!this.playerSession || !this.playerSession.isEnabled()) durable = {ok:true,disabled:true};
      else if (this.durableCheckpointPromise) durable = {ok:false,reason:'durable-checkpoint-pending'};
      else {
        // Bound the caller, not the underlying IndexedDB transaction. Retain
        // its owner until settlement so another exit cannot start a duplicate.
        const operation = Promise.resolve().then(() => this.playerSession.writeCheckpoint(reason,Object.assign({route:this.route.state,childCheckpoint},detail || {})));
        const tracked = operation.catch(() => ({ok:false,reason:'durable-checkpoint-failed'})).finally(() => { if (this.durableCheckpointPromise === tracked) this.durableCheckpointPromise = null; });
        this.durableCheckpointPromise = tracked;
        let timer;
        try {
          durable = await Promise.race([tracked,new Promise((resolve) => { timer = global.setTimeout(() => resolve({ok:false,reason:'durable-checkpoint-pending'}),3000); })]);
        } finally { if (timer) global.clearTimeout(timer); }
      }
    } catch (_) { durable = {ok:false,reason:'durable-checkpoint-failed'}; }
    if (entryOperation) this.assertEntryCurrent(entryOperation);
    if (durable && durable.ok === false) {
      this.eventBus.emit('story:checkpoint-durability-warning',Object.freeze({reason:durable.reason || 'durable-checkpoint-failed'}));
    }
    let cloud = {ok:false,reason:'cloud-unavailable'};
    try {
      const cloudSave = global.GuerraDeiSassiCloudSave;
      if (cloudSave && typeof cloudSave.markDirty === 'function') cloudSave.markDirty(`story-checkpoint:${String(reason || 'checkpoint')}`);
      if (cloudSave && /exit|close/i.test(String(reason || '')) && typeof cloudSave.flush === 'function') {
        cloud = await cloudSave.flush('story-exit', { force: true });
      }
    } catch (_) {}
    const durableCheckpointStatus = durable && durable.ok === false
      ? (durable.reason === 'durable-checkpoint-pending' ? 'pending' : 'failed')
      : (durable && durable.disabled ? 'disabled' : 'confirmed');
    return { ok:!durable || durable.ok !== false, localCheckpointConfirmed:true, durableCheckpointStatus, childCheckpoint, durable, cloud };
  };

  StoryFlowController.prototype.waitForBattleApplication = function waitForBattleApplication(requestId, timeoutMs) {
    if (this.battleApplicationWaiters.has(requestId)) {
      return Promise.reject(root.contracts.contractError('DUPLICATE_BATTLE_WAITER', 'Battle application waiter already exists.'));
    }
    return new Promise((resolve, reject) => {
      const timer = global.setTimeout(() => {
        this.battleApplicationWaiters.delete(requestId);
        reject(root.contracts.contractError('BATTLE_APPLICATION_TIMEOUT', 'Child did not acknowledge battle result application.'));
      }, timeoutMs || 15000);
      this.battleApplicationWaiters.set(requestId, {
        resolve: (payload) => {
          global.clearTimeout(timer);
          this.battleApplicationWaiters.delete(requestId);
          resolve(payload);
        }
      });
    });
  };

  StoryFlowController.prototype.recoverPendingBattle = async function recoverPendingBattle(entryOperation) {
    if (!this.playerSession || !this.playerSession.isEnabled() || !this.childWorld || this.childWorld.state !== 'mounted') return null;
    const pending = await this.playerSession.getRecoverableBattle();
    if (entryOperation) this.assertEntryCurrent(entryOperation);
    if (!pending) return null;
    const shell = this.registry.require('mother-shell');
    shell.setStoryStatus('recovering', 'Ripristino esito sfida');
    const application = await this.childWorld.applyRecoveredBattleResult({
      request: pending.request,
      result: pending.result
    });
    if (entryOperation) this.assertEntryCurrent(entryOperation);
    await this.playerSession.markBattleResultApplied(pending.requestId, application, entryOperation ? () => this.assertEntryCurrent(entryOperation) : null);
    if (entryOperation) this.assertEntryCurrent(entryOperation);
    await this.checkpointStory(`after-${pending.result.status}`, {
      requestId: pending.requestId,
      recovered: true,
      application
    }, entryOperation);
    if (entryOperation) this.assertEntryCurrent(entryOperation);
    shell.setStoryStatus('ready', 'Mondo pronto');
    this.eventBus.emit('story:battle-recovered', Object.freeze({ requestId: pending.requestId, status: pending.result.status }));
    return application;
  };

  StoryFlowController.prototype.startStoryBattle = function startStoryBattle(childRequest) {
    if (this.battlePromise) return this.battlePromise;
    if (!this.flags.enableBattleBridge) {
      throw root.contracts.contractError('FEATURE_DISABLED', 'Battle bridge is disabled.');
    }
    if (this.state !== 'mounted' || !this.childWorld) {
      throw root.contracts.contractError('STORY_NOT_MOUNTED', 'Story battle requires a mounted child world.');
    }

    const request = root.BattleCatalog.createRequest(childRequest);
    const shell = this.registry.require('mother-shell');
    this.battlePromise = (async () => {
      let paused = false;
      let result = null;
      let application = null;
      let journalCreated = false;
      let battleAudioStarted = false;
      try {
        this.state = 'battle-preparing';
        shell.setStoryStatus('saving', 'Salvataggio prima della sfida');
        await this.checkpointStory('before-battle', { requestId: request.requestId, encounterId: request.encounterId });
        if (this.playerSession && this.playerSession.isEnabled()) {
          await this.playerSession.recordBattleRequest(request);
          journalCreated = true;
        }
        await this.childWorld.pause('story-battle');
        paused = true;
        if (this.flags.enableUnifiedAudio) {
          this.audio.transitionTo('mother-battle', { opponentId: request.opponentId, encounterId: request.encounterId });
          battleAudioStarted = true;
        }
        this.route.transition('story-battle', {
          requestId: request.requestId,
          encounterId: request.encounterId,
          opponentId: request.opponentId
        });
        this.state = 'battle';
        result = await this.battle.requestBattle(request);
      } catch (error) {
        result = this.createAbortedBattleResult(request.requestId);
        this.eventBus.emit('story:battle-error', Object.freeze({
          requestId: request.requestId,
          encounterId: request.encounterId,
          message: String(error && error.message || error)
        }));
      }

      if (this.playerSession && this.playerSession.isEnabled() && journalCreated) {
        await this.playerSession.recordBattleResult(request, result);
      }
      if (this.route.state === 'story-battle') {
        this.route.transition('story-world', { requestId: request.requestId, status: result.status });
      }
      if (battleAudioStarted) {
        this.audio.restorePreviousScene({ requestId: request.requestId, status: result.status });
      }
      shell.showStoryScreen();
      const applicationPromise = result.status === 'victory' || result.status === 'defeat'
        ? this.waitForBattleApplication(result.requestId)
        : null;
      await this.childWorld.deliverBattleResult(result);
      application = applicationPromise
        ? await applicationPromise
        : { requestId: result.requestId, status: result.status, applied: true, aborted: true };
      if (this.playerSession && this.playerSession.isEnabled() && journalCreated) {
        await this.playerSession.markBattleResultApplied(result.requestId, application);
        await this.checkpointStory(`after-${result.status}`, {
          requestId: result.requestId,
          encounterId: request.encounterId,
          application
        });
      }
      if (paused && this.childWorld.state === 'paused') {
        if (this.flags.enableUnifiedAudio) await this.childWorld.applyAudioPolicy(this.audio.getChildPolicy());
        await this.childWorld.resume('story-battle-return');
      }
      this.state = 'mounted';
      shell.setStoryStatus('ready', 'Mondo pronto');
      this.eventBus.emit('story:battle-returned', Object.freeze({
        requestId: result.requestId,
        encounterId: request.encounterId,
        opponentId: request.opponentId,
        status: result.status,
        route: 'story-world'
      }));
      return result;
    })().finally(() => {
      this.battlePromise = null;
    });
    return this.battlePromise;
  };

  StoryFlowController.prototype.ownsStoryBattleMenu = function ownsStoryBattleMenu() {
    if (!this.childWorld || !['mounted', 'paused'].includes(this.childWorld.state)) return false;
    return !!this.battlePromise
      || this.route.state === 'story-battle'
      || ['battle-preparing', 'battle'].includes(this.state);
  };

  StoryFlowController.prototype.waitForBattleBridgeIdle = async function waitForBattleBridgeIdle(timeoutMs) {
    const deadline = Date.now() + Math.max(250, Number(timeoutMs) || 5000);
    while (this.battle.activeRequest && Date.now() < deadline) {
      await new Promise((resolve) => global.setTimeout(resolve, 25));
    }
    if (this.battle.activeRequest) {
      throw root.contracts.contractError('BATTLE_ABORT_TIMEOUT', 'Story battle did not become idle after abort.');
    }
  };

  StoryFlowController.prototype.recoverOrphanedStoryBattleMenu = async function recoverOrphanedStoryBattleMenu(reason) {
    const shell = this.registry.require('mother-shell');
    const safeReason = String(reason || 'mother-battle-menu-orphan-recovery');

    if (this.battle.activeRequest) {
      await this.battle.abortActive(safeReason);
      await this.waitForBattleBridgeIdle(5000);
      await new Promise((resolve) => global.setTimeout(resolve, 0));
    }
    if (this.route.state === 'story-battle') {
      this.route.transition('story-world', { reason: safeReason, recoveredOrphan: true });
    }
    if (this.flags.enableUnifiedAudio) {
      const audioStatus = this.audio.status();
      const scenes = audioStatus && Array.isArray(audioStatus.sceneStack) ? audioStatus.sceneStack : [];
      if (scenes[scenes.length - 1] === 'mother-battle') {
        this.audio.restorePreviousScene({ reason: safeReason, recoveredOrphan: true });
      }
    }
    shell.showStoryScreen();
    if (this.childWorld.state === 'paused') {
      if (this.flags.enableUnifiedAudio) await this.childWorld.applyAudioPolicy(this.audio.getChildPolicy());
      await this.childWorld.resume('story-battle-menu-orphan-recovery');
    }
    if (this.childWorld.state !== 'mounted') {
      throw root.contracts.contractError('INVALID_CHILD_STATE', `Cannot recover Story menu with child state ${this.childWorld.state}.`);
    }
    this.state = 'mounted';
    shell.setStoryStatus('ready', 'Mondo pronto');
    await this.checkpointStory('story-battle-menu-orphan-recovery', {
      route: 'story-world',
      recoveredOrphan: true
    });
    this.eventBus.emit('story:battle-menu-orphan-recovered', Object.freeze({
      reason: safeReason,
      route: this.route.state,
      childState: this.childWorld.state
    }));
  };

  StoryFlowController.prototype.requestChildMenuFromStoryBattle = function requestChildMenuFromStoryBattle(reason) {
    if (this.battleMenuReturnPromise) return true;
    if (!this.ownsStoryBattleMenu()) return false;

    const safeReason = String(reason || 'mother-battle-menu');
    const pendingBattle = this.battlePromise;
    this.eventBus.emit('story:child-menu-requested', Object.freeze({
      reason: safeReason,
      state: this.state,
      route: this.route.state,
      orphanRecovery: !pendingBattle
    }));
    this.battleMenuReturnPromise = Promise.resolve()
      .then(() => pendingBattle
        ? Promise.resolve(this.battle.abortActive(safeReason)).then(() => pendingBattle)
        : this.recoverOrphanedStoryBattleMenu(safeReason))
      .then(() => this.childWorld.openPauseMenu(safeReason))
      .then((menuResult) => {
        this.eventBus.emit('story:child-menu-opened', Object.freeze({
          reason: safeReason,
          route: this.route.state,
          result: menuResult || null
        }));
        return menuResult;
      })
      .catch((error) => {
        const shell = this.registry.get('mother-shell');
        if (shell && typeof shell.setStoryStatus === 'function' && this.state === 'mounted') {
          shell.setStoryStatus('ready', 'Mondo pronto');
        }
        this.eventBus.emit('story:child-menu-error', Object.freeze({
          reason: safeReason,
          message: String(error && error.message || error)
        }));
        return null;
      })
      .finally(() => {
        this.battleMenuReturnPromise = null;
      });
    return true;
  };

  StoryFlowController.prototype.exitToMother = function exitToMother(reason) {
    if (this.exitPromise) return this.exitPromise;
    if (this.entryOperation && this.state === 'mounting') {
      // Input remains disabled until entry commits: do not save default state on cancel.
      this.entryOperation.cancel('STORY_ENTRY_CANCELLED');
      return this.entryPromise.then(() => ({ok:true,cancelled:true}), () => ({ok:true,cancelled:true}));
    }
    if (this.battlePromise) {
      return Promise.reject(root.contracts.contractError('BATTLE_BUSY', 'Cannot exit the story while a battle is active.'));
    }
    if (this.state === 'idle') return Promise.resolve({ ok: true, alreadyExited: true });

    const shell = this.registry.require('mother-shell');
    this.state = 'exiting';
    shell.setStoryStatus('exiting', 'Salvataggio partita');
    this.exitPromise = (async () => {
      try {
        let checkpoint;
        try {
          checkpoint = await this.checkpointStory(reason || 'child-exit', { exitTo: 'mother-menu' });
        } catch (error) {
          checkpoint = error.saveOutcome || {ok:false,localCheckpointConfirmed:false,reason:'checkpoint-failed'};
          this.eventBus.emit('story:checkpoint-unconfirmed',Object.freeze({reason:checkpoint.reason}));
        }
        global.GuerraDeiSassiLastSaveOutcome = checkpoint;
        const localCheckpointFailed = checkpoint.localCheckpointConfirmed !== true;
        const durableCheckpointFailed = checkpoint.durableCheckpointStatus === 'failed';
        const checkpointFailureMessage = localCheckpointFailed
          ? 'L’ultima posizione non è stata salvata sul dispositivo. Vuoi uscire comunque? Annulla per restare nel mondo e riprovare.'
          : 'La partita è nella cache locale, ma la copia di recupero non è stata creata. Vuoi uscire comunque? Annulla per restare nel mondo e riprovare.';
        let failedCheckpointExitAccepted = true;
        if (localCheckpointFailed || durableCheckpointFailed) {
          failedCheckpointExitAccepted = false;
          try { failedCheckpointExitAccepted = typeof global.confirm === 'function' && global.confirm(checkpointFailureMessage); } catch (_) {}
        }
        if (!failedCheckpointExitAccepted) {
          this.state = 'mounted';
          shell.setStoryStatus('ready','Salvataggio non confermato: puoi riprovare');
          return {ok:false,cancelled:true,reason:'checkpoint-unconfirmed'};
        }
        if (this.childWorld.state === 'mounted') {
          try { await this.childWorld.pause(reason || 'child-exit'); }
          catch (error) {
            // Exit was accepted above. A failed pause must not skip bounded
            // unmount; diagnostics are best-effort and contain no save payload.
            try { this.eventBus.emit('story:exit-pause-warning', Object.freeze({ code: 'CHILD_PAUSE_FAILED_DURING_EXIT' })); } catch (ignored) {}
          }
        }
        await this.childWorld.unmount(reason || 'child-exit');
        this.exitBridge.exitChildToMother(reason || 'child-exit');
        shell.showMotherMenu();
        if (typeof global.flashActionRibbon === 'function') {
          const cloudSave = global.GuerraDeiSassiCloudSave;
          const message = checkpoint.localCheckpointConfirmed !== true
            ? 'Ultima posizione non salvata: non chiudere se vuoi riprovare'
            : (cloudSave && typeof cloudSave.describeOutcome === 'function' ? cloudSave.describeOutcome(checkpoint.cloud) : 'Salvataggio online non confermato');
          global.flashActionRibbon(message,checkpoint.cloud && checkpoint.cloud.onlineConfirmed ? 'good' : 'bad');
        }
        if (this.flags.enableUnifiedAudio) this.audio.resetTo('mother-menu', { reason: reason || 'child-exit' });
        else shell.restoreMotherMenuAudio();
        this.state = 'idle';
        shell.setStoryStatus('idle', '');
        this.eventBus.emit('story:exited', Object.freeze({ route: 'mother-menu', reason: String(reason || 'child-exit') }));
        return { ok: true, state: this.state };
      } finally {
        this.exitPromise = null;
      }
    })();
    return this.exitPromise;
  };

  root.StoryFlowController = StoryFlowController;
})(window);
