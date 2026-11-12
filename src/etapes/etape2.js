// Étape 2 : le sol plat. Les 16 384 colonnes doivent avoir un bloc à y = 0.
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
  titre: "Le sol plat",
  defis: [
    {
      nom: "Les 16 384 colonnes ont un bloc à y = 0",
      verifier(monde, { horsMonde }) {
        let manquantes = 0;
        let premiere = null;
        const lignesPosees = new Set();
        for (let z = 0; z < TAILLE; z++)
          for (let x = 0; x < TAILLE; x++) {
            if (blocEn(monde, x, 0, z) === B.AIR) {
              manquantes++;
              premiere ??= [x, z];
            } else {
              lignesPosees.add(z);
            }
          }
        if (manquantes === 0) {
          const note = horsMonde
            ? ` (${horsMonde} blocs sont tombés hors du monde : ta boucle va un cran trop loin.)`
            : "";
          return ok("Le sol est complet." + note);
        }
        if (manquantes === TAILLE * TAILLE)
          return rate("Aucun bloc à y = 0. Ton sol est-il posé à la bonne hauteur ?");
        if (lignesPosees.size === 1) {
          return rate(
            "Tu as posé une seule ligne. Il faut une deuxième boucle, sur z, autour (ou à l'intérieur) de la première.",
          );
        }
        return rate(
          `Il manque encore ${manquantes} colonnes, par exemple en (${premiere[0]}, 0, ${premiere[1]}). Tes boucles vont-elles bien de 0 à TAILLE - 1 ?`,
        );
      },
    },
  ],
};
