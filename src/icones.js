// Les icônes des boutons : Font Awesome, comme l'éditeur TIC-80 de
// l'organisation, mais seulement les quelques SVG utilisés, en ligne dans la
// page — pas de police web à charger. Une icône est décorative, le texte du
// bouton (ou son `title`) porte le sens.
import marcher from "@fortawesome/fontawesome-free/svgs/solid/person-walking.svg?raw";
import voler from "@fortawesome/fontawesome-free/svgs/solid/plane.svg?raw";
import de from "@fortawesome/fontawesome-free/svgs/solid/dice.svg?raw";
import recentrer from "@fortawesome/fontawesome-free/svgs/solid/crosshairs.svg?raw";
import generer from "@fortawesome/fontawesome-free/svgs/solid/play.svg?raw";
import attente from "@fortawesome/fontawesome-free/svgs/solid/hourglass-half.svg?raw";
import agrandir from "@fortawesome/fontawesome-free/svgs/solid/expand.svg?raw";
import reduire from "@fortawesome/fontawesome-free/svgs/solid/compress.svg?raw";

const SVG = { marcher, voler, de, recentrer, generer, attente, agrandir, reduire };

/** Le SVG d'une icône, prêt à être inséré dans un bouton. */
export function icone(nom) {
  const svg = SVG[nom].replace("<svg", '<svg class="icone" aria-hidden="true" focusable="false"');
  return svg;
}

/** Remplace le contenu d'un bouton par une icône suivie, s'il y en a un, d'un libellé. */
export function garnir(bouton, nom, libelle) {
  bouton.innerHTML = icone(nom) + (libelle ? `<span>${libelle}</span>` : "");
}
