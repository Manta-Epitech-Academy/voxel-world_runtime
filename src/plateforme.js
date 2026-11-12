// Ce que la plateforme d'atelier (ctfd-workshop-platform) attend de cette
// page. Ouverte seule, la page n'en fait rien.
//
// - Le code de validation. Quand tous les défis d'une étape sont verts, et
//   que la plateforme a confié son secret, l'étape affiche un code :
//   monde{<12 hex>} = les 12 premiers hexadécimaux de
//   HMAC-SHA256(secret, "voxel-world:<n>"), n le numéro de l'étape (1 à 7).
//   La plateforme calcule la même valeur et en fait le flag de l'étape
//   (tools/sync_subject.py, TOKEN_SCHEMES). Sans secret, rien n'est affiché.
//
// - Le mode plateforme. La page ne montre que la vérification de l'étape en
//   cours ; quand un hôte choisit l'étape à la place du participant, ce mode
//   cache aussi les flèches qui changent d'étape.
//
// Le Lua de l'élève ne peut rien atteindre de tout cela : il tourne dans
// wasmoon sans accès au JavaScript de la page (lua/worker.js). Ce qu'un code
// prouve est ce qu'une vérification côté client peut prouver : que les défis
// sont passés au vert dans le déroulement normal.
//
// Événements écoutés : `wg:verifie` (main.js, après chaque génération),
// détail { etape (0 à 6), defis: [{nom, ok}], reussi }.
// Événement émis : `wg:jeton`, détail { etape (1 à 7), jeton }, que
// l'adaptateur de la plateforme recopie dans la case de l'étape.

const SCHEMA = "voxel-world:";
let secret = null;
let jetons = {}; // numéro d'étape -> jeton, calculé une fois
let derniereVerte = null; // numéro de la dernière étape passée au vert
let sansDefi = false; // l'étape de la plateforme n'a pas de défi dans la page

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

function calculerJeton(etape) {
  if (jetons[etape]) return Promise.resolve(jetons[etape]);
  if (!(window.crypto && crypto.subtle)) {
    return Promise.reject(new Error("crypto.subtle a besoin de HTTPS (ou de localhost)"));
  }
  const enc = new TextEncoder();
  return crypto.subtle
    .importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((cle) => crypto.subtle.sign("HMAC", cle, enc.encode(SCHEMA + etape)))
    .then((signature) => {
      jetons[etape] = "monde{" + hex(signature).slice(0, 12) + "}";
      return jetons[etape];
    });
}

// ---- la boîte sous la liste des défis ----------------------------------

function boite() {
  let el = document.getElementById("wg-jeton");
  if (!el) {
    el = document.createElement("div");
    el.id = "wg-jeton";
    el.className = "callout";
    el.hidden = true;
  }
  // Le panneau est reconstruit à chaque changement d'étape :
  // la boîte est remise après la liste des défis à chaque fois.
  const defis = document.getElementById("defis");
  if (defis && el.previousElementSibling !== defis) defis.after(el);
  return el;
}

function montrer(etape, jeton) {
  const el = boite();
  el.replaceChildren();
  const titre = document.createElement("strong");
  titre.textContent = "Étape " + etape + " réussie ! Ton code de validation :";
  const code = document.createElement("code");
  code.className = "wg-code";
  code.textContent = jeton;
  const note = document.createElement("div");
  note.className = "message";
  note.textContent =
    "Il est déjà recopié dans la case de l'étape, sur la page de l'atelier : il ne te reste qu'à valider.";
  el.append(titre, document.createElement("br"), code, note);
  el.hidden = false;
}

function cacher() {
  const el = document.getElementById("wg-jeton");
  if (el) el.hidden = true;
}

window.addEventListener("wg:verifie", (ev) => {
  const d = ev.detail || {};
  const etape = d.etape + 1;
  // La page montre encore les défis d'une autre étape : un code proposé ici
  // le serait pour la mauvaise.
  if (sansDefi) {
    cacher();
    return;
  }
  if (!d.reussi) {
    cacher();
    return;
  }
  if (!secret) return;
  derniereVerte = etape;
  calculerJeton(etape)
    .then((jeton) => {
      if (derniereVerte !== etape) return; // l'élève a changé d'étape entre-temps
      montrer(etape, jeton);
      window.dispatchEvent(new CustomEvent("wg:jeton", { detail: { etape, jeton } }));
    })
    .catch((err) => {
      const el = boite();
      el.textContent =
        "Étape réussie, mais le code de validation ne peut pas être calculé ici (" + err.message + ").";
      el.hidden = false;
    });
});

// ---- le mode plateforme -------------------------------------------------

const CSS = `
body.wg-plateforme:not(.wg-navigation) .etape-nav { display: none !important; }
body.wg-sans-defi #verification > :not(#wg-sans-defi) { display: none !important; }
#wg-sans-defi { margin: 4px 0; }
#wg-jeton { margin-top: 12px; }
#wg-jeton .wg-code { display: inline-block; margin: 6px 0; padding: 4px 8px; font-size: 1.15em; user-select: all; }
`;

function activer(options) {
  if (!document.getElementById("wg-plateforme-style")) {
    const style = document.createElement("style");
    style.id = "wg-plateforme-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  document.body.classList.add("wg-plateforme");
  // Sans hôte à suivre (un runtime servi depuis une autre origine, à qui la
  // plateforme ne peut pas parler), l'élève change d'étape lui-même : les
  // flèches restent.
  document.body.classList.toggle("wg-navigation", !!(options && options.navigation));
}

function quandPret(fn) {
  if (document.body) fn();
  else document.addEventListener("DOMContentLoaded", fn);
}

function choisirSansDefi(actif) {
  sansDefi = actif;
  document.body.classList.toggle("wg-sans-defi", actif);
  let note = document.getElementById("wg-sans-defi");
  if (actif) {
    if (!note) {
      note = document.createElement("div");
      note.id = "wg-sans-defi";
      note.className = "callout";
      note.textContent =
        "Pas de vérification automatique pour cette étape : vérifie ton monde avec la liste du sujet, à côté.";
    }
    const panneau = document.getElementById("verification");
    if (panneau && note.parentNode !== panneau) panneau.prepend(note);
    cacher();
  } else if (note) {
    note.remove();
  }
}

// `?plateforme=1` dans l'adresse : le mode plateforme sans hôte. Utilisé
// quand la plateforme affiche cette page depuis une autre origine, où aucun
// adaptateur ne peut être injecté (docs/RUNTIME_PROTOCOL.md, `external:
// true`). Pas de secret, donc pas de code : les étapes sont validées
// autrement (codes de l'animateur).
try {
  if (new URLSearchParams(location.search).get("plateforme") === "1") {
    quandPret(() => activer({ navigation: true }));
  }
} catch {
  // pas d'URLSearchParams : la page reste autonome
}

window.VoxelWorld = {
  /** Appelé par l'adaptateur de la plateforme avec le secret de l'instance. */
  setSecret(s) {
    secret = s ? String(s) : null;
    jetons = {};
  },
  /** Le mode plateforme (voir en tête de fichier). */
  enable(options) {
    quandPret(() => activer(options));
  },
  /** L'étape de la plateforme n'a pas de défi dans la page (ou en a de nouveau un). */
  etapeSansDefi(actif) {
    quandPret(() => choisirSansDefi(!!actif));
  },
  /** Pour les tests : le code qu'une étape afficherait. */
  token: calculerJeton,
};
