// /Wild-U/shared/wildu-secure-game-guard.js
// WILDU SECURE GAME GUARD
// ---------------------------------------------------------
// Scopo:
// - impedire l'avvio normale dei giochi Wild-U aperti direttamente dal link;
// - permettere l'avvio quando il gioco arriva dal launcher/app madre con ?launch=<ticketId>;
// - creare una sessione locale per il singolo gioco, così l'utente reale non viene disturbato;
// - mantenere il ticket Firestore breve come prova del primo passaggio dall'app madre.
//
// Uso nel gioco, prima del bootstrap:
//   import { guardWilduGame } from "../../shared/wildu-secure-game-guard.js";
//   await guardWilduGame({
//     targetKey: "giochi/sfida-dei-sassi/index.html",
//     allowedKind: "secure_iframe"
//   });
//   startGame();
//
// Nota importante:
// questa guardia è client-side perché GitHub Pages serve file statici pubblici.
// Il requisito qui è anti-bypass launcher/app madre, non segretezza militare del sorgente.

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Path reale già usato dal MapViewer:
// /Wild-U/wildu-map-suite/shared/firebase-config.js
import { firebaseConfig } from "../wildu-map-suite/shared/firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const WILDU_SECURE_LAUNCH_COLLECTION = "wildu_runtime_launches";
const WILDU_SECURE_LAUNCH_BRIDGE_PREFIX = "wildu_secure_launch_bridge:";
const WILDU_SECURE_GAME_SESSION_PREFIX = "wildu_secure_session_game:";
const WILDU_DEFAULT_SESSION_MS = 11 * 60 * 60 * 1000; // 11 ore
const WILDU_DEFAULT_ALLOWED_KIND = "secure_iframe";
const WILDU_SOURCE = "wild-u-client";

function now() {
  return Date.now();
}

function safeString(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function timestampToMillis(value) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return (value.seconds * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1000000);
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeWilduTargetKey(raw) {
  let value = safeString(raw);

  if (!value) return "";

  // Prima tagliamo query/hash. Vale sia per URL completi sia per chiavi tecniche.
  value = value.split("?")[0].split("#")[0].trim();

  try {
    // Caso 1: URL assoluto reale.
    if (/^https?:\/\//i.test(value)) {
      value = new URL(value).pathname;
    }

    // Caso 2: path assoluto dal dominio.
    else if (value.indexOf("/") === 0) {
      // niente new URL: è già un path
    }

    // Caso 3: chiave tecnica relativa già corretta.
    // NON va risolta con new URL(..., location.href), altrimenti si duplica.
    else {
      value = value.replace(/^\.\/+/,
        "");
    }
  } catch (_) {
    // Fallback conservativo: mantieni il valore già tagliato.
  }

  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^Wild-U\//i, "")
    .replace(/\/index\.html$/i, "")
    .replace(/\/+$/, "");
}

function inferCurrentGameTargetKey() {
  return normalizeWilduTargetKey(window.location.pathname || "");
}

function buildAllowedKinds(options) {
  const list = [];

  if (Array.isArray(options.allowedKinds)) {
    options.allowedKinds.forEach(v => {
      const clean = safeString(v);
      if (clean) list.push(clean);
    });
  }

  const single = safeString(options.allowedKind || WILDU_DEFAULT_ALLOWED_KIND);
  if (single && !list.includes(single)) list.push(single);

  // Compatibilità futura se qualche gioco viene marcato come "game" nel ticket.
  if (options.allowGameKind === true && !list.includes("game")) {
    list.push("game");
  }

  return list.length ? list : [WILDU_DEFAULT_ALLOWED_KIND];
}

function getLaunchIdFromUrl() {
  try {
    return safeString(new URLSearchParams(window.location.search || "").get("launch"));
  } catch (_) {
    return "";
  }
}

function removeLaunchParamFromUrl() {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("launch")) return;

    u.searchParams.delete("launch");
    window.history.replaceState({}, document.title, u.pathname + u.search + u.hash);
  } catch (_) {}
}

function getGameSessionKey(targetKey) {
  const normalized = normalizeWilduTargetKey(targetKey || inferCurrentGameTargetKey());
  return WILDU_SECURE_GAME_SESSION_PREFIX + normalized.replace(/[^a-z0-9._-]+/gi, "_");
}

