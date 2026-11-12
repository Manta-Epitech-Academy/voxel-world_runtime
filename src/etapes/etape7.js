// Étape 7 : des arbres sur l'herbe, des grottes creusées au bruit3d, du charbon et des diamants au fond.
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

const ARBRES_MIN = 10;
/** Les diamants restent sous cette hauteur. */
const PLAFOND_DIAMANT = 12;

/**
 * Compte les arbres : un tronc d'au moins trois BOIS posé sur l'herbe ou la
 * terre, avec des FEUILLES près de son sommet. Note aussi le premier tronc
 * sans feuilles, le premier qui flotte, et le premier planté ailleurs.
 */
function compterArbres(monde) {
  let arbres = 0;
  let sansFeuilles = null;
  let flottant = null;
  let malPlante = null;
  for (let y = 1; y < HAUTEUR; y++)
    for (let z = 0; z < TAILLE; z++)
      for (let x = 0; x < TAILLE; x++) {
        if (monde[index(x, y, z)] !== B.BOIS) continue;
        const dessous = monde[index(x, y - 1, z)];
        if (dessous === B.BOIS || dessous === B.FEUILLES) continue; // pas le pied du tronc
        if (dessous === B.AIR || dessous === B.EAU) {
          flottant ??= [x, y, z];
          continue;
        }
        if (dessous !== B.HERBE && dessous !== B.TERRE) {
          malPlante ??= [x, y, z];
          continue;
        }
        let sommet = y;
        while (sommet + 1 < HAUTEUR && monde[index(x, sommet + 1, z)] === B.BOIS) sommet++;
        if (sommet - y + 1 < 3) continue;
        let feuilles = false;
        for (let dy = 0; dy <= 1 && !feuilles; dy++)
          for (let dz = -1; dz <= 1 && !feuilles; dz++)
            for (let dx = -1; dx <= 1 && !feuilles; dx++)
              if (blocEn(monde, x + dx, sommet + dy, z + dz) === B.FEUILLES) feuilles = true;
        if (feuilles) arbres++;
        else sansFeuilles ??= [x, y, z];
      }
  return { arbres, sansFeuilles, flottant, malPlante };
}

export default {
  titre: "Forêts, grottes et minerais",
  defis: [
    {
      nom: `Au moins ${ARBRES_MIN} arbres`,
      verifier(monde) {
        const { arbres, sansFeuilles, flottant, malPlante } = compterArbres(monde);
        if (flottant) {
          return rate(
            `Un tronc flotte en (${flottant.join(", ")}) : il y a du vide dessous. Cherche le sol avant de planter.`,
          );
        }
        if (malPlante)
          return rate(`Un arbre est planté sur autre chose que de l'herbe, en (${malPlante.join(", ")}).`);
        if (arbres >= ARBRES_MIN) return ok(`${arbres} arbres ont poussé.`);
        if (arbres === 0 && sansFeuilles) {
          return rate(
            `Il y a un tronc en (${sansFeuilles.join(", ")}) mais pas de FEUILLES autour de son sommet.`,
          );
        }
        const compte =
          arbres === 0 ? "Aucun arbre pour l'instant" : `${arbres} arbre${arbres > 1 ? "s" : ""} seulement`;
        return rate(
          `${compte} (tronc d'au moins 3 BOIS sur l'herbe, avec des FEUILLES). Il en faut ${ARBRES_MIN}.`,
        );
      },
    },
    {
      nom: "Des grottes creusées avec perlin3d",
      verifier(monde, { appels }) {
        if (appels.bruit3d === 0) return rate("Tu n'utilises pas encore perlin3d(x, y, z) pour creuser.");
        const sol = hauteurs(monde, { sansEau: true });
        let cases = 0;
        let vides = 0;
        for (let z = 0; z < TAILLE; z++)
          for (let x = 0; x < TAILLE; x++) {
            const h = sol[x + TAILLE * z];
            for (let y = 1; y < h; y++) {
              cases++;
              if (monde[index(x, y, z)] === B.AIR) vides++;
            }
          }
        const part = cases ? vides / cases : 0;
        if (part < 0.01) {
          return rate(
            `Seulement ${(part * 100).toFixed(1)} % du sous-sol est creusé. Baisse ton seuil, ou vérifie que tu ne poses pas la pierre quand perlin3d dépasse ce seuil.`,
          );
        }
        if (part > 0.6)
          return rate(
            `${Math.round(part * 100)} % du sous-sol est vide : ton monde est un gruyère. Monte ton seuil.`,
          );
        return ok(`${Math.round(part * 100)} % du sous-sol est creusé en grottes. Vole dedans !`);
      },
    },
    {
      nom: "Charbon, et diamants tout au fond",
      verifier(monde) {
        const charbon = compter(monde, B.CHARBON);
        if (charbon < 20) {
          return rate(
            `${charbon === 0 ? "Aucun" : charbon} bloc${charbon > 1 ? "s" : ""} de CHARBON. Il en faut au moins 20, dispersés dans la pierre.`,
          );
        }
        let diamants = 0;
        for (let y = 0; y < HAUTEUR; y++)
          for (let z = 0; z < TAILLE; z++)
            for (let x = 0; x < TAILLE; x++)
              if (monde[index(x, y, z)] === B.DIAMANT) {
                if (y >= PLAFOND_DIAMANT) {
                  return rate(
                    `Un DIAMANT en (${x}, ${y}, ${z}) : trop haut ! Les diamants restent sous y = ${PLAFOND_DIAMANT}.`,
                  );
                }
                diamants++;
              }
        if (diamants < 5) {
          return rate(
            `${diamants === 0 ? "Aucun" : diamants} DIAMANT${diamants > 1 ? "s" : ""}. Il en faut au moins 5, tout au fond.`,
          );
        }
        return ok(`${charbon} blocs de charbon et ${diamants} diamants cachés. Bonne mine !`);
      },
    },
  ],
};
