// La console sous l'éditeur : ce que le code affiche, les avertissements, les
// erreurs — et une invite où taper du Lua pour l'essayer, comme dans le
// runtime Pac-Man. La ligne tapée tourne dans l'état Lua de la dernière
// génération (src/lua/worker.js) : les fonctions et variables de l'élève
// sont visibles, et `get_block` regarde le monde affiché.
//
// Les exemples des boîtes à outils tiennent sur plusieurs lignes : tant que
// Lua signale un morceau incomplet, les lignes sont gardées de côté et
// l'invite passe à « >> ». Une ligne vide, ou Échap, abandonne le morceau.

const INVITE =
  "Tape du code Lua ici pour l'essayer, par exemple get_block(64, 10, 64) ou set_block(64, 20, 64, DIAMANT).";
const INVITE_SUITE = "Continue ton exemple, ou laisse vide pour annuler.";

const sortie = () => document.getElementById("console");

function ligne([texte, classe]) {
  const div = document.createElement("div");
  if (classe) div.className = classe;
  div.textContent = texte;
  return div;
}

/** Remplace tout le contenu de la console. Chaque ligne est [texte, classe]. */
export function afficherConsole(lignes) {
  const el = sortie();
  el.replaceChildren(...lignes.map(ligne));
  el.scrollTop = el.scrollHeight;
}

/** Ajoute des lignes à la suite. */
export function ajouterConsole(lignes) {
  const el = sortie();
  el.append(...lignes.map(ligne));
  el.scrollTop = el.scrollHeight;
}

/**
 * Branche l'invite. `onLigne(src)` reçoit le morceau tapé (une ou plusieurs
 * lignes) et renvoie une promesse de `{ incomplet }` ; l'affichage de ce que
 * la ligne a produit est son affaire. Les flèches haut et bas parcourent
 * l'historique.
 */
export function initConsole({ onLigne }) {
  const entree = document.getElementById("console-entree");
  const invite = document.getElementById("console-invite");
  const historique = [];
  let curseur = 0;
  let morceau = [];
  let occupe = false;

  const regler = (suite) => {
    invite.textContent = suite ? ">>" : ">";
    entree.placeholder = suite ? INVITE_SUITE : INVITE;
  };
  const abandonner = () => {
    morceau = [];
    regler(false);
  };
  regler(false);

  document.getElementById("vider-console").addEventListener("click", () => {
    afficherConsole([]);
    entree.focus();
  });

  entree.addEventListener("keydown", async (ev) => {
    if (ev.key === "Escape" && morceau.length) {
      entree.value = "";
      abandonner();
      ev.preventDefault();
      return;
    }
    if (ev.key === "ArrowUp" && historique.length) {
      curseur = Math.max(0, curseur - 1);
      entree.value = historique[curseur] || "";
      ev.preventDefault();
      return;
    }
    if (ev.key === "ArrowDown" && historique.length) {
      curseur = Math.min(historique.length, curseur + 1);
      entree.value = historique[curseur] || "";
      ev.preventDefault();
      return;
    }
    if (ev.key !== "Enter" || ev.ctrlKey || ev.metaKey || occupe) return;
    const texte = entree.value.trim();
    if (!texte) {
      // Une ligne vide abandonne le morceau en attente, sinon ne fait rien.
      if (morceau.length) abandonner();
      return;
    }
    historique.push(texte);
    curseur = historique.length;
    entree.value = "";
    ajouterConsole([[(morceau.length ? ">> " : "> ") + texte, "echo"]]);
    morceau.push(texte);
    occupe = true;
    entree.disabled = true;
    try {
      const { incomplet } = await onLigne(morceau.join("\n"));
      if (incomplet) regler(true);
      else abandonner();
    } finally {
      occupe = false;
      entree.disabled = false;
      entree.focus();
    }
  });
}