function readGameSession(targetKey) {
  const expected = normalizeWilduTargetKey(targetKey);

  try {
    const raw = localStorage.getItem(getGameSessionKey(expected));
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;

    const savedTarget = normalizeWilduTargetKey(data.targetKey);
    const expiresAt = Number(data.expiresAt || 0);

    if (savedTarget !== expected) {
      clearGameSession(expected);
      return null;
    }

    if (!expiresAt || expiresAt <= now()) {
      clearGameSession(expected);
      return null;
    }

    return data;
  } catch (_) {
    clearGameSession(expected);
    return null;
  }
}

function writeGameSession(targetKey, payload) {
  const normalized = normalizeWilduTargetKey(targetKey);

  const data = {
    uid: safeString(payload && payload.uid) || "wild-u-client",
    targetKey: normalized,
    targetKind: safeString(payload && payload.targetKind) || WILDU_DEFAULT_ALLOWED_KIND,
    createdAt: now(),
    expiresAt: now() + Number(payload && payload.sessionMs || WILDU_DEFAULT_SESSION_MS),
    source: WILDU_SOURCE
  };

  localStorage.setItem(getGameSessionKey(normalized), JSON.stringify(data));
  return data;
}

function clearGameSession(targetKey) {
  try {
    localStorage.removeItem(getGameSessionKey(targetKey));
  } catch (_) {}
}

function readLaunchBridge(launchId, expectedTargetKey, allowedKinds) {
  const cleanLaunchId = safeString(launchId);
  if (!cleanLaunchId) return null;

  try {
    const raw = localStorage.getItem(WILDU_SECURE_LAUNCH_BRIDGE_PREFIX + cleanLaunchId);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;

    const source = safeString(data.source);
    const targetKind = safeString(data.targetKind);
    const targetKey = normalizeWilduTargetKey(data.targetKey || data.targetUrl);
    const expiresAt = Number(data.expiresAt || 0);

    if (safeString(data.launchId) !== cleanLaunchId) return null;
    if (source !== WILDU_SOURCE) return null;
    if (!allowedKinds.includes(targetKind)) return null;
    if (targetKey !== normalizeWilduTargetKey(expectedTargetKey)) return null;
    if (!expiresAt || expiresAt <= now()) return null;

    return {
      ...data,
      targetKey,
      targetKind
    };
  } catch (_) {
    return null;
  }
}

function clearLaunchBridge(launchId) {
  const cleanLaunchId = safeString(launchId);
  if (!cleanLaunchId) return;

  try {
    localStorage.removeItem(WILDU_SECURE_LAUNCH_BRIDGE_PREFIX + cleanLaunchId);
  } catch (_) {}
}

function waitForAuthUser(timeoutMs = 7000) {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve) => {
    let done = false;
    let unsub = () => {};

    const finish = (user) => {
      if (done) return;
      done = true;

      try {
        unsub();
      } catch (_) {}

      resolve(user || null);
    };

    const timer = setTimeout(() => finish(auth.currentUser || null), timeoutMs);

    unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      finish(user || null);
    }, () => {
      clearTimeout(timer);
      finish(null);
    });
  });
}

