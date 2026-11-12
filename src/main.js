// World Generator : le point d'entrée. Relie l'éditeur, l'exécution du Lua,
// la vue 3D, la vérification des défis et la progression de l'élève.
import "./style.css";
import "./plateforme.js";
import { NB_CASES } from "./blocs.js";
import { ETAPES, verifierEtape } from "./etapes/index.js";
import { garnir } from "./icones.js";
import { Editeur } from "./editeur.js";
import { executer, evaluer, LIMITE_SECONDES } from "./executeur.js";
import { expliquerErreur } from "./erreurs.js";
import { Monde3D } from "./monde3d.js";
import { afficherConsole, ajouterConsole, initConsole } from "./console.js";
import { afficherVerification, afficherDefis } from "./verification.js";

/**
 * La vérification automatique des défis : désactivée (2026-11-12). Les
 * étapes sont validées par l'animateur, avec un code ; la page ne montre
 * plus de panneau « Vérification » et n'annonce plus de résultat. Les défis
 * restent dans etapes/ et verifications.js : remettre `true` les ranime.
 */
export const VERIFICATION_AUTO = false;
import { monterDisposition } from "./disposition.js";
import { stockage } from "./stockage.js";

const CODE_DE_DEPART = `-- Bienvenue, architecte !
-- Écris ton code ici, puis clique sur Générer (ou Ctrl + Entrée).

`;

const $ = (id) => document.getElementById(id);
const nombre = (n) => n.toLocaleString("fr-FR");

// ---- l'état -------------------------------------------------------------

const etat = {
  etape: Math.min(stockage.lire("etape", 0), ETAPES.length - 1),
  reussites: stockage.lire("reussites", {}), // étape -> [défi réussi ?]
  dernierResultat: null,
  enCours: false,
};

const etapeReussie = (i) => {
  const r = etat.reussites[i];
  return !!r && r.length === ETAPES[i].defis.length && r.every(Boolean);
};

// ---- les panneaux ---------------------------------------------------------

const disposition = monterDisposition($("espaces"), { verification: VERIFICATION_AUTO });

const rendu = new Monde3D($("monde"));
rendu.vol.onChangement = (actif) => {
  // L'aide reste lisible pendant le vol, en transparence, pour qui cherche une touche.
  $("aide-vol").classList.toggle("capture", actif);
  $("viseur").hidden = !actif;
};
rendu.vol.onMode = (mode) => {
  const marche = mode === "marche";
  garnir($("mode"), marche ? "voler" : "marcher", marche ? "Voler" : "Marcher");
  $("aide-titre").textContent = marche ? "Clique pour marcher" : "Clique pour voler";
  $("aide-vertical").innerHTML = marche
    ? "<kbd>Espace</kbd> sauter (et nager vers le haut)"
    : "<kbd>Espace</kbd> monter · <kbd>Maj</kbd> descendre";
};

const editeur = new Editeur($("editeur"), {
  code: stockage.lire("code", CODE_DE_DEPART),
  onExecuter: () => generer(),
  onChange: (code) => stockage.ecrire("code", code),
});

const graine = $("graine");
graine.value = stockage.lire("graine", 1);

// ---- générer ------------------------------------------------------------

async function generer() {
  if (etat.enCours) return;
  etat.enCours = true;
  const bouton = $("generer");
  bouton.disabled = true;
  garnir(bouton, "attente", "Génération…");
  $("statut").textContent = "";
  editeur.effacerErreurs();

  const valeurGraine = Math.floor(Number(graine.value)) || 0;
  stockage.ecrire("graine", valeurGraine);
  const code = editeur.valeur;
  const resultat = await executer(code, valeurGraine);

  const lignes = resultat.sorties.map((s) => [s]);
  if (resultat.tronque) lignes.push(["… (la suite de la console est coupée)", "gris"]);
  if (resultat.horsMonde) {
    const n = resultat.horsMonde;
    const s = n > 1 ? "s" : "";
    lignes.push([
      `Attention : ${nombre(n)} bloc${s} posé${s} hors du monde (ignoré${s}). x et z vont de 0 à 127, y de 0 à 63.`,
      "alerte",
    ]);
  }
  if (resultat.erreur) lignes.push(...lignesErreur(resultat.erreur, code, true));
  afficherConsole(lignes);
  if (resultat.erreur) disposition.montrer("console");

  if (resultat.monde) {
    const triangles = rendu.afficherMonde(resultat.monde);
    let blocs = 0;
    for (let i = 0; i < NB_CASES; i++) if (resultat.monde[i]) blocs++;
    $("statut").textContent =
      `${nombre(blocs)} blocs · ${nombre(triangles)} triangles · ${(resultat.duree / 1000).toFixed(2)} s`;
    // Un code arrêté pour cause de temps a quand même construit quelque chose : on le vérifie.
    if (VERIFICATION_AUTO && (!resultat.erreur || resultat.erreur.type === "temps")) {
      etat.dernierResultat = resultat;
      verifier();
    }
  }

  bouton.disabled = false;
  garnir(bouton, "generer", "Générer");
  etat.enCours = false;
}

