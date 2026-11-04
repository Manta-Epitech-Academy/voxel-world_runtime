// Étape 5 : le relief avec le bruit de Perlin. Au moins DENIVELE_MIN blocs entre le plus bas et le plus haut.
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
  duree: "25 min",
  lore: `
    <p>Vole tout en haut et regarde : tes collines sont alignées comme une boîte d'œufs. La nature
    ne se répète pas comme ça.</p>
    <p>En 1983, pour les effets spéciaux du film <em>Tron</em>, Ken Perlin invente un <strong>bruit</strong>
    qui ressemble au hasard tout en restant doux. Il reçoit un Oscar pour ça. Minecraft s'en sert
    pour dessiner tous ses terrains.</p>`,
  outils: [
    {
      titre: "bruit(x, z)",
      texte: `<p><code>bruit</code> renvoie un nombre entre -1 et 1. Si x et z bougent <em>un peu</em>,
        le résultat bouge <em>un peu</em> : c'est ce qui rend les collines douces.</p>`,
      code: `afficher(bruit(10.5, 3.2))
afficher(bruit(10.6, 3.2))
afficher(bruit(50.1, 80.7))`,
    },
    {
      titre: "L'échelle",
      texte: `<p>Le <code>/ 40</code> règle la <strong>largeur</strong> des collines, le <code>* 12</code>
        leur <strong>hauteur</strong>.</p>`,
      code: "local h = 24 + math.floor(bruit(x / 40, z / 40) * 12)",
    },
    {
      titre: "Les octaves",
      texte: `<p>Un seul bruit donne des collines lisses. On en <strong>additionne</strong> plusieurs :
        un grand pour les montagnes, un moyen pour les bosses, un petit pour les détails. Chaque
        couche s'appelle une <strong>octave</strong>.</p>`,
      code: `local n = bruit(x / 60, z / 60) * 24
        + bruit(x / 24, z / 24) * 6
        + bruit(x / 8, z / 8) * 1.5
local h = math.floor(26 + n)`,
    },
    {
      titre: "La graine",
      texte: `<p>La <strong>graine</strong> (en haut du monde) choisit un bruit parmi des milliards.
        Même code et même graine : exactement le même monde. Change-la pour en découvrir un autre.</p>`,
    },
  ],
  pieges: [
    "<code>bruit</code> avec des nombres <strong>entiers</strong> renvoie toujours 0 : <code>bruit(3, 7)</code> vaut 0. Divise toujours x et z.",
    "Plus tu divises x et z, plus les collines sont <strong>larges</strong>. Plus tu multiplies le résultat, plus elles sont <strong>hautes</strong>.",
  ],
  objectif: `Remplace <code>math.sin</code> par <code>bruit</code> : un relief naturel d'au moins
    <strong>${DENIVELE_MIN} blocs de dénivelé</strong> entre le point le plus bas et le plus haut, sans
    falaise de plus de 3 blocs. Les couches restent obligatoires.`,
  indices: [
    "Écris une fonction <code>hauteur(x, z)</code> qui renvoie (<code>return</code>) la hauteur de la colonne.",
    "Si ton terrain est plat, affiche <code>bruit(x, z)</code> : as-tu oublié de diviser ?",
    "Pas assez de dénivelé ? Multiplie davantage le grand bruit.",
  ],
  bonus: "Mets <code>math.abs(bruit(...))</code> pour le grand bruit : tu obtiens des crêtes de montagne.",

  defis: [
    {
      nom: "Un relief naturel fait avec bruit",
      verifier(monde, { appels }) {
        if (appels.bruit === 0)
          return rate("Tu n'utilises pas encore bruit(x, z). Remplace math.sin par bruit.");
        const couches = verifierCouches(monde);
        if (!couches.ok) return couches;
        const sommets = hauteurs(monde);
        let bas = Infinity;
        let haut = -Infinity;
        for (const h of sommets) [bas, haut] = [Math.min(bas, h), Math.max(haut, h)];
        if (haut === bas && appels.bruitEntier > appels.bruit * 0.9) {
          return rate(
            "Ton terrain est plat parce que bruit reçoit des nombres entiers : bruit(3, 7) vaut toujours 0. Divise x et z, par exemple bruit(x / 40, z / 40).",
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
        return ok(`Un relief de ${haut - bas} blocs, de y = ${bas} à y = ${haut}. Essaie d'autres graines !`);
      },
    },
  ],
};
