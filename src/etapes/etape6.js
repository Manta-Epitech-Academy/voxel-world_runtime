// Étape 6 : une mer plate, du sable sur les rivages, de la neige en altitude.
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
  titre: "Mers, plages et neige",
  defis: [
    {
      nom: "Une mer, des plages et de la neige",
      verifier(monde) {
        const sol = hauteurs(monde, { sansEau: true }); // le terrain, sous l'eau s'il y en a
        const surface = hauteurs(monde); // l'eau comprise
        const colonne = (x, z) => x + TAILLE * z;

        // De l'eau, et une seule surface.
        const niveaux = new Set();
        let eau = 0;
        for (let z = 0; z < TAILLE; z++)
          for (let x = 0; x < TAILLE; x++) {
            const h = surface[colonne(x, z)];
            if (monde[index(x, h, z)] === B.EAU) {
              eau++;
              niveaux.add(h);
            }
          }
        if (eau < TAILLE * TAILLE * 0.02) {
          return rate(
            "Il n'y a presque pas d'eau. Remonte NIVEAU_MER pour qu'une partie du terrain soit dessous.",
          );
        }
        if (niveaux.size > 1) {
          const tries = [...niveaux].sort((a, b) => a - b);
          return rate(
            `La surface de l'eau n'est pas plate : on en trouve à y = ${tries.slice(0, 4).join(", ")}… Toute l'eau doit monter jusqu'au même NIVEAU_MER.`,
          );
        }
        const niveauMer = [...niveaux][0];
        for (let y = 1; y < HAUTEUR; y++)
          for (let z = 0; z < TAILLE; z++)
            for (let x = 0; x < TAILLE; x++)
              if (monde[index(x, y, z)] === B.EAU && monde[index(x, y - 1, z)] === B.AIR) {
                return rate(`De l'eau flotte en (${x}, ${y}, ${z}) : il y a de l'air dessous.`);
              }

        const couches = verifierCouches(monde, {
          dessus: new Set([B.HERBE, B.SABLE, B.NEIGE, B.GRAVIER]),
          sous: new Set([B.TERRE, B.SABLE, B.GRAVIER]),
        });
        if (!couches.ok) return couches;

        // Les rivages : une colonne émergée dont une voisine est sous l'eau.
        let rivages = 0;
        let enSable = 0;
        let exemple = null;
        const VOISINS = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        for (let z = 0; z < TAILLE; z++)
          for (let x = 0; x < TAILLE; x++) {
            if (surface[colonne(x, z)] !== sol[colonne(x, z)]) continue; // sous l'eau
            const bordDeMer = VOISINS.some(([dx, dz]) => {
              const vx = x + dx;
              const vz = z + dz;
              return (
                vx >= 0 &&
                vx < TAILLE &&
                vz >= 0 &&
                vz < TAILLE &&
                surface[colonne(vx, vz)] !== sol[colonne(vx, vz)]
              );
            });
            if (!bordDeMer) continue;
            rivages++;
            const b = monde[index(x, sol[colonne(x, z)], z)];
            if (b === B.SABLE) enSable++;
            else exemple ??= [x, sol[colonne(x, z)], z, b];
          }
        if (enSable < rivages * 0.8) {
          return rate(
            `Seulement ${enSable} rivages sur ${rivages} sont en sable. Par exemple en (${exemple[0]}, ${exemple[1]}, ${exemple[2]}) : ${nomDuBloc(exemple[3])}. Une colonne juste au-dessus de la mer doit avoir du SABLE.`,
          );
        }

        // La neige : au sommet des colonnes les plus hautes, et sur toutes celles au-dessus de la plus basse enneigée.
        let neige = 0;
        let plusBasseNeige = Infinity;
        for (let z = 0; z < TAILLE; z++)
          for (let x = 0; x < TAILLE; x++) {
            const h = sol[colonne(x, z)];
            if (monde[index(x, h, z)] === B.NEIGE) {
              neige++;
              plusBasseNeige = Math.min(plusBasseNeige, h);
            }
          }
        if (neige < TAILLE * TAILLE * 0.005) {
          return rate(
            "Pas (ou presque pas) de neige. Pose de la NEIGE au sommet des colonnes les plus hautes, avec un if sur h.",
          );
        }
        let hautes = 0;
        let hautesEnneigees = 0;
        for (let z = 0; z < TAILLE; z++)
          for (let x = 0; x < TAILLE; x++) {
            const h = sol[colonne(x, z)];
            if (h < plusBasseNeige) continue;
            hautes++;
            if (monde[index(x, h, z)] === B.NEIGE) hautesEnneigees++;
          }
        if (hautesEnneigees < hautes * 0.95) {
          return rate(
            `Il y a de la neige à y = ${plusBasseNeige}, mais ${hautes - hautesEnneigees} colonnes encore plus hautes n'en ont pas. La neige doit couvrir tout ce qui dépasse une altitude.`,
          );
        }
        return ok(`Une mer à y = ${niveauMer}, ${enSable} rivages de sable, et ${neige} sommets enneigés.`);
      },
    },
  ],
};
