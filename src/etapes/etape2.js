// Étape 2 : le sol plat. Les 16 384 colonnes doivent avoir un bloc à y = 0.
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
  duree: "20 min",
  lore: `
    <p>Un bloc flotte, tout seul dans le vide. Pour un monde entier, il en faudrait
    <strong>16 384</strong> rien que pour le sol. À la main, tu y serais encore à Noël.</p>
    <p>Heureusement, un ordinateur adore répéter.</p>`,
  outils: [
    {
      titre: "La boucle for",
      texte: `<p>Une <strong>boucle</strong> répète le code écrit entre <code>do</code> et <code>end</code>.
        Ici, <code>x</code> vaut 0, puis 1, puis 2… jusqu'à 9 : une ligne de 10 blocs.</p>`,
      code: `for x = 0, 9 do
  bloc(x, 0, 0, PIERRE)
end`,
    },
    {
      titre: "Une boucle dans une boucle",
      texte: `<p>Pour chaque valeur de <code>x</code>, la boucle intérieure fait tous les <code>z</code>.
        10 × 10 = un carré de 100 blocs.</p>`,
      code: `for x = 0, 9 do
  for z = 0, 9 do
    bloc(x, 0, z, PIERRE)
  end
end`,
    },
    {
      titre: "TAILLE",
      texte: `<p><code>TAILLE</code> vaut 128, la largeur du monde. Les colonnes vont de <code>0</code>
        à <code>TAILLE - 1</code>, c'est-à-dire 127.</p>`,
      code: `afficher(TAILLE)
afficher(TAILLE - 1)`,
    },
    {
      titre: "afficher",
      texte: `<p><code>afficher</code> écrit dans la console, sous l'éditeur. C'est ta loupe : quand ton
        code ne fait pas ce que tu crois, affiche tes variables.</p>`,
      code: `for x = 0, 3 do
  afficher("x vaut", x)
end`,
    },
  ],
  pieges: [
    "<code>for x = 0, TAILLE do</code> fait <strong>129</strong> tours, pas 128 : le dernier bloc tombe hors du monde. La console te le signale.",
    "Chaque <code>for</code> a son <code>end</code>. Décale le code à l'intérieur vers la droite pour voir qui ferme quoi.",
  ],
  objectif: "Recouvre tout le sol du monde (y = 0) d'<code>HERBE</code> : les 128 × 128 colonnes.",
  indices: [
    "Commence par une seule ligne de 128 blocs le long de x. Vole pour vérifier qu'elle touche les deux bords.",
    "Mets ensuite cette boucle <strong>à l'intérieur</strong> d'une autre boucle, sur z.",
    `<pre>for x = 0, TAILLE - 1 do
  for z = 0, TAILLE - 1 do
    ...
  end
end</pre>`,
  ],
  bonus:
    "Fais un damier : <code>HERBE</code> et <code>SABLE</code> en alternance. Indice : <code>(x + z) % 2</code> vaut 0 ou 1.",

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
