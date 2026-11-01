/* World Generator — the readable part of the runtime.
 *
 * index.html is the original single-file app, patched by scripts/port.py. This
 * file is what the port adds, and it is the only code written for the
 * platform:
 *
 * - Validation token. When every check (« défi ») of a step is green, and the
 *   platform has handed over its per-instance secret, the step shows a code:
 *   monde{<12 hex>} = first 12 hex of HMAC-SHA256(secret, "voxel-world:<n>"),
 *   n being the step number (1 to 7). The platform computes the same value and
 *   sets it as the step's flag (tools/sync_subject.py, TOKEN_SCHEMES). Without
 *   a secret nothing is shown: opened on its own, the app behaves as before.
 *
 * - Platform mode. The workshop text, the hints and the step list are the
 *   platform's job, so this mode hides the app's own copies and keeps, for the
 *   current step, its title, its objective and the live check list.
 *
 * Student Lua cannot reach any of this: it runs in wasmoon with
 * `injectObjects` and `enableProxy` off, so it sees only the functions the app
 * gives it (bloc, lire, bruit, …), never `window`. What a token proves is
 * what a client-side check can prove: that the checks went green in the normal
 * flow.
 */
(function () {
  "use strict";

  var SCHEME = "voxel-world:";
  var secret = null;
  var tokens = {};          // step number -> token, computed once
  var lastGreen = null;     // step number of the latest fully green check

  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  function computeToken(step) {
    if (tokens[step]) return Promise.resolve(tokens[step]);
    if (!(window.crypto && crypto.subtle)) {
      return Promise.reject(new Error("crypto.subtle needs HTTPS (or localhost)"));
    }
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      .then(function (key) {
        return crypto.subtle.sign("HMAC", key, enc.encode(SCHEME + step));
      })
      .then(function (sig) {
        tokens[step] = "monde{" + hex(sig).slice(0, 12) + "}";
        return tokens[step];
      });
  }

  /* ---------- the box under the check list ---------- */

  function box() {
    var el = document.getElementById("wg-jeton");
    if (!el) {
      el = document.createElement("div");
      el.id = "wg-jeton";
      el.className = "callout";
      el.hidden = true;
    }
    // The app re-renders the instructions panel on every step change, so the
    // box is put back after the check list each time.
    var defis = document.getElementById("defis");
    if (defis && el.previousElementSibling !== defis) defis.after(el);
    return el;
  }

  function show(step, token) {
    var el = box();
    el.replaceChildren();
    var title = document.createElement("strong");
    title.textContent = "Étape " + step + " réussie ! Ton code de validation :";
    var code = document.createElement("code");
    code.className = "wg-code";
    code.textContent = token;
    var note = document.createElement("div");
    note.className = "message";
    note.textContent = "Il est déjà recopié dans la case de l'étape, sur la page de l'atelier : il ne te reste qu'à valider.";
    el.append(title, document.createElement("br"), code, note);
    el.hidden = false;
  }

  function hide() {
    var el = document.getElementById("wg-jeton");
    if (el) el.hidden = true;
  }

  window.addEventListener("wg:verifie", function (ev) {
    var d = ev.detail || {};
    var step = d.etape + 1;
    if (!d.reussi || !secret) { if (!d.reussi) hide(); return; }
    lastGreen = step;
    computeToken(step).then(function (token) {
      if (lastGreen !== step) return;   // the participant moved on meanwhile
      show(step, token);
      window.dispatchEvent(new CustomEvent("wg:jeton",
        { detail: { etape: step, jeton: token } }));
    }).catch(function (err) {
      var el = box();
      el.textContent = "Étape réussie, mais le code de validation ne peut pas être calculé ici (" + err.message + ").";
      el.hidden = false;
    });
  });

  /* ---------- platform mode ---------- */

  var CSS =
    "body.wg-plateforme #etapes, body.wg-plateforme #suivant { display: none !important; }" +
    "body.wg-plateforme #consignes > :not(.entete-etape):not(.objectif):not(#defis):not(#wg-jeton)" +
    " { display: none !important; }" +
    "#wg-jeton { margin-top: 12px; }" +
    "#wg-jeton .wg-code { display: inline-block; margin: 6px 0; padding: 4px 8px; font-size: 1.15em;" +
    " user-select: all; }";

  function enable() {
    var style = document.createElement("style");
    style.id = "wg-plateforme-style";
    style.textContent = CSS;
    document.head.appendChild(style);
    document.body.classList.add("wg-plateforme");
  }

  window.VoxelWorld = {
    /** Called by the platform adapter with the per-instance secret. */
    setSecret: function (s) { secret = s ? String(s) : null; tokens = {}; },
    /** Hide the app's own copy of the workshop text. */
    enable: function () {
      if (document.body) enable();
      else document.addEventListener("DOMContentLoaded", enable);
    },
    /** For tests: the token a step would show. */
    token: computeToken,
  };
})();
