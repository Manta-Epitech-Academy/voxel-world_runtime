// World Generator : le point d'entrée. Relie l'éditeur, l'exécution du Lua,
// la vue 3D, les consignes et la progression de l'élève.
import "./style.css";
import "./plateforme.js";
import { NB_CASES } from "./blocs.js";
import { ETAPES, verifierEtape } from "./etapes/index.js";
import { Editeur } from "./editeur.js";
import { executer, LIMITE_SECONDES } from "./executeur.js";
import { expliquerErreur } from "./erreurs.js";
import { Monde3D } from "./monde3d.js";
import { afficherConsole } from "./console.js";
import { afficherConsignes, afficherDefis } from "./consignes.js";
import { monterDisposition } from "./disposition.js";
import { stockage } from "./stockage.js";

const CODE_DE_DEPART = `-- Bienvenue, architecte !
-- Écris ton code ici, puis clique sur ▶ Générer (ou Ctrl + Entrée).

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

const disposition = monterDisposition($("espaces"));

const rendu = new Monde3D($("monde"));
rendu.vol.onChangement = (actif) => {
  $("aide-vol").hidden = actif;
  $("viseur").hidden = !actif;
};
rendu.vol.onMode = (mode) => {
  const marche = mode === "marche";
  $("mode").textContent = marche ? "✈️ Voler" : "🚶 Marcher";
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
  bouton.textContent = "⏳ Génération…";
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
      `⚠️ ${nombre(n)} bloc${s} posé${s} hors du monde (ignoré${s}). x et z vont de 0 à 127, y de 0 à 63.`,
      "alerte",
    ]);
  }
  if (resultat.erreur) {
    const explication = expliquerErreur(resultat.erreur, LIMITE_SECONDES, code);
    const ligne = resultat.erreur.ligne;
    lignes.push([(ligne ? `❌ Ligne ${ligne} : ` : "❌ ") + explication, "erreur"]);
    if (resultat.erreur.brut !== explication && resultat.erreur.type !== "temps") {
      lignes.push([`   (message de Lua : ${resultat.erreur.brut})`, "gris"]);
    }
    if (ligne) editeur.montrerErreur(ligne, explication);
  }
  afficherConsole(lignes);
  if (resultat.erreur) disposition.montrer("console");

  if (resultat.monde) {
    const triangles = rendu.afficherMonde(resultat.monde);
    let blocs = 0;
    for (let i = 0; i < NB_CASES; i++) if (resultat.monde[i]) blocs++;
    $("statut").textContent =
      `${nombre(blocs)} blocs · ${nombre(triangles)} triangles · ${(resultat.duree / 1000).toFixed(2)} s`;
    // Un code arrêté pour cause de temps a quand même construit quelque chose : on le vérifie.
    if (!resultat.erreur || resultat.erreur.type === "temps") {
      etat.dernierResultat = resultat;
      verifier();
    }
  }

  bouton.disabled = false;
  bouton.textContent = "▶ Générer";
  etat.enCours = false;
}

/** Passe les défis de l'étape sur le dernier monde généré, et retient ceux qui sont réussis. */
function verifier() {
  if (!etat.dernierResultat) return;
  const resultats = verifierEtape(etat.etape, etat.dernierResultat);
  const avant = etat.reussites[etat.etape] || [];
  etat.reussites[etat.etape] = resultats.map((r, i) => r.ok || !!avant[i]);
  stockage.ecrire("reussites", etat.reussites);
  afficherDefis(ETAPES[etat.etape], resultats, etat.reussites[etat.etape], etapeReussie(etat.etape));
  afficherEtapes();
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

/** Les pastilles numérotées de la barre du haut. */
function afficherEtapes() {
  $("etapes").replaceChildren(
    ...ETAPES.map((etape, i) => {
      const pastille = document.createElement("button");
      pastille.className =
        "pastille" + (i === etat.etape ? " active" : "") + (etapeReussie(i) ? " finie" : "");
      pastille.textContent = etapeReussie(i) ? "✓" : String(i + 1);
      pastille.title = `Étape ${i + 1} : ${etape.titre}`;
      pastille.addEventListener("click", () => choisirEtape(i));
      return pastille;
    }),
  );
}

function afficherEtape() {
  const etape = ETAPES[etat.etape];
  afficherConsignes(etape, etat.etape + 1, ETAPES.length, {
    editeur,
    titreSuivant: ETAPES[etat.etape + 1]?.titre,
    onSuivant: (numero) => choisirEtape(numero),
  });
  afficherDefis(etape, null, etat.reussites[etat.etape] || [], etapeReussie(etat.etape));
}

function choisirEtape(i) {
  etat.etape = i;
  stockage.ecrire("etape", i);
  afficherEtapes();
  afficherEtape();
  $("consignes").scrollTop = 0;
  if (etat.dernierResultat) verifier();
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
$("disposition").addEventListener("click", (ev) => {
  disposition.reinitialiser();
  ev.currentTarget.blur();
});

// ---- au départ ----------------------------------------------------------

afficherEtapes();
afficherEtape();
if (editeur.valeur.trim() !== CODE_DE_DEPART.trim()) {
  generer();
} else {
  afficherConsole([["Prêt. Écris ton code, puis clique sur ▶ Générer.", "gris"]]);
}

/** Pour les tests et les scripts (export de scène) : les morceaux de la page. */
window.__mwg = { editeur, generer, choisirEtape, etat, rendu, disposition };
