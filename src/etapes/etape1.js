// Étape 1 : poser un bloc. Le défi vérifie une seule case, et dit où le bloc est allé à la place.
// Le texte de cette étape vit dans le sujet (voxel-world_subject) ; ici, son titre et ses défis.
import {
  B,
  TAILLE,
  HAUTEUR,
  index,
  blocEn,
  nomDuBloc,
  ok,
  rate,
  compter,
  premierBloc,
  hauteurs,
  plusGrandeMarche,
  verifierCouches,
} from "../verifications.js";

export default {
  titre: "Premier bloc",
  defis: [
    {
      nom: "Un bloc de pierre en (64, 10, 64)",
      verifier(monde, { horsMonde }) {
        const b = blocEn(monde, 64, 10, 64);
        if (b === B.PIERRE) return ok("Ton premier bloc est posé. Vole jusqu'à lui pour le voir de près !");
        if (b !== B.AIR)
          return rate(`Il y a bien un bloc en (64, 10, 64), mais c'est ${nomDuBloc(b)} et pas PIERRE.`);
        const premier = premierBloc(monde);
        if (!premier && horsMonde) {
          return rate(
            "Ton bloc est tombé hors du monde : x et z vont de 0 à 127, y de 0 à 63. Vérifie l'ordre x, y, z.",
          );
        }
        if (premier) {
          return rate(
            `Il y a un bloc en (${premier.x}, ${premier.y}, ${premier.z}), pas en (64, 10, 64). Vérifie l'ordre x, y, z.`,
          );
        }
        return rate("Le monde est vide. As-tu écrit un appel à set_block(...) puis cliqué sur ▶ Générer ?");
      },
    },
  ],
};