function escapeHtml(value) {
  return safeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderBlockedScreen(reason, details = "", options = {}) {
  const messages = {
    NO_LAUNCH: "Apri questo gioco dalla app Wild-U.",
    NO_AUTH: "Per aprire questo gioco devi entrare dalla app Wild-U con il tuo account.",
    OFFLINE: "Serve internet per verificare il primo accesso a questo gioco.",
    INVALID_TICKET: "Accesso gioco non valido o scaduto. Riapri il gioco dalla app Wild-U.",
    WRONG_USER: "Questo ticket appartiene a un altro utente.",
    WRONG_KIND: "Tipo apertura non valido per questo gioco.",
    WRONG_TARGET: "Questo ticket non è valido per questo gioco.",
    FIRESTORE_DENIED: "Accesso negato. Riapri il gioco dalla app Wild-U."
  };

  const title = safeString(options.blockTitle) || "Gioco protetto";
  const message = messages[reason] || messages.INVALID_TICKET;
  const safeDetails = safeString(details);
  const motherUrl = safeString(options.motherUrl) || "https://wildustrek.github.io/Wild-U/";

  try {
    document.documentElement.style.background = "#0f1712";
    document.body.innerHTML = `
      <main style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:radial-gradient(circle at top, rgba(245,180,0,.14), transparent 40%), #0f1712;
        color:#f3f8f1;
        font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        text-align:center;
        box-sizing:border-box;
      ">
        <section style="
          width:100%;
          max-width:430px;
          border:1px solid rgba(255,255,255,.14);
          border-radius:22px;
          padding:26px 22px;
          background:rgba(18,28,21,.95);
          box-shadow:0 18px 48px rgba(0,0,0,.34);
        ">
          <div style="font-size:54px; line-height:1; margin-bottom:14px;">🎮</div>
          <h1 style="margin:0 0 10px 0; font-size:24px; color:#f5b400;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 18px 0; color:#d9e6d5; font-size:15px; line-height:1.55;">${escapeHtml(message)}</p>
          ${safeDetails ? `<p style="margin:0 0 18px 0; color:#aab8a8; font-size:12px; line-height:1.4;">${escapeHtml(safeDetails)}</p>` : ""}
          <button id="wildu-secure-game-open-mother" type="button" style="
            width:100%;
            border:0;
            border-radius:999px;
            padding:13px 16px;
            background:#f5b400;
            color:#231800;
            font-weight:950;
            font-size:14px;
            cursor:pointer;
          ">Apri Wild-U</button>
        </section>
      </main>
    `;

    const btn = document.getElementById("wildu-secure-game-open-mother");
    if (btn) {
      btn.addEventListener("click", () => {
        try {
          if (window.parent && window.parent !== window && typeof window.parent.show === "function") {
            window.parent.show("rewards");
            return;
          }
        } catch (_) {}

        window.location.href = motherUrl;
      });
    }
  } catch (_) {}
}

function blockAndThrow(reason, details, options) {
  renderBlockedScreen(reason, details, options);
  const err = new Error("WILDU_GAME_BLOCKED:" + reason);
  err.reason = reason;
  throw err;
}

function debugLog(enabled, type, details) {
  if (!enabled) return;
  console.log("[Wildu Game Guard]", type, details || {});
}

export async function guardWilduGame(options = {}) {
  const targetKey = normalizeWilduTargetKey(options.targetKey || inferCurrentGameTargetKey());
  const allowedKinds = buildAllowedKinds(options);
  const sessionMs = Number(options.sessionMs || WILDU_DEFAULT_SESSION_MS);
  const debug = options.debug === true || new URLSearchParams(window.location.search || "").get("guardDebug") === "1";

  if (!targetKey) {
    blockAndThrow("WRONG_TARGET", "Target gioco mancante.", options);
  }

  debugLog(debug, "START", {
    href: window.location.href,
    targetKey,
    allowedKinds
  });

  // 1) Sessione locale già valida: entra subito.
  const savedSession = readGameSession(targetKey);
  if (savedSession) {
    removeLaunchParamFromUrl();
    debugLog(debug, "ALLOW_SESSION", savedSession);
    return {
      ok: true,
      source: "local-session",
      targetKey,
      uid: savedSession.uid || ""
    };
  }

  // 2) Primo ingresso: serve launch dalla app madre/launcher.
  const launchId = getLaunchIdFromUrl();

  if (!launchId) {
    debugLog(debug, "DENY_NO_LAUNCH", { targetKey });
    blockAndThrow("NO_LAUNCH", "", options);
  }

  // 3) Bridge locale scritto dalla app madre dopo create ticket riuscita.
  const bridge = readLaunchBridge(launchId, targetKey, allowedKinds);

  if (bridge) {
    writeGameSession(targetKey, {
      uid: bridge.uid || "wild-u-client",
      targetKind: bridge.targetKind,
      sessionMs
    });

    clearLaunchBridge(launchId);
    removeLaunchParamFromUrl();

    debugLog(debug, "ALLOW_BRIDGE", {
      launchId,
      targetKey,
      targetKind: bridge.targetKind
    });

    return {
      ok: true,
      source: "local-bridge",
      targetKey,
      uid: bridge.uid || ""
    };
  }

  // 4) Fallback forte: Auth + Firestore.
  if (!navigator.onLine) {
    debugLog(debug, "DENY_OFFLINE_NO_BRIDGE", { targetKey, launchId });
    blockAndThrow("OFFLINE", "", options);
  }

  const user = await waitForAuthUser(Number(options.authTimeoutMs || 7000));

  if (!user || !user.uid) {
    debugLog(debug, "DENY_NO_AUTH", { targetKey, launchId });
    blockAndThrow("NO_AUTH", "", options);
  }

  try {
    const ref = doc(db, WILDU_SECURE_LAUNCH_COLLECTION, launchId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      clearGameSession(targetKey);
      debugLog(debug, "DENY_TICKET_MISSING", { targetKey, launchId });
      blockAndThrow("INVALID_TICKET", "", options);
    }

    const data = snap.data() || {};
    const expiresAt = timestampToMillis(data.expiresAt);
    const ticketKind = safeString(data.targetKind);
    const ticketTargetKey = normalizeWilduTargetKey(data.targetKey || data.targetUrl);

    if (safeString(data.uid) !== user.uid) {
      clearGameSession(targetKey);
      debugLog(debug, "DENY_WRONG_USER", {
        ticketUid: data.uid || "",
        authUid: user.uid
      });
      blockAndThrow("WRONG_USER", "", options);
    }

    if (safeString(data.source) !== WILDU_SOURCE) {
      clearGameSession(targetKey);
      debugLog(debug, "DENY_BAD_SOURCE", { source: data.source || "" });
      blockAndThrow("INVALID_TICKET", "", options);
    }

    if (!allowedKinds.includes(ticketKind)) {
      clearGameSession(targetKey);
      debugLog(debug, "DENY_WRONG_KIND", {
        ticketKind,
        allowedKinds
      });
      blockAndThrow("WRONG_KIND", "", options);
    }

    if (ticketTargetKey !== targetKey) {
      clearGameSession(targetKey);
      console.warn("[Wildu Game Guard] WRONG_TARGET", {
        rawTargetKey: data.targetKey || "",
        rawTargetUrl: data.targetUrl || "",
        normalizedTargetKey: ticketTargetKey,
        expectedTargetKey: targetKey
      });
      blockAndThrow("WRONG_TARGET", "", options);
    }

    if (!expiresAt || expiresAt <= now()) {
      clearGameSession(targetKey);
      debugLog(debug, "DENY_EXPIRED", { expiresAt });
      blockAndThrow("INVALID_TICKET", "Ticket scaduto.", options);
    }

    writeGameSession(targetKey, {
      uid: user.uid,
      targetKind: ticketKind,
      sessionMs
    });

    clearLaunchBridge(launchId);
    removeLaunchParamFromUrl();

    debugLog(debug, "ALLOW_FIRESTORE", {
      targetKey,
      uid: user.uid
    });

    return {
      ok: true,
      source: "firestore-ticket",
      targetKey,
      uid: user.uid
    };

  } catch (e) {
    if (String(e && e.message || "").indexOf("WILDU_GAME_BLOCKED:") === 0) {
      throw e;
    }

    clearGameSession(targetKey);

    const code = safeString(e && e.code).toLowerCase();

    console.error("[Wildu Game Guard] denied:", e);

    if (code.includes("permission-denied")) {
      blockAndThrow("FIRESTORE_DENIED", "", options);
    }

    blockAndThrow("INVALID_TICKET", e && e.message ? e.message : "", options);
  }
}

export function clearWilduGameSession(targetKey) {
  clearGameSession(normalizeWilduTargetKey(targetKey || inferCurrentGameTargetKey()));
}

export function wilduGameGuardDebug(targetKey) {
  const normalized = normalizeWilduTargetKey(targetKey || inferCurrentGameTargetKey());
  const launchId = getLaunchIdFromUrl();
  const session = readGameSession(normalized);
  const bridge = readLaunchBridge(launchId, normalized, [WILDU_DEFAULT_ALLOWED_KIND, "game"]);

  const report = {
    href: window.location.href,
    launchId,
    targetKey: normalized,
    sessionKey: getGameSessionKey(normalized),
    hasSession: !!session,
    session,
    hasBridge: !!bridge,
    bridge,
    now: now()
  };

  console.log("[Wildu Game Guard Debug]", report);
  return report;
}

window.WilduSecureGameGuard = {
  guardWilduGame,
  clearWilduGameSession,
  wilduGameGuardDebug
};