/** Une erreur de Lua, en lignes pour la console (et dans l'éditeur si elle a une ligne). */
function lignesErreur(erreur, code, dansEditeur) {
  const explication = expliquerErreur(erreur, LIMITE_SECONDES, code);
  const { ligne } = erreur;
  const lignes = [
    [(ligne && dansEditeur ? `Erreur, ligne ${ligne} : ` : "Erreur : ") + explication, "erreur"],
  ];
  if (erreur.brut !== explication && erreur.type !== "temps") {
    lignes.push([`   (message de Lua : ${erreur.brut})`, "gris"]);
  }
  if (ligne && dansEditeur) editeur.montrerErreur(ligne, explication);
  return lignes;
}

/** Une ligne tapée dans la console : évaluée dans l'état Lua de la dernière génération. */
async function evaluerLigne(src) {
  if (etat.enCours) {
    ajouterConsole([["Attends la fin de la génération.", "gris"]]);
    return { incomplet: false };
  }
  const resultat = await evaluer(src, Math.floor(Number(graine.value)) || 0);
  if (resultat.incomplet) return { incomplet: true };
  const lignes = resultat.sorties.map((s) => [s]);
  if (resultat.tronque) lignes.push(["… (la suite de la console est coupée)", "gris"]);
  if (resultat.valeur !== null && resultat.valeur !== undefined) lignes.push([resultat.valeur, "valeur"]);
  if (resultat.erreur) {
    lignes.push(...lignesErreur(resultat.erreur, src, false));
    if (resultat.perdu) {
      lignes.push([
        "La console repart d'un état neuf : clique sur Générer pour retrouver ton monde.",
        "gris",
      ]);
    }
  }
  ajouterConsole(lignes);
  if (resultat.monde) {
    const triangles = rendu.afficherMonde(resultat.monde);
    $("statut").textContent = `${nombre(triangles)} triangles · modifié depuis la console`;
  }
  return { incomplet: false };
}

/** Passe les défis de l'étape sur le dernier monde généré, et retient ceux qui sont réussis. */
function verifier() {
  if (!etat.dernierResultat) return;
  const resultats = verifierEtape(etat.etape, etat.dernierResultat);
  const avant = etat.reussites[etat.etape] || [];
  etat.reussites[etat.etape] = resultats.map((r, i) => r.ok || !!avant[i]);
  stockage.ecrire("reussites", etat.reussites);
  afficherDefis(ETAPES[etat.etape], resultats, etat.reussites[etat.etape]);
  window.dispatchEvent(
    new CustomEvent("wg:verifie", {
      detail: {
        etape: etat.etape,
        defis: resultats.map((r) => ({ nom: r.nom, ok: !!r.ok })),
        reussi: etapeReussie(etat.etape),
      },
    }),
  );
}

// ---- les étapes ---------------------------------------------------------

function afficherEtape() {
  if (!VERIFICATION_AUTO) return;
  const etape = ETAPES[etat.etape];
  afficherVerification(etape, etat.etape + 1, ETAPES.length, { onChoisir: (i) => choisirEtape(i) });
  afficherDefis(etape, null, etat.reussites[etat.etape] || []);
}

function choisirEtape(i) {
  etat.etape = i;
  stockage.ecrire("etape", i);
  afficherEtape();
  if (VERIFICATION_AUTO) {
    $("verification").scrollTop = 0;
    if (etat.dernierResultat) verifier();
  }
}

/** Pour l'adaptateur de la plateforme : suivre l'étape que l'élève lit. */
window.WorldGenerator = {
  allerA: (i) => {
    if (i >= 0 && i < ETAPES.length) choisirEtape(i);
  },
  etape: () => etat.etape,
  nombreEtapes: () => ETAPES.length,
};

// ---- les boutons ----------------------------------------------------------

garnir($("generer"), "generer", "Générer");
garnir($("de"), "de");
garnir($("recentrer"), "recentrer", "Recentrer");
garnir($("mode"), "marcher", "Marcher");
$("generer").addEventListener("click", generer);
document.addEventListener("keydown", (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
    ev.preventDefault();
    generer();
  }
});
$("de").addEventListener("click", () => {
  graine.value = Math.floor(Math.random() * 1e5);
  generer();
});
graine.addEventListener("change", generer);
$("recentrer").addEventListener("click", () => rendu.recentrer());
$("mode").addEventListener("click", (ev) => {
  rendu.vol.basculer();
  ev.currentTarget.blur();
});

initConsole({ onLigne: evaluerLigne });

// ---- au départ ----------------------------------------------------------

afficherEtape();
if (editeur.valeur.trim() !== CODE_DE_DEPART.trim()) {
  generer();
} else {
  afficherConsole([["Prêt.", "gris"]]);
}

/** Pour les tests et les scripts (export de scène) : les morceaux de la page. */
window.__mwg = { editeur, generer, choisirEtape, etat, rendu, disposition };
