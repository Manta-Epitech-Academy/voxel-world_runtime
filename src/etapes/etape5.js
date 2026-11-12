// Étape 5 : le relief avec le bruit de Perlin. Au moins DENIVELE_MIN blocs entre le plus bas et le plus haut.
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

const DENIVELE_MIN = 15;

export default {
  titre: "Le vrai relief",
  defis: [
    {
      nom: "Un relief naturel fait avec perlin2d",
      verifier(monde, { appels }) {
        if (appels.bruit === 0)
          return rate("Tu n'utilises pas encore perlin2d(x, z). Remplace math.sin par perlin2d.");
        const couches = verifierCouches(monde);
        if (!couches.ok) return couches;
        const sommets = hauteurs(monde);
        let bas = Infinity;
        let haut = -Infinity;
        for (const h of sommets) [bas, haut] = [Math.min(bas, h), Math.max(haut, h)];
        if (haut === bas && appels.bruitEntier > appels.bruit * 0.9) {
          return rate(
            "Ton terrain est plat parce que perlin2d reçoit des nombres entiers : perlin2d(3, 7) vaut toujours 0. Divise x et z, par exemple perlin2d(x / 40, z / 40).",
          );
        }
        if (haut - bas < DENIVELE_MIN) {
          return rate(
            `Ton relief va de y = ${bas} à y = ${haut} : ${haut - bas} blocs de dénivelé. Il en faut au moins ${DENIVELE_MIN}. Multiplie davantage ton bruit.`,
          );
        }
        const { max, ou } = plusGrandeMarche(sommets);
        if (max > 3) {
          return rate(
            `Une falaise de ${max} blocs entre (${ou[0]}, ${ou[1]}) et (${ou[2]}, ${ou[3]}). Divise davantage x et z dans tes bruits.`,
          );
        }
        return ok(`Un relief de ${haut - bas} blocs, de y = ${bas} à y = ${haut}. Essaie d'autres seeds !`);
      },
    },
  ],
};
