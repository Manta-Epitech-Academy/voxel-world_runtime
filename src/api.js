// Ce que le code de l'élève peut appeler : la documentation des fonctions et
// des constantes, servie trois fois — la complétion et le survol dans
// l'éditeur, et l'aide-mémoire au bas des consignes. Les fonctions
// elles-mêmes sont écrites en Lua dans lua/prelude.lua.
import { BLOCS, TAILLE, HAUTEUR } from "./blocs.js";

export const FONCTIONS = [
  {
    nom: "bloc",
    signature: "bloc(x, y, z, type)",
    snippet: "bloc(${1:x}, ${2:y}, ${3:z}, ${4:PIERRE})",
    doc: `Pose un bloc. x et z vont de 0 à ${TAILLE - 1}, y (la hauteur) de 0 à ${HAUTEUR - 1}. Un bloc hors du monde est ignoré.`,
  },
  {
    nom: "lire",
    signature: "lire(x, y, z)",
    snippet: "lire(${1:x}, ${2:y}, ${3:z})",
    doc: "Renvoie le type du bloc à cet endroit (AIR s'il n'y a rien).",
  },
  {
    nom: "bruit",
    signature: "bruit(x, z)",
    snippet: "bruit(${1:x} / ${2:40}, ${3:z} / ${4:40})",
    doc: "Bruit de Perlin : un nombre entre -1 et 1 qui varie doucement. Avec des nombres entiers, il vaut toujours 0 : divise x et z.",
  },
  {
    nom: "bruit3d",
    signature: "bruit3d(x, y, z)",
    snippet: "bruit3d(${1:x} / 16, ${2:y} / 10, ${3:z} / 16)",
    doc: "Bruit de Perlin en 3D, entre -1 et 1. Idéal pour creuser des grottes.",
  },
  {
    nom: "hasard",
    signature: "hasard(a, b)",
    snippet: "hasard(${1:1}, ${2:6})",
    doc: "Un nombre entier au hasard entre a et b (compris). Il dépend de la graine : même graine, mêmes tirages.",
  },
  {
    nom: "afficher",
    signature: "afficher(...)",
    snippet: "afficher(${1})",
    doc: "Écrit des valeurs dans la console, sous l'éditeur.",
  },
];

export const CONSTANTES = [
  { nom: "TAILLE", doc: `Largeur du monde : ${TAILLE} blocs en x et en z (de 0 à ${TAILLE - 1}).` },
  { nom: "HAUTEUR", doc: `Hauteur du monde : ${HAUTEUR} blocs (y de 0 à ${HAUTEUR - 1}).` },
  { nom: "GRAINE", doc: "La graine du monde, choisie au-dessus de l'éditeur." },
  ...BLOCS.map((b) => ({ nom: b.nom, doc: `Bloc : ${b.libelle}.` })),
];

/** Tous les noms que l'élève peut taper, pour suggérer une correction à une faute de frappe. */
export const NOMS_CONNUS = [...FONCTIONS.map((f) => f.nom), ...CONSTANTES.map((c) => c.nom)];
