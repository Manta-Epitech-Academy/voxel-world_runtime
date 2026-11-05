// Étape 7 : des arbres sur l'herbe, des grottes creusées au bruit3d, du charbon et des diamants au fond.
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
  duree: "35 min",
  lore: `
    <p>Ton monde a des mers, des plages et des montagnes. Il est prêt à accueillir la vie… et les mineurs.</p>
    <p>Il manque des <strong>arbres</strong> en surface et, sous tes pieds, des <strong>grottes</strong>
    remplies de <strong>trésors</strong>. Dernière ligne droite avant un générateur complet !</p>`,
  outils: [
    {
      titre: "random(a, b)",
      texte: `<p><code>random(1, 6)</code> donne un nombre entier entre 1 et 6, comme un dé. Il dépend
        de la seed : même seed, mêmes tirages, donc même monde.</p>`,
      code: "print(random(1, 6), random(1, 6), random(0, TAILLE - 1))",
    },
    {
      titre: "get_block et while : trouver le sol",
      texte: `<p><code>get_block(x, y, z)</code> dit quel bloc se trouve à un endroit. <code>while</code>
        répète <em>tant que</em> la condition est vraie : on descend depuis le ciel jusqu'au premier bloc.</p>`,
      code: `local x, z = 64, 64
local y = HAUTEUR - 1
while y > 0 and get_block(x, y, z) == AIR do
  y = y - 1
end
print("le sol est à y =", y)`,
    },
    {
      titre: "Une fonction arbre",
      texte: "<p>Un tronc de 5 blocs, puis des feuilles autour du haut. À toi de compléter la couronne.</p>",
      code: `function arbre(x, y, z)
  for i = 0, 4 do
    set_block(x, y + i, z, BOIS)
  end
  set_block(x, y + 5, z, FEUILLES)
end`,
    },
    {
      titre: "bruit3d : creuser des grottes",
      texte: `<p>Même idée que <code>perlin2d</code>, mais en 3D. Là où il dépasse un seuil, on
        <strong>ne pose pas</strong> de pierre : ça fait un trou. Plus le seuil est bas, plus les grottes
        sont grandes.</p>`,
      code: `if perlin3d(x / 16, y / 10, z / 16) > 0.3 then
  -- grotte : on ne pose rien
else
  set_block(x, y, z, PIERRE)
end`,
    },
    {
      titre: "return : une fonction qui répond",
      texte:
        "<p>Une fonction peut <strong>renvoyer</strong> une valeur. Ici, elle choisit quel bloc poser.</p>",
      code: `function pierre(y)
  if y < 12 and random(1, 200) == 1 then
    return DIAMANT
  end
  return PIERRE
end

print(pierre(5))`,
    },
  ],
  pieges: [
    "Une boucle <code>while</code> dont la condition reste toujours vraie ne s'arrête jamais : ton code est coupé au bout de 5 secondes.",
    "Si une grotte touche la surface, elle fait un trou dans le sol, et l'eau se retrouve à flotter au-dessus.",
    "Les arbres poussent sur l'herbe : pas dans l'eau, ni sur le sable, ni dans le vide.",
  ],
  objectif: `Trois défis : au moins <strong>${ARBRES_MIN} arbres</strong> plantés sur l'herbe, des <strong>grottes</strong>
    creusées avec <code>perlin3d</code>, et des <strong>minerais</strong> : du <code>CHARBON</code>, et du
    <code>DIAMANT</code> seulement tout au fond (y &lt; ${PLAFOND_DIAMANT}).`,
  indices: [
    "Pour planter un arbre : tire x et z au hasard, cherche le sol avec <code>while</code>, et plante seulement si <code>get_block(x, y, z) == HERBE</code>.",
    "Plante les arbres <strong>après</strong> la double boucle du terrain, sinon il n'y a pas encore de sol.",
    "Pour les grottes, ne creuse pas trop près de la surface : par exemple seulement si <code>y &lt; h - 5</code>.",
    "Pour les minerais, remplace <code>PIERRE</code> par l'appel d'une fonction qui renvoie parfois un minerai.",
  ],
  bonus: `<strong>Défi libre</strong> : invente des biomes. Un deuxième bruit très large peut décider
    d'une zone de désert (sable, pas d'arbres) ou d'une forêt dense. Puis partage ta seed préférée !`,

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
