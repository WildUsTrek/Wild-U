(function installGuerraDeiSassiCloudSave(global) {
  'use strict';
  // Owns only this game's two existing local-save keys.
  const COLLECTION = 'guerra_dei_sassi_saves';
  const PROGRESS_KEY = 'sfida_sassi_progress_v22';
  const STORY_KEY = 'PERLA1_RTP_PASS2_SAVE_V1';
  const PRE_RESTORE_BACKUP_KEY = 'guerra-dei-sassi:cloud-pre-restore:v1';
  const CACHE_OWNER_KEY = 'guerra-dei-sassi:cloud-cache-owner:v1';
  const PENDING_PREFIX = 'guerra-dei-sassi:cloud-pending:v1:';
  const RECEIPT_PREFIX = 'guerra-dei-sassi:cloud-receipt:v1:';
  const SCHEMA_VERSION = 1;
  const MIN_WRITE_INTERVAL_MS = 5 * 60 * 1000;
  const SAFETY_WRITE_INTERVAL_MS = 40 * 60 * 1000;
  const MAX_STORY_PAYLOAD_BYTES = 650000;
  const WRITE_TIMEOUT_MS = 3000;
  const state = { started:false, suspended:false, closing:false, initializationPromise:null, ready:false, applyingRemote:false, dirty:false, changeSequence:0, writeInFlight:null, writeUncertain:false, syncPromise:null, authUnsubscribe:null, hasRemoteDocument:false, activeUid:'', generation:0, remoteRevision:0, lastWriteAt:0, lastStatus:'idle', safetyTimer:null };
  let runtimePromise = null;
  let lifecycleEpoch = 0;
  let archiveSequence = 0;
  const serverReads = new Map();
  const serverWrites = new Map();

  function byteLength(value) { try { return new TextEncoder().encode(String(value || '')).byteLength; } catch (_) { return String(value || '').length; } }
  function boundedText(value, maxLength) { return String(value === undefined || value === null ? '' : value).slice(0, maxLength); }
  function normalizeRevision(value) { const number = Number(value); return Number.isInteger(number) && number >= 0 && number <= 1000000000 ? number : 0; }
  function normalizeProgress(value) {
    const input = value && typeof value === 'object' ? value : {};
    const number = (key, min, max) => Math.max(min, Math.min(max, Number(input[key]) || 0));
    return { cpuWins:number('cpuWins',0,1000000000), cpuLosses:number('cpuLosses',0,1000000000), highestSkillBeaten:number('highestSkillBeaten',0,1000000), lastOpponentBeaten:boundedText(input.lastOpponentBeaten,64), tournamentUnlockedIndex:number('tournamentUnlockedIndex',0,8), tournamentWins:number('tournamentWins',0,1000000000), tournamentLosses:number('tournamentLosses',0,1000000000), tournamentClears:number('tournamentClears',0,1000000000), playerAvatarId:boundedText(input.playerAvatarId,64).replace(/[^a-z0-9_-]/gi,'') };
  }
  function readLocalProgress() { try { const raw = global.localStorage && global.localStorage.getItem(PROGRESS_KEY); return normalizeProgress(raw ? JSON.parse(raw) : (typeof global.getCurrentProgress === 'function' ? global.getCurrentProgress() : {})); } catch (_) { return null; } }
  function readLocalStoryPayload() {
    try { const raw = global.localStorage && global.localStorage.getItem(STORY_KEY); if (!raw) return ''; if (byteLength(raw) > MAX_STORY_PAYLOAD_BYTES) return null; const parsed = JSON.parse(raw); return parsed && typeof parsed === 'object' && parsed.schema === 'perla.rtp.pass2.save.v1' ? raw : null; } catch (_) { return null; }
  }
  function buildLocalPayload() { const progress = readLocalProgress(); const storyPayload = readLocalStoryPayload(); return progress && storyPayload !== null ? { progress, storyPayload } : null; }
  function validateRemotePayload(data) {
    if (!data || typeof data !== 'object' || Number(data.schemaVersion) !== SCHEMA_VERSION || !data.progress || typeof data.progress !== 'object' || typeof data.storyPayload !== 'string' || byteLength(data.storyPayload) > MAX_STORY_PAYLOAD_BYTES) return null;
    if (data.storyPayload) { try { const parsed = JSON.parse(data.storyPayload); if (!parsed || typeof parsed !== 'object' || parsed.schema !== 'perla.rtp.pass2.save.v1') return null; } catch (_) { return null; } }
    return { progress:normalizeProgress(data.progress), storyPayload:data.storyPayload };
  }
  function getCacheOwner() { try { const parsed = JSON.parse(global.localStorage.getItem(CACHE_OWNER_KEY) || 'null'); return parsed && typeof parsed.uid === 'string' && parsed.uid.length > 0 && parsed.uid.length <= 256 ? parsed.uid : ''; } catch (_) { return ''; } }
  function setCacheOwner(uid) { try { global.localStorage.setItem(CACHE_OWNER_KEY, JSON.stringify({ schemaVersion:1, uid, updatedAt:new Date().toISOString() })); return getCacheOwner() === uid; } catch (_) { return false; } }
  function profileKey(prefix, uid) { return prefix + encodeURIComponent(uid); }
  function readRecord(prefix, uid) { try { const value = JSON.parse(global.localStorage.getItem(profileKey(prefix,uid)) || 'null'); return value && value.uid === uid && value.schemaVersion === 1 ? value : null; } catch (_) { return null; } }
  function writeRecord(prefix, uid, value) { try { const raw = JSON.stringify(value); const key = profileKey(prefix,uid); global.localStorage.setItem(key,raw); return global.localStorage.getItem(key) === raw; } catch (_) { return false; } }
  function samePayload(a,b) { return !!a && !!b && JSON.stringify(a.progress) === JSON.stringify(b.progress) && a.storyPayload === b.storyPayload; }
  function readPending(uid) { const record = readRecord(PENDING_PREFIX,uid); return record && record.status === 'pending' && validateRemotePayload(Object.assign({schemaVersion:1},record.payload)) ? record : null; }
  function persistPending(uid, baseRevision) {
    if (!uid || (getCacheOwner() && getCacheOwner() !== uid)) return false;
    const payload = buildLocalPayload(); if (!payload) return false;
    const previous = readPending(uid);
    const receipt = readRecord(RECEIPT_PREFIX,uid);
    const base = Number.isInteger(baseRevision) ? baseRevision : (previous ? previous.baseRevision : (receipt ? receipt.revision : null));
    if (previous && previous.baseRevision === base && samePayload(previous.payload,payload)) return true;
    return writeRecord(PENDING_PREFIX,uid,{schemaVersion:1,uid,status:'pending',baseRevision:base,payload,updatedAt:new Date().toISOString()});
  }
  function backupBeforeRemoteRestore(uid, reason) {
    try {
      const progressRaw = global.localStorage.getItem(PROGRESS_KEY), storyRaw = global.localStorage.getItem(STORY_KEY);
      const pending = uid ? readPending(uid) : null;
      const receipt = uid ? readRecord(RECEIPT_PREFIX,uid) : null;
      const current = buildLocalPayload();
      // An empty cache or our exactly acknowledged base is not unresolved work.
      // Ordinary cross-device restore must not grow full-size history records.
      if (progressRaw === null && storyRaw === null && !pending) return true;
      if (getCacheOwner() === uid && receipt && samePayload(receipt.payload,current) && (!pending || samePayload(pending.payload,current))) return true;
      const archivedPending = pending ? Object.assign({},pending,{payload:Object.assign({},pending.payload)}) : null;
      if (archivedPending && archivedPending.payload.storyPayload === storyRaw) {
        delete archivedPending.payload.storyPayload;
        archivedPending.storyPayloadFrom = 'storyRaw';
      }
      const record = { schemaVersion:1, createdAt:new Date().toISOString(), reason:reason || 'server-restore', owner:getCacheOwner(), progressRaw, storyRaw, pending:archivedPending };
      const previous = JSON.parse(global.localStorage.getItem(PRE_RESTORE_BACKUP_KEY) || 'null');
      if (previous && previous.progressRaw === record.progressRaw && previous.storyRaw === record.storyRaw && JSON.stringify(previous.pending) === JSON.stringify(record.pending)) return true;
      const raw = JSON.stringify(record);
      const archiveKey = PRE_RESTORE_BACKUP_KEY + ':archive:' + Date.now() + ':' + (++archiveSequence);
      if (global.localStorage.getItem(archiveKey) !== null) return false;
      global.localStorage.setItem(archiveKey,raw);
      if (global.localStorage.getItem(archiveKey) !== raw) return false;
      global.localStorage.setItem(PRE_RESTORE_BACKUP_KEY,raw);
      return global.localStorage.getItem(PRE_RESTORE_BACKUP_KEY) === raw;
    } catch (_) { return false; }
  }
  function acknowledge(uid, revision, payload, sequence) {
    if (!writeRecord(RECEIPT_PREFIX,uid,{schemaVersion:1,uid,revision,payload,acknowledgedAt:new Date().toISOString()})) return false;
    if (state.changeSequence !== sequence) return persistPending(uid,revision);
    return writeRecord(PENDING_PREFIX,uid,{schemaVersion:1,uid,status:'acknowledged',baseRevision:revision,payload,updatedAt:new Date().toISOString()});
  }
  function finishServerRestore(uid, revision, payload) {
    if (!writeRecord(RECEIPT_PREFIX,uid,{schemaVersion:1,uid,revision,payload,observedAt:new Date().toISOString()})) return false;
    const pending = readPending(uid);
    return !pending || writeRecord(PENDING_PREFIX,uid,Object.assign({},pending,{status:'archived-server-wins',archivedAt:new Date().toISOString()}));
  }
  function boundedRead(task) {
    let timer;
    return Promise.race([task,new Promise((resolve) => { timer = global.setTimeout(() => resolve({ok:false,reason:'cloud-read-pending'}),WRITE_TIMEOUT_MS); })]).finally(() => { if (timer) global.clearTimeout(timer); });
  }
  function readServer(runtime, uid) {
    if (serverReads.has(uid)) return serverReads.get(uid);
    const task = runtime.getDocFromServer(runtime.doc(runtime.db,COLLECTION,uid)).finally(() => { if (serverReads.get(uid) === task) serverReads.delete(uid); });
    serverReads.set(uid,task);
    return task;
  }
  function describeOutcome(outcome) {
    if (outcome && outcome.ok && outcome.onlineConfirmed) return 'Partita salvata online';
    if (outcome && /server-conflict|server-restored/.test(outcome.reason || '')) return 'Prevale il salvataggio online; copia locale conservata';
    return 'Salvataggio online non confermato: verifica prima di cambiare dispositivo';
  }
  function isActiveIdentity(uid, generation) { return !state.suspended && state.activeUid === uid && state.generation === generation; }
  function applyRemotePayload(payload, uid, generation) {
    if (!payload || state.closing || !isActiveIdentity(uid, generation)) return false;
    state.applyingRemote = true;
    try {
      const pending = readPending(uid);
      const currentMatches = samePayload(buildLocalPayload(),payload);
      if ((!currentMatches || (pending && !samePayload(pending.payload,payload))) && !backupBeforeRemoteRestore(uid)) return false;
      if (!currentMatches) {
        if (typeof global.saveProgress === 'function') global.saveProgress(payload.progress);
        else global.localStorage.setItem(PROGRESS_KEY,JSON.stringify(Object.assign({version:1},payload.progress,{updatedAt:Date.now()})));
        if (payload.storyPayload) global.localStorage.setItem(STORY_KEY,payload.storyPayload);
        else global.localStorage.removeItem(STORY_KEY);
      }
      return setCacheOwner(uid);
    } catch (_) { return false; } finally { state.applyingRemote = false; }
  }
  async function ensureRuntime() {
    if (runtimePromise) return runtimePromise;
    // The same-origin host already owns the default compat Auth/Firestore.
    // Never import/initialize another Firebase app here: default getAuth can
    // migrate the host's browserLocal session to IndexedDB and sign it out.
    runtimePromise = Promise.resolve().then(() => {
      const host = global.parent;
      if (!host || host === global || host.location.origin !== global.location.origin) throw new Error('HOST_SAVE_RUNTIME_UNAVAILABLE');
      const sdk = host.firebase;
      const app = sdk && Array.isArray(sdk.apps) && sdk.apps.find((entry) => entry.name === '[DEFAULT]' && entry.options.projectId === 'wild-u-server');
      if (!app || typeof app.auth !== 'function' || typeof app.firestore !== 'function') throw new Error('HOST_SAVE_RUNTIME_UNAVAILABLE');
      const auth = app.auth();
      const db = app.firestore();
      const snapshotView = (snapshot) => ({ exists:() => snapshot.exists === true, data:() => snapshot.data() });
      return Object.freeze({
        auth, db,
        onAuthStateChanged:(owner, next, error) => owner.onAuthStateChanged(next, error),
        doc:(store, collection, uid) => {
          if (collection !== COLLECTION || !uid || String(uid).includes('/')) throw new Error('INVALID_SAVE_PATH');
          return store.collection(COLLECTION).doc(uid);
        },
        getDocFromServer:(ref) => ref.get({ source:'server' }).then(snapshotView),
        runTransaction:(store, update) => store.runTransaction((transaction) => update({
          get:(ref) => transaction.get(ref).then(snapshotView),
          set:(ref, value, options) => transaction.set(ref, value, options)
        })),
        serverTimestamp:() => sdk.firestore.FieldValue.serverTimestamp()
      });
    }).catch((error) => { runtimePromise = null; throw error; });
    return runtimePromise;
  }
  function showGuestNotice() { try { if (global.sessionStorage && global.sessionStorage.getItem('guerra-dei-sassi:guest-notice:v1')) return; if (global.sessionStorage) global.sessionStorage.setItem('guerra-dei-sassi:guest-notice:v1','1'); global.setTimeout(() => { if (typeof global.flashActionRibbon === 'function') global.flashActionRibbon('Senza profilo la partita non può rimanere salvata a lungo','bad'); }, 700); } catch (_) {} }
  function canBypassInterval(reason) { return /(^|[-_:])(exit|pagehide|hidden|critical)([-_:]|$)/i.test(String(reason || '')); }
  function resetForIdentity(uid) { state.generation += 1; state.activeUid = uid || ''; state.ready = false; state.dirty = false; state.writeUncertain = false; state.writeInFlight = null; state.syncPromise = null; state.hasRemoteDocument = false; state.remoteRevision = 0; state.lastWriteAt = 0; }
  function scheduleSafetyFlush() { if (!state.safetyTimer) state.safetyTimer = global.setInterval(() => { flush('safety-40m'); }, SAFETY_WRITE_INTERVAL_MS); }
  function safeTransactionWrite(runtime, uid, generation, payload, expectedRevision) {
    const ref = runtime.doc(runtime.db, COLLECTION, uid);
    const task = runtime.runTransaction(runtime.db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists()) { const remote = validateRemotePayload(snapshot.data()); const remoteRevision = normalizeRevision(snapshot.data().revision); if (!remote) return { kind:'remote-invalid' }; if (remoteRevision !== expectedRevision) return { kind:'server-wins', remote, remoteRevision }; } else if (expectedRevision !== 0 || state.hasRemoteDocument) return { kind:'server-document-missing' };
      if (!isActiveIdentity(uid, generation) || !runtime.auth.currentUser || runtime.auth.currentUser.uid !== uid) return { kind:'identity-changed' };
      const data = { schemaVersion:SCHEMA_VERSION, revision:expectedRevision + 1, progress:payload.progress, storyPayload:payload.storyPayload, updatedAt:runtime.serverTimestamp() };
      if (!snapshot.exists()) data.createdAt = runtime.serverTimestamp();
      transaction.set(ref, data, { merge:true });
      return { kind:'saved', revision:expectedRevision + 1 };
    }).finally(() => { if (serverWrites.get(uid) === task) serverWrites.delete(uid); });
    serverWrites.set(uid,task);
    return task;
  }
  function reconcileUncertainWrite(uid, generation, written) {
    if (state.closing || !isActiveIdentity(uid,generation)) return Promise.resolve({ ok:false, reason:'suspended' });
    return ensureRuntime().then((runtime) => readServer(runtime,uid).then((snapshot) => {
      if (state.closing || !isActiveIdentity(uid,generation) || !state.writeUncertain || !runtime.auth.currentUser || runtime.auth.currentUser.uid !== uid) return { ok:false, reason:'identity-changed' };
      if (snapshot.exists()) {
        const remote = validateRemotePayload(snapshot.data());
        if (!remote) { state.lastStatus = 'write-reconcile-invalid'; return { ok:false, reason:'write-reconcile-invalid' }; }
        const revision = normalizeRevision(snapshot.data().revision);
        const pending = readPending(uid);
        if (written && revision === written.revision + 1 && samePayload(remote,written.payload)) {
          if (!acknowledge(uid,revision,remote,written.sequence)) { state.lastStatus = 'local-receipt-failed'; return {ok:false,reason:state.lastStatus}; }
          state.dirty = state.changeSequence !== written.sequence;
        } else if (pending && pending.baseRevision === revision) {
          // The uncertain write did not advance the server. Keep the durable
          // pending snapshot; only a later explicit lifecycle may retry it.
          state.dirty = true;
        } else {
          if (!applyRemotePayload(remote,uid,generation) || !finishServerRestore(uid,revision,remote)) { state.lastStatus = 'write-reconcile-invalid'; return { ok:false, reason:'write-reconcile-invalid' }; }
          state.dirty = false;
        }
        state.remoteRevision = revision;
        state.hasRemoteDocument = true;
      } else {
        state.hasRemoteDocument = false;
        state.remoteRevision = 0;
        // The transaction did not create a canonical document: retain local
        // changes, but do not retry here. A later ordinary flush decides.
      }
      state.writeUncertain = false;
      state.lastStatus = snapshot.exists() ? 'write-reconciled-server' : 'write-reconciled-missing';
      return { ok:true, status:state.lastStatus };
    })).catch(() => {
      if (isActiveIdentity(uid,generation) && state.writeUncertain) state.lastStatus = 'write-uncertain-reconcile-pending';
      return { ok:false, reason:'write-reconcile-pending' };
    });
  }
  function boundedWrite(operation, uid, generation, written) {
    let timer = null;
    const request = operation.then((value) => ({ completed:true, value }), () => ({ completed:true, error:true }));
    const timeout = new Promise((resolve) => { timer = global.setTimeout(() => resolve({ timeout:true }), WRITE_TIMEOUT_MS); });
    return Promise.race([request, timeout]).then((result) => { if (timer) global.clearTimeout(timer); if (result.timeout) { if (isActiveIdentity(uid, generation)) { state.generation += 1; const reconcileGeneration = state.generation; state.writeUncertain = true; state.lastStatus = 'write-uncertain-reconciling'; request.then(() => reconcileUncertainWrite(uid,reconcileGeneration,written)); } return { ok:false, reason:'cloud-save-uncertain' }; } if (!isActiveIdentity(uid, generation) || result.error) return { ok:false, reason:result.error ? 'cloud-save-failed' : 'identity-changed' }; return { ok:true, result:result.value }; });
  }
  function flush(reason, options) {
    // Reserve the single flight synchronously, before any promise yields.
    if (state.writeInFlight) return state.writeInFlight;
    const attempt = Promise.resolve().then(() => performFlush(reason, options)).catch(() => ({ ok:false, reason:'cloud-save-failed' })).finally(() => { if (state.writeInFlight === attempt) state.writeInFlight = null; });
    state.writeInFlight = attempt;
    return attempt;
  }
  async function performFlush(reason, options) {
    const opts = options || {};
    if (!state.ready && !state.closing && !state.suspended) await initialize();
    if (!state.ready) return { ok:false, skipped:true, reason:'cloud-not-ready', localOnly:true, guest:state.lastStatus === 'guest-cache-only' };
    if (state.applyingRemote) return { ok:false, skipped:true, reason:'restore-in-progress' };
    if (!state.dirty) return { ok:true, skipped:true, reason:'no-new-changes', onlineConfirmed:!!readRecord(RECEIPT_PREFIX,state.activeUid) };
    if (!persistPending(state.activeUid,state.remoteRevision)) return {ok:false,reason:'pending-snapshot-failed'};
    if (state.writeUncertain) return { ok:false, skipped:true, reason:'cloud-save-uncertain' };
    if (!global.navigator.onLine) return { ok:false, skipped:true, reason:'offline' };
    if (!opts.force && Date.now() - state.lastWriteAt < MIN_WRITE_INTERVAL_MS && !canBypassInterval(reason)) return { ok:true, skipped:true, reason:'minimum-interval' };
    const uid = state.activeUid; const generation = state.generation; const runtime = await ensureRuntime().catch(() => null);
    if (!runtime || !uid || !isActiveIdentity(uid,generation) || !runtime.auth.currentUser || runtime.auth.currentUser.uid !== uid) return { ok:false, skipped:true, reason:'guest-or-runtime-unavailable' };
    if (serverWrites.has(uid)) return {ok:false,reason:'cloud-save-uncertain'};
    const owner = getCacheOwner(); if (owner && owner !== uid) { state.lastStatus = 'local-cache-owned-by-other-user'; return { ok:false, skipped:true, reason:'local-cache-owned-by-other-user' }; }
    const payload = buildLocalPayload(); if (!payload) return { ok:false, skipped:true, reason:'local-cache-invalid' };
    const expectedRevision = state.remoteRevision;
    const changeSequence = state.changeSequence;
    return boundedWrite(safeTransactionWrite(runtime,uid,generation,payload,expectedRevision),uid,generation,{payload,revision:expectedRevision,sequence:changeSequence}).then((outcome) => {
      if (!outcome.ok) { if (outcome.reason === 'cloud-save-failed') state.lastStatus = 'save-failed'; return outcome; }
      if (!runtime.auth.currentUser || runtime.auth.currentUser.uid !== uid) return { ok:false, reason:'identity-changed' };
      const result = outcome.result;
      if (!result || result.kind === 'remote-invalid') { state.lastStatus = 'remote-save-invalid'; return { ok:false, reason:'remote-save-invalid' }; }
      if (result.kind === 'server-wins') { if (!applyRemotePayload(result.remote,uid,generation) || !finishServerRestore(uid,result.remoteRevision,result.remote)) { state.lastStatus = 'server-restore-failed'; return { ok:false, reason:'server-restore-failed' }; } state.remoteRevision = result.remoteRevision; state.hasRemoteDocument = true; state.dirty = false; state.lastStatus = 'server-conflict-wins'; return { ok:true, reason:'server-conflict-wins' }; }
      if (result.kind !== 'saved') { state.lastStatus = String(result.kind || 'save-failed'); return { ok:false, reason:state.lastStatus }; }
      if (!isActiveIdentity(uid,generation) || !setCacheOwner(uid)) return { ok:false, reason:'identity-or-owner-changed' };
      state.remoteRevision = result.revision; state.dirty = state.changeSequence !== changeSequence; state.hasRemoteDocument = true; state.lastWriteAt = Date.now();
      if (!acknowledge(uid,result.revision,payload,changeSequence)) { state.lastStatus = 'saved-receipt-unavailable'; return {ok:true,onlineConfirmed:true,reason:state.lastStatus}; }
      state.lastStatus = 'saved'; return { ok:true, onlineConfirmed:true, revision:result.revision, reason:String(reason || 'save') };
    });
  }
  function markDirty(reason) { if (state.applyingRemote) return { ok:true, skipped:true, reason:'applying-remote' }; state.changeSequence += 1; state.dirty = true; state.lastStatus = `dirty:${String(reason || 'state-change').slice(0,48)}`; const persisted = !state.activeUid || persistPending(state.activeUid,state.ready ? state.remoteRevision : null); return { ok:persisted, dirty:true, localOnly:!state.ready }; }
  function initializeAuthenticatedSync(runtime, user) {
    const uid = user && user.uid; if (!uid) return Promise.resolve({ ok:false, reason:'guest' }); if (state.syncPromise) return boundedRead(state.syncPromise);
    const generation = state.generation;
    const receipt = readRecord(RECEIPT_PREFIX,uid);
    if (getCacheOwner() === uid && receipt && !samePayload(buildLocalPayload(),receipt.payload)) persistPending(uid,receipt.revision);
    const task = (async () => {
      const snapshot = await readServer(runtime,uid);
      if (state.closing || !isActiveIdentity(uid,generation) || !runtime.auth.currentUser || runtime.auth.currentUser.uid !== uid) return { ok:false, reason:'identity-changed' };
      if (snapshot.exists()) {
        const remote = validateRemotePayload(snapshot.data()); const revision = normalizeRevision(snapshot.data().revision);
        if (!remote) { state.lastStatus = 'remote-save-invalid'; return {ok:false,reason:state.lastStatus}; }
        const pending = readPending(uid);
        if (pending && pending.baseRevision === revision) {
          // Replay is permitted only over the exact unchanged base. The write
          // transaction rechecks revision, so another device always wins a race.
          if (!samePayload(buildLocalPayload(),pending.payload) && !applyRemotePayload(pending.payload,uid,generation)) { state.lastStatus = 'pending-recovery-failed'; return {ok:false,reason:state.lastStatus}; }
          state.remoteRevision = revision; state.hasRemoteDocument = true; state.dirty = true; state.ready = true; state.lastStatus = 'pending-recovery-ready';
        } else {
          if (!applyRemotePayload(remote,uid,generation) || !finishServerRestore(uid,revision,remote)) { state.lastStatus = 'remote-save-invalid'; return {ok:false,reason:state.lastStatus}; }
          state.remoteRevision = revision; state.hasRemoteDocument = true; state.dirty = false; state.ready = true; state.lastStatus = pending ? 'server-conflict-wins' : 'server-restored';
        }
        state.writeUncertain = false;
      }
      else { const owner = getCacheOwner(); if (owner && owner !== uid) { state.lastStatus = 'local-cache-owned-by-other-user'; return { ok:false, reason:'local-cache-owned-by-other-user' }; } const pending = readPending(uid); if (pending && Number(pending.baseRevision) > 0) { state.lastStatus = 'server-document-missing'; return {ok:false,reason:state.lastStatus}; } if (!buildLocalPayload()) { state.lastStatus = 'local-cache-invalid'; return { ok:false, reason:'local-cache-invalid' }; } state.hasRemoteDocument = false; state.remoteRevision = 0; state.dirty = true; state.writeUncertain = false; state.ready = true; state.lastStatus = 'initial-local-cache'; }
      scheduleSafetyFlush(); return { ok:true, status:state.lastStatus };
    })();
    const handledTask = task.catch(() => { if (isActiveIdentity(uid,generation)) state.lastStatus = 'cloud-unavailable'; return { ok:false, reason:'cloud-unavailable' }; }).finally(() => { if (state.syncPromise === handledTask) state.syncPromise = null; });
    state.syncPromise = handledTask;
    return boundedRead(handledTask);
  }
  function synchronizeCurrentUser(runtime,user) { if (state.suspended || state.closing) return Promise.resolve({ ok:false, reason:'suspended' }); const uid = user && user.uid ? user.uid : ''; if (!uid) { if (state.activeUid || state.ready) resetForIdentity(''); state.lastStatus = 'guest-cache-only'; showGuestNotice(); return Promise.resolve({ ok:true, guest:true }); } if (state.activeUid !== uid) resetForIdentity(uid); if (state.ready && !state.writeUncertain) return Promise.resolve({ ok:true, status:state.lastStatus }); return initializeAuthenticatedSync(runtime,user); }
  async function initialize() {
    if (state.closing) return { ok:false, reason:'suspended' };
    if (state.initializationPromise) return state.initializationPromise;
    state.started = true;
    state.suspended = false;
    const generation = state.generation;
    const task = (async () => {
      try {
        const runtime = await ensureRuntime();
        if (state.suspended || state.closing || generation !== state.generation) return { ok:false, reason:'suspended' };
        // Subscribe once to the existing owner. Read currentUser at delivery
        // time: a queued event must not restore an already obsolete identity.
        if (!state.authUnsubscribe) state.authUnsubscribe = runtime.onAuthStateChanged(runtime.auth,(nextUser) => {
          if (state.closing || state.suspended) return;
          // Even an already superseded null event invalidates pending work;
          // only the owner's *current* identity may start the next sync.
          if (!nextUser && state.activeUid) resetForIdentity('');
          synchronizeCurrentUser(runtime,runtime.auth.currentUser).then((result) => {
            if (result.ok && state.ready && state.dirty && !state.initializationPromise && !state.writeInFlight) flush('auth-ready',{force:true});
          });
        });
        const result = await synchronizeCurrentUser(runtime,runtime.auth.currentUser);
        if (result.ok && state.ready && state.dirty && !state.writeInFlight) return flush('initial-cache',{force:true});
        return result;
      } catch (_) { state.lastStatus = 'cache-only-runtime-unavailable'; showGuestNotice(); return { ok:false, reason:'cache-only-runtime-unavailable' }; }
    })();
    const tracked = task.finally(() => { if (state.initializationPromise === tracked) state.initializationPromise = null; });
    state.initializationPromise = tracked;
    return tracked;
  }
  function detachHostSubscription() {
    if (state.authUnsubscribe) state.authUnsubscribe();
    if (state.safetyTimer) global.clearInterval(state.safetyTimer);
    state.authUnsubscribe = null;
    state.safetyTimer = null;
  }
  function suspend() {
    state.suspended = true;
    resetForIdentity('');
    detachHostSubscription();
    state.initializationPromise = null;
    // Do not terminate, sign out, or clear persistence on the host SDK.
  }
  global.addEventListener('storage',(event) => { if (event && (event.key === PROGRESS_KEY || event.key === STORY_KEY)) markDirty('cross-frame-cache-change'); });
  global.document.addEventListener('visibilitychange',() => { if (global.document.visibilityState === 'hidden') flush('visibility-hidden',{ force:true }); });
  global.addEventListener('pagehide',() => {
    const epoch = ++lifecycleEpoch;
    // Fence reads/restores synchronously, while allowing the final write to
    // finish with its existing identity. BFCache resume creates a new generation.
    state.closing = true;
    // Host-close/OS navigation may skip our explicit exit button. Try one
    // bounded flush, without keeping an Auth listener in the surviving host.
    // This is best effort: browser termination can never guarantee network IO.
    detachHostSubscription();
    flush('pagehide',{ force:true }).finally(() => { if (epoch === lifecycleEpoch) suspend(); });
  });
  global.addEventListener('pageshow',(event) => { if (event.persisted) { lifecycleEpoch += 1; suspend(); state.closing = false; initialize(); } });
  global.addEventListener('online',() => { if (!state.suspended && !state.closing) ensureRuntime().then((runtime) => { if (!state.authUnsubscribe) { state.initializationPromise = null; return initialize(); } return synchronizeCurrentUser(runtime,runtime.auth.currentUser); }).catch(() => { state.lastStatus = 'cache-only-runtime-unavailable'; }); });
  global.GuerraDeiSassiCloudSave = Object.freeze({ initialize, markDirty, flush, describeOutcome, status:() => Object.assign({},state) });
})(window);
