/* global WILDU_MEDIA_CONFIG */
(function () {
  'use strict';

  var root = window.WilduMedia = window.WilduMedia || {};

  async function getIdToken() {
    var user = root.requireCurrentUser();
    return user.getIdToken();
  }

  function buildHeaders(idToken, extra) {
    var cfg = WILDU_MEDIA_CONFIG;
    return Object.assign({}, cfg.requestHeaders || {}, extra || {}, {
      'Authorization': 'Bearer ' + idToken
    });
  }

  async function postWorker(body) {
    var idToken = await getIdToken();
    var res = await fetch(WILDU_MEDIA_CONFIG.workerUrl, {
      method: 'POST',
      headers: buildHeaders(idToken, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });

    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }

    if (!res.ok || !data || data.ok === false) {
      throw new Error((data && (data.error || data.message)) || ('Worker error HTTP ' + res.status));
    }

    return data;
  }

  async function requestUploadUrl(params) {
    if (params.kind === 'gpx') {
      throw new Error('Upload GPX escluso da questa app: usa la mini-app mappa.');
    }

    var body = {
      // Se il Worker usa già un nome azione diverso, cambiare solo questo campo.
      action: 'create-upload-url',
      kind: params.kind,
      moduleSlug: params.tagSlug,
      tagSlug: params.tagSlug,
      fileName: params.fileName,
      contentType: params.contentType,
      sizeBytes: params.sizeBytes
    };

    var data = await postWorker(body);
    if (!data.uploadUrl || !data.publicUrl || !data.objectKey) {
      throw new Error('Risposta Worker incompleta: servono uploadUrl, publicUrl, objectKey.');
    }
    return data;
  }

  async function putFileToR2(uploadUrl, file, contentType, onProgress) {
    // fetch non espone progress upload in modo standard: per progress reale usiamo XMLHttpRequest.
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      if (contentType) xhr.setRequestHeader('Content-Type', contentType);

      xhr.upload.onprogress = function (evt) {
        if (evt.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true, status: xhr.status });
        else reject(new Error('PUT R2 fallito HTTP ' + xhr.status + ': ' + xhr.responseText));
      };
      xhr.onerror = function () { reject(new Error('Errore rete durante PUT R2.')); };
      xhr.send(file);
    });
  }

  async function deleteObject(objectKey) {
    if (!objectKey) throw new Error('objectKey mancante.');
    return postWorker({ action: 'delete-object', objectKey: objectKey });
  }

  root.R2WorkerService = {
    requestUploadUrl: requestUploadUrl,
    putFileToR2: putFileToR2,
    deleteObject: deleteObject
  };
})();
