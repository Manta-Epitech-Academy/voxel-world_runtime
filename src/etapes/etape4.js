// Étape 4 : les collines, avec math.sin. Des hauteurs variées, mais pas de marche de plus de 2.
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
  titre: "Les collines",
  defis: [
    {
      nom: "Des collines douces avec les bonnes couches",
      verifier(monde) {
        const couches = verifierCouches(monde);
        if (!couches.ok) return couches;
        const sommets = hauteurs(monde);
        const differentes = new Set(sommets).size;
        if (differentes === 1) {
          return rate(
            "Toutes les colonnes ont la même hauteur : le terrain est encore plat. Calcule h pour chaque colonne.",
          );
        }
        if (differentes < 8)
          return rate(`Seulement ${differentes} hauteurs différentes. Augmente la hauteur de tes vagues.`);
        const { max, ou } = plusGrandeMarche(sommets);
        if (max > 2) {
          return rate(
            `Entre (${ou[0]}, ${ou[1]}) et (${ou[2]}, ${ou[3]}), le terrain fait une marche de ${max} blocs. Tes collines sont trop raides : divise x et z par de plus grands nombres.`,
          );
        }
        return ok(`${differentes} hauteurs différentes, et le terrain monte en douceur.`);
      },
    },
  ],
};
