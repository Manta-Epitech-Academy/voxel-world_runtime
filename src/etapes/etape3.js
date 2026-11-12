// Étape 3 : les couches. Bedrock, pierre, trois terre, herbe, dans chaque colonne.
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
  titre: "Les couches",
  defis: [{ nom: "Bedrock, pierre, 3 terre, herbe", verifier: (monde) => verifierCouches(monde) }],
};
