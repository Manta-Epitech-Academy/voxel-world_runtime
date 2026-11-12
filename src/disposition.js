// La disposition des panneaux : dockview, comme l'éditeur TIC-80 de
// l'organisation. Quatre panneaux — le monde 3D, la vérification, le code, la
// console — que l'élève peut redimensionner, déplacer en les glissant par
// leur onglet, et agrandir à toute la page (le bouton ⛶ de chaque groupe).
// La disposition est gardée dans le navigateur, et aucun panneau ne peut
// être fermé : un panneau retiré revient aussitôt.
// L'entrée ESM de dockview-core (8.x) ne contient pas ses styles : c'est la
// construction `dist/dockview-core.js` qui les injecte dans la page.
import { createDockview, themeDark } from "dockview-core/dist/dockview-core.js";
import { stockage } from "./stockage.js";

const CLE = "disposition";
/** À changer quand les panneaux changent : une disposition d'une autre version est ignorée. */
const VERSION = 3;

export const PANNEAUX = {
  monde: "Monde 3D",
  code: "Code",
  console: "Console",
};
/** Le panneau de la vérification automatique, quand elle est active (main.js). */
const PANNEAU_VERIFICATION = { verification: "Vérification" };

const ICONE_AGRANDIR = "M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5";
const ICONE_REDUIRE = "M6 1v5H1M15 6h-5V1M10 15v-5h5M1 10h5v5";
const svg = (chemin) =>
  `<svg class="icone-agrandir" viewBox="0 0 16 16" aria-hidden="true"><path d="${chemin}"/></svg>`;

/** Le contenu d'un panneau : l'élément déjà écrit dans index.html, adopté tel quel. */
function contenu(id) {
  const element = document.getElementById("panneau-" + id);
  element.hidden = false;
  return { element, init() {} };
}

/** Un onglet sans bouton de fermeture : juste le titre. */
function onglet() {
  const element = document.createElement("div");
  element.className = "onglet";
  return {
    element,
    init({ title }) {
      element.textContent = title;
    },
  };
}

/** Le bouton ⛶ à droite des onglets : agrandit le groupe à toute la page, ou le réduit. */
function boutonAgrandir(groupe) {
  const element = document.createElement("button");
  element.className = "bouton agrandir";
  element.type = "button";
  let abonnement = null;
  const rafraichir = () => {
    const agrandi = groupe.api.isMaximized();
    element.innerHTML = svg(agrandi ? ICONE_REDUIRE : ICONE_AGRANDIR);
    element.title = agrandi ? "Revenir à la disposition" : "Agrandir à toute la page";
    element.setAttribute("aria-pressed", String(agrandi));
  };
  element.addEventListener("click", () => {
    if (groupe.api.isMaximized()) groupe.api.exitMaximized();
    else groupe.api.maximize();
    element.blur();
  });
  return {
    element,
    init({ containerApi }) {
      rafraichir();
      abonnement = containerApi.onDidMaximizedGroupChange(rafraichir);
    },
    dispose() {
      abonnement?.dispose();
    },
  };
}

/**
 * Monte dockview dans `hote` et renvoie son API, augmentée de
 * `montrer(id)` (mettre un panneau devant).
 */
export function monterDisposition(hote, { verification = false } = {}) {
  const panneaux = verification ? { ...PANNEAUX, ...PANNEAU_VERIFICATION } : PANNEAUX;
  const api = createDockview(hote, {
    theme: themeDark,
    createComponent: ({ name }) => contenu(name),
    defaultTabComponent: "onglet",
    createTabComponent: () => onglet(),
    createRightHeaderActionComponent: (groupe) => boutonAgrandir(groupe),
    disableFloatingGroups: true,
    singleTabMode: "fullwidth",
  });

  function ouvrir(id, position, taille = {}) {
    return api.addPanel({ id, component: id, title: panneaux[id], position, ...taille });
  }

  // Le monde à gauche, le code à droite sur toute la hauteur, la console
  // sous le code ; et la vérification sous le monde, quand elle est active.
  function dispositionParDefaut() {
    const { clientWidth: largeur, clientHeight: hauteur } = hote;
    ouvrir("monde");
    ouvrir(
      "code",
      { referencePanel: "monde", direction: "right" },
      { initialWidth: Math.round(largeur * 0.45) },
    );
    if (verification) {
      ouvrir(
        "verification",
        { referencePanel: "monde", direction: "below" },
        { initialHeight: Math.round(hauteur * 0.2) },
      );
    }
    ouvrir(
      "console",
      { referencePanel: "code", direction: "below" },
      { initialHeight: Math.round(hauteur * 0.22) },
    );
    api.getPanel("code")?.api.setActive();
  }

  const sauvegarde = stockage.lire(CLE, null);
  let restauree = false;
  if (sauvegarde && sauvegarde.version === VERSION) {
    try {
      api.fromJSON(sauvegarde.disposition);
      restauree = true;
    } catch {
      restauree = false;
    }
  }
  if (!restauree) dispositionParDefaut();

  // Un panneau manquant (disposition ancienne, ou fermé par un menu) est rouvert.
  const completer = () => {
    for (const id of Object.keys(panneaux)) if (!api.getPanel(id)) ouvrir(id, { direction: "right" });
  };
  completer();
  api.onDidRemovePanel(() => queueMicrotask(completer));

  let minuteur = null;
  api.onDidLayoutChange(() => {
    clearTimeout(minuteur);
    minuteur = setTimeout(() => stockage.ecrire(CLE, { version: VERSION, disposition: api.toJSON() }), 300);
  });

  api.montrer = (id) => api.getPanel(id)?.api.setActive();
  return api;
}
