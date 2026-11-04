// Les sept étapes de l'atelier, dans l'ordre. Chaque étape est un objet
// { titre, duree, lore, outils, pieges, objectif, indices, bonus, defis } ;
// chaque défi a un `nom` et une fonction `verifier(monde, resultat)` qui
// renvoie { ok, message } (voir ../verifications.js).
import etape1 from "./etape1.js";
import etape2 from "./etape2.js";
import etape3 from "./etape3.js";
import etape4 from "./etape4.js";
import etape5 from "./etape5.js";
import etape6 from "./etape6.js";
import etape7 from "./etape7.js";

export const ETAPES = [etape1, etape2, etape3, etape4, etape5, etape6, etape7];

/** Passe tous les défis d'une étape sur un résultat d'exécution : [{ nom, ok, message }]. */
export function verifierEtape(numero, resultat) {
  return ETAPES[numero].defis.map((defi) => ({ nom: defi.nom, ...defi.verifier(resultat.monde, resultat) }));
}
