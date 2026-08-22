(function installPlayerSessionBridge(global) {
  'use strict';

  const root = global.UnifiedGameIntegration;
  if (!root || !root.contracts) throw new Error('Integration contracts must load before player session bridge.');

  const DEFAULT_DB_NAME = 'unified-game:player-session:v1';
  const DEFAULT_POINTER_KEY = 'unified-game:player-session:pointer:v1';
  const DEFAULT_LEGACY_SAVE_KEY = 'PERLA1_RTP_PASS2_SAVE_V1';
  const CHECKPOINT_STORE = 'checkpoints';
  const JOURNAL_STORE = 'battle-journal';
  const SCHEMA_VERSION = 1;

  function cloneJson(value) {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  async function sha256(value) {
    if (!global.crypto || !global.crypto.subtle || typeof global.TextEncoder !== 'function') {
      throw root.contracts.contractError('CRYPTO_UNAVAILABLE', 'SHA-256 is required for durable player-session records.');
    }
    const bytes = new TextEncoder().encode(stableStringify(value));
    const digest = await global.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((part) => part.toString(16).padStart(2, '0')).join('');
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
    });
  }

  function validLegacySave(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return false;
    try {
      const parsed = JSON.parse(raw);
      return !!parsed && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch (error) {
      return false;
    }
  }

  function PlayerSessionBridge(flags, eventBus, options) {
    const settings = options || {};
    this.flags = flags || {};
    this.eventBus = eventBus;
    this.dbName = String(settings.dbName || DEFAULT_DB_NAME);
    this.pointerKey = String(settings.pointerKey || DEFAULT_POINTER_KEY);
    this.legacySaveKey = String(settings.legacySaveKey || DEFAULT_LEGACY_SAVE_KEY);
    if (!this.dbName.startsWith('unified-game:') || !this.pointerKey.startsWith('unified-game:')) {
      throw root.contracts.contractError('INVALID_SESSION_NAMESPACE', 'Player-session storage must use the unified-game namespace.');
    }
    this.db = null;
    this.openPromise = null;
    this.runtimeCheckpoint = null;
    this.maxCheckpoints = 10;
  }

  PlayerSessionBridge.prototype.isEnabled = function isEnabled() {
    return !!this.flags.enableMobileSessionPersistence;
  };

  PlayerSessionBridge.prototype.initialize = function initialize() {
    if (!this.isEnabled()) return Promise.resolve({ ok: true, disabled: true });
    if (this.db) return Promise.resolve({ ok: true, ready: true });
    if (this.openPromise) return this.openPromise;
    if (!global.indexedDB) return Promise.reject(root.contracts.contractError('INDEXEDDB_UNAVAILABLE', 'IndexedDB is required for player-session persistence.'));
    this.openPromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(this.dbName, SCHEMA_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CHECKPOINT_STORE)) {
          const checkpoints = db.createObjectStore(CHECKPOINT_STORE, { keyPath: 'id' });
          checkpoints.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(JOURNAL_STORE)) {
          const journal = db.createObjectStore(JOURNAL_STORE, { keyPath: 'requestId' });
          journal.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => this.close();
        this.openPromise = null;
        resolve({ ok: true, ready: true });
      };
      request.onerror = () => {
        this.openPromise = null;
        reject(request.error || new Error('Unable to open player-session database.'));
      };
      request.onblocked = () => {
        this.openPromise = null;
        reject(root.contracts.contractError('INDEXEDDB_BLOCKED', 'Player-session database upgrade is blocked.'));
      };
    });
    return this.openPromise;
  };

  PlayerSessionBridge.prototype.withStore = async function withStore(storeName, mode, operation) {
    await this.initialize();
    if (!this.db) throw root.contracts.contractError('SESSION_DB_NOT_READY', 'Player-session database is not ready.');
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let request;
      try { request = operation(store); } catch (error) { reject(error); return; }
      let result;
      if (request) {
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error('Player-session store request failed.'));
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error || new Error('Player-session transaction aborted.'));
      transaction.onerror = () => reject(transaction.error || new Error('Player-session transaction failed.'));
    });
  };

  PlayerSessionBridge.prototype.seal = async function seal(record) {
    const clean = cloneJson(record);
    clean.checksum = await sha256(clean);
    return Object.freeze(clean);
  };

  PlayerSessionBridge.prototype.verify = async function verify(record) {
    if (!record || typeof record !== 'object' || record.schemaVersion !== SCHEMA_VERSION || typeof record.checksum !== 'string') return false;
    const clean = cloneJson(record);
    const expected = clean.checksum;
    delete clean.checksum;
    return (await sha256(clean)) === expected;
  };

  PlayerSessionBridge.prototype.putCheckpointRecord = function putCheckpointRecord(record) {
    return this.withStore(CHECKPOINT_STORE, 'readwrite', (store) => store.put(record));
  };

  PlayerSessionBridge.prototype.getAllCheckpoints = async function getAllCheckpoints() {
    const records = await this.withStore(CHECKPOINT_STORE, 'readonly', (store) => store.getAll());
    return Array.isArray(records) ? records : [];
  };

  PlayerSessionBridge.prototype.pruneCheckpoints = async function pruneCheckpoints() {
    const records = (await this.getAllCheckpoints())
      .filter((record) => record.type === 'checkpoint')
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const stale = records.slice(this.maxCheckpoints);
    if (!stale.length) return 0;
    await this.withStore(CHECKPOINT_STORE, 'readwrite', (store) => {
      stale.forEach((record) => store.delete(record.id));
      return null;
    });
    return stale.length;
  };

  PlayerSessionBridge.prototype.writeCheckpoint = async function writeCheckpoint(reason, detail) {
    if (!this.isEnabled()) return { ok: true, disabled: true };
    await this.initialize();
    const rawSave = global.localStorage.getItem(this.legacySaveKey);
    if (rawSave !== null && !validLegacySave(rawSave)) {
      return { ok: false, preservedPrevious: true, reason: 'legacy-save-corrupt' };
    }
    const createdAt = new Date().toISOString();
    const id = `checkpoint:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const record = await this.seal({
      schemaVersion: SCHEMA_VERSION,
      id,
      type: 'checkpoint',
      createdAt,
      reason: String(reason || 'checkpoint'),
      payload: {
        legacySave: rawSave,
        legacySaveKey: this.legacySaveKey,
        detail: cloneJson(detail || null)
      }
    });
    await this.putCheckpointRecord(record);
    this.runtimeCheckpoint = record;
    global.localStorage.setItem(this.pointerKey, JSON.stringify({ id, createdAt, checksum: record.checksum }));
    await this.pruneCheckpoints();
    if (this.eventBus) this.eventBus.emit('player-session:checkpoint-written', Object.freeze({ id, createdAt, reason: record.reason }));
    return { ok: true, id, createdAt, checksum: record.checksum };
  };

  PlayerSessionBridge.prototype.readCheckpointById = function readCheckpointById(id) {
    return this.withStore(CHECKPOINT_STORE, 'readonly', (store) => store.get(String(id || '')));
  };

  PlayerSessionBridge.prototype.readLatestValidCheckpoint = async function readLatestValidCheckpoint() {
    if (!this.isEnabled()) return null;
    await this.initialize();
    let pointer = null;
    try { pointer = JSON.parse(global.localStorage.getItem(this.pointerKey) || 'null'); } catch (error) {}
    if (pointer && pointer.id) {
      const pointed = await this.readCheckpointById(pointer.id);
      if (pointed && await this.verify(pointed) && pointed.type === 'checkpoint') return pointed;
    }
    const records = (await this.getAllCheckpoints()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    for (const record of records) {
      if (record.type === 'checkpoint' && await this.verify(record)) return record;
    }
    return null;
  };

  PlayerSessionBridge.prototype.restoreLatestIfNeeded = async function restoreLatestIfNeeded() {
    if (!this.isEnabled()) return { ok: true, disabled: true };
    const current = global.localStorage.getItem(this.legacySaveKey);
    if (current === null || validLegacySave(current)) return { ok: true, restored: false, currentValid: true };
    const checkpoint = await this.readLatestValidCheckpoint();
    if (!checkpoint || !validLegacySave(checkpoint.payload && checkpoint.payload.legacySave)) {
      return { ok: false, restored: false, reason: 'no-valid-checkpoint' };
    }
    const backup = await this.seal({
      schemaVersion: SCHEMA_VERSION,
      id: `corrupt-backup:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      type: 'corrupt-backup',
      createdAt: new Date().toISOString(),
      reason: 'restore-over-corrupt-legacy-save',
      payload: { raw: current, legacySaveKey: this.legacySaveKey }
    });
    await this.putCheckpointRecord(backup);
    global.localStorage.setItem(this.legacySaveKey, checkpoint.payload.legacySave);
    if (this.eventBus) this.eventBus.emit('player-session:restored', Object.freeze({ checkpointId: checkpoint.id, backupId: backup.id }));
    return { ok: true, restored: true, checkpointId: checkpoint.id, backupId: backup.id };
  };

  PlayerSessionBridge.prototype.getJournal = function getJournal(requestId) {
    return this.withStore(JOURNAL_STORE, 'readonly', (store) => store.get(String(requestId || '')));
  };

  PlayerSessionBridge.prototype.putJournal = async function putJournal(record) {
    const sealed = await this.seal(record);
    await this.withStore(JOURNAL_STORE, 'readwrite', (store) => store.put(sealed));
    return sealed;
  };

  PlayerSessionBridge.prototype.recordBattleRequest = async function recordBattleRequest(request) {
    if (!this.isEnabled()) return { ok: true, disabled: true };
    const normalized = root.contracts.normalizeBattleRequest(request);
    const existing = await this.getJournal(normalized.requestId);
    if (existing) {
      if (!await this.verify(existing)) throw root.contracts.contractError('CORRUPT_BATTLE_JOURNAL', 'Existing battle journal record failed checksum validation.');
      if (existing.status === 'applied') return existing;
      throw root.contracts.contractError('DUPLICATE_BATTLE_JOURNAL', 'Battle request already exists in the durable journal.');
    }
    const now = new Date().toISOString();
    const record = await this.putJournal({
      schemaVersion: SCHEMA_VERSION,
      requestId: normalized.requestId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      request: normalized,
      result: null,
      application: null
    });
    if (this.eventBus) this.eventBus.emit('player-session:battle-pending', Object.freeze({ requestId: record.requestId }));
    return record;
  };

  PlayerSessionBridge.prototype.recordBattleResult = async function recordBattleResult(request, result) {
    if (!this.isEnabled()) return { ok: true, disabled: true };
    const normalizedRequest = root.contracts.normalizeBattleRequest(request);
    const normalizedResult = root.contracts.normalizeBattleResult(result, normalizedRequest.requestId);
    const existing = await this.getJournal(normalizedRequest.requestId);
    if (!existing || !await this.verify(existing)) throw root.contracts.contractError('MISSING_BATTLE_JOURNAL', 'A valid pending journal entry is required before the result.');
    if (existing.status === 'applied') return existing;
    const record = await this.putJournal(Object.assign({}, existing, {
      checksum: undefined,
      status: 'result-ready',
      updatedAt: new Date().toISOString(),
      result: normalizedResult
    }));
    if (this.eventBus) this.eventBus.emit('player-session:battle-result-ready', Object.freeze({ requestId: record.requestId, status: normalizedResult.status }));
    return record;
  };

  PlayerSessionBridge.prototype.markBattleResultApplied = async function markBattleResultApplied(requestId, application) {
    if (!this.isEnabled()) return { ok: true, disabled: true };
    const existing = await this.getJournal(requestId);
    if (!existing || !await this.verify(existing)) throw root.contracts.contractError('MISSING_BATTLE_RESULT_JOURNAL', 'A valid result journal entry is required before application.');
    if (existing.status === 'applied') return existing;
    if (existing.status !== 'result-ready') throw root.contracts.contractError('BATTLE_RESULT_NOT_READY', 'Battle result cannot be applied from the current journal state.');
    const record = await this.putJournal(Object.assign({}, existing, {
      checksum: undefined,
      status: 'applied',
      updatedAt: new Date().toISOString(),
      application: cloneJson(application || null)
    }));
    if (this.eventBus) this.eventBus.emit('player-session:battle-applied', Object.freeze({ requestId: record.requestId }));
    return record;
  };

  PlayerSessionBridge.prototype.getRecoverableBattle = async function getRecoverableBattle() {
    if (!this.isEnabled()) return null;
    const records = await this.withStore(JOURNAL_STORE, 'readonly', (store) => store.getAll());
    const candidates = (Array.isArray(records) ? records : [])
      .filter((record) => record.status === 'result-ready')
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    for (const record of candidates) {
      if (await this.verify(record)) return record;
    }
    return null;
  };

  PlayerSessionBridge.prototype.close = function close() {
    if (this.db) this.db.close();
    this.db = null;
    this.openPromise = null;
  };

  root.PlayerSessionBridge = PlayerSessionBridge;
})(window);
